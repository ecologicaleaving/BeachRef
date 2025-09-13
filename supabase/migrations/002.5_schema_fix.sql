-- Migration 002.5: Schema Fix for Tournaments Table
-- This migration ensures the tournaments table has the correct structure
-- Run this BEFORE migration 004 to fix schema issues

-- =============================================================================
-- DIAGNOSTIC AND REPAIR SECTION
-- =============================================================================

-- First, let's check what we actually have and fix it
DO $$
DECLARE
  tournaments_exists BOOLEAN := false;
  tournaments_has_no_column BOOLEAN := false;
  sync_status_exists BOOLEAN := false;
BEGIN
  -- Check if tournaments table exists
  SELECT EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_name = 'tournaments' AND table_schema = 'public'
  ) INTO tournaments_exists;
  
  -- Check if tournaments table has 'no' column (if table exists)
  IF tournaments_exists THEN
    SELECT EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_name = 'tournaments' AND column_name = 'no' AND table_schema = 'public'
    ) INTO tournaments_has_no_column;
  END IF;
  
  -- Check if sync_status table exists
  SELECT EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_name = 'sync_status' AND table_schema = 'public'
  ) INTO sync_status_exists;
  
  -- Report current state
  RAISE NOTICE '=== SCHEMA DIAGNOSIS ===';
  RAISE NOTICE 'tournaments table exists: %', tournaments_exists;
  RAISE NOTICE 'tournaments has "no" column: %', tournaments_has_no_column;  
  RAISE NOTICE 'sync_status table exists: %', sync_status_exists;
  RAISE NOTICE '========================';
END $$;

-- =============================================================================
-- TOURNAMENTS TABLE REPAIR
-- =============================================================================

-- Ensure tournaments table exists with correct structure
CREATE TABLE IF NOT EXISTS tournaments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  no VARCHAR NOT NULL,
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

-- Add missing columns if they don't exist
ALTER TABLE tournaments ADD COLUMN IF NOT EXISTS id UUID DEFAULT gen_random_uuid();
ALTER TABLE tournaments ADD COLUMN IF NOT EXISTS no VARCHAR;
ALTER TABLE tournaments ADD COLUMN IF NOT EXISTS code VARCHAR;
ALTER TABLE tournaments ADD COLUMN IF NOT EXISTS name VARCHAR;
ALTER TABLE tournaments ADD COLUMN IF NOT EXISTS start_date DATE;
ALTER TABLE tournaments ADD COLUMN IF NOT EXISTS end_date DATE;
ALTER TABLE tournaments ADD COLUMN IF NOT EXISTS status VARCHAR;
ALTER TABLE tournaments ADD COLUMN IF NOT EXISTS location VARCHAR;
ALTER TABLE tournaments ADD COLUMN IF NOT EXISTS last_synced TIMESTAMP DEFAULT NOW();
ALTER TABLE tournaments ADD COLUMN IF NOT EXISTS version INTEGER DEFAULT 1;
ALTER TABLE tournaments ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT NOW();
ALTER TABLE tournaments ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT NOW();

-- Ensure 'no' column is NOT NULL and unique (critical for foreign keys)
DO $$
BEGIN
  -- First, make sure no column exists and is not null
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tournaments' AND column_name = 'no') THEN
    -- Set default values for null entries
    UPDATE tournaments SET no = 'TEMP_' || id::text WHERE no IS NULL;
    
    -- Make it NOT NULL
    ALTER TABLE tournaments ALTER COLUMN no SET NOT NULL;
    
    -- Add unique constraint if it doesn't exist
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.table_constraints 
      WHERE table_name = 'tournaments' AND constraint_name = 'tournaments_no_key'
    ) THEN
      ALTER TABLE tournaments ADD CONSTRAINT tournaments_no_key UNIQUE (no);
    END IF;
  END IF;
END $$;

-- Ensure primary key exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE table_name = 'tournaments' AND constraint_type = 'PRIMARY KEY'
  ) THEN
    ALTER TABLE tournaments ADD CONSTRAINT tournaments_pkey PRIMARY KEY (id);
  END IF;
END $$;

-- =============================================================================
-- MATCHES TABLE REPAIR  
-- =============================================================================

-- Ensure matches table exists with correct structure
CREATE TABLE IF NOT EXISTS matches (
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
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Add missing columns to matches if they don't exist
ALTER TABLE matches ADD COLUMN IF NOT EXISTS tournament_no VARCHAR;
ALTER TABLE matches ADD COLUMN IF NOT EXISTS no_in_tournament VARCHAR;
ALTER TABLE matches ADD COLUMN IF NOT EXISTS last_synced TIMESTAMP DEFAULT NOW();
ALTER TABLE matches ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT NOW();

-- Ensure matches table has proper constraints
DO $$
BEGIN
  -- Ensure tournament_no is not null where possible
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'matches' AND column_name = 'tournament_no') THEN
    -- Set default tournament_no for records that don't have it
    UPDATE matches SET tournament_no = 'UNKNOWN' WHERE tournament_no IS NULL;
  END IF;
