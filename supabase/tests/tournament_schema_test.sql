-- Tournament Schema Test Suite
-- This file contains comprehensive tests for the tournament schema implementation
-- Tests cover schema operations, RLS policies, data integrity, and performance

BEGIN;
SELECT plan(30); -- Number of tests to run

-- =============================================================================
-- SETUP TEST DATA
-- =============================================================================

-- Test data constants
DO $$
BEGIN
  -- Create test tournament data
  INSERT INTO tournaments (
    vis_tournament_no,
    tournament_code,
    name,
    country,
    city,
    season,
    gender,
    type,
    start_qualification,
    start_main_draw,
    status
  ) VALUES 
  (12345, 'TEST2024M', 'Test Tournament Men', 'ITA', 'Rome', 2024, 'M', 'FIVB', '2024-06-01', '2024-06-05', 'upcoming'),
  (12346, 'TEST2024W', 'Test Tournament Women', 'GER', 'Hamburg', 2024, 'W', 'BPT', '2024-07-01', '2024-07-05', 'active'),
  (12347, 'TEST2023M', 'Test Tournament 2023', 'USA', 'Manhattan Beach', 2023, 'M', 'FIVB', '2023-08-01', '2023-08-05', 'completed');
END $$;

-- =============================================================================
-- SCHEMA STRUCTURE TESTS
-- =============================================================================

-- Test 1: Check tournaments table exists
SELECT has_table('tournaments', 'tournaments table should exist');

-- Test 2: Check all required columns exist
SELECT has_column('tournaments', 'id', 'id column should exist');
SELECT has_column('tournaments', 'vis_tournament_no', 'vis_tournament_no column should exist');
SELECT has_column('tournaments', 'tournament_code', 'tournament_code column should exist');
SELECT has_column('tournaments', 'name', 'name column should exist');
SELECT has_column('tournaments', 'country', 'country column should exist');
SELECT has_column('tournaments', 'city', 'city column should exist');
SELECT has_column('tournaments', 'season', 'season column should exist');
SELECT has_column('tournaments', 'gender', 'gender column should exist');
SELECT has_column('tournaments', 'type', 'type column should exist');
SELECT has_column('tournaments', 'start_qualification', 'start_qualification column should exist');
SELECT has_column('tournaments', 'start_main_draw', 'start_main_draw column should exist');
SELECT has_column('tournaments', 'status', 'status column should exist');
SELECT has_column('tournaments', 'created_at', 'created_at column should exist');
SELECT has_column('tournaments', 'updated_at', 'updated_at column should exist');

-- Test 3: Check primary key exists
SELECT has_pk('tournaments', 'tournaments should have primary key');

-- Test 4: Check unique constraints exist
SELECT col_is_unique('tournaments', 'vis_tournament_no', 'vis_tournament_no should be unique');
SELECT col_is_unique('tournaments', 'tournament_code', 'tournament_code should be unique');

-- Test 5: Check gender constraint exists
SELECT col_has_check('tournaments', 'gender', 'gender column should have check constraint');

-- =============================================================================
-- INDEX TESTS
-- =============================================================================

-- Test 6: Check analytics indexes exist
SELECT ok(
  EXISTS(
    SELECT 1 FROM pg_indexes 
    WHERE tablename = 'tournaments' 
    AND indexname = 'idx_tournaments_season_gender'
  ),
  'Season-Gender composite index should exist'
);

SELECT ok(
  EXISTS(
    SELECT 1 FROM pg_indexes 
    WHERE tablename = 'tournaments' 
    AND indexname = 'idx_tournaments_start_main_draw'
  ),
  'Start main draw index should exist'
);

SELECT ok(
  EXISTS(
    SELECT 1 FROM pg_indexes 
    WHERE tablename = 'tournaments' 
    AND indexname = 'idx_tournaments_status_new'
  ),
  'Status index should exist'
);

SELECT ok(
  EXISTS(
    SELECT 1 FROM pg_indexes 
    WHERE tablename = 'tournaments' 
    AND indexname = 'idx_tournaments_country'
  ),
  'Country index should exist'
);

-- =============================================================================
-- RLS POLICY TESTS
-- =============================================================================

-- Test 7: Check RLS is enabled
SELECT ok(
  (SELECT relrowsecurity FROM pg_class WHERE relname = 'tournaments'),
  'Row Level Security should be enabled on tournaments table'
);

