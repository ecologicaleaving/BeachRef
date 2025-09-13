-- Migration 004: Sync Monitoring and Health Tracking Schema (FIXED VERSION)
-- Story 2.3: Comprehensive monitoring tables and extensions
-- Created: 2025-01-08
-- Fixed: Added column existence checks before foreign key constraints

-- =============================================================================
-- SCHEMA VALIDATION BEFORE PROCEEDING
-- =============================================================================

-- Check if required tables and columns exist before creating foreign keys
DO $$
BEGIN
  -- Verify tournaments table exists with 'no' column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'tournaments' AND column_name = 'no'
  ) THEN
    RAISE EXCEPTION 'tournaments table or column "no" does not exist. Run migration 002 first.';
  END IF;
  
  -- Verify sync_status table exists
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_name = 'sync_status'
  ) THEN
    RAISE EXCEPTION 'sync_status table does not exist. Run migration 002 first.';
  END IF;
  
  RAISE NOTICE 'Schema validation passed. Proceeding with migration 004.';
END $$;

-- =============================================================================
-- EXTEND EXISTING SYNC_STATUS TABLE
-- =============================================================================

-- Extend existing sync_status table with monitoring columns
ALTER TABLE sync_status ADD COLUMN IF NOT EXISTS average_duration INTERVAL;
ALTER TABLE sync_status ADD COLUMN IF NOT EXISTS last_duration INTERVAL;
ALTER TABLE sync_status ADD COLUMN IF NOT EXISTS records_processed_last INTEGER;
ALTER TABLE sync_status ADD COLUMN IF NOT EXISTS records_processed_total BIGINT DEFAULT 0;
ALTER TABLE sync_status ADD COLUMN IF NOT EXISTS last_memory_usage INTEGER;
ALTER TABLE sync_status ADD COLUMN IF NOT EXISTS alert_threshold_failures INTEGER DEFAULT 3;
ALTER TABLE sync_status ADD COLUMN IF NOT EXISTS notification_channels JSONB;

-- Update sync_status records to have default alert thresholds
UPDATE sync_status 
SET alert_threshold_failures = 3, notification_channels = '["dashboard"]'::jsonb 
WHERE alert_threshold_failures IS NULL;

-- =============================================================================
-- CREATE MONITORING TABLES
-- =============================================================================

-- Sync execution history table for detailed tracking
CREATE TABLE IF NOT EXISTS sync_execution_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type VARCHAR NOT NULL,
  execution_start TIMESTAMP NOT NULL,
  execution_end TIMESTAMP,
  duration INTERVAL,
  success BOOLEAN,
  records_processed INTEGER,
  memory_usage_mb INTEGER,
  error_details JSONB,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Add foreign key constraint with existence check
DO $$
BEGIN
  -- Only add foreign key if sync_status table exists and constraint doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'fk_sync_execution_entity'
  ) THEN
    ALTER TABLE sync_execution_history
    ADD CONSTRAINT fk_sync_execution_entity 
    FOREIGN KEY (entity_type) REFERENCES sync_status(entity_type);
  END IF;
END $$;

-- Per-tournament sync tracking for detailed analysis
CREATE TABLE IF NOT EXISTS sync_tournament_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sync_execution_id UUID,
  tournament_no VARCHAR NOT NULL,
  entity_type VARCHAR NOT NULL,
  success BOOLEAN NOT NULL,
  records_processed INTEGER,
  processing_duration INTERVAL,
  error_message TEXT,
  error_type VARCHAR,
  retry_attempt INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Add foreign key constraints with existence checks
DO $$
BEGIN
  -- Foreign key to sync_execution_history
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'fk_sync_tournament_execution'
  ) THEN
    ALTER TABLE sync_tournament_results
    ADD CONSTRAINT fk_sync_tournament_execution 
    FOREIGN KEY (sync_execution_id) REFERENCES sync_execution_history(id);
  END IF;
  
  -- Foreign key to tournaments table (with existence check)
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'tournaments' AND column_name = 'no'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'fk_sync_tournament_tournament'
  ) THEN
    ALTER TABLE sync_tournament_results
    ADD CONSTRAINT fk_sync_tournament_tournament 
    FOREIGN KEY (tournament_no) REFERENCES tournaments(no) ON DELETE CASCADE;
  END IF;
END $$;

