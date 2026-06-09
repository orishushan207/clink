import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server";
import { generateSlug, generateAdminToken, generateId, getEventUrl, getAdminUrl } from "@/lib/utils";
import { sendEventCreatedEmail } from "@/lib/email";
import type { CreateEventPayload } from "@/types";

export async function POST(req: NextRequest) {
  try {
    const body: CreateEventPayload = await req.json();

    if (!body.name || body.name.trim().length < 2) {
      return NextResponse.json(
        { error: "שם האירוע חייב להכיל לפחות 2 תווים" },
        { status: 400 }
      );
    }

    if (!body.admin_email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(body.admin_email.trim())) {
      return NextResponse.json(
        { error: "יש להזין כתובת מייל תקינה" },
        { status: 400 }
      );
    }

    if (!body.admin_password || body.admin_password.trim().length < 6) {
      return NextResponse.json(
        { error: "הסיסמה חייבת להכיל לפחות 6 תווים" },
        { status: 400 }
      );
    }

    const id = generateId();
    const slug = generateSlug();
    const adminToken = generateAdminToken();

    const extBody = body as { vendor_token?: string; license_id?: string; guest_lock_hours?: number };
    const daysAccess = Math.max(2, Math.round((extBody.guest_lock_hours ?? 48) / 24));
    const expiresAt = new Date(Date.now() + daysAccess * 24 * 60 * 60 * 1000).toISOString();

    // Fetch license plan permissions
    let mosaic_enabled = false;
    if (extBody.license_id) {
      const { data: lic } = await supabaseAdmin
        .from("licenses")
        .select("mosaic_enabled")
        .eq("id", extBody.license_id)
        .single();
      mosaic_enabled = lic?.mosaic_enabled ?? false;
    }

    const { data, error } = await supabaseAdmin
      .from("events")
      .insert({
        id,
        name: body.name.trim(),
        slug,
        description: body.description?.trim() || null,
        event_date: body.event_date || null,
        cover_image_url: body.cover_image_url || null,
        allow_video: body.allow_video ?? true,
        require_approval: body.require_approval ?? false,
        show_leaderboard: body.show_leaderboard ?? true,
        privacy_mode: body.privacy_mode || "open",
        uploads_open: true,
        admin_token: adminToken,
        admin_email: body.admin_email.trim().toLowerCase(),
        admin_password: body.admin_password.trim(),
        guest_lock_hours: extBody.guest_lock_hours ?? 48,
        vendor_token: extBody.vendor_token?.trim() || null,
        license_id: extBody.license_id || null,
        expires_at: expiresAt,
        mosaic_enabled,
      })
      .select()
      .single();

    if (error) {
      console.error("Create event error:", error);
      return NextResponse.json(
        { error: "שגיאה ביצירת האירוע" },
        { status: 500 }
      );
    }

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    const eventUrl = getEventUrl(slug, baseUrl);
    const adminUrl = getAdminUrl(id, adminToken, baseUrl);

    // Send confirmation email (fire-and-forget)
    void sendEventCreatedEmail({
      to: body.admin_email.trim(),
      email: body.admin_email.trim(),
      password: body.admin_password.trim(),
      eventName: body.name.trim(),
      eventUrl,
      adminUrl,
    }).catch(err => console.error("Failed to send event email:", err));

    return NextResponse.json({ event: data, eventUrl, adminUrl });
  } catch (err) {
    console.error("POST /api/events error:", err);
    return NextResponse.json({ error: "שגיאת שרת" }, { status: 500 });
  }
}
