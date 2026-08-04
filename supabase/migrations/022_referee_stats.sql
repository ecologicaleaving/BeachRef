-- Migration 022: le statistiche arbitro, aggregate una volta sola (issue #91)
--
-- =============================================================================
-- COSA CALCOLA, E DA DOVE
-- =============================================================================
--
-- Due tabelle di sintesi, entrambe derivate da `match_referees` — cioe' dal
-- legame per IDENTITA' (`vis_referee_no`), mai dai nomi scritti su `matches`.
-- La ragione sta nella migration 018 e si vede a occhio nudo sui dati veri:
-- la stessa partita ha `matches.referee1_name = 'Nicholson Brady'` mentre
-- `referees.referee_id = 'Brady Nicholson'`. Cognome-nome contro nome-cognome,
-- sulla stessa persona. Un'aggregazione costruita sui nomi produrrebbe numeri
-- plausibili e sbagliati, che e' la peggiore categoria di numeri.
--
--   referee_season_stats  una riga per (arbitro, stagione)
--   referee_career_stats  una riga per arbitro, su tutte le stagioni
--
-- La stagione e' l'anno di `matches.local_date`, non la stagione dell'evento
-- in `sync_backlog`: le statistiche parlano di quando si e' arbitrato, e un
-- torneo a cavallo di due anni non deve spostare partite da un anno all'altro.
--
-- =============================================================================
-- PERCHE' TABELLE E NON VISTE
-- =============================================================================
--
-- Una vista sarebbe piu' semplice e sempre aggiornata. Sono tabelle per una
-- ragione che non e' la prestazione:
--
-- Il database e' chiuso per difetto (migration 017, `supabase/RLS.md`), e la
-- issue #54 riapre le letture UNA TABELLA ALLA VOLTA. Una vista sulle partite
-- richiederebbe il permesso di leggere le partite: chi la interroga vedrebbe
-- l'aggregato, ma le righe sottostanti resterebbero esposte a chi sa scrivere
-- una query diversa. Queste due tabelle contengono SOLO conteggi e date, e
-- sono le uniche due cose che si aprono. `matches`, `match_referees` e
-- `referees` restano chiuse.
--
-- Il prezzo e' che vanno ricalcolate: `refresh_referee_stats()`, che il worker
-- di backfill chiama a fine ciclo.

BEGIN;

-- =============================================================================
-- 1. LE TABELLE
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.referee_season_stats (
  vis_referee_no  TEXT    NOT NULL,
  season          INTEGER NOT NULL,
  referee_name    TEXT,
  federation_code TEXT,
  matches         INTEGER NOT NULL DEFAULT 0,
  as_first        INTEGER NOT NULL DEFAULT 0,
  as_second       INTEGER NOT NULL DEFAULT 0,
  tournaments     INTEGER NOT NULL DEFAULT 0,
  first_match     DATE,
  last_match      DATE,
  computed_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (vis_referee_no, season)
);

CREATE TABLE IF NOT EXISTS public.referee_career_stats (
  vis_referee_no  TEXT    NOT NULL PRIMARY KEY,
  referee_name    TEXT,
  federation_code TEXT,
  matches         INTEGER NOT NULL DEFAULT 0,
  as_first        INTEGER NOT NULL DEFAULT 0,
  as_second       INTEGER NOT NULL DEFAULT 0,
  tournaments     INTEGER NOT NULL DEFAULT 0,
  seasons         INTEGER NOT NULL DEFAULT 0,
  first_match     DATE,
  last_match      DATE,
  computed_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.referee_season_stats IS
  'Statistiche arbitro per stagione, derivate da `match_referees` (identita'' '
  '`vis_referee_no`) e MAI dai nomi su `matches` — vedi migration 018. '
  'Ricalcolata da `refresh_referee_stats()`. Issue #91.';

COMMENT ON TABLE public.referee_career_stats IS
  'Come `referee_season_stats`, ma su tutte le stagioni. `seasons` conta gli '
  'anni in cui l''arbitro ha almeno una designazione. Issue #91.';

COMMENT ON COLUMN public.referee_season_stats.season IS
  'Anno di `matches.local_date` — quando si e'' arbitrato, non la stagione '
  'dell''evento: un torneo a cavallo d''anno non sposta partite.';

COMMENT ON COLUMN public.referee_season_stats.tournaments IS
  'Tornei DISTINTI, contati su `matches.tournament_no`.';

CREATE INDEX IF NOT EXISTS idx_referee_season_stats_season
  ON public.referee_season_stats (season DESC, matches DESC);

CREATE INDEX IF NOT EXISTS idx_referee_career_stats_matches
  ON public.referee_career_stats (matches DESC);

-- =============================================================================
-- 2. IL RICALCOLO
-- =============================================================================
--
-- Sostituzione integrale, non aggiornamento incrementale. Su queste dimensioni
-- (10^4 designazioni) costa una frazione di secondo, e in cambio non esiste
-- il modo di sbagliare che conta: una riga di sintesi rimasta indietro rispetto
-- ai dati, indistinguibile da una corretta.
--
-- SECURITY DEFINER perche' legge tabelle che i ruoli pubblici non possono
-- leggere. `search_path` fissato: senza, un `public` malevolo nel path di chi
-- chiama sceglierebbe da quali tabelle aggregare.

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

  DELETE FROM public.referee_season_stats;
  INSERT INTO public.referee_season_stats (
    vis_referee_no, season, referee_name, federation_code,
    matches, as_first, as_second, tournaments, first_match, last_match
  )
  SELECT vis_referee_no,
         season,
         -- Un arbitro ha un solo nome, ma se il VIS lo ha cambiato nel tempo
         -- si prende l'ultimo osservato invece di moltiplicare le righe.
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

  DELETE FROM public.referee_career_stats;
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
  'sarebbe indistinguibile da una corretta. Issue #91.';

-- Il ricalcolo lo fa il worker con la service_role. Nessun ruolo pubblico deve
-- poterlo innescare: e' l'unica scrittura che tocca queste tabelle.
REVOKE ALL ON FUNCTION public.refresh_referee_stats() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.refresh_referee_stats() TO service_role;

-- =============================================================================
-- 3. LE UNICHE DUE LETTURE APERTE
-- =============================================================================
--
-- La migration 017 ha chiuso `public` per intero. Qui si riapre il minimo:
-- SELECT su due tabelle di soli aggregati. Nessuna partita, nessuna
-- designazione, nessun dato personale oltre nome pubblico e federazione — che
-- sono gia' pubblicati dal VIS su ogni tabellone.
--
-- INSERT/UPDATE/DELETE restano negati: le tabelle si scrivono solo attraverso
-- `refresh_referee_stats()` con la service_role.

ALTER TABLE public.referee_season_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.referee_career_stats ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS referee_season_stats_public_read ON public.referee_season_stats;
CREATE POLICY referee_season_stats_public_read
  ON public.referee_season_stats FOR SELECT TO anon, authenticated
  USING (true);

DROP POLICY IF EXISTS referee_career_stats_public_read ON public.referee_career_stats;
CREATE POLICY referee_career_stats_public_read
  ON public.referee_career_stats FOR SELECT TO anon, authenticated
  USING (true);

GRANT SELECT ON public.referee_season_stats TO anon, authenticated;
GRANT SELECT ON public.referee_career_stats TO anon, authenticated;

-- Post-condizione: la riapertura deve essere di sola lettura. Un GRANT di
-- troppo qui vanificherebbe la 017 su queste due tabelle senza che nulla lo
-- segnali.
DO $$
DECLARE
  t TEXT;
  v TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY['referee_season_stats', 'referee_career_stats'] LOOP
    FOREACH v IN ARRAY ARRAY['INSERT', 'UPDATE', 'DELETE', 'TRUNCATE'] LOOP
      IF has_table_privilege('anon', 'public.' || t, v)
      OR has_table_privilege('authenticated', 'public.' || t, v) THEN
        RAISE EXCEPTION 'i ruoli pubblici hanno % su %: la 022 doveva aprire '
                        'solo la lettura', v, t;
      END IF;
    END LOOP;

    IF NOT has_table_privilege('anon', 'public.' || t, 'SELECT') THEN
      RAISE EXCEPTION 'anon non puo'' leggere %: la pagina statistiche non '
                      'avrebbe nulla da mostrare', t;
    END IF;
  END LOOP;
END $$;

INSERT INTO public.schema_versions (version, description)
SELECT '4.3.0',
       'Issue #91: referee_season_stats e referee_career_stats, aggregate da '
       'match_referees per identita''. Uniche due letture aperte ai ruoli '
       'pubblici dopo la migration 017.'
WHERE NOT EXISTS (
  SELECT 1 FROM public.schema_versions WHERE version = '4.3.0'
);

COMMIT;
