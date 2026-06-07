-- Add mosaic_url to events table
ALTER TABLE events ADD COLUMN IF NOT EXISTS mosaic_url TEXT DEFAULT NULL;