-- Sync error classification and logging
CREATE TABLE IF NOT EXISTS sync_error_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type VARCHAR NOT NULL,
  tournament_no VARCHAR,
  error_type VARCHAR NOT NULL, -- 'NETWORK', 'AUTH', 'API', 'DATABASE', 'TIMEOUT', 'VALIDATION'
  error_severity VARCHAR NOT NULL, -- 'LOW', 'MEDIUM', 'HIGH', 'CRITICAL'
  error_message TEXT NOT NULL,
  error_context JSONB, -- Stack trace, request details, etc.
  recovery_suggestion TEXT,
  occurred_at TIMESTAMP DEFAULT NOW(),
  resolved_at TIMESTAMP,
  resolution_notes TEXT
);

-- Add foreign key constraint with existence check
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'tournaments' AND column_name = 'no'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'fk_sync_error_tournament'
  ) THEN
    ALTER TABLE sync_error_log
    ADD CONSTRAINT fk_sync_error_tournament
    FOREIGN KEY (tournament_no) REFERENCES tournaments(no) ON DELETE SET NULL;
  END IF;
END $$;

-- Alert rules configuration table
CREATE TABLE IF NOT EXISTS alert_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR NOT NULL UNIQUE,
  description TEXT,
  entity_type VARCHAR NOT NULL, -- 'tournaments', 'matches_schedule', 'all'
  metric VARCHAR NOT NULL, -- 'success_rate', 'consecutive_failures', 'duration_exceeded', 'memory_usage'
  threshold NUMERIC NOT NULL,
  evaluation_window INTERVAL NOT NULL,
  severity VARCHAR NOT NULL DEFAULT 'MEDIUM', -- 'LOW', 'MEDIUM', 'HIGH', 'CRITICAL'
  notification_channels JSONB DEFAULT '["dashboard"]'::jsonb, -- ['email', 'webhook', 'dashboard']
  escalation_delay INTERVAL DEFAULT '30 minutes',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Manual sync audit logging
CREATE TABLE IF NOT EXISTS manual_sync_audit (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sync_job_id UUID NOT NULL,
  entity_type VARCHAR NOT NULL,
  tournament_no VARCHAR,
  priority VARCHAR NOT NULL, -- 'NORMAL', 'HIGH', 'EMERGENCY'
  triggered_by VARCHAR NOT NULL,
  trigger_reason TEXT NOT NULL,
  trigger_timestamp TIMESTAMP DEFAULT NOW(),
  completion_timestamp TIMESTAMP,
  final_status VARCHAR,
  records_processed INTEGER,
  error_details JSONB
);

-- Add foreign key constraint with existence check
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'tournaments' AND column_name = 'no'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'fk_manual_sync_tournament'
  ) THEN
    ALTER TABLE manual_sync_audit
    ADD CONSTRAINT fk_manual_sync_tournament
    FOREIGN KEY (tournament_no) REFERENCES tournaments(no) ON DELETE SET NULL;
  END IF;
END $$;

-- =============================================================================
-- PERFORMANCE INDEXES
-- =============================================================================

-- Performance indexes for monitoring queries
CREATE INDEX IF NOT EXISTS idx_sync_execution_history_entity_time 
ON sync_execution_history(entity_type, execution_start);

CREATE INDEX IF NOT EXISTS idx_sync_execution_history_success_time
ON sync_execution_history(success, execution_start);

CREATE INDEX IF NOT EXISTS idx_sync_tournament_results_tournament_time
ON sync_tournament_results(tournament_no, created_at);

CREATE INDEX IF NOT EXISTS idx_sync_tournament_results_success_time
ON sync_tournament_results(success, created_at);

CREATE INDEX IF NOT EXISTS idx_sync_error_log_type_severity_time
ON sync_error_log(error_type, error_severity, occurred_at);

CREATE INDEX IF NOT EXISTS idx_sync_error_log_entity_time
ON sync_error_log(entity_type, occurred_at);

CREATE INDEX IF NOT EXISTS idx_alert_rules_entity_active
ON alert_rules(entity_type, is_active);

CREATE INDEX IF NOT EXISTS idx_manual_sync_audit_entity_time
ON manual_sync_audit(entity_type, trigger_timestamp);

-- =============================================================================
-- MATERIALIZED VIEW
-- =============================================================================

-- Drop existing materialized view if it exists
DROP MATERIALIZED VIEW IF EXISTS sync_health_summary;

-- Materialized view for dashboard performance
CREATE MATERIALIZED VIEW sync_health_summary AS
SELECT 
  entity_type,
  COUNT(*) as total_executions,
  COUNT(*) FILTER (WHERE success = true) as successful_executions,
  ROUND(COUNT(*) FILTER (WHERE success = true) * 100.0 / COUNT(*), 2) as success_rate_percentage,
  AVG(EXTRACT(EPOCH FROM duration)) as avg_duration_seconds,
  MAX(execution_start) as last_execution,
  SUM(records_processed) as total_records_processed
