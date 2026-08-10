-- Migration 036: la fase della partita, normalizzata (issue #91)
--
-- =============================================================================
-- 93 NOMI PER UNA DOZZINA DI FASI
-- =============================================================================
--
-- `matches.round` arriva dal VIS come testo libero, e su 108.000 designazioni
-- contiene 93 valori distinti. Contarne le finali cercando la parola "Final"
-- darebbe un numero sbagliato, e sbagliato per eccesso.
--
-- Le trappole, tutte osservate nei dati veri:
--
--   * `Semifinals` e `Semi-finals` e `Semifinal 1` e `Semifinal 2` sono la
--     stessa fase scritta in quattro modi;
--   * `Final 1st Place` e `Final 1st place` differiscono per una maiuscola;
--   * **`Semifinals for place 25 to 32` NON e' una semifinale**: e' un
--     tabellone di piazzamento. Idem `Quarterfinals for place 9 to 16`;
--   * **`Final 5th Place`, `Final 7th Place`, `Final 9th Place` NON sono
--     finali**: decidono il quinto posto, non il titolo;
--   * `Loser Semifinals` non e' una semifinale;
--   * `Eight final 1..8` sono gli ottavi, scritti come li scriverebbe un
--     italiano che traduce a orecchio;
--   * `Gold Medal Match` e `Bronze Medal Match` sono finale e finale 3-4 con
--     un altro nome, e compaiono dove il torneo e' olimpico.
--
-- L'ordine dei CASE qui sotto e' significativo: le esclusioni vengono PRIMA.
-- Se `%SEMIFINAL%` fosse testato per primo, le semifinali di piazzamento
-- entrerebbero nel conteggio delle semifinali vere, e nessuno se ne
-- accorgerebbe guardando un totale.

BEGIN;

CREATE OR REPLACE FUNCTION public.match_phase(p_round TEXT)
RETURNS TEXT
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT CASE
    WHEN p_round IS NULL OR btrim(p_round) = '' THEN NULL

    -- === ESCLUSIONI, PRIMA DI TUTTO =========================================
    -- Tabelloni di piazzamento: hanno i nomi delle fasi vere ma non lo sono.
    WHEN upper(p_round) LIKE '%FOR PLACE%'        THEN 'Piazzamento'
    WHEN upper(p_round) LIKE 'LOSER %'            THEN 'Piazzamento'
    WHEN upper(p_round) LIKE '%LOSER ARE RANKED%' THEN 'Piazzamento'
    WHEN upper(p_round) LIKE 'MATCH FOR %'        THEN 'Piazzamento'
    -- "Final 5th/7th/9th/11st/13th Place": finali di piazzamento. Si escludono
    -- elencando le uniche due che contano, invece di inseguire i numeri.
    --
    -- Il confronto e' una REGEX e non un LIKE per un motivo che il test ha
    -- trovato prima di me: **"Final 11st Place" CONTIENE "1st Place"**. Con
    -- `NOT LIKE '%1ST PLACE%'` quella riga sfuggiva all'esclusione e finiva
    -- fra le finali vere. `(^|[^0-9])` pretende che prima dell'1 non ci sia
    -- un'altra cifra.
    WHEN p_round ~* 'final.*place'
     AND p_round !~* '(^|[^0-9])1st place'
     AND p_round !~* '(^|[^0-9])3rd place'
     AND p_round !~* '2nd - 3rd'                  THEN 'Piazzamento'

    -- === LE FASI VERE =======================================================
    WHEN p_round ~* '(^|[^0-9])1st place'     THEN 'Finale'
    WHEN upper(p_round) LIKE 'GOLD MEDAL%'    THEN 'Finale'
    WHEN p_round ~* '(^|[^0-9])3rd place'     THEN 'Finale 3o posto'
    WHEN upper(p_round) LIKE '%2ND - 3RD%'    THEN 'Finale 3o posto'
    WHEN upper(p_round) LIKE 'BRONZE MEDAL%'  THEN 'Finale 3o posto'
    WHEN upper(p_round) LIKE '%SEMIFINAL%'    THEN 'Semifinale'
    WHEN upper(p_round) LIKE '%SEMI-FINAL%'   THEN 'Semifinale'
    WHEN upper(p_round) LIKE '%QUARTERFINAL%' THEN 'Quarti'
    WHEN upper(p_round) LIKE 'ROUND OF 16%'   THEN 'Ottavi'
    WHEN upper(p_round) LIKE 'EIGHT FINAL%'   THEN 'Ottavi'
    WHEN upper(p_round) LIKE 'ROUND OF 32%'   THEN 'Sedicesimi'
    WHEN upper(p_round) LIKE 'ROUND OF %'     THEN 'Tabellone'
    WHEN upper(p_round) LIKE 'POOL %'         THEN 'Pool'
    WHEN upper(p_round) LIKE 'ROUND %'        THEN 'Turno preliminare'
    WHEN upper(p_round) LIKE 'LUCKY LOSER%'   THEN 'Turno preliminare'
    WHEN upper(p_round) LIKE '%QUOTA FOR%'    THEN 'Quota nazionale'
    ELSE 'Altro'
  END;
$$;

COMMENT ON FUNCTION public.match_phase(TEXT) IS
  'Normalizza i 93 valori di `matches.round` in una dozzina di fasi. Le '
  'ESCLUSIONI vengono prima: "Semifinals for place 25 to 32" e "Final 5th '
  'Place" hanno i nomi delle fasi vere e non lo sono. Contare le finali '
  'cercando "Final" darebbe un numero sbagliato per eccesso. Migration 036.';

-- L'ordine in cui mostrare le fasi. Stesso criterio della scala dei tornei:
-- vive nel database, cosi' chi disegna una schermata non la reinventa.
CREATE OR REPLACE FUNCTION public.phase_rank(p_phase TEXT)
RETURNS INTEGER
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT CASE p_phase
    WHEN 'Finale'            THEN 10
    WHEN 'Finale 3o posto'   THEN 20
    WHEN 'Semifinale'        THEN 30
    WHEN 'Quarti'            THEN 40
    WHEN 'Ottavi'            THEN 50
    WHEN 'Sedicesimi'        THEN 60
    WHEN 'Tabellone'         THEN 70
    WHEN 'Pool'              THEN 80
    WHEN 'Turno preliminare' THEN 90
    WHEN 'Quota nazionale'   THEN 100
    WHEN 'Piazzamento'       THEN 110
    ELSE 900
  END;
$$;

ALTER TABLE public.referee_match_log
  ADD COLUMN IF NOT EXISTS phase TEXT;

UPDATE public.referee_match_log
   SET phase = public.match_phase(round_name)
 WHERE phase IS NULL AND round_name IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_referee_match_log_phase
  ON public.referee_match_log (vis_referee_no, phase);

-- Il ricalcolo scrive la fase. Cambia una sola INSERT; il resto e' identico
-- alla 035 ed e' ricopiato perche' una funzione si sostituisce per intero.
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
         public.match_phase(mt.round)          AS phase,
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
    category, confederation, season, local_date, local_time, round_name, phase,
    role, team_a_name, team_b_name, match_points_a, match_points_b, status)
  SELECT DISTINCT ON (vis_referee_no, match_no)
         vis_referee_no, match_no, tournament_no, tournament_name, gender,
         category, confederation, season, local_date, local_time, round_name, phase,
         role, team_a_name, team_b_name, match_points_a, match_points_b, status
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
SELECT '4.11.0',
       'Issue #91: fase della partita normalizzata da 93 nomi liberi. Le '
       'finali e semifinali di PIAZZAMENTO sono escluse: contarle sarebbe un '
       'errore per eccesso invisibile in un totale.'
WHERE NOT EXISTS (SELECT 1 FROM public.schema_versions WHERE version = '4.11.0');

COMMIT;
