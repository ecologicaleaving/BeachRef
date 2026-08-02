/**
 * Accesso al VIS per il worker di backfill (issue #90).
 *
 * ## Perche' parla direttamente col VIS
 *
 * `vis-data-sync` passa da `vis-adapter`, che **non e' deployata**: risponde
 * `{"code":"NOT_FOUND"}`, verificato in #89. Appoggiarsi a un ponte che non
 * c'e' significherebbe scrivere un worker che non puo' funzionare.
 *
 * La regola "nulla raggiunge il VIS se non tramite `VisApiClient`" vale per
 * l'app, non per le Edge Function: esiste perche' l'`ApiAuditService` dell'app
 * non sia cieco, e `__tests__/no-direct-vis-fetch.test.ts` — non a caso — non
 * guarda dentro `supabase/`.
 *
 * ## Nessuna intestazione personalizzata (issue #67)
 *
 * Si invia **solo** `Content-Type: application/x-www-form-urlencoded`. Qualsiasi
 * intestazione fuori dalla safelist CORS rende la POST non-simple, e il VIS
 * risponde al preflight `OPTIONS` **senza `Access-Control-Max-Age`**: il
 * browser non puo' cacharlo e lo rifa' prima di ogni richiesta. Qui siamo in
 * Deno e il preflight non ci riguarda, ma la regola resta scritta e rispettata:
 * `X-FIVB-App-ID` non e' richiesto dal VIS — dieci endpoint sono stati
 * interrogati con e senza, e ogni risposta e' tornata identica byte per byte.
 */

export const VIS_BASE_URL = 'https://www.fivb.org/Vis2009/XmlRequest.asmx';

/**
 * I campi chiesti a `GetBeachMatchList`.
 *
 * `NoReferee1` e `NoReferee2` sono **il motivo per cui questa issue esiste**:
 * il VIS li restituisce da sempre, e nessun percorso di sync li ha mai
 * scritti — `matches.no_referee1` risultava popolata su 0 righe di 9.570
 * (misurato in #89). Sono la chiave di join canonica verso
 * `referees.vis_referee_no`; i nomi non lo sono, perche' `matches` scrive
 * "Lowry Suzanne" dove `referees` scrive "Jonathan Lamprecht".
 *
 * La lista e' deliberatamente piu' stretta di quella dell'app: qui si
 * archivia, non si disegna una schermata.
 */
export const MATCH_FIELDS = [
  'No', 'NoInTournament', 'NoEvent', 'NoTournament',
  'LocalDate', 'LocalTime', 'Court', 'Status', 'Round',
  'TeamAName', 'TeamBName',
  'MatchPointsA', 'MatchPointsB',
  'PointsTeamASet1', 'PointsTeamBSet1',
  'PointsTeamASet2', 'PointsTeamBSet2',
  'PointsTeamASet3', 'PointsTeamBSet3',
  'DurationSet1', 'DurationSet2', 'DurationSet3',
  'NoReferee1', 'NoReferee2',
  'Referee1Name', 'Referee2Name',
  'Referee1FederationCode', 'Referee2FederationCode',
].join(' ');

export const EVENT_FIELDS = ['No', 'Name', 'Code', 'StartDate', 'EndDate', 'Season'].join(' ');

export interface VisMatch {
  no: string;
  noEvent?: string;
  noTournament?: string;
  localDate?: string;
  localTime?: string;
  court?: string;
  status?: string;
  round?: string;
  noInTournament?: string;
  teamAName?: string;
  teamBName?: string;
  matchPointsA?: number;
  matchPointsB?: number;
  pointsTeamASet1?: number;
  pointsTeamBSet1?: number;
  pointsTeamASet2?: number;
  pointsTeamBSet2?: number;
  pointsTeamASet3?: number;
  pointsTeamBSet3?: number;
  durationSet1?: string;
  durationSet2?: string;
  durationSet3?: string;
  noReferee1?: string;
  noReferee2?: string;
  referee1Name?: string;
  referee2Name?: string;
  referee1FederationCode?: string;
  referee2FederationCode?: string;
}

export interface VisEvent {
  no: string;
  name?: string;
  code?: string;
  startDate?: string;
  endDate?: string;
  season?: number;
}

