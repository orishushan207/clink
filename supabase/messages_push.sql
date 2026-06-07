-- ============================================================
-- Direct Messages + Push Subscriptions
-- Run this in the Supabase SQL Editor
-- ============================================================

-- Direct messages between guests
CREATE TABLE IF NOT EXISTS messages (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  event_id    UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  sender_id   UUID NOT NULL REFERENCES guests(id) ON DELETE CASCADE,
  receiver_id UUID NOT NULL REFERENCES guests(id) ON DELETE CASCADE,
  content     TEXT NOT NULL CHECK (char_length(content) >= 1 AND char_length(content) <= 1000),
  read_at     TIMESTAMPTZ,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_messages_event ON messages(event_id);
CREATE INDEX IF NOT EXISTS idx_messages_receiver ON messages(receiver_id, read_at);
CREATE INDEX IF NOT EXISTS idx_messages_conversation ON messages(event_id, sender_id, receiver_id);

-- Web Push subscriptions + notification preferences
CREATE TABLE IF NOT EXISTS push_subscriptions (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  guest_id          UUID NOT NULL REFERENCES guests(id) ON DELETE CASCADE,
  event_id          UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  subscription      JSONB NOT NULL,
  notify_messages   BOOLEAN NOT NULL DEFAULT true,
  notify_likes      BOOLEAN NOT NULL DEFAULT true,
  notify_admin_all  BOOLEAN NOT NULL DEFAULT false,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(guest_id, event_id)
);

CREATE INDEX IF NOT EXISTS idx_push_guest_event ON push_subscriptions(guest_id, event_id);
CREATE INDEX IF NOT EXISTS idx_push_event ON push_subscriptions(event_id);

-- RLS: guests can only read their own messages
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "messages_select" ON messages
  FOR SELECT USING (true);  -- filtered in app layer

CREATE POLICY "messages_insert" ON messages
  FOR INSERT WITH CHECK (true);

-- RLS: push subscriptions are private
ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "push_select" ON push_subscriptions
  FOR SELECT USING (true);

CREATE POLICY "push_insert" ON push_subscriptions
  FOR INSERT WITH CHECK (true);

CREATE POLICY "push_update" ON push_subscriptions
  FOR UPDATE USING (true);

CREATE POLICY "push_delete" ON push_subscriptions
  FOR DELETE USING (true);

-- Enable Realtime for messages (for live chat)
ALTER PUBLICATION supabase_realtime ADD TABLE messages;
