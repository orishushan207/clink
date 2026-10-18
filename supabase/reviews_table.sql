-- Visitor reviews shown on the landing page ("מה אומרים עלינו?").
-- Submitted from the public site; writes go through the API (supabaseAdmin),
-- public reads are limited to approved reviews via RLS.
CREATE TABLE IF NOT EXISTS reviews (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name       TEXT NOT NULL,
  role       TEXT,                       -- e.g. "חתונה · 2026"
  avatar     TEXT NOT NULL DEFAULT '💬',
  stars      INT  NOT NULL DEFAULT 5 CHECK (stars BETWEEN 1 AND 5),
  text       TEXT NOT NULL,
  approved   BOOLEAN NOT NULL DEFAULT true,  -- set false to require moderation
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS reviews_approved_created_idx
  ON reviews (approved, created_at DESC);

ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;

-- Public can read approved reviews only.
DROP POLICY IF EXISTS "reviews_select_approved" ON reviews;
CREATE POLICY "reviews_select_approved" ON reviews
  FOR SELECT USING (approved = true);

-- Writes only via service role (API routes use supabaseAdmin, which bypasses RLS).
GRANT SELECT ON reviews TO anon, authenticated;
