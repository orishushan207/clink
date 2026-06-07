import { supabase } from "@/lib/supabase/client";
import type { Media, MediaStatus, GalleryFilter } from "@/types";
import {
  generateId,
  generateStorageFileName,
  getMediaStoragePath,
  validateMediaFile,
} from "@/lib/utils";

// ============================================================
// Upload file to Supabase Storage
// ============================================================

export interface UploadProgress {
  loaded: number;
  total: number;
  percent: number;
}

export async function uploadFileToStorage(
  file: File,
  eventId: string,
  onProgress?: (progress: UploadProgress) => void
): Promise<string> {
  const fileName = generateStorageFileName(file);
  const path = getMediaStoragePath(eventId, fileName);

  // Supabase JS v2 doesn't support upload progress natively yet.
  // We use XMLHttpRequest for progress tracking.
  // TODO: Switch to native Supabase upload progress when supported
  if (onProgress) {
    return new Promise((resolve, reject) => {
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
      const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

      const xhr = new XMLHttpRequest();
      xhr.upload.addEventListener("progress", (e) => {
        if (e.lengthComputable) {
          onProgress({
            loaded: e.loaded,
            total: e.total,
            percent: Math.round((e.loaded / e.total) * 100),
          });
        }
      });

      xhr.addEventListener("load", () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          const publicUrl = `${supabaseUrl}/storage/v1/object/public/event-media/${path}`;
          resolve(publicUrl);
        } else {
          reject(new Error(`שגיאת העלאה: ${xhr.statusText}`));
        }
      });

      xhr.addEventListener("error", () => reject(new Error("שגיאת רשת בהעלאה")));

      xhr.open(
        "POST",
        `${supabaseUrl}/storage/v1/object/event-media/${path}`
      );
      xhr.setRequestHeader("Authorization", `Bearer ${anonKey}`);
      xhr.setRequestHeader("x-upsert", "false");

      const formData = new FormData();
      formData.append("", file, fileName);

      // Use direct binary upload instead of multipart for large files
      xhr.setRequestHeader("Content-Type", file.type);
      xhr.send(file);
    });
  }

  // Simple upload without progress
  const { error } = await supabase.storage
    .from("event-media")
    .upload(path, file, {
      contentType: file.type,
      upsert: false,
    });

  if (error) throw new Error(`שגיאת העלאה: ${error.message}`);

  const {
    data: { publicUrl },
  } = supabase.storage.from("event-media").getPublicUrl(path);

  return publicUrl;
}

// ============================================================
// Upload cover image for event
// ============================================================

export async function uploadCoverImage(
  file: File,
  eventId: string
): Promise<string> {
  const fileName = generateStorageFileName(file);
  const path = `covers/${eventId}/${fileName}`;

  const { error } = await supabase.storage
    .from("event-covers")
    .upload(path, file, { contentType: file.type, upsert: false });

  if (error) throw new Error(`שגיאת העלאת תמונת כיסוי: ${error.message}`);

  const {
    data: { publicUrl },
  } = supabase.storage.from("event-covers").getPublicUrl(path);

  return publicUrl;
}

// ============================================================
// Save generated mosaic to Storage + update event record
// ============================================================

export async function saveMosaic(
  dataUrl: string,
  eventId: string,
  adminToken: string
): Promise<string> {
  const res = await fetch("/api/mosaic", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ dataUrl, eventId, adminToken }),
  });

  if (!res.ok) {
    const { error } = await res.json();
    throw new Error(`שגיאת שמירת פסיפס: ${error}`);
  }

  const { url } = await res.json();
  return url;
}

// ============================================================
// Create media record in database
// ============================================================

export interface CreateMediaPayload {
  event_id: string;
  guest_id: string;
  media_type: "image" | "video";
  file_url: string;
  thumbnail_url?: string;
  caption?: string;
  require_approval: boolean;
}

export async function createMediaRecord(
  payload: CreateMediaPayload
): Promise<Media> {
  const id = generateId();
  const status: MediaStatus = payload.require_approval ? "pending" : "approved";

  const { data, error } = await supabase
    .from("media")
    .insert({
      id,
      event_id: payload.event_id,
      guest_id: payload.guest_id,
      media_type: payload.media_type,
      file_url: payload.file_url,
      thumbnail_url: payload.thumbnail_url || null,
      caption: payload.caption || null,
      status,
      likes_count: 0,
    })
    .select()
    .single();

  if (error) throw new Error(`שגיאה בשמירת המדיה: ${error.message}`);
  return data as Media;
}

