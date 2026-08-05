-- Adversarial companion to match_referees_restore.test.sql (issue #89).
--
-- The happy-path test runs on a database whose default privileges were never
-- opened, so it proves migration 018 keeps `match_referees` closed on a
-- correctly-hardened project. That is the easy half.
--
-- This file asserts the half that actually protects us: on a project where
-- migration 017 §2 did NOT take effect — which 017's own header admits is
-- possible, because on hosted Supabase `ALTER DEFAULT PRIVILEGES FOR ROLE
-- <other>` can fail with 42501 and be skipped — a brand new table arrives
-- readable and writable by the public anon key.
--
-- So: open the default privileges the way stock Supabase ships them, run 018,
-- and require that the table is closed ANYWAY. If the explicit REVOKE in 018
-- section 3 is ever removed as redundant, this test goes red.
--
--   bash supabase/tests/run-migration-tests.sh

\set ON_ERROR_STOP on

\ir fixtures/production_shape.sql

-- Stock Supabase, before migration 017 ever ran.
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO anon, authenticated;

-- Sanity: the hole is real in this fixture, otherwise the test proves nothing.
DO $$
BEGIN
  CREATE TABLE public.canary_before (x INT);
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.role_table_grants
     WHERE table_schema='public' AND table_name='canary_before' AND grantee='anon'
  ) THEN
    RAISE EXCEPTION 'L0 FAILED: the fixture did not reproduce the open default '
                    'privileges, so the rest of this file would pass vacuously';
  END IF;
  RAISE NOTICE 'L0 ok: a new table in this fixture does arrive open to anon';
  DROP TABLE public.canary_before;
END $$;

\ir ../migrations/018_restore_match_referees.sql

DO $$
DECLARE
  g TEXT;
BEGIN
  SELECT string_agg(DISTINCT grantee || ':' || privilege_type, ', ') INTO g
    FROM information_schema.role_table_grants
   WHERE table_schema='public' AND table_name='match_referees'
     AND grantee IN ('anon','authenticated');

  IF g IS NOT NULL THEN
    RAISE EXCEPTION
      'L1 FAILED: on a project without 017 section 2, match_referees arrived '
      'reachable by the public API roles (%). Migration 018 must close it '
      'itself and not rely on the default privileges.', g;
  END IF;
  RAISE NOTICE 'L1 ok: match_referees is closed even with open default privileges';
END $$;

-- L2: and the operator is told, because the *next* table created on that
-- project is still going to arrive open.
DO $$
DECLARE
  open_defaults INT;
BEGIN
  SELECT count(*) INTO open_defaults
    FROM pg_default_acl d
   WHERE d.defaclnamespace = 'public'::regnamespace
     AND d.defaclobjtype = 'r'
     AND EXISTS (SELECT 1 FROM aclexplode(d.defaclacl) a
                  WHERE pg_get_userbyid(a.grantee) IN ('anon','authenticated'));

  IF open_defaults = 0 THEN
    RAISE EXCEPTION 'L2 FAILED: the fixture lost its open default privileges, '
                    'so the warning path in 018 section 3 was never exercised';
  END IF;
  RAISE NOTICE 'L2 ok: % open default ACL(s) remain, and 018 warned about them '
               '(see the WARNING above)', open_defaults;
END $$;

\echo ''
\echo '================================================================'
\echo ' migration 018 leak case (issue #89): ALL ASSERTIONS PASSED'
\echo '================================================================'
