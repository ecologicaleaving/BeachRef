-- Regression test per la migration 028 (issue #97).
--
--   bash supabase/tests/run-migration-tests.sh
--
-- Prova cio' che un controllo d'accesso puo' sbagliare senza sembrare rotto:
-- lasciare i dati leggibili a chi non ha fatto l'accesso, farli vedere a chi
-- si e' autenticato ma non e' stato invitato, o lasciare che un codice a uso
-- singolo ne serva due.

\set ON_ERROR_STOP on

\ir fixtures/production_shape.sql
\ir ../migrations/018_restore_match_referees.sql
\ir ../migrations/019_sync_backlog.sql
\ir ../migrations/020_referees_name_is_not_an_identity.sql
\ir ../migrations/022_referee_stats.sql
\ir ../migrations/023_refresh_stats_safeupdate.sql
\ir ../migrations/024_referee_drilldown.sql
\ir ../migrations/025_gender_e_fase.sql
\ir ../migrations/027_tornei_misti.sql
\ir ../migrations/028_accesso_riservato.sql
-- La 029 arriva DOPO la chiusura: e' qui che si prova che aggiungere colonne
-- non riapre niente.
\ir ../migrations/029_categoria_torneo.sql

-- Due persone: una verra' invitata, l'altra no.
INSERT INTO auth.users (id, email, raw_user_meta_data) VALUES
  ('aaaaaaaa-0000-0000-0000-000000000001', 'invitata@example.com',
   '{"full_name": "Persona Invitata"}'),
  ('aaaaaaaa-0000-0000-0000-000000000002', 'estranea@example.com',
   '{"full_name": "Persona Estranea"}'),
  ('aaaaaaaa-0000-0000-0000-000000000003', 'terza@example.com',
   '{"full_name": "Persona Terza"}');

INSERT INTO public.invites (code, note, max_uses, expires_at, revoked) VALUES
  ('BUONO',    'per la persona invitata', 1, NULL, false),
  ('REVOCATO', 'ritirato',                1, NULL, true),
  ('SCADUTO',  'vecchio',                 1, now() - interval '1 day', false),
  ('DOPPIO',   'due usi',                 2, NULL, false);

-- Qualcosa da proteggere.
INSERT INTO public.referee_career_stats (vis_referee_no, referee_name, matches)
VALUES ('900001', 'Persona Da Proteggere', 42);

-- =============================================================================
-- PARTE A: i permessi, prima ancora delle policy
-- =============================================================================

DO $$
DECLARE
  t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY['referee_season_stats', 'referee_career_stats',
                           'referee_tournament_stats', 'referee_match_log'] LOOP
    IF has_table_privilege('anon', 'public.' || t, 'SELECT') THEN
      RAISE EXCEPTION 'A1 FALLITO: anon legge ancora %', t;
    END IF;
  END LOOP;
  RAISE NOTICE 'A1 ok: la chiave anonima non apre piu'' le statistiche';
END $$;

-- A2: i codici di invito non sono enumerabili. Se lo fossero, chiunque abbia
-- fatto l'accesso potrebbe iscrivere se stesso e chi vuole.
DO $$
BEGIN
  IF has_table_privilege('authenticated', 'public.invites', 'SELECT')
  OR has_table_privilege('anon', 'public.invites', 'SELECT') THEN
    RAISE EXCEPTION 'A2 FALLITO: i codici di invito sono leggibili';
  END IF;
  RAISE NOTICE 'A2 ok: i codici non si possono enumerare';
END $$;

-- =============================================================================
-- PARTE B: l'iscrizione
-- =============================================================================

-- B1: senza accesso non ci si iscrive.
DO $$
DECLARE
  r RECORD;
BEGIN
  PERFORM set_config('test.uid', '', true);
  SELECT * INTO r FROM public.redeem_invite('BUONO');
  IF r.ok THEN
    RAISE EXCEPTION 'B1 FALLITO: iscrizione riuscita senza autenticazione';
  END IF;
  RAISE NOTICE 'B1 ok: senza accesso non ci si iscrive (%)', r.reason;
END $$;

-- B2: con un codice che non esiste, nemmeno.
DO $$
DECLARE
  r RECORD;
BEGIN
  PERFORM set_config('test.uid', 'aaaaaaaa-0000-0000-0000-000000000001', true);
  SELECT * INTO r FROM public.redeem_invite('INVENTATO');
  IF r.ok THEN
    RAISE EXCEPTION 'B2 FALLITO: un codice inventato ha funzionato';
  END IF;
  RAISE NOTICE 'B2 ok: codice inesistente rifiutato';
END $$;

-- B3: revocato e scaduto sono rifiutati, e con motivi distinti — chi legge il
-- registro deve sapere quale dei due e' successo.
DO $$
DECLARE
  a RECORD;
  b RECORD;
BEGIN
  PERFORM set_config('test.uid', 'aaaaaaaa-0000-0000-0000-000000000001', true);
  SELECT * INTO a FROM public.redeem_invite('REVOCATO');
  SELECT * INTO b FROM public.redeem_invite('SCADUTO');
  IF a.ok OR b.ok THEN
    RAISE EXCEPTION 'B3 FALLITO: revocato=% scaduto=%', a.ok, b.ok;
  END IF;
  IF a.reason = b.reason THEN
    RAISE EXCEPTION 'B3 FALLITO: stesso motivo per due guasti diversi (%)', a.reason;
  END IF;
  RAISE NOTICE 'B3 ok: % / %', a.reason, b.reason;
END $$;

-- B4: il codice buono funziona, e consuma un uso.
DO $$
DECLARE
  r RECORD;
  u INT;
BEGIN
  PERFORM set_config('test.uid', 'aaaaaaaa-0000-0000-0000-000000000001', true);
  SELECT * INTO r FROM public.redeem_invite('BUONO');
  IF NOT r.ok THEN
    RAISE EXCEPTION 'B4 FALLITO: il codice buono e'' stato rifiutato (%)', r.reason;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.app_users
                  WHERE id = 'aaaaaaaa-0000-0000-0000-000000000001') THEN
    RAISE EXCEPTION 'B4 FALLITO: nessuna riga in app_users';
  END IF;
  SELECT uses INTO u FROM public.invites WHERE code = 'BUONO';
  IF u <> 1 THEN
    RAISE EXCEPTION 'B4 FALLITO: usi = %, atteso 1', u;
  END IF;
  RAISE NOTICE 'B4 ok: iscritta, e il codice risulta usato';
