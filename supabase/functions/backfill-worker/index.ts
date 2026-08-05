/**
 * backfill-worker — un ciclo della coda di backfill (issue #90).
 *
 * Invocata da `pg_cron` ogni 15 minuti. Ogni esecuzione:
 *
 *   1. preleva fino a `batch_size` unita' con `claim_backfill_batch()`;
 *   2. per ciascuna, scarica le partite dell'evento dal VIS con concorrenza
 *      `vis_concurrency`;
 *   3. fa upsert di arbitri, partite e assegnazioni;
 *   4. chiude l'unita' con `complete_backfill_item()`, oppure la riaccoda con
 *      `fail_backfill_item()`.
 *
 * Questo file e' **solo I/O**. Prelievo, backoff, tetto tentativi e recupero
 * delle unita' abbandonate vivono in funzioni SQL (migration 019), perche'
 * `FOR UPDATE SKIP LOCKED` e' una primitiva del database e perche' cosi' la
 * semantica della coda si prova con un PostgreSQL in Docker, senza Deno e
 * senza rete: `supabase/tests/sync_backlog.test.sql`.
 *
 * ## Rotte
 *
 *   POST /            un ciclo di lavoro (e' quella che chiama il cron)
 *   POST /seed        semina la coda dagli eventi VIS; body: {"seasons":[...]}
 *   GET  /progress    lo stato della coda
 */

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

import {
  buildEventListRequest,
  buildMatchListRequest,
  mapWithConcurrency,
  parseEvents,
  parseMatches,
  setVisMinIntervalMs,
  visRequest,
  type VisMatch,
} from './vis.ts';

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body, null, 2), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });

/** Chiamata a PostgREST con la service_role key. */
async function pg(path: string, init: RequestInit = {}): Promise<Response> {
  return await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    ...init,
    headers: {
      apikey: SERVICE_KEY,
      Authorization: `Bearer ${SERVICE_KEY}`,
      'Content-Type': 'application/json',
      ...(init.headers ?? {}),
    },
  });
}

async function pgJson<T>(path: string, init: RequestInit = {}): Promise<T> {
  const res = await pg(path, init);
  const text = await res.text();
  if (!res.ok) {
    throw new Error(`PostgREST ${res.status} su ${path}: ${text.slice(0, 400)}`);
  }
  return text ? JSON.parse(text) as T : (undefined as T);
}

const rpc = <T>(fn: string, args: unknown = {}) =>
  pgJson<T>(`rpc/${fn}`, { method: 'POST', body: JSON.stringify(args) });

interface BacklogItem {
  event_no: string;
  season: number | null;
  attempts: number;
}

/**
 * Gli arbitri visti in una risposta VIS.
 *
 * **Non si spezza il nome in nome/cognome.** Il VIS restituisce
 * "Lowry Suzanne" (cognome prima) dove `referees.referee_id` contiene
 * "Jonathan Lamprecht" (nome prima): non c'e' una regola che distingua i due
 * casi, e indovinare significherebbe sporcare 480 anagrafiche reali con
 * inversioni invisibili. Il nome completo va in `referee_id`, che e' gia' il
 * campo che la produzione usa per la visualizzazione; `first_name` e
 * `last_name` restano come sono.
 */
function refereesFrom(matches: VisMatch[]) {
  const seen = new Map<string, { vis_referee_no: string; referee_id?: string; federation_code?: string }>();
  for (const m of matches) {
    if (m.noReferee1) {
      seen.set(m.noReferee1, {
        vis_referee_no: m.noReferee1,
        referee_id: m.referee1Name,
        federation_code: m.referee1FederationCode,
      });
    }
    if (m.noReferee2) {
      seen.set(m.noReferee2, {
        vis_referee_no: m.noReferee2,
        referee_id: m.referee2Name,
        federation_code: m.referee2FederationCode,
      });
    }
  }
  return [...seen.values()];
}

