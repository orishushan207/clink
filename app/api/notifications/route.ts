import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server";

// GET /api/notifications?eventId=&guestId=&isAdmin=true
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const eventId = searchParams.get("eventId");
  const guestId = searchParams.get("guestId");
  const isAdmin = searchParams.get("isAdmin") === "true";

  if (!eventId) {
    return NextResponse.json({ error: "missing eventId" }, { status: 400 });
  }

  let query = supabaseAdmin
    .from("notifications")
    .select("id, type, actor_id, actor_name, actor_avatar, content, read_at, created_at, media_id, media:media_id(file_url, media_type)")
    .eq("event_id", eventId)
    .order("created_at", { ascending: false })
    .limit(30);

  if (isAdmin) {
    query = query.is("recipient_id", null);
  } else if (guestId) {
    query = query.eq("recipient_id", guestId);
  } else {
    return NextResponse.json({ notifications: [] });
  }

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ notifications: data ?? [] });
}

// PATCH /api/notifications — mark as read
export async function PATCH(req: NextRequest) {
  const { ids } = await req.json();
  if (!ids?.length) return NextResponse.json({ ok: true });

  await supabaseAdmin
    .from("notifications")
    .update({ read_at: new Date().toISOString() })
    .in("id", ids);

  return NextResponse.json({ ok: true });
}
