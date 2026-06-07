import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server";
import { createNotificationForOwnerAndAdmins } from "@/lib/notifications";
import { isRateLimited, getClientIp } from "@/lib/rateLimit";
import { profanityError } from "@/lib/profanity";

// GET — fetch comments for a media item
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: mediaId } = await params;

    const { data, error } = await supabaseAdmin
      .from("comments")
      .select("id, content, created_at, guests(nickname, avatar)")
      .eq("media_id", mediaId)
      .order("created_at", { ascending: true });

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ comments: data || [] });
  } catch {
    return NextResponse.json({ error: "שגיאת שרת" }, { status: 500 });
  }
}

// POST — add a comment
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: mediaId } = await params;
    const { guest_id, event_id, content } = await req.json();

    if (!guest_id || !event_id || !content?.trim()) {
      return NextResponse.json({ error: "חסרים פרמטרים" }, { status: 400 });
    }

    if (content.trim().length > 300) {
      return NextResponse.json({ error: "התגובה ארוכה מדי" }, { status: 400 });
    }

    // Profanity filter
    const pErr = profanityError(content.trim());
    if (pErr) return NextResponse.json({ error: pErr }, { status: 400 });

    // Rate limit: max 15 comments per minute per guest
    const ip = getClientIp(req.headers);
    if (isRateLimited(`comment:${guest_id}:${ip}`, { limit: 15, windowSec: 60 })) {
      return NextResponse.json({ error: "יותר מדי תגובות — המתן רגע" }, { status: 429 });
    }

    // Check if guest is blocked
    const { data: commenterGuest } = await supabaseAdmin
      .from("guests")
      .select("id, blocked")
      .eq("id", guest_id)
      .eq("event_id", event_id)
      .single();

    if (commenterGuest?.blocked === true) {
      return NextResponse.json({ error: "חשבונך חסום" }, { status: 403 });
    }

    const { data, error } = await supabaseAdmin
      .from("comments")
      .insert({ event_id, media_id: mediaId, guest_id, content: content.trim() })
      .select("id, content, created_at, guests(nickname, avatar)")
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    // In-app notification (fire-and-forget)
    void (async () => {
      try {
        const { data: media } = await supabaseAdmin
          .from("media").select("guest_id").eq("id", mediaId).single();
        const { data: commenter } = await supabaseAdmin
          .from("guests").select("nickname, avatar").eq("id", guest_id).single();
        if (!media || !commenter) return;

        await createNotificationForOwnerAndAdmins({
          eventId: event_id,
          recipientId: media.guest_id,
          type: "comment",
          actorId: guest_id,
          actorName: commenter.nickname,
          actorAvatar: commenter.avatar ?? null,
          content: `${commenter.nickname} הגיב/ה על התמונה שלך: ${content.trim().slice(0, 50)}`,
          mediaId,
          adminEventId: event_id,
        });
      } catch { /* silent */ }
    })();

    return NextResponse.json({ comment: data });
  } catch {
    return NextResponse.json({ error: "שגיאת שרת" }, { status: 500 });
  }
}
