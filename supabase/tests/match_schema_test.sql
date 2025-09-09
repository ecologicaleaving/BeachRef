-- Match Schema Test Suite
-- This file contains comprehensive tests for the match schema implementation
-- Tests cover events, matches, match_referees tables, RLS policies, and data integrity

BEGIN;
SELECT plan(40); -- Number of tests to run

-- =============================================================================
-- SETUP TEST DATA
-- =============================================================================

-- Create test tournament first (needed for foreign key relationships)
DO $$
BEGIN
  -- Insert test tournament if not exists
  INSERT INTO tournaments (vis_tournament_no, tournament_code, name, country, season, gender, type, status)
  VALUES (99991, 'TEST2024SCHEMA', 'Test Tournament for Schema', 'ITA', 2024, 'M', 'FIVB', 'active')
  ON CONFLICT (vis_tournament_no) DO NOTHING;
END $$;

-- Create test referee (needed for match_referees relationships)
DO $$
BEGIN
  INSERT INTO referees (vis_referee_no, first_name, last_name, gender, federation)
  VALUES (88881, 'Test', 'Referee', 'M', 'ITA')
  ON CONFLICT (vis_referee_no) DO NOTHING;
END $$;

-- Create test events data
DO $$
DECLARE
  tournament_id_var bigint;
BEGIN
  SELECT id INTO tournament_id_var FROM tournaments WHERE vis_tournament_no = 99991;
  
  INSERT INTO events (
    vis_event_no,
    event_code,
    tournament_id,
    gender,
    phase,
    name,
    country,
    start_date,
    end_date,
    status
  ) VALUES 
  (77771, 'TEST_EVENT_M', tournament_id_var, 'M', 'Main Draw', 'Test Event Men', 'ITA', '2024-06-01', '2024-06-03', 'active'),
  (77772, 'TEST_EVENT_W', tournament_id_var, 'W', 'Main Draw', 'Test Event Women', 'ITA', '2024-06-01', '2024-06-03', 'active'),
  (77773, 'TEST_QUAL_M', tournament_id_var, 'M', 'Qualification', 'Test Qualification Men', 'ITA', '2024-05-30', '2024-05-31', 'completed');
END $$;

-- Create test matches data
DO $$
DECLARE
  event_id_var bigint;
BEGIN
  SELECT id INTO event_id_var FROM events WHERE vis_event_no = 77771;
  
  INSERT INTO matches (
    vis_match_no,
    tournament_code,
    event_id,
    round_code,
    round_name,
    round_phase,
    utc_datetime,
    local_datetime,
    court,
    team_a_name,
    team_b_name,
    team_a_fed,
    team_b_fed,
    team_a_players,
    team_b_players,
    sets,
    result,
    status,
    are_court_and_time_published,
    nb_live_score_upload
  ) VALUES 
  (55551, 'TEST2024SCHEMA', event_id_var, 'R1', 'Round 1', 'Main Draw', 
   '2024-06-01 10:00:00+00', '2024-06-01 12:00:00+02', 'Court 1',
   'Team A', 'Team B', 'ITA', 'GER', 
   ARRAY[1001, 1002], ARRAY[2001, 2002],
   '[{"a": 21, "b": 19}, {"a": 18, "b": 21}, {"a": 15, "b": 13}]'::jsonb,
   '{"resultType": "finished", "winnerRank": 1, "loserRank": 2}'::jsonb,
   'completed', true, 5),
  (55552, 'TEST2024SCHEMA', event_id_var, 'R1', 'Round 1', 'Main Draw',
   '2024-06-01 11:00:00+00', '2024-06-01 13:00:00+02', 'Court 2',
   'Team C', 'Team D', 'FRA', 'ESP',
   ARRAY[3001, 3002], ARRAY[4001, 4002],
   '[{"a": 21, "b": 15}, {"a": 21, "b": 17}]'::jsonb,
   '{"resultType": "finished", "winnerRank": 1, "loserRank": 2}'::jsonb,
   'completed', true, 3);
END $$;

-- Create test match_referees data
DO $$
DECLARE
  match_id_var bigint;
  referee_id_var bigint;
BEGIN
  SELECT id INTO match_id_var FROM matches WHERE vis_match_no = 55551;
  SELECT id INTO referee_id_var FROM referees WHERE vis_referee_no = 88881;
  
  INSERT INTO match_referees (match_id, referee_id, role)
  VALUES (match_id_var, referee_id_var, 'FIRST');
END $$;

-- =============================================================================
-- SCHEMA STRUCTURE TESTS - EVENTS TABLE
-- =============================================================================

