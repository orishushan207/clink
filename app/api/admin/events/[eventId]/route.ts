import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server";

// Helper: delete all files inside a storage folder (prefix)
async function deleteStorageFolder(bucket: string, prefix: string) {
  // Supabase Storage: list up to 1000 files under the prefix
  const { data: files } = await supabaseAdmin.storage.from(bucket).list(prefix, { limit: 1000 });
  if (!files || files.length === 0) return;
  const paths = files.map((f) => `${prefix}/${f.name}`);
  await supabaseAdmin.storage.from(bucket).remove(paths);
}

// Helper: validate admin token
async function validateToken(
  eventId: string,
  token: string
): Promise<boolean> {
  if (!token) return false;
  const { data, error } = await supabaseAdmin
    .from("events")
    .select("admin_token")
    .eq("id", eventId)
    .single();
  if (error || !data) return false;
  return data.admin_token === token;
}

// GET — fetch full event (incl. admin_token) for the admin panel.
// Requires the admin_token as a query param so it can be validated server-side
// with the service-role key (the anon key must never be allowed to read
// admin_token / admin_password directly from the events table).
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ eventId: string }> }
) {
  try {
    const { eventId } = await params;
    const token = req.nextUrl.searchParams.get("token") || "";

    const isValid = await validateToken(eventId, token);
    if (!isValid) {
      return NextResponse.json({ error: "אין הרשאה" }, { status: 403 });
    }

    const { data, error } = await supabaseAdmin
      .from("events")
      .select("*")
      .eq("id", eventId)
      .single();

    if (error || !data) {
      return NextResponse.json({ error: "Event not found" }, { status: 404 });
    }

    return NextResponse.json({ event: data });
  } catch (err) {
    console.error("GET admin event error:", err);
    return NextResponse.json({ error: "שגיאת שרת" }, { status: 500 });
  }
}

// PATCH — update event settings (close/reopen uploads, toggle settings)
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ eventId: string }> }
) {
  try {
    const { eventId } = await params;
    const body = await req.json();
    const { admin_token, ...updates } = body;

    const isValid = await validateToken(eventId, admin_token);
    if (!isValid) {
      return NextResponse.json({ error: "אין הרשאה" }, { status: 403 });
    }

    // Only allow specific fields to be updated
    const allowedFields = [
      "uploads_open",
      "require_approval",
      "privacy_mode",
      "show_leaderboard",
      "allow_video",
      "admin_password",
      "name",
      "cover_image_url",
    ] as const;

    const safeUpdates: Record<string, unknown> = {};
    for (const field of allowedFields) {
      if (field in updates) {
        safeUpdates[field] = updates[field];
      }
    }

    if (Object.keys(safeUpdates).length === 0) {
      return NextResponse.json({ error: "אין שדות לעדכון" }, { status: 400 });
    }

    const { data, error } = await supabaseAdmin
      .from("events")
      .update(safeUpdates)
      .eq("id", eventId)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ event: data });
  } catch (err) {
    console.error("PATCH admin event error:", err);
    return NextResponse.json({ error: "שגיאת שרת" }, { status: 500 });
  }
}

// DELETE — permanently remove event + all its media from storage + DB
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ eventId: string }> }
) {
  try {
    const { eventId } = await params;
    const body = await req.json();
    const { admin_token } = body;

    const isValid = await validateToken(eventId, admin_token);
    if (!isValid) {
      return NextResponse.json({ error: "אין הרשאה" }, { status: 403 });
    }

    // 1. Delete all media files from Supabase Storage
    await deleteStorageFolder("event-media", eventId);
    // 2. Delete cover image folder
    await deleteStorageFolder("event-covers", `covers/${eventId}`);

    // 3. Delete DB record — cascade should remove media, guests, likes, votes, comments, reports
    const { error } = await supabaseAdmin
      .from("events")
      .delete()
      .eq("id", eventId);

    if (error) {
      console.error("Event delete DB error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("DELETE admin event error:", err);
    return NextResponse.json({ error: "שגיאת שרת" }, { status: 500 });
  }
}
