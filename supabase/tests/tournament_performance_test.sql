-- Tournament Schema Performance Tests
-- This file tests performance requirements for the tournament schema
-- with realistic data volumes and analytics query patterns

BEGIN;
SELECT plan(10); -- Number of performance tests

-- =============================================================================
-- SETUP PERFORMANCE TEST DATA
-- =============================================================================

-- Create larger dataset for performance testing
DO $$
DECLARE
  i integer;
  tournament_data RECORD;
BEGIN
  -- Generate 1000 test tournaments with varied data
  FOR i IN 1..1000 LOOP
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
    ) VALUES (
      100000 + i,
      'PERF' || LPAD(i::text, 4, '0'),
      'Performance Test Tournament ' || i,
      CASE (i % 10)
        WHEN 0 THEN 'ITA'
        WHEN 1 THEN 'GER'
        WHEN 2 THEN 'USA'
        WHEN 3 THEN 'FRA'
        WHEN 4 THEN 'BRA'
        WHEN 5 THEN 'AUS'
        WHEN 6 THEN 'CAN'
        WHEN 7 THEN 'NOR'
        WHEN 8 THEN 'NED'
        ELSE 'ESP'
      END,
      CASE (i % 5)
        WHEN 0 THEN 'Rome'
        WHEN 1 THEN 'Hamburg'
        WHEN 2 THEN 'Manhattan Beach'
        WHEN 3 THEN 'Paris'
        ELSE 'Rio de Janeiro'
      END,
      2020 + (i % 5), -- Seasons from 2020-2024
      CASE (i % 2) WHEN 0 THEN 'M' ELSE 'W' END,
      CASE (i % 4)
        WHEN 0 THEN 'FIVB'
        WHEN 1 THEN 'BPT'
        WHEN 2 THEN 'CEV'
        ELSE 'LOCAL'
      END,
      ('2020-01-01'::date + (i || ' days')::interval)::date,
      ('2020-01-01'::date + (i + 4 || ' days')::interval)::date,
      CASE (i % 4)
        WHEN 0 THEN 'upcoming'
        WHEN 1 THEN 'active'
        WHEN 2 THEN 'completed'
        ELSE 'cancelled'
      END
    );
  END LOOP;
  
  RAISE NOTICE 'Created 1000 performance test tournaments';
END $$;

-- Update statistics for accurate performance testing
ANALYZE tournaments;

-- =============================================================================
-- INDEX PERFORMANCE TESTS
-- =============================================================================

-- Test 1: Season-Gender composite index performance
DO $$
DECLARE
  start_time timestamp;
  end_time timestamp;
  execution_time interval;
  result_count integer;
BEGIN
  start_time := clock_timestamp();
  
  SELECT COUNT(*) INTO result_count
  FROM tournaments 
  WHERE season = 2024 AND gender = 'M';
  
  end_time := clock_timestamp();
  execution_time := end_time - start_time;
  
  -- Query should complete in less than 10ms for this dataset size
  SELECT ok(
    execution_time < interval '10 milliseconds',
    'Season-Gender filtering should complete in less than 10ms (actual: ' || execution_time || ')'
  );
  
  RAISE NOTICE 'Season-Gender query returned % results in %', result_count, execution_time;
END $$;

-- Test 2: Date range query performance
DO $$
DECLARE
  start_time timestamp;
  end_time timestamp;
  execution_time interval;
  result_count integer;
BEGIN
  start_time := clock_timestamp();
  
  SELECT COUNT(*) INTO result_count
  FROM tournaments 
  WHERE start_main_draw BETWEEN '2023-01-01' AND '2023-12-31';
  
  end_time := clock_timestamp();
  execution_time := end_time - start_time;
  
  -- Date range query should complete in less than 10ms
  SELECT ok(
    execution_time < interval '10 milliseconds',
    'Date range filtering should complete in less than 10ms (actual: ' || execution_time || ')'
  );
  
  RAISE NOTICE 'Date range query returned % results in %', result_count, execution_time;
END $$;

-- Test 3: Status filtering performance
DO $$
DECLARE
  start_time timestamp;
  end_time timestamp;
  execution_time interval;
  result_count integer;
BEGIN
  start_time := clock_timestamp();
  
  SELECT COUNT(*) INTO result_count
  FROM tournaments 
  WHERE status = 'active';
  
  end_time := clock_timestamp();
  execution_time := end_time - start_time;
  
  -- Status filtering should complete in less than 5ms
  SELECT ok(
    execution_time < interval '5 milliseconds',
    'Status filtering should complete in less than 5ms (actual: ' || execution_time || ')'
  );
  
  RAISE NOTICE 'Status query returned % results in %', result_count, execution_time;
END $$;

-- Test 4: Country filtering performance
DO $$
DECLARE
  start_time timestamp;
  end_time timestamp;
  execution_time interval;
  result_count integer;
BEGIN
  start_time := clock_timestamp();
  
  SELECT COUNT(*) INTO result_count
  FROM tournaments 
  WHERE country = 'ITA';
  
  end_time := clock_timestamp();
  execution_time := end_time - start_time;
  
  -- Country filtering should complete in less than 5ms
  SELECT ok(
    execution_time < interval '5 milliseconds',
    'Country filtering should complete in less than 5ms (actual: ' || execution_time || ')'
  );
  
  RAISE NOTICE 'Country query returned % results in %', result_count, execution_time;
END $$;

-- =============================================================================
-- COMPLEX ANALYTICS QUERY PERFORMANCE
-- =============================================================================

-- Test 5: Multi-filter analytics query performance
DO $$
DECLARE
  start_time timestamp;
  end_time timestamp;
  execution_time interval;
  result_count integer;