-- Test 1-5: Events table structure
SELECT has_table('events', 'events table should exist');
SELECT has_column('events', 'id', 'events id column should exist');
SELECT has_column('events', 'vis_event_no', 'events vis_event_no column should exist');
SELECT has_column('events', 'tournament_id', 'events tournament_id column should exist');
SELECT has_column('events', 'gender', 'events gender column should exist');

-- Test 6-8: Events constraints and indexes
SELECT col_has_check('events', 'gender', 'events gender column should have check constraint');
SELECT col_has_default('events', 'created_at', 'events created_at should have default');
SELECT ok(
  EXISTS(
    SELECT 1 FROM pg_indexes 
    WHERE tablename = 'events' 
    AND indexname = 'idx_events_tournament_phase'
  ),
  'Events tournament-phase composite index should exist'
);

-- =============================================================================
-- SCHEMA STRUCTURE TESTS - MATCHES TABLE
-- =============================================================================

-- Test 9-13: Matches table structure
SELECT has_table('matches', 'matches table should exist');
SELECT has_column('matches', 'id', 'matches id column should exist');
SELECT has_column('matches', 'vis_match_no', 'matches vis_match_no column should exist');
SELECT has_column('matches', 'event_id', 'matches event_id column should exist');
SELECT has_column('matches', 'sets', 'matches sets column should exist');

-- Test 14-16: Matches constraints and indexes
SELECT col_is_unique('matches', 'vis_match_no', 'matches vis_match_no should be unique');
SELECT col_has_default('matches', 'sets', 'matches sets should have default');
SELECT ok(
  EXISTS(
    SELECT 1 FROM pg_indexes 
    WHERE tablename = 'matches' 
    AND indexname = 'idx_matches_event_status'
  ),
  'Matches event-status composite index should exist'
);

-- =============================================================================
-- SCHEMA STRUCTURE TESTS - MATCH_REFEREES TABLE
-- =============================================================================

-- Test 17-20: Match_referees table structure
SELECT has_table('match_referees', 'match_referees table should exist');
SELECT has_column('match_referees', 'match_id', 'match_referees match_id column should exist');
SELECT has_column('match_referees', 'referee_id', 'match_referees referee_id column should exist');
SELECT has_column('match_referees', 'role', 'match_referees role column should exist');

-- Test 21: Match_referees constraints
SELECT col_has_check('match_referees', 'role', 'match_referees role column should have check constraint');

-- =============================================================================
-- RLS POLICY TESTS
-- =============================================================================

-- Test 22-24: RLS enabled on all tables
SELECT ok(
  (SELECT relrowsecurity FROM pg_class WHERE relname = 'events'),
  'Row Level Security should be enabled on events table'
);

SELECT ok(
  (SELECT relrowsecurity FROM pg_class WHERE relname = 'matches'),
  'Row Level Security should be enabled on matches table'
);

SELECT ok(
  (SELECT relrowsecurity FROM pg_class WHERE relname = 'match_referees'),
  'Row Level Security should be enabled on match_referees table'
);

-- Test 25-27: Required policies exist
SELECT ok(
  EXISTS(
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'events' 
    AND policyname = 'anon_read'
  ),
  'anon_read policy should exist on events table'
);

SELECT ok(
  EXISTS(
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'matches' 
    AND policyname = 'service_upsert'
  ),
  'service_upsert policy should exist on matches table'
);

SELECT ok(
  EXISTS(
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'match_referees' 
    AND policyname = 'service_update'
  ),
  'service_update policy should exist on match_referees table'
);

-- =============================================================================
-- FOREIGN KEY RELATIONSHIP TESTS
-- =============================================================================

-- Test 28: Events-tournaments relationship
SELECT ok(
  EXISTS(
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_type = 'FOREIGN KEY' 
    AND table_name = 'events'
    AND constraint_name LIKE '%tournament%'
  ),
  'Events table should have foreign key to tournaments'
);

-- Test 29: Matches-events relationship
SELECT ok(
  EXISTS(
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_type = 'FOREIGN KEY' 
    AND table_name = 'matches'
    AND constraint_name LIKE '%event%'
  ),
  'Matches table should have foreign key to events'
);

-- Test 30: Match_referees relationships
SELECT ok(
  EXISTS(
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_type = 'FOREIGN KEY' 
    AND table_name = 'match_referees'
    AND constraint_name LIKE '%match%'
  ),
  'Match_referees table should have foreign key to matches'
);

-- =============================================================================
-- DATA INTEGRITY TESTS
-- =============================================================================

-- Test 31: Gender constraint validation for events
DO $$
BEGIN
  INSERT INTO events (vis_event_no, tournament_id, gender) 
  VALUES (99999, 1, 'X');
  
  SELECT ok(false, 'Events gender constraint should prevent invalid values');
EXCEPTION
  WHEN check_violation THEN
    SELECT ok(true, 'Events gender constraint should prevent invalid values');
END $$;

