import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server";

export async function POST(req: Request) {
  try {
    const body = await req.json();

    // ── Email + password login (new primary method) ──
    if (body.email && body.password) {
      const email = body.email.trim().toLowerCase();
      const password = body.password.trim();

      const { data: events } = await supabaseAdmin
        .from("events")
        .select("id, admin_token, admin_password, slug, name")
        .eq("admin_email", email);

      if (!events || events.length === 0) {
        return NextResponse.json({ error: "invalid credentials" }, { status: 401 });
      }

      const matched = events.filter((e) => e.admin_password === password);
      if (matched.length === 0) {
        return NextResponse.json({ error: "invalid credentials" }, { status: 401 });
      }

      // Return all matching events so the client can pick one (usually just one)
      return NextResponse.json({
        events: matched.map((e) => ({
          eventId: e.id,
          adminToken: e.admin_token,
          slug: e.slug,
          name: e.name,
        })),
      });
    }

    // ── Legacy slug + token login ──
    if (body.slug && body.token) {
      const { data } = await supabaseAdmin
        .from("events")
        .select("id, admin_token, admin_password, slug")
        .eq("slug", body.slug.trim())
        .single();

      if (!data) {
        return NextResponse.json({ error: "invalid credentials" }, { status: 401 });
      }

      const inputToken = body.token.trim();
      const valid = data.admin_password
        ? inputToken === data.admin_password
        : inputToken === data.admin_token;

      if (!valid) {
        return NextResponse.json({ error: "invalid credentials" }, { status: 401 });
      }

      return NextResponse.json({
        events: [{ eventId: data.id, adminToken: data.admin_token, slug: data.slug }],
      });
    }

    return NextResponse.json({ error: "missing fields" }, { status: 400 });
  } catch {
    return NextResponse.json({ error: "server error" }, { status: 500 });
  }
}