FROM sync_execution_history 
WHERE execution_start > NOW() - INTERVAL '24 hours'
GROUP BY entity_type;

-- Index on materialized view
CREATE UNIQUE INDEX IF NOT EXISTS idx_sync_health_summary_entity 
ON sync_health_summary(entity_type);

-- =============================================================================
-- ROW LEVEL SECURITY
-- =============================================================================

-- Enable RLS on all new tables
ALTER TABLE sync_execution_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE sync_tournament_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE sync_error_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE alert_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE manual_sync_audit ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist and recreate
DO $$
BEGIN
  -- sync_execution_history policies
  DROP POLICY IF EXISTS "Allow monitoring read" ON sync_execution_history;
  CREATE POLICY "Allow monitoring read" ON sync_execution_history FOR SELECT USING (true);
  
  DROP POLICY IF EXISTS "Allow service monitoring access" ON sync_execution_history;
  CREATE POLICY "Allow service monitoring access" ON sync_execution_history FOR ALL USING (auth.role() = 'service_role');
  
  -- sync_tournament_results policies  
  DROP POLICY IF EXISTS "Allow monitoring read" ON sync_tournament_results;
  CREATE POLICY "Allow monitoring read" ON sync_tournament_results FOR SELECT USING (true);
  
  DROP POLICY IF EXISTS "Allow service tournament results access" ON sync_tournament_results;
  CREATE POLICY "Allow service tournament results access" ON sync_tournament_results FOR ALL USING (auth.role() = 'service_role');
  
  -- sync_error_log policies
  DROP POLICY IF EXISTS "Allow monitoring read" ON sync_error_log;
  CREATE POLICY "Allow monitoring read" ON sync_error_log FOR SELECT USING (true);
  
  DROP POLICY IF EXISTS "Allow service error log access" ON sync_error_log;  
  CREATE POLICY "Allow service error log access" ON sync_error_log FOR ALL USING (auth.role() = 'service_role');
  
  -- alert_rules policies
  DROP POLICY IF EXISTS "Allow alert rules read" ON alert_rules;
  CREATE POLICY "Allow alert rules read" ON alert_rules FOR SELECT USING (true);
  
  DROP POLICY IF EXISTS "Allow service alert rules access" ON alert_rules;
  CREATE POLICY "Allow service alert rules access" ON alert_rules FOR ALL USING (auth.role() = 'service_role');
  
  -- manual_sync_audit policies
  DROP POLICY IF EXISTS "Allow manual sync audit read" ON manual_sync_audit;
  CREATE POLICY "Allow manual sync audit read" ON manual_sync_audit FOR SELECT USING (true);
  
  DROP POLICY IF EXISTS "Allow service manual sync access" ON manual_sync_audit;
  CREATE POLICY "Allow service manual sync access" ON manual_sync_audit FOR ALL USING (auth.role() = 'service_role');
END $$;

-- =============================================================================
-- REAL-TIME SUBSCRIPTIONS
-- =============================================================================

-- Enable real-time subscriptions for monitoring tables
DO $$
BEGIN
  -- Add to real-time publication if it exists
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE sync_execution_history;
    ALTER PUBLICATION supabase_realtime ADD TABLE sync_tournament_results;
    ALTER PUBLICATION supabase_realtime ADD TABLE sync_error_log;
  END IF;
EXCEPTION
  WHEN duplicate_object THEN
    -- Tables already in publication, continue
    NULL;
END $$;

-- =============================================================================
-- DEFAULT DATA
-- =============================================================================

