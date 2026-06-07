import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server";

export async function POST(req: NextRequest) {
  const { guestId, eventId, subscription, preferences } = await req.json();
  if (!guestId || !eventId || !subscription) {
    return NextResponse.json({ error: "missing fields" }, { status: 400 });
  }

  const { error } = await supabaseAdmin
    .from("push_subscriptions")
    .upsert(
      {
        guest_id: guestId,
        event_id: eventId,
        subscription,
        notify_messages: preferences?.messages ?? true,
        notify_likes: preferences?.likes ?? true,
        notify_admin_all: preferences?.adminAll ?? false,
      },
      { onConflict: "guest_id,event_id" }
    );

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest) {
  const { guestId, eventId } = await req.json();
  if (!guestId || !eventId) return NextResponse.json({ error: "missing" }, { status: 400 });
  await supabaseAdmin
    .from("push_subscriptions")
    .delete()
    .eq("guest_id", guestId)
    .eq("event_id", eventId);
  return NextResponse.json({ ok: true });
}
