-- Add AI images quota to licenses
ALTER TABLE licenses ADD COLUMN IF NOT EXISTS ai_images_limit INTEGER DEFAULT NULL;
-- NULL = no AI access, -1 = unlimited, N = N transforms per event

-- Track AI usage per event
ALTER TABLE events ADD COLUMN IF NOT EXISTS ai_images_used INTEGER NOT NULL DEFAULT 0;

-- Atomic increment function
CREATE OR REPLACE FUNCTION increment_ai_images_used(event_id UUID)
RETURNS void LANGUAGE sql AS $$
  UPDATE events SET ai_images_used = ai_images_used + 1 WHERE id = event_id;
$$;
