import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const { data: lic, error } = await supabaseAdmin
    .from("licenses")
    .select("*")
    .eq("id", id)
    .single();

  if (error || !lic) return NextResponse.json({ error: "license not found" }, { status: 404 });

  if (lic.type === "onetime") {
    // Deactivate — single use
    await supabaseAdmin.from("licenses").update({ is_active: false }).eq("id", id);
  } else {
    // Increment counter
    await supabaseAdmin
      .from("licenses")
      .update({ events_used: lic.events_used + 1 })
      .eq("id", id);
  }

  return NextResponse.json({ ok: true });
}
