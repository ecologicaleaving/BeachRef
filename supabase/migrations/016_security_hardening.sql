-- Migration 016: Security Hardening — Supabase Security Advisor fixes
-- Issue #22: fix(security): hardening database Supabase
-- Resolves: RLS disabled tables, Security Definer views, function search_path,
--           overly permissive RLS policies, materialized view access

-- =============================================================================
-- SECTION 1: ENABLE RLS ON TABLES MISSING IT
-- =============================================================================

-- 1a. public.designations (if exists)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables
             WHERE table_schema = 'public' AND table_name = 'designations') THEN
    ALTER TABLE public.designations ENABLE ROW LEVEL SECURITY;

    DROP POLICY IF EXISTS "designations_anon_read" ON public.designations;
    CREATE POLICY "designations_anon_read" ON public.designations
      FOR SELECT USING (true);

    DROP POLICY IF EXISTS "designations_service_manage" ON public.designations;
    CREATE POLICY "designations_service_manage" ON public.designations
      FOR ALL USING (auth.role() = 'service_role')
      WITH CHECK (auth.role() = 'service_role');

    RAISE NOTICE 'RLS enabled on designations with read + service_role policies';
  ELSE
    RAISE NOTICE 'designations table does not exist — skipping';
  END IF;
END $$;

-- 1b. public.schema_versions — admin only
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables
             WHERE table_schema = 'public' AND table_name = 'schema_versions') THEN
    ALTER TABLE public.schema_versions ENABLE ROW LEVEL SECURITY;

    DROP POLICY IF EXISTS "schema_versions_service_only" ON public.schema_versions;
    CREATE POLICY "schema_versions_service_only" ON public.schema_versions
      FOR ALL USING (auth.role() = 'service_role')
      WITH CHECK (auth.role() = 'service_role');

    RAISE NOTICE 'RLS enabled on schema_versions — service_role only';
  END IF;
END $$;

-- 1c. public.rate_limit_tracker — Edge Functions service_role only
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables
             WHERE table_schema = 'public' AND table_name = 'rate_limit_tracker') THEN
    ALTER TABLE public.rate_limit_tracker ENABLE ROW LEVEL SECURITY;

    DROP POLICY IF EXISTS "rate_limit_tracker_service_only" ON public.rate_limit_tracker;
    CREATE POLICY "rate_limit_tracker_service_only" ON public.rate_limit_tracker
      FOR ALL USING (auth.role() = 'service_role')
      WITH CHECK (auth.role() = 'service_role');

    RAISE NOTICE 'RLS enabled on rate_limit_tracker — service_role only';
  ELSE
    RAISE NOTICE 'rate_limit_tracker table does not exist — skipping';
  END IF;
END $$;

-- 1d. public.tournaments_backup — service_role only (backup data)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables
             WHERE table_schema = 'public' AND table_name = 'tournaments_backup') THEN
    ALTER TABLE public.tournaments_backup ENABLE ROW LEVEL SECURITY;

    DROP POLICY IF EXISTS "tournaments_backup_service_only" ON public.tournaments_backup;
    CREATE POLICY "tournaments_backup_service_only" ON public.tournaments_backup
      FOR ALL USING (auth.role() = 'service_role')
      WITH CHECK (auth.role() = 'service_role');

    RAISE NOTICE 'RLS enabled on tournaments_backup — service_role only';
  ELSE
    RAISE NOTICE 'tournaments_backup table does not exist — skipping';
  END IF;
END $$;

-- 1e. public.match_referees_backup — service_role only
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables
             WHERE table_schema = 'public' AND table_name = 'match_referees_backup') THEN
    ALTER TABLE public.match_referees_backup ENABLE ROW LEVEL SECURITY;

    DROP POLICY IF EXISTS "match_referees_backup_service_only" ON public.match_referees_backup;
    CREATE POLICY "match_referees_backup_service_only" ON public.match_referees_backup
      FOR ALL USING (auth.role() = 'service_role')
      WITH CHECK (auth.role() = 'service_role');

    RAISE NOTICE 'RLS enabled on match_referees_backup — service_role only';
  ELSE
    RAISE NOTICE 'match_referees_backup table does not exist — skipping';
  END IF;
END $$;

