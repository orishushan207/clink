import { supabase } from "@/lib/supabase/client";
import type {
  Event,
  PublicEvent,
  CreateEventPayload,
} from "@/types";
import { generateSlug, generateAdminToken, generateId } from "@/lib/utils";

// ============================================================
// Create a new event
// ============================================================

export async function createEvent(
  payload: CreateEventPayload
): Promise<Event> {
  const id = generateId();
  const slug = generateSlug();
  const adminToken = generateAdminToken();

  const { data, error } = await supabase
    .from("events")
    .insert({
      id,
      name: payload.name,
      slug,
      description: payload.description || null,
      event_date: payload.event_date || null,
      cover_image_url: payload.cover_image_url || null,
      allow_video: payload.allow_video,
      require_approval: payload.require_approval,
      show_leaderboard: payload.show_leaderboard,
      privacy_mode: payload.privacy_mode,
      uploads_open: true,
      admin_token: adminToken,
    })
    .select()
    .single();

  if (error) throw new Error(`שגיאה ביצירת האירוע: ${error.message}`);
  return data as Event;
}

// ============================================================
// Get event by slug — for guest pages (no admin_token exposed)
// ============================================================

export async function getEventBySlug(
  slug: string
): Promise<PublicEvent | null> {
  const { data, error } = await supabase
    .from("events")
    .select(
      "id, name, slug, description, event_date, cover_image_url, privacy_mode, allow_video, require_approval, show_leaderboard, uploads_open, created_at, guest_lock_hours, expires_at"
    )
    .eq("slug", slug)
    .single();

  if (error) {
    if (error.code === "PGRST116") return null; // not found
    throw new Error(error.message);
  }

  const event = data as PublicEvent & { expires_at?: string | null };

  // Auto-close uploads if license period has expired
  if (event.uploads_open && event.expires_at && new Date(event.expires_at) < new Date()) {
    event.uploads_open = false;
    // Fire-and-forget: update DB via API route
    fetch(`/api/events/${event.id}/expire`, { method: "POST" }).catch(() => {});
  }

  return event;
}

// ============================================================
// Get full event by ID — for admin (includes admin_token)
// ============================================================

export async function getEventById(eventId: string): Promise<Event | null> {
  const { data, error } = await supabase
    .from("events")
    .select("*")
    .eq("id", eventId)
    .single();

  if (error) {
    if (error.code === "PGRST116") return null;
    throw new Error(error.message);
  }
  return data as Event;
}

// ============================================================
// Validate admin token
// ============================================================

export async function validateAdminToken(
  eventId: string,
  token: string
): Promise<boolean> {
  const { data, error } = await supabase
    .from("events")
    .select("admin_token")
    .eq("id", eventId)
    .single();

  if (error || !data) return false;
  return data.admin_token === token;
}

// ============================================================
// Get event stats for admin dashboard
// ============================================================

export interface EventStats {
  guestCount: number;
  mediaCount: number;
  pendingCount: number;
  reportCount: number;
}

export async function getEventStats(eventId: string): Promise<EventStats> {
  const [guestsRes, mediaRes, pendingRes, reportsRes] = await Promise.all([
    supabase
      .from("guests")
      .select("id", { count: "exact", head: true })
      .eq("event_id", eventId),
    supabase
      .from("media")
      .select("id", { count: "exact", head: true })
      .eq("event_id", eventId)
      .eq("status", "approved"),
    supabase
      .from("media")
      .select("id", { count: "exact", head: true })
      .eq("event_id", eventId)
      .eq("status", "pending"),
    supabase
      .from("reports")
      .select("id", { count: "exact", head: true })
      .eq("event_id", eventId),
  ]);

  return {
    guestCount: guestsRes.count ?? 0,
    mediaCount: mediaRes.count ?? 0,
    pendingCount: pendingRes.count ?? 0,
    reportCount: reportsRes.count ?? 0,
  };
}
