-- Match Schema Performance Tests
-- This file tests performance requirements for the match schema
-- with realistic data volumes and complex join operations under 200ms target

BEGIN;
SELECT plan(12); -- Number of performance tests

-- =============================================================================
-- SETUP PERFORMANCE TEST DATA
-- =============================================================================

-- Create test tournament
DO $$
BEGIN
  INSERT INTO tournaments (vis_tournament_no, tournament_code, name, country, season, gender, type, status)
  VALUES (99992, 'PERF2024', 'Performance Test Tournament', 'ITA', 2024, 'M', 'FIVB', 'active')
  ON CONFLICT (vis_tournament_no) DO NOTHING;
END $$;

-- Create test referees
DO $$
DECLARE
  i integer;
BEGIN
  FOR i IN 1..20 LOOP
    INSERT INTO referees (vis_referee_no, first_name, last_name, gender, federation)
    VALUES (88900 + i, 'Perf' || i, 'Referee', 
            CASE (i % 2) WHEN 0 THEN 'M' ELSE 'F' END, 
            CASE (i % 4) WHEN 0 THEN 'ITA' WHEN 1 THEN 'GER' WHEN 2 THEN 'FRA' ELSE 'ESP' END)
    ON CONFLICT (vis_referee_no) DO NOTHING;
  END LOOP;
END $$;

-- Create larger dataset for performance testing
DO $$
DECLARE
  i integer;
  j integer;
  tournament_id_var bigint;
  event_id_var bigint;
  match_id_var bigint;
  referee_id_var bigint;
BEGIN
  SELECT id INTO tournament_id_var FROM tournaments WHERE vis_tournament_no = 99992;
  
  -- Generate 50 events (25 men's, 25 women's)
  FOR i IN 1..50 LOOP
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
    ) VALUES (
      77800 + i,
      'PERF_EVENT_' || LPAD(i::text, 3, '0'),
      tournament_id_var,
      CASE (i % 2) WHEN 0 THEN 'M' ELSE 'W' END,
      CASE (i % 3) WHEN 0 THEN 'Qualification' WHEN 1 THEN 'Main Draw' ELSE 'Finals' END,
      'Performance Event ' || i,
      CASE (i % 5) WHEN 0 THEN 'ITA' WHEN 1 THEN 'GER' WHEN 2 THEN 'FRA' WHEN 3 THEN 'ESP' ELSE 'BRA' END,
      CURRENT_DATE - (i % 30),
      CURRENT_DATE + (i % 30),
      CASE (i % 4) WHEN 0 THEN 'upcoming' WHEN 1 THEN 'active' WHEN 2 THEN 'completed' ELSE 'cancelled' END
    );
  END LOOP;
  
  -- Generate 2000 matches (40 per event)
  FOR i IN 1..50 LOOP
    SELECT id INTO event_id_var FROM events WHERE vis_event_no = 77800 + i;
    
    FOR j IN 1..40 LOOP
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
      ) VALUES (
        50000 + (i * 100) + j,
        'PERF2024',
        event_id_var,
        'R' || (j % 5 + 1),
        'Round ' || (j % 5 + 1),
        CASE (i % 3) WHEN 0 THEN 'Qualification' WHEN 1 THEN 'Main Draw' ELSE 'Finals' END,
        CURRENT_TIMESTAMP + ((j - 20) || ' hours')::interval,
        CURRENT_TIMESTAMP + ((j - 18) || ' hours')::interval,
        'Court ' || ((j % 6) + 1),
        'Team ' || (j * 2 - 1) || 'A',
        'Team ' || (j * 2) || 'B',
        CASE (j % 4) WHEN 0 THEN 'ITA' WHEN 1 THEN 'GER' WHEN 2 THEN 'FRA' ELSE 'ESP' END,
        CASE ((j + 1) % 4) WHEN 0 THEN 'ITA' WHEN 1 THEN 'GER' WHEN 2 THEN 'FRA' ELSE 'ESP' END,
        ARRAY[j * 10 + 1, j * 10 + 2],
        ARRAY[j * 10 + 3, j * 10 + 4],
        CASE 
          WHEN j % 3 = 0 THEN '[{"a": 21, "b": 15}, {"a": 21, "b": 17}]'::jsonb
          WHEN j % 3 = 1 THEN '[{"a": 18, "b": 21}, {"a": 21, "b": 19}, {"a": 15, "b": 13}]'::jsonb
          ELSE '[{"a": 21, "b": 12}, {"a": 21, "b": 18}]'::jsonb
        END,
        '{"resultType": "finished", "winnerRank": 1, "loserRank": 2}'::jsonb,
        CASE (j % 4) WHEN 0 THEN 'upcoming' WHEN 1 THEN 'active' WHEN 2 THEN 'completed' ELSE 'cancelled' END,
        true,
        j % 10
      );
    END LOOP;
  END LOOP;
  
  -- Generate referee assignments (3000 total assignments)
  FOR i IN 1..1000 LOOP
    SELECT id INTO match_id_var FROM matches WHERE vis_match_no = 50000 + i ORDER BY id LIMIT 1;
    SELECT id INTO referee_id_var FROM referees WHERE vis_referee_no = 88901 + (i % 20) ORDER BY id LIMIT 1;
    
    -- Assign first referee
    INSERT INTO match_referees (match_id, referee_id, role)
    VALUES (match_id_var, referee_id_var, 'FIRST')
    ON CONFLICT DO NOTHING;
    
    -- Assign second referee (for some matches)
    IF i % 2 = 0 THEN
      SELECT id INTO referee_id_var FROM referees WHERE vis_referee_no = 88901 + ((i + 1) % 20) ORDER BY id LIMIT 1;
      INSERT INTO match_referees (match_id, referee_id, role)
      VALUES (match_id_var, referee_id_var, 'SECOND')
      ON CONFLICT DO NOTHING;
    END IF;
    
    -- Assign challenge referee (for some matches)
    IF i % 3 = 0 THEN
      SELECT id INTO referee_id_var FROM referees WHERE vis_referee_no = 88901 + ((i + 2) % 20) ORDER BY id LIMIT 1;
      INSERT INTO match_referees (match_id, referee_id, role)
      VALUES (match_id_var, referee_id_var, 'CHALLENGE')
      ON CONFLICT DO NOTHING;
    END IF;
  END LOOP;
  
  RAISE NOTICE 'Created performance test dataset: 50 events, 2000 matches, ~3000 referee assignments';