function matchRow(m: VisMatch, eventNo: string, knownTournamentNo?: string) {
  return {
    no: m.no,
    // `tournament_no` e' NOT NULL, quindi serve sempre un valore.
    //
    // L'ordine di preferenza NON e' un dettaglio: con `merge-duplicates` ogni
    // colonna qui elencata SOVRASCRIVE quella esistente. Ripiegare sull'evento
    // per una partita gia' in tabella significherebbe sostituire un
    // `tournament_no` corretto con l'identificativo dell'evento — su 9.570
    // righe che il database ha gia'.
    //
    //   1. quello che dice il VIS adesso (fonte di verita');
    //   2. quello che la riga ha GIA' (se esiste): non peggioriamo un dato;
    //   3. l'evento, solo per una riga nuova che altrimenti non entrerebbe.
    tournament_no: m.noTournament ?? knownTournamentNo ?? eventNo,
    no_in_tournament: m.noInTournament ?? null,
    team_a_name: m.teamAName ?? null,
    team_b_name: m.teamBName ?? null,
    local_date: m.localDate ?? null,
    local_time: m.localTime ?? null,
    court: m.court ?? null,
    status: m.status ?? null,
    round: m.round ?? null,
    match_points_a: m.matchPointsA ?? null,
    match_points_b: m.matchPointsB ?? null,
    points_team_a_set1: m.pointsTeamASet1 ?? null,
    points_team_b_set1: m.pointsTeamBSet1 ?? null,
    points_team_a_set2: m.pointsTeamASet2 ?? null,
    points_team_b_set2: m.pointsTeamBSet2 ?? null,
    points_team_a_set3: m.pointsTeamASet3 ?? null,
    points_team_b_set3: m.pointsTeamBSet3 ?? null,
    duration_set1: m.durationSet1 ?? null,
    duration_set2: m.durationSet2 ?? null,
    duration_set3: m.durationSet3 ?? null,
    // La ragione di tutta la issue: gli identificativi, non i nomi.
    no_referee1: m.noReferee1 ?? null,
    no_referee2: m.noReferee2 ?? null,
    referee1_name: m.referee1Name ?? null,
    referee2_name: m.referee2Name ?? null,
    referee1_federation_code: m.referee1FederationCode ?? null,
    referee2_federation_code: m.referee2FederationCode ?? null,
    last_synced: new Date().toISOString(),
  };
}

/** Un evento: scarica, scrive, restituisce quante partite ha visto. */
async function processEvent(item: BacklogItem): Promise<number> {
  const xml = await visRequest(buildMatchListRequest(item.event_no));
  const matches = parseMatches(xml);

  if (matches.length === 0) {
    // Non e' un errore: un evento puo' non avere partite pubblicate. Si chiude
    // con 0, altrimenti resterebbe in coda a ritentare per sempre.
    return 0;
  }

  // 1. Anagrafiche arbitro. `resolution=ignore-duplicates` e NON
  //    merge-duplicates: un arbitro gia' presente non va sovrascritto con cio'
  //    che il VIS espone in questa risposta, che e' meno di quanto potremmo
  //    gia' avere.
  const referees = refereesFrom(matches);
  if (referees.length > 0) {
    await pgJson(`referees?on_conflict=vis_referee_no`, {
      method: 'POST',
      body: JSON.stringify(referees),
      headers: { Prefer: 'resolution=ignore-duplicates,return=minimal' },
    });
  }

  // 2. Partite. `merge-duplicates` qui SI: il VIS e' la fonte di verita' per
  //    punteggi e stato, che cambiano.
  //
  //    Prima pero' si legge il `tournament_no` gia' presente per queste
  //    partite: serve a non peggiorare righe esistenti quando il VIS non
  //    espone `NoTournament` (vedi `matchRow`). Una query in piu' per evento,
  //    a fronte di 9.570 righe che non vanno sporcate.
  const nos = matches.map((m) => m.no);
  const existing = await pgJson<{ no: string; tournament_no: string }[]>(
    `matches?select=no,tournament_no&no=in.(${nos.map((n) => `"${n}"`).join(',')})`,
  );
  const knownTournament = new Map(existing.map((r) => [r.no, r.tournament_no]));

  const rows = matches.map((m) => matchRow(m, item.event_no, knownTournament.get(m.no)));
  const stored = await pgJson<{ id: string; no: string }[]>(`matches?on_conflict=no&select=id,no`, {
    method: 'POST',
    body: JSON.stringify(rows),
    headers: { Prefer: 'resolution=merge-duplicates,return=representation' },
  });

  // 3. Assegnazioni. Serve la mappa `vis_referee_no -> referees.id`, che si
  //    rilegge dopo l'upsert: gli arbitri gia' esistenti non tornano dalla
  //    insert con `return=minimal`.
  const refNos = [...new Set(matches.flatMap((m) => [m.noReferee1, m.noReferee2]).filter(Boolean))] as string[];
  if (refNos.length === 0) return matches.length;

  const known = await pgJson<{ id: number; vis_referee_no: string }[]>(
    `referees?select=id,vis_referee_no&vis_referee_no=in.(${refNos.map((n) => `"${n}"`).join(',')})`,
  );
  const refereeId = new Map(known.map((r) => [r.vis_referee_no, r.id]));
  const matchId = new Map(stored.map((r) => [r.no, r.id]));

  const assignments: { match_id: string; referee_id: number; role: string }[] = [];
  for (const m of matches) {
    const mid = matchId.get(m.no);
    if (!mid) continue;
    for (const [no, role] of [[m.noReferee1, 'FIRST'], [m.noReferee2, 'SECOND']] as const) {
      const rid = no ? refereeId.get(no) : undefined;
      if (rid !== undefined) assignments.push({ match_id: mid, referee_id: rid, role });
    }
  }

  if (assignments.length > 0) {
    await pgJson(`match_referees?on_conflict=match_id,role`, {
      method: 'POST',
      body: JSON.stringify(assignments),
      headers: { Prefer: 'resolution=merge-duplicates,return=minimal' },
    });
  }

  return matches.length;
}

