-- Migration 017: deny-all for the public API roles (`anon`, `authenticated`)
-- Issue #77 — with the public anon key, 5 internal tables were readable and
-- `tournaments` accepted anonymous INSERT on the production project.
--
-- =============================================================================
-- WHY DENY-ALL AND NOT "TIGHTER POLICIES"
-- =============================================================================
--
-- Nothing consumes this database through the public API today: the web app has
-- no Supabase variables configured (zero requests to supabase.co in
-- production) and the Flutter app was never distributed. There is therefore no
-- consumer to preserve, and every grant that survived this migration would be
-- a concession nobody could later justify. That is exactly how the database
-- reached the state issue #77 documents: migrations 004/009/011 opened
-- `FOR SELECT USING (true)` on operational tables for a "monitoring dashboard"
-- that never shipped, and migration 016 (issue #22) then hardened the *writes*
-- and explicitly left those reads in place — see the comment at 016 §3c,
-- "Keep read access, restrict writes to service_role".
--
-- So the default becomes: the public API roles reach nothing. Re-opening a
-- table is a deliberate, motivated, reviewable act — see the recipe at the
-- bottom of this file.
--
-- =============================================================================
-- THE THREE GATES
-- =============================================================================
--
-- A request carrying the anon key has to pass all three. This migration closes
-- all three, so that no single accidental `GRANT` re-opens the database:
--
--   1. a table/column privilege for the role -> revoked (section 1)
--   2. row level security enabled            -> yes, on every table (section 3)
--   3. a permissive policy for that verb     -> every inherited policy dropped
--                                               (section 3); only an explicit
--                                               service_role policy remains
--                                               (section 4)
--
-- Gate 1 alone already produces a loud, explicit `42501 permission denied for
-- table …` instead of a silent empty result — which matters, because a silent
-- empty result is precisely what made this hole survive a security issue that
-- claimed to have closed it (see `supabase/RLS.md`).
--
-- What this migration deliberately does NOT do: revoke `USAGE ON SCHEMA public
-- FROM PUBLIC`. On a managed platform that grant is also what internal roles
-- (`authenticator`, `supabase_storage_admin`, extension owners, the dashboard)
-- rely on, and revoking it from PUBLIC is a foot-gun with no added protection —
-- schema usage grants nothing on its own once gate 1 is closed.
--
-- `service_role` is unaffected: it holds BYPASSRLS on Supabase, and section 4
-- additionally gives it an explicit FOR ALL policy on every table so the intent
-- survives even if that attribute ever changes. `service_role` is a
-- server-side-only key; it must never reach a client bundle.
--
-- Applying this is safe to repeat: every statement is idempotent.

BEGIN;

-- =============================================================================
-- SECTION 1: REVOKE EVERY PRIVILEGE HELD BY THE PUBLIC API ROLES
-- =============================================================================

DO $$
DECLARE
  target_role TEXT;
BEGIN
  FOREACH target_role IN ARRAY ARRAY['anon', 'authenticated'] LOOP
    IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = target_role) THEN
      RAISE NOTICE 'role % does not exist — skipping', target_role;
      CONTINUE;
    END IF;

    -- Covers tables, views and column-level grants on both.
    EXECUTE format('REVOKE ALL ON ALL TABLES IN SCHEMA public FROM %I', target_role);
    EXECUTE format('REVOKE ALL ON ALL SEQUENCES IN SCHEMA public FROM %I', target_role);
    EXECUTE format('REVOKE ALL ON ALL ROUTINES IN SCHEMA public FROM %I', target_role);
    -- Any explicit schema grant. The PUBLIC grant is left alone on purpose,
    -- see the header.
    EXECUTE format('REVOKE ALL ON SCHEMA public FROM %I', target_role);

    RAISE NOTICE 'revoked all object privileges in schema public from %', target_role;
  END LOOP;
END $$;

-- Materialised views are not covered by `ALL TABLES IN SCHEMA`.
DO $$
DECLARE
  mv RECORD;
