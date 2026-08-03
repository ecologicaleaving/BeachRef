-- Migration 021: distanza minima fra due richieste al VIS (issue #90)
--
-- =============================================================================
-- PERCHE'
-- =============================================================================
--
-- `sync_backlog_config` sapeva regolare QUANTI eventi lavorare per ciclo
-- (`batch_size`) e quanti in parallelo (`vis_concurrency`), ma non sapeva dire
-- nulla su quanto DISTANZIARE due chiamate. Con `batch_size = 10` le dieci
-- richieste partivano una dietro l'altra nel giro di pochi secondi, e la pausa
-- fra un ciclo e l'altro non le separava: separava i lotti.
--
-- La distinzione conta perche' il VIS non si difende da solo. L'ultima volta
-- che il suo archivio e' stato letto in blocco, il servizio e' andato in
-- affanno e la FIVB ha telefonato per chiedere di smettere. Non e' arrivato
-- nessun 429, nessuna connessione chiusa, nessun segnale leggibile dal codice:
-- un backfill che regola il proprio ritmo sugli errori HTTP non lo regola
-- affatto, perche' non ne riceve — accelera fino alla telefonata.
--
-- Il valore vive QUI, e non in una variabile d'ambiente della Edge Function,
-- per una ragione operativa: se il VIS torna in affanno, rallentare deve
-- costare una UPDATE, non un rideploy. Una manopola che richiede un rilascio
-- non e' una manopola.
--
-- 20 secondi = 3 richieste al minuto, 180 all'ora. I 1610 eventi rimasti
-- diventano circa 9 ore di lavoro distribuito, invece dei 20 minuti che il
-- ritmo precedente avrebbe impiegato per arrivare esattamente dove siamo gia'
-- arrivati una volta.

BEGIN;

ALTER TABLE public.sync_backlog_config
  ADD COLUMN IF NOT EXISTS vis_min_interval_ms INTEGER NOT NULL DEFAULT 20000;

-- Un intervallo negativo non ha senso; uno pari a zero significa "nessuna
-- pausa" ed e' ammesso solo perche' serve ai test.
ALTER TABLE public.sync_backlog_config
  DROP CONSTRAINT IF EXISTS sync_backlog_config_vis_min_interval_ms_check;
ALTER TABLE public.sync_backlog_config
  ADD CONSTRAINT sync_backlog_config_vis_min_interval_ms_check
  CHECK (vis_min_interval_ms >= 0 AND vis_min_interval_ms <= 3600000);

COMMENT ON COLUMN public.sync_backlog_config.vis_min_interval_ms IS
  'Millisecondi minimi fra DUE CHIAMATE al VIS, non fra due cicli. Applicato '
  'dentro `visRequest()`, cioe'' nell''unico punto da cui passano tutte le '
  'richieste: abbassare `batch_size` distanzia i lotti, non le chiamate dentro '
  'un lotto. Alzare questo valore e'' il modo di rallentare senza rideployare '
  'la Edge Function. Default 20000 (3 richieste/minuto) — vedi migration 021.';

INSERT INTO public.schema_versions (version, description)
SELECT '4.2.2',
       'Issue #90: `vis_min_interval_ms` in sync_backlog_config — il ritmo '
       'verso il VIS si regola per singola richiesta, e senza rideploy.'
WHERE NOT EXISTS (
  SELECT 1 FROM public.schema_versions WHERE version = '4.2.2'
);

COMMIT;
