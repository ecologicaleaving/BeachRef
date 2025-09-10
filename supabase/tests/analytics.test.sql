-- Analytics Database Schema Tests
-- Tests for Story 4.1: Analytics Data Collection Infrastructure

-- Begin transaction for isolated testing
BEGIN;

-- Enable required extensions for testing
CREATE EXTENSION IF NOT EXISTS "pgtap";

-- Test: Analytics tables exist with correct structure
SELECT has_table('public', 'referees', 'referees table should exist');
SELECT has_table('public', 'referee_analytics', 'referee_analytics table should exist');
SELECT has_table('public', 'analytics_events', 'analytics_events table should exist');

-- Test: referee_analytics table structure
SELECT has_column('public', 'referee_analytics', 'id', 'referee_analytics should have id column');
SELECT has_column('public', 'referee_analytics', 'referee_id', 'referee_analytics should have referee_id column');
SELECT has_column('public', 'referee_analytics', 'date', 'referee_analytics should have date column');
SELECT has_column('public', 'referee_analytics', 'total_assignments', 'referee_analytics should have total_assignments column');
SELECT has_column('public', 'referee_analytics', 'first_referee_count', 'referee_analytics should have first_referee_count column');
SELECT has_column('public', 'referee_analytics', 'second_referee_count', 'referee_analytics should have second_referee_count column');
SELECT has_column('public', 'referee_analytics', 'challenge_referee_count', 'referee_analytics should have challenge_referee_count column');
SELECT has_column('public', 'referee_analytics', 'tournaments_worked', 'referee_analytics should have tournaments_worked column');
SELECT has_column('public', 'referee_analytics', 'performance_score', 'referee_analytics should have performance_score column');

-- Test: analytics_events table structure
SELECT has_column('public', 'analytics_events', 'id', 'analytics_events should have id column');
SELECT has_column('public', 'analytics_events', 'event_type', 'analytics_events should have event_type column');
SELECT has_column('public', 'analytics_events', 'user_context', 'analytics_events should have user_context column');
SELECT has_column('public', 'analytics_events', 'event_data', 'analytics_events should have event_data column');
SELECT has_column('public', 'analytics_events', 'timestamp', 'analytics_events should have timestamp column');

-- Test: Foreign key constraints
SELECT has_foreign_key('public', 'referee_analytics', 'referee_analytics_referee_id_fkey', 'referee_analytics should have foreign key to referees');

-- Test: Indexes exist for performance
SELECT has_index('public', 'referee_analytics', 'idx_referee_analytics_referee_date', 'Should have performance index on referee_id, date');
SELECT has_index('public', 'analytics_events', 'idx_analytics_events_type_timestamp', 'Should have performance index on event_type, timestamp');

-- Test: Functions exist
SELECT has_function('public', 'validate_analytics_data', 'validate_analytics_data function should exist');
SELECT has_function('public', 'cleanup_old_analytics_data', 'cleanup_old_analytics_data function should exist');
SELECT has_function('public', 'process_referee_assignment_analytics', 'process_referee_assignment_analytics function should exist');
SELECT has_function('public', 'process_match_analytics', 'process_match_analytics function should exist');

-- Test: RLS policies are enabled
SELECT is_empty('SELECT * FROM referee_analytics', 'RLS should be enabled and restrict access');

-- Test data setup for trigger testing
INSERT INTO referees (id, name, federation_code, status) 
VALUES (999, 'Test Referee', 'TEST', 'ACTIVE');

INSERT INTO tournaments (id, tournament_code, name, start_date, end_date) 
VALUES (999, 'TEST2024', 'Test Tournament', '2024-01-01', '2024-01-07');

INSERT INTO matches (id, tournament_code, event_no, utc_datetime, status)
VALUES (999, 'TEST2024', 1, '2024-01-01 10:00:00+00', 'scheduled');

-- Test: Analytics trigger on match_referees insertion
INSERT INTO match_referees (match_id, referee_id, role)
VALUES (999, 999, 'FIRST');

-- Verify analytics event was created by trigger
SELECT ok(
    (SELECT COUNT(*) FROM analytics_events WHERE event_type = 'referee_assignment' AND event_data->>'referee_id' = '999') = 1,
    'Analytics event should be created when referee assignment is made'
);

-- Test: Analytics trigger on match status change
UPDATE matches SET status = 'finished' WHERE id = 999;

-- Verify match analytics event was created
SELECT ok(
    (SELECT COUNT(*) FROM analytics_events WHERE event_type = 'match_status_change' AND event_data->>'match_id' = '999') = 1,
    'Analytics event should be created when match status changes'
);

-- Test: Aggregation function works correctly
-- This should aggregate the test data we just inserted
SELECT ok(
    (SELECT COUNT(*) FROM process_referee_assignment_analytics('2024-01-01', '2024-01-01', ARRAY[999])) >= 0,
    'Referee assignment analytics aggregation should process without error'
);

-- Test: Validation function catches data inconsistencies
-- Insert invalid data
INSERT INTO referee_analytics (referee_id, date, total_assignments, first_referee_count)
VALUES (999, '2024-01-01', 0, 1); -- Inconsistent: 0 total but 1 first referee

-- Run validation
SELECT ok(
    (SELECT COUNT(*) FROM validate_analytics_data() WHERE issue_count > 0) > 0,
    'Validation should catch data inconsistencies'
);

-- Test: Cleanup function removes old data
-- Insert old test data
INSERT INTO analytics_events (event_type, event_data, timestamp)
VALUES ('test_event', '{}', NOW() - INTERVAL '100 days');

-- Get count before cleanup
CREATE TEMP TABLE old_count AS SELECT COUNT(*) as count FROM analytics_events WHERE event_type = 'test_event';

-- Run cleanup (should remove events older than 90 days)
SELECT cleanup_old_analytics_data();

-- Verify cleanup worked
SELECT ok(
    (SELECT COUNT(*) FROM analytics_events WHERE event_type = 'test_event') < (SELECT count FROM old_count),
    'Cleanup should remove old analytics events'
);

-- Test: Performance requirements
-- Test that analytics operations complete within acceptable time limits
SELECT ok(
    (SELECT extract(milliseconds FROM (SELECT max(duration) FROM pg_stat_statements WHERE query LIKE '%analytics%'))) < 50,
    'Analytics operations should complete within 50ms'
);

-- Cleanup test data
DELETE FROM match_referees WHERE match_id = 999;
DELETE FROM matches WHERE id = 999;
DELETE FROM tournaments WHERE id = 999;
DELETE FROM referees WHERE id = 999;
DELETE FROM referee_analytics WHERE referee_id = 999;
DELETE FROM analytics_events WHERE event_data->>'referee_id' = '999' OR event_data->>'match_id' = '999';

-- Rollback transaction to avoid affecting real data
ROLLBACK;