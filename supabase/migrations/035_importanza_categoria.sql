-- Migration 035: l'ordine di importanza dei tornei (issue #91)
--
-- =============================================================================
-- L'ORDINE, E DA DOVE VIENE
-- =============================================================================
--
-- Fino a qui le categorie erano ordinate per NUMERO DI PARTITE: in cima
-- comparivano i Futures, che sono i piu' numerosi e i meno importanti. E' un
-- ordine che risponde alla domanda "dove si gioca di piu'", non a "quanto
-- conta".
--
-- L'ordine di importanza l'ha dato Davide:
--
--   Olimpiadi > Mondiali > Elite (5 stelle, Major) > Challenge (4 stelle)
--   > a scendere > campionati continentali
--
-- Da cui una conseguenza che vale la pena rendere esplicita: **le due ere si
-- corrispondono**. BPT Elite16 e World Tour 5 stelle sono lo stesso gradino,
-- BPT Challenge e World Tour 4 stelle pure. Un arbitro che nel 2019 faceva i
-- Major e nel 2024 gli Elite16 non ha cambiato livello, ha cambiato circuito —
-- e una carriera letta senza questa corrispondenza sembrerebbe spezzata in
-- due.
--
-- =============================================================================
-- COSA HO DECISO IO, E VA CORRETTO SE SBAGLIO
-- =============================================================================
--
-- Le posizioni sotto non erano nella scala data, e le ho stabilite per
-- coerenza. Le elenco perche' siano contestabili:
--
--   * **Finals** (BPT e World Tour) allo stesso gradino di Elite: sono
--     l'evento conclusivo fra le squadre di vertice. Non erano nella scala.
--   * **Qualificazione olimpica** subito sotto i Mondiali: vale l'accesso ai
--     Giochi, quindi conta piu' di una tappa di circuito.
--   * **Mondiali giovanili** (U21/U19/U18) sopra i campionati continentali
--     giovanili, per simmetria con seniores.
--   * **Continental Cup** sopra **Continental Tour**: la Cup e' a squadre
--     nazionali con qualificazione olimpica, il Tour e' un circuito.
--   * **Test / formazione** ultimo: non e' competizione.
--
-- I numeri sono spaziati di 10 perche' inserire un gradino intermedio non
-- costi una rinumerazione.

BEGIN;

CREATE OR REPLACE FUNCTION public.category_rank(p_category TEXT)
RETURNS INTEGER
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT CASE p_category
    WHEN 'Giochi Olimpici'          THEN 10
    WHEN 'Campionati del Mondo'     THEN 20
    WHEN 'Qualificazione olimpica'  THEN 30
    -- Vertice del circuito: le due ere allo stesso gradino.
    WHEN 'BPT Elite16'              THEN 40
    WHEN 'World Tour 5 stelle'      THEN 40
    WHEN 'BPT Finals'               THEN 45
    WHEN 'World Tour Finals'        THEN 45
    WHEN 'BPT Challenge'            THEN 50
    WHEN 'World Tour 4 stelle'      THEN 50
    WHEN 'BPT Futures'              THEN 60
    WHEN 'World Tour 3 stelle'      THEN 60
    WHEN 'World Tour 2 stelle'      THEN 70
    WHEN 'World Tour 1 stella'      THEN 80
    WHEN 'King of the Court'        THEN 85
    -- Continentali seniores: gli "europei" della scala.
    WHEN 'Campionati continentali'  THEN 90
    WHEN 'Continental Cup'          THEN 100
    WHEN 'Continental Tour'         THEN 110
    WHEN 'CEV Masters'              THEN 120
    -- Giovanili: mondiali, poi continentali.
    WHEN 'Mondiali U21'             THEN 130
    WHEN 'Mondiali U19'             THEN 132
    WHEN 'Mondiali U18'             THEN 134
    WHEN 'Youth Olympic Games'      THEN 136
    WHEN 'Qualificazione giovanile' THEN 138
    WHEN 'U22'                      THEN 140
    WHEN 'U21'                      THEN 142
    WHEN 'U20'                      THEN 144
    WHEN 'U19'                      THEN 146
    WHEN 'U18'                      THEN 148
    -- Il resto.
    WHEN 'Giochi multisport'        THEN 160
    WHEN 'Zonale'                   THEN 170
    WHEN 'Snow Volleyball'          THEN 180
    WHEN 'Tour nazionale'           THEN 190
    WHEN 'Test / formazione'        THEN 900
    -- Cio' che non e' classificato va in fondo, ma PRIMA dei test: e' roba
    -- vera di cui non conosciamo il livello, non un'esercitazione.
    ELSE 800
  END;
$$;

COMMENT ON FUNCTION public.category_rank(TEXT) IS
  'Ordine di importanza dei tornei: piu'' basso = piu'' importante. Olimpiadi, '
  'Mondiali, Elite/5 stelle, Challenge/4 stelle, a scendere, poi i '
  'continentali. Le due ere si corrispondono — Elite16 e 5 stelle sono lo '
  'stesso gradino — altrimenti una carriera a cavallo del 2022 sembrerebbe '
  'spezzata. Migration 035, issue #91.';

ALTER TABLE public.referee_category_stats
  ADD COLUMN IF NOT EXISTS rank INTEGER;
ALTER TABLE public.referee_tournament_stats
  ADD COLUMN IF NOT EXISTS rank INTEGER;

-- Le righe esistenti: si riempiono subito, cosi' la colonna e' utilizzabile
-- senza aspettare il prossimo ricalcolo.
UPDATE public.referee_category_stats
   SET rank = public.category_rank(category) WHERE rank IS NULL;
UPDATE public.referee_tournament_stats
   SET rank = public.category_rank(category) WHERE rank IS NULL;

CREATE INDEX IF NOT EXISTS idx_referee_category_stats_rank
  ON public.referee_category_stats (vis_referee_no, rank);

-- Il ricalcolo scrive anche il rank. Si tocca solo la parte che lo richiede:
-- le due INSERT delle tabelle che ora hanno la colonna.
CREATE OR REPLACE FUNCTION public.refresh_referee_stats()
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
  PERFORM pg_advisory_xact_lock(91);

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
    tournament_type, category, confederation, rank,
    matches, as_first, as_second, first_match, last_match)
  SELECT vis_referee_no, tournament_no,
         (array_agg(tournament_name ORDER BY local_date DESC))[1],
         (array_agg(country         ORDER BY local_date DESC))[1],
         (array_agg(gender          ORDER BY local_date DESC))[1],
         (array_agg(season          ORDER BY local_date DESC))[1],
         (array_agg(tournament_type ORDER BY local_date DESC))[1],
         (array_agg(category        ORDER BY local_date DESC))[1],
         (array_agg(confederation   ORDER BY local_date DESC))[1],
         public.category_rank((array_agg(category ORDER BY local_date DESC))[1]),
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
    vis_referee_no, season, category, confederation, rank,
    matches, as_first, as_second, tournaments)
  SELECT vis_referee_no, season,
         COALESCE(category, 'Altro'),
         (array_agg(confederation ORDER BY local_date DESC))[1],
         public.category_rank(COALESCE(category, 'Altro')),
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

INSERT INTO public.schema_versions (version, description)
SELECT '4.10.0',
       'Issue #91: ordine di importanza delle categorie. Elite16 e World Tour '
       '5 stelle allo stesso gradino: una carriera a cavallo del 2022 non deve '
       'sembrare spezzata in due.'
WHERE NOT EXISTS (SELECT 1 FROM public.schema_versions WHERE version = '4.10.0');

COMMIT;
