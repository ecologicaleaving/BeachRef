-- Migration 027: esistono tornei che non sono ne' maschili ne' femminili (#91)
--
-- =============================================================================
-- COSA HA BLOCCATO IL RIEMPIMENTO
-- =============================================================================
--
-- Primo tentativo di riempire `tournaments` dall'archivio VIS:
--
--   23514: new row for relation "tournaments" violates check constraint
--          "tournaments_gender_check"
--   Failing row: (1087, NJPN0112, Tokyo, JP, 2012, MIXED, ...)
--
-- La colonna nasce dalla migration 007 con `CHECK (gender IN ('M','W'))`. Il
-- vincolo dice che un torneo e' maschile o femminile. L'archivio VIS dice
-- altro: su 9.260 tornei, **222 hanno Gender=2** — eventi con entrambi i
-- tabelloni, che l'app mostra gia' oggi con l'etichetta "M + W" nella
-- schermata di selezione.
--
-- Il vincolo non era sbagliato per i 236 tornei che la tabella conteneva: era
-- sbagliato per il mondo. E' rimasto invisibile finche' `tournaments` e' stata
-- riempita da una fonte che quei 222 tornei non li conteneva.
--
-- =============================================================================
-- PERCHE' NON MAPPARLI A NULL
-- =============================================================================
--
-- Era la via breve: `MIXED -> NULL` e il vincolo non protesta. Ma NULL in
-- questa colonna significa "non lo sappiamo", e qui lo sappiamo benissimo.
-- Scrivere "ignoto" dove c'e' un'informazione e' peggio che non scriverla:
-- rende indistinguibili i tornei misti da quelli che non abbiamo ancora
-- rinfrescato, e la pagina statistiche non potrebbe piu' dire quale delle due
-- cose sta guardando.

BEGIN;

ALTER TABLE public.tournaments
  DROP CONSTRAINT IF EXISTS tournaments_gender_check;

ALTER TABLE public.tournaments
  ADD CONSTRAINT tournaments_gender_check
  CHECK (gender IS NULL OR gender IN ('M', 'W', 'MIXED'));

COMMENT ON COLUMN public.tournaments.gender IS
  '"M" | "W" | "MIXED", tradotto dai codici 0/1/2 del VIS gia'' nel worker. '
  '"MIXED" sono i tornei con entrambi i tabelloni — 222 sull''archivio VIS, '
  'che l''app mostra come "M + W". NULL significa "non ancora rinfrescato", '
  'ed e'' una cosa diversa: vedi migration 027.';

-- Post-condizione: il vincolo accetta i tre valori e rifiuta tutto il resto.
-- Un CHECK riscritto troppo largo non protesterebbe mai piu', e nessuno se ne
-- accorgerebbe.
--
-- Si ISPEZIONA la definizione invece di tentare un inserimento di prova. La
-- prima stesura inseriva una riga fittizia e la cancellava: e' fallita in
-- produzione con 23502, perche' `tournament_code` e' NOT NULL li' e non nel
-- fixture dei test. Ma il difetto vero non era la colonna mancante — era il
-- metodo: una verifica che scrive dipende da OGNI vincolo della tabella,
-- compresi quelli che non sta verificando, e per giunta consuma un id di
-- produzione a ogni esecuzione.
DO $$
DECLARE
  def TEXT;
BEGIN
  SELECT pg_get_constraintdef(c.oid) INTO def
    FROM pg_constraint c
    JOIN pg_class t ON t.oid = c.conrelid
    JOIN pg_namespace n ON n.oid = t.relnamespace
   WHERE n.nspname = 'public'
     AND t.relname = 'tournaments'
     AND c.conname = 'tournaments_gender_check';

  IF def IS NULL THEN
    RAISE EXCEPTION '027: il vincolo sul genere non esiste — la colonna '
                    'accetterebbe qualunque stringa';
  END IF;
  IF def NOT LIKE '%MIXED%' THEN
    RAISE EXCEPTION '027: il vincolo non ammette MIXED (%)', def;
  END IF;
  IF def NOT LIKE '%''M''%' OR def NOT LIKE '%''W''%' THEN
    RAISE EXCEPTION '027: il vincolo ha perso M o W per strada (%)', def;
  END IF;
  RAISE NOTICE '027 ok: %', def;
END $$;

INSERT INTO public.schema_versions (version, description)
SELECT '4.5.2',
       'Issue #91: `tournaments.gender` ammette MIXED — 222 tornei '
       'dell''archivio VIS hanno entrambi i tabelloni, e il vincolo della 007 '
       'ne ammetteva solo due.'
WHERE NOT EXISTS (
  SELECT 1 FROM public.schema_versions WHERE version = '4.5.2'
);

COMMIT;
