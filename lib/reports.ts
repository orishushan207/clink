import { supabase } from "@/lib/supabase/client";
import type { Report } from "@/types";
import { generateId } from "@/lib/utils";

// ============================================================
// Submit a report for a media item
// ============================================================

export async function reportMedia(
  mediaId: string,
  guestId: string,
  eventId: string,
  reason: string
): Promise<void> {
  const id = generateId();

  const { error } = await supabase.from("reports").insert({
    id,
    event_id: eventId,
    media_id: mediaId,
    guest_id: guestId,
    reason,
  });

  if (error) throw new Error(`שגיאה בשליחת הדיווח: ${error.message}`);
}

// ============================================================
// Get all reports for an event (admin only)
// ============================================================

export async function getReportsForEvent(eventId: string): Promise<Report[]> {
  const { data, error } = await supabase
    .from("reports")
    .select(
      `
      *,
      media:media(file_url, media_type, status),
      guest:guests(nickname)
    `
    )
    .eq("event_id", eventId)
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);
  return (data as Report[]) || [];
}