-- Insert default alert rules (only if they don't exist)
INSERT INTO alert_rules (name, description, entity_type, metric, threshold, evaluation_window, severity, notification_channels) 
SELECT * FROM (VALUES
  ('Tournament Sync Consecutive Failures', 'Alert when tournament sync fails 3 times in a row', 'tournaments', 'consecutive_failures', 3, '1 hour'::interval, 'HIGH', '["dashboard", "webhook"]'::jsonb),
  ('Match Schedule Consecutive Failures', 'Alert when match schedule sync fails 3 times in a row', 'matches_schedule', 'consecutive_failures', 3, '45 minutes'::interval, 'HIGH', '["dashboard", "webhook"]'::jsonb),
  ('Overall Sync Success Rate Drop', 'Alert when overall sync success rate drops below 95%', 'all', 'success_rate', 0.95, '24 hours'::interval, 'MEDIUM', '["dashboard"]'::jsonb),
  ('Tournament Sync Duration Exceeded', 'Alert when tournament sync takes longer than 5 minutes', 'tournaments', 'duration_exceeded', 300, '15 minutes'::interval, 'MEDIUM', '["dashboard"]'::jsonb),
  ('Match Schedule Duration Exceeded', 'Alert when match schedule sync takes longer than 10 minutes', 'matches_schedule', 'duration_exceeded', 600, '15 minutes'::interval, 'MEDIUM', '["dashboard"]'::jsonb),
  ('Memory Usage Exceeded', 'Alert when sync job memory usage exceeds 512MB', 'all', 'memory_usage', 512, '15 minutes'::interval, 'HIGH', '["dashboard", "webhook"]'::jsonb)
) AS v(name, description, entity_type, metric, threshold, evaluation_window, severity, notification_channels)
WHERE NOT EXISTS (SELECT 1 FROM alert_rules WHERE alert_rules.name = v.name);

-- =============================================================================
-- FUNCTIONS AND CRON JOBS
-- =============================================================================

-- Function to refresh materialized view
CREATE OR REPLACE FUNCTION refresh_sync_health_summary()
RETURNS void AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY sync_health_summary;
EXCEPTION
  WHEN OTHERS THEN
    -- If concurrent refresh fails, try regular refresh
    REFRESH MATERIALIZED VIEW sync_health_summary;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to clean up old monitoring data
CREATE OR REPLACE FUNCTION cleanup_old_monitoring_data()
RETURNS void AS $$
BEGIN
  -- Keep sync execution history for 30 days
  DELETE FROM sync_execution_history 
  WHERE execution_start < NOW() - INTERVAL '30 days';
  
  -- Keep tournament results for 30 days  
  DELETE FROM sync_tournament_results
  WHERE created_at < NOW() - INTERVAL '30 days';
  
  -- Keep error logs for 90 days
  DELETE FROM sync_error_log
  WHERE occurred_at < NOW() - INTERVAL '90 days' AND resolved_at IS NOT NULL;
  
  -- Keep manual sync audit for 90 days
  DELETE FROM manual_sync_audit
  WHERE trigger_timestamp < NOW() - INTERVAL '90 days';
  
  -- Log cleanup completion
  INSERT INTO sync_error_log (entity_type, error_type, error_severity, error_message, recovery_suggestion)
  VALUES ('monitoring', 'INFO', 'LOW', 'Monitoring data cleanup completed', 'No action required');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Schedule cron jobs (only if pg_cron extension is available)
DO $$
BEGIN
  -- Schedule materialized view refresh every 5 minutes
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    -- Remove existing jobs first
    PERFORM cron.unschedule('refresh-sync-health-summary');
    PERFORM cron.unschedule('cleanup-monitoring-data');
    
    -- Add new scheduled jobs
    PERFORM cron.schedule(
      'refresh-sync-health-summary',
      '*/5 * * * *', -- Every 5 minutes
      'SELECT refresh_sync_health_summary();'
    );
    
    -- Schedule cleanup to run weekly
    PERFORM cron.schedule(
      'cleanup-monitoring-data',
      '0 2 * * 0', -- Weekly on Sunday at 2 AM
      'SELECT cleanup_old_monitoring_data();'
    );
  END IF;
EXCEPTION
  WHEN OTHERS THEN
    -- pg_cron not available or other error, skip scheduling
    NULL;
END $$;

-- =============================================================================
-- GRANT PERMISSIONS
-- =============================================================================

-- Grant necessary permissions
GRANT SELECT ON sync_execution_history TO anon, authenticated;
GRANT SELECT ON sync_tournament_results TO anon, authenticated;
GRANT SELECT ON sync_error_log TO anon, authenticated;
GRANT SELECT ON alert_rules TO anon, authenticated;
GRANT SELECT ON manual_sync_audit TO anon, authenticated;
GRANT SELECT ON sync_health_summary TO anon, authenticated;

-- Grant function permissions
GRANT EXECUTE ON FUNCTION refresh_sync_health_summary() TO service_role;
GRANT EXECUTE ON FUNCTION cleanup_old_monitoring_data() TO service_role;

-- =============================================================================
-- COMPLETION MARKER
-- =============================================================================

-- Complete migration marker
INSERT INTO sync_error_log (entity_type, error_type, error_severity, error_message, recovery_suggestion)
VALUES ('monitoring', 'INFO', 'LOW', 'Migration 004 completed: Sync monitoring schema deployed', 'Monitoring system ready for use');

-- Validation query
DO $$
BEGIN
  RAISE NOTICE 'Migration 004 completed successfully!';
  RAISE NOTICE 'Created tables: sync_execution_history, sync_tournament_results, sync_error_log, alert_rules, manual_sync_audit';
  RAISE NOTICE 'Created materialized view: sync_health_summary';
  RAISE NOTICE 'Monitoring system is ready for use.';
END $$;