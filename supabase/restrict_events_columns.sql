-- ============================================================
-- SECURITY FIX: prevent the public anon key from reading
-- admin_token / admin_password / admin_email / vendor_token /
-- license_id from the `events` table.
--
-- Background: the Supabase anon key is embedded in the client
-- JS bundle (it's meant to be public), but the `events` table
-- had no column-level restrictions, so ANY visitor could call
-- the Supabase REST API directly:
--
--   GET /rest/v1/events?select=admin_token,admin_password&id=eq.<eventId>
--
-- ...and get full admin credentials for any event, then use them
-- to call /api/admin/events/[eventId] (e.g. DELETE the event).
--
-- This migration revokes SELECT on the whole `events` table from
-- `anon` and `authenticated`, then grants SELECT back only on the
-- columns that guest-facing pages actually need. All admin-only
-- reads now go through server-side API routes that use the
-- service-role key (which bypasses these grants entirely).
-- ============================================================

REVOKE SELECT ON public.events FROM anon, authenticated;

GRANT SELECT (
  id,
  name,
  slug,
  description,
  event_date,
  cover_image_url,
  privacy_mode,
  allow_video,
  require_approval,
  show_leaderboard,
  uploads_open,
  guest_lock_hours,
  created_at,
  expires_at,
  mosaic_url,
  mosaic_enabled
) ON public.events TO anon, authenticated;

-- Note: INSERT is still required by anon for event creation
-- (lib/events.ts createEvent). That INSERT includes admin_token,
-- which column-level GRANT SELECT does not affect — INSERT/UPDATE
-- privileges are managed separately and are unchanged by this script.
