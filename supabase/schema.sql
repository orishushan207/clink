-- ============================================================
-- PartyDrop — Supabase Database Schema
-- Run this entire file in the Supabase SQL Editor
-- ============================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- EVENTS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS events (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name             TEXT NOT NULL CHECK (char_length(name) >= 2 AND char_length(name) <= 100),
  slug             TEXT UNIQUE NOT NULL,
  description      TEXT,
  event_date       TIMESTAMPTZ,
  cover_image_url  TEXT,
  privacy_mode     TEXT NOT NULL DEFAULT 'open' CHECK (privacy_mode IN ('open', 'private', 'approval')),
  allow_video      BOOLEAN NOT NULL DEFAULT false,
  require_approval BOOLEAN NOT NULL DEFAULT false,
  show_leaderboard BOOLEAN NOT NULL DEFAULT true,
  uploads_open     BOOLEAN NOT NULL DEFAULT true,
  admin_token      TEXT NOT NULL,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_events_slug ON events(slug);
CREATE INDEX IF NOT EXISTS idx_events_created_at ON events(created_at DESC);

-- ============================================================
-- GUESTS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS guests (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  event_id   UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  nickname   TEXT NOT NULL CHECK (char_length(nickname) >= 2 AND char_length(nickname) <= 30),
  avatar     TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_guests_event_id ON guests(event_id);

-- ============================================================
-- MEDIA TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS media (
  id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  event_id       UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  guest_id       UUID NOT NULL REFERENCES guests(id) ON DELETE CASCADE,
  media_type     TEXT NOT NULL CHECK (media_type IN ('image', 'video')),
  file_url       TEXT NOT NULL,
  thumbnail_url  TEXT,
  caption        TEXT,
  status         TEXT NOT NULL DEFAULT 'approved' CHECK (status IN ('pending', 'approved', 'rejected')),
  likes_count    INTEGER NOT NULL DEFAULT 0,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_media_event_id ON media(event_id);
CREATE INDEX IF NOT EXISTS idx_media_event_status ON media(event_id, status);
CREATE INDEX IF NOT EXISTS idx_media_event_created ON media(event_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_media_event_likes ON media(event_id, likes_count DESC);
CREATE INDEX IF NOT EXISTS idx_media_guest_id ON media(guest_id);

-- ============================================================
-- LIKES TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS likes (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  event_id   UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  media_id   UUID NOT NULL REFERENCES media(id) ON DELETE CASCADE,
  guest_id   UUID NOT NULL REFERENCES guests(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(media_id, guest_id)  -- Prevent duplicate likes
);

CREATE INDEX IF NOT EXISTS idx_likes_media_id ON likes(media_id);
CREATE INDEX IF NOT EXISTS idx_likes_guest_event ON likes(guest_id, event_id);

-- ============================================================
-- REPORTS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS reports (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  event_id   UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  media_id   UUID NOT NULL REFERENCES media(id) ON DELETE CASCADE,
  guest_id   UUID NOT NULL REFERENCES guests(id) ON DELETE CASCADE,
  reason     TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_reports_event_id ON reports(event_id);
CREATE INDEX IF NOT EXISTS idx_reports_media_id ON reports(media_id);

-- ============================================================
-- HELPER FUNCTIONS
-- Atomic increment/decrement for likes_count
-- ============================================================

CREATE OR REPLACE FUNCTION increment_likes(media_id_param UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE media SET likes_count = likes_count + 1 WHERE id = media_id_param;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION decrement_likes(media_id_param UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE media
  SET likes_count = GREATEST(0, likes_count - 1)
  WHERE id = media_id_param;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================

-- Enable RLS on all tables
ALTER TABLE events  ENABLE ROW LEVEL SECURITY;
ALTER TABLE guests  ENABLE ROW LEVEL SECURITY;
ALTER TABLE media   ENABLE ROW LEVEL SECURITY;
ALTER TABLE likes   ENABLE ROW LEVEL SECURITY;
ALTER TABLE reports ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- EVENTS RLS policies
-- ============================================================

-- Anyone can read events (needed to load event page by slug)
-- NOTE: admin_token is excluded in application layer queries for guests
CREATE POLICY "events_select_public"
  ON events FOR SELECT
  USING (true);

-- Only service role can insert/update/delete (via API routes)
-- anon users cannot create events directly
CREATE POLICY "events_insert_service_only"
  ON events FOR INSERT
  WITH CHECK (false);  -- blocked for anon; API routes use service_role

CREATE POLICY "events_update_service_only"
  ON events FOR UPDATE
  USING (false);  -- blocked for anon; API routes use service_role

CREATE POLICY "events_delete_service_only"
  ON events FOR DELETE
  USING (false);

-- ============================================================
-- GUESTS RLS policies
-- ============================================================

-- Anyone can read guests (needed for gallery and leaderboard)
CREATE POLICY "guests_select_public"
  ON guests FOR SELECT
  USING (true);

-- Only service role can insert guests (via API route)
CREATE POLICY "guests_insert_service_only"
  ON guests FOR INSERT
  WITH CHECK (false);

-- ============================================================
-- MEDIA RLS policies
-- ============================================================

-- Read: approved media is public; pending/rejected is NOT visible to anon
CREATE POLICY "media_select_approved_public"
  ON media FOR SELECT
  USING (status = 'approved');

-- Insert: blocked for anon — handled by API route
CREATE POLICY "media_insert_service_only"
  ON media FOR INSERT
  WITH CHECK (false);

-- Update/Delete blocked for anon — admin API routes use service_role
CREATE POLICY "media_update_service_only"
  ON media FOR UPDATE
  USING (false);

CREATE POLICY "media_delete_service_only"
  ON media FOR DELETE
  USING (false);

-- ============================================================
-- LIKES RLS policies
-- ============================================================

-- Anyone can read likes (for counts)
CREATE POLICY "likes_select_public"
  ON likes FOR SELECT
  USING (true);

-- Anon can insert likes (no auth needed for MVP)
-- TODO: Rate limit or require guest_id validation
CREATE POLICY "likes_insert_public"
  ON likes FOR INSERT
  WITH CHECK (true);

-- Anon can delete own like (by guest_id — honour system)
CREATE POLICY "likes_delete_own"
  ON likes FOR DELETE
  USING (true);

-- ============================================================
-- REPORTS RLS policies
-- ============================================================

-- Reports are not visible to anon (admin only via service_role)
CREATE POLICY "reports_select_service_only"
  ON reports FOR SELECT
  USING (false);

-- Anon can insert reports
CREATE POLICY "reports_insert_public"
  ON reports FOR INSERT
  WITH CHECK (true);

-- ============================================================
-- NOTE ON SECURITY
-- The RLS above is the BASE layer. All sensitive admin operations
-- (approve, reject, delete, view reports) go through Next.js API
-- routes that use the service_role key and validate admin_token
-- before taking any action. RLS is a defence-in-depth layer.
-- ============================================================