END $$;

-- =============================================================================
-- SYNC_STATUS TABLE REPAIR
-- =============================================================================

-- Ensure sync_status table exists
CREATE TABLE IF NOT EXISTS sync_status (
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
-- FOREIGN KEY REPAIR (Safe Version)
-- =============================================================================

-- Add foreign key constraint from matches to tournaments (if both tables are ready)
DO $$
BEGIN
  -- Only add foreign key if both tables exist with required columns and constraint doesn't exist
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tournaments' AND column_name = 'no')
    AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'matches' AND column_name = 'tournament_no')
    AND NOT EXISTS (
      SELECT 1 FROM information_schema.table_constraints 
      WHERE table_name = 'matches' AND constraint_name = 'matches_tournament_no_fkey'
    ) THEN
    
    -- First clean up any invalid foreign key references
    UPDATE matches 
    SET tournament_no = 'UNKNOWN' 
    WHERE tournament_no NOT IN (SELECT no FROM tournaments) 
    AND tournament_no IS NOT NULL;
    
    -- Add the foreign key constraint
    ALTER TABLE matches 
    ADD CONSTRAINT matches_tournament_no_fkey 
    FOREIGN KEY (tournament_no) REFERENCES tournaments(no) ON DELETE CASCADE;
    
    RAISE NOTICE 'Added foreign key constraint: matches.tournament_no -> tournaments.no';
  END IF;
END $$;

-- =============================================================================
-- INDEXES REPAIR
-- =============================================================================

-- Create essential indexes if they don't exist
CREATE INDEX IF NOT EXISTS idx_tournaments_no ON tournaments(no);
CREATE INDEX IF NOT EXISTS idx_tournaments_start_date ON tournaments(start_date);
CREATE INDEX IF NOT EXISTS idx_tournaments_status ON tournaments(status);
CREATE INDEX IF NOT EXISTS idx_matches_tournament_no ON matches(tournament_no);
CREATE INDEX IF NOT EXISTS idx_matches_local_date ON matches(local_date);
CREATE INDEX IF NOT EXISTS idx_sync_status_entity_type ON sync_status(entity_type);

-- =============================================================================
-- VALIDATION AND FINAL CHECKS
-- =============================================================================

-- Final validation
DO $$
DECLARE
  tournaments_fixed BOOLEAN := false;
  tournaments_no_column BOOLEAN := false;
  sync_status_fixed BOOLEAN := false;
BEGIN
  -- Check if repairs worked
  SELECT EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_name = 'tournaments'
  ) INTO tournaments_fixed;
  
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'tournaments' AND column_name = 'no'
  ) INTO tournaments_no_column;
  
  SELECT EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_name = 'sync_status'
  ) INTO sync_status_fixed;
  
  -- Report results
  RAISE NOTICE '=== REPAIR RESULTS ===';
  RAISE NOTICE 'tournaments table: %', tournaments_fixed;
  RAISE NOTICE 'tournaments.no column: %', tournaments_no_column;
  RAISE NOTICE 'sync_status table: %', sync_status_fixed;
  RAISE NOTICE '=====================';
  
  -- Final check - this should now pass
  IF tournaments_fixed AND tournaments_no_column AND sync_status_fixed THEN
    RAISE NOTICE '✅ Schema repair completed successfully!';
    RAISE NOTICE '✅ Migration 004 should now work!';
  ELSE
    RAISE EXCEPTION '❌ Schema repair failed. Please check table structures manually.';
  END IF;
END $$;

-- =============================================================================
-- INSERT SCHEMA VERSION RECORD
-- =============================================================================

-- Ensure schema_versions table exists for tracking
CREATE TABLE IF NOT EXISTS schema_versions (
  version VARCHAR PRIMARY KEY,
  applied_at TIMESTAMP DEFAULT NOW(),
  description TEXT
);

-- Record this repair
INSERT INTO schema_versions (version, description) VALUES 
('002.5', 'Schema repair: Fixed tournaments table structure and foreign key constraints')
ON CONFLICT (version) DO UPDATE SET
  applied_at = NOW(),
  description = EXCLUDED.description;

-- =============================================================================
-- SUCCESS MESSAGE
-- =============================================================================

DO $$
BEGIN
  RAISE NOTICE '🛠️ Migration 002.5 (Schema Fix) completed successfully!';
  RAISE NOTICE '📋 Next step: Run migration 004 - it should now work without errors.';
END $$;