-- Migration 019: la coda del backfill graduale dello storico VIS
-- Issue #90. Dipende da 018 (issue #89), che ha ricreato `match_referees`.
--
-- =============================================================================
-- COSA MANCA, E PERCHE' NON BASTA QUELLO CHE C'E' GIA'
-- =============================================================================
--
-- Il database ha 9.570 partite, ma provenienti da **19 tornei su 236**, e
-- nessuna di esse porta l'identificativo VIS dell'arbitro
-- (`matches.no_referee1` popolata su 0 righe di 9.570 — misurato in #89).
-- Le statistiche arbitro non si possono costruire da li'.
--
-- Un'infrastruttura di sync esiste (`vis-data-sync`, `tournament-master-sync`,
-- il cron della migration 003) ed e' di forma "prendi i tornei recenti e
-- upsertali". Cio' che manca non e' "come scrivo una riga": e' **la coda** —
-- il meccanismo che macina ~1.000 eventi storici un pezzo alla volta, riprende
-- dopo un errore, e non riparte da capo.
--
-- (Nota operativa emersa in #89: `vis-adapter` **non e' deployata** — risponde
-- `NOT_FOUND` — e `vis-data-sync`, che la chiama a ogni sync, e' deployata. Il
-- worker di questa issue parla quindi direttamente col VIS invece di passare
-- da un ponte che non c'e'. La regola "nulla raggiunge il VIS se non tramite
-- VisApiClient" vale per l'app, non per le Edge Function: il suo scopo e' che
-- l'audit dell'app non sia cieco, e `__tests__/no-direct-vis-fetch.test.ts`
-- non a caso non guarda dentro `supabase/`.)
--
-- =============================================================================
-- PERCHE' LA LOGICA DI CODA STA QUI E NON NEL WORKER
-- =============================================================================
--
-- Prelievo, backoff e completamento sono funzioni SQL, non codice Deno. Due
-- ragioni, entrambe pratiche:
--
--   1. `FOR UPDATE SKIP LOCKED` e' l'unico modo corretto di far prelevare due
--      esecuzioni sovrapposte senza che lavorino la stessa unita'. E' una
--      primitiva del database: implementarla nel worker significherebbe
--      reimplementarla male.
--   2. Cosi' la semantica della coda si prova con un PostgreSQL in Docker,
--      senza Deno, senza rete e senza il VIS — vedi
--      `supabase/tests/sync_backlog.test.sql`. Il worker resta un guscio che
--      fa solo I/O, cioe' la parte che non si puo' testare comunque.
--
-- Applicare questa migration e' sicuro e ripetibile.

BEGIN;

