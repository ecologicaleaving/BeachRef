-- Issue #120: every signed-in Google user can read referee statistics.
-- Auth provisions auth.users during OAuth. Legacy app_users/invites are retained
-- for compatibility, but membership and invitation codes no longer gate reads.
BEGIN;

CREATE OR REPLACE FUNCTION public.is_authorized()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY INVOKER
SET search_path = public, pg_temp
STABLE
AS $$
  SELECT auth.uid() IS NOT NULL;
$$;

REVOKE ALL ON FUNCTION public.is_authorized() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_authorized() TO authenticated;
COMMENT ON FUNCTION public.is_authorized() IS
  'Statistics access for every authenticated identity. No invitation or app_users row required. Issue #120.';

DO $$
DECLARE
  t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY['referee_season_stats', 'referee_career_stats',
                           'referee_tournament_stats', 'referee_match_log',
                           'referee_category_stats'] LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', t || '_public_read', t);
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', t || '_authorized_read', t);
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', t || '_authenticated_read', t);
    EXECUTE format(
      'CREATE POLICY %I ON public.%I FOR SELECT TO authenticated '
      'USING ((SELECT auth.uid()) IS NOT NULL)',
      t || '_authenticated_read', t);
    -- Remove inherited/public API grants as well as any accidental write grants.
    -- Worker/service_role permissions are unaffected.
    EXECUTE format('REVOKE ALL ON public.%I FROM PUBLIC, anon, authenticated', t);
    EXECUTE format('GRANT SELECT ON public.%I TO authenticated', t);
  END LOOP;
END $$;

DO $$
DECLARE
  t TEXT;
  privilege TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY['referee_season_stats', 'referee_career_stats',
                           'referee_tournament_stats', 'referee_match_log',
                           'referee_category_stats'] LOOP
    IF has_table_privilege('anon', 'public.' || t, 'SELECT')
       OR NOT has_table_privilege('authenticated', 'public.' || t, 'SELECT') THEN
      RAISE EXCEPTION '037: unexpected SELECT grants on %', t;
    END IF;
    FOREACH privilege IN ARRAY ARRAY['INSERT', 'UPDATE', 'DELETE', 'TRUNCATE'] LOOP
      IF has_table_privilege('authenticated', 'public.' || t, privilege) THEN
        RAISE EXCEPTION '037: authenticated can % on %', privilege, t;
      END IF;
    END LOOP;
  END LOOP;
END $$;

INSERT INTO public.schema_versions (version, description)
SELECT '4.12.0', 'Issue #120: open Google registration; authenticated read-only access to all five referee statistics tables.'
WHERE NOT EXISTS (SELECT 1 FROM public.schema_versions WHERE version = '4.12.0');

COMMIT;
