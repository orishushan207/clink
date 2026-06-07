import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ guestId: string }> }) {
  const { guestId } = await params;
  const body = await req.json();

  const updates: Record<string, string> = {};
  if (typeof body.nickname === "string" && body.nickname.trim().length >= 2) {
    updates.nickname = body.nickname.trim();
  }
  if (typeof body.avatar === "string") {
    updates.avatar = body.avatar;
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: "nothing to update" }, { status: 400 });
  }

  const { data, error } = await supabaseAdmin
    .from("guests")
    .update(updates)
    .eq("id", guestId)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ guest: data });
}