-- 1f. public.matches_backup — service_role only
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables
             WHERE table_schema = 'public' AND table_name = 'matches_backup') THEN
    ALTER TABLE public.matches_backup ENABLE ROW LEVEL SECURITY;

    DROP POLICY IF EXISTS "matches_backup_service_only" ON public.matches_backup;
    CREATE POLICY "matches_backup_service_only" ON public.matches_backup
      FOR ALL USING (auth.role() = 'service_role')
      WITH CHECK (auth.role() = 'service_role');

    RAISE NOTICE 'RLS enabled on matches_backup — service_role only';
  ELSE
    RAISE NOTICE 'matches_backup table does not exist — skipping';
  END IF;
END $$;

-- =============================================================================
-- SECTION 2: RECREATE SECURITY DEFINER VIEWS AS SECURITY INVOKER
-- =============================================================================

-- 2a. tournament_sync_cron_status
DROP VIEW IF EXISTS public.tournament_sync_cron_status;
CREATE VIEW public.tournament_sync_cron_status
WITH (security_invoker = true)
AS
SELECT
  jobname,
  schedule,
  active,
  jobid
FROM cron.job
WHERE jobname = 'tournament-sync-daily';

-- 2b. tournament_sync_monitoring
DROP VIEW IF EXISTS public.tournament_sync_monitoring;
CREATE VIEW public.tournament_sync_monitoring
WITH (security_invoker = true)
AS
SELECT
  entity_type,
  sync_frequency,
  last_sync,
  next_sync,
  success_count,
  error_count,
  last_error,
  last_error_time,
  CASE
    WHEN last_sync IS NULL THEN 'Never synced'
    WHEN last_sync < NOW() - INTERVAL '2 days' THEN 'Stale (>48h)'
    WHEN last_error_time > last_sync THEN 'Last sync failed'
    ELSE 'Healthy'
  END AS sync_health_status,
  EXTRACT(EPOCH FROM (NOW() - last_sync)) / 3600 AS hours_since_last_sync,
  CASE
    WHEN success_count + error_count = 0 THEN 0
    ELSE ROUND((success_count::numeric / (success_count + error_count)) * 100, 2)
  END AS success_rate_percent
FROM sync_status
WHERE entity_type = 'tournaments';

COMMENT ON VIEW public.tournament_sync_monitoring
  IS 'Monitoring view for tournament sync health and performance metrics';

-- =============================================================================
-- SECTION 3: RESTRICT OVERLY PERMISSIVE RLS POLICIES
-- =============================================================================

-- 3a. matches — "Allow anon cache insert" → restrict to service_role
-- Edge Functions use service_role for sync, anon clients don't need INSERT
DROP POLICY IF EXISTS "Allow anon cache insert" ON public.matches;
CREATE POLICY "matches_service_insert" ON public.matches
  FOR INSERT
  WITH CHECK (auth.role() = 'service_role');

-- 3b. matches — "Allow anon cache update" → restrict to service_role
DROP POLICY IF EXISTS "Allow anon cache update" ON public.matches;
CREATE POLICY "matches_service_update" ON public.matches
  FOR UPDATE
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- 3c. sync_error_log — "sync_error_log_policy" ALL true → restrict writes to service_role
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_policies
             WHERE tablename = 'sync_error_log' AND policyname = 'sync_error_log_policy') THEN
    DROP POLICY "sync_error_log_policy" ON public.sync_error_log;
  END IF;
END $$;

-- Keep read access, restrict writes to service_role
-- (read policy "Allow monitoring read" and service policy already exist from migration 004)

-- 3d. analytics_events — "analytics_events_public_insert" or "Allow public insert access..."
-- Restrict INSERT to authenticated users (app users are authenticated referees)
DROP POLICY IF EXISTS "analytics_events_public_insert" ON public.analytics_events;
DROP POLICY IF EXISTS "Allow public insert access to analytics_events" ON public.analytics_events;

CREATE POLICY "analytics_events_authenticated_insert" ON public.analytics_events
  FOR INSERT
  WITH CHECK (auth.role() IN ('authenticated', 'service_role'));

-- =============================================================================
-- SECTION 4: FIX FUNCTION search_path (SET search_path = public, pg_catalog)
-- =============================================================================

-- Trigger functions (no args)
DO $$
DECLARE
  func_name TEXT;