/**
 * Decodifica delle entita' XML.
 *
 * Oltre alle cinque nominali servono i **riferimenti numerici**: il VIS scrive
 * `Mol, A./S&#248;rum, C.` — cioe' `ø` — e ogni nome nordico, ceco o
 * portoghese di questo circuito ne e' pieno. Senza questa parte finivano nel
 * database letteralmente come `S&#248;rum`, e da li' su una schermata.
 *
 * L'ordine conta: `&amp;` va sciolto per ULTIMO, altrimenti un `&amp;#248;`
 * legittimo diventerebbe `&#248;` e poi `ø`, cioe' un carattere che il VIS
 * non aveva mandato.
 */
function decodeEntities(value: string): string {
  return value
    .replace(/&#x([0-9a-fA-F]+);/g, (_, hex) => safeCodePoint(parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_, dec) => safeCodePoint(parseInt(dec, 10)))
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, '&');
}

/** Un code point fuori intervallo non deve far esplodere un intero batch. */
function safeCodePoint(code: number): string {
  if (!Number.isFinite(code) || code < 0 || code > 0x10ffff) return '';
  try {
    return String.fromCodePoint(code);
  } catch {
    return '';
  }
}

/**
 * Estrae gli attributi di ogni elemento `<tag ... />` o `<tag ...>`.
 *
 * Il VIS restituisce elementi ad attributi, quasi sempre auto-chiusi. Il
 * parser di `vis-adapter` cerca `<Match ...>(.*?)</Match>`, che su un elemento
 * auto-chiuso **non trova nulla** — un motivo in piu' per non riusarlo.
 */
export function parseElements(xml: string, tag: string): Record<string, string>[] {
  guardAgainstHostileXml(xml);

  const out: Record<string, string>[] = [];
  const elementRe = new RegExp(`<${tag}\\b([^>]*?)/?>`, 'g');
  const attrRe = /([A-Za-z_][\w.-]*)\s*=\s*"([^"]*)"/g;

  for (const el of xml.matchAll(elementRe)) {
    const attrs: Record<string, string> = {};
    for (const a of (el[1] ?? '').matchAll(attrRe)) {
      attrs[a[1]] = decodeEntities(a[2]);
    }
    if (Object.keys(attrs).length > 0) out.push(attrs);
  }
  return out;
}

/**
 * XML ostile: stessa difesa di `vis-adapter`, e per la stessa ragione — una
 * risposta non e' fidata solo perche' arriva da un host noto.
 */
export function guardAgainstHostileXml(xml: string): void {
  if (xml.length > 20 * 1024 * 1024) {
    throw new Error('risposta VIS troppo grande (>20MB)');
  }
  if (/<!ENTITY|<!DOCTYPE/i.test(xml)) {
    throw new Error('la risposta VIS contiene DOCTYPE o ENTITY');
  }
}

const num = (v?: string): number | undefined => {
  if (v === undefined || v === '') return undefined;
  const n = Number(v);
  return Number.isFinite(n) ? n : undefined;
};

/** Stringa non vuota, oppure `undefined`. Il VIS usa `""` per "assente". */
const str = (v?: string): string | undefined => {
  const t = v?.trim();
  return t ? t : undefined;
};

export function parseMatches(xml: string): VisMatch[] {
  return parseElements(xml, 'BeachMatch')
    .concat(parseElements(xml, 'Match'))
    .map((a) => ({
      no: a.No,
      noEvent: str(a.NoEvent),
      noTournament: str(a.NoTournament),
      noInTournament: str(a.NoInTournament),
      localDate: str(a.LocalDate),
      localTime: str(a.LocalTime),
      court: str(a.Court),
      status: str(a.Status),
      round: str(a.Round),
      teamAName: str(a.TeamAName),
      teamBName: str(a.TeamBName),
      matchPointsA: num(a.MatchPointsA),
      matchPointsB: num(a.MatchPointsB),
      pointsTeamASet1: num(a.PointsTeamASet1),
      pointsTeamBSet1: num(a.PointsTeamBSet1),
      pointsTeamASet2: num(a.PointsTeamASet2),
      pointsTeamBSet2: num(a.PointsTeamBSet2),
      pointsTeamASet3: num(a.PointsTeamASet3),
      pointsTeamBSet3: num(a.PointsTeamBSet3),
      durationSet1: str(a.DurationSet1),
      durationSet2: str(a.DurationSet2),
      durationSet3: str(a.DurationSet3),
      noReferee1: str(a.NoReferee1),
      noReferee2: str(a.NoReferee2),
      referee1Name: str(a.Referee1Name),
      referee2Name: str(a.Referee2Name),
      referee1FederationCode: str(a.Referee1FederationCode),
      referee2FederationCode: str(a.Referee2FederationCode),
    }))
    // Una partita senza `No` non e' indirizzabile: non si puo' fare upsert, e
    // non si puo' ritrovare. Si scarta contandola, non in silenzio.
    .filter((m) => Boolean(m.no));
}

