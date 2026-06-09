-- Add mosaic_enabled to licenses table
ALTER TABLE licenses ADD COLUMN IF NOT EXISTS mosaic_enabled BOOLEAN NOT NULL DEFAULT FALSE;

-- Add mosaic_enabled to events table
ALTER TABLE events ADD COLUMN IF NOT EXISTS mosaic_enabled BOOLEAN NOT NULL DEFAULT FALSE;
