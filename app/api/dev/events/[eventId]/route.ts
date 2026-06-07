import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server";
import { validateDevToken } from "@/lib/dev-auth";

export async function GET(req: NextRequest, { params }: { params: Promise<{ eventId: string }> }) {
  if (!validateDevToken(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { eventId } = await params;

  const [eventRes, mediaRes, guestsRes] = await Promise.all([
    supabaseAdmin.from("events").select("*").eq("id", eventId).single(),
    supabaseAdmin.from("media").select("id, file_url, thumbnail_url, media_type, status, created_at, guest_id").eq("event_id", eventId).order("created_at", { ascending: false }),
    supabaseAdmin.from("guests").select("id, nickname, avatar, created_at").eq("event_id", eventId).order("created_at", { ascending: false }),
  ]);

  if (eventRes.error) return NextResponse.json({ error: "Event not found" }, { status: 404 });
  return NextResponse.json({ event: eventRes.data, media: mediaRes.data ?? [], guests: guestsRes.data ?? [] });
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ eventId: string }> }) {
  if (!validateDevToken(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { eventId } = await params;
  const body = await req.json();

  const allowed = ["admin_password", "uploads_open", "require_approval", "name", "description"];
  const updates: Record<string, unknown> = {};
  for (const key of allowed) {
    if (key in body) updates[key] = body[key];
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: "No valid fields" }, { status: 400 });
  }

  const { error } = await supabaseAdmin.from("events").update(updates).eq("id", eventId);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ eventId: string }> }) {
  if (!validateDevToken(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { eventId } = await params;

  // Delete all media files from storage
  const { data: mediaFiles } = await supabaseAdmin
    .from("media")
    .select("file_url, thumbnail_url")
    .eq("event_id", eventId);

  if (mediaFiles && mediaFiles.length > 0) {
    const paths = mediaFiles.flatMap((m) => {
      const urls = [m.file_url, m.thumbnail_url].filter(Boolean) as string[];
      return urls.map((u) => {
        try { return new URL(u).pathname.split("/storage/v1/object/public/media/")[1]; } catch { return null; }
      }).filter(Boolean) as string[];
    });
    if (paths.length > 0) {
      await supabaseAdmin.storage.from("media").remove(paths);
    }
  }

  // Delete event (cascades to media, guests, etc.)
  const { error } = await supabaseAdmin.from("events").delete().eq("id", eventId);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
