-- Migration 032: le partite per categoria, per ogni arbitro (issue #91)
--
-- =============================================================================
-- PERCHE' UNA TABELLA NUOVA
-- =============================================================================
--
-- Il dettaglio per categoria esiste gia' in `referee_tournament_stats`, ma li'
-- e' una riga per (arbitro, TORNEO): per farne colonne nella tabella
-- principale bisognerebbe caricare 7.000 righe e sommarle nel browser, e
-- quelle righe crescono con lo storico — a fine backfill saranno decine di
-- migliaia.
--
-- Questa e' una riga per (arbitro, stagione, categoria): ~2.500 oggi, e cresce
-- con gli arbitri, non con i tornei.
--
-- La stagione c'e' perche' la pagina la filtra gia'. Il totale di carriera si
-- ottiene sommando le stagioni — non si memorizza due volte lo stesso numero,
-- che e' il modo piu' semplice di farli divergere.

BEGIN;

CREATE TABLE IF NOT EXISTS public.referee_category_stats (
  vis_referee_no TEXT    NOT NULL,
  season         INTEGER NOT NULL,
  category       TEXT    NOT NULL,
  confederation  TEXT,
  matches        INTEGER NOT NULL DEFAULT 0,
  as_first       INTEGER NOT NULL DEFAULT 0,
  as_second      INTEGER NOT NULL DEFAULT 0,
  tournaments    INTEGER NOT NULL DEFAULT 0,
  computed_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (vis_referee_no, season, category)
);

COMMENT ON TABLE public.referee_category_stats IS
  'Partite per (arbitro, stagione, categoria). Serve a mostrare le categorie '
  'come COLONNE nella tabella principale senza caricare il dettaglio per '
  'torneo di tutti. Issue #91.';

-- `category` e' NOT NULL e la chiave primaria la include: i tornei senza
-- categoria confluiscono nell'etichetta 'Altro' invece di sparire. Un arbitro
-- che ha arbitrato solo eventi non classificati deve comunque comparire con i
-- suoi numeri.
COMMENT ON COLUMN public.referee_category_stats.category IS
  'Categoria del torneo, oppure "Altro" quando il codice VIS non e'' stato '
  'classificato (vedi 029/030). Mai NULL: fa parte della chiave, e una riga '
  'persa e'' peggio di una riga etichettata "Altro".';

CREATE INDEX IF NOT EXISTS idx_referee_category_stats_cat
  ON public.referee_category_stats (category, matches DESC);

DROP FUNCTION IF EXISTS public.refresh_referee_stats();

CREATE FUNCTION public.refresh_referee_stats()
RETURNS TABLE (season_rows INTEGER, career_rows INTEGER,
               tournament_rows INTEGER, match_rows INTEGER,
               category_rows INTEGER)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  s INTEGER; c INTEGER; t INTEGER; m INTEGER; k INTEGER;
BEGIN
  CREATE TEMP TABLE _designazioni ON COMMIT DROP AS
  SELECT r.vis_referee_no,
         r.referee_id                          AS referee_name,
         r.federation_code,
         EXTRACT(YEAR FROM mt.local_date)::INT AS season,
         mt.no                                 AS match_no,
         mt.tournament_no,
         tn.name                               AS tournament_name,
         tn.country, tn.gender,
         tn.type                               AS tournament_type,
         public.tournament_category(tn.type)   AS category,
         public.tournament_confederation(public.tournament_category(tn.type), tn.name)
                                               AS confederation,
         mt.local_date,
         mt.local_time::TEXT                   AS local_time,
         mt.round                              AS round_name,
         mt.team_a_name, mt.team_b_name,
         mt.match_points_a, mt.match_points_b,
         mt.status, mr.role
    FROM public.match_referees mr
    JOIN public.matches  mt ON mt.id = mr.match_id
    JOIN public.referees r  ON r.id  = mr.referee_id
    LEFT JOIN public.tournaments tn
           ON tn.vis_tournament_no::TEXT = mt.tournament_no
   WHERE mt.local_date IS NOT NULL
     AND r.vis_referee_no IS NOT NULL;

  DELETE FROM public.referee_season_stats WHERE true;
  INSERT INTO public.referee_season_stats (
    vis_referee_no, season, referee_name, federation_code,
    matches, as_first, as_second, tournaments, first_match, last_match)
  SELECT vis_referee_no, season,
         (array_agg(referee_name    ORDER BY local_date DESC))[1],
         (array_agg(federation_code ORDER BY local_date DESC))[1],
         count(*),
         count(*) FILTER (WHERE role = 'FIRST'),
         count(*) FILTER (WHERE role = 'SECOND'),
         count(DISTINCT tournament_no), min(local_date), max(local_date)
    FROM _designazioni GROUP BY vis_referee_no, season;
  GET DIAGNOSTICS s = ROW_COUNT;

  DELETE FROM public.referee_career_stats WHERE true;
  INSERT INTO public.referee_career_stats (
    vis_referee_no, referee_name, federation_code,
    matches, as_first, as_second, tournaments, seasons, first_match, last_match)
  SELECT vis_referee_no,
         (array_agg(referee_name    ORDER BY local_date DESC))[1],
         (array_agg(federation_code ORDER BY local_date DESC))[1],
         count(*),
         count(*) FILTER (WHERE role = 'FIRST'),
         count(*) FILTER (WHERE role = 'SECOND'),
         count(DISTINCT tournament_no), count(DISTINCT season),
         min(local_date), max(local_date)
    FROM _designazioni GROUP BY vis_referee_no;
  GET DIAGNOSTICS c = ROW_COUNT;

  DELETE FROM public.referee_tournament_stats WHERE true;
  INSERT INTO public.referee_tournament_stats (
    vis_referee_no, tournament_no, tournament_name, country, gender, season,
    tournament_type, category, confederation,
    matches, as_first, as_second, first_match, last_match)
  SELECT vis_referee_no, tournament_no,
         (array_agg(tournament_name ORDER BY local_date DESC))[1],
         (array_agg(country         ORDER BY local_date DESC))[1],
         (array_agg(gender          ORDER BY local_date DESC))[1],
         (array_agg(season          ORDER BY local_date DESC))[1],
         (array_agg(tournament_type ORDER BY local_date DESC))[1],
         (array_agg(category        ORDER BY local_date DESC))[1],
         (array_agg(confederation   ORDER BY local_date DESC))[1],
         count(*),
         count(*) FILTER (WHERE role = 'FIRST'),
         count(*) FILTER (WHERE role = 'SECOND'),
         min(local_date), max(local_date)
    FROM _designazioni GROUP BY vis_referee_no, tournament_no;
  GET DIAGNOSTICS t = ROW_COUNT;

  DELETE FROM public.referee_match_log WHERE true;
  INSERT INTO public.referee_match_log (
    vis_referee_no, match_no, tournament_no, tournament_name, gender,
    category, confederation, season, local_date, local_time, round_name, role,
    team_a_name, team_b_name, match_points_a, match_points_b, status)
  SELECT DISTINCT ON (vis_referee_no, match_no)
         vis_referee_no, match_no, tournament_no, tournament_name, gender,
         category, confederation, season, local_date, local_time, round_name, role,
         team_a_name, team_b_name, match_points_a, match_points_b, status
    FROM _designazioni
   ORDER BY vis_referee_no, match_no, role;
  GET DIAGNOSTICS m = ROW_COUNT;

  DELETE FROM public.referee_category_stats WHERE true;
  INSERT INTO public.referee_category_stats (
    vis_referee_no, season, category, confederation,
    matches, as_first, as_second, tournaments)
  SELECT vis_referee_no, season,
         COALESCE(category, 'Altro'),
         (array_agg(confederation ORDER BY local_date DESC))[1],
         count(*),
         count(*) FILTER (WHERE role = 'FIRST'),
         count(*) FILTER (WHERE role = 'SECOND'),
         count(DISTINCT tournament_no)
    FROM _designazioni
   GROUP BY vis_referee_no, season, COALESCE(category, 'Altro');
  GET DIAGNOSTICS k = ROW_COUNT;

  DROP TABLE _designazioni;
  season_rows := s; career_rows := c; tournament_rows := t;
  match_rows := m; category_rows := k;
  RETURN NEXT;
END $$;

REVOKE ALL ON FUNCTION public.refresh_referee_stats() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.refresh_referee_stats() TO service_role;

-- =============================================================================
-- I PERMESSI, COME LE ALTRE
-- =============================================================================
--
-- Una tabella nuova nasce chiusa (migration 017), e va aperta con lo stesso
-- criterio delle altre quattro: solo `authenticated`, e solo con una riga in
-- `app_users`. Dimenticarlo qui significherebbe una tabella che nessuno legge
-- — o, se qualcuno "risolvesse" il problema con un GRANT ad anon, il primo
-- buco nel muro alzato dalla 028.

ALTER TABLE public.referee_category_stats ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS referee_category_stats_authorized_read ON public.referee_category_stats;
CREATE POLICY referee_category_stats_authorized_read
  ON public.referee_category_stats FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.app_users WHERE id = auth.uid()));

REVOKE ALL ON public.referee_category_stats FROM anon;
GRANT SELECT ON public.referee_category_stats TO authenticated;

DO $$
BEGIN
  IF has_table_privilege('anon', 'public.referee_category_stats', 'SELECT') THEN
    RAISE EXCEPTION '032: anon legge referee_category_stats';
  END IF;
  IF NOT has_table_privilege('authenticated', 'public.referee_category_stats', 'SELECT') THEN
    RAISE EXCEPTION '032: authenticated non legge referee_category_stats';
  END IF;
  IF has_table_privilege('authenticated', 'public.referee_category_stats', 'UPDATE') THEN
    RAISE EXCEPTION '032: authenticated puo scrivere referee_category_stats';
  END IF;
END $$;

INSERT INTO public.schema_versions (version, description)
SELECT '4.9.0',
       'Issue #91: referee_category_stats — partite per arbitro, stagione e '
       'categoria, per mostrare le categorie come colonne ordinabili.'
WHERE NOT EXISTS (SELECT 1 FROM public.schema_versions WHERE version = '4.9.0');

COMMIT;
