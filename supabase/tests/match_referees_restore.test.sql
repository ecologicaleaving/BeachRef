-- Regression test for migration 018 (issue #89).
--
-- Runs against a throwaway PostgreSQL, never against the project. It rebuilds
-- the production shape (see fixtures/production_shape.sql — the types come
-- from the live project, not from this repository's migrations, because the
-- two have diverged) and then asserts:
--
--   PART A: the junction table exists, against the real types, and its
--           constraints reject the things they are there to reject.
--   PART B: the referee join key is usable — indexed, and unique on the
--           `referees` side while still tolerating the rows that have no VIS
--           number.
--   PART C: the table is closed to the public API roles, and stays empty:
--           018 must NOT guess assignments from referee names.
--   PART D: applying the migration twice changes nothing.
--
-- The adversarial case — what happens when migration 017's default-privilege
-- revocation is NOT in force — lives in match_referees_restore.leak.test.sql,
-- because it asserts that this migration ABORTS, which cannot be observed from
-- inside the same psql run.
--
-- How to run: use the runner, which also covers the leak case.
--
--   bash supabase/tests/run-migration-tests.sh
--
-- It must be run with `-f` (not piped on stdin) because it includes files with
-- `\ir`, which resolves relative to this file.

\set ON_ERROR_STOP on

\ir fixtures/production_shape.sql

-- Migration 017 §2 is a precondition of 018, not part of it: on the real
-- project the default privileges are already revoked when 018 runs. The
-- fixture is a fresh database whose default privileges were never opened, so
-- that precondition holds here without replaying 017 in full.

\ir ../migrations/018_restore_match_referees.sql

-- =============================================================================
-- PART A: the table exists, with the types production actually has
-- =============================================================================

DO $$
DECLARE
  t TEXT;
BEGIN
  IF to_regclass('public.match_referees') IS NULL THEN
    RAISE EXCEPTION 'A1 FAILED: match_referees does not exist';
  END IF;
  RAISE NOTICE 'A1 ok: match_referees exists';

  SELECT data_type INTO t FROM information_schema.columns
   WHERE table_schema='public' AND table_name='match_referees' AND column_name='match_id';
  IF t <> 'uuid' THEN
    RAISE EXCEPTION 'A2 FAILED: match_referees.match_id is %, expected uuid '
                    '(this is exactly what migration 008 got wrong)', t;
  END IF;
  RAISE NOTICE 'A2 ok: match_id is uuid, matching matches.id';

  SELECT data_type INTO t FROM information_schema.columns
   WHERE table_schema='public' AND table_name='match_referees' AND column_name='referee_id';
  IF t <> 'bigint' THEN
    RAISE EXCEPTION 'A3 FAILED: match_referees.referee_id is %, expected bigint', t;
  END IF;
  RAISE NOTICE 'A3 ok: referee_id is bigint, matching referees.id';
END $$;

-- A4: the primary key is (match_id, role) — one referee per role per match.
DO $$
DECLARE
  m UUID;
  r BIGINT;
BEGIN
  SELECT id INTO m FROM public.matches WHERE no = '499650';
  SELECT id INTO r FROM public.referees WHERE vis_referee_no = '155755';

  INSERT INTO public.match_referees (match_id, referee_id, role) VALUES (m, r, 'FIRST');

  BEGIN
    INSERT INTO public.match_referees (match_id, referee_id, role) VALUES (m, r, 'FIRST');
    RAISE EXCEPTION 'A4 FAILED: a second FIRST referee was accepted for the same match';
  EXCEPTION WHEN unique_violation THEN
    RAISE NOTICE 'A4 ok: (match_id, role) is unique';
  END;
END $$;

-- A5: the role CHECK rejects a value no writer can produce.
DO $$
DECLARE
  m UUID;
  r BIGINT;
BEGIN
  SELECT id INTO m FROM public.matches WHERE no = '499651';
  SELECT id INTO r FROM public.referees WHERE vis_referee_no = '155756';
  BEGIN
    INSERT INTO public.match_referees (match_id, referee_id, role) VALUES (m, r, 'CHALLENGE');
    RAISE EXCEPTION 'A5 FAILED: role CHALLENGE was accepted; the VIS response '
                    'has two referee slots and nothing can write a third';
  EXCEPTION WHEN check_violation THEN
    RAISE NOTICE 'A5 ok: role is constrained to FIRST/SECOND';
  END;
END $$;

-- A6: deleting a match takes its assignments with it; deleting a referee that
-- still has assignments is refused (RESTRICT) rather than silently orphaning
-- statistics.
DO $$
DECLARE
  m UUID;
  r BIGINT;
  n INT;
BEGIN
  SELECT id INTO m FROM public.matches WHERE no = '499652';
  SELECT id INTO r FROM public.referees WHERE vis_referee_no = '155756';
  INSERT INTO public.match_referees (match_id, referee_id, role) VALUES (m, r, 'SECOND');

  BEGIN
    DELETE FROM public.referees WHERE id = r;
    RAISE EXCEPTION 'A6 FAILED: a referee with assignments was deleted';
  EXCEPTION WHEN foreign_key_violation THEN
    RAISE NOTICE 'A6 ok: referees are protected by ON DELETE RESTRICT';
  END;

  DELETE FROM public.matches WHERE id = m;
  SELECT count(*) INTO n FROM public.match_referees WHERE match_id = m;
  IF n <> 0 THEN
    RAISE EXCEPTION 'A6 FAILED: % assignment(s) survived their match', n;
  END IF;
  RAISE NOTICE 'A6 ok: assignments cascade with their match';
END $$;

-- =============================================================================
-- PART B: the join key
-- =============================================================================

DO $$
BEGIN
  IF to_regclass('public.idx_matches_no_referee1') IS NULL
     OR to_regclass('public.idx_matches_no_referee2') IS NULL THEN
    RAISE EXCEPTION 'B1 FAILED: matches.no_referee1/2 are not indexed';
  END IF;
  RAISE NOTICE 'B1 ok: the VIS referee numbers are indexed on matches';

  IF to_regclass('public.idx_match_referees_referee_id') IS NULL THEN
    RAISE EXCEPTION 'B2 FAILED: match_referees.referee_id is not indexed — '
                    'every statistics query starts from this side';
  END IF;
  RAISE NOTICE 'B2 ok: the referee side of the junction is indexed';
END $$;

-- B3: a referee number cannot be registered twice (the backfill upserts on it)…
DO $$
BEGIN
  BEGIN
    INSERT INTO public.referees (vis_referee_no, first_name, last_name)
    VALUES ('155754', 'Duplicate', 'Lamprecht');
    RAISE EXCEPTION 'B3 FAILED: a duplicate vis_referee_no was accepted; the '
                    'backfill would create a second identity for one referee';
  EXCEPTION WHEN unique_violation THEN
    RAISE NOTICE 'B3 ok: vis_referee_no is unique';
  END;
END $$;

-- B4: …but the rows that have no VIS number at all are still allowed to
-- coexist. 479 of 480 production rows have one; a plain UNIQUE would have
-- rejected the 480th on the second insert.
DO $$
DECLARE
  n INT;
BEGIN
  INSERT INTO public.referees (vis_referee_no, first_name, last_name)
  VALUES (NULL, 'Unknown', 'Three');
  SELECT count(*) INTO n FROM public.referees WHERE vis_referee_no IS NULL;
  IF n < 3 THEN
    RAISE EXCEPTION 'B4 FAILED: only % NULL vis_referee_no row(s) survived', n;
  END IF;
  RAISE NOTICE 'B4 ok: % referees without a VIS number coexist', n;
END $$;

-- =============================================================================
-- PART C: closed, and empty on purpose
-- =============================================================================

DO $$
DECLARE
  g TEXT;
  rls BOOLEAN;
BEGIN
  SELECT string_agg(DISTINCT grantee || ':' || privilege_type, ', ') INTO g
    FROM information_schema.role_table_grants
   WHERE table_schema='public' AND table_name='match_referees'
     AND grantee IN ('anon','authenticated');
  IF g IS NOT NULL THEN
    RAISE EXCEPTION 'C1 FAILED: the public API roles hold % on match_referees', g;
  END IF;
  RAISE NOTICE 'C1 ok: anon and authenticated hold nothing on match_referees';

  SELECT relrowsecurity INTO rls FROM pg_class
   WHERE oid = 'public.match_referees'::regclass;
  IF NOT rls THEN
    RAISE EXCEPTION 'C2 FAILED: RLS is not enabled on match_referees';
  END IF;
  RAISE NOTICE 'C2 ok: RLS is enabled';

  IF NOT EXISTS (SELECT 1 FROM pg_policies
                  WHERE schemaname='public' AND tablename='match_referees'
                    AND policyname='match_referees_service_all') THEN
    RAISE EXCEPTION 'C3 FAILED: the service_role policy is missing';
  END IF;
  RAISE NOTICE 'C3 ok: service_role has an explicit policy';
END $$;

-- C4: the migration must not have invented assignments from referee names.
-- The fixture has two matches carrying names; if 018 ever "helpfully" matched
-- "Lowry Suzanne" to "Suzanne Lowry", this is where it gets caught. (The rows
-- present at this point are the ones PART A inserted by hand.)
DO $$
DECLARE
  n INT;
BEGIN
  SELECT count(*) INTO n FROM public.match_referees;
  IF n <> 1 THEN
    RAISE EXCEPTION 'C4 FAILED: match_referees holds % row(s), expected the 1 '
                    'inserted by PART A. Migration 018 must not derive '
                    'assignments from referee names — see its header.', n;
  END IF;
  RAISE NOTICE 'C4 ok: no assignment was guessed from a name';
END $$;

-- C5: the leftovers of migration 013 are untouched evidence, not garbage to
-- collect silently.
DO $$
BEGIN
  IF to_regclass('public.match_referees_backup') IS NULL
     OR to_regclass('public.matches_backup') IS NULL THEN
    RAISE EXCEPTION 'C5 FAILED: migration 018 dropped a backup table; that is '
                    'a separate, reviewable decision';
  END IF;
  RAISE NOTICE 'C5 ok: the 013 leftovers are left alone';
END $$;

-- =============================================================================
-- PART D: idempotency
-- =============================================================================

\ir ../migrations/018_restore_match_referees.sql

DO $$
DECLARE
  n INT;
  v INT;
BEGIN
  SELECT count(*) INTO n FROM public.match_referees;
  IF n <> 1 THEN
    RAISE EXCEPTION 'D1 FAILED: re-applying 018 changed the row count to %', n;
  END IF;

  SELECT count(*) INTO v FROM public.schema_versions WHERE version = '4.1.1';
  IF v <> 1 THEN
    RAISE EXCEPTION 'D2 FAILED: schema_versions holds % rows for 4.1.1, '
                    'expected exactly 1 after two applications', v;
  END IF;
  RAISE NOTICE 'D1/D2 ok: applying 018 twice is a no-op';
END $$;

\echo ''
\echo '================================================================'
\echo ' migration 018 (issue #89): ALL ASSERTIONS PASSED'
\echo '================================================================'
