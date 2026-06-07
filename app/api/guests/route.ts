import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server";
import { generateId } from "@/lib/utils";
import { isRateLimited, getClientIp } from "@/lib/rateLimit";
import { profanityError } from "@/lib/profanity";

// GET /api/guests?eventId=xxx — list all guests for an event
export async function GET(req: NextRequest) {
  const eventId = new URL(req.url).searchParams.get("eventId");
  if (!eventId) return NextResponse.json({ error: "missing eventId" }, { status: 400 });

  const { data, error } = await supabaseAdmin
    .from("guests")
    .select("id, nickname, avatar")
    .eq("event_id", eventId)
    .order("nickname", { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ guests: data ?? [] });
}

export async function POST(req: NextRequest) {
  try {
    const { event_id, nickname, avatar, device_token } = await req.json();

    if (!event_id || !nickname || nickname.trim().length < 2) {
      return NextResponse.json({ error: "שדות חסרים או לא תקינים" }, { status: 400 });
    }

    if (nickname.trim().length > 30) {
      return NextResponse.json({ error: "הכינוי ארוך מדי" }, { status: 400 });
    }

    const trimmedNickname = nickname.trim();

    // Rate limit: max 5 new guest registrations per IP per hour
    const ip = getClientIp(req.headers);
    if (isRateLimited(`guest-reg:${ip}`, { limit: 5, windowSec: 3600 })) {
      return NextResponse.json({ error: "יותר מדי ניסיונות כניסה — נסה שוב מאוחר יותר" }, { status: 429 });
    }

    // Profanity filter on nickname
    const pErr = profanityError(trimmedNickname);
    if (pErr) return NextResponse.json({ error: "הכינוי אינו מתאים — אנא בחר כינוי אחר" }, { status: 400 });

    const RESERVED_NICKNAMES = ["מנהל האירוע", "admin", "administrator", "מנהל"];
    const isReserved = (name: string) =>
      RESERVED_NICKNAMES.some(r => name.trim().toLowerCase() === r.toLowerCase());

    if (isReserved(trimmedNickname)) {
      return NextResponse.json({ error: "כינוי זה שמור ואינו זמין" }, { status: 400 });
    }

    // Verify event exists
    const { data: event, error: eventError } = await supabaseAdmin
      .from("events")
      .select("id, uploads_open")
      .eq("id", event_id)
      .single();

    if (eventError || !event) {
      return NextResponse.json({ error: "אירוע לא נמצא" }, { status: 404 });
    }

    // Check if nickname already exists in this event
    const { data: existingRows } = await supabaseAdmin
      .from("guests")
      .select("id, nickname, avatar, device_token")
      .eq("event_id", event_id)
      .eq("nickname", trimmedNickname)
      .limit(1);

    const existing = existingRows?.[0] ?? null;

    if (existing) {
      // Block reconnect to any reserved-name record (e.g. admin guest)
      if (isReserved(existing.nickname)) {
        return NextResponse.json({ error: "כינוי זה שמור ואינו זמין" }, { status: 400 });
      }

      // Same token → reconnect as-is
      if (existing.device_token && existing.device_token === device_token) {
        return NextResponse.json({ guest: existing, reconnected: true });
      }

      // Different or missing token → update it and allow reconnect
      // (covers cleared localStorage, new browser, Safari storage expiry, etc.)
      const { data: updated } = await supabaseAdmin
        .from("guests")
        .update({ device_token: device_token || existing.device_token })
        .eq("id", existing.id)
        .select()
        .single();
      return NextResponse.json({ guest: updated ?? existing, reconnected: true });
    }

    // Create new guest
    const id = generateId();
    const { data, error } = await supabaseAdmin
      .from("guests")
      .insert({ id, event_id, nickname: trimmedNickname, avatar: avatar || null, device_token: device_token || null })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: "שגיאה בכניסה לאירוע" }, { status: 500 });
    }

    return NextResponse.json({ guest: data, reconnected: false });
  } catch (err) {
    console.error("POST /api/guests error:", err);
    return NextResponse.json({ error: "שגיאת שרת" }, { status: 500 });
  }
}
