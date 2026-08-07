-- Migration 029: la categoria del torneo (issue #91)
--
-- =============================================================================
-- DA DOVE VIENE LA CATEGORIA
-- =============================================================================
--
-- Dal campo `Type` del VIS, non dal nome. Il nome di un torneo e' spesso solo
-- la citta': i tornei di tipo 51 si chiamano "Uberlandia", "Rosarito",
-- "Cape Town" — e nell'archivio ce ne sono 106 di cui solo l'83% ha "Elite"
-- scritto da qualche parte. Classificare per nome perderebbe il resto, in
-- silenzio.
--
-- =============================================================================
-- COME SONO STATI STABILITI I CODICI
-- =============================================================================
--
-- Non per congettura: incrociando, sui 9.260 tornei dell'archivio, ogni codice
-- con le parole che compaiono nei nomi di quel gruppo. La quota accanto a
-- ciascuno e' la percentuale di nomi che contiene la parola:
--
--   51 -> Elite            83%     52 -> Challenge        74%
--   53 -> Futures          74%     24 -> U18              76%
--   23 -> U20              74%     36 -> Snow             69%
--   44 -> Games            65%     11 -> Continental Cup  53%
--   34 -> Zonal            43%
--
-- Per gli altri la prova viene dai nomi ricorrenti: 54 e' "BPT Finals Doha",
-- 50 e' "(King of the Court)", 49 e' "Olympic Qualification Tournament", 43 e'
-- "Youth Olympic Games", 35 e' "Officials training Test event" e "TEST",
-- 47/48/22/55 sono campionati U21/U19/U22 e qualificazioni giovanili.
--
-- =============================================================================
-- COSA NON E' STATO CLASSIFICATO, E PERCHE'
-- =============================================================================
--
-- I codici 1, 4, 5, 7, 8, 9, 12, 14, 15, 17, 26, 27, 39, 42 restano SENZA
-- categoria. I loro nomi sono citta' e nient'altro, e nessuna parola ricorre
-- abbastanza da giustificare un'etichetta. Inventarla sarebbe peggio che
-- lasciarla vuota: una categoria sbagliata non si distingue da una giusta,
-- mentre una categoria assente si vede.
--
-- Sui 417 tornei che compaiono nelle statistiche di oggi, i codici mappati ne
-- coprono 373 — l'89%. I 44 restanti si mostrano come "Altro".
--
-- Il codice 12 (Continental Tour) e' escluso di proposito malgrado i suoi 26
-- tornei: la parola ricorre solo nel 25% dei nomi, che non basta.

BEGIN;

CREATE OR REPLACE FUNCTION public.tournament_category(p_type TEXT)
RETURNS TEXT
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT CASE p_type
    WHEN '51' THEN 'BPT Elite16'
    WHEN '52' THEN 'BPT Challenge'
    WHEN '53' THEN 'BPT Futures'
    WHEN '54' THEN 'BPT Finals'
    WHEN '50' THEN 'King of the Court'
    WHEN '49' THEN 'Qualificazione olimpica'
    WHEN '43' THEN 'Youth Olympic Games'
    WHEN '44' THEN 'Giochi multisport'
    WHEN '36' THEN 'Snow Volleyball'
    WHEN '34' THEN 'Zonale'
    WHEN '11' THEN 'Continental Cup'
    WHEN '24' THEN 'U18'
    WHEN '23' THEN 'U20'
    WHEN '22' THEN 'U22'
    WHEN '47' THEN 'U21'
    WHEN '48' THEN 'U19'
    WHEN '55' THEN 'Qualificazione giovanile'
    WHEN '35' THEN 'Test / formazione'
    ELSE NULL
  END;
$$;

COMMENT ON FUNCTION public.tournament_category(TEXT) IS
  'Traduce `tournaments.type` (codice VIS) in una categoria leggibile. '
  'NULL per i codici che non e'' stato possibile stabilire con prove: una '
  'categoria sbagliata non si distingue da una giusta, una assente si vede. '
  'Migration 029, issue #91.';

ALTER TABLE public.referee_tournament_stats
  ADD COLUMN IF NOT EXISTS tournament_type TEXT,
  ADD COLUMN IF NOT EXISTS category        TEXT;

ALTER TABLE public.referee_match_log
  ADD COLUMN IF NOT EXISTS category TEXT;

COMMENT ON COLUMN public.referee_tournament_stats.tournament_type IS
  'Il codice VIS grezzo. Resta accanto alla categoria perche'' un torneo '
  '"Altro" possa essere identificato e, se serve, classificato in seguito.';

CREATE INDEX IF NOT EXISTS idx_referee_tournament_stats_categoria
  ON public.referee_tournament_stats (vis_referee_no, category);

DROP FUNCTION IF EXISTS public.refresh_referee_stats();

CREATE FUNCTION public.refresh_referee_stats()
RETURNS TABLE (season_rows INTEGER, career_rows INTEGER,
               tournament_rows INTEGER, match_rows INTEGER)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  s INTEGER; c INTEGER; t INTEGER; m INTEGER;
BEGIN
  CREATE TEMP TABLE _designazioni ON COMMIT DROP AS
  SELECT r.vis_referee_no,
         r.referee_id                          AS referee_name,
         r.federation_code,
         EXTRACT(YEAR FROM mt.local_date)::INT AS season,
         mt.no                                 AS match_no,
         mt.tournament_no,
         tn.name                               AS tournament_name,
         tn.country,
         tn.gender,
         tn.type                               AS tournament_type,
         public.tournament_category(tn.type)   AS category,
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
    tournament_type, category, matches, as_first, as_second, first_match, last_match)
  SELECT vis_referee_no, tournament_no,
         (array_agg(tournament_name ORDER BY local_date DESC))[1],
         (array_agg(country         ORDER BY local_date DESC))[1],
         (array_agg(gender          ORDER BY local_date DESC))[1],
         (array_agg(season          ORDER BY local_date DESC))[1],
         (array_agg(tournament_type ORDER BY local_date DESC))[1],
         (array_agg(category        ORDER BY local_date DESC))[1],
         count(*),
         count(*) FILTER (WHERE role = 'FIRST'),
         count(*) FILTER (WHERE role = 'SECOND'),
         min(local_date), max(local_date)
    FROM _designazioni GROUP BY vis_referee_no, tournament_no;
  GET DIAGNOSTICS t = ROW_COUNT;

  DELETE FROM public.referee_match_log WHERE true;
  INSERT INTO public.referee_match_log (
    vis_referee_no, match_no, tournament_no, tournament_name, gender, category,
    season, local_date, local_time, round_name, role, team_a_name, team_b_name,
    match_points_a, match_points_b, status)
  SELECT DISTINCT ON (vis_referee_no, match_no)
         vis_referee_no, match_no, tournament_no, tournament_name, gender, category,
         season, local_date, local_time, round_name, role, team_a_name, team_b_name,
         match_points_a, match_points_b, status
    FROM _designazioni
   ORDER BY vis_referee_no, match_no, role;
  GET DIAGNOSTICS m = ROW_COUNT;

  DROP TABLE _designazioni;
  season_rows := s; career_rows := c; tournament_rows := t; match_rows := m;
  RETURN NEXT;
END $$;

REVOKE ALL ON FUNCTION public.refresh_referee_stats() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.refresh_referee_stats() TO service_role;

-- Nessuna verifica sui permessi, qui: aggiungere colonne non cambia chi puo'
-- leggere una tabella, e il controllo appartiene alla migration che i permessi
-- li assegna (la 028). Metterlo anche qui significherebbe darla per applicata,
-- e una migration che presuppone lo stato lasciato da un'altra non si puo'
-- rigiocare da sola. La prova che la 029 non riapre nulla sta invece in
-- `supabase/tests/accesso_riservato.test.sql`, dove entrambe sono in gioco.

INSERT INTO public.schema_versions (version, description)
SELECT '4.7.0',
       'Issue #91: categoria del torneo dal codice VIS Type — Elite16, '
       'Challenge, Futures, giovanili, continentali. I codici non dimostrabili '
       'restano senza categoria.'
WHERE NOT EXISTS (SELECT 1 FROM public.schema_versions WHERE version = '4.7.0');

COMMIT;