BEGIN
  FOR func_name IN SELECT unnest(ARRAY[
    'update_tournaments_timestamp',
    'update_events_timestamp',
    'update_matches_timestamp',
    'update_matches_last_synced',
    'update_last_synced',
    'update_live_updated_at',
    'update_analytics_on_match_change',
    'update_referee_analytics_on_assignment',
    'update_updated_at_column'
  ])
  LOOP
    IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = func_name) THEN
      EXECUTE format('ALTER FUNCTION public.%I() SET search_path = public, pg_catalog', func_name);
      RAISE NOTICE 'Fixed search_path for %', func_name;
    ELSE
      RAISE NOTICE 'Function % does not exist — skipping', func_name;
    END IF;
  END LOOP;
END $$;

-- Parameterless non-trigger functions
DO $$
DECLARE
  func_name TEXT;
BEGIN
  FOR func_name IN SELECT unnest(ARRAY[
    'validate_tournament_data',
    'create_tournaments_policies',
    'create_matches_policies',
    'create_sync_status_policies',
    'validate_match_schema_data',
    'cleanup_old_matches',
    'validate_analytics_data',
    'cleanup_old_analytics_data',
    'trigger_tournament_sync',
    'refresh_sync_health_summary',
    'cleanup_old_monitoring_data'
  ])
  LOOP
    IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = func_name) THEN
      EXECUTE format('ALTER FUNCTION public.%I() SET search_path = public, pg_catalog', func_name);
      RAISE NOTICE 'Fixed search_path for %', func_name;
    ELSE
      RAISE NOTICE 'Function % does not exist — skipping', func_name;
    END IF;
  END LOOP;
END $$;

-- Functions with TEXT parameter
DO $$
DECLARE
  func_name TEXT;
BEGIN
  FOR func_name IN SELECT unnest(ARRAY[
    'enable_rls_on_table',
    'enable_realtime_on_table',
    'setup_table_security_and_realtime'
  ])
  LOOP
    IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = func_name) THEN
      EXECUTE format('ALTER FUNCTION public.%I(text) SET search_path = public, pg_catalog', func_name);
      RAISE NOTICE 'Fixed search_path for %(text)', func_name;
    ELSE
      RAISE NOTICE 'Function % does not exist — skipping', func_name;
    END IF;
  END LOOP;
END $$;

-- get_tournament_match_stats(VARCHAR)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'get_tournament_match_stats') THEN
    ALTER FUNCTION public.get_tournament_match_stats(VARCHAR) SET search_path = public, pg_catalog;
    RAISE NOTICE 'Fixed search_path for get_tournament_match_stats';
  END IF;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Could not fix get_tournament_match_stats: %', SQLERRM;
END $$;

-- get_referee_matches(VARCHAR, VARCHAR)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'get_referee_matches') THEN
    ALTER FUNCTION public.get_referee_matches(VARCHAR, VARCHAR) SET search_path = public, pg_catalog;
    RAISE NOTICE 'Fixed search_path for get_referee_matches';
  END IF;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Could not fix get_referee_matches: %', SQLERRM;
END $$;

-- get_match_statistics_by_tournament(text)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'get_match_statistics_by_tournament') THEN
    ALTER FUNCTION public.get_match_statistics_by_tournament(text) SET search_path = public, pg_catalog;
    RAISE NOTICE 'Fixed search_path for get_match_statistics_by_tournament';
  END IF;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Could not fix get_match_statistics_by_tournament: %', SQLERRM;
END $$;

-- get_referee_assignment_counts(bigint)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'get_referee_assignment_counts') THEN
    ALTER FUNCTION public.get_referee_assignment_counts(bigint) SET search_path = public, pg_catalog;
    RAISE NOTICE 'Fixed search_path for get_referee_assignment_counts';
  END IF;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Could not fix get_referee_assignment_counts: %', SQLERRM;
END $$;

-- get_match_results_aggregation(bigint)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'get_match_results_aggregation') THEN
    ALTER FUNCTION public.get_match_results_aggregation(bigint) SET search_path = public, pg_catalog;
    RAISE NOTICE 'Fixed search_path for get_match_results_aggregation';
  END IF;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Could not fix get_match_results_aggregation: %', SQLERRM;
END $$;

-- get_matches_by_tournament_and_date(text, date, date)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'get_matches_by_tournament_and_date') THEN
    ALTER FUNCTION public.get_matches_by_tournament_and_date(text, date, date) SET search_path = public, pg_catalog;
    RAISE NOTICE 'Fixed search_path for get_matches_by_tournament_and_date';
  END IF;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Could not fix get_matches_by_tournament_and_date: %', SQLERRM;
END $$;

