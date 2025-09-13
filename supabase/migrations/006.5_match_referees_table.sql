-- Migration 006.5: Add match_referees table
-- This migration creates the match_referees table to link referees to matches

-- =============================================================================
-- CREATE MATCH_REFEREES TABLE
-- =============================================================================

CREATE TABLE IF NOT EXISTS match_referees (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id TEXT NOT NULL, -- Changed to TEXT to match matches.id
  referee_id INTEGER NOT NULL,
  role VARCHAR(20), -- 'referee1', 'referee2', 'first_referee', 'second_referee'
  tournament_code VARCHAR,
  utc_datetime TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Add foreign key constraint to matches table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'fk_match_referees_match'
  ) THEN
    ALTER TABLE match_referees
    ADD CONSTRAINT fk_match_referees_match 
    FOREIGN KEY (match_id) REFERENCES matches(id) ON DELETE CASCADE;
  END IF;
END $$;

-- =============================================================================
-- PERFORMANCE INDEXES
-- =============================================================================

CREATE INDEX IF NOT EXISTS idx_match_referees_match_id ON match_referees(match_id);
CREATE INDEX IF NOT EXISTS idx_match_referees_referee_id ON match_referees(referee_id);
CREATE INDEX IF NOT EXISTS idx_match_referees_tournament_code ON match_referees(tournament_code);
CREATE INDEX IF NOT EXISTS idx_match_referees_utc_datetime ON match_referees(utc_datetime);

-- =============================================================================
-- ROW LEVEL SECURITY
-- =============================================================================

-- Enable RLS on match_referees table
ALTER TABLE match_referees ENABLE ROW LEVEL SECURITY;

-- Create policies for match_referees table
CREATE POLICY "match_referees_public_read" ON match_referees
FOR SELECT USING (true);

CREATE POLICY "match_referees_service_full_access" ON match_referees
FOR ALL USING (auth.role() = 'service_role');

-- =============================================================================
-- REAL-TIME SUBSCRIPTIONS
-- =============================================================================

-- Enable real-time subscriptions for match_referees
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE match_referees;
  END IF;
EXCEPTION
  WHEN duplicate_object THEN
    -- Table already added to real-time publication, ignore error
    NULL;
END $$;

-- =============================================================================
-- GRANT PERMISSIONS
-- =============================================================================

-- Grant necessary permissions
GRANT SELECT ON match_referees TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON match_referees TO service_role;

-- =============================================================================
-- UPDATE SCHEMA VERSION
-- =============================================================================

-- Insert schema version record
INSERT INTO schema_versions (version, description) VALUES
('1.2.0', 'Added match_referees table for referee-match relationships')
ON CONFLICT (version) DO NOTHING;

-- =============================================================================
-- VALIDATION
-- =============================================================================

DO $$
BEGIN
  RAISE NOTICE 'Migration 006.5 completed successfully!';
  RAISE NOTICE 'Created match_referees table with foreign key to matches';
  RAISE NOTICE 'Added indexes, RLS policies, and real-time subscriptions';
END $$;