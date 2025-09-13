-- Migration 012: Fix referee_analytics schema to include updated_at column
-- This fixes the trigger error when creating match_referees assignments

-- =============================================================================
-- ADD MISSING COLUMNS TO REFEREE_ANALYTICS
-- =============================================================================

-- Add updated_at column to referee_analytics table if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'referee_analytics' 
    AND column_name = 'updated_at'
  ) THEN
    ALTER TABLE referee_analytics ADD COLUMN updated_at timestamptz DEFAULT now();
    RAISE NOTICE 'Added updated_at column to referee_analytics';
  ELSE
    RAISE NOTICE 'updated_at column already exists in referee_analytics';
  END IF;
END $$;

-- Add created_at column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'referee_analytics' 
    AND column_name = 'created_at'
  ) THEN
    ALTER TABLE referee_analytics ADD COLUMN created_at timestamptz DEFAULT now();
    RAISE NOTICE 'Added created_at column to referee_analytics';
  ELSE
    RAISE NOTICE 'created_at column already exists in referee_analytics';
  END IF;
END $$;

-- =============================================================================
-- CREATE TRIGGER TO UPDATE TIMESTAMPS
-- =============================================================================

-- Create or replace the update timestamp function for referee_analytics
CREATE OR REPLACE FUNCTION update_referee_analytics_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS trigger_update_referee_analytics_timestamp ON referee_analytics;

-- Create new trigger for updated_at
CREATE TRIGGER trigger_update_referee_analytics_timestamp
  BEFORE UPDATE ON referee_analytics
  FOR EACH ROW
  EXECUTE FUNCTION update_referee_analytics_timestamp();

-- =============================================================================
-- BACKFILL EXISTING DATA
-- =============================================================================

-- Update existing rows to have proper timestamps
UPDATE referee_analytics 
SET 
  created_at = COALESCE(created_at, now()),
  updated_at = COALESCE(updated_at, now())
WHERE created_at IS NULL OR updated_at IS NULL;

-- =============================================================================
-- VALIDATION
-- =============================================================================

DO $$
BEGIN
  -- Validate that the columns exist
  ASSERT (SELECT COUNT(*) FROM information_schema.columns 
          WHERE table_name = 'referee_analytics' 
          AND column_name = 'updated_at') = 1,
          'updated_at column was not added to referee_analytics';
          
  ASSERT (SELECT COUNT(*) FROM information_schema.columns 
          WHERE table_name = 'referee_analytics' 
          AND column_name = 'created_at') = 1,
          'created_at column was not added to referee_analytics';

  -- Validate trigger exists
  ASSERT (SELECT COUNT(*) FROM pg_trigger 
          WHERE tgname = 'trigger_update_referee_analytics_timestamp') = 1,
          'referee_analytics timestamp trigger was not created';

  RAISE NOTICE 'Referee analytics schema fix completed successfully';
END $$;