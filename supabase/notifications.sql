-- ============================================================
-- In-app Notifications
-- Run this in the Supabase SQL Editor
-- ============================================================

CREATE TABLE IF NOT EXISTS notifications (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  event_id     UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  recipient_id UUID REFERENCES guests(id) ON DELETE CASCADE, -- null = admin
  type         TEXT NOT NULL CHECK (type IN ('like', 'message', 'upload', 'comment')),
  actor_id     UUID REFERENCES guests(id) ON DELETE SET NULL,
  actor_name   TEXT NOT NULL,
  actor_avatar TEXT,
  content      TEXT NOT NULL,
  media_id     UUID REFERENCES media(id) ON DELETE CASCADE,
  read_at      TIMESTAMPTZ,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notif_recipient ON notifications(recipient_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notif_event ON notifications(event_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notif_unread ON notifications(recipient_id, read_at) WHERE read_at IS NULL;

ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "notif_all" ON notifications FOR ALL USING (true);

-- Enable Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE notifications;
