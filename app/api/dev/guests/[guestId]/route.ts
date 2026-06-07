import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server";
import { validateDevToken } from "@/lib/dev-auth";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ guestId: string }> }) {
  if (!validateDevToken(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { guestId } = await params;
  const { blocked } = await req.json();

  const { error } = await supabaseAdmin.from("guests").update({ blocked }).eq("id", guestId);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