BEGIN
  start_time := clock_timestamp();
  
  SELECT COUNT(*) INTO result_count
  FROM tournaments 
  WHERE season = 2024 
    AND gender = 'M' 
    AND status IN ('active', 'upcoming')
    AND country IN ('ITA', 'GER', 'USA');
  
  end_time := clock_timestamp();
  execution_time := end_time - start_time;
  
  -- Complex analytics query should complete in less than 15ms
  SELECT ok(
    execution_time < interval '15 milliseconds',
    'Complex multi-filter query should complete in less than 15ms (actual: ' || execution_time || ')'
  );
  
  RAISE NOTICE 'Complex analytics query returned % results in %', result_count, execution_time;
END $$;

-- Test 6: Aggregation query performance (dashboard patterns)
DO $$
DECLARE
  start_time timestamp;
  end_time timestamp;
  execution_time interval;
BEGIN
  start_time := clock_timestamp();
  
  PERFORM season, gender, COUNT(*) as tournament_count
  FROM tournaments 
  WHERE start_main_draw >= CURRENT_DATE - interval '1 year'
  GROUP BY season, gender
  ORDER BY season DESC, gender;
  
  end_time := clock_timestamp();
  execution_time := end_time - start_time;
  
  -- Aggregation query should complete in less than 20ms
  SELECT ok(
    execution_time < interval '20 milliseconds',
    'Tournament aggregation query should complete in less than 20ms (actual: ' || execution_time || ')'
  );
  
  RAISE NOTICE 'Aggregation query completed in %', execution_time;
END $$;

-- =============================================================================
-- CONCURRENT ACCESS PERFORMANCE
-- =============================================================================

-- Test 7: Bulk INSERT performance
DO $$
DECLARE
  start_time timestamp;
  end_time timestamp;
  execution_time interval;
  i integer;
BEGIN
  start_time := clock_timestamp();
  
  -- Insert 100 tournaments in a single transaction
  FOR i IN 2001..2100 LOOP
    INSERT INTO tournaments (
      vis_tournament_no,
      tournament_code,
      name,
      season,
      gender,
      status
    ) VALUES (
      200000 + i,
      'BULK' || LPAD(i::text, 4, '0'),
      'Bulk Insert Test ' || i,
      2024,
      CASE (i % 2) WHEN 0 THEN 'M' ELSE 'W' END,
      'upcoming'
    );
  END LOOP;
  
  end_time := clock_timestamp();
  execution_time := end_time - start_time;
  
  -- Bulk insert should complete in less than 100ms
  SELECT ok(
    execution_time < interval '100 milliseconds',
    '100 tournament bulk insert should complete in less than 100ms (actual: ' || execution_time || ')'
  );
  
  RAISE NOTICE 'Bulk insert of 100 tournaments completed in %', execution_time;
END $$;

-- Test 8: Bulk UPDATE performance
DO $$
DECLARE
  start_time timestamp;
  end_time timestamp;
  execution_time interval;
  update_count integer;
BEGIN
  start_time := clock_timestamp();
  
  -- Update all tournaments from 2024
  UPDATE tournaments 
  SET status = 'updated_status'
  WHERE season = 2024;
  
  GET DIAGNOSTICS update_count = ROW_COUNT;
  
  end_time := clock_timestamp();
  execution_time := end_time - start_time;
  
  -- Bulk update should complete in less than 50ms
  SELECT ok(
    execution_time < interval '50 milliseconds',
    'Bulk update should complete in less than 50ms (actual: ' || execution_time || ', rows: ' || update_count || ')'
  );
  
  RAISE NOTICE 'Bulk update of % tournaments completed in %', update_count, execution_time;
END $$;

-- =============================================================================
-- INDEX USAGE VERIFICATION
-- =============================================================================

-- Test 9: Verify index usage for season-gender queries
DO $$
DECLARE
  query_plan jsonb;
  uses_index boolean := false;
BEGIN
  -- Get query execution plan
  EXECUTE 'EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON) SELECT * FROM tournaments WHERE season = 2024 AND gender = ''M'''
  INTO query_plan;
  
  -- Check if the plan uses our composite index
  SELECT query_plan::text LIKE '%idx_tournaments_season_gender%' INTO uses_index;
  
  SELECT ok(
    uses_index,
    'Season-gender query should use idx_tournaments_season_gender index'
  );
END $$;

-- Test 10: Verify query execution plan efficiency
DO $$
DECLARE
  query_plan jsonb;
  total_cost numeric;
BEGIN
  -- Get query execution plan
  EXECUTE 'EXPLAIN (FORMAT JSON) SELECT * FROM tournaments WHERE start_main_draw BETWEEN ''2024-01-01'' AND ''2024-12-31'''
  INTO query_plan;
  
  -- Extract total cost from plan
  SELECT (query_plan->0->'Plan'->'Total Cost')::numeric INTO total_cost;
  
  -- Query cost should be reasonable (less than 100 for this dataset)
  SELECT ok(
    total_cost < 100,
    'Date range query should have reasonable cost (actual: ' || total_cost || ')'
  );
  
  RAISE NOTICE 'Date range query cost: %', total_cost;
END $$;

-- =============================================================================
-- CLEANUP PERFORMANCE TEST DATA
-- =============================================================================

-- Clean up performance test data
DELETE FROM tournaments WHERE vis_tournament_no >= 100000;

-- Update statistics after cleanup
ANALYZE tournaments;

RAISE NOTICE 'Performance test data cleaned up';

SELECT * FROM finish();
ROLLBACK;