-- Regression test per la migration 019 (issue #90).
--
-- Gira contro un PostgreSQL usa-e-getta, mai contro il progetto. Prova la
-- semantica della CODA — prelievo, ordine, backoff, recupero, chiusura — senza
-- Deno, senza rete e senza il VIS. E' la ragione per cui quella logica sta in
-- funzioni SQL e non nel worker: il worker fa solo I/O, e l'I/O non si prova
-- comunque; la coda invece e' dove si annidano gli errori di concorrenza.
--
--   bash supabase/tests/run-migration-tests.sh

\set ON_ERROR_STOP on

\ir fixtures/production_shape.sql
\ir ../migrations/018_restore_match_referees.sql
\ir ../migrations/019_sync_backlog.sql

-- =============================================================================
-- PARTE A: semina
-- =============================================================================

DO $$
DECLARE
  first_time BOOLEAN;
  again BOOLEAN;
  n INT;
BEGIN
  SELECT public.seed_backfill_event('E100', 2026) INTO first_time;
  IF NOT first_time THEN
    RAISE EXCEPTION 'A1 FALLITO: la prima semina non ha inserito nulla';
  END IF;

  SELECT public.seed_backfill_event('E100', 2026) INTO again;
  IF again THEN
    RAISE EXCEPTION 'A2 FALLITO: riseminare lo stesso evento lo ha duplicato';
  END IF;

  SELECT count(*) INTO n FROM public.sync_backlog WHERE event_no = 'E100';
  IF n <> 1 THEN
    RAISE EXCEPTION 'A2 FALLITO: % righe per E100', n;
  END IF;
  RAISE NOTICE 'A1/A2 ok: la semina e'' idempotente';
END $$;

-- Una coda con tre stagioni, per provare l'ordine.
SELECT public.seed_backfill_event('E-old-1', 2011);
SELECT public.seed_backfill_event('E-old-2', 2012);
SELECT public.seed_backfill_event('E-new-1', 2026);
SELECT public.seed_backfill_event('E-mid-1', 2020);

-- =============================================================================
-- PARTE B: prelievo — quantita', ordine, marcatura
-- =============================================================================

DO $$
DECLARE
  claimed TEXT[];
  n INT;
BEGIN
  UPDATE public.sync_backlog_config SET batch_size = 2;

  SELECT array_agg(event_no ORDER BY event_no) INTO claimed
    FROM public.claim_backfill_batch();

  IF array_length(claimed, 1) <> 2 THEN
    RAISE EXCEPTION 'B1 FALLITO: prelevate % unita'', batch_size e'' 2',
      array_length(claimed, 1);
  END IF;
  RAISE NOTICE 'B1 ok: il prelievo rispetta batch_size';

  -- Ordine: dal piu' recente. Le due stagioni piu' alte sono 2026 (E100 e
  -- E-new-1). Questa e' la proprieta' che rende le statistiche utilizzabili
  -- prima della fine del backfill.
  IF NOT (claimed @> ARRAY['E100', 'E-new-1']) THEN
    RAISE EXCEPTION 'B2 FALLITO: prelevate % invece delle stagioni piu'' recenti',
      claimed;
  END IF;
  RAISE NOTICE 'B2 ok: la coda si lavora dal piu'' recente';

  SELECT count(*) INTO n FROM public.sync_backlog WHERE status = 'running';
  IF n <> 2 THEN
    RAISE EXCEPTION 'B3 FALLITO: % unita'' in running, attese 2', n;
  END IF;
  RAISE NOTICE 'B3 ok: le unita'' prelevate sono marcate running';
END $$;

-- B4: un secondo prelievo non restituisce cio' che e' gia' in lavorazione.
-- E' la proprieta' che `FOR UPDATE SKIP LOCKED` garantisce fra transazioni
-- concorrenti, verificata qui al livello che conta: due esecuzioni non
-- lavorano la stessa unita'.
DO $$
DECLARE
  second TEXT[];
BEGIN
  SELECT array_agg(event_no) INTO second FROM public.claim_backfill_batch();

  IF second && ARRAY['E100', 'E-new-1'] THEN
    RAISE EXCEPTION 'B4 FALLITO: il secondo prelievo ha restituito unita'' gia'' '
                    'in lavorazione (%)', second;
  END IF;
  RAISE NOTICE 'B4 ok: due prelievi non si contendono la stessa unita''';
END $$;

-- =============================================================================
-- PARTE C: esito e backoff
-- =============================================================================

DO $$
DECLARE
  row_after public.sync_backlog;
BEGIN
  PERFORM public.complete_backfill_item('E100', 42);

  SELECT * INTO row_after FROM public.sync_backlog WHERE event_no = 'E100';
  IF row_after.status <> 'done' OR row_after.matches_seen <> 42 THEN
    RAISE EXCEPTION 'C1 FALLITO: dopo complete lo stato e'' %, matches_seen %',
      row_after.status, row_after.matches_seen;
  END IF;
  IF row_after.claimed_at IS NOT NULL THEN
    RAISE EXCEPTION 'C1 FALLITO: claimed_at non azzerato';
  END IF;
  RAISE NOTICE 'C1 ok: complete chiude l''unita''';
END $$;

DO $$
DECLARE
  r public.sync_backlog;
BEGIN
  SELECT * INTO r FROM public.fail_backfill_item('E-new-1', 'VIS timeout');

  IF r.status <> 'pending' THEN
    RAISE EXCEPTION 'C2 FALLITO: dopo un fallimento lo stato e'' % invece di pending', r.status;
  END IF;
  IF r.attempts <> 1 THEN
    RAISE EXCEPTION 'C2 FALLITO: attempts = %', r.attempts;
  END IF;
  IF r.last_error IS DISTINCT FROM 'VIS timeout' THEN
    RAISE EXCEPTION 'C2 FALLITO: last_error = %', r.last_error;
  END IF;
  IF r.not_before <= now() THEN
    RAISE EXCEPTION 'C3 FALLITO: not_before non e'' nel futuro, il backoff non morde';
  END IF;
  RAISE NOTICE 'C2/C3 ok: il fallimento riaccoda con backoff, e l''errore resta leggibile';
END $$;

-- C4: un'unita' in backoff non viene prelevata.
DO $$
DECLARE
  claimed TEXT[];
BEGIN
  UPDATE public.sync_backlog_config SET batch_size = 50;
  SELECT array_agg(event_no) INTO claimed FROM public.claim_backfill_batch();

  IF claimed && ARRAY['E-new-1'] THEN
    RAISE EXCEPTION 'C4 FALLITO: prelevata un''unita'' ancora in backoff';
  END IF;
  RAISE NOTICE 'C4 ok: il backoff esclude l''unita'' dal prelievo';

  -- Rimette tutto pending per le parti successive.
  UPDATE public.sync_backlog SET status = 'pending', claimed_at = NULL;
END $$;

-- C5: oltre max_attempts l'unita' si ferma in `failed` invece di essere
-- ritentata per sempre.
DO $$
DECLARE
  r public.sync_backlog;
  i INT;
BEGIN
  UPDATE public.sync_backlog_config SET max_attempts = 3;
  UPDATE public.sync_backlog SET attempts = 0 WHERE event_no = 'E-mid-1';

  FOR i IN 1..3 LOOP
    SELECT * INTO r FROM public.fail_backfill_item('E-mid-1', 'errore ' || i);
  END LOOP;

  IF r.status <> 'failed' THEN
    RAISE EXCEPTION 'C5 FALLITO: dopo 3 tentativi su max_attempts=3 lo stato e'' %', r.status;
  END IF;
  RAISE NOTICE 'C5 ok: oltre il tetto l''unita'' si ferma in failed, con il suo errore';
END $$;

-- =============================================================================
-- PARTE D: interruttore e recupero
-- =============================================================================

DO $$
DECLARE
  n INT;
BEGIN
  UPDATE public.sync_backlog SET status = 'pending', not_before = now(), claimed_at = NULL;
  UPDATE public.sync_backlog_config SET enabled = false;

  SELECT count(*) INTO n FROM public.claim_backfill_batch();
  IF n <> 0 THEN
    RAISE EXCEPTION 'D1 FALLITO: con enabled=false il prelievo ha restituito % unita''', n;
  END IF;
  RAISE NOTICE 'D1 ok: l''interruttore ferma il backfill senza toccare il cron';

  UPDATE public.sync_backlog_config SET enabled = true;
END $$;

-- D2: un'unita' `running` abbandonata da un worker morto torna prelevabile.
DO $$
DECLARE
  claimed TEXT[];
BEGIN
  UPDATE public.sync_backlog SET status = 'done';
  UPDATE public.sync_backlog
     SET status = 'running', claimed_at = now() - interval '2 hours'
   WHERE event_no = 'E-old-1';

  UPDATE public.sync_backlog_config SET stale_claim_secs = 1800, batch_size = 10;

  SELECT array_agg(event_no) INTO claimed FROM public.claim_backfill_batch();

  IF NOT (claimed @> ARRAY['E-old-1']) THEN
    RAISE EXCEPTION 'D2 FALLITO: un''unita'' running da 2 ore non e'' stata '
                    'recuperata; un timeout della function la bloccherebbe per sempre';
  END IF;
  RAISE NOTICE 'D2 ok: le unita'' abbandonate tornano in coda';
END $$;

-- D3: un'unita' `running` RECENTE non viene rubata a un worker vivo.
DO $$
DECLARE
  claimed TEXT[];
BEGIN
  UPDATE public.sync_backlog SET status = 'done';
  UPDATE public.sync_backlog
     SET status = 'running', claimed_at = now()
   WHERE event_no = 'E-old-2';

  SELECT array_agg(event_no) INTO claimed FROM public.claim_backfill_batch();

  IF claimed && ARRAY['E-old-2'] THEN
    RAISE EXCEPTION 'D3 FALLITO: prelevata un''unita'' presa un istante fa: due '
                    'worker lavorerebbero lo stesso evento';
  END IF;
  RAISE NOTICE 'D3 ok: un worker vivo non viene derubato';
END $$;

-- =============================================================================
-- PARTE E: la coda e' chiusa al pubblico
-- =============================================================================

DO $$
DECLARE
  g TEXT;
BEGIN
  SELECT string_agg(DISTINCT table_name || ':' || grantee, ', ') INTO g
    FROM information_schema.role_table_grants
   WHERE table_schema = 'public'
     AND table_name IN ('sync_backlog', 'sync_backlog_config', 'sync_backlog_progress')
     AND grantee IN ('anon', 'authenticated');
  IF g IS NOT NULL THEN
    RAISE EXCEPTION 'E1 FALLITO: i ruoli pubblici raggiungono la coda (%)', g;
  END IF;
  RAISE NOTICE 'E1 ok: anon e authenticated non vedono la coda';
END $$;

-- E2: le funzioni SECURITY DEFINER non sono eseguibili dal pubblico. Una
-- funzione SECURITY DEFINER lasciata ad `anon` sarebbe un modo elegante di
-- riaprire cio' che la migration 017 ha chiuso.
DO $$
DECLARE
  f TEXT;
BEGIN
  SELECT string_agg(DISTINCT p.proname || ':' || r.rolname, ', ') INTO f
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
   CROSS JOIN LATERAL (VALUES ('anon'), ('authenticated')) AS r(rolname)
   WHERE n.nspname = 'public'
     AND p.proname IN ('claim_backfill_batch', 'complete_backfill_item',
                       'fail_backfill_item', 'seed_backfill_event')
     AND has_function_privilege(r.rolname, p.oid, 'EXECUTE');

  IF f IS NOT NULL THEN
    RAISE EXCEPTION 'E2 FALLITO: i ruoli pubblici possono eseguire (%)', f;
  END IF;
  RAISE NOTICE 'E2 ok: le funzioni della coda sono solo per service_role';
END $$;

-- =============================================================================
-- PARTE F: idempotenza della migration
-- =============================================================================

\ir ../migrations/019_sync_backlog.sql

DO $$
DECLARE
  v INT;
  n INT;
BEGIN
  SELECT count(*) INTO v FROM public.schema_versions WHERE version = '4.2.0';
  IF v <> 1 THEN
    RAISE EXCEPTION 'F1 FALLITO: schema_versions ha % righe per 4.2.0 dopo due '
                    'applicazioni', v;
  END IF;

  SELECT count(*) INTO n FROM public.sync_backlog_config;
  IF n <> 1 THEN
    RAISE EXCEPTION 'F2 FALLITO: la configurazione ha % righe', n;
  END IF;
  RAISE NOTICE 'F1/F2 ok: riapplicare la 019 non cambia nulla';
END $$;

\echo ''
\echo '================================================================'
\echo ' migration 019 / coda backfill (issue #90): TUTTE LE ASSERZIONI OK'
\echo '================================================================'
