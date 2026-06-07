import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server";
import { validateDevToken } from "@/lib/dev-auth";

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ mediaId: string }> }) {
  if (!validateDevToken(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { mediaId } = await params;

  const { data } = await supabaseAdmin.from("media").select("file_url, thumbnail_url").eq("id", mediaId).single();

  if (data) {
    const paths = [data.file_url, data.thumbnail_url].filter(Boolean).map((u) => {
      try { return new URL(u as string).pathname.split("/storage/v1/object/public/media/")[1]; } catch { return null; }
    }).filter(Boolean) as string[];
    if (paths.length > 0) await supabaseAdmin.storage.from("media").remove(paths);
  }

  const { error } = await supabaseAdmin.from("media").delete().eq("id", mediaId);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
