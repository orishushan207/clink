-- ============================================================
-- SECURITY HARDENING: stop the public anon key from reading
-- guests.device_token.
--
-- device_token is a push-notification subscription identifier.
-- It's only ever read/written by server routes (supabaseAdmin,
-- which bypasses these grants), so guest-facing pages never need
-- it directly. Restricting it removes one more piece of
-- per-device tracking data from the public REST API.
-- ============================================================

REVOKE SELECT ON public.guests FROM anon, authenticated;

GRANT SELECT (
  id,
  event_id,
  nickname,
  avatar,
  blocked,
  created_at
) ON public.guests TO anon, authenticated;
