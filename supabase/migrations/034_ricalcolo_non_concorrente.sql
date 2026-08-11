-- Migration 034: un ricalcolo alla volta (issue #91)
--
-- =============================================================================
-- COSA E' SUCCESSO
-- =============================================================================
--
--   23505: duplicate key value violates unique constraint
--          "referee_season_stats_pkey"
--   Key (vis_referee_no, season)=(150444, 2016) already exists.
--
-- Un `GROUP BY vis_referee_no, season` non puo' produrre due righe uguali, e
-- infatti non le ha prodotte: le hanno prodotte DUE ricalcoli sovrapposti. Il
-- worker ne lancia uno alla fine di ogni ciclo, e nello stesso momento ne era
-- stato chiesto uno a mano. Il primo aveva gia' inserito quando il secondo,
-- che aveva cancellato prima, e' arrivato a inserire a sua volta.
--
-- E' un guasto che si vede solo quando capita, e capita quando c'e' traffico:
-- oggi succede fra il worker e una richiesta manuale, domani succederebbe fra
-- il cron e il worker. La finestra e' di qualche secondo, il che significa che
-- e' raro e che quando morde e' inspiegabile.
--
-- =============================================================================
-- IL RIMEDIO, E PERCHE' NON UN ALTRO
-- =============================================================================
--
-- `pg_advisory_xact_lock`: il primo che entra tiene il lucchetto fino a fine
-- transazione, il secondo ASPETTA e poi ricalcola su dati gia' aggiornati.
--
-- Non `pg_try_advisory_lock`, che avrebbe fatto uscire il secondo senza fare
-- nulla: sembra piu' efficiente ed e' peggio, perche' chi ha chiesto il
-- ricalcolo riceverebbe "fatto" mentre le sue modifiche non sono ancora
-- entrate. Un ricalcolo che non ricalcola e' esattamente il tipo di silenzio
-- che questa epica ha passato giorni a togliere di mezzo.
--
-- Il lock e' sulla transazione, non sulla sessione: si rilascia da solo anche
-- se la funzione fallisce a meta', senza bisogno che qualcuno se ne ricordi.
--
-- Il numero 91 non ha significato oltre a essere costante e nostro: due
-- chiamanti diversi devono chiedere lo STESSO numero, altrimenti il lucchetto
-- non serve a niente.

BEGIN;

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
  -- Uno alla volta. Chi arriva secondo aspetta e poi ricalcola davvero.
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

COMMENT ON FUNCTION public.refresh_referee_stats() IS
  'Ricalcola INTEGRALMENTE le cinque tabelle di sintesi. Protetta da '
  '`pg_advisory_xact_lock(91)`: due ricalcoli sovrapposti producevano 23505 '
  'su referee_season_stats_pkey. Chi arriva secondo ASPETTA e ricalcola — non '
  'esce dicendo "fatto" senza aver fatto nulla. Migration 034.';

REVOKE ALL ON FUNCTION public.refresh_referee_stats() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.refresh_referee_stats() TO service_role;

INSERT INTO public.schema_versions (version, description)
SELECT '4.9.2',
       'Issue #91: refresh_referee_stats() serializzata con advisory lock — '
       'due ricalcoli sovrapposti violavano la chiave primaria.'
WHERE NOT EXISTS (SELECT 1 FROM public.schema_versions WHERE version = '4.9.2');

COMMIT;
