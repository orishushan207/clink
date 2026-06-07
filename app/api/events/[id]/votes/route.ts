import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server";

// GET — all votes for an event
// Query param: guestId (optional) — returns myVotedMediaId for that guest
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: eventId } = await params;
    const guestId = new URL(req.url).searchParams.get("guestId");

    const { data, error } = await supabaseAdmin
      .from("votes")
      .select("media_id, guest_id")
      .eq("event_id", eventId);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    // Count votes per media
    const counts: Record<string, number> = {};
    let myVotedMediaId: string | null = null;

    for (const row of data ?? []) {
      counts[row.media_id] = (counts[row.media_id] ?? 0) + 1;
      if (guestId && row.guest_id === guestId) {
        myVotedMediaId = row.media_id;
      }
    }

    return NextResponse.json({ votes: counts, myVotedMediaId });
  } catch {
    return NextResponse.json({ error: "שגיאת שרת" }, { status: 500 });
  }
}

// POST — cast or remove a vote
// Body: { guest_id, media_id, action: "cast" | "remove" }
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: eventId } = await params;
    const { guest_id, media_id, action } = await req.json();

    if (!guest_id || !media_id) {
      return NextResponse.json({ error: "חסרים פרמטרים" }, { status: 400 });
    }

    if (action === "remove") {
      await supabaseAdmin
        .from("votes")
        .delete()
        .eq("event_id", eventId)
        .eq("guest_id", guest_id);

      return NextResponse.json({ ok: true, voted: false });
    }

    // Upsert — if guest already voted for another photo, move the vote
    const { error } = await supabaseAdmin
      .from("votes")
      .upsert(
        { event_id: eventId, media_id, guest_id },
        { onConflict: "event_id,guest_id" }
      );

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ ok: true, voted: true });
  } catch {
    return NextResponse.json({ error: "שגיאת שרת" }, { status: 500 });
  }
}
