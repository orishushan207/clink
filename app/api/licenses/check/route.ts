import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server";

export async function GET(req: NextRequest) {
  const email = req.nextUrl.searchParams.get("email")?.trim().toLowerCase();
  if (!email) return NextResponse.json({ error: "missing email" }, { status: 400 });

  const { data: licenses, error } = await supabaseAdmin
    .from("licenses")
    .select("*")
    .eq("email", email)
    .eq("is_active", true)
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!licenses || licenses.length === 0) {
    return NextResponse.json({ valid: false, reason: "no_license" });
  }

  // Find a usable license
  for (const lic of licenses) {
    if (lic.type === "onetime") {
      // One-time: active means it hasn't been used yet (will be deactivated after first event)
      return NextResponse.json({ valid: true, license: lic });
    }

    if (lic.type === "subscription") {
      // Check if period needs resetting (new month)
      const periodStart = new Date(lic.period_start);
      const now = new Date();
      const monthsElapsed =
        (now.getFullYear() - periodStart.getFullYear()) * 12 +
        (now.getMonth() - periodStart.getMonth());

      if (monthsElapsed >= 1) {
        // Reset period
        const newPeriodStart = new Date(now.getFullYear(), now.getMonth(), 1)
          .toISOString()
          .slice(0, 10);
        await supabaseAdmin
          .from("licenses")
          .update({ period_start: newPeriodStart, events_used: 0 })
          .eq("id", lic.id);
        lic.period_start = newPeriodStart;
        lic.events_used = 0;
      }

      // Check quota
      const unlimited = lic.events_per_month === null;
      const hasQuota = unlimited || lic.events_used < lic.events_per_month;

      if (!hasQuota) {
        return NextResponse.json({
          valid: false,
          reason: "quota_exceeded",
          license: lic,
          resets_at: new Date(
            new Date(lic.period_start).getFullYear(),
            new Date(lic.period_start).getMonth() + 1,
            1
          ).toISOString(),
        });
      }

      return NextResponse.json({ valid: true, license: lic });
    }
  }

  return NextResponse.json({ valid: false, reason: "no_license" });
}
