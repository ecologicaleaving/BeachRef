-- Migration 023: il ricalcolo statistiche contro la rete di sicurezza di
-- Supabase (issue #91)
--
-- =============================================================================
-- COSA E' SUCCESSO
-- =============================================================================
--
-- Primo `refresh_referee_stats()` sulla produzione, subito dopo la 022:
--
--   21000: DELETE requires a WHERE clause
--
-- Supabase carica `safeupdate` (supautils), che rifiuta DELETE e UPDATE privi
-- di WHERE. E' una protezione contro il classico "ho svuotato la tabella
-- sbagliata", ed e' attiva sulla produzione e NON sul PostgreSQL usa-e-getta
-- dei test: `postgres:15` e' un'immagine di base, senza le estensioni che
-- Supabase aggiunge.
--
-- Vale la pena essere espliciti sul perche' il test non lo ha preso, invece di
-- correggere e basta: e' la stessa lezione della sezione "Lo schema in questa
-- repo non e' lo schema in produzione" (issue #89). Il fixture riproduce le
-- TABELLE della produzione, non il suo AMBIENTE — estensioni, ruoli di
-- sistema, GUC. Una migration che passa in Docker resta da verificare sulla
-- produzione, e il modo di verificarla e' eseguirla.
--
-- =============================================================================
-- LA CORREZIONE
-- =============================================================================
--
-- `DELETE ... WHERE true` invece di `DELETE` nudo. Non e' un trucco per
-- aggirare la protezione: la protezione chiede che chi cancella tutto lo
-- dichiari, e qui cancellare tutto e' esattamente cio' che si vuole — il
-- ricalcolo sostituisce l'intera sintesi, perche' una riga rimasta indietro
-- rispetto ai dati e' indistinguibile da una corretta (vedi 022).
--
-- Non si usa TRUNCATE: sarebbe piu' veloce, ma prende un lock esclusivo sulla
-- tabella, e queste due tabelle sono le uniche che la pagina statistiche
-- legge. Un ricalcolo a fine ciclo di backfill non deve poter bloccare una
-- lettura.

BEGIN;

CREATE OR REPLACE FUNCTION public.refresh_referee_stats()
RETURNS TABLE (season_rows INTEGER, career_rows INTEGER)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  s INTEGER;
  c INTEGER;
BEGIN
  CREATE TEMP TABLE _designazioni ON COMMIT DROP AS
  SELECT r.vis_referee_no,
         r.referee_id                       AS referee_name,
         r.federation_code,
         EXTRACT(YEAR FROM m.local_date)::INT AS season,
         m.tournament_no,
         m.local_date,
         mr.role
    FROM public.match_referees mr
    JOIN public.matches  m ON m.id = mr.match_id
    JOIN public.referees r ON r.id = mr.referee_id
   WHERE m.local_date IS NOT NULL
     AND r.vis_referee_no IS NOT NULL;

  -- WHERE true: vedi l'intestazione. Cancellare tutto e' voluto, e qui lo si
  -- dichiara.
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

  DROP TABLE _designazioni;

  season_rows := s;
  career_rows := c;
  RETURN NEXT;
END $$;

COMMENT ON FUNCTION public.refresh_referee_stats() IS
  'Ricalcola INTEGRALMENTE le due tabelle di sintesi da `match_referees`. '
  'Sostituzione e non aggiornamento incrementale: una riga rimasta indietro '
  'sarebbe indistinguibile da una corretta. I DELETE portano `WHERE true` '
  'perche'' Supabase carica `safeupdate` e rifiuta i DELETE nudi — migration '
  '023. Issue #91.';

REVOKE ALL ON FUNCTION public.refresh_referee_stats() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.refresh_referee_stats() TO service_role;

INSERT INTO public.schema_versions (version, description)
SELECT '4.3.1',
       'Issue #91: refresh_referee_stats() usa DELETE ... WHERE true, perche'' '
       'l''estensione safeupdate di Supabase rifiuta i DELETE senza WHERE.'
WHERE NOT EXISTS (
  SELECT 1 FROM public.schema_versions WHERE version = '4.3.1'
);

COMMIT;
