-- Migration 013: Fix Matches Schema Alignment
-- This migration aligns the matches table structure with the documented schema
-- and the expectations of RefereeStatsService and DualReadService

-- =============================================================================
-- BACKUP EXISTING DATA (if any)
-- =============================================================================

-- Create backup table for existing data
CREATE TABLE IF NOT EXISTS matches_backup AS
SELECT * FROM matches WHERE 1=0; -- Empty backup table structure

-- If matches table has data, back it up
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM matches LIMIT 1) THEN
    INSERT INTO matches_backup SELECT * FROM matches;
    RAISE NOTICE 'Backed up % rows from matches table', (SELECT COUNT(*) FROM matches_backup);
  END IF;
END $$;

-- =============================================================================
-- DROP EXISTING MATCHES TABLE AND RECREATE
-- =============================================================================

-- Drop dependent objects first
DROP TABLE IF EXISTS match_referees CASCADE;

-- Drop existing matches table
DROP TABLE IF EXISTS matches CASCADE;

-- =============================================================================
-- CREATE NEW MATCHES TABLE (SIMPLIFIED SCHEMA)
-- =============================================================================

-- Create matches table with simplified schema matching documentation
CREATE TABLE matches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  no VARCHAR NOT NULL UNIQUE,                    -- Match number (VIS: No)
  tournament_no VARCHAR NOT NULL,                -- Tournament number (VIS: TournamentNo)
  no_in_tournament VARCHAR,                       -- Match number within tournament
  team_a_name VARCHAR,                           -- Team A name
  team_b_name VARCHAR,                           -- Team B name
  local_date DATE,                               -- Local match date
  local_time TIME,                               -- Local match time
  court VARCHAR,                                 -- Court assignment
  status VARCHAR,                                -- Match status
  round VARCHAR,                                 -- Round/phase information

  -- Score tracking
  match_points_a INTEGER,                        -- Team A match points
  match_points_b INTEGER,                        -- Team B match points
  points_team_a_set1 INTEGER,                    -- Team A points in set 1
  points_team_b_set1 INTEGER,                    -- Team B points in set 1
  points_team_a_set2 INTEGER,                    -- Team A points in set 2
  points_team_b_set2 INTEGER,                    -- Team B points in set 2
  points_team_a_set3 INTEGER,                    -- Team A points in set 3
  points_team_b_set3 INTEGER,                    -- Team B points in set 3

  -- Set durations
  duration_set1 VARCHAR,                         -- Duration of set 1
  duration_set2 VARCHAR,                         -- Duration of set 2
  duration_set3 VARCHAR,                         -- Duration of set 3

  -- Direct referee information (simplified approach)
  no_referee1 VARCHAR,                           -- Referee 1 ID
  no_referee2 VARCHAR,                           -- Referee 2 ID
  referee1_name VARCHAR,                         -- Referee 1 name
  referee2_name VARCHAR,                         -- Referee 2 name
  referee1_federation_code VARCHAR,              -- Referee 1 federation
  referee2_federation_code VARCHAR,              -- Referee 2 federation

  -- Metadata
  last_synced TIMESTAMP DEFAULT NOW(),
  version INTEGER DEFAULT 1,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- =============================================================================
-- CREATE PERFORMANCE INDEXES
-- =============================================================================

-- Primary indexes for common queries
CREATE INDEX idx_matches_tournament_no ON matches(tournament_no);
CREATE INDEX idx_matches_local_date ON matches(local_date);
CREATE INDEX idx_matches_status ON matches(status);
CREATE INDEX idx_matches_last_synced ON matches(last_synced);
CREATE INDEX idx_matches_no_in_tournament ON matches(no_in_tournament);

-- Referee lookup indexes
CREATE INDEX idx_matches_referee1 ON matches(no_referee1);
CREATE INDEX idx_matches_referee2 ON matches(no_referee2);
CREATE INDEX idx_matches_referee1_name ON matches(referee1_name);
CREATE INDEX idx_matches_referee2_name ON matches(referee2_name);

-- Composite indexes for common query patterns
CREATE INDEX idx_matches_tournament_status ON matches(tournament_no, status);
CREATE INDEX idx_matches_tournament_date ON matches(tournament_no, local_date);

-- =============================================================================
-- AUTOMATIC TIMESTAMP TRIGGERS
-- =============================================================================

-- Function to update timestamps
CREATE OR REPLACE FUNCTION update_matches_last_synced()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  NEW.last_synced = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for automatic timestamp updates
DROP TRIGGER IF EXISTS update_matches_timestamp_trigger ON matches;
CREATE TRIGGER update_matches_timestamp_trigger
  BEFORE UPDATE ON matches
  FOR EACH ROW
  EXECUTE FUNCTION update_matches_last_synced();

-- =============================================================================
-- ROW LEVEL SECURITY POLICIES
-- =============================================================================

-- Enable RLS on matches table
ALTER TABLE matches ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Allow public read" ON matches;
DROP POLICY IF EXISTS "Allow service full access" ON matches;

-- Public read access for client applications
CREATE POLICY "Allow public read" ON matches
  FOR SELECT USING (true);

-- Service role full access for sync operations
CREATE POLICY "Allow service full access" ON matches
  FOR ALL USING (auth.role() = 'service_role');

-- =============================================================================
-- REAL-TIME CONFIGURATION
-- =============================================================================

-- Enable real-time for matches table
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE matches;
  END IF;
EXCEPTION
  WHEN duplicate_object THEN
    -- Table already added to real-time publication, ignore error
    NULL;
END $$;

