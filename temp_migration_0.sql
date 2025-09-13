-- Database Schema Migration 002: Tournament and Match Caching Tables
-- This migration creates the complete database schema for the multi-tier caching system
-- including tables, indexes, RLS policies, functions, and initial data

-- =============================================================================
-- SCHEMA VERSION TRACKING
-- =============================================================================

-- Create schema versions table for tracking database changes
CREATE TABLE IF NOT EXISTS schema_versions (
  version VARCHAR PRIMARY KEY,
  applied_at TIMESTAMP DEFAULT NOW(),
  description TEXT
);

-- =============================================================================
-- CORE TABLES
-- =============================================================================

-- tournaments: Primary table for tournament master data caching
CREATE TABLE tournaments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  no VARCHAR NOT NULL UNIQUE,
  code VARCHAR,
  name VARCHAR,
  start_date DATE,
  end_date DATE,
  status VARCHAR,
  location VARCHAR,
  last_synced TIMESTAMP DEFAULT NOW(),
  version INTEGER DEFAULT 1,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- matches: Match data with tournament relationships and live score tracking
CREATE TABLE matches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  no VARCHAR NOT NULL,
  tournament_no VARCHAR NOT NULL,
  no_in_tournament VARCHAR,
  team_a_name VARCHAR,
  team_b_name VARCHAR,
  local_date DATE,
  local_time TIME,
  court VARCHAR,
  status VARCHAR,
  round VARCHAR,
  -- Score tracking fields
  match_points_a INTEGER,
  match_points_b INTEGER,
  points_team_a_set1 INTEGER,
  points_team_b_set1 INTEGER,
  points_team_a_set2 INTEGER,
  points_team_b_set2 INTEGER,
  points_team_a_set3 INTEGER,
  points_team_b_set3 INTEGER,
  -- Set duration fields
  duration_set1 VARCHAR,
  duration_set2 VARCHAR,
  duration_set3 VARCHAR,
  -- Referee information
  no_referee1 VARCHAR,
  no_referee2 VARCHAR,
  referee1_name VARCHAR,
  referee2_name VARCHAR,
  referee1_federation_code VARCHAR,
  referee2_federation_code VARCHAR,
  -- Metadata
  last_synced TIMESTAMP DEFAULT NOW(),
  version INTEGER DEFAULT 1,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  FOREIGN KEY (tournament_no) REFERENCES tournaments(no) ON DELETE CASCADE
);

-- sync_status: Tracking table for monitoring synchronization job health
CREATE TABLE sync_status (
  entity_type VARCHAR PRIMARY KEY,
  last_sync TIMESTAMP,
  sync_frequency INTERVAL,
  next_sync TIMESTAMP,
  success_count INTEGER DEFAULT 0,
  error_count INTEGER DEFAULT 0,
  last_error TEXT,
  last_error_time TIMESTAMP,
  is_active BOOLEAN DEFAULT true,
  updated_at TIMESTAMP DEFAULT NOW()
);

-- =============================================================================
-- PERFORMANCE INDEXES
-- =============================================================================

-- tournaments table indexes for optimized querying
CREATE INDEX idx_tournaments_code ON tournaments(code);
CREATE INDEX idx_tournaments_start_date ON tournaments(start_date);
CREATE INDEX idx_tournaments_status ON tournaments(status);
CREATE INDEX idx_tournaments_last_synced ON tournaments(last_synced);

-- matches table indexes for optimized querying
CREATE INDEX idx_matches_tournament_no ON matches(tournament_no);
CREATE INDEX idx_matches_local_date ON matches(local_date);
CREATE INDEX idx_matches_status ON matches(status);
CREATE INDEX idx_matches_last_synced ON matches(last_synced);
CREATE INDEX idx_matches_no_in_tournament ON matches(no_in_tournament);

-- =============================================================================
-- ROW LEVEL SECURITY POLICIES
-- =============================================================================

-- Enable RLS on all tables
ALTER TABLE tournaments ENABLE ROW LEVEL SECURITY;
ALTER TABLE matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE sync_status ENABLE ROW LEVEL SECURITY;

-- tournaments table policies
-- Drop existing policies if they exist
DROP POLICY IF EXISTS "tournaments_public_read" ON tournaments;
DROP POLICY IF EXISTS "tournaments_service_full_access" ON tournaments;

-- Public read access for client applications
CREATE POLICY "tournaments_public_read" ON tournaments
FOR SELECT USING (true);

-- Service role full access for sync operations
CREATE POLICY "tournaments_service_full_access" ON tournaments
FOR ALL USING (auth.role() = 'service_role');

-- matches table policies
-- Drop existing policies if they exist
DROP POLICY IF EXISTS "matches_public_read" ON matches;
DROP POLICY IF EXISTS "matches_service_full_access" ON matches;

-- Public read access for live match updates
CREATE POLICY "matches_public_read" ON matches
FOR SELECT USING (true);

