import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server";

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get("token");
  const eventId = req.nextUrl.searchParams.get("eventId");
  if (!token || !eventId) return NextResponse.json({ error: "missing params" }, { status: 400 });

  // Verify event belongs to this vendor
  const { data: ev } = await supabaseAdmin
    .from("events")
    .select("id")
    .eq("id", eventId)
    .eq("vendor_token", token)
    .single();

  if (!ev) return NextResponse.json({ error: "unauthorized" }, { status: 403 });

  const [mediaRes, guestsRes, pendingRes] = await Promise.all([
    supabaseAdmin.from("media").select("id", { count: "exact", head: true }).eq("event_id", eventId).eq("status", "approved"),
    supabaseAdmin.from("guests").select("id", { count: "exact", head: true }).eq("event_id", eventId),
    supabaseAdmin.from("media").select("id", { count: "exact", head: true }).eq("event_id", eventId).eq("status", "pending"),
  ]);

  return NextResponse.json({
    mediaCount: mediaRes.count ?? 0,
    guestCount: guestsRes.count ?? 0,
    pendingCount: pendingRes.count ?? 0,
  });
}