export function parseEvents(xml: string): VisEvent[] {
  return parseElements(xml, 'BeachEvent')
    .concat(parseElements(xml, 'Event'))
    .map((a) => ({
      no: a.No,
      name: str(a.Name),
      code: str(a.Code),
      startDate: str(a.StartDate),
      endDate: str(a.EndDate),
      season: num(a.Season) ?? seasonFromDate(str(a.StartDate)),
    }))
    .filter((e) => Boolean(e.no));
}

/**
 * Il VIS non sempre espone `Season`. Quando manca si ricava dalla data di
 * inizio: serve solo a ORDINARE la coda dal piu' recente, quindi
 * un'approssimazione e' accettabile — ma va documentata, non nascosta.
 */
export function seasonFromDate(date?: string): number | undefined {
  if (!date) return undefined;
  const year = Number(date.slice(0, 4));
  return Number.isFinite(year) && year > 1990 && year < 2100 ? year : undefined;
}

function escapeXmlAttribute(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

export async function visRequest(xmlRequest: string, timeoutMs = 30_000): Promise<string> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(VIS_BASE_URL, {
      method: 'POST',
      // SOLO Content-Type: vedi la nota sulla issue #67 in testa al file.
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: `Request=${encodeURIComponent(xmlRequest)}`,
      signal: controller.signal,
    });
    if (!response.ok) {
      throw new Error(`VIS HTTP ${response.status} ${response.statusText}`);
    }
    return await response.text();
  } finally {
    clearTimeout(timer);
  }
}

/**
 * I FILTRI VANNO IN UN `<Filter />` ANNIDATO, non come attributi di
 * `<Request>`.
 *
 * Misurato sul VIS reale il 2026-08-02: con `<Request … NoEvent="1713" />` il
 * filtro viene **ignorato in silenzio** e la risposta contiene l'intero
 * archivio — oltre 20 MB, cioe' la guardia di `guardAgainstHostileXml` che
 * scatta. Non c'e' errore, non c'e' avviso: solo tutto invece di qualcosa.
 *
 * E' la forma che `services/api/VisApiClient.ts` usa da sempre
 * (`buildGetBeachMatchListXml`, `buildGetEventListXml`) e che qui non avevo
 * replicato. Un filtro che non filtra e' peggio di un filtro assente: sembra
 * che stia funzionando.
 */
export function buildMatchListRequest(eventNo: string): string {
  return `<Request Type="GetBeachMatchList" Fields="${MATCH_FIELDS}">` +
    `<Filter NoEvent="${escapeXmlAttribute(eventNo)}" />` +
    `</Request>`;
}

export function buildEventListRequest(season?: number): string {
  const filter = season
    ? `<Filter Season="${escapeXmlAttribute(String(season))}" />`
    : '';
  return `<Request Type="GetEventList" Fields="${EVENT_FIELDS}">${filter}</Request>`;
}

/**
 * Fan-out limitato.
 *
 * Il default e' 2 — meta' del semaforo dell'app (`VIS_MAX_CONCURRENT_REQUESTS`
 * = 4). Non e' prudenza generica: la issue #65 ha mostrato cosa succede
 * lanciando ~600 richieste insieme, cioe' che il VIS smette di rispondere e
 * ogni richiesta diventa un'attesa senza fine. Un worker lento non incontra
 * mai il throttling, quindi non genera i fallimenti da ri-accodare.
 */
export async function mapWithConcurrency<T, R>(
  items: T[],
  limit: number,
  fn: (item: T, index: number) => Promise<R>,
): Promise<R[]> {
  const results = new Array<R>(items.length);
  let cursor = 0;

  const workers = Array.from({ length: Math.max(1, Math.min(limit, items.length)) }, async () => {
    while (true) {
      const index = cursor++;
      if (index >= items.length) return;
      results[index] = await fn(items[index], index);
    }
  });

  await Promise.all(workers);
  return results;
}