END $$;

-- B5: riaprire il link non consuma un secondo uso. Succedera' — la gente
-- riapre i link — e un codice a uso singolo bruciato dal suo stesso
-- proprietario sarebbe indistinguibile da un abuso.
DO $$
DECLARE
  r RECORD;
  u INT;
  n INT;
BEGIN
  PERFORM set_config('test.uid', 'aaaaaaaa-0000-0000-0000-000000000001', true);
  SELECT * INTO r FROM public.redeem_invite('BUONO');
  IF NOT r.ok THEN
    RAISE EXCEPTION 'B5 FALLITO: la seconda apertura ha respinto chi era gia'' dentro';
  END IF;
  SELECT uses INTO u FROM public.invites WHERE code = 'BUONO';
  IF u <> 1 THEN
    RAISE EXCEPTION 'B5 FALLITO: usi = %, il codice si e'' consumato di nuovo', u;
  END IF;
  SELECT count(*) INTO n FROM public.app_users
   WHERE id = 'aaaaaaaa-0000-0000-0000-000000000001';
  IF n <> 1 THEN
    RAISE EXCEPTION 'B5 FALLITO: % righe in app_users per la stessa persona', n;
  END IF;
  RAISE NOTICE 'B5 ok: riaprire il link e'' innocuo';
END $$;

-- B6: un codice a uso singolo gia' consumato non serve a un secondo.
DO $$
DECLARE
  r RECORD;
BEGIN
  PERFORM set_config('test.uid', 'aaaaaaaa-0000-0000-0000-000000000002', true);
  SELECT * INTO r FROM public.redeem_invite('BUONO');
  IF r.ok THEN
    RAISE EXCEPTION 'B6 FALLITO: un secondo si e'' iscritto con lo stesso codice';
  END IF;
  IF EXISTS (SELECT 1 FROM public.app_users
              WHERE id = 'aaaaaaaa-0000-0000-0000-000000000002') THEN
    RAISE EXCEPTION 'B6 FALLITO: riga creata malgrado il rifiuto';
  END IF;
  RAISE NOTICE 'B6 ok: uso singolo vuol dire uno (%)', r.reason;
END $$;

-- B7: e un codice a due usi ne serve due.
DO $$
DECLARE
  r RECORD;
BEGIN
  PERFORM set_config('test.uid', 'aaaaaaaa-0000-0000-0000-000000000002', true);
  SELECT * INTO r FROM public.redeem_invite('DOPPIO');
  IF NOT r.ok THEN
    RAISE EXCEPTION 'B7 FALLITO: primo uso rifiutato (%)', r.reason;
  END IF;
  PERFORM set_config('test.uid', 'aaaaaaaa-0000-0000-0000-000000000003', true);
  SELECT * INTO r FROM public.redeem_invite('DOPPIO');
  IF NOT r.ok THEN
    RAISE EXCEPTION 'B7 FALLITO: secondo uso rifiutato (%)', r.reason;
  END IF;
  RAISE NOTICE 'B7 ok: max_uses e'' rispettato in entrambi i versi';
END $$;

-- =============================================================================
-- PARTE C: cosa si vede davvero, con i permessi di un utente vero
-- =============================================================================

-- C1: un utente autenticato ma NON invitato non vede niente. E' il caso
-- centrale: chiunque ha un account Google, quindi autenticarsi non puo'
-- bastare.
DO $$
DECLARE
  n INT;
