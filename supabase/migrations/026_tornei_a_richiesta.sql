-- Migration 026: l'archivio tornei si rinfresca a richiesta (issue #91)
--
-- =============================================================================
-- SOLO UN COMMENTO — MA UN COMMENTO CHE MENTIVA
-- =============================================================================
--
-- La 025 ha introdotto `tournaments_synced_at` descrivendola cosi': "il worker
-- rinfresca se e' NULL o piu' vecchia di 24h". Era vero quando l'ho scritta, e
-- ha smesso di esserlo il giorno dopo.
--
-- Il ritmo giornaliero era una scelta pigra: 1,2 MB scaricati ogni giorno per
-- accorgersi di una manciata di tornei nuovi all'anno, contro un servizio che
-- avevamo appena deciso di trattare con i guanti (vedi 021). L'archivio lo
-- salviamo gia' per intero — il ritmo non serviva a conservarlo, serviva a
-- scoprire i tornei nuovi. E un torneo nuovo si scopre quando il backfill lo
-- incontra e non lo trova in `tournaments`.
--
-- Il worker ora rinfresca SOLO in quel caso. `tournaments_synced_at` non e'
-- piu' una scadenza: e' un pavimento di un'ora, che impedisce di riscaricare
-- l'archivio a ogni ciclo inseguendo un torneo che dal VIS non arrivera' mai.
--
-- Questa migration non cambia dati ne' struttura. Esiste perche' un commento
-- sbagliato su una colonna e' peggio di nessun commento: e' documentazione che
-- qualcuno leggera' e su cui deduira' un comportamento che non c'e'.

BEGIN;

COMMENT ON COLUMN public.sync_backlog_config.tournaments_synced_at IS
  'Quando `tournaments` e'' stata rinfrescata dall''archivio VIS l''ultima '
  'volta. NON e'' una scadenza: il worker rinfresca quando incontra un '
  '`tournament_no` che non conosce, e usa questo valore solo come pavimento '
  '(non piu'' di un rinfresco all''ora) per non inseguire all''infinito un '
  'torneo assente dall''archivio. A regime, zero richieste al VIS. '
  'Migration 026, issue #91.';

INSERT INTO public.schema_versions (version, description)
SELECT '4.5.1',
       'Issue #91: l''archivio tornei si rinfresca a richiesta e non a '
       'scadenza; corretto il commento di tournaments_synced_at.'
WHERE NOT EXISTS (
  SELECT 1 FROM public.schema_versions WHERE version = '4.5.1'
);

COMMIT;
