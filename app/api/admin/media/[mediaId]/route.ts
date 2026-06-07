import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server";

// Helper: validate admin token for the media's event
async function validateAdminForMedia(
  mediaId: string,
  token: string
): Promise<{ valid: boolean; eventId?: string; fileUrl?: string }> {
  const { data: media, error } = await supabaseAdmin
    .from("media")
    .select("event_id, file_url")
    .eq("id", mediaId)
    .single();

  if (error || !media) return { valid: false };

  const { data: event } = await supabaseAdmin
    .from("events")
    .select("admin_token")
    .eq("id", media.event_id)
    .single();

  if (!event || event.admin_token !== token) return { valid: false };

  return { valid: true, eventId: media.event_id, fileUrl: media.file_url };
}

// PATCH — approve or reject media
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ mediaId: string }> }
) {
  try {
    const { mediaId } = await params;
    const { admin_token, status } = await req.json();

    if (!["approved", "rejected"].includes(status)) {
      return NextResponse.json({ error: "סטטוס לא תקין" }, { status: 400 });
    }

    const { valid } = await validateAdminForMedia(mediaId, admin_token);
    if (!valid) {
      return NextResponse.json({ error: "אין הרשאה" }, { status: 403 });
    }

    const { data, error } = await supabaseAdmin
      .from("media")
      .update({ status })
      .eq("id", mediaId)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ media: data });
  } catch (err) {
    console.error("PATCH media error:", err);
    return NextResponse.json({ error: "שגיאת שרת" }, { status: 500 });
  }
}

// DELETE — delete media item and storage file
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ mediaId: string }> }
) {
  try {
    const { mediaId } = await params;
    const { admin_token } = await req.json();

    const { valid, fileUrl } = await validateAdminForMedia(mediaId, admin_token);
    if (!valid) {
      return NextResponse.json({ error: "אין הרשאה" }, { status: 403 });
    }

    // Delete from DB
    const { error: dbError } = await supabaseAdmin
      .from("media")
      .delete()
      .eq("id", mediaId);

    if (dbError) {
      return NextResponse.json({ error: dbError.message }, { status: 500 });
    }

    // Best-effort: delete from storage (extract path from URL)
    if (fileUrl) {
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
      const pathPrefix = `${supabaseUrl}/storage/v1/object/public/event-media/`;
      if (fileUrl.startsWith(pathPrefix)) {
        const storagePath = fileUrl.slice(pathPrefix.length);
        await supabaseAdmin.storage.from("event-media").remove([storagePath]);
      }
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("DELETE media error:", err);
    return NextResponse.json({ error: "שגיאת שרת" }, { status: 500 });
  }
}
