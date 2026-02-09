-- Migration 010: Create Notification Tables
-- Purpose: Support push notification system with preferences, tokens, and logs
-- Date: 2026-02-06

-- ============================================================================
-- Push Notification Tokens
-- ============================================================================
-- Stores device push notification tokens for each referee
CREATE TABLE IF NOT EXISTS push_notification_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  referee_id BIGINT NOT NULL REFERENCES referees(id) ON DELETE CASCADE,
  token TEXT NOT NULL UNIQUE,
  platform TEXT NOT NULL CHECK (platform IN ('ios', 'android', 'web')),
  device_id TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ,
  last_used_at TIMESTAMPTZ,

  -- Composite unique constraint (one token per device)
  UNIQUE(referee_id, device_id)
);

-- Indexes for efficient queries
CREATE INDEX idx_push_tokens_referee_id ON push_notification_tokens(referee_id);
CREATE INDEX idx_push_tokens_token ON push_notification_tokens(token);
CREATE INDEX idx_push_tokens_device_id ON push_notification_tokens(device_id);

-- ============================================================================
-- Notification Preferences
-- ============================================================================
-- Stores user notification preferences with sync support
CREATE TABLE IF NOT EXISTS notification_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  referee_id BIGINT NOT NULL UNIQUE REFERENCES referees(id) ON DELETE CASCADE,

  -- Master switch
  enabled BOOLEAN NOT NULL DEFAULT true,

  -- Per-type notification settings
  new_assignments BOOLEAN NOT NULL DEFAULT true,
  match_results BOOLEAN NOT NULL DEFAULT true,
  match_designations BOOLEAN NOT NULL DEFAULT true,
  status_changes BOOLEAN NOT NULL DEFAULT true,
  tournament_updates BOOLEAN NOT NULL DEFAULT false,

  -- Reminder settings
  reminders_enabled BOOLEAN NOT NULL DEFAULT true,
  reminder_minutes JSONB NOT NULL DEFAULT '[60, 30, 15]',

  -- Tournament subscriptions (array of tournament codes)
  subscribed_tournaments JSONB DEFAULT '[]',

  -- Delivery preferences
  sound BOOLEAN NOT NULL DEFAULT true,
  vibration BOOLEAN NOT NULL DEFAULT true,
  badge BOOLEAN NOT NULL DEFAULT true,

  -- Quiet hours configuration
  quiet_hours_enabled BOOLEAN NOT NULL DEFAULT false,
  quiet_hours_start TIME,
  quiet_hours_end TIME,
  quiet_hours_timezone TEXT DEFAULT 'UTC',

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_synced_at TIMESTAMPTZ,

  -- Metadata for conflict resolution
  version INTEGER NOT NULL DEFAULT 1
);

-- Indexes
CREATE INDEX idx_notification_prefs_referee_id ON notification_preferences(referee_id);

-- ============================================================================
-- Notification Logs
-- ============================================================================
-- Tracks notification delivery for analytics and debugging
CREATE TABLE IF NOT EXISTS notification_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  referee_id BIGINT NOT NULL REFERENCES referees(id) ON DELETE CASCADE,

  -- Notification details
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  data JSONB,

  -- Delivery status
  status TEXT NOT NULL CHECK (status IN ('pending', 'sent', 'delivered', 'opened', 'failed')),
  error TEXT,

  -- Timestamps
  sent_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  delivered_at TIMESTAMPTZ,
  opened_at TIMESTAMPTZ
);

-- Indexes for querying
CREATE INDEX idx_notification_logs_referee_id ON notification_logs(referee_id);
CREATE INDEX idx_notification_logs_sent_at ON notification_logs(sent_at DESC);
CREATE INDEX idx_notification_logs_status ON notification_logs(status);
CREATE INDEX idx_notification_logs_type ON notification_logs(type);

-- ============================================================================
-- Row Level Security (RLS)
-- ============================================================================

-- Enable RLS on all tables
ALTER TABLE push_notification_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Note: Using public access for now. In production, implement proper auth policies.

-- Push Notification Tokens
CREATE POLICY "Public access tokens" ON push_notification_tokens
  FOR ALL USING (true);

-- Notification Preferences
CREATE POLICY "Public access preferences" ON notification_preferences
  FOR ALL USING (true);

-- Notification Logs (read-only for users)
CREATE POLICY "Public read logs" ON notification_logs
  FOR SELECT USING (true);

CREATE POLICY "Service write logs" ON notification_logs
  FOR INSERT WITH CHECK (true);

-- ============================================================================
-- Triggers
-- ============================================================================

-- Auto-update updated_at timestamp on notification_preferences
CREATE OR REPLACE FUNCTION update_notification_prefs_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  NEW.version = OLD.version + 1; -- Increment version for conflict resolution
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER notification_prefs_updated_at
  BEFORE UPDATE ON notification_preferences
  FOR EACH ROW
  EXECUTE FUNCTION update_notification_prefs_updated_at();

-- Auto-update last_used_at on token usage
CREATE OR REPLACE FUNCTION update_token_last_used()
RETURNS TRIGGER AS $$
BEGIN
  NEW.last_used_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER token_last_used_update
  BEFORE UPDATE ON push_notification_tokens
  FOR EACH ROW
  WHEN (OLD.last_used_at IS DISTINCT FROM NEW.last_used_at)
  EXECUTE FUNCTION update_token_last_used();

-- ============================================================================
-- Helper Functions
-- ============================================================================

-- Function to clean up expired tokens
CREATE OR REPLACE FUNCTION cleanup_expired_tokens()
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM push_notification_tokens
  WHERE expires_at IS NOT NULL AND expires_at < NOW();

  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Function to clean up old notification logs (keep last 30 days)
CREATE OR REPLACE FUNCTION cleanup_old_notification_logs()
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM notification_logs
  WHERE sent_at < NOW() - INTERVAL '30 days';

  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- Initial Data / Migrations
-- ============================================================================

-- No initial data needed - preferences created on first app use

-- ============================================================================
-- Comments
-- ============================================================================

COMMENT ON TABLE push_notification_tokens IS 'Stores device push notification tokens for referees';
COMMENT ON TABLE notification_preferences IS 'User notification preferences with multi-device sync support';
COMMENT ON TABLE notification_logs IS 'Audit log for notification delivery and analytics';

COMMENT ON COLUMN notification_preferences.version IS 'Version number for optimistic locking and conflict resolution';
COMMENT ON COLUMN notification_preferences.last_synced_at IS 'Last time preferences were synced from device';
COMMENT ON COLUMN notification_logs.status IS 'Delivery status: pending → sent → delivered → opened (or failed)';