BEGIN
  FOR mv IN SELECT schemaname, matviewname FROM pg_matviews WHERE schemaname = 'public' LOOP
    EXECUTE format('REVOKE ALL ON %I.%I FROM anon, authenticated', mv.schemaname, mv.matviewname);
    RAISE NOTICE 'revoked all on materialised view %', mv.matviewname;
  END LOOP;
END $$;

-- =============================================================================
-- SECTION 2: FUTURE OBJECTS INHERIT THE DENIAL
-- =============================================================================
--
-- Without this, the next `CREATE TABLE` re-opens a hole: Supabase ships
-- `ALTER DEFAULT PRIVILEGES … GRANT ALL ON TABLES TO anon, authenticated` for
-- the roles that create objects, so a brand new table arrives readable and
-- writable by the public key before anyone has thought about it.

DO $$
DECLARE
  creator TEXT;
BEGIN
  FOREACH creator IN ARRAY ARRAY['postgres', 'supabase_admin', 'service_role'] LOOP
    IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = creator) THEN
      CONTINUE;
    END IF;
    EXECUTE format(
      'ALTER DEFAULT PRIVILEGES FOR ROLE %I IN SCHEMA public REVOKE ALL ON TABLES FROM anon, authenticated',
      creator);
    EXECUTE format(
      'ALTER DEFAULT PRIVILEGES FOR ROLE %I IN SCHEMA public REVOKE ALL ON SEQUENCES FROM anon, authenticated',
      creator);
    EXECUTE format(
      'ALTER DEFAULT PRIVILEGES FOR ROLE %I IN SCHEMA public REVOKE ALL ON ROUTINES FROM anon, authenticated',
      creator);
    RAISE NOTICE 'default privileges for role % now exclude anon/authenticated', creator;
  END LOOP;
END $$;

-- =============================================================================
-- SECTION 3: ROW LEVEL SECURITY ON EVERY TABLE, NO INHERITED POLICY LEFT
-- =============================================================================
--
-- RLS enabled with zero applicable policies denies every row to every role
-- without BYPASSRLS. Dropping the inherited policies matters even though
-- section 1 already revoked the grants: a future `GRANT SELECT … TO anon`
-- would otherwise silently reactivate `USING (true)` policies written for a
-- dashboard that never existed.

DO $$
DECLARE
  t RECORD;
  pol RECORD;
  dropped INT := 0;
  secured INT := 0;
BEGIN
  FOR t IN
    SELECT c.relname
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public' AND c.relkind IN ('r', 'p')
    ORDER BY c.relname
  LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t.relname);
    secured := secured + 1;

    FOR pol IN
      SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = t.relname
    LOOP
      EXECUTE format('DROP POLICY %I ON public.%I', pol.policyname, t.relname);
      dropped := dropped + 1;
    END LOOP;
  END LOOP;

  RAISE NOTICE 'RLS enabled on % public table(s); % inherited policies dropped', secured, dropped;
END $$;

-- =============================================================================
-- SECTION 4: ONE EXPLICIT POLICY PER TABLE, FOR service_role ONLY
-- =============================================================================
--
-- Redundant while `service_role` keeps BYPASSRLS, and deliberately so: the sync
-- Edge Functions must keep working, and "it works because of a role attribute
-- nobody wrote down" is the kind of implicit dependency this issue exists to
-- remove.

DO $$
DECLARE
  t RECORD;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'service_role') THEN
    RAISE NOTICE 'role service_role does not exist — skipping service policies';
    RETURN;
  END IF;

  FOR t IN
    SELECT c.relname
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public' AND c.relkind IN ('r', 'p')
    ORDER BY c.relname
  LOOP
    EXECUTE format(
      'CREATE POLICY %I ON public.%I FOR ALL TO service_role USING (true) WITH CHECK (true)',
      left(t.relname, 40) || '_service_role_all', t.relname);
  END LOOP;

  RAISE NOTICE 'service_role policy created on every public table';
END $$;