// ============================================================
// Generate video thumbnail (client-side, browser only)
// ============================================================

export async function generateVideoThumbnail(file: File): Promise<Blob | null> {
  return new Promise((resolve) => {
    const video = document.createElement("video");
    const url = URL.createObjectURL(file);
    video.src = url;
    video.muted = true;
    video.playsInline = true;
    video.crossOrigin = "anonymous";

    const cleanup = () => URL.revokeObjectURL(url);

    video.addEventListener("seeked", () => {
      try {
        const canvas = document.createElement("canvas");
        canvas.width = video.videoWidth || 640;
        canvas.height = video.videoHeight || 360;
        const ctx = canvas.getContext("2d");
        if (!ctx) { cleanup(); resolve(null); return; }
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        canvas.toBlob((blob) => { cleanup(); resolve(blob); }, "image/jpeg", 0.8);
      } catch { cleanup(); resolve(null); }
    }, { once: true });

    video.addEventListener("loadedmetadata", () => {
      video.currentTime = 0.5;
    }, { once: true });

    video.addEventListener("error", () => { cleanup(); resolve(null); }, { once: true });
    video.load();
  });
}

// ============================================================
// Full upload flow: validate → upload file → create record
// ============================================================

export interface UploadMediaOptions {
  file: File;
  eventId: string;
  guestId: string;
  allowVideo: boolean;
  requireApproval: boolean;
  caption?: string;
  onProgress?: (progress: UploadProgress) => void;
}

export async function uploadMedia(options: UploadMediaOptions): Promise<Media> {
  const { file, eventId, guestId, allowVideo, requireApproval, caption, onProgress } =
    options;

  // Validate
  const validation = validateMediaFile(file, allowVideo);
  if (!validation.valid) throw new Error(validation.error);

  // Determine media type
  const mediaType = file.type.startsWith("video/") ? "video" : "image";

  // Generate thumbnail for videos before uploading
  let thumbnailUrl: string | undefined;
  if (mediaType === "video") {
    try {
      const thumbBlob = await generateVideoThumbnail(file);
      if (thumbBlob) {
        const thumbFile = new File([thumbBlob], "thumb.jpg", { type: "image/jpeg" });
        thumbnailUrl = await uploadFileToStorage(thumbFile, eventId);
      }
    } catch { /* thumbnail is optional, continue without it */ }
  }

  // Upload file
  const fileUrl = await uploadFileToStorage(file, eventId, onProgress);

  // Create database record
  return createMediaRecord({
    event_id: eventId,
    guest_id: guestId,
    media_type: mediaType,
    file_url: fileUrl,
    thumbnail_url: thumbnailUrl,
    caption,
    require_approval: requireApproval,
  });
}

// ============================================================
// Get approved media for gallery
// ============================================================

export async function getApprovedMedia(
  eventId: string,
  filter: GalleryFilter = "newest",
  guestId?: string
): Promise<Media[]> {
  let query = supabase
    .from("media")
    .select(
      `
      *,
      guest:guests(id, nickname, avatar)
    `
    )
    .eq("event_id", eventId)
    .eq("status", "approved");

  if (filter === "by_user" && guestId) {
    query = query.eq("guest_id", guestId);
  }

  if (filter === "most_liked") {
    query = query.order("likes_count", { ascending: false });
  } else {
    query = query.order("created_at", { ascending: false });
  }

  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return (data as Media[]) || [];
}

// ============================================================
// Get all media for admin (all statuses)
// ============================================================

export async function getAllMediaForAdmin(eventId: string): Promise<Media[]> {
  const { data, error } = await supabase
    .from("media")
    .select(
      `
      *,
      guest:guests(id, nickname, avatar)
    `
    )
    .eq("event_id", eventId)
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);
  return (data as Media[]) || [];
}

// ============================================================
// Get recent media for Live Wall
// ============================================================

export async function getRecentApprovedMedia(
  eventId: string,
  limit = 20
): Promise<Media[]> {
  const { data, error } = await supabase
    .from("media")
    .select(
      `
      *,
      guest:guests(id, nickname, avatar)
    `
    )
    .eq("event_id", eventId)
    .eq("status", "approved")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) throw new Error(error.message);
  return (data as Media[]) || [];
}