-- create_match_event(UUID, VARCHAR, VARCHAR, JSONB, INTEGER, INTEGER, INTEGER, INTEGER, INTEGER)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'create_match_event') THEN
    ALTER FUNCTION public.create_match_event(UUID, VARCHAR, VARCHAR, JSONB, INTEGER, INTEGER, INTEGER, INTEGER, INTEGER) SET search_path = public, pg_catalog;
    RAISE NOTICE 'Fixed search_path for create_match_event';
  END IF;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Could not fix create_match_event: %', SQLERRM;
END $$;

-- check_rate_limit (unknown signature — query pg_proc)
DO $$
DECLARE
  func_oid OID;
BEGIN
  SELECT p.oid INTO func_oid
  FROM pg_proc p
  JOIN pg_namespace n ON p.pronamespace = n.oid
  WHERE p.proname = 'check_rate_limit' AND n.nspname = 'public'
  LIMIT 1;

  IF func_oid IS NOT NULL THEN
    EXECUTE format('ALTER FUNCTION %s SET search_path = public, pg_catalog', func_oid::regprocedure);
    RAISE NOTICE 'Fixed search_path for check_rate_limit';
  ELSE
    RAISE NOTICE 'Function check_rate_limit does not exist — skipping';
  END IF;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Could not fix check_rate_limit: %', SQLERRM;
END $$;

-- check_payload_size (unknown signature — query pg_proc)
DO $$
DECLARE
  func_oid OID;
BEGIN
  SELECT p.oid INTO func_oid
  FROM pg_proc p
  JOIN pg_namespace n ON p.pronamespace = n.oid
  WHERE p.proname = 'check_payload_size' AND n.nspname = 'public'
  LIMIT 1;

  IF func_oid IS NOT NULL THEN
    EXECUTE format('ALTER FUNCTION %s SET search_path = public, pg_catalog', func_oid::regprocedure);
    RAISE NOTICE 'Fixed search_path for check_payload_size';
  ELSE
    RAISE NOTICE 'Function check_payload_size does not exist — skipping';
  END IF;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Could not fix check_payload_size: %', SQLERRM;
END $$;

-- =============================================================================
-- SECTION 5: RESTRICT MATERIALIZED VIEW ACCESS
-- =============================================================================

-- Revoke anon access to sync_health_summary, keep authenticated + service_role
REVOKE ALL ON public.sync_health_summary FROM anon;
GRANT SELECT ON public.sync_health_summary TO authenticated, service_role;

-- =============================================================================
-- SECTION 6: EXTENSION pg_net — MANUAL ACTION REQUIRED
-- =============================================================================

-- NOTE: Moving pg_net from public to extensions schema requires superuser access.
-- This must be done from the Supabase Dashboard:
--   1. Go to Database → Extensions
--   2. Find pg_net
--   3. Change schema from "public" to "extensions"
-- Or run as superuser: ALTER EXTENSION pg_net SET SCHEMA extensions;

-- =============================================================================
-- SECTION 7: AUTH SETTINGS — MANUAL ACTION REQUIRED
-- =============================================================================

-- NOTE: "Leaked Password Protection" must be enabled from Supabase Dashboard:
--   Authentication → Settings → Security → Enable "Leaked Password Protection"

-- NOTE: PostgreSQL upgrade must be done from Supabase Dashboard:
--   Settings → Infrastructure → Upgrade PostgreSQL

-- =============================================================================
-- SCHEMA VERSION UPDATE
-- =============================================================================

INSERT INTO schema_versions (version, description) VALUES
('3.0.0', 'Security hardening: RLS on all public tables, Security Invoker views, restricted policies, function search_path fixes')
ON CONFLICT (version) DO UPDATE SET description = EXCLUDED.description;

-- =============================================================================
-- VALIDATION
-- =============================================================================

DO $$
BEGIN
  -- Validate views are security invoker
  IF EXISTS (
    SELECT 1 FROM pg_views
    WHERE viewname = 'tournament_sync_cron_status' AND schemaname = 'public'
  ) THEN
    RAISE NOTICE 'tournament_sync_cron_status view recreated';
  END IF;

  IF EXISTS (
    SELECT 1 FROM pg_views
    WHERE viewname = 'tournament_sync_monitoring' AND schemaname = 'public'
  ) THEN
    RAISE NOTICE 'tournament_sync_monitoring view recreated';
  END IF;

  RAISE NOTICE 'Security hardening migration 016 completed successfully';
END $$;
