-- Migration 028: le statistiche diventano riservate (issue #97)
--
-- =============================================================================
-- COSA CAMBIA, E DOVE STA DAVVERO IL LUCCHETTO
-- =============================================================================
--
-- La 022 e la 024 hanno aperto quattro tabelle in lettura ad `anon`, cioe' a
-- chiunque: la chiave anonima e' dentro il bundle servito ai browser e si
-- estrae in dieci secondi. Nascondere la pagina non nasconde i dati — basta un
-- `curl` su PostgREST per averli tutti.
--
-- Quindi il lucchetto va messo QUI, non nella schermata:
--
--   `anon`          perde il SELECT sulle quattro tabelle
--   `authenticated` lo ottiene, ma SOLO se ha una riga in `app_users`
--
-- Un utente Google che non e' stato invitato si autentica benissimo e non
-- vede niente. E' esattamente la distinzione richiesta: l'accesso con Google
-- dice CHI SEI, `app_users` dice SE PUOI ENTRARE.
--
-- =============================================================================
-- L'ISCRIZIONE
-- =============================================================================
--
-- Non c'e' nessun bottone "Iscriviti" sul sito. Ci si iscrive da una pagina
-- non collegata, il cui indirizzo viene mandato a mano — e quell'indirizzo
-- porta un CODICE.
--
-- Senza codice, il segreto dell'URL sarebbe l'intero controllo d'accesso: chi
-- lo inoltra autorizza qualcun altro, e chi lo trova in una cronologia si
-- iscrive da solo. Con il codice, un URL che circola da solo non serve a
-- niente, ogni codice e' revocabile e si sa a chi era stato dato.
--
-- Il codice **non e' una password**: viaggia in chiaro nel link, come deve.
-- Serve a limitare chi puo' iscriversi, non a proteggere un segreto.

BEGIN;

-- =============================================================================
-- 1. CHI PUO' ENTRARE
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.app_users (
  id          UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email       TEXT,
  display_name TEXT,
  invited_by  TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.app_users IS
  'Le persone autorizzate a vedere le statistiche. L''esistenza di un utente '
  'in `auth.users` NON basta: chiunque abbia un account Google puo'' '
  'autenticarsi, ed e'' questa riga a dire che puo'' entrare. Issue #97.';

-- =============================================================================
-- 2. GLI INVITI
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.invites (
  code        TEXT PRIMARY KEY,
  note        TEXT,
  max_uses    INTEGER NOT NULL DEFAULT 1 CHECK (max_uses > 0),
  uses        INTEGER NOT NULL DEFAULT 0 CHECK (uses >= 0),
  expires_at  TIMESTAMPTZ,
  revoked     BOOLEAN NOT NULL DEFAULT false,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.invites IS
  'Codici d''invito. `note` dice a chi e'' stato dato un codice — senza, '
  'revocarlo significa non sapere chi si sta escludendo. Issue #97.';

COMMENT ON COLUMN public.invites.code IS
  'Viaggia in chiaro nel link di iscrizione: NON e'' una password. Serve a '
  'limitare chi puo'' iscriversi, non a custodire un segreto.';

-- =============================================================================
-- 3. L'ISCRIZIONE, COME FUNZIONE
-- =============================================================================
--
-- SECURITY DEFINER, e per una ragione precisa: la pagina di iscrizione gira
-- con i permessi dell'utente appena autenticato, che su `invites` e
-- `app_users` non ne ha nessuno — ne' deve averne. Se `invites` fosse
-- leggibile dal client, un curioso potrebbe enumerare i codici validi.
--
-- La funzione e' l'unico modo di iscriversi, e valida tutto da sola.

CREATE OR REPLACE FUNCTION public.redeem_invite(p_code TEXT)
RETURNS TABLE (ok BOOLEAN, reason TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  u   UUID := auth.uid();
  inv public.invites;
BEGIN
  IF u IS NULL THEN
    ok := false; reason := 'non autenticato'; RETURN NEXT; RETURN;
  END IF;

  -- Gia' dentro: l'iscrizione e' idempotente. Riaprire il link non deve
  -- consumare un secondo uso del codice.
  IF EXISTS (SELECT 1 FROM public.app_users WHERE id = u) THEN
    ok := true; reason := 'gia iscritto'; RETURN NEXT; RETURN;
  END IF;

  -- FOR UPDATE: due iscrizioni simultanee sullo stesso codice a uso singolo
  -- devono riuscire UNA sola volta. Senza il lock, entrambe leggerebbero
  -- `uses = 0` e passerebbero.
  SELECT * INTO inv FROM public.invites WHERE code = p_code FOR UPDATE;

  IF inv IS NULL THEN
    ok := false; reason := 'codice inesistente'; RETURN NEXT; RETURN;
  END IF;
  IF inv.revoked THEN
    ok := false; reason := 'codice revocato'; RETURN NEXT; RETURN;
  END IF;
  IF inv.expires_at IS NOT NULL AND inv.expires_at < now() THEN
    ok := false; reason := 'codice scaduto'; RETURN NEXT; RETURN;
  END IF;
  IF inv.uses >= inv.max_uses THEN
    ok := false; reason := 'codice gia utilizzato'; RETURN NEXT; RETURN;
  END IF;

  INSERT INTO public.app_users (id, email, display_name, invited_by)
  SELECT u,
         au.email,
         COALESCE(au.raw_user_meta_data ->> 'full_name', au.email),
         p_code
    FROM auth.users au
   WHERE au.id = u;

  UPDATE public.invites SET uses = uses + 1 WHERE code = p_code;

  ok := true; reason := 'iscritto'; RETURN NEXT;
END $$;

COMMENT ON FUNCTION public.redeem_invite(TEXT) IS
  'L''unico modo di iscriversi. SECURITY DEFINER perche'' `invites` non e'' '
  'leggibile dal client: un curioso non deve poter enumerare i codici validi. '
  'Idempotente, e il lock FOR UPDATE impedisce che due iscrizioni simultanee '
  'consumino lo stesso codice a uso singolo. Issue #97.';

REVOKE ALL ON FUNCTION public.redeem_invite(TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.redeem_invite(TEXT) TO authenticated;

-- Serve alla pagina per sapere se chi ha appena fatto l'accesso e' dentro.
-- Restituisce un booleano e nient'altro: non espone la tabella.
CREATE OR REPLACE FUNCTION public.is_authorized()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, pg_temp
STABLE
AS $$
  SELECT EXISTS (SELECT 1 FROM public.app_users WHERE id = auth.uid());
$$;

REVOKE ALL ON FUNCTION public.is_authorized() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_authorized() TO authenticated;

-- =============================================================================
-- 4. LE TABELLE RESTANO CHIUSE, MA A CHI
-- =============================================================================

ALTER TABLE public.app_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invites   ENABLE ROW LEVEL SECURITY;

-- Nessuna policy su `invites`: nessuno la legge dal client, mai.
-- Su `app_users`, ognuno vede solo se stesso — serve a poco, ma "vedo la lista
-- di chi altro e' autorizzato" non e' un permesso che qualcuno ha chiesto.
DROP POLICY IF EXISTS app_users_self ON public.app_users;
CREATE POLICY app_users_self ON public.app_users
  FOR SELECT TO authenticated USING (id = auth.uid());

GRANT SELECT ON public.app_users TO authenticated;

-- Le quattro tabelle delle statistiche: via `anon`, dentro gli autorizzati.
DO $$
DECLARE
  t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY['referee_season_stats', 'referee_career_stats',
                           'referee_tournament_stats', 'referee_match_log'] LOOP
    -- Si tolgono ENTRAMBE: quella aperta della 022/024 e quella che questa
    -- migration sta per creare. Senza la seconda, riapplicare la 028 fallisce
    -- con "policy already exists" — e una migration che non si puo' rigiocare
    -- e' una migration che nessuno osa rigiocare.
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', t || '_public_read', t);
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', t || '_authorized_read', t);
    EXECUTE format('REVOKE ALL ON public.%I FROM anon', t);
    EXECUTE format(
      'CREATE POLICY %I ON public.%I FOR SELECT TO authenticated '
      'USING (EXISTS (SELECT 1 FROM public.app_users WHERE id = auth.uid()))',
      t || '_authorized_read', t);
    EXECUTE format('GRANT SELECT ON public.%I TO authenticated', t);
  END LOOP;
END $$;

-- =============================================================================
-- 5. POST-CONDIZIONI
-- =============================================================================

DO $$
DECLARE
  t TEXT;
  v TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY['referee_season_stats', 'referee_career_stats',
                           'referee_tournament_stats', 'referee_match_log'] LOOP
    IF has_table_privilege('anon', 'public.' || t, 'SELECT') THEN
      RAISE EXCEPTION '028: anon legge ancora %, la pagina sarebbe teatro', t;
    END IF;
    IF NOT has_table_privilege('authenticated', 'public.' || t, 'SELECT') THEN
      RAISE EXCEPTION '028: authenticated non legge %, nessuno vedrebbe nulla', t;
    END IF;
    FOREACH v IN ARRAY ARRAY['INSERT', 'UPDATE', 'DELETE'] LOOP
      IF has_table_privilege('authenticated', 'public.' || t, v) THEN
        RAISE EXCEPTION '028: authenticated puo fare % su %', v, t;
      END IF;
    END LOOP;
  END LOOP;

  IF has_table_privilege('anon', 'public.app_users', 'SELECT')
  OR has_table_privilege('anon', 'public.invites', 'SELECT') THEN
    RAISE EXCEPTION '028: anon legge app_users o invites';
  END IF;
  IF has_table_privilege('authenticated', 'public.invites', 'SELECT') THEN
    RAISE EXCEPTION '028: un utente autenticato puo enumerare i codici di invito';
  END IF;
END $$;

INSERT INTO public.schema_versions (version, description)
SELECT '4.6.0',
       'Issue #97: le statistiche passano da anon ad authenticated + riga in '
       'app_users. Iscrizione solo via redeem_invite con codice.'
WHERE NOT EXISTS (
  SELECT 1 FROM public.schema_versions WHERE version = '4.6.0'
);

COMMIT;