-- Service role full access
CREATE POLICY "matches_service_full_access" ON matches
FOR ALL USING (auth.role() = 'service_role');

-- sync_status table policies
-- Drop existing policies if they exist
DROP POLICY IF EXISTS "sync_status_monitoring_read" ON sync_status;
DROP POLICY IF EXISTS "sync_status_service_full_access" ON sync_status;

-- Monitoring read access
CREATE POLICY "sync_status_monitoring_read" ON sync_status
FOR SELECT USING (true);

-- Service role full access
CREATE POLICY "sync_status_service_full_access" ON sync_status
FOR ALL USING (auth.role() = 'service_role');

-- =============================================================================
-- DATA RETENTION AND CLEANUP FUNCTIONS
-- =============================================================================

-- Function to update timestamp on record changes
CREATE OR REPLACE FUNCTION update_last_synced()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  NEW.last_synced = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for automatic timestamp updates
CREATE TRIGGER update_tournaments_timestamp
  BEFORE UPDATE ON tournaments
  FOR EACH ROW
  EXECUTE FUNCTION update_last_synced();

CREATE TRIGGER update_matches_timestamp
  BEFORE UPDATE ON matches
  FOR EACH ROW
  EXECUTE FUNCTION update_last_synced();

-- Data retention cleanup function
CREATE OR REPLACE FUNCTION cleanup_old_matches()
RETURNS void AS $$
BEGIN
  -- Archive matches from tournaments that ended more than 6 months ago
  DELETE FROM matches 
  WHERE tournament_no IN (
    SELECT no FROM tournaments 
    WHERE end_date < NOW() - INTERVAL '6 months'
  );
  
  -- Archive very old tournaments (2+ years)
  DELETE FROM tournaments 
  WHERE end_date < NOW() - INTERVAL '2 years';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permissions to service role
GRANT EXECUTE ON FUNCTION cleanup_old_matches() TO service_role;
GRANT EXECUTE ON FUNCTION update_last_synced() TO service_role;

-- =============================================================================
-- REAL-TIME CONFIGURATION
-- =============================================================================

-- Enable real-time subscriptions for tournaments and matches
-- Note: This adds tables to the supabase_realtime publication
DO $$
BEGIN
  -- Add tournaments to real-time publication
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE tournaments;
  END IF;
EXCEPTION
  WHEN duplicate_object THEN
    -- Table already added to real-time publication, ignore error
    NULL;
END $$;

DO $$
BEGIN
  -- Add matches to real-time publication
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE matches;
  END IF;
EXCEPTION
  WHEN duplicate_object THEN
    -- Table already added to real-time publication, ignore error
    NULL;
END $$;

-- =============================================================================
-- INITIAL DATA SETUP
-- =============================================================================

-- Insert initial sync_status records
INSERT INTO sync_status (entity_type, sync_frequency, next_sync, is_active) VALUES
('tournaments', INTERVAL '1 day', NOW() + INTERVAL '1 day', true),
('matches_schedule', INTERVAL '15 minutes', NOW() + INTERVAL '15 minutes', true),
('matches_live', INTERVAL '30 seconds', NOW() + INTERVAL '30 seconds', true)
ON CONFLICT (entity_type) DO NOTHING;

-- Insert schema version record
INSERT INTO schema_versions (version, description) VALUES
('1.0.0', 'Initial schema with tournaments, matches, and sync_status tables')
ON CONFLICT (version) DO NOTHING;

-- =============================================================================
-- SCHEDULED CLEANUP JOB
-- =============================================================================

-- Schedule cleanup to run monthly (first day of month at midnight)
-- Note: This requires the pg_cron extension to be enabled
DO $$
BEGIN
  -- Only create cron job if pg_cron extension is available
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    PERFORM cron.schedule('cleanup-old-data', '0 0 1 * *', 'SELECT cleanup_old_matches();');
  END IF;
EXCEPTION
  WHEN OTHERS THEN
    -- pg_cron not available or other error, skip scheduling
    NULL;
END $$;

-- =============================================================================
-- VALIDATION QUERIES
-- =============================================================================

-- Verify all tables were created successfully
DO $$
BEGIN
  ASSERT (SELECT COUNT(*) FROM information_schema.tables 
          WHERE table_name IN ('tournaments', 'matches', 'sync_status', 'schema_versions')) = 4,
          'Not all required tables were created';
          
  ASSERT (SELECT COUNT(*) FROM information_schema.table_constraints 
          WHERE constraint_type = 'FOREIGN KEY' 
          AND table_name = 'matches') >= 1,
          'Foreign key constraint not created for matches table';
          
  ASSERT (SELECT COUNT(*) FROM pg_indexes 
          WHERE tablename IN ('tournaments', 'matches')) >= 9,
          'Not all required indexes were created';
          
  RAISE NOTICE 'Database schema migration completed successfully';
END $$;