BEGIN
  PERFORM set_config('test.uid', 'aaaaaaaa-0000-0000-0000-000000000009', true);
  SET LOCAL ROLE authenticated;
  SELECT count(*) INTO n FROM public.referee_career_stats;
  RESET ROLE;
  IF n <> 0 THEN
    RAISE EXCEPTION 'C1 FALLITO: un non invitato vede % righe', n;
  END IF;
  RAISE NOTICE 'C1 ok: autenticarsi non basta';
END $$;

-- C2: un invitato vede.
DO $$
DECLARE
  n INT;
BEGIN
  PERFORM set_config('test.uid', 'aaaaaaaa-0000-0000-0000-000000000001', true);
  SET LOCAL ROLE authenticated;
  SELECT count(*) INTO n FROM public.referee_career_stats;
  RESET ROLE;
  IF n <> 1 THEN
    RAISE EXCEPTION 'C2 FALLITO: un invitato vede % righe, attesa 1', n;
  END IF;
  RAISE NOTICE 'C2 ok: chi e'' stato invitato vede le statistiche';
END $$;

-- C3: e non puo' scriverle. Le statistiche le calcola il worker, non chi le
-- guarda.
DO $$
BEGIN
  PERFORM set_config('test.uid', 'aaaaaaaa-0000-0000-0000-000000000001', true);
  BEGIN
    SET LOCAL ROLE authenticated;
    UPDATE public.referee_career_stats SET matches = 999 WHERE vis_referee_no = '900001';
    RESET ROLE;
    RAISE EXCEPTION 'C3 FALLITO: un invitato ha riscritto le proprie statistiche';
  EXCEPTION WHEN insufficient_privilege THEN
    RESET ROLE;
    RAISE NOTICE 'C3 ok: si legge, non si scrive';
  END;
END $$;

-- C4: `is_authorized()` dice la verita' a entrambi. E' cio' su cui la pagina
-- decide se mostrare le statistiche o il messaggio di rifiuto.
DO $$
DECLARE
  dentro BOOLEAN;
  fuori  BOOLEAN;
BEGIN
  PERFORM set_config('test.uid', 'aaaaaaaa-0000-0000-0000-000000000001', true);
  SELECT public.is_authorized() INTO dentro;
  PERFORM set_config('test.uid', 'aaaaaaaa-0000-0000-0000-000000000009', true);
  SELECT public.is_authorized() INTO fuori;
  IF NOT dentro OR fuori THEN
    RAISE EXCEPTION 'C4 FALLITO: invitato=% estraneo=%', dentro, fuori;
  END IF;
  RAISE NOTICE 'C4 ok: is_authorized distingue i due casi';
END $$;

-- C5: nessuno vede la lista degli altri autorizzati.
DO $$
DECLARE
  n INT;
BEGIN
  PERFORM set_config('test.uid', 'aaaaaaaa-0000-0000-0000-000000000001', true);
  SET LOCAL ROLE authenticated;
  SELECT count(*) INTO n FROM public.app_users;
  RESET ROLE;
  IF n <> 1 THEN
    RAISE EXCEPTION 'C5 FALLITO: un utente vede % righe di app_users', n;
  END IF;
  RAISE NOTICE 'C5 ok: ognuno vede solo se stesso';
END $$;

-- =============================================================================
-- PARTE D: idempotenza
-- =============================================================================

\ir ../migrations/028_accesso_riservato.sql

DO $$
DECLARE
  n INT;
BEGIN
  SELECT count(*) INTO n FROM public.schema_versions WHERE version = '4.6.0';
  IF n <> 1 THEN
    RAISE EXCEPTION 'D1 FALLITO: schema_versions ha % righe per 4.6.0', n;
  END IF;
  SELECT count(*) INTO n FROM public.app_users;
  IF n <> 3 THEN
    RAISE EXCEPTION 'D1 FALLITO: riapplicare la 028 ha cambiato gli iscritti (%)', n;
  END IF;
  RAISE NOTICE 'D1 ok: riapplicarla non cambia nulla e non sblocca nessuno';
END $$;

-- E1b: la 029, applicata dopo, non ha riaperto le tabelle. Una migration che
-- aggiunge colonne non dovrebbe toccare i permessi — ma "non dovrebbe" e'
-- esattamente il genere di cosa che va verificata.
DO $$
DECLARE t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY['referee_tournament_stats', 'referee_match_log'] LOOP
    IF has_table_privilege('anon', 'public.' || t, 'SELECT') THEN
      RAISE EXCEPTION 'E1b FALLITO: dopo la 029 anon legge %', t;
    END IF;
  END LOOP;
  RAISE NOTICE 'E1b ok: aggiungere colonne non riapre le tabelle';
END $$;

\echo ''
\echo '================================================================'
\echo ' migration 028+029 / accesso riservato (issue #97): TUTTE LE ASSERZIONI OK'
\echo '================================================================'