-- =============================================================================
-- UTILITY FUNCTIONS
-- =============================================================================

-- Function to get match statistics by tournament
CREATE OR REPLACE FUNCTION get_tournament_match_stats(tournament_no_param VARCHAR)
RETURNS TABLE (
  total_matches BIGINT,
  completed_matches BIGINT,
  live_matches BIGINT,
  scheduled_matches BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    COUNT(*)::BIGINT as total_matches,
    COUNT(CASE WHEN status = 'Finished' THEN 1 END)::BIGINT as completed_matches,
    COUNT(CASE WHEN status = 'Running' THEN 1 END)::BIGINT as live_matches,
    COUNT(CASE WHEN status = 'Scheduled' THEN 1 END)::BIGINT as scheduled_matches
  FROM matches
  WHERE tournament_no = tournament_no_param;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get referee matches
CREATE OR REPLACE FUNCTION get_referee_matches(
  referee_id_param VARCHAR,
  tournament_no_param VARCHAR DEFAULT NULL
)
RETURNS TABLE (
  match_no VARCHAR,
  tournament_no VARCHAR,
  team_a_name VARCHAR,
  team_b_name VARCHAR,
  local_date DATE,
  local_time TIME,
  court VARCHAR,
  status VARCHAR,
  round VARCHAR,
  referee_role VARCHAR
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    m.no as match_no,
    m.tournament_no,
    m.team_a_name,
    m.team_b_name,
    m.local_date,
    m.local_time,
    m.court,
    m.status,
    m.round,
    CASE
      WHEN m.no_referee1 = referee_id_param OR m.referee1_name ILIKE '%' || referee_id_param || '%' THEN 'first'
      WHEN m.no_referee2 = referee_id_param OR m.referee2_name ILIKE '%' || referee_id_param || '%' THEN 'second'
      ELSE 'unknown'
    END as referee_role
  FROM matches m
  WHERE (
    m.no_referee1 = referee_id_param OR
    m.referee1_name ILIKE '%' || referee_id_param || '%' OR
    m.no_referee2 = referee_id_param OR
    m.referee2_name ILIKE '%' || referee_id_param || '%'
  )
  AND (tournament_no_param IS NULL OR m.tournament_no = tournament_no_param)
  ORDER BY m.local_date DESC, m.local_time DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION get_tournament_match_stats(VARCHAR) TO service_role;
GRANT EXECUTE ON FUNCTION get_referee_matches(VARCHAR, VARCHAR) TO service_role;
GRANT EXECUTE ON FUNCTION update_matches_last_synced() TO service_role;

-- =============================================================================
-- DATA MIGRATION FROM BACKUP (if needed)
-- =============================================================================

-- Function to migrate data from old schema to new schema
CREATE OR REPLACE FUNCTION migrate_matches_data()
RETURNS INTEGER AS $$
DECLARE
  migrated_count INTEGER := 0;
BEGIN
  -- Check if backup table has data
  IF EXISTS (SELECT 1 FROM matches_backup LIMIT 1) THEN
    -- Migrate data from old schema to new schema
    INSERT INTO matches (
      no, tournament_no, team_a_name, team_b_name,
      local_date, local_time, court, status, round,
      created_at, updated_at
    )
    SELECT
      vis_match_no::VARCHAR as no,
      tournament_code as tournament_no,
      team_a_name,
      team_b_name,
      utc_datetime::DATE as local_date,
      utc_datetime::TIME as local_time,
      court,
      status,
      round_name as round,
      created_at,
      updated_at
    FROM matches_backup
    ON CONFLICT (no) DO NOTHING;

    GET DIAGNOSTICS migrated_count = ROW_COUNT;
    RAISE NOTICE 'Migrated % rows from backup to new matches table', migrated_count;
  END IF;

  RETURN migrated_count;
END;
$$ LANGUAGE plpgsql;

-- Run data migration
SELECT migrate_matches_data();

-- =============================================================================
-- CLEANUP
-- =============================================================================

-- Drop migration function (no longer needed)
DROP FUNCTION IF EXISTS migrate_matches_data();

-- Keep backup table for safety (can be dropped manually later)
-- DROP TABLE IF EXISTS matches_backup;

-- =============================================================================
-- VALIDATION
-- =============================================================================

-- Verify the new schema
DO $$
BEGIN
  -- Check matches table exists with correct structure
  ASSERT (SELECT COUNT(*) FROM information_schema.tables
          WHERE table_name = 'matches') = 1,
          'Matches table was not created';

  -- Check required columns exist
  ASSERT (SELECT COUNT(*) FROM information_schema.columns
          WHERE table_name = 'matches'
          AND column_name IN ('no', 'tournament_no', 'local_date', 'local_time', 'no_referee1', 'referee1_name')) = 6,
          'Required columns missing from matches table';

  -- Check indexes were created
  ASSERT (SELECT COUNT(*) FROM pg_indexes
          WHERE tablename = 'matches') >= 8,
          'Required indexes missing from matches table';

  -- Check RLS is enabled
  ASSERT (SELECT COUNT(*) FROM pg_class
          WHERE relname = 'matches'
          AND relrowsecurity = true) = 1,
          'Row Level Security not enabled on matches table';

  RAISE NOTICE 'Matches schema alignment migration completed successfully';
END $$;

-- =============================================================================
-- SCHEMA VERSION UPDATE
-- =============================================================================

-- Update schema version record
INSERT INTO schema_versions (version, description) VALUES
('2.3.0', 'Aligned matches table with simplified schema for referee stats and dual read service')
ON CONFLICT (version) DO UPDATE SET description = EXCLUDED.description;