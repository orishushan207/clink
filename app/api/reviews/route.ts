import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server";
import { isRateLimited, getClientIp } from "@/lib/rateLimit";
import { profanityError } from "@/lib/profanity";

const ALLOWED_AVATARS = ["💬", "💍", "🎉", "🥂", "🎂", "🎓", "✡️", "👨‍👩‍👧", "❤️", "⭐"];

// GET /api/reviews — public, approved reviews (newest first)
export async function GET() {
  const { data, error } = await supabaseAdmin
    .from("reviews")
    .select("id, name, role, avatar, stars, text, created_at")
    .eq("approved", true)
    .order("created_at", { ascending: false })
    .limit(100);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ reviews: data ?? [] });
}

// POST /api/reviews — submit a new review from the public site
export async function POST(req: NextRequest) {
  try {
    const ip = getClientIp(req.headers);
    // Max 3 reviews per IP per hour
    if (isRateLimited(`review:${ip}`, { limit: 3, windowSec: 3600 })) {
      return NextResponse.json(
        { error: "שלחת כבר כמה ביקורות. נסו שוב מאוחר יותר 🙏" },
        { status: 429 }
      );
    }

    const body = await req.json();
    const name = typeof body.name === "string" ? body.name.trim() : "";
    const role = typeof body.role === "string" ? body.role.trim() : "";
    const text = typeof body.text === "string" ? body.text.trim() : "";
    const stars = Number(body.stars);
    const avatar = ALLOWED_AVATARS.includes(body.avatar) ? body.avatar : "💬";

    if (name.length < 2 || name.length > 40) {
      return NextResponse.json({ error: "השם חייב להכיל בין 2 ל-40 תווים" }, { status: 400 });
    }
    if (role.length > 40) {
      return NextResponse.json({ error: "סוג האירוע ארוך מדי" }, { status: 400 });
    }
    if (text.length < 10 || text.length > 500) {
      return NextResponse.json({ error: "הביקורת חייבת להכיל בין 10 ל-500 תווים" }, { status: 400 });
    }
    if (!Number.isInteger(stars) || stars < 1 || stars > 5) {
      return NextResponse.json({ error: "יש לבחור דירוג בין 1 ל-5 כוכבים" }, { status: 400 });
    }

    const badWord = profanityError(`${name} ${role} ${text}`);
    if (badWord) return NextResponse.json({ error: badWord }, { status: 400 });

    const { data, error } = await supabaseAdmin
      .from("reviews")
      .insert({ name, role: role || null, avatar, stars, text, approved: true })
      .select("id, name, role, avatar, stars, text, created_at")
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ review: data });
  } catch {
    return NextResponse.json({ error: "שגיאת שרת" }, { status: 500 });
  }
}
