import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server";

export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const { data } = await supabaseAdmin
    .from("events")
    .select("expires_at, uploads_open")
    .eq("id", id)
    .single();

  if (!data) return NextResponse.json({ ok: false });

  // Only close if truly expired and currently open
  if (data.uploads_open && data.expires_at && new Date(data.expires_at) < new Date()) {
    await supabaseAdmin
      .from("events")
      .update({ uploads_open: false })
      .eq("id", id);
  }

  return NextResponse.json({ ok: true });
}
