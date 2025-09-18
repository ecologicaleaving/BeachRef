-- Migration 014: Add Timezone Support
-- This migration adds UTC timestamp columns to matches table and timezone metadata to tournaments table
-- Implements Phase 1 timezone foundation requirements with additive-only changes

-- =============================================================================
-- BACKUP EXISTING DATA
-- =============================================================================

-- Create backup tables for safety
CREATE TABLE IF NOT EXISTS matches_timezone_backup AS
SELECT * FROM matches WHERE 1=0; -- Empty backup table structure

CREATE TABLE IF NOT EXISTS tournaments_timezone_backup AS
SELECT * FROM tournaments WHERE 1=0; -- Empty backup table structure

-- Back up existing data if any
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM matches LIMIT 1) THEN
    INSERT INTO matches_timezone_backup SELECT * FROM matches;
    RAISE NOTICE 'Backed up % rows from matches table', (SELECT COUNT(*) FROM matches_timezone_backup);
  END IF;

  IF EXISTS (SELECT 1 FROM tournaments LIMIT 1) THEN
    INSERT INTO tournaments_timezone_backup SELECT * FROM tournaments;
    RAISE NOTICE 'Backed up % rows from tournaments table', (SELECT COUNT(*) FROM tournaments_timezone_backup);
  END IF;
END $$;

-- =============================================================================
-- ADD UTC COLUMNS TO MATCHES TABLE
-- =============================================================================

-- Add UTC timestamp columns to matches table (additive-only)
ALTER TABLE matches
  ADD COLUMN IF NOT EXISTS utc_start TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS utc_end TIMESTAMPTZ;

-- Add timezone-related metadata columns to matches
ALTER TABLE matches
  ADD COLUMN IF NOT EXISTS timezone_source VARCHAR, -- Source of timezone data (BeginDateTimeUtc, UtcDate+UtcTime, etc.)
  ADD COLUMN IF NOT EXISTS timezone_accuracy VARCHAR CHECK (timezone_accuracy IN ('high', 'medium', 'low')),
  ADD COLUMN IF NOT EXISTS timezone_fallback_used BOOLEAN DEFAULT false;

-- Add comments to document the new columns
COMMENT ON COLUMN matches.utc_start IS 'UTC start time converted from VIS API timezone fields using priority cascade';
COMMENT ON COLUMN matches.utc_end IS 'UTC end time converted from VIS API timezone fields (optional)';
COMMENT ON COLUMN matches.timezone_source IS 'Source fields used for timezone conversion (e.g., BeginDateTimeUtc, UtcDate+UtcTime)';
COMMENT ON COLUMN matches.timezone_accuracy IS 'Accuracy level of timezone conversion: high (UTC direct), medium (with offset/timezone), low (fallback)';
COMMENT ON COLUMN matches.timezone_fallback_used IS 'Whether fallback logic was used for timezone conversion';

-- =============================================================================
-- ADD TIMEZONE METADATA TO TOURNAMENTS TABLE
-- =============================================================================

-- Add timezone metadata columns to tournaments table (additive-only)
ALTER TABLE tournaments
  ADD COLUMN IF NOT EXISTS timezone TEXT,
  ADD COLUMN IF NOT EXISTS default_offset TEXT,
  ADD COLUMN IF NOT EXISTS detected_timezone TEXT,
  ADD COLUMN IF NOT EXISTS last_timezone_sync TIMESTAMPTZ;

-- Add comments to document the new columns
COMMENT ON COLUMN tournaments.timezone IS 'Tournament timezone (IANA format, e.g., America/Sao_Paulo)';
COMMENT ON COLUMN tournaments.default_offset IS 'Default timezone offset (e.g., +03:00, -05:00)';
COMMENT ON COLUMN tournaments.detected_timezone IS 'Auto-detected timezone from VIS API data';
COMMENT ON COLUMN tournaments.last_timezone_sync IS 'Last time timezone data was synchronized from VIS API';

-- =============================================================================
-- CREATE PERFORMANCE INDEXES
-- =============================================================================

