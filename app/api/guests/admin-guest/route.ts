import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server";
import { generateId } from "@/lib/utils";

// Get-or-create a special admin guest for the event so the admin can upload photos
export async function POST(req: NextRequest) {
  try {
    const { eventId, adminToken } = await req.json();
    if (!eventId || !adminToken) {
      return NextResponse.json({ error: "חסרים פרטים" }, { status: 400 });
    }

    // Verify admin token
    const { data: event } = await supabaseAdmin
      .from("events")
      .select("id, admin_token")
      .eq("id", eventId)
      .single();

    if (!event || event.admin_token !== adminToken) {
      return NextResponse.json({ error: "לא מורשה" }, { status: 403 });
    }

    // Check if admin guest already exists
    const { data: existing } = await supabaseAdmin
      .from("guests")
      .select("id")
      .eq("event_id", eventId)
      .eq("nickname", "מנהל האירוע")
      .maybeSingle();

    if (existing) {
      return NextResponse.json({ guestId: existing.id });
    }

    // Create admin guest
    const { data: newGuest, error } = await supabaseAdmin
      .from("guests")
      .insert({ id: generateId(), event_id: eventId, nickname: "מנהל האירוע", avatar: "👑" })
      .select("id")
      .single();

    if (error || !newGuest) {
      return NextResponse.json({ error: "שגיאה ביצירת אורח" }, { status: 500 });
    }

    return NextResponse.json({ guestId: newGuest.id });
  } catch {
    return NextResponse.json({ error: "שגיאת שרת" }, { status: 500 });
  }
}
