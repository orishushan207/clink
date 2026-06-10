import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server";
import { AUTO_DELETE_DAYS } from "@/lib/eventExpiry";

// Helper: delete all files inside a storage folder (prefix)
async function deleteStorageFolder(bucket: string, prefix: string) {
  const { data: files } = await supabaseAdmin.storage.from(bucket).list(prefix, { limit: 1000 });
  if (!files || files.length === 0) return;
  const paths = files.map((f) => `${prefix}/${f.name}`);
  await supabaseAdmin.storage.from(bucket).remove(paths);
}

/**
 * GET /api/cron/cleanup
 *
 * Called daily by Vercel Cron (see vercel.json).
 * Deletes all events older than AUTO_DELETE_DAYS.
 *
 * Protected by CRON_SECRET environment variable.
 */
export async function GET(req: NextRequest) {
  // Validate Vercel Cron secret — fail CLOSED: if CRON_SECRET isn't
  // configured, refuse all requests rather than letting anyone trigger
  // mass deletion of events.
  const authHeader = req.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const cutoff = new Date(
    Date.now() - AUTO_DELETE_DAYS * 24 * 60 * 60 * 1000
  ).toISOString();

  // Find expired events
  const { data: expiredEvents, error: fetchError } = await supabaseAdmin
    .from("events")
    .select("id")
    .lt("created_at", cutoff);

  if (fetchError) {
    console.error("Cron cleanup: fetch error", fetchError);
    return NextResponse.json({ error: fetchError.message }, { status: 500 });
  }

  if (!expiredEvents || expiredEvents.length === 0) {
    return NextResponse.json({ deleted: 0, message: "אין אירועים למחיקה" });
  }

  let deleted = 0;
  const errors: string[] = [];

  for (const ev of expiredEvents) {
    try {
      // Delete storage files
      await deleteStorageFolder("event-media", ev.id);
      await deleteStorageFolder("event-covers", `covers/${ev.id}`);

      // Delete DB record (cascade)
      const { error: dbError } = await supabaseAdmin
        .from("events")
        .delete()
        .eq("id", ev.id);

      if (dbError) {
        errors.push(`${ev.id}: ${dbError.message}`);
      } else {
        deleted++;
      }
    } catch (err) {
      errors.push(`${ev.id}: ${String(err)}`);
    }
  }

  console.log(`Cron cleanup: deleted ${deleted}/${expiredEvents.length} events`);
  return NextResponse.json({ deleted, total: expiredEvents.length, errors });
}
