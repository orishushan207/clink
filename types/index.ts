// ============================================================
// Core Domain Types — PartyDrop
// ============================================================

export type PrivacyMode = "open" | "private" | "approval";
export type MediaType = "image" | "video";
export type MediaStatus = "pending" | "approved" | "rejected";

export interface Event {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  event_date: string | null;
  cover_image_url: string | null;
  privacy_mode: PrivacyMode;
  allow_video: boolean;
  require_approval: boolean;
  show_leaderboard: boolean;
  uploads_open: boolean;
  admin_token: string;
  admin_email?: string | null;
  guest_lock_hours: number;
  created_at: string;
  mosaic_url?: string | null;
}

// Public event — no admin_token exposed to guests
export type PublicEvent = Omit<Event, "admin_token">;

export interface Guest {
  id: string;
  event_id: string;
  nickname: string;
  avatar: string | null;
  blocked?: boolean;
  created_at: string;
}

export interface Media {
  id: string;
  event_id: string;
  guest_id: string;
  media_type: MediaType;
  file_url: string;
  thumbnail_url: string | null;
  caption: string | null;
  status: MediaStatus;
  likes_count: number;
  votes_count?: number; // client-side enriched
  created_at: string;
  // Joined fields
  guest?: Pick<Guest, "id" | "nickname" | "avatar">;
}

export interface Vote {
  id: string;
  event_id: string;
  media_id: string;
  guest_id: string;
  created_at: string;
}

export interface Like {
  id: string;
  event_id: string;
  media_id: string;
  guest_id: string;
  created_at: string;
}

export interface Report {
  id: string;
  event_id: string;
  media_id: string;
  guest_id: string;
  reason: string;
  created_at: string;
  // Joined
  media?: Pick<Media, "file_url" | "media_type" | "status">;
  guest?: Pick<Guest, "nickname">;
}

// ============================================================
// Request / Response shapes for API routes
// ============================================================

export interface CreateEventPayload {
  name: string;
  event_date?: string;
  description?: string;
  cover_image_url?: string;
  allow_video: boolean;
  require_approval: boolean;
  show_leaderboard: boolean;
  privacy_mode: PrivacyMode;
  admin_email?: string;
  admin_password?: string;
  guest_lock_hours?: number;
}

export interface CreateEventResponse {
  event: Event;
  eventUrl: string;
  adminUrl: string;
}

export interface CreateGuestPayload {
  event_id: string;
  nickname: string;
  avatar?: string;
}

export interface UploadMediaPayload {
  event_id: string;
  guest_id: string;
  media_type: MediaType;
  file_url: string;
  thumbnail_url?: string;
  caption?: string;
}

export interface LikePayload {
  media_id: string;
  guest_id: string;
  event_id: string;
}

export interface ReportPayload {
  media_id: string;
  guest_id: string;
  event_id: string;
  reason: string;
}

export interface AdminAction {
  admin_token: string;
}

// ============================================================
// Leaderboard
// ============================================================

export interface LeaderboardEntry {
  guest_id: string;
  nickname: string;
  avatar: string | null;
  photo_count: number;
  video_count: number;
  total_uploads: number;
  total_likes: number;
  score: number;
  rank: number;
}

// ============================================================
// LocalStorage guest session
// ============================================================

export interface GuestSession {
  guestId: string;
  nickname: string;
  avatar: string | null;
  deviceToken: string | null;
}

// ============================================================
// Filter options for gallery
// ============================================================

export type GalleryFilter = "newest" | "most_liked" | "by_user";

// ============================================================
// Report reasons
// ============================================================

export const REPORT_REASONS = [
  "תוכן לא מתאים",
  "פוגע בפרטיות",
  "ספאם",
  "אחר",
] as const;

export type ReportReason = (typeof REPORT_REASONS)[number];

// ============================================================
// Emoji/Avatar options for guests
// ============================================================

export const AVATAR_OPTIONS = [
  "🎉",
  "🥳",
  "🎊",
  "🔥",
  "💃",
  "🕺",
  "🎸",
  "🍾",
  "👑",
  "🌟",
  "🦋",
  "🐝",
  "🦊",
  "🐺",
  "🦁",
  "🐯",
  "🦄",
  "🐸",
  "🍕",
  "🌈",
  "⚡",
  "🎯",
  "🏆",
  "💎",
] as const;
