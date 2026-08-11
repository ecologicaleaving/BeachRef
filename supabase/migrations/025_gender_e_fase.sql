-- Migration 025: genere del torneo, fase della partita (issue #91)
--
-- =============================================================================
-- I DUE DIFETTI CHE CHIUDE
-- =============================================================================
--
-- 1. **Ogni torneo compariva due volte** nel pannello di dettaglio, con lo
--    stesso nome e conteggi diversi. Non era un difetto di visualizzazione:
--    maschile e femminile sono due tornei distinti nel VIS, e senza il genere
--    sono indistinguibili a schermo. Si capiva solo aprendoli e leggendo se le
--    coppie erano maschili o femminili.
--
-- 2. **Il 38% delle righe non aveva un nome di torneo** — 482 su 1.273
--    mostravano "Torneo VIS 8930". `tournaments` conteneva 236 righe su 9.260
--    tornei esistenti, perche' il backfill raccoglie partite e non tornei.
--
-- Entrambi si chiudono riempiendo `tournaments` dal VIS, che costa UNA
-- richiesta (`GetBeachTournamentList` senza filtro: 9.260 tornei, ~1,2 MB).
-- Il worker lo fa al massimo una volta al giorno — l'archivio cambia quando
-- nasce un torneo, non ogni quindici minuti — e `tournaments_synced_at` e' cio'
-- che glielo ricorda.
--
-- =============================================================================
-- LA FASE
-- =============================================================================
--
-- `matches.round` esisteva da sempre ed era vuota su tutte le 5.963 partite
-- scritte dal backfill. Il worker chiedeva al VIS il campo `Round`, che **non
-- esiste**: si chiama `RoundName`. Il VIS ignora in silenzio un campo che non
-- conosce — nessun errore, nessun attributo nella risposta — esattamente come
-- ignorava il filtro messo sugli attributi di `<Request>` invece che in
-- `<Filter>` (issue #90). Due volte lo stesso silenzio, due difetti scoperti
-- solo guardando i dati.
--
-- Le partite gia' scaricate NON hanno la fase e non la avranno finche' non
-- verranno riscaricate: questa migration aggiunge la colonna al modello di
-- lettura, non inventa cio' che non e' mai stato chiesto.

BEGIN;

-- =============================================================================
-- 1. IL SEGNATEMPO DEL RINFRESCO TORNEI
-- =============================================================================

ALTER TABLE public.sync_backlog_config
  ADD COLUMN IF NOT EXISTS tournaments_synced_at TIMESTAMPTZ;

COMMENT ON COLUMN public.sync_backlog_config.tournaments_synced_at IS
  'Quando `tournaments` e'' stata rinfrescata dall''archivio VIS l''ultima '
  'volta. Il worker rinfresca se e'' NULL o piu'' vecchia di 24h: una '
  'richiesta al giorno, non una per ciclo. Migration 025, issue #91.';

-- =============================================================================
-- 2. LE COLONNE NUOVE DEL MODELLO DI LETTURA
-- =============================================================================

ALTER TABLE public.referee_tournament_stats
  ADD COLUMN IF NOT EXISTS gender TEXT;

ALTER TABLE public.referee_match_log
  ADD COLUMN IF NOT EXISTS gender     TEXT,
  ADD COLUMN IF NOT EXISTS round_name TEXT;

COMMENT ON COLUMN public.referee_tournament_stats.gender IS
  '"M" | "W" | "MIXED", tradotto dal codice numerico del VIS gia'' nel worker: '
  'uno "0" che arriva alla pagina e'' un numero che qualcuno interpretera'' '
  'come "zero partite". NULL se il torneo non e'' ancora in `tournaments`.';

COMMENT ON COLUMN public.referee_match_log.round_name IS
  'Fase del torneo ("Pool A", "Round 1", ...). Viene da `matches.round`, che '
  'il worker riempie da `RoundName` — non da `Round`, che nel VIS non esiste. '
  'NULL per le partite scaricate prima della migration 025.';

-- =============================================================================
-- 3. IL RICALCOLO
-- =============================================================================

DROP FUNCTION IF EXISTS public.refresh_referee_stats();

CREATE FUNCTION public.refresh_referee_stats()
RETURNS TABLE (season_rows INTEGER, career_rows INTEGER,
               tournament_rows INTEGER, match_rows INTEGER)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  s INTEGER;
  c INTEGER;
  t INTEGER;
  m INTEGER;
BEGIN
  CREATE TEMP TABLE _designazioni ON COMMIT DROP AS
  SELECT r.vis_referee_no,
         r.referee_id                         AS referee_name,
         r.federation_code,
         EXTRACT(YEAR FROM mt.local_date)::INT AS season,
         mt.no                                AS match_no,
         mt.tournament_no,
         tn.name                              AS tournament_name,
         tn.country,
         tn.gender,
         mt.local_date,
         mt.local_time::TEXT                  AS local_time,
         mt.round                             AS round_name,
         mt.team_a_name,
         mt.team_b_name,
         mt.match_points_a,
         mt.match_points_b,
         mt.status,
         mr.role
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
    matches, as_first, as_second, tournaments, first_match, last_match
  )
  SELECT vis_referee_no,
         season,
         (array_agg(referee_name    ORDER BY local_date DESC))[1],
         (array_agg(federation_code ORDER BY local_date DESC))[1],
         count(*),
         count(*) FILTER (WHERE role = 'FIRST'),
         count(*) FILTER (WHERE role = 'SECOND'),
         count(DISTINCT tournament_no),
         min(local_date),
         max(local_date)
    FROM _designazioni
   GROUP BY vis_referee_no, season;
  GET DIAGNOSTICS s = ROW_COUNT;

  DELETE FROM public.referee_career_stats WHERE true;
  INSERT INTO public.referee_career_stats (
    vis_referee_no, referee_name, federation_code,
    matches, as_first, as_second, tournaments, seasons, first_match, last_match
  )
  SELECT vis_referee_no,
         (array_agg(referee_name    ORDER BY local_date DESC))[1],
         (array_agg(federation_code ORDER BY local_date DESC))[1],
         count(*),
         count(*) FILTER (WHERE role = 'FIRST'),
         count(*) FILTER (WHERE role = 'SECOND'),
         count(DISTINCT tournament_no),
         count(DISTINCT season),
         min(local_date),
         max(local_date)
    FROM _designazioni
   GROUP BY vis_referee_no;
  GET DIAGNOSTICS c = ROW_COUNT;

  DELETE FROM public.referee_tournament_stats WHERE true;
  INSERT INTO public.referee_tournament_stats (
    vis_referee_no, tournament_no, tournament_name, country, gender, season,
    matches, as_first, as_second, first_match, last_match
  )
  SELECT vis_referee_no,
         tournament_no,
         (array_agg(tournament_name ORDER BY local_date DESC))[1],
         (array_agg(country         ORDER BY local_date DESC))[1],
         (array_agg(gender          ORDER BY local_date DESC))[1],
         (array_agg(season          ORDER BY local_date DESC))[1],
         count(*),
         count(*) FILTER (WHERE role = 'FIRST'),
         count(*) FILTER (WHERE role = 'SECOND'),
         min(local_date),
         max(local_date)
    FROM _designazioni
   GROUP BY vis_referee_no, tournament_no;
  GET DIAGNOSTICS t = ROW_COUNT;

  DELETE FROM public.referee_match_log WHERE true;
  INSERT INTO public.referee_match_log (
    vis_referee_no, match_no, tournament_no, tournament_name, gender, season,
    local_date, local_time, round_name, role, team_a_name, team_b_name,
    match_points_a, match_points_b, status
  )
  SELECT DISTINCT ON (vis_referee_no, match_no)
         vis_referee_no, match_no, tournament_no, tournament_name, gender, season,
         local_date, local_time, round_name, role, team_a_name, team_b_name,
         match_points_a, match_points_b, status
    FROM _designazioni
   ORDER BY vis_referee_no, match_no, role;
  GET DIAGNOSTICS m = ROW_COUNT;

  DROP TABLE _designazioni;

  season_rows     := s;
  career_rows     := c;
  tournament_rows := t;
  match_rows      := m;
  RETURN NEXT;
END $$;

COMMENT ON FUNCTION public.refresh_referee_stats() IS
  'Ricalcola INTEGRALMENTE le quattro tabelle di sintesi da `match_referees`. '
  'Una sola funzione per tutte: separarle permetterebbe di mostrare un totale '
  'che non corrisponde al suo dettaglio. I DELETE portano `WHERE true` per '
  '`safeupdate` (023). Genere e fase dalla 025. Issue #91.';

REVOKE ALL ON FUNCTION public.refresh_referee_stats() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.refresh_referee_stats() TO service_role;

-- Le colonne nuove non cambiano i permessi, ma la verifica costa nulla e la
-- sua assenza costerebbe molto.
DO $$
DECLARE
  t TEXT;
  v TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY['referee_tournament_stats', 'referee_match_log',
                           'referee_season_stats', 'referee_career_stats'] LOOP
    IF NOT has_table_privilege('anon', 'public.' || t, 'SELECT') THEN
      RAISE EXCEPTION 'anon non legge %', t;
    END IF;
    FOREACH v IN ARRAY ARRAY['INSERT', 'UPDATE', 'DELETE'] LOOP
      IF has_table_privilege('anon', 'public.' || t, v) THEN
        RAISE EXCEPTION 'anon puo'' fare % su %', v, t;
      END IF;
    END LOOP;
  END LOOP;

  FOREACH t IN ARRAY ARRAY['matches', 'match_referees', 'referees', 'tournaments'] LOOP
    IF has_table_privilege('anon', 'public.' || t, 'SELECT') THEN
      RAISE EXCEPTION 'anon legge %', t;
    END IF;
  END LOOP;
END $$;

INSERT INTO public.schema_versions (version, description)
SELECT '4.5.0',
       'Issue #91: genere del torneo e fase della partita nel modello di '
       'lettura; `tournaments_synced_at` per il rinfresco giornaliero di '
       '`tournaments` dall''archivio VIS.'
WHERE NOT EXISTS (
  SELECT 1 FROM public.schema_versions WHERE version = '4.5.0'
);

COMMIT;