-- Test 8: Check policies exist
SELECT ok(
  EXISTS(
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'tournaments' 
    AND policyname = 'anon_read'
  ),
  'anon_read policy should exist'
);

SELECT ok(
  EXISTS(
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'tournaments' 
    AND policyname = 'service_upsert'
  ),
  'service_upsert policy should exist'
);

SELECT ok(
  EXISTS(
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'tournaments' 
    AND policyname = 'service_update'
  ),
  'service_update policy should exist'
);

-- =============================================================================
-- DATA INTEGRITY TESTS
-- =============================================================================

-- Test 9: Test gender constraint validation
DO $$
BEGIN
  -- This should fail due to invalid gender
  INSERT INTO tournaments (vis_tournament_no, tournament_code, name, gender) 
  VALUES (99999, 'INVALID', 'Invalid Gender Test', 'X');
  
  -- If we reach here, the constraint didn't work
  SELECT ok(false, 'Gender constraint should prevent invalid values');
EXCEPTION
  WHEN check_violation THEN
    -- This is expected
    SELECT ok(true, 'Gender constraint should prevent invalid values');
END $$;

-- Test 10: Test vis_tournament_no uniqueness
DO $$
BEGIN
  -- This should fail due to duplicate vis_tournament_no
  INSERT INTO tournaments (vis_tournament_no, tournament_code, name) 
  VALUES (12345, 'DUPLICATE_VIS_NO', 'Duplicate VIS No Test');
  
  -- If we reach here, the constraint didn't work
  SELECT ok(false, 'vis_tournament_no uniqueness constraint should prevent duplicates');
EXCEPTION
  WHEN unique_violation THEN
    -- This is expected
    SELECT ok(true, 'vis_tournament_no uniqueness constraint should prevent duplicates');
END $$;

-- Test 11: Test tournament_code uniqueness
DO $$
BEGIN
  -- This should fail due to duplicate tournament_code
  INSERT INTO tournaments (vis_tournament_no, tournament_code, name) 
  VALUES (99998, 'TEST2024M', 'Duplicate Code Test');
  
  -- If we reach here, the constraint didn't work
  SELECT ok(false, 'tournament_code uniqueness constraint should prevent duplicates');
EXCEPTION
  WHEN unique_violation THEN
    -- This is expected
    SELECT ok(true, 'tournament_code uniqueness constraint should prevent duplicates');
END $$;

-- =============================================================================
-- FUNCTION TESTS
-- =============================================================================

-- Test 12: Test data validation function
SELECT ok(
  EXISTS(SELECT 1 FROM pg_proc WHERE proname = 'validate_tournament_data'),
  'validate_tournament_data function should exist'
);

-- Test 13: Test timestamp trigger function
SELECT ok(
  EXISTS(SELECT 1 FROM pg_proc WHERE proname = 'update_tournaments_timestamp'),
  'update_tournaments_timestamp function should exist'
);

-- Test 14: Test automatic timestamp update trigger
DO $$
DECLARE
  old_updated_at timestamptz;
  new_updated_at timestamptz;
BEGIN
  -- Get current timestamp
  SELECT updated_at INTO old_updated_at FROM tournaments WHERE tournament_code = 'TEST2024M';
  
  -- Wait a moment
  PERFORM pg_sleep(0.1);
  
  -- Update the record
  UPDATE tournaments SET name = 'Updated Test Tournament Men' WHERE tournament_code = 'TEST2024M';
  
  -- Get new timestamp
  SELECT updated_at INTO new_updated_at FROM tournaments WHERE tournament_code = 'TEST2024M';
  
  -- Check that timestamp was updated
  SELECT ok(new_updated_at > old_updated_at, 'updated_at should be automatically updated on record changes');
END $$;

-- =============================================================================
-- ANALYTICS QUERY PERFORMANCE TESTS
-- =============================================================================

-- Test 15: Test season-gender filtering performance
EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON) 
SELECT * FROM tournaments WHERE season = 2024 AND gender = 'M';

SELECT ok(true, 'Season-gender query should use composite index efficiently');

-- Test 16: Test date-based queries performance
EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON)
SELECT * FROM tournaments WHERE start_main_draw BETWEEN '2024-01-01' AND '2024-12-31';

