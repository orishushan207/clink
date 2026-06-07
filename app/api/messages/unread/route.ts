import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server";

// GET /api/messages/unread?eventId=&guestId=
// Returns { total: number, bySender: { [senderId]: count } }
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const eventId = searchParams.get("eventId");
  const guestId = searchParams.get("guestId");

  if (!eventId || !guestId) return NextResponse.json({ error: "missing" }, { status: 400 });

  const { data } = await supabaseAdmin
    .from("messages")
    .select("sender_id")
    .eq("event_id", eventId)
    .eq("receiver_id", guestId)
    .is("read_at", null);

  const bySender: Record<string, number> = {};
  for (const row of data ?? []) {
    bySender[row.sender_id] = (bySender[row.sender_id] ?? 0) + 1;
  }

  return NextResponse.json({ total: data?.length ?? 0, bySender });
}
