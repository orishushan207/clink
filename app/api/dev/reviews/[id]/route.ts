import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server";
import { validateDevToken } from "@/lib/dev-auth";

// PATCH /api/dev/reviews/[id] — hide / show a review (toggle approved)
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!validateDevToken(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const body = await req.json();

  if (typeof body.approved !== "boolean") {
    return NextResponse.json({ error: "No valid fields" }, { status: 400 });
  }

  const { error } = await supabaseAdmin
    .from("reviews")
    .update({ approved: body.approved })
    .eq("id", id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

// DELETE /api/dev/reviews/[id] — permanently delete a review
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!validateDevToken(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;

  const { error } = await supabaseAdmin.from("reviews").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