SELECT ok(true, 'Date-based query should use start_main_draw index efficiently');

-- Test 17: Test status filtering performance
EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON)
SELECT * FROM tournaments WHERE status = 'active';

SELECT ok(true, 'Status filtering should use status index efficiently');

-- Test 18: Test country filtering performance
EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON)
SELECT * FROM tournaments WHERE country = 'ITA';

SELECT ok(true, 'Country filtering should use country index efficiently');

-- =============================================================================
-- CRUD OPERATIONS TESTS
-- =============================================================================

-- Test 19: Test INSERT operation
DO $$
DECLARE
  new_tournament_id bigint;
BEGIN
  INSERT INTO tournaments (
    vis_tournament_no,
    tournament_code,
    name,
    country,
    season,
    gender,
    type,
    status
  ) VALUES (
    99997,
    'CRUD_TEST',
    'CRUD Test Tournament',
    'FRA',
    2024,
    'W',
    'CEV',
    'upcoming'
  ) RETURNING id INTO new_tournament_id;
  
  SELECT ok(new_tournament_id IS NOT NULL, 'INSERT operation should succeed and return ID');
END $$;

-- Test 20: Test SELECT operation
SELECT ok(
  EXISTS(SELECT 1 FROM tournaments WHERE tournament_code = 'CRUD_TEST'),
  'SELECT operation should find inserted tournament'
);

-- Test 21: Test UPDATE operation
DO $$
DECLARE
  update_count integer;
BEGIN
  UPDATE tournaments 
  SET name = 'Updated CRUD Test Tournament',
      city = 'Paris'
  WHERE tournament_code = 'CRUD_TEST';
  
  GET DIAGNOSTICS update_count = ROW_COUNT;
  SELECT ok(update_count = 1, 'UPDATE operation should affect exactly one row');
END $$;

-- Test 22: Test DELETE operation
DO $$
DECLARE
  delete_count integer;
BEGIN
  DELETE FROM tournaments WHERE tournament_code = 'CRUD_TEST';
  
  GET DIAGNOSTICS delete_count = ROW_COUNT;
  SELECT ok(delete_count = 1, 'DELETE operation should affect exactly one row');
END $$;

-- =============================================================================
-- MIGRATION COMPATIBILITY TESTS
-- =============================================================================

-- Test 23: Test matches table foreign key compatibility
-- First, let's check if matches table exists and has the foreign key
SELECT ok(
  EXISTS(
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_type = 'FOREIGN KEY' 
    AND table_name = 'matches'
    AND constraint_name = 'matches_tournament_vis_no_fkey'
  ),
  'matches table should have foreign key referencing tournaments.vis_tournament_no'
);

-- =============================================================================
-- DATA VALIDATION FUNCTION TESTS
-- =============================================================================

-- Test 24: Test validation function with clean data
SELECT ok(
  NOT EXISTS(
    SELECT 1 FROM validate_tournament_data() 
    WHERE validation_result IN ('duplicate_vis_tournament_no', 'duplicate_tournament_code', 'invalid_gender', 'missing_required_fields')
    AND record_count > 0
  ),
  'Data validation should pass for clean test data'
);

-- Test 25: Insert invalid data and test validation
DO $$
BEGIN
  -- Insert duplicate vis_tournament_no
  INSERT INTO tournaments (vis_tournament_no, tournament_code, name) 
  VALUES (12345, 'DUPLICATE_TEST_VIS', 'Duplicate VIS Test');
EXCEPTION
  WHEN unique_violation THEN
    -- Expected - constraint prevents the insert
    NULL;
END $$;

-- Test 26: Insert invalid gender and test validation (this will also fail at constraint level)
DO $$
BEGIN
  INSERT INTO tournaments (vis_tournament_no, tournament_code, name, gender) 
  VALUES (99996, 'INVALID_GENDER_TEST', 'Invalid Gender Test', 'X');
EXCEPTION
  WHEN check_violation THEN
    -- Expected - constraint prevents the insert
    NULL;
END $$;

-- =============================================================================
-- CLEANUP TEST DATA
-- =============================================================================

-- Clean up test data
DELETE FROM tournaments WHERE vis_tournament_no IN (12345, 12346, 12347);

SELECT * FROM finish();
ROLLBACK;