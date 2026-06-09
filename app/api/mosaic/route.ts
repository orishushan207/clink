import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server";

export async function POST(req: NextRequest) {
  const { dataUrl, eventId, adminToken } = await req.json();

  if (!dataUrl || !eventId || !adminToken) {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  }

  // Verify admin token + mosaic plan
  const { data: event } = await supabaseAdmin
    .from("events")
    .select("id, admin_token, mosaic_enabled")
    .eq("id", eventId)
    .single();

  if (!event || event.admin_token !== adminToken) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!event.mosaic_enabled) {
    return NextResponse.json({ error: "Clink פסיפס לא כלול במסלול שלך — שדרג ל-Spark או Crown" }, { status: 403 });
  }

  // Convert base64 data URL to Buffer
  const base64 = dataUrl.replace(/^data:image\/\w+;base64,/, "");
  const buffer = Buffer.from(base64, "base64");

  const path = `mosaics/${eventId}/mosaic.jpg`;

  const { error } = await supabaseAdmin.storage
    .from("event-covers")
    .upload(path, buffer, { contentType: "image/jpeg", upsert: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const { data: { publicUrl } } = supabaseAdmin.storage
    .from("event-covers")
    .getPublicUrl(path);

  await supabaseAdmin
    .from("events")
    .update({ mosaic_url: publicUrl })
    .eq("id", eventId);

  return NextResponse.json({ url: publicUrl });
}