/**
 * Legge la configurazione e APPLICA subito il ritmo verso il VIS.
 *
 * Va chiamata prima di qualunque richiesta al VIS, seeding compreso: il
 * `GetEventList` di una risemina e' una chiamata come le altre, e non aveva
 * motivo di essere l'unica esente.
 */
async function loadConfig(): Promise<{ vis_concurrency: number }> {
  const [cfg] = await pgJson<{ vis_concurrency: number; vis_min_interval_ms: number }[]>(
    'sync_backlog_config?select=vis_concurrency,vis_min_interval_ms',
  );
  if (cfg && typeof cfg.vis_min_interval_ms === 'number') {
    setVisMinIntervalMs(cfg.vis_min_interval_ms);
  }
  return { vis_concurrency: cfg?.vis_concurrency ?? 1 };
}

async function runCycle() {
  const cfg = await loadConfig();
  const claimed = await rpc<BacklogItem[]>('claim_backfill_batch');

  if (!claimed || claimed.length === 0) {
    return { claimed: 0, done: 0, failed: 0, matches: 0, note: 'niente da fare' };
  }

  let done = 0, failed = 0, matches = 0;

  await mapWithConcurrency(claimed, cfg.vis_concurrency, async (item) => {
    try {
      const seen = await processEvent(item);
      await rpc('complete_backfill_item', { p_event_no: item.event_no, p_matches_seen: seen });
      done++;
      matches += seen;
    } catch (err) {
      // Nessun `throw` qui: un evento che fallisce non deve portarsi dietro
      // gli altri del batch. L'errore viene registrato sull'unita', che torna
      // in coda con backoff — o si ferma in `failed` oltre il tetto.
      const message = err instanceof Error ? err.message : String(err);
      await rpc('fail_backfill_item', { p_event_no: item.event_no, p_error: message });
      failed++;
      console.error(`[backfill] evento ${item.event_no}: ${message}`);
    }
  });

  // Le statistiche si ricalcolano qui e non su richiesta: la pagina che le
  // legge non deve poter innescare un'aggregazione (vedi migration 022), e
  // farlo a ogni ciclo tiene la sintesi allineata ai dati senza che nessuno se
  // ne ricordi. Se il ricalcolo fallisce, il ciclo NON fallisce: le partite
  // sono gia' salvate, e perderle per un aggregato sarebbe sproporzionato.
  let stats: unknown = null;
  if (done > 0) {
    try {
      stats = await rpc('refresh_referee_stats');
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.error(`[backfill] ricalcolo statistiche fallito: ${message}`);
      stats = { error: message };
    }
  }

  return { claimed: claimed.length, done, failed, matches, stats };
}

async function runSeed(seasons: number[]) {
  await loadConfig();
  let added = 0, total = 0;
  for (const season of seasons) {
    const xml = await visRequest(buildEventListRequest(season));
    const events = parseEvents(xml);
    total += events.length;
    for (const e of events) {
      const inserted = await rpc<boolean>('seed_backfill_event', {
        p_event_no: e.no,
        p_season: e.season ?? season,
      });
      if (inserted) added++;
    }
  }
  // `total` e `added` differiscono a ogni risemina: la differenza sono gli
  // eventi gia' in coda, non un errore.
  return { seasons, events_seen: total, events_added: added };
}

Deno.serve(async (req) => {
  if (!SUPABASE_URL || !SERVICE_KEY) {
    return json({ error: 'SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY mancanti' }, 500);
  }

  // Solo service_role. Questa function scrive sul database e chiama funzioni
  // SECURITY DEFINER: lasciarla raggiungibile con la anon key riaprirebbe dal
  // lato HTTP cio' che la migration 017 ha chiuso dal lato SQL.
  const auth = req.headers.get('Authorization') ?? '';
  if (auth !== `Bearer ${SERVICE_KEY}`) {
    return json({ error: 'unauthorized' }, 401);
  }

  const path = new URL(req.url).pathname.replace(/^.*\/backfill-worker/, '') || '/';

  try {
    if (path === '/progress') {
      const [progress] = await pgJson<unknown[]>('sync_backlog_progress?select=*');
      return json(progress ?? {});
    }

    if (path === '/seed') {
      const body = await req.json().catch(() => ({}));
      const seasons: number[] = Array.isArray(body.seasons) && body.seasons.length > 0
        ? body.seasons
        : [new Date().getUTCFullYear()];
      return json(await runSeed(seasons));
    }

    return json(await runCycle());
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('[backfill] ciclo fallito:', message);
    return json({ error: message }, 500);
  }
});
