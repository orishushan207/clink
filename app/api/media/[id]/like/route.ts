import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server";
import { generateId } from "@/lib/utils";
import { createNotificationForOwnerAndAdmins } from "@/lib/notifications";

// POST — like a media item
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: mediaId } = await params;
    const { guest_id, event_id } = await req.json();

    if (!guest_id || !event_id || !mediaId) {
      return NextResponse.json({ error: "חסרים פרמטרים" }, { status: 400 });
    }

    const likeId = generateId();

    const { error } = await supabaseAdmin.from("likes").insert({
      id: likeId,
      event_id,
      media_id: mediaId,
      guest_id,
    });

    if (error) {
      if (error.code === "23505") {
        return NextResponse.json({ error: "כבר נתת לייק" }, { status: 409 });
      }
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    await supabaseAdmin.rpc("increment_likes", { media_id_param: mediaId });

    // In-app notification (fire-and-forget)
    void (async () => {
      try {
        const { data: media } = await supabaseAdmin
          .from("media").select("guest_id").eq("id", mediaId).single();
        const { data: liker } = await supabaseAdmin
          .from("guests").select("nickname, avatar").eq("id", guest_id).single();
        if (!media || !liker) return;

        await createNotificationForOwnerAndAdmins({
          eventId: event_id,
          recipientId: media.guest_id,
          type: "like",
          actorId: guest_id,
          actorName: liker.nickname,
          actorAvatar: liker.avatar,
          content: `${liker.nickname} אהב/ה את התמונה שלך ❤️`,
          mediaId,
          adminEventId: event_id,
        });
      } catch { /* silent */ }
    })();

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("POST like error:", err);
    return NextResponse.json({ error: "שגיאת שרת" }, { status: 500 });
  }
}

// DELETE — unlike
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: mediaId } = await params;
    const { guest_id } = await req.json();

    if (!guest_id || !mediaId) {
      return NextResponse.json({ error: "חסרים פרמטרים" }, { status: 400 });
    }

    const { error } = await supabaseAdmin
      .from("likes")
      .delete()
      .eq("media_id", mediaId)
      .eq("guest_id", guest_id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    await supabaseAdmin.rpc("decrement_likes", { media_id_param: mediaId });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("DELETE like error:", err);
    return NextResponse.json({ error: "שגיאת שרת" }, { status: 500 });
  }
}
