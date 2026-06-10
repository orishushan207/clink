import { supabase } from "@/lib/supabase/client";
import type { Guest, CreateGuestPayload, GuestSession } from "@/types";
import { generateId, getGuestSessionKey } from "@/lib/utils";

// ============================================================
// Create a new guest (no auth required)
// ============================================================

export async function createGuest(
  payload: CreateGuestPayload
): Promise<Guest> {
  const id = generateId();

  const { data, error } = await supabase
    .from("guests")
    .insert({
      id,
      event_id: payload.event_id,
      nickname: payload.nickname.trim(),
      avatar: payload.avatar || null,
    })
    .select()
    .single();

  if (error) throw new Error(`שגיאה בכניסה לאירוע: ${error.message}`);
  return data as Guest;
}

// ============================================================
// Get all guests for an event (admin use)
// ============================================================

export async function getGuestsByEvent(eventId: string): Promise<Guest[]> {
  const { data, error } = await supabase
    .from("guests")
    .select("id, event_id, nickname, avatar, blocked, created_at")
    .eq("event_id", eventId)
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);
  return (data as Guest[]) || [];
}

// ============================================================
// localStorage session helpers (client-side only)
// ============================================================

export function saveGuestSession(
  eventSlug: string,
  session: GuestSession
): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(getGuestSessionKey(eventSlug), JSON.stringify(session));
}

export function loadGuestSession(eventSlug: string): GuestSession | null {
  if (typeof window === "undefined") return null;
  const raw = localStorage.getItem(getGuestSessionKey(eventSlug));
  if (!raw) return null;
  try {
    return JSON.parse(raw) as GuestSession;
  } catch {
    return null;
  }
}

export function clearGuestSession(eventSlug: string): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(getGuestSessionKey(eventSlug));
}
