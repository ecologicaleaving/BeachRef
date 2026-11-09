-- Issue #120: real-role RLS tests for open registration, without altering #97's historical tests.
\set ON_ERROR_STOP on
\ir fixtures/production_shape.sql
\ir ../migrations/018_restore_match_referees.sql
\ir ../migrations/019_sync_backlog.sql
\ir ../migrations/020_referees_name_is_not_an_identity.sql
\ir ../migrations/022_referee_stats.sql
\ir ../migrations/023_refresh_stats_safeupdate.sql
\ir ../migrations/024_referee_drilldown.sql
\ir ../migrations/025_gender_e_fase.sql
\ir ../migrations/027_tornei_misti.sql
\ir ../migrations/028_accesso_riservato.sql
\ir ../migrations/029_categoria_torneo.sql
\ir ../migrations/030_categorie_mancanti.sql
\ir ../migrations/031_confederazione.sql
\ir ../migrations/032_stats_per_categoria.sql
\ir ../migrations/033_world_tour.sql
\ir ../migrations/034_ricalcolo_non_concorrente.sql
\ir ../migrations/035_importanza_categoria.sql
\ir ../migrations/036_fase_normalizzata.sql

INSERT INTO auth.users (id, email) VALUES
  ('12000000-0000-0000-0000-000000000001', 'new@example.com'),
  ('12000000-0000-0000-0000-000000000002', 'legacy@example.com'),
  ('12000000-0000-0000-0000-000000000003', 'other@example.com');
INSERT INTO public.app_users (id, email) VALUES
  ('12000000-0000-0000-0000-000000000002', 'legacy@example.com'),
  ('12000000-0000-0000-0000-000000000003', 'other@example.com');
INSERT INTO public.invites (code, note, uses) VALUES ('LEGACY120', 'Keep historical data', 0);

-- A sentinel in EVERY read model makes accidental omissions visible.
INSERT INTO public.referee_season_stats (vis_referee_no, season, matches) VALUES ('120-sentinel', 2026, 7);
INSERT INTO public.referee_career_stats (vis_referee_no, matches) VALUES ('120-sentinel', 7);
INSERT INTO public.referee_tournament_stats (vis_referee_no, tournament_no, matches) VALUES ('120-sentinel', '120-tournament', 7);
INSERT INTO public.referee_match_log (vis_referee_no, match_no) VALUES ('120-sentinel', '120-match');
INSERT INTO public.referee_category_stats (vis_referee_no, season, category, matches) VALUES ('120-sentinel', 2026, 'BPT Elite16', 7);

-- Preserve complete rows, including computed timestamps and private legacy data.
CREATE TEMP TABLE before_payload (table_name TEXT, payload JSONB);
DO $$
DECLARE t TEXT; p JSONB;
BEGIN
  FOREACH t IN ARRAY ARRAY['referee_season_stats', 'referee_career_stats',
                           'referee_tournament_stats', 'referee_match_log',
                           'referee_category_stats', 'app_users', 'invites'] LOOP
    EXECUTE format('SELECT jsonb_agg(to_jsonb(r) ORDER BY to_jsonb(r)::text) FROM public.%I r', t) INTO p;
    INSERT INTO before_payload VALUES (t, p);
  END LOOP;
END $$;
CREATE TEMP TABLE private_acl AS
  SELECT c.relname, c.relacl, c.relrowsecurity
  FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE n.nspname = 'public' AND c.relkind = 'r'
    AND c.relname NOT IN ('referee_season_stats', 'referee_career_stats',
                         'referee_tournament_stats', 'referee_match_log', 'referee_category_stats');
CREATE TEMP TABLE private_policies AS
  SELECT * FROM pg_policies WHERE schemaname = 'public'
    AND tablename NOT IN ('referee_season_stats', 'referee_career_stats',
                          'referee_tournament_stats', 'referee_match_log', 'referee_category_stats');

\ir ../migrations/037_open_google_registration.sql
-- Two reapplications must preserve data and policy/grant behavior.
\ir ../migrations/037_open_google_registration.sql
\ir ../migrations/037_open_google_registration.sql

DO $$
DECLARE t TEXT; p JSONB; expected RECORD;
BEGIN
  FOR expected IN SELECT * FROM before_payload LOOP
    t := expected.table_name;
    EXECUTE format('SELECT jsonb_agg(to_jsonb(r) ORDER BY to_jsonb(r)::text) FROM public.%I r', t) INTO p;
    IF p IS DISTINCT FROM expected.payload THEN RAISE EXCEPTION '037 changed data in %', t; END IF;
  END LOOP;
  IF (SELECT count(*) FROM public.schema_versions WHERE version = '4.12.0') <> 1 THEN
    RAISE EXCEPTION '037 schema version is not idempotent';
  END IF;
  IF EXISTS (
    SELECT * FROM private_acl EXCEPT
    SELECT c.relname, c.relacl, c.relrowsecurity
      FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
      WHERE n.nspname = 'public' AND c.relkind = 'r'
  ) THEN RAISE EXCEPTION '037 changed private-table grants or RLS'; END IF;
  IF EXISTS (SELECT * FROM private_policies EXCEPT SELECT * FROM pg_policies)
     OR EXISTS (
       SELECT * FROM pg_policies WHERE schemaname = 'public'
         AND tablename NOT IN ('referee_season_stats', 'referee_career_stats',
                               'referee_tournament_stats', 'referee_match_log', 'referee_category_stats')
       EXCEPT SELECT * FROM private_policies
     ) THEN RAISE EXCEPTION '037 changed private-table policies'; END IF;
  IF EXISTS (SELECT 1 FROM public.app_users WHERE id = '12000000-0000-0000-0000-000000000001') THEN
    RAISE EXCEPTION 'New identity unexpectedly requires legacy app_users provisioning';
  END IF;
  RAISE NOTICE '037 data, idempotence and private-table invariants passed';