-- UTC timestamp indexes for optimized querying
CREATE INDEX IF NOT EXISTS idx_matches_utc_start ON matches(utc_start);
CREATE INDEX IF NOT EXISTS idx_matches_utc_end ON matches(utc_end);
CREATE INDEX IF NOT EXISTS idx_matches_utc_start_tournament ON matches(tournament_no, utc_start);

-- Timezone metadata indexes
CREATE INDEX IF NOT EXISTS idx_tournaments_timezone ON tournaments(timezone);
CREATE INDEX IF NOT EXISTS idx_tournaments_detected_timezone ON tournaments(detected_timezone);
CREATE INDEX IF NOT EXISTS idx_tournaments_timezone_sync ON tournaments(last_timezone_sync);

-- Composite indexes for common timezone queries
CREATE INDEX IF NOT EXISTS idx_matches_timezone_accuracy ON matches(timezone_accuracy, timezone_fallback_used);
CREATE INDEX IF NOT EXISTS idx_matches_timezone_source ON matches(timezone_source);

-- =============================================================================
-- TIMEZONE UTILITY FUNCTIONS
-- =============================================================================

-- Function to update match UTC timestamps from local time data
CREATE OR REPLACE FUNCTION update_match_utc_from_local(
  match_id UUID,
  local_date DATE,
  local_time TIME,
  tournament_timezone TEXT DEFAULT NULL,
  offset_hours INTEGER DEFAULT 0
)
RETURNS BOOLEAN AS $$
DECLARE
  utc_timestamp TIMESTAMPTZ;
BEGIN
  -- Convert local time to UTC using tournament timezone or offset
  IF tournament_timezone IS NOT NULL THEN
    -- Use timezone if available (requires timezone support in PostgreSQL)
    utc_timestamp := (local_date + local_time) AT TIME ZONE tournament_timezone AT TIME ZONE 'UTC';
  ELSE
    -- Use offset as fallback
    utc_timestamp := (local_date + local_time) - (offset_hours || ' hours')::INTERVAL;
  END IF;

  -- Update the match with UTC timestamp
  UPDATE matches
  SET
    utc_start = utc_timestamp,
    timezone_source = CASE
      WHEN tournament_timezone IS NOT NULL THEN 'LocalDate+LocalTime+Timezone'
      ELSE 'LocalDate+LocalTime+Offset'
    END,
    timezone_accuracy = CASE
      WHEN tournament_timezone IS NOT NULL THEN 'medium'
      ELSE 'low'
    END,
    timezone_fallback_used = (tournament_timezone IS NULL),
    updated_at = NOW(),
    last_synced = NOW()
  WHERE id = match_id;

  RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get tournament timezone statistics
