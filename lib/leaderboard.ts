import { supabase } from "@/lib/supabase/client";
import type { LeaderboardEntry } from "@/types";
import { SCORE_PHOTO_UPLOAD, SCORE_VIDEO_UPLOAD, SCORE_LIKE_RECEIVED } from "@/lib/utils";

export interface GuestRow {
  id: string;
  nickname: string;
  avatar: string | null;
  created_at: string;
  upload_count: number;
}

// ============================================================
// Build leaderboard from approved media + likes
// ============================================================

export async function getLeaderboard(
  eventId: string
): Promise<LeaderboardEntry[]> {
  // Fetch all approved media with guest info
  const { data: mediaData, error: mediaError } = await supabase
    .from("media")
    .select(
      `
      id,
      media_type,
      likes_count,
      guest_id,
      guest:guests(nickname, avatar)
    `
    )
    .eq("event_id", eventId)
    .eq("status", "approved");

  if (mediaError) throw new Error(mediaError.message);
  if (!mediaData || mediaData.length === 0) return [];

  // Aggregate per guest
  const guestMap = new Map<
    string,
    {
      nickname: string;
      avatar: string | null;
      photo_count: number;
      video_count: number;
      total_likes: number;
    }
  >();

  for (const item of mediaData) {
    const guestId = item.guest_id as string;
    const guest = item.guest as unknown as { nickname: string; avatar: string | null } | null;
    if (!guest) continue;

    if (!guestMap.has(guestId)) {
      guestMap.set(guestId, {
        nickname: guest.nickname,
        avatar: guest.avatar,
        photo_count: 0,
        video_count: 0,
        total_likes: 0,
      });
    }

    const entry = guestMap.get(guestId)!;
    if (item.media_type === "image") {
      entry.photo_count += 1;
    } else {
      entry.video_count += 1;
    }
    entry.total_likes += item.likes_count as number;
  }

  // Build final array with scores
  const entries: LeaderboardEntry[] = Array.from(guestMap.entries()).map(
    ([guestId, data]) => {
      const score =
        data.photo_count * SCORE_PHOTO_UPLOAD +
        data.video_count * SCORE_VIDEO_UPLOAD +
        data.total_likes * SCORE_LIKE_RECEIVED;

      return {
        guest_id: guestId,
        nickname: data.nickname,
        avatar: data.avatar,
        photo_count: data.photo_count,
        video_count: data.video_count,
        total_uploads: data.photo_count + data.video_count,
        total_likes: data.total_likes,
        score,
        rank: 0, // filled below
      };
    }
  );

  // Sort by score descending, then by uploads
  entries.sort((a, b) => b.score - a.score || b.total_uploads - a.total_uploads);

  // Assign ranks
  entries.forEach((entry, idx) => {
    entry.rank = idx + 1;
  });

  return entries;
}

// ============================================================
// Get all guests for an event with upload count
// ============================================================

export async function getAllGuestsWithStats(eventId: string): Promise<GuestRow[]> {
  const { data: guests, error: guestsError } = await supabase
    .from("guests")
    .select("id, nickname, avatar, created_at")
    .eq("event_id", eventId)
    .order("created_at", { ascending: true });

  if (guestsError) throw new Error(guestsError.message);
  if (!guests?.length) return [];

  const { data: mediaData } = await supabase
    .from("media")
    .select("guest_id")
    .eq("event_id", eventId)
    .eq("status", "approved");

  const uploadCounts: Record<string, number> = {};
  for (const m of mediaData ?? []) {
    uploadCounts[m.guest_id] = (uploadCounts[m.guest_id] ?? 0) + 1;
  }

  return guests.map((g) => ({
    id: g.id,
    nickname: g.nickname,
    avatar: g.avatar,
    created_at: g.created_at,
    upload_count: uploadCounts[g.id] ?? 0,
  }));
}