-- =============================================================================
-- SECTION 5: FAIL LOUDLY IF ANYTHING SURVIVED
-- =============================================================================
--
-- Issue #77 exists because migration 016 declared a result that nobody
-- measured. This block makes the migration itself refuse to commit unless the
-- state it claims is the state the database is actually in.

DO $$
DECLARE
  leftover_table_privs INT;
  leftover_column_privs INT;
  tables_without_rls INT;
  open_policies INT;
BEGIN
  SELECT count(*) INTO leftover_table_privs
  FROM pg_class c
  JOIN pg_namespace n ON n.oid = c.relnamespace
  CROSS JOIN LATERAL aclexplode(COALESCE(c.relacl, acldefault('r', c.relowner))) a
  JOIN pg_roles g ON g.oid = a.grantee
  WHERE n.nspname = 'public'
    AND c.relkind IN ('r', 'p', 'v', 'm', 'f')
    AND g.rolname IN ('anon', 'authenticated');

  SELECT count(*) INTO leftover_column_privs
  FROM pg_attribute att
  JOIN pg_class c ON c.oid = att.attrelid
  JOIN pg_namespace n ON n.oid = c.relnamespace
  CROSS JOIN LATERAL aclexplode(att.attacl) a
  JOIN pg_roles g ON g.oid = a.grantee
  WHERE n.nspname = 'public'
    AND att.attacl IS NOT NULL
    AND g.rolname IN ('anon', 'authenticated');

  SELECT count(*) INTO tables_without_rls
  FROM pg_class c
  JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE n.nspname = 'public' AND c.relkind IN ('r', 'p') AND c.relrowsecurity = false;

  SELECT count(*) INTO open_policies
  FROM pg_policies
  WHERE schemaname = 'public'
    AND (roles = '{public}' OR 'anon' = ANY(roles) OR 'authenticated' = ANY(roles));

  IF leftover_table_privs > 0 THEN
    RAISE EXCEPTION 'deny-all incomplete: % table/view grant(s) still held by anon/authenticated',
      leftover_table_privs;
  END IF;
  IF leftover_column_privs > 0 THEN
    RAISE EXCEPTION 'deny-all incomplete: % column grant(s) still held by anon/authenticated',
      leftover_column_privs;
  END IF;
  IF tables_without_rls > 0 THEN
    RAISE EXCEPTION 'deny-all incomplete: % public table(s) still have RLS disabled', tables_without_rls;
  END IF;
  IF open_policies > 0 THEN
    RAISE EXCEPTION 'deny-all incomplete: % policy/policies still apply to anon/authenticated/public',
      open_policies;
  END IF;

  RAISE NOTICE 'verified: anon and authenticated reach nothing in schema public';
END $$;

-- =============================================================================
-- SCHEMA VERSION
-- =============================================================================

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables
             WHERE table_schema = 'public' AND table_name = 'schema_versions') THEN
    INSERT INTO schema_versions (version, description) VALUES
      ('4.0.0', 'Issue #77: deny-all for anon/authenticated — object grants and every inherited policy removed, RLS enabled on every table')
    ON CONFLICT (version) DO UPDATE SET description = EXCLUDED.description;
  END IF;
END $$;

COMMIT;

-- =============================================================================
-- HOW TO RE-OPEN A TABLE LATER (issue #54 phase 3)
-- =============================================================================
--
-- Do not edit this migration. Write a new one, naming the consumer and the
-- reason, and re-open exactly the columns that consumer needs — never `*`:
--
--   -- 1. column-level grant. `referees` holds personal data: list the columns,
--   --    never grant the whole table.
--   GRANT SELECT (id, vis_no, name, country) ON public.referees TO anon;
--
--   -- 2. a policy for that verb only, never FOR ALL
--   CREATE POLICY "referees_anon_read" ON public.referees
--     FOR SELECT TO anon USING (true);
--
-- Then record the new expectation in `scripts/verify-rls-anon.ts` and run
-- `npm run verify:rls`, so the recurring check knows the opening is intentional
-- and still fails on anything unintended.
