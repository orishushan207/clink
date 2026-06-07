import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server";

export async function POST(req: NextRequest) {
  try {
    const { eventId, token } = await req.json();
    if (!eventId || !token) {
      return NextResponse.json({ valid: false }, { status: 400 });
    }

    const { data } = await supabaseAdmin
      .from("events")
      .select("admin_token")
      .eq("id", eventId)
      .single();

    const valid = !!data && data.admin_token === token;
    return NextResponse.json({ valid });
  } catch {
    return NextResponse.json({ valid: false }, { status: 500 });
  }
}
