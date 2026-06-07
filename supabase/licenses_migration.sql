-- ============================================================
-- Clink — Licenses Migration
-- Run in Supabase SQL Editor
-- ============================================================

-- 1. Licenses table
CREATE TABLE IF NOT EXISTS licenses (
  id                 UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email              TEXT NOT NULL,
  type               TEXT NOT NULL CHECK (type IN ('onetime', 'subscription')),
  -- one-time
  days_access        INTEGER,                        -- 2-7
  -- subscription
  events_per_month   INTEGER,                        -- null = unlimited
  period_start       DATE,                           -- start of current billing month
  events_used        INTEGER NOT NULL DEFAULT 0,
  -- status
  is_active          BOOLEAN NOT NULL DEFAULT true,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_licenses_email ON licenses(email);

-- RLS
ALTER TABLE licenses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "licenses_service_only" ON licenses USING (false);

-- 2. Add license_id + expires_at to events
ALTER TABLE events ADD COLUMN IF NOT EXISTS license_id UUID REFERENCES licenses(id);
ALTER TABLE events ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ;
ALTER TABLE events ADD COLUMN IF NOT EXISTS admin_email TEXT;
ALTER TABLE events ADD COLUMN IF NOT EXISTS admin_password TEXT;
ALTER TABLE events ADD COLUMN IF NOT EXISTS guest_lock_hours INTEGER NOT NULL DEFAULT 48;
ALTER TABLE events ADD COLUMN IF NOT EXISTS vendor_token TEXT;

-- 3. Add blocked to guests
ALTER TABLE guests ADD COLUMN IF NOT EXISTS blocked BOOLEAN NOT NULL DEFAULT false;
