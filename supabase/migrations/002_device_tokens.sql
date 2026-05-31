-- Wave 0.4 — per-user, per-device Expo push tokens (multi-device support).
-- Sits alongside agencies.push_token (kept for the existing notify-same-day-turnovers Edge Function);
-- new mobile features should target device_tokens.

CREATE TABLE IF NOT EXISTS device_tokens (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  agency_id      UUID REFERENCES agencies(id) ON DELETE SET NULL,
  token          TEXT NOT NULL UNIQUE,
  platform       TEXT CHECK (platform IN ('ios','android','web')),
  app_version    TEXT,
  last_seen_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS device_tokens_user_idx   ON device_tokens(user_id);
CREATE INDEX IF NOT EXISTS device_tokens_agency_idx ON device_tokens(agency_id);

ALTER TABLE device_tokens ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "device_tokens_own_select" ON device_tokens;
CREATE POLICY "device_tokens_own_select" ON device_tokens
  FOR SELECT USING (user_id = auth.uid());

DROP POLICY IF EXISTS "device_tokens_own_insert" ON device_tokens;
CREATE POLICY "device_tokens_own_insert" ON device_tokens
  FOR INSERT WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "device_tokens_own_update" ON device_tokens;
CREATE POLICY "device_tokens_own_update" ON device_tokens
  FOR UPDATE USING (user_id = auth.uid());

DROP POLICY IF EXISTS "device_tokens_own_delete" ON device_tokens;
CREATE POLICY "device_tokens_own_delete" ON device_tokens
  FOR DELETE USING (user_id = auth.uid());
