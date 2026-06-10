import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server";

type PlanTier = "lite" | "spark" | "crown";
type LicenseType = "onetime" | "subscription";

// Server-side source of truth for plan entitlements.
// IMPORTANT: never trust ai_images_limit / events_per_month / mosaic_enabled /
// days_access from the client — derive them here from plan_tier + type only,
// otherwise anyone could POST { plan_tier: "crown", ai_images_limit: -1,
// events_per_month: null } and mint themselves a free unlimited license.
const PLAN_LIMITS: Record<
  PlanTier,
  { mosaic_enabled: boolean; ai_images_limit: number | null; days_access: number; events_per_month: number | null }
> = {
  lite: { mosaic_enabled: false, ai_images_limit: null, days_access: 2, events_per_month: 4 },
  spark: { mosaic_enabled: true, ai_images_limit: null, days_access: 3, events_per_month: 4 },
  crown: { mosaic_enabled: true, ai_images_limit: -1, days_access: 3, events_per_month: 4 },
};

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { email, type, plan_tier } = body;

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email))) {
      return NextResponse.json({ error: "missing or invalid email" }, { status: 400 });
    }
    if (type !== "onetime" && type !== "subscription") {
      return NextResponse.json({ error: "invalid type" }, { status: 400 });
    }
    if (!["lite", "spark", "crown"].includes(plan_tier)) {
      return NextResponse.json({ error: "invalid plan_tier" }, { status: 400 });
    }

    const limits = PLAN_LIMITS[plan_tier as PlanTier];

    const record: Record<string, unknown> = {
      email: email.trim().toLowerCase(),
      type,
      is_active: true,
      // null = no AI, -1 = unlimited, N = quota per event
      ai_images_limit: limits.ai_images_limit,
      mosaic_enabled: limits.mosaic_enabled,
    };

    if (type === "onetime") {
      record.days_access = limits.days_access;
    } else {
      record.events_per_month = limits.events_per_month; // null = unlimited
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