END $$;

-- SET ROLE is essential: superusers bypass RLS and would make this test meaningless.
DO $$
DECLARE u TEXT; t TEXT; n INTEGER; authorized BOOLEAN;
BEGIN
  FOREACH u IN ARRAY ARRAY['12000000-0000-0000-0000-000000000001',
                           '12000000-0000-0000-0000-000000000002', ''] LOOP
    PERFORM set_config('test.uid', u, true);
    SET LOCAL ROLE authenticated;
    SELECT public.is_authorized() INTO authorized;
    IF authorized IS DISTINCT FROM (u <> '') THEN RAISE EXCEPTION 'Wrong RPC result for %', u; END IF;
    FOREACH t IN ARRAY ARRAY['referee_season_stats', 'referee_career_stats',
                             'referee_tournament_stats', 'referee_match_log', 'referee_category_stats'] LOOP
      EXECUTE format('SELECT count(*) FROM public.%I WHERE vis_referee_no = %L', t, '120-sentinel') INTO n;
      IF n <> (CASE WHEN u = '' THEN 0 ELSE 1 END) THEN
        RAISE EXCEPTION 'RLS mismatch on % for uid %: % rows', t, u, n;
      END IF;
    END LOOP;
    SELECT count(*) INTO n FROM public.app_users;
    IF n <> (CASE WHEN u = '12000000-0000-0000-0000-000000000002' THEN 1 ELSE 0 END) THEN
      RAISE EXCEPTION 'Private app_users visibility changed for %', u;
    END IF;
    RESET ROLE;
  END LOOP;
  RAISE NOTICE '037 new/legacy/no-UID authenticated roles passed all five read models';
END $$;

DO $$
DECLARE t TEXT; statement TEXT;
BEGIN
  PERFORM set_config('test.uid', '', true);
  FOREACH t IN ARRAY ARRAY['referee_season_stats', 'referee_career_stats',
                           'referee_tournament_stats', 'referee_match_log',
                           'referee_category_stats', 'app_users', 'invites'] LOOP
    BEGIN
      SET LOCAL ROLE anon;
      EXECUTE format('SELECT * FROM public.%I', t);
      RAISE EXCEPTION 'anon read %', t;
    EXCEPTION WHEN insufficient_privilege THEN RESET ROLE;
    END;
  END LOOP;
  BEGIN
    SET LOCAL ROLE anon;
    PERFORM public.is_authorized();
    RAISE EXCEPTION 'anon executed authorization RPC';
  EXCEPTION WHEN insufficient_privilege THEN RESET ROLE;
  END;

  PERFORM set_config('test.uid', '12000000-0000-0000-0000-000000000001', true);
  FOREACH t IN ARRAY ARRAY['referee_season_stats', 'referee_career_stats',
                           'referee_tournament_stats', 'referee_match_log', 'referee_category_stats'] LOOP
    FOREACH statement IN ARRAY ARRAY[
      format('INSERT INTO public.%I SELECT * FROM public.%I LIMIT 1', t, t),
      format('UPDATE public.%I SET vis_referee_no = vis_referee_no', t),
      format('DELETE FROM public.%I', t), format('TRUNCATE public.%I', t)
    ] LOOP
      BEGIN
        SET LOCAL ROLE authenticated;
        EXECUTE statement;
        RAISE EXCEPTION 'authenticated executed forbidden SQL: %', statement;
      EXCEPTION WHEN insufficient_privilege THEN RESET ROLE;
      END;
    END LOOP;
  END LOOP;
  FOREACH statement IN ARRAY ARRAY[
    'SELECT * FROM public.invites',
    'INSERT INTO public.app_users (id) VALUES (''12000000-0000-0000-0000-000000000001'')',
    'UPDATE public.app_users SET email = ''changed@example.com''',
    'DELETE FROM public.app_users',
    'UPDATE public.invites SET uses = uses + 1',
    'SELECT * FROM public.refresh_referee_stats()'
  ] LOOP
    BEGIN
      SET LOCAL ROLE authenticated;
      EXECUTE statement;
      RAISE EXCEPTION 'authenticated executed private/worker SQL: %', statement;
    EXCEPTION WHEN insufficient_privilege THEN RESET ROLE;
    END;
  END LOOP;
  RAISE NOTICE '037 anonymous reads, authenticated writes and private/worker access remain blocked';
END $$;

\echo 'migration 037 / open Google registration: ALL ASSERTIONS PASSED'
