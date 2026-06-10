import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server";
import { generateId } from "@/lib/utils";

// GET — list saved mosaics for an event
export async function GET(req: NextRequest) {
  const eventId = req.nextUrl.searchParams.get("eventId");
  if (!eventId) {
    return NextResponse.json({ error: "Missing eventId" }, { status: 400 });
  }

  const { data, error } = await supabaseAdmin
    .from("mosaics")
    .select("id, image_url, created_at")
    .eq("event_id", eventId)
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ mosaics: data ?? [] });
}

// POST — generate & save a new mosaic (kept indefinitely, multiple per event)
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

  const mosaicId = generateId();
  const path = `mosaics/${eventId}/${mosaicId}.jpg`;

  const { error } = await supabaseAdmin.storage
    .from("event-covers")
    .upload(path, buffer, { contentType: "image/jpeg", upsert: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const { data: { publicUrl } } = supabaseAdmin.storage
    .from("event-covers")
    .getPublicUrl(path);

  // Save to history table
  await supabaseAdmin.from("mosaics").insert({ id: mosaicId, event_id: eventId, image_url: publicUrl });

  // Keep events.mosaic_url pointing at the latest mosaic (used by older code paths)
  await supabaseAdmin
    .from("events")
    .update({ mosaic_url: publicUrl })
    .eq("id", eventId);

  return NextResponse.json({ url: publicUrl, id: mosaicId });
}

// DELETE — remove a saved mosaic
export async function DELETE(req: NextRequest) {
  const { id, eventId, adminToken } = await req.json();

  if (!id || !eventId || !adminToken) {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  }

  const { data: event } = await supabaseAdmin
    .from("events")
    .select("admin_token")
    .eq("id", eventId)
    .single();

  if (!event || event.admin_token !== adminToken) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: mosaic } = await supabaseAdmin
    .from("mosaics")
    .select("image_url")
    .eq("id", id)
    .eq("event_id", eventId)
    .single();

  if (mosaic?.image_url) {
    try {
      const marker = "/storage/v1/object/public/event-covers/";
      const idx = mosaic.image_url.indexOf(marker);
      if (idx !== -1) {
        const path = mosaic.image_url.slice(idx + marker.length);
        await supabaseAdmin.storage.from("event-covers").remove([path]);
      }
    } catch { /* best-effort */ }
  }

  await supabaseAdmin.from("mosaics").delete().eq("id", id).eq("event_id", eventId);

  return NextResponse.json({ success: true });
}
