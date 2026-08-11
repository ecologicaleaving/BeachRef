-- Migration 024: dal totale ai singoli tornei e alle singole partite (issue #91)
--
-- =============================================================================
-- IL PROBLEMA CHE RISOLVE
-- =============================================================================
--
-- La pagina statistiche mostra che un arbitro ha 110 partite. Per aprire quel
-- numero e vedere DOVE, servono le partite — e le partite sono chiuse ai ruoli
-- pubblici, per scelta (migration 017, riaperta di una tabella alla volta dalla
-- #54).
--
-- La strada sbagliata sarebbe aprire `matches` e `match_referees`: darebbe alla
-- pagina cio' che le serve e a chiunque altro molto di piu'. La strada giusta
-- e' la stessa gia' presa dalla 022 — un modello di LETTURA denormalizzato,
-- che contiene esattamente cio' che si vuole mostrare e nient'altro:
--
--   referee_tournament_stats  una riga per (arbitro, torneo)
--   referee_match_log         una riga per (arbitro, partita)
--
-- Entrambe derivate da `match_referees`, cioe' per identita' VIS. `matches`,
-- `match_referees` e `referees` restano chiuse.
--
-- =============================================================================
-- COSA C'E' DENTRO, E COSA NO
-- =============================================================================
--
-- Ci sono: data, torneo, ruolo, squadre, punteggio. Sono tutti dati che il VIS
-- pubblica su ogni tabellone, per chiunque, senza autenticazione. Aggregarli
-- non li rende piu' sensibili di quanto gia' siano.
--
-- Non c'e' nulla dell'anagrafica arbitro oltre nome e federazione — niente
-- livello, genere, anni di esperienza, stato: sono in `referees`, e `referees`
-- non si apre.
--
-- Il nome del torneo arriva da `tournaments` con una LEFT JOIN: la tabella
-- copre 236 tornei e il backfill non la riempie, quindi per molti tornei il
-- nome mancherà. In quel caso resta il numero VIS, che e' comunque un
-- riferimento utilizzabile — meglio di una riga assente.

BEGIN;

-- =============================================================================
-- 1. LE TABELLE
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.referee_tournament_stats (
  vis_referee_no  TEXT NOT NULL,
  tournament_no   TEXT NOT NULL,
  tournament_name TEXT,
  country         TEXT,
  season          INTEGER,
  matches         INTEGER NOT NULL DEFAULT 0,
  as_first        INTEGER NOT NULL DEFAULT 0,
  as_second       INTEGER NOT NULL DEFAULT 0,
  first_match     DATE,
  last_match      DATE,
  computed_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (vis_referee_no, tournament_no)
);

CREATE TABLE IF NOT EXISTS public.referee_match_log (
  vis_referee_no  TEXT NOT NULL,
  match_no        TEXT NOT NULL,
  tournament_no   TEXT,
  tournament_name TEXT,
  season          INTEGER,
  local_date      DATE,
  local_time      TEXT,
  role            TEXT,
  team_a_name     TEXT,
  team_b_name     TEXT,
  match_points_a  INTEGER,
  match_points_b  INTEGER,
  status          TEXT,
  computed_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (vis_referee_no, match_no)
);

COMMENT ON TABLE public.referee_tournament_stats IS
  'Una riga per (arbitro, torneo): il livello intermedio fra il totale di '
  '`referee_career_stats` e le singole partite di `referee_match_log`. '
  'Issue #91.';

COMMENT ON TABLE public.referee_match_log IS
  'Registro delle singole partite arbitrate, denormalizzato. Esiste perche'' '
  'la pagina possa mostrare il dettaglio SENZA che `matches` e '
  '`match_referees` vengano aperte ai ruoli pubblici. Contiene solo dati che '
  'il VIS pubblica gia'' su ogni tabellone. Issue #91.';

CREATE INDEX IF NOT EXISTS idx_referee_tournament_stats_ref
  ON public.referee_tournament_stats (vis_referee_no, season DESC);

CREATE INDEX IF NOT EXISTS idx_referee_match_log_ref
  ON public.referee_match_log (vis_referee_no, local_date DESC);

CREATE INDEX IF NOT EXISTS idx_referee_match_log_torneo
  ON public.referee_match_log (vis_referee_no, tournament_no);

-- =============================================================================
-- 2. IL RICALCOLO, ESTESO
-- =============================================================================
--
-- Stessa funzione della 022/023: chi la chiama non cambia (il worker, a fine
-- ciclo) e le quattro tabelle si riempiono insieme. Tenerle in due funzioni
-- separate permetterebbe di aggiornarne una e non l'altra, cioe' di mostrare
-- un totale che non corrisponde al dettaglio sottostante.

-- DROP e non CREATE OR REPLACE: la funzione restituiva due conteggi e ora ne
-- restituisce quattro, e PostgreSQL rifiuta di cambiare il tipo di ritorno di
-- una funzione esistente. Il DROP e' sicuro — non ci sono dipendenze, e i
-- permessi vengono riassegnati qui sotto: una funzione ricreata nasce con i
-- default, cioe' eseguibile da PUBLIC, che e' esattamente cio' che non deve
-- essere.
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
         mt.local_date,
         -- `matches.local_time` e' un `time without time zone`; qui serve una
         -- stringa da mostrare, e il cast va fatto ora perche' in INSERT non
         -- avverrebbe da solo.
         mt.local_time::TEXT AS local_time,
         mt.team_a_name,
         mt.team_b_name,
         mt.match_points_a,
         mt.match_points_b,
         mt.status,
         mr.role
    FROM public.match_referees mr
    JOIN public.matches  mt ON mt.id = mr.match_id
    JOIN public.referees r  ON r.id  = mr.referee_id
    -- LEFT: un torneo senza nome non deve far sparire le sue partite.
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
    vis_referee_no, tournament_no, tournament_name, country, season,
    matches, as_first, as_second, first_match, last_match
  )
  SELECT vis_referee_no,
         tournament_no,
         (array_agg(tournament_name ORDER BY local_date DESC))[1],
         (array_agg(country         ORDER BY local_date DESC))[1],
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
  -- DISTINCT ON: la chiave e' (arbitro, partita), e un arbitro non puo'
  -- comparire due volte nella stessa partita — ma se `match_referees` avesse
  -- una doppia riga, meglio una partita sola che un errore di chiave che fa
  -- fallire l'intero ricalcolo.
  INSERT INTO public.referee_match_log (
    vis_referee_no, match_no, tournament_no, tournament_name, season,
    local_date, local_time, role, team_a_name, team_b_name,
    match_points_a, match_points_b, status
  )
  SELECT DISTINCT ON (vis_referee_no, match_no)
         vis_referee_no, match_no, tournament_no, tournament_name, season,
         local_date, local_time, role, team_a_name, team_b_name,
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
  'Ricalcola INTEGRALMENTE le QUATTRO tabelle di sintesi da `match_referees`. '
  'Una sola funzione per tutte: separarle permetterebbe di aggiornarne una e '
  'non l''altra, cioe'' di mostrare un totale che non corrisponde al suo '
  'dettaglio. I DELETE portano `WHERE true` per `safeupdate` (023). Issue #91.';

REVOKE ALL ON FUNCTION public.refresh_referee_stats() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.refresh_referee_stats() TO service_role;

-- =============================================================================
-- 3. LETTURA, E SOLO LETTURA
-- =============================================================================

ALTER TABLE public.referee_tournament_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.referee_match_log        ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS referee_tournament_stats_public_read ON public.referee_tournament_stats;
CREATE POLICY referee_tournament_stats_public_read
  ON public.referee_tournament_stats FOR SELECT TO anon, authenticated
  USING (true);

DROP POLICY IF EXISTS referee_match_log_public_read ON public.referee_match_log;
CREATE POLICY referee_match_log_public_read
  ON public.referee_match_log FOR SELECT TO anon, authenticated
  USING (true);

GRANT SELECT ON public.referee_tournament_stats TO anon, authenticated;
GRANT SELECT ON public.referee_match_log        TO anon, authenticated;

DO $$
DECLARE
  t TEXT;
  v TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY['referee_tournament_stats', 'referee_match_log'] LOOP
    FOREACH v IN ARRAY ARRAY['INSERT', 'UPDATE', 'DELETE', 'TRUNCATE'] LOOP
      IF has_table_privilege('anon', 'public.' || t, v)
      OR has_table_privilege('authenticated', 'public.' || t, v) THEN
        RAISE EXCEPTION 'i ruoli pubblici hanno % su %', v, t;
      END IF;
    END LOOP;
    IF NOT has_table_privilege('anon', 'public.' || t, 'SELECT') THEN
      RAISE EXCEPTION 'anon non puo'' leggere %', t;
    END IF;
  END LOOP;

  -- E cio' che il modello di lettura esiste per NON aprire, resta chiuso.
  FOREACH t IN ARRAY ARRAY['matches', 'match_referees', 'referees', 'tournaments'] LOOP
    IF has_table_privilege('anon', 'public.' || t, 'SELECT') THEN
      RAISE EXCEPTION 'anon legge %: il modello di lettura non serviva a nulla', t;
    END IF;
  END LOOP;
END $$;

INSERT INTO public.schema_versions (version, description)
SELECT '4.4.0',
       'Issue #91: referee_tournament_stats e referee_match_log — il dettaglio '
       'per torneo e per partita, senza aprire matches ne'' match_referees.'
WHERE NOT EXISTS (
  SELECT 1 FROM public.schema_versions WHERE version = '4.4.0'
);

COMMIT;
