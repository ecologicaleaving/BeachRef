-- Migration 031: la confederazione organizzatrice (issue #91)
--
-- =============================================================================
-- PERCHE' NON BASTA IL NOME, E NON BASTA IL PAESE
-- =============================================================================
--
-- **Il nome da solo**: su 6.416 righe di dettaglio, 11.265 partite non
-- contengono nessuna sigla. Sono quasi tutte BPT chiamate con la sola citta' —
-- "Tlaxcala", "Uberlandia". Classificare per sigla lascerebbe fuori il 23%
-- delle partite, e sarebbero proprio quelle che contano di piu'.
--
-- **Il paese**: un Elite16 a Vienna e un Campionato Europeo a Vienna hanno lo
-- stesso paese e due organizzatori diversi. La confederazione non e' una
-- proprieta' del luogo.
--
-- Quello che funziona e' la combinazione:
--
--   1. la CATEGORIA, quando l'evento e' per definizione mondiale — Beach Pro
--      Tour, Mondiali, Olimpiadi, mondiali giovanili: sono FIVB comunque si
--      chiamino e ovunque si giochino. Copre il 74% delle partite;
--   2. la SIGLA nel nome per tutto il resto — CEV, AVC, CAVB, NORCECA, CSV,
--      piu' le zone europee (NEVZA, EEVZA, MEVZA) e caraibica (ECVA);
--   3. l'AGGETTIVO, dove la sigla manca ma il nome e' esplicito:
--      "Asian U21 Beach Volleyball Championships" e' AVC.
--
-- Copertura: 92% delle partite.
--
-- =============================================================================
-- IL RESTO NON HA UNA CONFEDERAZIONE, E NON E' UN BUCO
-- =============================================================================
--
-- I 3.844 residui sono giochi multisport (FISU World University, SEA Games,
-- Giochi del Mediterraneo, Commonwealth Youth) e tour nazionali austriaci.
-- Sono eventi organizzati da qualcun altro: il comitato dei Giochi, o la
-- federazione nazionale. Attribuirli a una confederazione per riempire la
-- colonna sarebbe inventare.
--
-- NORCECA e CSV non compaiono ancora in questi dati: le stagioni caricate
-- finora (2022-2026) non contengono loro eventi. Le regole ci sono comunque,
-- perche' le stagioni piu' vecchie li porteranno.

BEGIN;

CREATE OR REPLACE FUNCTION public.tournament_confederation(
  p_category TEXT,
  p_name     TEXT
) RETURNS TEXT
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT CASE
    -- 1. Categorie che sono FIVB per definizione, comunque si chiamino.
    WHEN p_category IN ('BPT Elite16', 'BPT Challenge', 'BPT Futures', 'BPT Finals',
                        'King of the Court', 'Campionati del Mondo', 'Giochi Olimpici',
                        'Mondiali U21', 'Mondiali U19', 'Mondiali U18',
                        'Qualificazione olimpica', 'Youth Olympic Games')
      THEN 'FIVB'
    -- 2. Sigle. Le zone europee vanno prima di CEV solo per leggibilita': non
    --    si sovrappongono.
    WHEN upper(p_name) LIKE '%NEVZA%'    THEN 'CEV'
    WHEN upper(p_name) LIKE '%EEVZA%'    THEN 'CEV'
    WHEN upper(p_name) LIKE '%MEVZA%'    THEN 'CEV'
    WHEN upper(p_name) LIKE '%CEV%'      THEN 'CEV'
    -- CAVB prima di AVC: "CAVB" contiene "AVC" solo per chi legge in fretta,
    -- ma un LIKE non legge in fretta — contiene davvero la sottostringa "AVB",
    -- non "AVC". L'ordine resta comunque quello sicuro.
    WHEN upper(p_name) LIKE '%CAVB%'     THEN 'CAVB'
    WHEN upper(p_name) LIKE '%AVC%'      THEN 'AVC'
    WHEN upper(p_name) LIKE '%NORCECA%'  THEN 'NORCECA'
    WHEN upper(p_name) LIKE '%ECVA%'     THEN 'NORCECA'
    WHEN upper(p_name) LIKE '%AFECAVOL%' THEN 'CSV'
    WHEN upper(p_name) LIKE '%CSV%'      THEN 'CSV'
    WHEN upper(p_name) LIKE '%FIVB%'     THEN 'FIVB'
    -- 3. Aggettivi, dove la sigla manca ma il nome e' esplicito.
    WHEN upper(p_name) LIKE '%EUROPEAN%'       THEN 'CEV'
    WHEN upper(p_name) LIKE '%ASIAN%'          THEN 'AVC'
    WHEN upper(p_name) LIKE '%SEA ZONE%'       THEN 'AVC'
    WHEN upper(p_name) LIKE '%AFRICAN%'        THEN 'CAVB'
    WHEN upper(p_name) LIKE '%SOUTH AMERICAN%' THEN 'CSV'
    WHEN upper(p_name) LIKE '%SUDAMERICANO%'   THEN 'CSV'
    ELSE NULL
  END;
$$;

COMMENT ON FUNCTION public.tournament_confederation(TEXT, TEXT) IS
  'La confederazione organizzatrice, da categoria + nome. NULL per giochi '
  'multisport e tour nazionali, che una confederazione non ce l''hanno: '
  'riempire quella colonna per completezza sarebbe inventare. Migration 031.';

ALTER TABLE public.referee_tournament_stats
  ADD COLUMN IF NOT EXISTS confederation TEXT;
ALTER TABLE public.referee_match_log
  ADD COLUMN IF NOT EXISTS confederation TEXT;

CREATE INDEX IF NOT EXISTS idx_referee_tournament_stats_conf
  ON public.referee_tournament_stats (vis_referee_no, confederation);

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

  DROP TABLE _designazioni;
  season_rows := s; career_rows := c; tournament_rows := t; match_rows := m;
  RETURN NEXT;
END $$;

REVOKE ALL ON FUNCTION public.refresh_referee_stats() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.refresh_referee_stats() TO service_role;

INSERT INTO public.schema_versions (version, description)
SELECT '4.8.0',
       'Issue #91: confederazione organizzatrice da categoria + nome. NULL per '
       'giochi multisport e tour nazionali, che non ne hanno una.'
WHERE NOT EXISTS (SELECT 1 FROM public.schema_versions WHERE version = '4.8.0');

COMMIT;
