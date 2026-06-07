import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server";
import {
  generateId,
  generateStorageFileName,
  getMediaStoragePath,
  validateMediaFile,
  ALLOWED_IMAGE_TYPES,
  ALLOWED_VIDEO_TYPES,
} from "@/lib/utils";
import { isRateLimited, getClientIp } from "@/lib/rateLimit";
import { createNotificationForOwnerAndAdmins } from "@/lib/notifications";

export const maxDuration = 60; // Vercel function timeout for large uploads

// Rate limit: max 20 uploads per minute per IP, and 5 per minute per guest
const UPLOAD_RATE_IP   = { limit: 20, windowSec: 60 };
const UPLOAD_RATE_GUEST = { limit: 5,  windowSec: 60 };

export async function POST(req: NextRequest) {
  try {
    // Rate-limit check (before parsing formData to fail fast)
    const ip = getClientIp(req.headers);
    if (isRateLimited(`upload:ip:${ip}`, UPLOAD_RATE_IP)) {
      return NextResponse.json(
        { error: "יותר מדי העלאות בזמן קצר — נסה שוב עוד דקה" },
        { status: 429 }
      );
    }

    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const eventId = formData.get("event_id") as string;
    const guestId = formData.get("guest_id") as string;

    // Per-guest rate limit
    if (guestId && isRateLimited(`upload:guest:${guestId}`, UPLOAD_RATE_GUEST)) {
      return NextResponse.json(
        { error: "קצב ההעלאה גבוה מדי — המתן מעט בין העלאות" },
        { status: 429 }
      );
    }

    if (!file || !eventId || !guestId) {
      return NextResponse.json(
        { error: "חסרים פרמטרים נדרשים" },
        { status: 400 }
      );
    }

    // Fetch event to validate
    const { data: event, error: eventError } = await supabaseAdmin
      .from("events")
      .select("id, allow_video, require_approval, uploads_open")
      .eq("id", eventId)
      .single();

    if (eventError || !event) {
      return NextResponse.json({ error: "אירוע לא נמצא" }, { status: 404 });
    }

    if (!event.uploads_open) {
      return NextResponse.json(
        { error: "העלאות לאירוע זה נסגרו" },
        { status: 403 }
      );
    }

    // Validate guest belongs to event
    const { data: guest } = await supabaseAdmin
      .from("guests")
      .select("id, blocked")
      .eq("id", guestId)
      .eq("event_id", eventId)
      .single();

    if (!guest) {
      return NextResponse.json(
        { error: "אורח לא מזוהה" },
        { status: 403 }
      );
    }

    if (guest.blocked === true) {
      return NextResponse.json(
        { error: "חשבונך חסום על ידי מנהל האירוע" },
        { status: 403 }
      );
    }

    // Validate file type/size
    const validation = validateMediaFile(file, event.allow_video);
    if (!validation.valid) {
      return NextResponse.json({ error: validation.error }, { status: 400 });
    }

    // Determine media type
    const isVideo = ALLOWED_VIDEO_TYPES.includes(file.type);
    const mediaType = isVideo ? "video" : "image";

    // Upload to Supabase Storage via Admin client
    const fileName = generateStorageFileName(file);
    const storagePath = getMediaStoragePath(eventId, fileName);

    const fileBuffer = Buffer.from(await file.arrayBuffer());

    const { error: storageError } = await supabaseAdmin.storage
      .from("event-media")
      .upload(storagePath, fileBuffer, {
        contentType: file.type,
        upsert: false,
      });

    if (storageError) {
      console.error("Storage upload error:", storageError);
      return NextResponse.json(
        { error: "שגיאה בהעלאת הקובץ" },
        { status: 500 }
      );
    }

    // Get public URL
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const fileUrl = `${supabaseUrl}/storage/v1/object/public/event-media/${storagePath}`;

    // Create media record
    const status = event.require_approval ? "pending" : "approved";
    const mediaId = generateId();

    const { data: mediaRecord, error: dbError } = await supabaseAdmin
      .from("media")
      .insert({
        id: mediaId,
        event_id: eventId,
        guest_id: guestId,
        media_type: mediaType,
        file_url: fileUrl,
        status,
        likes_count: 0,
      })
      .select()
      .single();

    if (dbError) {
      console.error("DB insert error:", dbError);
      return NextResponse.json(
        { error: "שגיאה בשמירת המדיה" },
        { status: 500 }
      );
    }

    // In-app notification for admin (fire-and-forget)
    void (async () => {
      try {
        const { data: uploader } = await supabaseAdmin
          .from("guests").select("nickname, avatar").eq("id", guestId).single();
        await createNotificationForOwnerAndAdmins({
          eventId,
          recipientId: null,
          type: "upload",
          actorId: guestId,
          actorName: uploader?.nickname ?? "אורח",
          actorAvatar: uploader?.avatar ?? null,
          content: `${uploader?.nickname ?? "אורח"} העלה/תה ${mediaType === "video" ? "סרטון חדש 🎬" : "תמונה חדשה 📸"}`,
          mediaId,
          adminEventId: eventId,
        });
      } catch { /* silent */ }
    })();

    return NextResponse.json({
      media: mediaRecord,
      message: event.require_approval
        ? "הקובץ עלה וממתין לאישור בעל האירוע"
        : "הקובץ עלה בהצלחה!",
    });
  } catch (err) {
    console.error("POST /api/media/upload error:", err);
    return NextResponse.json({ error: "שגיאת שרת" }, { status: 500 });
  }
}
