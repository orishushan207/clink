import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { toFile } from "openai/uploads";
import { supabaseAdmin } from "@/lib/supabase/server";

let openai: OpenAI | null = null;
function getOpenAI() {
  if (!openai) {
    openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  }
  return openai;
}

const STYLE_PROMPTS: Record<string, string> = {
  disney: "Transform the person in this photo into a Disney Pixar 3D animated character. Keep their facial features and expression but render them in Disney Pixar animation style with warm lighting and vibrant colors.",
  anime: "Transform the person in this photo into a Japanese anime illustration with large expressive eyes, detailed hair, smooth cel shading, and vibrant anime art style.",
  oldman: "Age the person in this photo by 50 years into a very old elderly person — deep wrinkles, white hair, saggy skin, reading glasses, grandpa sweater, the full package. Keep it funny and recognizable.",
  baby: "Transform the person in this photo into a chubby cute baby version of themselves — baby face, rosy cheeks, tiny body, oversized diaper, sitting on the floor with a pacifier. Keep it hilarious and adorable.",
  wanted: "Turn the person in this photo into an old Wild West wanted poster illustration — sepia tones, cowboy hat, sheriff badge, dust and desert background, 'WANTED DEAD OR ALIVE' text at the top with a dramatic reward amount.",
  superhero: "Transform the person in this photo into a comic book superhero with a ridiculous over-the-top costume, dramatic cape, bulging muscles, a silly made-up logo on the chest, and a heroic pose against a city skyline.",
};

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("image") as File | null;
    const style = formData.get("style") as string | null;
    const customPrompt = formData.get("customPrompt") as string | null;
    const eventId = formData.get("eventId") as string | null;

    if (!file || !style) {
      return NextResponse.json({ error: "Missing image or style" }, { status: 400 });
    }

    // ── Check AI quota ──
    if (eventId) {
      const { data: event } = await supabaseAdmin
        .from("events")
        .select("ai_images_used, license_id")
        .eq("id", eventId)
        .single();

      if (event?.license_id) {
        const { data: license } = await supabaseAdmin
          .from("licenses")
          .select("ai_images_limit")
          .eq("id", event.license_id)
          .single();

        const limit = license?.ai_images_limit;
        if (limit === null || limit === undefined) {
          return NextResponse.json({ error: "החבילה שלך לא כוללת תמונות AI — שדרג בהגדרות האירוע" }, { status: 403 });
        }
        if (limit !== -1 && (event.ai_images_used ?? 0) >= limit) {
          return NextResponse.json({ error: `הגעת למכסת ה-AI של האירוע (${limit} תמונות)` }, { status: 429 });
        }
      }
    }

    let prompt: string;
    if (style === "custom") {
      if (!customPrompt?.trim()) {
        return NextResponse.json({ error: "Missing custom prompt" }, { status: 400 });
      }
      prompt = `Based on the person(s) in this photo: ${customPrompt.trim()}. Keep the same people but place them in the described scene.`;
    } else {
      prompt = STYLE_PROMPTS[style];
      if (!prompt) {
        return NextResponse.json({ error: "Invalid style" }, { status: 400 });
      }
    }

    const imageFile = await toFile(file, "image.png", { type: "image/png" });

    const response = await getOpenAI().images.edit({
      model: "gpt-image-1",
      image: imageFile,
      prompt,
      n: 1,
    });

    const b64 = response.data?.[0]?.b64_json;
    if (!b64) {
      return NextResponse.json({ error: "No image returned" }, { status: 500 });
    }

    // ── Increment usage counter ──
    if (eventId) {
      await supabaseAdmin.rpc("increment_ai_images_used", { event_id: eventId });
    }

    return NextResponse.json({ b64 });
  } catch (err) {
    console.error("AI transform error:", err);
    const message = err instanceof Error ? err.message : String(err);
    const status = (err as { status?: number })?.status ?? 500;
    return NextResponse.json({ error: message, status }, { status: 500 });
  }
}
