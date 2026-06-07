import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server";
import { validateDevToken } from "@/lib/dev-auth";

export async function GET(req: NextRequest) {
  if (!validateDevToken(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data, error } = await supabaseAdmin
    .from("events")
    .select("id, name, slug, event_date, uploads_open, require_approval, admin_email, created_at, privacy_mode, allow_video, expires_at, license_id, licenses(type, days_access, events_per_month, events_used)")
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ events: data });
}
