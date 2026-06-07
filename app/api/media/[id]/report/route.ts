import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server";
import { generateId } from "@/lib/utils";
import { REPORT_REASONS } from "@/types";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: mediaId } = await params;
    const { guest_id, event_id, reason } = await req.json();

    if (!guest_id || !event_id || !reason) {
      return NextResponse.json({ error: "חסרים פרמטרים" }, { status: 400 });
    }

    if (!REPORT_REASONS.includes(reason)) {
      return NextResponse.json({ error: "סיבת דיווח לא תקינה" }, { status: 400 });
    }

    const { error } = await supabaseAdmin.from("reports").insert({
      id: generateId(),
      event_id,
      media_id: mediaId,
      guest_id,
      reason,
    });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("POST report error:", err);
    return NextResponse.json({ error: "שגיאת שרת" }, { status: 500 });
  }
}
