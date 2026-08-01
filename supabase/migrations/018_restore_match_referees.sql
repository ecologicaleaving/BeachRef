-- Migration 018: restore `match_referees`, and make the referee join key usable
-- Issue #89 — the table the referee statistics are built on does not exist on
-- production, and the column that would let us rebuild it has never been
-- written.
--
-- =============================================================================
-- WHAT WAS ACTUALLY BROKEN, AND WHEN
-- =============================================================================
--
-- Measured on the production project with the service_role key before writing
-- this migration:
--
--   tournaments             236 rows
--   matches               9,570 rows, but from only 19 distinct tournaments
--                                (local_date spans 2011-06-13 .. 2026-03-15)
--   referees                480 rows (479 with vis_referee_no)
--   match_referees          HTTP 404 — the table is not there
--   match_referees_backup   0 rows — it is there, and it is empty
--
--   matches.no_referee1 populated:    0 / 9,570
--   matches.referee1_name populated:  2,843 / 9,570
--
-- The date is in `schema_versions`: version 2.3.0, applied 2026-02-08,
-- "Aligned matches table with simplified schema for referee stats and dual
-- read service". That is migration 013, and line 27 of it reads:
--
--     DROP TABLE IF EXISTS match_referees CASCADE;
--
-- 013 rebuilt `matches` with a `uuid` primary key (it had been an integer
-- identity) and had to drop the dependent junction table to do it. It never
-- recreated it. Nothing failed loudly, because nothing reads it: the app has
-- always taken its referee statistics from the VIS.
--
-- The repository made this hard to notice, because `match_referees` is
-- declared TWICE, in two mutually incompatible shapes, and neither matches the
-- production schema that 013 left behind:
--
--   006.5_match_referees_table.sql   match_id TEXT     referee_id INTEGER
--                                    role VARCHAR(20), free-form
--   008_create_match_schema.sql      match_id BIGINT REFERENCES matches(id)
--                                    referee_id BIGINT REFERENCES referees(id)
--                                    role CHECK IN ('FIRST','SECOND','CHALLENGE')
--
-- On production `matches.id` is `uuid` and `referees.id` is `bigint`, so 008's
-- foreign key could not be created and 006.5's `match_id TEXT` could not
-- reference anything. `match_referees_backup` is 006.5's shape, preserved and
-- never filled. This migration is the reconciliation: it declares the table
-- once, against the types the database actually has.
--
-- =============================================================================
-- WHY THE NAME IS NOT A JOIN KEY
-- =============================================================================
--
-- `matches` does carry `referee1_name` / `referee2_name`, on 30% of rows. It is
-- tempting to treat those as the link to `referees`, and it does not work:
--
--   matches.referee1_name   "Lowry Suzanne"        -- family name first
--   referees.referee_id     "Jonathan Lamprecht"   -- given name first
--
-- Two different conventions, no normalisation, and homonyms are not
-- hypothetical across 480 referees from every federation. A statistic
-- attributed to the wrong person is worse than a missing statistic, because
-- nothing about it looks wrong.
--
-- The VIS exposes `NoReferee1` / `NoReferee2` on `GetBeachMatchList`, and
-- `matches` already has the columns to hold them — they have simply never been
-- populated by any sync path. Section 2 indexes them and documents them as the
-- canonical join key; issue #90 is what fills them.
--
-- =============================================================================
-- RELATION TO MIGRATION 017 (deny-all)
-- =============================================================================
--
-- 017 revoked the default privileges that made every new table arrive readable
-- by `anon`, so `match_referees` is closed the moment it is created — that is
-- the property 017 §2 exists to provide, and this migration is the first table
-- to rely on it. Section 3 below asserts it rather than assuming it, and
-- additionally enables RLS and installs the explicit `service_role` policy, so
-- all three gates described in 017 are closed for this table too.
--
-- Reading these rows from the client is NOT enabled here. The referee
-- statistics are exposed through the aggregate tables of issue #91, which
-- carry their own denormalised referee identity; `match_referees` and
-- `matches` stay server-side.
--
-- Applying this is safe to repeat: every statement is idempotent.

BEGIN;

-- =============================================================================
-- SECTION 1: THE JUNCTION TABLE, AGAINST THE REAL TYPES
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.match_referees (
  match_id    UUID   NOT NULL REFERENCES public.matches(id)   ON DELETE CASCADE,
  referee_id  BIGINT NOT NULL REFERENCES public.referees(id)  ON DELETE RESTRICT,
  role        TEXT   NOT NULL CHECK (role IN ('FIRST', 'SECOND')),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (match_id, role)
);

COMMENT ON TABLE public.match_referees IS
  'Referee assignments per match. Recreated by migration 018 (issue #89) after '
  'migration 013 dropped it. Populated from the VIS NoReferee1/NoReferee2 '
  'fields by the backfill worker (issue #90) — never from referee names.';

COMMENT ON COLUMN public.match_referees.role IS
  'FIRST or SECOND referee. Deliberately narrower than migration 008''s '
  'CHECK, which also allowed CHALLENGE: the VIS GetBeachMatchList response '
  'carries exactly two referee slots, and a value no writer can produce is a '
  'value a reader will eventually mishandle.';

-- `(match_id, role)` is the primary key, so the match side is already indexed.
-- The referee side is the one every statistics query starts from.
CREATE INDEX IF NOT EXISTS idx_match_referees_referee_id
  ON public.match_referees (referee_id);

-- =============================================================================
-- SECTION 2: THE JOIN KEY ON `matches`
-- =============================================================================
--
-- These columns exist and are empty on all 9,570 rows. Indexing them now means
-- the backfill of issue #90 does not have to also be a schema change, and the
-- aggregation of issue #91 can resolve a referee without a sequential scan.

