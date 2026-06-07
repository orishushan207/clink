import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server";

// DELETE — guest deletes their own media item
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: mediaId } = await params;
    const { guestId } = await req.json();

    if (!guestId) {
      return NextResponse.json({ error: "חסר מזהה אורח" }, { status: 400 });
    }

    // Fetch media and verify ownership
    const { data: media, error: fetchError } = await supabaseAdmin
      .from("media")
      .select("id, guest_id, file_url")
      .eq("id", mediaId)
      .single();

    if (fetchError || !media) {
      return NextResponse.json({ error: "מדיה לא נמצאה" }, { status: 404 });
    }

    if (media.guest_id !== guestId) {
      return NextResponse.json({ error: "אין הרשאה למחוק תמונה זו" }, { status: 403 });
    }

    // Delete from DB
    const { error: dbError } = await supabaseAdmin
      .from("media")
      .delete()
      .eq("id", mediaId);

    if (dbError) {
      return NextResponse.json({ error: dbError.message }, { status: 500 });
    }

    // Best-effort: delete from storage
    const fileUrl = media.file_url as string;
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