END $$;

-- Update statistics for accurate performance testing
ANALYZE events;
ANALYZE matches;
ANALYZE match_referees;

-- =============================================================================
-- BASIC QUERY PERFORMANCE TESTS
-- =============================================================================

-- Test 1: Event filtering by tournament performance
DO $$
DECLARE
  start_time timestamp;
  end_time timestamp;
  execution_time interval;
  result_count integer;
BEGIN
  start_time := clock_timestamp();
  
  SELECT COUNT(*) INTO result_count
  FROM events 
  WHERE tournament_id = (SELECT id FROM tournaments WHERE vis_tournament_no = 99992);
  
  end_time := clock_timestamp();
  execution_time := end_time - start_time;
  
  -- Query should complete in less than 10ms
  SELECT ok(
    execution_time < interval '10 milliseconds',
    'Event filtering by tournament should complete in less than 10ms (actual: ' || execution_time || ')'
  );
  
  RAISE NOTICE 'Event filtering returned % results in %', result_count, execution_time;
END $$;

-- Test 2: Match filtering by tournament_code performance
DO $$
DECLARE
  start_time timestamp;
  end_time timestamp;
  execution_time interval;
  result_count integer;
BEGIN
  start_time := clock_timestamp();
  
  SELECT COUNT(*) INTO result_count
  FROM matches 
  WHERE tournament_code = 'PERF2024';
  
  end_time := clock_timestamp();
  execution_time := end_time - start_time;
  
  -- Query should complete in less than 20ms
  SELECT ok(
    execution_time < interval '20 milliseconds',
    'Match filtering by tournament_code should complete in less than 20ms (actual: ' || execution_time || ')'
  );
  
  RAISE NOTICE 'Match filtering returned % results in %', result_count, execution_time;
END $$;

-- Test 3: Match filtering by status performance
DO $$
DECLARE
  start_time timestamp;
  end_time timestamp;
  execution_time interval;
  result_count integer;
BEGIN
  start_time := clock_timestamp();
  
  SELECT COUNT(*) INTO result_count
  FROM matches 
  WHERE status = 'active';
  
  end_time := clock_timestamp();
  execution_time := end_time - start_time;
  
  -- Query should complete in less than 15ms
  SELECT ok(
    execution_time < interval '15 milliseconds',
    'Match status filtering should complete in less than 15ms (actual: ' || execution_time || ')'
  );
  
  RAISE NOTICE 'Match status filtering returned % results in %', result_count, execution_time;
END $$;

-- =============================================================================
-- COMPLEX JOIN PERFORMANCE TESTS (200ms TARGET)
-- =============================================================================