-- =============================================================================
-- SEZIONE 1: LA CODA
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.sync_backlog (
  event_no      TEXT        PRIMARY KEY,
  season        INTEGER,
  status        TEXT        NOT NULL DEFAULT 'pending'
                            CHECK (status IN ('pending', 'running', 'done', 'failed')),
  attempts      INTEGER     NOT NULL DEFAULT 0,
  last_error    TEXT,
  claimed_at    TIMESTAMPTZ,
  not_before    TIMESTAMPTZ NOT NULL DEFAULT now(),
  matches_seen  INTEGER,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.sync_backlog IS
  'Una riga per unita'' di lavoro del backfill: un evento VIS. La chiave '
  'primaria e'' `event_no`, quindi riseminare la coda non duplica il lavoro '
  '(issue #90).';

COMMENT ON COLUMN public.sync_backlog.not_before IS
  'Backoff. Un''unita'' fallita torna `pending` con `not_before` nel futuro, '
  'cosi'' il prelievo la ignora finche'' non e'' il momento. Senza questa '
  'colonna un errore permanente verrebbe ritentato a ogni ciclo, cioe'' ogni '
  '15 minuti per sempre.';

COMMENT ON COLUMN public.sync_backlog.season IS
  'Stagione dell''evento. Serve all''ORDINE: la coda si lavora dal piu'' '
  'recente, cosi'' le stagioni che interessano davvero alle statistiche sono '
  'complete nelle prime ore e lo storico profondo si riempie dietro.';

-- L'indice che serve al prelievo: filtra su status e not_before, ordina per
-- stagione decrescente. Parziale, perche' le righe `done` sono la maggioranza
-- a regime e non vengono mai prelevate.
CREATE INDEX IF NOT EXISTS idx_sync_backlog_claimable
  ON public.sync_backlog (season DESC NULLS LAST, event_no)
  WHERE status IN ('pending', 'running');

CREATE INDEX IF NOT EXISTS idx_sync_backlog_status
  ON public.sync_backlog (status);

-- =============================================================================
-- SEZIONE 2: LA CONFIGURAZIONE, MODIFICABILE SENZA REDEPLOY
-- =============================================================================
--
-- Il ritmo e' basso di proposito (decisione di Davide, #90): un worker lento
-- non incontra mai il throttling del VIS, quindi non genera i fallimenti che
-- poi vanno ri-accodati. ~1.000 eventi a 480/giorno = ~2 giorni.
--
-- Vive in tabella e non in variabili d'ambiente della function perche'
-- cambiare una variabile d'ambiente su Supabase e' un redeploy, e il punto di
-- queste manopole e' poterle girare mentre il backfill sta girando.

CREATE TABLE IF NOT EXISTS public.sync_backlog_config (
  id                  BOOLEAN PRIMARY KEY DEFAULT true CHECK (id),  -- riga singola
  batch_size          INTEGER NOT NULL DEFAULT 5   CHECK (batch_size BETWEEN 1 AND 100),
  vis_concurrency     INTEGER NOT NULL DEFAULT 2   CHECK (vis_concurrency BETWEEN 1 AND 8),
  max_attempts        INTEGER NOT NULL DEFAULT 5   CHECK (max_attempts BETWEEN 1 AND 20),
  backoff_base_secs   INTEGER NOT NULL DEFAULT 900 CHECK (backoff_base_secs >= 60),
  stale_claim_secs    INTEGER NOT NULL DEFAULT 1800,
  enabled             BOOLEAN NOT NULL DEFAULT true,
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON COLUMN public.sync_backlog_config.vis_concurrency IS
  'Richieste VIS in volo contemporaneamente. Default 2 = meta'' del semaforo '
  'dell''app (`VIS_MAX_CONCURRENT_REQUESTS` = 4). Alzarlo non rende il '
  'backfill piu'' veloce se il VIS throttla: crea solo unita'' fallite da '
  'ri-accodare.';

COMMENT ON COLUMN public.sync_backlog_config.stale_claim_secs IS
  'Un''unita'' `running` da piu'' di questo tempo e'' considerata abbandonata '
  '(worker morto a meta'') e torna prelevabile. Senza, un timeout della Edge '
  'Function lascerebbe l''unita'' bloccata per sempre.';

COMMENT ON COLUMN public.sync_backlog_config.enabled IS
  'Interruttore: a false il prelievo restituisce zero unita''. Fermare il '
  'backfill non richiede di toccare il cron ne'' di ridepositare la function.';

INSERT INTO public.sync_backlog_config (id)
SELECT true
WHERE NOT EXISTS (SELECT 1 FROM public.sync_backlog_config);

-- =============================================================================
-- SEZIONE 3: PRELIEVO ATOMICO
-- =============================================================================

CREATE OR REPLACE FUNCTION public.claim_backfill_batch()
RETURNS SETOF public.sync_backlog
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  cfg public.sync_backlog_config;
BEGIN
  SELECT * INTO cfg FROM public.sync_backlog_config LIMIT 1;

  IF cfg IS NULL OR NOT cfg.enabled THEN
    RETURN;  -- interruttore aperto: nessuna unita', nessun errore
  END IF;

  RETURN QUERY
  WITH claimable AS (
    SELECT b.event_no
      FROM public.sync_backlog b
     WHERE (
             (b.status = 'pending' AND b.not_before <= now())
             OR
             -- Unita' abbandonate da un worker morto a meta'.
             (b.status = 'running' AND b.claimed_at < now() - make_interval(secs => cfg.stale_claim_secs))
           )
     ORDER BY b.season DESC NULLS LAST, b.event_no
     LIMIT cfg.batch_size
     -- SKIP LOCKED e' il punto di tutta la funzione: due esecuzioni
     -- sovrapposte prendono unita' DIVERSE invece di aspettarsi a vicenda o,
     -- peggio, lavorare la stessa.
     FOR UPDATE SKIP LOCKED
  )
  UPDATE public.sync_backlog b
     SET status     = 'running',
         claimed_at = now(),
         updated_at = now()
    FROM claimable c
   WHERE b.event_no = c.event_no
  RETURNING b.*;
END;
$$;

COMMENT ON FUNCTION public.claim_backfill_batch() IS
  'Preleva atomicamente fino a `batch_size` unita'' e le marca `running`. '
  'Rispetta l''interruttore `enabled`, il backoff (`not_before`) e recupera '
  'le unita'' abbandonate. Issue #90.';

-- =============================================================================
-- SEZIONE 4: ESITO
-- =============================================================================

CREATE OR REPLACE FUNCTION public.complete_backfill_item(
  p_event_no     TEXT,
  p_matches_seen INTEGER DEFAULT NULL
)
RETURNS VOID
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  UPDATE public.sync_backlog
     SET status       = 'done',
         last_error   = NULL,
         claimed_at   = NULL,
         matches_seen = COALESCE(p_matches_seen, matches_seen),
         updated_at   = now()
   WHERE event_no = p_event_no;
$$;

CREATE OR REPLACE FUNCTION public.fail_backfill_item(
  p_event_no TEXT,
  p_error    TEXT
)
RETURNS public.sync_backlog
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  cfg public.sync_backlog_config;
  out_row public.sync_backlog;
BEGIN
  SELECT * INTO cfg FROM public.sync_backlog_config LIMIT 1;

  UPDATE public.sync_backlog b
     SET attempts   = b.attempts + 1,
         last_error = left(p_error, 2000),
         claimed_at = NULL,
         updated_at = now(),
         -- Oltre il tetto l'unita' si ferma in `failed`: resta visibile con il
         -- suo errore invece di essere ritentata per sempre in silenzio.
         status     = CASE WHEN b.attempts + 1 >= cfg.max_attempts
                           THEN 'failed' ELSE 'pending' END,
         -- Backoff esponenziale a partire da `backoff_base_secs`.
         not_before = now() + make_interval(
                        secs => cfg.backoff_base_secs * power(2, least(b.attempts, 5))::int)
   WHERE b.event_no = p_event_no
  RETURNING b.* INTO out_row;

  RETURN out_row;
END;
$$;

COMMENT ON FUNCTION public.fail_backfill_item(TEXT, TEXT) IS
  'Registra un fallimento: incrementa `attempts`, salva l''errore, e rimette '
  'l''unita'' in coda con backoff esponenziale — oppure la ferma in `failed` '
  'oltre `max_attempts`. Nessun lavoro si perde in silenzio. Issue #90.';

-- =============================================================================
-- SEZIONE 5: SEMINA, RIESEGUIBILE
-- =============================================================================

CREATE OR REPLACE FUNCTION public.seed_backfill_event(
  p_event_no TEXT,
  p_season   INTEGER DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  inserted BOOLEAN;
BEGIN
  INSERT INTO public.sync_backlog (event_no, season)
  VALUES (p_event_no, p_season)
  ON CONFLICT (event_no) DO NOTHING;

  GET DIAGNOSTICS inserted = ROW_COUNT;
  RETURN inserted;
END;
$$;

COMMENT ON FUNCTION public.seed_backfill_event(TEXT, INTEGER) IS
  'Aggiunge un evento alla coda se non c''e'' gia''. Rieseguibile: una '
  'risemina dopo che il VIS ha pubblicato nuovi eventi aggiunge solo quelli '
  'nuovi e non resuscita le unita'' gia'' completate. Issue #90.';

-- =============================================================================
-- SEZIONE 6: OSSERVABILITA'
-- =============================================================================

CREATE OR REPLACE VIEW public.sync_backlog_progress AS
SELECT
  count(*)                                                   AS total,
  count(*) FILTER (WHERE status = 'pending')                 AS pending,
  count(*) FILTER (WHERE status = 'running')                 AS running,
  count(*) FILTER (WHERE status = 'done')                    AS done,
  count(*) FILTER (WHERE status = 'failed')                  AS failed,
  count(*) FILTER (WHERE status = 'pending' AND not_before > now()) AS waiting_backoff,
  sum(matches_seen)                                          AS matches_seen,
  min(season) FILTER (WHERE status <> 'done')                AS oldest_season_pending,
  max(season) FILTER (WHERE status <> 'done')                AS newest_season_pending,
  max(updated_at)                                            AS last_activity
FROM public.sync_backlog;

COMMENT ON VIEW public.sync_backlog_progress IS
  'Avanzamento del backfill in una riga. Issue #90.';

-- =============================================================================
-- SEZIONE 7: TUTTO CHIUSO AL PUBBLICO
-- =============================================================================
--
-- Stessa disciplina della 018: la 017 §2 dovrebbe gia' impedire che una nuova
-- tabella nasca leggibile, ma qui si revoca esplicitamente invece di fidarsi.
-- Queste sono tabelle operative: nessun client deve vederle, mai.

ALTER TABLE public.sync_backlog        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sync_backlog_config ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.sync_backlog, public.sync_backlog_config
  FROM anon, authenticated;
REVOKE ALL ON public.sync_backlog_progress FROM anon, authenticated;

GRANT ALL ON public.sync_backlog, public.sync_backlog_config TO service_role;
GRANT SELECT ON public.sync_backlog_progress TO service_role;

DROP POLICY IF EXISTS sync_backlog_service_all ON public.sync_backlog;
CREATE POLICY sync_backlog_service_all ON public.sync_backlog
  FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS sync_backlog_config_service_all ON public.sync_backlog_config;
CREATE POLICY sync_backlog_config_service_all ON public.sync_backlog_config
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Le funzioni sono SECURITY DEFINER: eseguibili SOLO da service_role, mai dal
-- pubblico. `claim_backfill_batch` scrive, e una funzione SECURITY DEFINER
-- lasciata a `anon` sarebbe un modo elegante di riaprire cio' che la 017 ha
-- chiuso.
REVOKE ALL ON FUNCTION public.claim_backfill_batch()                  FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.complete_backfill_item(TEXT, INTEGER)   FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.fail_backfill_item(TEXT, TEXT)          FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.seed_backfill_event(TEXT, INTEGER)      FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.claim_backfill_batch()                TO service_role;
GRANT EXECUTE ON FUNCTION public.complete_backfill_item(TEXT, INTEGER) TO service_role;
GRANT EXECUTE ON FUNCTION public.fail_backfill_item(TEXT, TEXT)        TO service_role;
GRANT EXECUTE ON FUNCTION public.seed_backfill_event(TEXT, INTEGER)    TO service_role;

DO $$
DECLARE
  leaked TEXT;
BEGIN
  SELECT string_agg(DISTINCT table_name || ':' || grantee, ', ') INTO leaked
    FROM information_schema.role_table_grants
   WHERE table_schema = 'public'
     AND table_name IN ('sync_backlog', 'sync_backlog_config', 'sync_backlog_progress')
     AND grantee IN ('anon', 'authenticated');

  IF leaked IS NOT NULL THEN
    RAISE EXCEPTION 'le tabelle della coda sono raggiungibili dai ruoli pubblici (%)', leaked;
  END IF;
END $$;

-- =============================================================================
-- SEZIONE 8: VERSIONE
-- =============================================================================
--
-- `INSERT ... WHERE NOT EXISTS` e non `ON CONFLICT DO NOTHING`: `schema_versions`
-- non ha un vincolo univoco su `version`, quindi quella clausola non avrebbe
-- nulla con cui confliggere e duplicherebbe la riga a ogni riapplicazione.
-- Difetto trovato dai test della 018 (issue #89).
INSERT INTO public.schema_versions (version, description)
SELECT '4.2.0',
       'Issue #90: coda del backfill VIS (sync_backlog), con prelievo atomico '
       'SKIP LOCKED, backoff esponenziale, configurazione a caldo e recupero '
       'delle unita'' abbandonate'
WHERE NOT EXISTS (
  SELECT 1 FROM public.schema_versions WHERE version = '4.2.0'
);

COMMIT;

-- =============================================================================
-- IL CRON — DA ESEGUIRE A PARTE, NON QUI
-- =============================================================================
--
-- La schedule non sta in questa migration perche' ha bisogno dell'URL del
-- progetto e della service_role key, che NON devono finire in un file
-- versionato su una repository pubblica (issue #56). Vanno lette dal Vault,
-- come gia' fa `supabase/manual/TRIGGER-SYNC-FUNCTION.sql`.
--
-- Ogni 15 minuti = 96 esecuzioni/giorno x 5 eventi = ~480 eventi/giorno.
--
--   SELECT cron.schedule(
--     'backfill-worker',
--     '*/15 * * * *',
--     $cron$
--     SELECT net.http_post(
--       url     := 'https://<ref>.supabase.co/functions/v1/backfill-worker',
--       headers := jsonb_build_object(
--                    'Content-Type', 'application/json',
--                    'Authorization', 'Bearer ' || (SELECT decrypted_secret
--                                                     FROM vault.decrypted_secrets
--                                                    WHERE name = 'service_role_key')),
--       body    := '{"source":"cron"}'::jsonb
--     );
--     $cron$
--   );
--
-- Per fermare il backfill NON serve toccare il cron:
--   UPDATE public.sync_backlog_config SET enabled = false;