-- Test 32: Role constraint validation for match_referees
DO $$
DECLARE
  match_id_var bigint;
  referee_id_var bigint;
BEGIN
  SELECT id INTO match_id_var FROM matches WHERE vis_match_no = 55551 LIMIT 1;
  SELECT id INTO referee_id_var FROM referees WHERE vis_referee_no = 88881 LIMIT 1;
  
  INSERT INTO match_referees (match_id, referee_id, role) 
  VALUES (match_id_var, referee_id_var, 'INVALID');
  
  SELECT ok(false, 'Match_referees role constraint should prevent invalid values');
EXCEPTION
  WHEN check_violation THEN
    SELECT ok(true, 'Match_referees role constraint should prevent invalid values');
END $$;

-- Test 33: Unique constraint on events (tournament_id, gender, phase)
DO $$
DECLARE
  tournament_id_var bigint;
BEGIN
  SELECT id INTO tournament_id_var FROM tournaments WHERE vis_tournament_no = 99991;
  
  INSERT INTO events (vis_event_no, tournament_id, gender, phase) 
  VALUES (99998, tournament_id_var, 'M', 'Main Draw');
  
  SELECT ok(false, 'Events unique constraint should prevent duplicate (tournament_id, gender, phase)');
EXCEPTION
  WHEN unique_violation THEN
    SELECT ok(true, 'Events unique constraint should prevent duplicate (tournament_id, gender, phase)');
END $$;

-- =============================================================================
-- FUNCTION TESTS
-- =============================================================================

-- Test 34: Match statistics function
SELECT ok(
  EXISTS(SELECT 1 FROM pg_proc WHERE proname = 'get_match_statistics_by_tournament'),
  'get_match_statistics_by_tournament function should exist'
);

-- Test 35: Referee assignment counts function
SELECT ok(
  EXISTS(SELECT 1 FROM pg_proc WHERE proname = 'get_referee_assignment_counts'),
  'get_referee_assignment_counts function should exist'
);

-- Test 36: Match results aggregation function
SELECT ok(
  EXISTS(SELECT 1 FROM pg_proc WHERE proname = 'get_match_results_aggregation'),
  'get_match_results_aggregation function should exist'
);

-- Test 37: Data validation function
SELECT ok(
  EXISTS(SELECT 1 FROM pg_proc WHERE proname = 'validate_match_schema_data'),
  'validate_match_schema_data function should exist'
);

-- =============================================================================
-- JSONB FUNCTIONALITY TESTS
-- =============================================================================

-- Test 38: JSONB sets data functionality
DO $$
DECLARE
  sets_data jsonb;
  match_record RECORD;
BEGIN
  SELECT sets INTO sets_data FROM matches WHERE vis_match_no = 55551;
  
  -- Test that JSONB data can be queried and processed
  SELECT ok(
    jsonb_array_length(sets_data) = 3,
    'JSONB sets data should contain 3 sets for test match'
  );
END $$;

-- Test 39: JSONB result data functionality
DO $$
DECLARE
  result_data jsonb;
BEGIN
  SELECT result INTO result_data FROM matches WHERE vis_match_no = 55551;
  
  -- Test that JSONB result can be accessed
  SELECT ok(
    result_data->>'resultType' = 'finished',
    'JSONB result data should be accessible and contain expected values'
  );
END $$;

-- =============================================================================
-- AUTOMATIC TIMESTAMP TESTS
-- =============================================================================

-- Test 40: Automatic timestamp update for matches
DO $$
DECLARE
  old_updated_at timestamptz;
  new_updated_at timestamptz;
BEGIN
  -- Get current timestamp
  SELECT updated_at INTO old_updated_at FROM matches WHERE vis_match_no = 55551;
  
  -- Wait a moment
  PERFORM pg_sleep(0.1);
  
  -- Update the record
  UPDATE matches SET status = 'updated' WHERE vis_match_no = 55551;
  
  -- Get new timestamp
  SELECT updated_at INTO new_updated_at FROM matches WHERE vis_match_no = 55551;
  
  -- Check that timestamp was updated
  SELECT ok(new_updated_at > old_updated_at, 'updated_at should be automatically updated on matches record changes');
END $$;

-- =============================================================================
-- CLEANUP TEST DATA
-- =============================================================================

-- Clean up test data
DELETE FROM match_referees WHERE match_id IN (SELECT id FROM matches WHERE tournament_code = 'TEST2024SCHEMA');
DELETE FROM matches WHERE tournament_code = 'TEST2024SCHEMA';
DELETE FROM events WHERE event_code LIKE 'TEST_%';
DELETE FROM referees WHERE vis_referee_no = 88881;
DELETE FROM tournaments WHERE vis_tournament_no = 99991;

SELECT * FROM finish();
ROLLBACK;