-- Test 4: Complex match-event-tournament join performance
DO $$
DECLARE
  start_time timestamp;
  end_time timestamp;
  execution_time interval;
  result_count integer;
BEGIN
  start_time := clock_timestamp();
  
  SELECT COUNT(*) INTO result_count
  FROM matches m
  JOIN events e ON m.event_id = e.id
  JOIN tournaments t ON e.tournament_id = t.id
  WHERE t.vis_tournament_no = 99992
    AND m.status = 'completed'
    AND e.gender = 'M';
  
  end_time := clock_timestamp();
  execution_time := end_time - start_time;
  
  -- Complex join should complete under 200ms target
  SELECT ok(
    execution_time < interval '200 milliseconds',
    'Complex match-event-tournament join should complete under 200ms (actual: ' || execution_time || ')'
  );
  
  RAISE NOTICE 'Complex join query returned % results in %', result_count, execution_time;
END $$;

-- Test 5: Match-referee assignment join performance
DO $$
DECLARE
  start_time timestamp;
  end_time timestamp;
  execution_time interval;
  result_count integer;
BEGIN
  start_time := clock_timestamp();
  
  SELECT COUNT(*) INTO result_count
  FROM matches m
  JOIN match_referees mr ON m.id = mr.match_id
  JOIN referees r ON mr.referee_id = r.id
  WHERE m.tournament_code = 'PERF2024'
    AND mr.role = 'FIRST'
    AND r.federation = 'ITA';
  
  end_time := clock_timestamp();
  execution_time := end_time - start_time;
  
  -- Match-referee join should complete under 200ms target
  SELECT ok(
    execution_time < interval '200 milliseconds',
    'Match-referee assignment join should complete under 200ms (actual: ' || execution_time || ')'
  );
  
  RAISE NOTICE 'Match-referee join returned % results in %', result_count, execution_time;
END $$;

-- Test 6: Full match details with all relationships
DO $$
DECLARE
  start_time timestamp;
  end_time timestamp;
  execution_time interval;
  result_count integer;
BEGIN
  start_time := clock_timestamp();
  
  SELECT COUNT(*) INTO result_count
  FROM matches m
  JOIN events e ON m.event_id = e.id
  JOIN tournaments t ON e.tournament_id = t.id
  LEFT JOIN match_referees mr ON m.id = mr.match_id
  LEFT JOIN referees r ON mr.referee_id = r.id
  WHERE m.tournament_code = 'PERF2024'
    AND DATE(m.utc_datetime) BETWEEN CURRENT_DATE - interval '10 days' AND CURRENT_DATE + interval '10 days';
  
  end_time := clock_timestamp();
  execution_time := end_time - start_time;
  
  -- Full details query should complete under 200ms target
  SELECT ok(
    execution_time < interval '200 milliseconds',
    'Full match details query should complete under 200ms (actual: ' || execution_time || ')'
  );
  
  RAISE NOTICE 'Full match details query returned % results in %', result_count, execution_time;
END $$;

-- =============================================================================
-- DATABASE FUNCTION PERFORMANCE TESTS
-- =============================================================================

-- Test 7: Match statistics function performance
DO $$
DECLARE
  start_time timestamp;
  end_time timestamp;
  execution_time interval;
BEGIN
  start_time := clock_timestamp();
  
  PERFORM get_match_statistics_by_tournament('PERF2024');
  
  end_time := clock_timestamp();
  execution_time := end_time - start_time;
  
  -- Function should complete under 100ms
  SELECT ok(
    execution_time < interval '100 milliseconds',
    'Match statistics function should complete under 100ms (actual: ' || execution_time || ')'
  );
  
  RAISE NOTICE 'Match statistics function completed in %', execution_time;
END $$;

-- Test 8: Referee assignment counts function performance
DO $$
DECLARE
  start_time timestamp;
  end_time timestamp;
  execution_time interval;
  referee_id_var bigint;
BEGIN
  SELECT id INTO referee_id_var FROM referees WHERE vis_referee_no = 88901 LIMIT 1;
  
  start_time := clock_timestamp();
  
  PERFORM get_referee_assignment_counts(referee_id_var);
  
  end_time := clock_timestamp();
  execution_time := end_time - start_time;
  
  -- Function should complete under 50ms
  SELECT ok(
    execution_time < interval '50 milliseconds',
    'Referee assignment counts function should complete under 50ms (actual: ' || execution_time || ')'
  );
  
  RAISE NOTICE 'Referee assignment function completed in %', execution_time;
END $$;