CREATE OR REPLACE FUNCTION get_tournament_timezone_stats(tournament_no_param VARCHAR)
RETURNS TABLE (
  total_matches BIGINT,
  matches_with_utc BIGINT,
  high_accuracy_matches BIGINT,
  medium_accuracy_matches BIGINT,
  low_accuracy_matches BIGINT,
  fallback_used_count BIGINT,
  tournament_timezone TEXT,
  timezone_coverage_percent NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    COUNT(*)::BIGINT as total_matches,
    COUNT(CASE WHEN utc_start IS NOT NULL THEN 1 END)::BIGINT as matches_with_utc,
    COUNT(CASE WHEN timezone_accuracy = 'high' THEN 1 END)::BIGINT as high_accuracy_matches,
    COUNT(CASE WHEN timezone_accuracy = 'medium' THEN 1 END)::BIGINT as medium_accuracy_matches,
    COUNT(CASE WHEN timezone_accuracy = 'low' THEN 1 END)::BIGINT as low_accuracy_matches,
    COUNT(CASE WHEN timezone_fallback_used = true THEN 1 END)::BIGINT as fallback_used_count,
    t.timezone as tournament_timezone,
    CASE
      WHEN COUNT(*) > 0 THEN
        ROUND((COUNT(CASE WHEN utc_start IS NOT NULL THEN 1 END)::NUMERIC / COUNT(*)::NUMERIC) * 100, 2)
      ELSE 0
    END as timezone_coverage_percent
  FROM matches m
  LEFT JOIN tournaments t ON m.tournament_no = t.no
  WHERE m.tournament_no = tournament_no_param
  GROUP BY t.timezone;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to validate UTC timestamp consistency
CREATE OR REPLACE FUNCTION validate_utc_timestamp_consistency()
RETURNS TABLE (
  match_no VARCHAR,
  tournament_no VARCHAR,
  local_datetime TEXT,
  utc_start TIMESTAMPTZ,
  timezone_source VARCHAR,
  validation_status TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    m.no as match_no,
    m.tournament_no,
    CONCAT(m.local_date, ' ', m.local_time) as local_datetime,
    m.utc_start,
    m.timezone_source,
    CASE
      WHEN m.utc_start IS NULL THEN 'Missing UTC timestamp'
      WHEN m.local_date IS NULL OR m.local_time IS NULL THEN 'Missing local time data'
      WHEN m.timezone_accuracy = 'high' AND m.timezone_fallback_used = false THEN 'Valid high accuracy'
      WHEN m.timezone_accuracy = 'medium' AND m.timezone_fallback_used = false THEN 'Valid medium accuracy'
      WHEN m.timezone_accuracy = 'low' OR m.timezone_fallback_used = true THEN 'Fallback used - verify accuracy'
      ELSE 'Unknown validation state'
    END as validation_status
  FROM matches m
  WHERE m.utc_start IS NOT NULL
  ORDER BY m.tournament_no, m.local_date, m.local_time;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION update_match_utc_from_local(UUID, DATE, TIME, TEXT, INTEGER) TO service_role;
GRANT EXECUTE ON FUNCTION get_tournament_timezone_stats(VARCHAR) TO service_role;
GRANT EXECUTE ON FUNCTION validate_utc_timestamp_consistency() TO service_role;

-- =============================================================================
-- UPDATE EXISTING TRIGGERS
-- =============================================================================

-- Update existing timestamp trigger to also handle timezone fields
CREATE OR REPLACE FUNCTION update_matches_with_timezone_sync()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  NEW.last_synced = NOW();

  -- If timezone-related fields are being updated, mark the sync timestamp
  IF TG_OP = 'UPDATE' AND (
    NEW.utc_start IS DISTINCT FROM OLD.utc_start OR
    NEW.timezone_source IS DISTINCT FROM OLD.timezone_source OR
    NEW.timezone_accuracy IS DISTINCT FROM OLD.timezone_accuracy
  ) THEN
    NEW.last_synced = NOW();
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Update the existing trigger
DROP TRIGGER IF EXISTS update_matches_timestamp_trigger ON matches;
CREATE TRIGGER update_matches_timezone_timestamp_trigger
  BEFORE UPDATE ON matches
  FOR EACH ROW
  EXECUTE FUNCTION update_matches_with_timezone_sync();

-- Similar trigger for tournaments timezone updates
CREATE OR REPLACE FUNCTION update_tournaments_timezone_sync()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  NEW.last_synced = NOW();

  -- If timezone fields are being updated, mark the timezone sync timestamp
  IF TG_OP = 'UPDATE' AND (
    NEW.timezone IS DISTINCT FROM OLD.timezone OR
    NEW.default_offset IS DISTINCT FROM OLD.default_offset OR
    NEW.detected_timezone IS DISTINCT FROM OLD.detected_timezone
  ) THEN
    NEW.last_timezone_sync = NOW();
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add timezone trigger for tournaments
DROP TRIGGER IF EXISTS update_tournaments_timezone_trigger ON tournaments;
CREATE TRIGGER update_tournaments_timezone_trigger
  BEFORE UPDATE ON tournaments
  FOR EACH ROW
  EXECUTE FUNCTION update_tournaments_timezone_sync();

-- =============================================================================
-- ROW LEVEL SECURITY UPDATES
-- =============================================================================

-- RLS policies remain the same - new columns inherit existing policies
-- No changes needed as all existing policies use "true" conditions for reads
-- and service_role for writes, which will apply to new columns

-- =============================================================================
-- REAL-TIME CONFIGURATION
-- =============================================================================

-- Real-time subscriptions already enabled for matches and tournaments tables
-- New columns will automatically be included in real-time updates

-- =============================================================================
-- DATA MIGRATION PREPARATION
-- =============================================================================

-- Function to migrate existing local time data to UTC (run separately)
CREATE OR REPLACE FUNCTION migrate_existing_matches_to_utc()
RETURNS INTEGER AS $$
DECLARE
  migrated_count INTEGER := 0;
  match_record RECORD;
  tournament_tz TEXT;
BEGIN
  -- Iterate through matches that have local time data but no UTC data
  FOR match_record IN
    SELECT m.id, m.local_date, m.local_time, m.tournament_no, t.timezone, t.default_offset
    FROM matches m
    LEFT JOIN tournaments t ON m.tournament_no = t.no
    WHERE m.local_date IS NOT NULL
      AND m.local_time IS NOT NULL
      AND m.utc_start IS NULL
  LOOP
    -- Determine timezone for conversion
    tournament_tz := match_record.timezone;

    -- Attempt to update UTC timestamp
    IF update_match_utc_from_local(
      match_record.id,
      match_record.local_date,
      match_record.local_time,
      tournament_tz,
      0 -- Default offset, will be improved with VIS API integration
    ) THEN
      migrated_count := migrated_count + 1;
    END IF;
  END LOOP;

  RAISE NOTICE 'Migrated % matches from local time to UTC', migrated_count;
  RETURN migrated_count;
END;
$$ LANGUAGE plpgsql;

-- =============================================================================
-- VALIDATION QUERIES
-- =============================================================================

-- Verify new columns were added successfully
DO $$
BEGIN
  -- Check matches table new columns
  ASSERT (SELECT COUNT(*) FROM information_schema.columns
          WHERE table_name = 'matches'
          AND column_name IN ('utc_start', 'utc_end', 'timezone_source', 'timezone_accuracy', 'timezone_fallback_used')) = 5,
          'Required UTC columns missing from matches table';

  -- Check tournaments table new columns
  ASSERT (SELECT COUNT(*) FROM information_schema.columns
          WHERE table_name = 'tournaments'
          AND column_name IN ('timezone', 'default_offset', 'detected_timezone', 'last_timezone_sync')) = 4,
          'Required timezone columns missing from tournaments table';

  -- Check indexes were created
  ASSERT (SELECT COUNT(*) FROM pg_indexes
          WHERE tablename IN ('matches', 'tournaments')
          AND indexname LIKE '%timezone%' OR indexname LIKE '%utc%') >= 6,
          'Required timezone indexes missing';

  -- Check functions were created
  ASSERT (SELECT COUNT(*) FROM pg_proc
          WHERE proname IN ('update_match_utc_from_local', 'get_tournament_timezone_stats', 'validate_utc_timestamp_consistency')) = 3,
          'Required timezone utility functions missing';

  RAISE NOTICE 'Timezone support migration completed successfully';
END $$;

-- =============================================================================
-- SCHEMA VERSION UPDATE
-- =============================================================================

-- Update schema version record
INSERT INTO schema_versions (version, description) VALUES
('2.4.0', 'Added timezone support with UTC columns for matches and timezone metadata for tournaments')
ON CONFLICT (version) DO UPDATE SET description = EXCLUDED.description;

-- =============================================================================
-- CLEANUP NOTES
-- =============================================================================

-- Backup tables can be dropped manually after validation:
-- DROP TABLE IF EXISTS matches_timezone_backup;
-- DROP TABLE IF EXISTS tournaments_timezone_backup;

-- To run data migration (execute separately after validation):
-- SELECT migrate_existing_matches_to_utc();