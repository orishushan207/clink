-- ============================================================
-- Guest PIN protection — prevents impersonation by allowing a
-- guest to optionally protect their nickname with a 4-digit PIN.
-- If a guest sets a PIN, reconnecting to that nickname from a
-- different device requires the correct PIN.
--
-- pin_hash stores "salt:hash" (scrypt), never the raw PIN.
-- It must NOT be readable via the anon/public REST API.
-- ============================================================

ALTER TABLE public.guests ADD COLUMN IF NOT EXISTS pin_hash TEXT;

-- Re-apply the column allowlist for anon/authenticated so the new
-- pin_hash column stays private (writes/reads only via supabaseAdmin).
REVOKE SELECT ON public.guests FROM anon, authenticated;

GRANT SELECT (
  id,
  event_id,
  nickname,
  avatar,
  blocked,
  created_at
) ON public.guests TO anon, authenticated;
