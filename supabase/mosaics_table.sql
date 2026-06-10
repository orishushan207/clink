-- Allow saving multiple mosaics per event (history), shown in the admin panel.
CREATE TABLE IF NOT EXISTS mosaics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  image_url TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS mosaics_event_id_idx ON mosaics(event_id);

-- Public read access (mosaic images are served publicly anyway via storage URLs;
-- listing them lets the admin panel + projection screen show saved mosaics).
ALTER TABLE mosaics ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "mosaics_select_all" ON mosaics;
CREATE POLICY "mosaics_select_all" ON mosaics FOR SELECT USING (true);

-- Writes only via service role (API routes use supabaseAdmin, which bypasses RLS).
GRANT SELECT ON mosaics TO anon, authenticated;
