// SQL needed to add blocked column to guests table:
// ALTER TABLE guests ADD COLUMN blocked BOOLEAN NOT NULL DEFAULT FALSE;

import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server";

// POST /api/guests/[guestId]/block
// Body: { eventId: string, adminToken: string, blocked: boolean }
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ guestId: string }> }
) {
  try {
    const { guestId } = await params;
    const { eventId, adminToken, blocked } = await req.json();

    if (!eventId || !adminToken || typeof blocked !== "boolean") {
      return NextResponse.json({ error: "חסרים פרמטרים נדרשים" }, { status: 400 });
    }

    // Verify adminToken against the event
    const { data: event, error: eventError } = await supabaseAdmin
      .from("events")
      .select("id, admin_token")
      .eq("id", eventId)
      .single();

    if (eventError || !event) {
      return NextResponse.json({ error: "אירוע לא נמצא" }, { status: 404 });
    }

    if (event.admin_token !== adminToken) {
      return NextResponse.json({ error: "אין הרשאה" }, { status: 403 });
    }

    // Update guest blocked status
    const { error: updateError } = await supabaseAdmin
      .from("guests")
      .update({ blocked })
      .eq("id", guestId)
      .eq("event_id", eventId);

    if (updateError) {
      console.error("Block guest error:", updateError);
      return NextResponse.json({ error: "שגיאה בעדכון סטטוס חסימה" }, { status: 500 });
    }

    return NextResponse.json({ success: true, blocked });
  } catch (err) {
    console.error("POST /api/guests/[guestId]/block error:", err);
    return NextResponse.json({ error: "שגיאת שרת" }, { status: 500 });
  }
}
