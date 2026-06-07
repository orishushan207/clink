import { v4 as uuidv4 } from "uuid";
import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

// ============================================================
// Tailwind class merging helper
// ============================================================

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// ============================================================
// Slug generation — URL-safe, unique, human-readable
// ============================================================

const ADJECTIVES = [
  "epic",
  "wild",
  "crazy",
  "golden",
  "neon",
  "secret",
  "loud",
  "bright",
  "dark",
  "solar",
  "cosmic",
  "groovy",
  "fresh",
  "hyper",
  "ultra",
  "mega",
  "super",
  "turbo",
  "vibe",
  "lit",
];

const NOUNS = [
  "party",
  "night",
  "crew",
  "wave",
  "drop",
  "beat",
  "flow",
  "spark",
  "blast",
  "rush",
  "move",
  "groove",
  "jam",
  "vibes",
  "zone",
  "scene",
  "squad",
  "tribe",
  "pack",
  "posse",
];

export function generateSlug(): string {
  const adj = ADJECTIVES[Math.floor(Math.random() * ADJECTIVES.length)];
  const noun = NOUNS[Math.floor(Math.random() * NOUNS.length)];
  const num = Math.floor(Math.random() * 9000) + 1000;
  return `${adj}-${noun}-${num}`;
}

// ============================================================
// Admin token — 32 random hex chars
// ============================================================

export function generateAdminToken(): string {
  const array = new Uint8Array(16);
  if (typeof crypto !== "undefined" && crypto.getRandomValues) {
    crypto.getRandomValues(array);
  } else {
    // Node.js fallback
    for (let i = 0; i < array.length; i++) {
      array[i] = Math.floor(Math.random() * 256);
    }
  }
  return Array.from(array)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export function generateId(): string {
  return uuidv4();
}

// ============================================================
// Event URL helpers
// ============================================================

export function getEventUrl(slug: string, baseUrl?: string): string {
  const base =
    baseUrl ||
    process.env.NEXT_PUBLIC_APP_URL ||
    "http://localhost:3000";
  return `${base}/event/${slug}`;
}

export function getAdminUrl(
  eventId: string,
  adminToken: string,
  baseUrl?: string
): string {
  const base =
    baseUrl ||
    process.env.NEXT_PUBLIC_APP_URL ||
    "http://localhost:3000";
  return `${base}/admin/event/${eventId}?token=${adminToken}`;
}

// ============================================================
// Date formatting — Hebrew-friendly
// ============================================================

export function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString("he-IL", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export function formatTime(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleTimeString("he-IL", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function formatRelative(dateStr: string): string {
  const now = new Date();
  const date = new Date(dateStr);
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) return "עכשיו";
  if (diffMins < 60) return `לפני ${diffMins} דקות`;
  if (diffHours < 24) return `לפני ${diffHours} שעות`;
  return `לפני ${diffDays} ימים`;
}

// ============================================================
// File validation
// ============================================================

export const ALLOWED_IMAGE_TYPES = [
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
];
export const ALLOWED_VIDEO_TYPES = ["video/mp4", "video/quicktime", "video/webm"];
export const MAX_IMAGE_SIZE = 10 * 1024 * 1024; // 10MB
export const MAX_VIDEO_SIZE = 100 * 1024 * 1024; // 100MB

export interface FileValidationResult {
  valid: boolean;
  error?: string;
}

export function validateMediaFile(
  file: File,
  allowVideo: boolean
): FileValidationResult {
  const isImage = ALLOWED_IMAGE_TYPES.includes(file.type);
  const isVideo = ALLOWED_VIDEO_TYPES.includes(file.type);

  if (!isImage && !isVideo) {
    return {
      valid: false,
      error: "סוג קובץ לא נתמך. ניתן להעלות jpg, png, webp, mp4, mov, webm בלבד",
    };
  }

  if (isVideo && !allowVideo) {
    return {
      valid: false,
      error: "העלאת וידאו אינה מאופשרת לאירוע זה",
    };
  }

  if (isImage && file.size > MAX_IMAGE_SIZE) {
    return {
      valid: false,
      error: "תמונה גדולה מדי. גודל מקסימלי: 10MB",
    };
  }

  if (isVideo && file.size > MAX_VIDEO_SIZE) {
    return {
      valid: false,
      error: "וידאו גדול מדי. גודל מקסימלי: 100MB",
    };
  }

  return { valid: true };
}

// ============================================================
// LocalStorage guest session helpers
// ============================================================

export function getGuestSessionKey(eventSlug: string): string {
  return `partydrop_guest_${eventSlug}`;
}

export function getAdminSessionKey(eventId: string): string {
  return `partydrop_admin_${eventId}`;
}

// ============================================================
// Leaderboard scoring
// ============================================================

export const SCORE_PHOTO_UPLOAD = 1;
export const SCORE_VIDEO_UPLOAD = 3;
export const SCORE_LIKE_RECEIVED = 1;

// ============================================================
// Copy to clipboard
// ============================================================

export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

// ============================================================
// Storage path helpers
// ============================================================

export function getMediaStoragePath(eventId: string, fileName: string): string {
  return `events/${eventId}/${fileName}`;
}

export function getCoverStoragePath(eventId: string, fileName: string): string {
  return `covers/${eventId}/${fileName}`;
}

export function getFileExtension(file: File): string {
  return file.name.split(".").pop()?.toLowerCase() || "";
}

export function generateStorageFileName(file: File): string {
  const ext = getFileExtension(file);
  return `${uuidv4()}.${ext}`;
}
