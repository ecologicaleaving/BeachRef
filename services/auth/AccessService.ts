/**
 * L'accesso, in un posto solo (issue #97).
 *
 * Due domande distinte, e tenerle distinte e' il punto:
 *
 *   CHI SEI      lo dice Google, tramite Supabase Auth
 *   SE PUOI      lo dice una riga in `app_users`
 *
 * Chiunque ha un account Google. Se le due domande si confondessero,
 * "autenticato" diventerebbe "autorizzato" e la pagina statistiche sarebbe
 * pubblica con un passaggio in piu'.
 *
 * ## Perche' `@supabase/supabase-js` si carica quando serve
 *
 * Pesa. La pagina statistiche legge PostgREST con `fetch` proprio per non
 * trascinarlo nel bundle (vedi "Web bundle weight" in CLAUDE.md), ma
 * l'autenticazione OAuth non si fa a mano: gestione del PKCE, dello scambio
 * del codice, del refresh del token. Quindi il client c'e', ma arriva con un
 * `import()` dinamico — che Metro sa spezzare in un chunk separato, mentre un
 * `require()` dentro una funzione lo risolverebbe staticamente (issue #45).
 *
 * Il costo lo paga solo chi apre `/accedi` o `/iscrizione`.
 */

import type { SupabaseClient, Session } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

export type StatoAccesso =
  | { stato: 'non_configurato'; dettaglio: string }
  | { stato: 'anonimo' }
  | { stato: 'autenticato_non_autorizzato'; email: string | null }
  | { stato: 'autorizzato'; email: string | null; nome: string | null };

let clientPromise: Promise<SupabaseClient> | null = null;

const OPZIONI = {
  auth: {
    // Il ritorno da Google arriva con il codice nell'URL: qui va letto, a
    // differenza del client generale dell'app che lo disabilita.
    detectSessionInUrl: true,
    persistSession: true,
    autoRefreshToken: true,
    flowType: 'pkce' as const,
  },
};

/**
 * Una promise respinta resta respinta.
 *
 * Memorizzando il client senza dimenticare i fallimenti, un `import()` andato
 * male una volta — la rete che cade mentre si scarica il chunk — renderebbe
 * l'accesso impossibile per tutta la durata della pagina, e ricaricare sarebbe
 * l'unico rimedio. Si rilancia comunque: chi ha chiamato deve vedere l'errore,
 * ma il tentativo successivo riprova davvero.
 */
function dimenticaERilancia(err: unknown): never {
  clientPromise = null;
  throw err;
}

export function accessoConfigurato(): boolean {
  return Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);
}

/**
 * Il client, costruito al primo uso e non all'import.
 *
 * `createClient` lancia se l'URL manca, e un modulo che lancia mentre viene
 * importato non ha via di degradazione: e' il difetto che ha tenuto inerte
 * `DualReadService` per mesi (issue #54). Qui l'assenza delle variabili e' uno
 * stato che si puo' mostrare, non un'eccezione.
 */
async function client(): Promise<SupabaseClient> {
  if (!accessoConfigurato()) {
    throw new Error(
      'Supabase non e configurato: mancano EXPO_PUBLIC_SUPABASE_URL o EXPO_PUBLIC_SUPABASE_ANON_KEY'
    );
  }
  if (!clientPromise) {
    clientPromise = import('@supabase/supabase-js')
      .then((m) => m.createClient(SUPABASE_URL!, SUPABASE_ANON_KEY!, OPZIONI))
      .catch(dimenticaERilancia);
  }
  return clientPromise;
}

/** Dove Google deve riportare l'utente dopo il consenso. */
function ritorno(percorso: string): string | undefined {
  if (typeof window === 'undefined') return undefined;
  return `${window.location.origin}${percorso}`;
}

export async function entraConGoogle(percorsoDiRitorno: string): Promise<void> {
  const sb = await client();
  // `redirectTo` si omette invece di passarlo `undefined`: con
  // `exactOptionalPropertyTypes` non sono la stessa cosa, e fuori dal browser
  // (render lato server) un ritorno non esiste.
  const dove = ritorno(percorsoDiRitorno);
  const { error } = await sb.auth.signInWithOAuth({
    provider: 'google',
    options: dove ? { redirectTo: dove } : {},
  });
  if (error) throw new Error(error.message);
}

export async function esci(): Promise<void> {
  if (!accessoConfigurato()) return;
  const sb = await client();
  await sb.auth.signOut();
}

async function sessione(): Promise<Session | null> {
  const sb = await client();
  const { data } = await sb.auth.getSession();
  return data.session ?? null;
}

/**
 * Lo stato corrente, in una domanda sola.
 *
 * L'autorizzazione la decide il DATABASE, non questo codice: `is_authorized()`
 * guarda `app_users` con i permessi del chiamante. Una risposta calcolata qui
 * sarebbe un'opinione del browser, e il browser e' di chi lo usa.
 */
export async function statoAccesso(): Promise<StatoAccesso> {
  if (!accessoConfigurato()) {
    return {
      stato: 'non_configurato',
      dettaglio:
        'Mancano EXPO_PUBLIC_SUPABASE_URL e/o EXPO_PUBLIC_SUPABASE_ANON_KEY. ' +
        'Vanno impostate su Netlify (Site settings, Environment variables).',
    };
  }

  const s = await sessione();
  if (!s) return { stato: 'anonimo' };

  const sb = await client();
  const { data, error } = await sb.rpc('is_authorized');
  const email = s.user.email ?? null;

  if (error || data !== true) {
    return { stato: 'autenticato_non_autorizzato', email };
  }
  return {
    stato: 'autorizzato',
    email,
    nome: (s.user.user_metadata?.full_name as string | undefined) ?? email,
  };
}

export type EsitoIscrizione = { ok: boolean; motivo: string };

/**
 * Riscatta un codice di invito per l'utente appena autenticato.
 *
 * Tutta la validazione sta nella funzione SQL: scadenza, revoca, usi residui,
 * e il lock che impedisce a due iscrizioni simultanee di consumare lo stesso
 * codice a uso singolo. Qui non si controlla nulla — un controllo nel browser
 * si aggira aprendo la console.
 */
export async function iscriviti(codice: string): Promise<EsitoIscrizione> {
  const sb = await client();
  const { data, error } = await sb.rpc('redeem_invite', { p_code: codice });
  if (error) return { ok: false, motivo: error.message };

  const riga = Array.isArray(data) ? data[0] : data;
  return { ok: Boolean(riga?.ok), motivo: riga?.reason ?? 'esito sconosciuto' };
}

/** Il token da mettere in `Authorization` per leggere le tabelle protette. */
export async function tokenCorrente(): Promise<string | null> {
  if (!accessoConfigurato()) return null;
  const s = await sessione();
  return s?.access_token ?? null;
}