-- Test 9: Match results aggregation function performance
DO $$
DECLARE
  start_time timestamp;
  end_time timestamp;
  execution_time interval;
  event_id_var bigint;
BEGIN
  SELECT id INTO event_id_var FROM events WHERE vis_event_no = 77801 LIMIT 1;
  
  start_time := clock_timestamp();
  
  PERFORM get_match_results_aggregation(event_id_var);
  
  end_time := clock_timestamp();
  execution_time := end_time - start_time;
  
  -- Function should complete under 50ms
  SELECT ok(
    execution_time < interval '50 milliseconds',
    'Match results aggregation function should complete under 50ms (actual: ' || execution_time || ')'
  );
  
  RAISE NOTICE 'Match results aggregation completed in %', execution_time;
END $$;

-- =============================================================================
-- JSONB QUERY PERFORMANCE TESTS
-- =============================================================================

-- Test 10: JSONB sets data query performance
DO $$
DECLARE
  start_time timestamp;
  end_time timestamp;
  execution_time interval;
  result_count integer;
BEGIN
  start_time := clock_timestamp();
  
  SELECT COUNT(*) INTO result_count
  FROM matches 
  WHERE tournament_code = 'PERF2024'
    AND jsonb_array_length(sets) = 2;  -- Straight set matches
  
  end_time := clock_timestamp();
  execution_time := end_time - start_time;
  
  -- JSONB query should complete under 100ms
  SELECT ok(
    execution_time < interval '100 milliseconds',
    'JSONB sets query should complete under 100ms (actual: ' || execution_time || ')'
  );
  
  RAISE NOTICE 'JSONB sets query returned % results in %', result_count, execution_time;
END $$;

-- Test 11: JSONB result data query performance
DO $$
DECLARE
  start_time timestamp;
  end_time timestamp;
  execution_time interval;
  result_count integer;
BEGIN
  start_time := clock_timestamp();
  
  SELECT COUNT(*) INTO result_count
  FROM matches 
  WHERE tournament_code = 'PERF2024'
    AND result->>'resultType' = 'finished';
  
  end_time := clock_timestamp();
  execution_time := end_time - start_time;
  
  -- JSONB result query should complete under 100ms
  SELECT ok(
    execution_time < interval '100 milliseconds',
    'JSONB result query should complete under 100ms (actual: ' || execution_time || ')'
  );
  
  RAISE NOTICE 'JSONB result query returned % results in %', result_count, execution_time;
END $$;

-- =============================================================================
-- AGGREGATION PERFORMANCE TEST
-- =============================================================================

-- Test 12: Complex aggregation query performance
DO $$
DECLARE
  start_time timestamp;
  end_time timestamp;
  execution_time interval;
BEGIN
  start_time := clock_timestamp();
  
  PERFORM 
    e.gender, 
    e.phase,
    COUNT(m.id) as total_matches,
    COUNT(CASE WHEN m.status = 'completed' THEN 1 END) as completed_matches,
    AVG(jsonb_array_length(m.sets)) as avg_sets,
    COUNT(DISTINCT mr.referee_id) as unique_referees
  FROM events e
  JOIN matches m ON e.id = m.event_id
  LEFT JOIN match_referees mr ON m.id = mr.match_id
  WHERE m.tournament_code = 'PERF2024'
  GROUP BY e.gender, e.phase
  ORDER BY e.gender, e.phase;
  
  end_time := clock_timestamp();
  execution_time := end_time - start_time;
  
  -- Complex aggregation should complete under 200ms
  SELECT ok(
    execution_time < interval '200 milliseconds',
    'Complex aggregation query should complete under 200ms (actual: ' || execution_time || ')'
  );
  
  RAISE NOTICE 'Complex aggregation completed in %', execution_time;
END $$;

-- =============================================================================
-- CLEANUP PERFORMANCE TEST DATA
-- =============================================================================

-- Clean up performance test data
DELETE FROM match_referees WHERE match_id IN (
  SELECT id FROM matches WHERE tournament_code = 'PERF2024'
);
DELETE FROM matches WHERE tournament_code = 'PERF2024';
DELETE FROM events WHERE event_code LIKE 'PERF_EVENT_%';
DELETE FROM referees WHERE vis_referee_no BETWEEN 88901 AND 88920;
DELETE FROM tournaments WHERE vis_tournament_no = 99992;

-- Update statistics after cleanup
ANALYZE events;
ANALYZE matches;
ANALYZE match_referees;

RAISE NOTICE 'Performance test data cleaned up';

SELECT * FROM finish();
ROLLBACK;