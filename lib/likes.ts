import { supabase } from "@/lib/supabase/client";

// ============================================================
// Like a media item — goes through API route (triggers notification)
// Returns false if already liked (duplicate)
// ============================================================

export async function likeMedia(
  mediaId: string,
  guestId: string,
  eventId: string
): Promise<boolean> {
  const res = await fetch(`/api/media/${mediaId}/like`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ guest_id: guestId, event_id: eventId }),
  });

  if (res.status === 409) return false; // already liked
  if (!res.ok) throw new Error("like failed");
  return true;
}

// ============================================================
// Unlike a media item — goes through API route
// ============================================================

export async function unlikeMedia(
  mediaId: string,
  guestId: string
): Promise<void> {
  const res = await fetch(`/api/media/${mediaId}/like`, {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ guest_id: guestId }),
  });

  if (!res.ok) throw new Error("unlike failed");
}

// ============================================================
// Check if a guest has liked a specific media item
// ============================================================

export async function hasLiked(
  mediaId: string,
  guestId: string
): Promise<boolean> {
  const { data, error } = await supabase
    .from("likes")
    .select("id")
    .eq("media_id", mediaId)
    .eq("guest_id", guestId)
    .maybeSingle();

  if (error) return false;
  return !!data;
}

// ============================================================
// Get list of guests who liked a specific media item
// ============================================================

export async function getMediaLikers(
  mediaId: string
): Promise<{ nickname: string; avatar: string | null }[]> {
  const { data, error } = await supabase
    .from("likes")
    .select("guests(nickname, avatar)")
    .eq("media_id", mediaId)
    .order("created_at", { ascending: false });

  if (error) return [];
  return (data || [])
    .map((l) => (l.guests as unknown as { nickname: string; avatar: string | null } | null))
    .filter(Boolean) as { nickname: string; avatar: string | null }[];
}

// ============================================================
// Get all liked media IDs for a guest in an event
// Used to initialise like state on gallery load
// ============================================================

export async function getGuestLikes(
  eventId: string,
  guestId: string
): Promise<Set<string>> {
  const { data, error } = await supabase
    .from("likes")
    .select("media_id")
    .eq("event_id", eventId)
    .eq("guest_id", guestId);

  if (error) return new Set();
  return new Set((data || []).map((l) => l.media_id as string));
}
