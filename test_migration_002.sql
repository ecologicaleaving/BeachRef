-- Test Migration 002 Column Dependencies
-- Run this to verify column existence before running full migration

-- Check if tournaments table exists and what columns it has
SELECT 
  'tournaments' as table_name,
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns 
WHERE table_name = 'tournaments'
ORDER BY ordinal_position;

-- Check if matches table exists and what columns it has  
SELECT 
  'matches' as table_name,
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns 
WHERE table_name = 'matches'
ORDER BY ordinal_position;

-- Check existing indexes
SELECT 
  schemaname,
  tablename,
  indexname,
  indexdef
FROM pg_indexes 
WHERE tablename IN ('tournaments', 'matches')
ORDER BY tablename, indexname;

-- Verify migration readiness
DO $$
DECLARE
  tournaments_exists BOOLEAN;
  matches_exists BOOLEAN;
  start_date_exists BOOLEAN;
BEGIN
  -- Check table existence
  SELECT EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_name = 'tournaments'
  ) INTO tournaments_exists;
  
  SELECT EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_name = 'matches'
  ) INTO matches_exists;
  
  -- Check start_date column existence
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'tournaments' AND column_name = 'start_date'
  ) INTO start_date_exists;
  
  -- Report status
  RAISE NOTICE 'Migration 002 Readiness Check:';
  RAISE NOTICE '  tournaments table exists: %', tournaments_exists;
  RAISE NOTICE '  matches table exists: %', matches_exists;
  RAISE NOTICE '  start_date column exists: %', start_date_exists;
  
  IF tournaments_exists AND NOT start_date_exists THEN
    RAISE NOTICE '  ACTION NEEDED: tournaments table exists but missing start_date column';
    RAISE NOTICE '  This is likely the source of your error!';
  END IF;
  
  IF NOT tournaments_exists AND NOT matches_exists THEN
    RAISE NOTICE '  STATUS: Clean state - migration should create everything fresh';
  END IF;
  
END $$;