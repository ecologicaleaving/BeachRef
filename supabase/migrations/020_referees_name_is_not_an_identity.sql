-- Migration 020: il nome di un arbitro non e' la sua identita' (issue #90)
--
-- =============================================================================
-- COSA HA ROTTO IL BACKFILL
-- =============================================================================
--
-- Primo giro reale del worker, 2026-08-02: 30 eventi lavorati, 29 riusciti, 1
-- fallito. L'errore, per intero:
--
--   PostgREST 409 su referees?on_conflict=vis_referee_no
--   23505: duplicate key value violates unique constraint
--          "referees_referee_id_unique"
--   Key (referee_id)=(Mary Kerekere) already exists.
--
-- `referees.referee_id` non e' un identificativo malgrado il nome: contiene il
-- NOME VISUALIZZATO ("Jonathan Lamprecht"). Su quella colonna esiste un vincolo
-- UNIQUE, quindi il database sostiene che non possano esistere due arbitri
-- chiamati allo stesso modo.
--
-- Possono. Su 501 arbitri di ogni federazione del mondo, gli omonimi non sono
-- un'ipotesi: sono una certezza statistica, e ne e' bastato uno per far cadere
-- un evento. Finche' quel vincolo esiste, il backfill fallira' su ogni evento
-- che ne contenga uno — e quei fallimenti consumano tentativi, finiscono in
-- `failed`, e lasciano buchi nello storico esattamente dove ci sono piu'
-- arbitri.
--
-- =============================================================================
-- QUAL E' L'IDENTITA'
-- =============================================================================
--
-- `vis_referee_no`, l'identificativo assegnato dal VIS. Ha il suo indice
-- univoco dalla migration 018 (issue #89), e' cio' su cui il worker fa upsert,
-- ed e' l'unica chiave con cui `match_referees` collega una persona a una
-- partita.
--
-- Il nome resta un attributo: si legge, si mostra, si cerca. Non si usa per
-- decidere se due righe sono la stessa persona — ed e' la stessa ragione per
-- cui il worker NON deduce le assegnazioni dai nomi (vedi 018).
--
-- Togliere un vincolo UNIQUE non puo' fallire per i dati gia' presenti, e non
-- ne cancella nessuno.
--
-- Applicare questa migration e' sicuro e ripetibile.

BEGIN;

DO $$
DECLARE
  con RECORD;
  dropped INT := 0;
BEGIN
  -- Si cercano i vincoli per DEFINIZIONE e non per nome: la 020 deve valere
  -- anche se su un altro ambiente quel vincolo si chiama diversamente.
  FOR con IN
    SELECT c.conname
      FROM pg_constraint c
      JOIN pg_class t ON t.oid = c.conrelid
      JOIN pg_namespace n ON n.oid = t.relnamespace
     WHERE n.nspname = 'public'
       AND t.relname = 'referees'
       AND c.contype = 'u'
       AND (SELECT array_agg(a.attname::text ORDER BY a.attname)
              FROM unnest(c.conkey) AS k(attnum)
              JOIN pg_attribute a ON a.attrelid = c.conrelid AND a.attnum = k.attnum)
           = ARRAY['referee_id']
  LOOP
    EXECUTE format('ALTER TABLE public.referees DROP CONSTRAINT %I', con.conname);
    RAISE NOTICE 'rimosso il vincolo UNIQUE su referees.referee_id: %', con.conname;
    dropped := dropped + 1;
  END LOOP;

  IF dropped = 0 THEN
    RAISE NOTICE 'nessun vincolo UNIQUE su referees.referee_id (gia'' rimosso)';
  END IF;
END $$;

-- Stessa cosa per un eventuale indice univoco non legato a un vincolo.
DO $$
DECLARE
  idx RECORD;
BEGIN
  FOR idx IN
    SELECT i.relname
      FROM pg_index x
      JOIN pg_class i ON i.oid = x.indexrelid
      JOIN pg_class t ON t.oid = x.indrelid
      JOIN pg_namespace n ON n.oid = t.relnamespace
     WHERE n.nspname = 'public'
       AND t.relname = 'referees'
       AND x.indisunique
       AND NOT x.indisprimary
       AND (SELECT array_agg(a.attname::text ORDER BY a.attname)
              FROM unnest(x.indkey::int[]) AS k(attnum)
              JOIN pg_attribute a ON a.attrelid = x.indrelid AND a.attnum = k.attnum)
           = ARRAY['referee_id']
       -- Non deve toccare un vincolo: quelli li ha gia' gestiti il blocco sopra.
       AND NOT EXISTS (SELECT 1 FROM pg_constraint c WHERE c.conindid = i.oid)
  LOOP
    EXECUTE format('DROP INDEX public.%I', idx.relname);
    RAISE NOTICE 'rimosso l''indice univoco su referees.referee_id: %', idx.relname;
  END LOOP;
END $$;

COMMENT ON COLUMN public.referees.referee_id IS
  'Nome VISUALIZZATO dell''arbitro, malgrado il nome della colonna. NON e'' '
  'un''identita'': l''identita'' e'' `vis_referee_no`, che ha il proprio indice '
  'univoco dalla migration 018. Il vincolo UNIQUE che stava qui ha fatto '
  'fallire il primo backfill reale su un omonimo ("Mary Kerekere") — vedi '
  'migration 020, issue #90.';

-- Il campo su cui si decide se due righe sono la stessa persona. Ridichiarato
-- qui perche' e' la meta' che RESTA vera dopo aver tolto l'altra.
COMMENT ON COLUMN public.referees.vis_referee_no IS
  'Identificativo VIS. E'' QUESTA l''identita'' di un arbitro: e'' cio'' su cui '
  'il worker di backfill fa upsert, ed e'' la chiave con cui `match_referees` '
  'collega una persona a una partita. Indice univoco parziale dalla 018.';

DO $$
DECLARE
  still_unique INT;
BEGIN
  SELECT count(*) INTO still_unique
    FROM pg_index x
    JOIN pg_class t ON t.oid = x.indrelid
    JOIN pg_namespace n ON n.oid = t.relnamespace
   WHERE n.nspname = 'public'
     AND t.relname = 'referees'
     AND x.indisunique
     AND NOT x.indisprimary
     AND (SELECT array_agg(a.attname::text ORDER BY a.attname)
            FROM unnest(x.indkey::int[]) AS k(attnum)
            JOIN pg_attribute a ON a.attrelid = x.indrelid AND a.attnum = k.attnum)
         = ARRAY['referee_id'];

  IF still_unique > 0 THEN
    RAISE EXCEPTION 'referees.referee_id e'' ancora univoco: il backfill '
                    'continuera'' a cadere sugli omonimi';
  END IF;
END $$;

INSERT INTO public.schema_versions (version, description)
SELECT '4.2.1',
       'Issue #90: rimosso il vincolo UNIQUE su referees.referee_id — un nome '
       'visualizzato non e'' un''identita'', e un omonimo ha fatto fallire il '
       'primo backfill reale. L''identita'' e'' vis_referee_no.'
WHERE NOT EXISTS (
  SELECT 1 FROM public.schema_versions WHERE version = '4.2.1'
);

COMMIT;
