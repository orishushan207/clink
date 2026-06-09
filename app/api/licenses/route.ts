import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { email, type, days_access, events_per_month, ai_images_limit, plan_tier } = body;

    if (!email || !type) return NextResponse.json({ error: "missing fields" }, { status: 400 });

    // mosaic_enabled: Spark and Crown include Clink פסיפס; Lite does not
    const mosaic_enabled = plan_tier === "spark" || plan_tier === "crown";

    const record: Record<string, unknown> = {
      email: email.trim().toLowerCase(),
      type,
      is_active: true,
      // null = no AI, -1 = unlimited, N = quota per event
      ai_images_limit: ai_images_limit ?? null,
      mosaic_enabled,
    };

    if (type === "onetime") {
      record.days_access = days_access ?? 2;
    } else {
      record.events_per_month = events_per_month ?? null; // null = unlimited
      record.period_start = new Date().toISOString().slice(0, 10);
      record.events_used = 0;
    }

    const { data, error } = await supabaseAdmin
      .from("licenses")
      .insert(record)
      .select()
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ license: data });
  } catch {
    return NextResponse.json({ error: "server error" }, { status: 500 });
  }
}