CREATE INDEX IF NOT EXISTS idx_matches_no_referee1
  ON public.matches (no_referee1) WHERE no_referee1 IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_matches_no_referee2
  ON public.matches (no_referee2) WHERE no_referee2 IS NOT NULL;

COMMENT ON COLUMN public.matches.no_referee1 IS
  'VIS NoReferee1. THE canonical join key to referees.vis_referee_no. '
  'Empty on every row until issue #90. Do not join on referee1_name: the name '
  'formats differ between matches and referees, and homonyms are real.';

COMMENT ON COLUMN public.matches.no_referee2 IS
  'VIS NoReferee2. See the comment on no_referee1.';

-- `referees.vis_referee_no` is the other end of that join and has no unique
-- constraint, which would let the backfill create a second row for a referee
-- it has already seen. Added here, because the backfill upserts on it.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM public.referees WHERE vis_referee_no IS NULL) THEN
    RAISE NOTICE
      'referees: % row(s) have a NULL vis_referee_no and cannot take part in '
      'statistics; leaving them in place, the unique index tolerates NULLs',
      (SELECT count(*) FROM public.referees WHERE vis_referee_no IS NULL);
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS uq_referees_vis_referee_no
  ON public.referees (vis_referee_no) WHERE vis_referee_no IS NOT NULL;

-- =============================================================================
-- SECTION 3: THE NEW TABLE IS CLOSED, AND WE CHECK RATHER THAN ASSUME
-- =============================================================================

ALTER TABLE public.match_referees ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.match_referees FROM anon, authenticated;
GRANT ALL ON public.match_referees TO service_role;

DROP POLICY IF EXISTS match_referees_service_all ON public.match_referees;
CREATE POLICY match_referees_service_all ON public.match_referees
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Two different checks, because they catch two different failures.
--
-- The REVOKE above closes THIS table unconditionally, so a leak here cannot be
-- caused by open default privileges — which is precisely why the post-condition
-- below is worth asserting anyway: it catches a grant this migration did not
-- anticipate (a column-level grant, a role that inherits from `anon`, a future
-- edit to this file that adds a GRANT and forgets what it implies).
DO $$
DECLARE
  leaked TEXT;
BEGIN
  SELECT string_agg(DISTINCT grantee || ':' || privilege_type, ', ')
    INTO leaked
    FROM information_schema.role_table_grants
   WHERE table_schema = 'public'
     AND table_name = 'match_referees'
     AND grantee IN ('anon', 'authenticated');

  IF leaked IS NOT NULL THEN
    RAISE EXCEPTION
      'match_referees is reachable by the public API roles (%) after this '
      'migration explicitly revoked it. Something in this file grants it back.',
      leaked;
  END IF;
END $$;

-- The second check looks at the state 017 §2 is responsible for. It does NOT
-- affect this table — it predicts the NEXT one. A warning rather than an
-- exception on purpose: `match_referees` is closed either way, and aborting a
-- correct migration because a *future* table might be exposed would trade a
-- real, applied fix for a hypothetical one. 017 §2 already records the roles it
-- could not reach on hosted Supabase; this is where that residual risk becomes
-- visible again, at the moment it would start to matter.
DO $$
DECLARE
  open_defaults TEXT;
BEGIN
  SELECT string_agg(DISTINCT pg_get_userbyid(d.defaclrole), ', ')
    INTO open_defaults
    FROM pg_default_acl d
   WHERE d.defaclnamespace = 'public'::regnamespace
     AND d.defaclobjtype = 'r'
     AND EXISTS (
       SELECT 1 FROM aclexplode(d.defaclacl) a
        WHERE pg_get_userbyid(a.grantee) IN ('anon', 'authenticated')
     );

  IF open_defaults IS NOT NULL THEN
    RAISE WARNING
      'default privileges in schema public still grant table access to the '
      'public API roles for object(s) created by: %. This table is closed, but '
      'the next CREATE TABLE will arrive open. See migration 017 section 2.',
      open_defaults;
  ELSE
    RAISE NOTICE 'default privileges hold: a new table arrives closed';
  END IF;
END $$;

-- =============================================================================
-- SECTION 4: RECORD THE VERSION
-- =============================================================================

-- NOT `ON CONFLICT DO NOTHING`: that clause needs a unique constraint to have
-- anything to conflict *with*, and `schema_versions` on production has none —
-- it is (version, applied_at, description) with no primary key. The clause
-- would parse, run, and insert a duplicate row on every re-application, which
-- is exactly what assertion D2 of match_referees_restore.test.sql caught.
INSERT INTO public.schema_versions (version, description)
SELECT '4.1.1',
       'Issue #89: restored match_referees against the real production types '
       '(matches.id uuid, referees.id bigint) after migration 013 dropped it; '
       'indexed matches.no_referee1/2 as the canonical referee join key'
WHERE NOT EXISTS (
  SELECT 1 FROM public.schema_versions WHERE version = '4.1.1'
);

COMMIT;

-- =============================================================================
-- WHAT THIS MIGRATION DELIBERATELY DOES NOT DO
-- =============================================================================
--
-- It does not backfill `match_referees` from the 2,843 rows that carry a
-- referee *name*. That mapping is exactly the one section "WHY THE NAME IS NOT
-- A JOIN KEY" argues is unsafe, and doing it here would fill the table with
-- rows nobody can later distinguish from correctly-sourced ones. The table
-- stays empty until issue #90 populates it from VIS identifiers.
--
-- It does not drop `match_referees_backup` (0 rows) or `matches_backup`
-- (114 rows). They are evidence of what migration 013 did, and dropping them
-- is a separate, reviewable decision.
