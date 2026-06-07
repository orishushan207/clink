import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server";
import { createNotification } from "@/lib/notifications";
import { isRateLimited, getClientIp } from "@/lib/rateLimit";
import { profanityError } from "@/lib/profanity";

// GET /api/messages?eventId=&guestId=&otherId=   (private 1:1)
// GET /api/messages?eventId=&group=1              (group chat)
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const eventId = searchParams.get("eventId");
  const isGroup = searchParams.get("group") === "1";

  if (!eventId) {
    return NextResponse.json({ error: "missing params" }, { status: 400 });
  }

  // Group chat: fetch all messages where receiver_id IS NULL
  if (isGroup) {
    const { data, error } = await supabaseAdmin
      .from("messages")
      .select("id, sender_id, receiver_id, content, created_at, read_at")
      .eq("event_id", eventId)
      .is("receiver_id", null)
      .order("created_at", { ascending: true });

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ messages: data ?? [] });
  }

  // Private 1:1 chat
  const guestId = searchParams.get("guestId");
  const otherId = searchParams.get("otherId");

  if (!guestId || !otherId) {
    return NextResponse.json({ error: "missing params" }, { status: 400 });
  }

  const { data, error } = await supabaseAdmin
    .from("messages")
    .select("id, sender_id, receiver_id, content, created_at, read_at")
    .eq("event_id", eventId)
    .or(
      `and(sender_id.eq.${guestId},receiver_id.eq.${otherId}),and(sender_id.eq.${otherId},receiver_id.eq.${guestId})`
    )
    .order("created_at", { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Mark messages from other as read
  await supabaseAdmin
    .from("messages")
    .update({ read_at: new Date().toISOString() })
    .eq("event_id", eventId)
    .eq("sender_id", otherId)
    .eq("receiver_id", guestId)
    .is("read_at", null);

  // Mark related notifications as read too
  await supabaseAdmin
    .from("notifications")
    .update({ read_at: new Date().toISOString() })
    .eq("event_id", eventId)
    .eq("recipient_id", guestId)
    .eq("type", "message")
    .eq("actor_id", otherId)
    .is("read_at", null);

  return NextResponse.json({ messages: data ?? [] });
}

// POST /api/messages — send a message
// For group messages, set receiverId to null (or omit it).
export async function POST(req: NextRequest) {
  const body = await req.json();
  const { eventId, senderId, content } = body;
  // receiverId is null for group messages, a guest ID for private messages
  const receiverId: string | null = body.receiverId ?? null;

  if (!eventId || !senderId || !content?.trim()) {
    return NextResponse.json({ error: "missing fields" }, { status: 400 });
  }

  // Rate limit: max 20 messages per minute per guest
  const ip = getClientIp(req.headers);
  const rateLimitKey = `msg:${senderId}:${ip}`;
  if (isRateLimited(rateLimitKey, { limit: 20, windowSec: 60 })) {
    return NextResponse.json({ error: "שלחת יותר מדי הודעות — המתן רגע" }, { status: 429 });
  }

  // Message length limit
  if (content.trim().length > 500) {
    return NextResponse.json({ error: "ההודעה ארוכה מדי (מקסימום 500 תווים)" }, { status: 400 });
  }

  // Profanity filter
  const pErr = profanityError(content.trim());
  if (pErr) return NextResponse.json({ error: pErr }, { status: 400 });

  // Check if sender is blocked
  const { data: senderGuest } = await supabaseAdmin
    .from("guests")
    .select("id, blocked")
    .eq("id", senderId)
    .eq("event_id", eventId)
    .single();

  if (senderGuest?.blocked === true) {
    return NextResponse.json({ error: "חשבונך חסום" }, { status: 403 });
  }

  const { data: msg, error } = await supabaseAdmin
    .from("messages")
    .insert({
      event_id: eventId,
      sender_id: senderId,
      receiver_id: receiverId,
      content: content.trim(),
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // In-app notification only for private 1:1 messages
  if (receiverId) {
    void (async () => {
      try {
        const { data: sender } = await supabaseAdmin
          .from("guests").select("nickname, avatar").eq("id", senderId).single();
        await createNotification({
          eventId,
          recipientId: receiverId,
          type: "message",
          actorId: senderId,
          actorName: sender?.nickname ?? "אורח",
          actorAvatar: sender?.avatar ?? null,
          content: `${sender?.nickname ?? "אורח"}: ${content.trim().slice(0, 50)}`,
        });
      } catch { /* silent */ }
    })();
  }

  return NextResponse.json({ message: msg });
}
