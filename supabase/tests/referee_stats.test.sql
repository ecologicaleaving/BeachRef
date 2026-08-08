-- Regression test per la migration 022 (issue #91).
--
--   bash supabase/tests/run-migration-tests.sh
--
-- Prova cio' che un'aggregazione puo' sbagliare in modi che non si vedono:
-- attribuire una partita alla persona sbagliata, contare due volte, aprire in
-- scrittura una tabella che doveva essere di sola lettura.

\set ON_ERROR_STOP on

\ir fixtures/production_shape.sql
\ir ../migrations/018_restore_match_referees.sql
-- La 019 crea `sync_backlog_config`, a cui la 025 aggiunge il segnatempo del
-- rinfresco tornei: senza, la 025 fallisce su una tabella che non esiste.
\ir ../migrations/019_sync_backlog.sql
\ir ../migrations/020_referees_name_is_not_an_identity.sql
\ir ../migrations/022_referee_stats.sql
\ir ../migrations/023_refresh_stats_safeupdate.sql
\ir ../migrations/024_referee_drilldown.sql
\ir ../migrations/025_gender_e_fase.sql
-- La 028 chiude le statistiche ai ruoli pubblici, e la 032 ne dipende (la sua
-- policy nomina `app_users`). Va applicata qui perche' e' l'ordine reale: una
-- migration che presuppone lo stato lasciato da un'altra deve trovarcelo.
\ir ../migrations/028_accesso_riservato.sql
\ir ../migrations/027_tornei_misti.sql
\ir ../migrations/029_categoria_torneo.sql
\ir ../migrations/030_categorie_mancanti.sql
\ir ../migrations/031_confederazione.sql
\ir ../migrations/032_stats_per_categoria.sql

-- =============================================================================
-- I DATI: costruiti per far cadere l'aggregazione, non per farla passare
-- =============================================================================

-- Due OMONIMI (persone diverse, stesso nome) e un terzo arbitro il cui nome
-- compare girato su `matches`, come fa il VIS davvero.
INSERT INTO public.referees (id, vis_referee_no, referee_id, federation_code) VALUES
  (101, '900001', 'Mary Kerekere',    'NZL'),
  (102, '900002', 'Mary Kerekere',    'AUS'),
  (103, '164206', 'Brady Nicholson',  'AUS');

-- Un torneo con nome, uno senza: il dettaglio deve reggere entrambi.
INSERT INTO public.tournaments (vis_tournament_no, tournament_code, name, country, season, gender, type) VALUES
  (1, 'MNZL0126', 'BPT Futures Mount Maunganui 2026', 'NZ', 2026, 'M', '53');

INSERT INTO public.matches (id, no, tournament_no, local_date, round, referee1_name, referee2_name) VALUES
  ('11111111-1111-1111-1111-111111111111', 'M1', '1', '2026-02-06', 'Pool A', 'Kerekere Mary', 'Nicholson Brady'),
  -- Senza fase: il VIS non la espone su tutte le partite, e va mostrata assente
  -- invece che indovinata.
  ('22222222-2222-2222-2222-222222222222', 'M2', '1',  '2026-02-07', NULL, 'Kerekere Mary', NULL),
  ('33333333-3333-3333-3333-333333333333', 'M3', 'T2', '2026-03-01', NULL, NULL,            NULL),
  -- Stagione diversa: serve a separare season da career.
  ('44444444-4444-4444-4444-444444444444', 'M4', 'T3', '2025-08-01', NULL, NULL,            NULL),
  -- Senza data: non ha stagione, quindi non ha diritto di entrare nei conteggi.
  ('55555555-5555-5555-5555-555555555555', 'M5', 'T9', NULL,         NULL, NULL,            NULL);

INSERT INTO public.match_referees (match_id, referee_id, role) VALUES
  ('11111111-1111-1111-1111-111111111111', 101, 'FIRST'),
  ('11111111-1111-1111-1111-111111111111', 103, 'SECOND'),
  ('22222222-2222-2222-2222-222222222222', 101, 'FIRST'),
  ('33333333-3333-3333-3333-333333333333', 101, 'SECOND'),
  ('44444444-4444-4444-4444-444444444444', 101, 'FIRST'),
  ('55555555-5555-5555-5555-555555555555', 101, 'FIRST');

SELECT * FROM public.refresh_referee_stats();

-- =============================================================================
-- PARTE A: i conteggi
-- =============================================================================

DO $$
DECLARE
  r public.referee_season_stats;
BEGIN
  SELECT * INTO r FROM public.referee_season_stats
   WHERE vis_referee_no = '900001' AND season = 2026;

  -- M1 (FIRST), M2 (FIRST), M3 (SECOND). M4 e' 2025, M5 non ha data.
  IF r.matches <> 3 THEN
    RAISE EXCEPTION 'A1 FALLITO: % partite nel 2026, attese 3', r.matches;
  END IF;
  IF r.as_first <> 2 OR r.as_second <> 1 THEN
    RAISE EXCEPTION 'A2 FALLITO: primo=% secondo=%, attesi 2 e 1', r.as_first, r.as_second;
  END IF;
  -- M1 e M2 sono lo stesso torneo: i tornei distinti sono T1 e T2.
  IF r.tournaments <> 2 THEN
    RAISE EXCEPTION 'A3 FALLITO: % tornei, attesi 2 (il torneo 1 conta una volta)',
      r.tournaments;
  END IF;
  IF r.first_match <> '2026-02-06' OR r.last_match <> '2026-03-01' THEN
    RAISE EXCEPTION 'A4 FALLITO: intervallo % .. %', r.first_match, r.last_match;
  END IF;
  RAISE NOTICE 'A1-A4 ok: conteggi, ruoli, tornei distinti e intervallo';
END $$;

-- A5: una partita senza data non ha stagione, e non deve comparire da nessuna
-- parte — nemmeno nella carriera, dove sarebbe facile lasciarla passare.
DO $$
DECLARE
  c public.referee_career_stats;
BEGIN
  SELECT * INTO c FROM public.referee_career_stats WHERE vis_referee_no = '900001';
  IF c.matches <> 4 THEN
    RAISE EXCEPTION 'A5 FALLITO: carriera con % partite, attese 4 (M5 non ha data)',
      c.matches;
  END IF;
  IF c.seasons <> 2 THEN
    RAISE EXCEPTION 'A5 FALLITO: % stagioni, attese 2', c.seasons;
  END IF;
  RAISE NOTICE 'A5 ok: senza data non c''e'' stagione, e senza stagione non c''e'' riga';
END $$;

-- =============================================================================
-- PARTE B: l'identita' — il motivo per cui questa tabella esiste
-- =============================================================================

-- B1: gli omonimi restano due persone. `900002` non ha arbitrato nulla, e
-- nessuna delle partite di `900001` deve essergli attribuita, malgrado il nome
-- identico.
DO $$
DECLARE
  n INT;
BEGIN
  SELECT count(*) INTO n FROM public.referee_career_stats WHERE vis_referee_no = '900002';
  IF n <> 0 THEN
    RAISE EXCEPTION 'B1 FALLITO: l''omonimo senza designazioni ha una riga';
  END IF;

  SELECT count(*) INTO n FROM public.referee_career_stats WHERE referee_name = 'Mary Kerekere';
  IF n <> 1 THEN
    RAISE EXCEPTION 'B1 FALLITO: % righe per il nome "Mary Kerekere", attesa 1 '
                    '— l''aggregazione ha fuso due persone o ne ha inventata una', n;
  END IF;
  RAISE NOTICE 'B1 ok: due omonimi, una sola carriera — quella di chi ha arbitrato';
END $$;

-- B2: LA PROVA. Su `matches` i nomi sono scritti girati ("Nicholson Brady"
-- contro "Brady Nicholson"). Se l'aggregazione li usasse, Brady Nicholson non
-- esisterebbe nelle statistiche — e nessuno se ne accorgerebbe, perche' il
-- risultato sarebbe comunque una tabella piena di numeri.
DO $$
DECLARE
  c public.referee_career_stats;
BEGIN
  SELECT * INTO c FROM public.referee_career_stats WHERE vis_referee_no = '164206';
  IF c IS NULL THEN
    RAISE EXCEPTION 'B2 FALLITO: l''arbitro il cui nome su matches e'' girato '
                    'non compare — l''aggregazione sta guardando i nomi';
  END IF;
  IF c.matches <> 1 OR c.as_second <> 1 THEN
    RAISE EXCEPTION 'B2 FALLITO: % partite / % da secondo, attese 1 e 1',
      c.matches, c.as_second;
  END IF;
  IF c.referee_name <> 'Brady Nicholson' THEN
    RAISE EXCEPTION 'B2 FALLITO: nome "%", atteso quello di `referees` e non '
                    'quello scritto su `matches`', c.referee_name;
  END IF;
  RAISE NOTICE 'B2 ok: il legame passa da vis_referee_no, i nomi girati non contano';
END $$;

-- =============================================================================
-- PARTE C: il ricalcolo sostituisce, non accumula
-- =============================================================================

DO $$
DECLARE
  n INT;
  r public.referee_season_stats;
BEGIN
  SELECT count(*) INTO n FROM public.referee_season_stats;

  PERFORM public.refresh_referee_stats();

  IF (SELECT count(*) FROM public.referee_season_stats) <> n THEN
    RAISE EXCEPTION 'C1 FALLITO: il secondo ricalcolo ha cambiato il numero di righe';
  END IF;
  SELECT * INTO r FROM public.referee_season_stats
   WHERE vis_referee_no = '900001' AND season = 2026;
  IF r.matches <> 3 THEN
    RAISE EXCEPTION 'C1 FALLITO: dopo il ricalcolo % partite, il conteggio si e'' '
                    'sommato a se stesso', r.matches;
  END IF;
  RAISE NOTICE 'C1 ok: ricalcolare non raddoppia';
END $$;

-- C2: una designazione rimossa sparisce dalle statistiche. E' la ragione per
-- cui il ricalcolo cancella invece di aggiornare: una riga di sintesi rimasta
-- indietro e' indistinguibile da una corretta.
DO $$
DECLARE
  c public.referee_career_stats;
BEGIN
  DELETE FROM public.match_referees
   WHERE match_id = '44444444-4444-4444-4444-444444444444';
  PERFORM public.refresh_referee_stats();

  SELECT * INTO c FROM public.referee_career_stats WHERE vis_referee_no = '900001';
  IF c.matches <> 3 OR c.seasons <> 1 THEN
    RAISE EXCEPTION 'C2 FALLITO: dopo la rimozione % partite / % stagioni, '
                    'attese 3 e 1', c.matches, c.seasons;
  END IF;
  IF EXISTS (SELECT 1 FROM public.referee_season_stats
              WHERE vis_referee_no = '900001' AND season = 2025) THEN
    RAISE EXCEPTION 'C2 FALLITO: la riga della stagione 2025 e'' sopravvissuta '
                    'alla rimozione della sua unica designazione';
  END IF;
  RAISE NOTICE 'C2 ok: cio'' che sparisce dai dati sparisce dalle statistiche';
END $$;

-- =============================================================================
-- PARTE D: chi legge, e chi no
-- =============================================================================
--
-- Le asserzioni sui permessi vivono in `accesso_riservato.test.sql`, che ha
-- solo quel compito. Qui resta il minimo che serve a non confondersi: dopo la
-- 028 la chiave anonima non apre piu' nulla, nemmeno gli aggregati.

DO $$
DECLARE
  t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY['referee_season_stats', 'referee_career_stats',
                           'referee_tournament_stats', 'referee_match_log'] LOOP
    IF has_table_privilege('anon', 'public.' || t, 'SELECT') THEN
      RAISE EXCEPTION 'D1 FALLITO: anon legge ancora %', t;
    END IF;
  END LOOP;
  RAISE NOTICE 'D1 ok: dopo la 028 gli aggregati non sono piu'' pubblici';
END $$;

-- D3: e cio' che era chiuso resta chiuso. Aprire gli aggregati non deve aver
-- aperto le partite: e' l'intera ragione per cui sono tabelle e non viste.
DO $$
DECLARE
  t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY['matches', 'match_referees', 'referees'] LOOP
    IF has_table_privilege('anon', 'public.' || t, 'SELECT') THEN
      RAISE EXCEPTION 'D3 FALLITO: anon legge % — la 022 ha aperto piu'' del '
                      'dovuto', t;
    END IF;
  END LOOP;
  RAISE NOTICE 'D3 ok: partite, designazioni e anagrafica restano chiuse';
END $$;

-- D4: il ricalcolo non e' innescabile dall'esterno. E'' una SECURITY DEFINER
-- che legge tabelle chiuse: lasciarla eseguibile ad anon aggirerebbe D3.
DO $$
BEGIN
  IF has_function_privilege('anon', 'public.refresh_referee_stats()', 'EXECUTE')
  OR has_function_privilege('authenticated', 'public.refresh_referee_stats()', 'EXECUTE') THEN
    RAISE EXCEPTION 'D4 FALLITO: un ruolo pubblico puo'' eseguire il ricalcolo';
  END IF;
  RAISE NOTICE 'D4 ok: il ricalcolo e'' solo della service_role';
END $$;

-- =============================================================================
-- PARTE E: idempotenza della migration
-- =============================================================================

-- Si riapplica LA MIGRATION IN PROVA, non quelle che l'hanno preceduta.
--
-- Riapplicare la 022 a questo punto non fallirebbe per un difetto: fallirebbe
-- perche' la 024 ha cambiato il tipo di ritorno di `refresh_referee_stats()` e
-- PostgreSQL rifiuta un `CREATE OR REPLACE` che lo cambierebbe di nuovo. E'
-- una protezione — riapplicare una migration vecchia dopo una nuova e' un
-- DOWNGRADE, e qui il database si rifiuta di subirlo in silenzio.
--
-- Lo stesso caso, senza protezione, e' gia' costato un'asserzione rossa: la
-- prima stesura di questo file rigiocava la 022 dopo la 023 e riportava
-- indietro la funzione ai DELETE nudi, che su Supabase non girano.
\ir ../migrations/029_categoria_torneo.sql

DO $$
DECLARE
  n INT;
BEGIN
  SELECT count(*) INTO n FROM public.schema_versions WHERE version = '4.3.0';
  IF n <> 1 THEN
    RAISE EXCEPTION 'E1 FALLITO: schema_versions ha % righe per 4.3.0', n;
  END IF;
  -- Riapplicarla non deve svuotare cio' che era gia' calcolato.
  IF (SELECT count(*) FROM public.referee_career_stats) = 0 THEN
    RAISE EXCEPTION 'E1 FALLITO: riapplicare la 022 ha cancellato le statistiche';
  END IF;
  RAISE NOTICE 'E1 ok: riapplicarla non cambia nulla e non cancella nulla';
END $$;

-- =============================================================================
-- PARTE G: il dettaglio (migration 024)
-- =============================================================================
--
-- Nota: la parte C ha rimosso la designazione della stagione 2025, quindi
-- l'arbitro '900001' ha ora 3 partite, tutte nel 2026, su due tornei.

DO $$
DECLARE
  n INT;
  r public.referee_tournament_stats;
BEGIN
  SELECT count(*) INTO n FROM public.referee_tournament_stats
   WHERE vis_referee_no = '900001';
  IF n <> 2 THEN
    RAISE EXCEPTION 'G1 FALLITO: % tornei per l''arbitro, attesi 2', n;
  END IF;

  -- Il torneo con nome: la LEFT JOIN deve averlo risolto, malgrado i tipi
  -- diversi ai due lati (BIGINT contro VARCHAR).
  SELECT * INTO r FROM public.referee_tournament_stats
   WHERE vis_referee_no = '900001' AND tournament_no = '1';
  IF r.tournament_name IS DISTINCT FROM 'BPT Futures Mount Maunganui 2026' THEN
    RAISE EXCEPTION 'G1 FALLITO: nome torneo "%", la join non ha risolto',
      r.tournament_name;
  END IF;
  IF r.matches <> 2 OR r.as_first <> 2 THEN
    RAISE EXCEPTION 'G1 FALLITO: % partite / % da primo su quel torneo',
      r.matches, r.as_first;
  END IF;
  RAISE NOTICE 'G1 ok: il dettaglio per torneo, con il nome risolto';
END $$;

-- G2: un torneo SENZA riga in `tournaments` non fa sparire le sue partite.
-- E' il caso normale, non l'eccezione: il backfill non riempie `tournaments`.
DO $$
DECLARE
  r public.referee_tournament_stats;
BEGIN
  SELECT * INTO r FROM public.referee_tournament_stats
   WHERE vis_referee_no = '900001' AND tournament_no = 'T2';
  IF r IS NULL THEN
    RAISE EXCEPTION 'G2 FALLITO: il torneo senza nome e'' sparito — la join '
                    'si comporta come INNER';
  END IF;
  IF r.tournament_name IS NOT NULL THEN
    RAISE EXCEPTION 'G2 FALLITO: nome "%" inventato dal nulla', r.tournament_name;
  END IF;
  RAISE NOTICE 'G2 ok: senza nome resta il numero, non un buco';
END $$;

-- G3: il registro delle singole partite.
DO $$
DECLARE
  n INT;
  riga public.referee_match_log;
BEGIN
  SELECT count(*) INTO n FROM public.referee_match_log WHERE vis_referee_no = '900001';
  IF n <> 3 THEN
    RAISE EXCEPTION 'G3 FALLITO: % partite nel registro, attese 3', n;
  END IF;

  SELECT * INTO riga FROM public.referee_match_log
   WHERE vis_referee_no = '900001' AND match_no = 'M1';
  IF riga.role <> 'FIRST' OR riga.local_date <> '2026-02-06' THEN
    RAISE EXCEPTION 'G3 FALLITO: ruolo % del %', riga.role, riga.local_date;
  END IF;

  -- La partita M5 non ha data: non deve comparire, come non compare nei totali.
  IF EXISTS (SELECT 1 FROM public.referee_match_log WHERE match_no = 'M5') THEN
    RAISE EXCEPTION 'G3 FALLITO: una partita senza data e'' entrata nel registro';
  END IF;
  RAISE NOTICE 'G3 ok: registro partite coerente con i totali';
END $$;

-- G4: totale e dettaglio dicono la stessa cosa. E' la ragione per cui le
-- quattro tabelle si ricalcolano nella STESSA funzione: separarle permetterebbe
-- di aggiornarne una e non l'altra, e nessuno se ne accorgerebbe finche' non
-- apre il pannello.
DO $$
DECLARE
  tot INT;
  det INT;
  per_torneo INT;
BEGIN
  SELECT matches INTO tot FROM public.referee_career_stats WHERE vis_referee_no = '900001';
  SELECT count(*) INTO det FROM public.referee_match_log   WHERE vis_referee_no = '900001';
  SELECT sum(matches) INTO per_torneo FROM public.referee_tournament_stats
   WHERE vis_referee_no = '900001';

  IF tot <> det OR tot <> per_torneo THEN
    RAISE EXCEPTION 'G4 FALLITO: carriera %, registro %, somma per torneo % — '
                    'il numero mostrato non corrisponde a cio'' che si apre',
      tot, det, per_torneo;
  END IF;
  RAISE NOTICE 'G4 ok: % partite, dette allo stesso modo da tre tabelle', tot;
END $$;

-- G5: cio' che il modello di lettura esiste per NON aprire resta chiuso.
DO $$
DECLARE
  t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY['matches', 'match_referees', 'referees', 'tournaments'] LOOP
    IF has_table_privilege('anon', 'public.' || t, 'SELECT') THEN
      RAISE EXCEPTION 'G5 FALLITO: anon legge % — il modello di lettura non '
                      'serviva a nulla', t;
    END IF;
  END LOOP;
  RAISE NOTICE 'G5 ok: si legge il modello, non le tabelle da cui nasce';
END $$;

-- =============================================================================
-- PARTE H: genere e fase (migration 025)
-- =============================================================================

DO $$
DECLARE
  t public.referee_tournament_stats;
  p public.referee_match_log;
BEGIN
  -- H1: il genere arriva da `tournaments`, ed e' cio' che distingue due
  -- tabelloni con lo stesso nome. Senza, il pannello mostrava due righe
  -- identiche e nessun modo di capire quale fosse quale.
  SELECT * INTO t FROM public.referee_tournament_stats
   WHERE vis_referee_no = '900001' AND tournament_no = '1';
  IF t.gender IS DISTINCT FROM 'M' THEN
    RAISE EXCEPTION 'H1 FALLITO: genere "%", atteso M', t.gender;
  END IF;

  -- H2: un torneo che `tournaments` non conosce non ha genere, e va bene:
  -- meglio assente che inventato.
  SELECT * INTO t FROM public.referee_tournament_stats
   WHERE vis_referee_no = '900001' AND tournament_no = 'T2';
  IF t.gender IS NOT NULL THEN
    RAISE EXCEPTION 'H2 FALLITO: genere "%" per un torneo sconosciuto', t.gender;
  END IF;
  RAISE NOTICE 'H1/H2 ok: il genere c''e'' quando si sa, e manca quando non si sa';

  -- H3: la fase della partita. Viene da `matches.round`, che il worker riempie
  -- da `RoundName` — non da `Round`, che nel VIS non esiste e che veniva
  -- ignorato in silenzio su tutte le 5.963 partite gia' scaricate.
  SELECT * INTO p FROM public.referee_match_log
   WHERE vis_referee_no = '900001' AND match_no = 'M1';
  IF p.round_name IS DISTINCT FROM 'Pool A' THEN
    RAISE EXCEPTION 'H3 FALLITO: fase "%", attesa "Pool A"', p.round_name;
  END IF;

  -- H4: e una partita senza fase resta senza fase.
  SELECT * INTO p FROM public.referee_match_log
   WHERE vis_referee_no = '900001' AND match_no = 'M2';
  IF p.round_name IS NOT NULL THEN
    RAISE EXCEPTION 'H4 FALLITO: fase "%" comparsa dal nulla', p.round_name;
  END IF;
  RAISE NOTICE 'H3/H4 ok: la fase c''e'' dove il VIS l''ha data';
END $$;

-- H5: il segnatempo del rinfresco tornei esiste e parte vuoto — "mai
-- rinfrescato" e "rinfrescato tempo fa" devono essere distinguibili, altrimenti
-- il worker non saprebbe se e' la prima volta.
DO $$
DECLARE
  q TIMESTAMPTZ;
  n INT;
BEGIN
  SELECT count(*) INTO n FROM information_schema.columns
   WHERE table_schema = 'public' AND table_name = 'sync_backlog_config'
     AND column_name = 'tournaments_synced_at';
  IF n <> 1 THEN
    RAISE EXCEPTION 'H5 FALLITO: `tournaments_synced_at` non esiste';
  END IF;

  SELECT tournaments_synced_at INTO q FROM public.sync_backlog_config WHERE id;
  IF q IS NOT NULL THEN
    RAISE EXCEPTION 'H5 FALLITO: parte valorizzato (%), il worker crederebbe '
                    'di aver gia'' rinfrescato', q;
  END IF;
  RAISE NOTICE 'H5 ok: "mai rinfrescato" e'' distinguibile';
END $$;

-- H6: un torneo misto entra. Il vincolo della 007 ammetteva due generi; sui
-- 9.260 tornei dell'archivio VIS ce ne sono 222 con entrambi i tabelloni, e
-- basta uno per far fallire l'intero riempimento (migration 027).
DO $$
BEGIN
  INSERT INTO public.tournaments (vis_tournament_no, tournament_code, name, gender)
  VALUES (77, 'NJPN0112', 'Torneo con entrambi i tabelloni', 'MIXED');

  BEGIN
    INSERT INTO public.tournaments (vis_tournament_no, tournament_code, name, gender)
    VALUES (78, 'XXXX0000', 'Genere inventato', 'BOH');
    RAISE EXCEPTION 'H6 FALLITO: il vincolo accetta un genere qualsiasi';
  EXCEPTION WHEN check_violation THEN
    RAISE NOTICE 'H6 ok: MIXED entra, un genere inventato no';
  END;
END $$;

-- =============================================================================
-- PARTE I: la categoria (migration 029)
-- =============================================================================

DO $$
DECLARE
  t public.referee_tournament_stats;
  p public.referee_match_log;
BEGIN
  -- I1: il codice 53 diventa "BPT Futures". La categoria viene dal CODICE e
  -- non dal nome: nell'archivio i tornei di questo tipo si chiamano spesso
  -- solo con la citta', e classificare per nome ne perderebbe un quarto.
  SELECT * INTO t FROM public.referee_tournament_stats
   WHERE vis_referee_no = '900001' AND tournament_no = '1';
  IF t.category IS DISTINCT FROM 'BPT Futures' THEN
    RAISE EXCEPTION 'I1 FALLITO: categoria "%", attesa BPT Futures', t.category;
  END IF;
  IF t.tournament_type IS DISTINCT FROM '53' THEN
    RAISE EXCEPTION 'I1 FALLITO: codice grezzo "%" perso', t.tournament_type;
  END IF;

  -- I2: la categoria arriva anche alle singole partite, se no il pannello
  -- dovrebbe ricavarla incrociando due tabelle.
  SELECT * INTO p FROM public.referee_match_log
   WHERE vis_referee_no = '900001' AND match_no = 'M1';
  IF p.category IS DISTINCT FROM 'BPT Futures' THEN
    RAISE EXCEPTION 'I2 FALLITO: categoria "%" sulla partita', p.category;
  END IF;

  -- I3: un torneo che `tournaments` non conosce non ha categoria, e va bene.
  SELECT * INTO t FROM public.referee_tournament_stats
   WHERE vis_referee_no = '900001' AND tournament_no = 'T2';
  IF t.category IS NOT NULL THEN
    RAISE EXCEPTION 'I3 FALLITO: categoria "%" per un torneo sconosciuto', t.category;
  END IF;
  RAISE NOTICE 'I1-I3 ok: categoria dal codice, sul torneo e sulla partita';
END $$;

-- I4: un codice che non sappiamo classificare resta SENZA categoria. E' la
-- proprieta' che distingue "non lo so" da un'etichetta inventata, e senza di
-- essa una categoria sbagliata sarebbe indistinguibile da una giusta.
DO $$
DECLARE
  c TEXT;
BEGIN
  -- I codici 8 e 9 sono gli unici rimasti senza etichetta dopo la 030, e
  -- l'astensione e' deliberata: per l'8 c'e' un solo nome, per il 9 i campioni
  -- non concordano. Se un giorno qualcuno li mappasse per completezza, questa
  -- asserzione lo fermerebbe abbastanza a lungo da leggere il perche'.
  SELECT public.tournament_category('9') INTO c;
  IF c IS NOT NULL THEN
    RAISE EXCEPTION 'I4 FALLITO: il codice 9 ha ricevuto la categoria "%"', c;
  END IF;
  SELECT public.tournament_category('8') INTO c;
  IF c IS NOT NULL THEN
    RAISE EXCEPTION 'I4 FALLITO: il codice 8 ha ricevuto la categoria "%"', c;
  END IF;
  -- E cio' che la 030 ha aggiunto c'e' davvero.
  SELECT public.tournament_category('4') INTO c;
  IF c <> 'Campionati del Mondo' THEN
    RAISE EXCEPTION 'I4 FALLITO: il codice 4 da "%"', c;
  END IF;
  SELECT public.tournament_category('51') INTO c;
  IF c <> 'BPT Elite16' THEN
    RAISE EXCEPTION 'I4 FALLITO: il codice 51 da "%"', c;
  END IF;
  SELECT public.tournament_category(NULL) INTO c;
  IF c IS NOT NULL THEN
    RAISE EXCEPTION 'I4 FALLITO: un tipo nullo ha una categoria';
  END IF;
  RAISE NOTICE 'I4 ok: cio che non e dimostrato resta senza etichetta';
END $$;

-- =============================================================================
-- PARTE L: la confederazione (migration 031)
-- =============================================================================

DO $$
DECLARE c TEXT;
BEGIN
  -- L1: un BPT e' FIVB anche se si chiama come una citta' e basta. E' il caso
  -- che il nome da solo non copre: 11.265 partite su 49.386 non contengono
  -- nessuna sigla, e sono quasi tutte queste.
  SELECT public.tournament_confederation('BPT Futures', 'Tlaxcala') INTO c;
  IF c <> 'FIVB' THEN
    RAISE EXCEPTION 'L1 FALLITO: un BPT senza sigla da "%"', c;
  END IF;

  -- L2: la sigla vince dove la categoria non decide.
  SELECT public.tournament_confederation('U18', 'CEV U18 ECH 2023') INTO c;
  IF c <> 'CEV' THEN RAISE EXCEPTION 'L2 FALLITO: CEV da "%"', c; END IF;
  SELECT public.tournament_confederation('Continental Tour', 'AVC Beach Tour Samila Open') INTO c;
  IF c <> 'AVC' THEN RAISE EXCEPTION 'L2 FALLITO: AVC da "%"', c; END IF;
  SELECT public.tournament_confederation('U21', 'CAVB U21 Nations Championship') INTO c;
  IF c <> 'CAVB' THEN RAISE EXCEPTION 'L2 FALLITO: CAVB da "%"', c; END IF;
  SELECT public.tournament_confederation('U18', 'NEVZA U18 First-round Qualifier') INTO c;
  IF c <> 'CEV' THEN RAISE EXCEPTION 'L2 FALLITO: NEVZA da "%"', c; END IF;

  -- L3: l'aggettivo, dove la sigla manca.
  SELECT public.tournament_confederation('U21', 'Asian U21 Beach Volleyball Championships') INTO c;
  IF c <> 'AVC' THEN RAISE EXCEPTION 'L3 FALLITO: "Asian" da "%"', c; END IF;

  -- L4: cio' che una confederazione NON ce l'ha resta senza. I giochi
  -- multisport li organizza il comitato dei Giochi, i tour nazionali la
  -- federazione: attribuirli per riempire la colonna sarebbe inventare.
  SELECT public.tournament_confederation('Giochi multisport', '2024 FISU World University Championships') INTO c;
  IF c IS NOT NULL THEN
    RAISE EXCEPTION 'L4 FALLITO: i giochi universitari sono finiti in "%"', c;
  END IF;
  SELECT public.tournament_confederation('Tour nazionale', 'Austrian Beachvolleyball Tour Pro Baden') INTO c;
  IF c IS NOT NULL THEN
    RAISE EXCEPTION 'L4 FALLITO: un tour nazionale e finito in "%"', c;
  END IF;
  RAISE NOTICE 'L1-L4 ok: categoria, sigla, aggettivo — e il vuoto dove serve';
END $$;

-- L5: la confederazione arriva su torneo e partita, come la categoria.
DO $$
DECLARE
  t public.referee_tournament_stats;
  p public.referee_match_log;
BEGIN
  SELECT * INTO t FROM public.referee_tournament_stats
   WHERE vis_referee_no = '900001' AND tournament_no = '1';
  IF t.confederation IS DISTINCT FROM 'FIVB' THEN
    RAISE EXCEPTION 'L5 FALLITO: confederazione "%" sul torneo', t.confederation;
  END IF;
  SELECT * INTO p FROM public.referee_match_log
   WHERE vis_referee_no = '900001' AND match_no = 'M1';
  IF p.confederation IS DISTINCT FROM 'FIVB' THEN
    RAISE EXCEPTION 'L5 FALLITO: confederazione "%" sulla partita', p.confederation;
  END IF;
  RAISE NOTICE 'L5 ok: confederazione su torneo e partita';
END $$;

-- =============================================================================
-- PARTE M: le colonne per categoria (migration 032)
-- =============================================================================

DO $$
DECLARE
  r public.referee_category_stats;
  n INT;
  somma INT;
  totale INT;
BEGIN
  -- M1: le partite del 2026 del nostro arbitro sono 3, tutte su tornei di
  -- categoria BPT Futures (torneo 1) o senza categoria (torneo T2).
  SELECT count(*) INTO n FROM public.referee_category_stats
   WHERE vis_referee_no = '900001' AND season = 2026;
  IF n <> 2 THEN
    RAISE EXCEPTION 'M1 FALLITO: % righe categoria nel 2026, attese 2', n;
  END IF;

  SELECT * INTO r FROM public.referee_category_stats
   WHERE vis_referee_no = '900001' AND season = 2026 AND category = 'BPT Futures';
  IF r.matches <> 2 OR r.as_first <> 2 THEN
    RAISE EXCEPTION 'M1 FALLITO: BPT Futures % partite / % da primo',
      r.matches, r.as_first;
  END IF;

  -- M2: un torneo senza categoria non sparisce, diventa "Altro". Un arbitro
  -- che avesse arbitrato SOLO eventi non classificati resterebbe altrimenti
  -- fuori dalla tabella, con zero righe e nessun indizio del perche'.
  SELECT * INTO r FROM public.referee_category_stats
   WHERE vis_referee_no = '900001' AND season = 2026 AND category = 'Altro';
  IF r.matches <> 1 THEN
    RAISE EXCEPTION 'M2 FALLITO: la categoria Altro ha % partite, attesa 1', r.matches;
  END IF;
  RAISE NOTICE 'M1/M2 ok: per categoria, e cio che non ha categoria e Altro';

  -- M3: la somma delle categorie ricostruisce il totale della stagione. E' la
  -- proprieta' che rende le colonne affidabili: se non tornasse, la riga
  -- direbbe 3 e le sue colonne 2, senza che nulla segnali l'incoerenza.
  SELECT sum(matches) INTO somma FROM public.referee_category_stats
   WHERE vis_referee_no = '900001' AND season = 2026;
  SELECT matches INTO totale FROM public.referee_season_stats
   WHERE vis_referee_no = '900001' AND season = 2026;
  IF somma <> totale THEN
    RAISE EXCEPTION 'M3 FALLITO: colonne % contro totale %', somma, totale;
  END IF;
  RAISE NOTICE 'M3 ok: la somma delle categorie e il totale della stagione (%)', totale;
END $$;

-- =============================================================================
-- PARTE F: nessun DELETE nudo (migration 023)
-- =============================================================================
--
-- La produzione carica `safeupdate` e rifiuta i DELETE senza WHERE; questo
-- PostgreSQL usa-e-getta e' un'immagine di base e non ce l'ha, quindi la
-- prima versione della 022 passava qui e falliva la' con 21000. Non potendo
-- caricare l'estensione, si verifica la proprieta' direttamente sul sorgente
-- della funzione: e' una spia grezza, ma copre esattamente la regressione
-- osservata.

DO $$
DECLARE
  def TEXT;
BEGIN
  SELECT pg_get_functiondef('public.refresh_referee_stats()'::regprocedure) INTO def;
  IF def ~* 'DELETE\s+FROM\s+[a-z_.]+\s*;' THEN
    RAISE EXCEPTION 'F1 FALLITO: c''e'' un DELETE senza WHERE — su Supabase '
                    'fallirebbe con "DELETE requires a WHERE clause"';
  END IF;
  RAISE NOTICE 'F1 ok: ogni DELETE dichiara cosa cancella';
END $$;

\echo ''
\echo '================================================================'
\echo ' migration 022+023 / statistiche arbitro (issue #91): TUTTE LE ASSERZIONI OK'
\echo '================================================================'
