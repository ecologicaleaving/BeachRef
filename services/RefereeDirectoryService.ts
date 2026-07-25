/**
 * @fileoverview RefereeDirectoryService — every referee-directory read the
 * `app/` screens used to perform by hand.
 *
 * Before issue #46, `app/tournament-ref.tsx`, `app/all-referees.tsx`,
 * `app/ref-mode.tsx` and `app/referee-profile.tsx` issued 13 bare `fetch` calls
 * to `fivb.org` straight from the component body. Bypassing {@link VisApiClient}
 * meant bypassing everything attached to it — retry with backoff, the request
 * monitor, and `ApiAuditService`, which measures only what goes through the
 * client. Three of the four screens had no cache at all and re-issued their
 * requests on every mount.
 *
 * This service is modelled on {@link OfficialsService} (issue #40): a static
 * class with injectable collaborators, every call routed through
 * {@link VisApiClient}, every result cached under a documented TTL, and no
 * method that throws.
 *
 * | Method | VIS call | Cache key | TTL |
 * |---|---|---|---|
 * | {@link getEventReferees}   | `GetEventRefereeList`  | `referees:event:<eventNo>`      | 120 s (`tournament`) |
 * | {@link getEventOfficials}  | `GetEventOfficialList` | `referees:event-officials:<eventNo>` | 120 s (`tournament`) |
 * | {@link getEventMatches}    | `GetBeachMatchList`    | `referees:event-matches:<eventNo>`   | 15 s (`match`) |
 * | {@link getAllReferees}     | `GetRefereeList`       | `referees:all:<sport>`          | 120 s (`referee`) |
 * | {@link getReferee}         | `GetReferee`           | `referees:one:<refereeNo>`      | 120 s (`referee`) |
 * | {@link getBeachEvents}     | `GetEventList`         | `referees:events:<sport>`       | 120 s (`tournament`) |
 * | {@link getRefereePortraitUrl} | `GetImageList`      | `referees:portrait:<id>`        | 120 s (`referee`) |
 * | {@link getRefereeIdCardUrl}   | `GetRefereeIdCard`  | *not cached* — the token is one-shot |
 *
 * The single most valuable consequence is that the **same event referee list is
 * fetched once** no matter how many screens ask for it: `tournament-ref` asked
 * for it three times in one load, and `all-referees` once per tournament.
 *
 * ---
 * **Known limitations — carried over, not introduced (issue #46 is a
 * refactoring).**
 * - `app/ref-mode.tsx` ends its load with a `GetEvent` whose parsed result
 *   *overwrites* the referee and official lists obtained from the dedicated
 *   endpoints. `GetEvent` does not answer with `<EventOfficialList>` /
 *   `<EventRefereeList>`, so both lists end up empty. That is why the screen is
 *   "under construction" in CLAUDE.md. The behaviour is preserved verbatim
 *   here; fixing it is a functional change and belongs to its own issue.
 * - `app/all-referees.tsx` fans out one season-stats request per active referee
 *   with an unbounded `Promise.all`. That is tracked in issue #65 and is
 *   deliberately left alone — this service only removes the raw `fetch`es.
 * - **`GetReferee` and `GetImageList` do not work with this app id, and did not
 *   work before either — do not re-investigate.** Probed directly against the
 *   VIS (issue #46): `GetReferee` answers `<Responses><AccessDenied /></Responses>`
 *   *both with and without* the `X-FIVB-App-ID` header, and `GetImageList`
 *   answers an ASP.NET `Runtime Error` page in both cases. So
 *   {@link getRefereePortraitUrl} returns `null` in practice and
 *   `referee-profile` shows its "View ID Card" fallback — which is exactly what
 *   it did before #46, when the same two calls failed silently inside the
 *   component. {@link getReferee} is kept because it is a legitimate part of
 *   this service's surface, but nothing on the critical path calls it: the
 *   roster from `GetEventRefereeList` already carries the same fields, which is
 *   why `ref-mode` no longer issues one `GetReferee` per referee.
 * ---
 *
 * Error policy: no method throws. A failure yields an empty collection plus an
 * `error` string, mirroring {@link OfficialsService}.
 */

import { VisApiClient } from './api/VisApiClient';
import { CacheService } from './cache/CacheService';
import type {
  GetBeachMatchListRequest,
  GetEventListRequest,
  GetEventOfficialListRequest,
  GetEventRefereeListRequest,
  GetEventRequest,
  GetImageListRequest,
  GetRefereeIdCardRequest,
  GetRefereeListRequest,
  GetRefereeRequest,
  VisApiResponse
} from '../types/api-v2';
import { DEFAULT_RETRY_CONFIG } from '../types/api-v2';

/** A referee as the screens display it. Field names match the pre-#46 shape. */
export interface DirectoryReferee {
  /** `NoReferee` — the stable 6-digit referee id, `''` when VIS omits it. */
  RefereeId: string;
  /** `No` of the `<EventReferee>` row, when the call was event-scoped. */
  eventRefereeNo?: string;
  firstName: string;
  lastName: string;
  federationCode: string;
  gender: string;
  level?: string;
  role?: string;
  status?: string;
  type?: string;
}

/** An event official as `app/ref-mode.tsx` renders it. */
export interface DirectoryOfficial {
  FederationCode: string;
  FirstName: string;
  Gender: string;
  LastName: string;
  NoPortraitPhoto: string;
  NoOfficial: string;
  Role: string;
  Signatures: string;
  Status: string;
  Type: string;
}

/** A referee's full record, as `GetReferee` returns it. */
export interface DirectoryRefereeDetail extends DirectoryReferee {
  noPortraitPhoto: string;
  signatures: string;
  conclusion: string;
  strongPoints: string;
  weakPoints: string;
  theoryTest: string;
}

/** One beach event, reduced to what the screens sort and filter on. */
export interface DirectoryEvent {
  visNo: string;
  name: string;
  startDate: string;
}

export interface RefereeListResult {
  readonly referees: DirectoryReferee[];
  readonly error?: string;
}

/**
 * Subset of {@link VisApiClient} this service needs. Declaring it explicitly
 * keeps the service testable without touching the network.
 */
export interface RefereeDirectoryApiClient {
  getEvent(request: GetEventRequest): Promise<VisApiResponse>;
  getEventRefereeList(request: GetEventRefereeListRequest): Promise<VisApiResponse>;
  getEventOfficialList(request: GetEventOfficialListRequest): Promise<VisApiResponse>;
  getBeachMatchList(request: GetBeachMatchListRequest): Promise<VisApiResponse>;
  getEventList(request: GetEventListRequest): Promise<VisApiResponse>;
  getRefereeList(request?: GetRefereeListRequest): Promise<VisApiResponse>;
  getReferee(request: GetRefereeRequest): Promise<VisApiResponse>;
  getImageList(request: GetImageListRequest): Promise<VisApiResponse>;
  getRefereeIdCard(request: GetRefereeIdCardRequest): Promise<VisApiResponse>;
}

/** Subset of {@link CacheService} used here. */
export interface RefereeDirectoryCache {
  get<T>(key: string, revalidate?: () => Promise<T>): Promise<{ data: T | undefined; isStale: boolean }>;
  set(key: string, value: any, entityType: 'tournament' | 'match' | 'referee' | 'ranking', status?: string): Promise<void>;
  delete(key: string): Promise<void>;
}

export interface RefereeDirectoryDependencies {
  readonly client: RefereeDirectoryApiClient;
  readonly cache: RefereeDirectoryCache;
}

/**
 * Union of the fields the four screens asked for, so that one cached call
 * satisfies all of them. Every name here is already in production use on this
 * endpoint: `Role`/`Level`/`Status` came from `app/tournament-ref.tsx`,
 * `No`/`Type` from {@link OfficialsService}.
 */
const EVENT_REFEREE_FIELDS: readonly string[] = [
  'No', 'NoReferee', 'FirstName', 'LastName', 'FederationCode', 'Gender', 'Level', 'Role', 'Status', 'Type'
];

const EVENT_OFFICIAL_FIELDS: readonly string[] = [
  'FederationCode', 'FirstName', 'Gender', 'LastName', 'NoPortraitPhoto', 'NoOfficial', 'Role', 'Signatures', 'Status', 'Type'
];

const REFEREE_LIST_FIELDS: readonly string[] = [
  'NoReferee', 'FirstName', 'LastName', 'FederationCode', 'Gender', 'Level', 'Status', 'Sport'
];

const EVENT_LIST_FIELDS: readonly string[] = ['No', 'Name', 'StartDate'];

/** VIS entity type for a referee, and image type for a portrait. */
const PORTRAIT_DATA_TYPE = '61';
const PORTRAIT_IMAGE_TYPE = '15';

/** `GetRefereeIdCard` is tried against both disciplines, Volley first. */
const ID_CARD_VOLLEY_TYPES: readonly string[] = ['Volley', 'Beach'];

export class RefereeDirectoryService {
  private static readonly EVENT_REFEREES_PREFIX = 'referees:event:';
  private static readonly EVENT_OFFICIALS_PREFIX = 'referees:event-officials:';
  private static readonly EVENT_MATCHES_PREFIX = 'referees:event-matches:';
  private static readonly ALL_REFEREES_PREFIX = 'referees:all:';
  private static readonly REFEREE_PREFIX = 'referees:one:';
  private static readonly EVENTS_PREFIX = 'referees:events:';
  private static readonly PORTRAIT_PREFIX = 'referees:portrait:';

  private static dependencies: RefereeDirectoryDependencies | null = null;

  /**
   * Override the collaborators (tests, or a caller that already owns a client).
   * Pass `null` to go back to the defaults.
   */
  static setDependencies(dependencies: Partial<RefereeDirectoryDependencies> | null): void {
    if (dependencies === null) {
      this.dependencies = null;
      return;
    }

    const current = dependencies.client && dependencies.cache ? null : this.getDependencies();

    this.dependencies = {
      client: dependencies.client ?? current!.client,
      cache: dependencies.cache ?? current!.cache
    };
  }

  private static getDependencies(): RefereeDirectoryDependencies {
    if (!this.dependencies) {
      // Static imports on purpose — see docs/testing-services.md / TESTING.md:
      // the jest config resolves the native/ESM modules these pull in, so the
      // lazy `require()` workaround removed by issue #48 must not come back.
      this.dependencies = {
        client: new VisApiClient({
          baseUrl: 'https://www.fivb.org/Vis2009/XmlRequest.asmx',
          timeoutMs: 30000,
          maxRetries: 3,
          retryDelayMs: 1000,
          exponentialBackoff: true,
          enableLogging: false,
          // NO custom headers, on purpose — measured, not assumed.
          //
          // A POST with only Content-Type: application/x-www-form-urlencoded is
          // a CORS *simple request* and goes straight out. Adding
          // X-FIVB-App-ID (as OfficialsService does) makes it non-simple, so the
          // browser sends an OPTIONS preflight first — and the VIS answers
          // without Access-Control-Max-Age, so the preflight is **not cached**:
          // every single request becomes two round trips. Measured on the
          // deploy preview of #46: with the header, one `all-referees` load
          // produced 31 OPTIONS and not a single completed POST; without it,
          // the same load issues plain POSTs, exactly as master does.
          //
          // The header is not required: `tournament-ref` and `all-referees`
          // have queried these endpoints without it for as long as they have
          // existed. Do not add it "for consistency".
          headers: {}
        }, DEFAULT_RETRY_CONFIG),
        cache: CacheService.getInstance() as unknown as RefereeDirectoryCache
      };
    }
    return this.dependencies;
  }

  // ==========================================================================
  // Public API
  // ==========================================================================

  /**
   * Refereeing delegation of an event.
   *
   * This replaces five separate `fetch` sites: three in `tournament-ref`, one
   * in `all-referees`, one in `ref-mode`. Cached per event, so a screen that
   * remounts within the TTL issues no request at all (issue #46, AC4).
   */
  static async getEventReferees(eventNo: string): Promise<RefereeListResult> {
    const key = `${this.EVENT_REFEREES_PREFIX}${eventNo}`;

    return this.cached(key, 'tournament', undefined, async () => {
      const response = await this.call('GetEventRefereeList', client =>
        client.getEventRefereeList({ eventNo, fields: EVENT_REFEREE_FIELDS })
      );

      if (response.error) {
        return { value: null, error: response.error };
      }

      return { value: this.parseEventReferees(response.xmlData) };
    }, referees => ({ referees }));
  }

  /**
   * Auxiliary officials of an event, in the shape `app/ref-mode.tsx` renders.
   */
  static async getEventOfficials(
    eventNo: string
  ): Promise<{ officials: DirectoryOfficial[]; error?: string }> {
    const key = `${this.EVENT_OFFICIALS_PREFIX}${eventNo}`;

    return this.cached(key, 'tournament', undefined, async () => {
      const response = await this.call('GetEventOfficialList', client =>
        client.getEventOfficialList({ eventNo, fields: EVENT_OFFICIAL_FIELDS })
      );

      if (response.error) {
        return { value: null, error: response.error };
      }

      return { value: this.parseOfficials(response.xmlData) };
    }, officials => ({ officials }));
  }

  /**
   * Officials **and** referees as they appear inside a `GetEvent` response.
   *
   * This is the last step of `app/ref-mode.tsx`'s load, moved here unchanged —
   * including the fact that it looks for `<EventOfficialList>` /
   * `<EventRefereeList>` wrappers that `GetEvent` does not actually return, so
   * both lists come back empty. See the "known limitations" note at the top of
   * this file: the defect is preserved on purpose (issue #46 is a refactoring)
   * and is what keeps `ref-mode` "under construction".
   */
  static async getEventRosterFromEvent(
    eventNo: string
  ): Promise<{ officials: DirectoryOfficial[]; referees: DirectoryReferee[]; error?: string }> {
    const response = await this.call('GetEvent', client =>
      client.getEvent({ eventNo, includeOfficials: true, includeReferees: true })
    );

    if (response.error) {
      return { officials: [], referees: [], error: response.error };
    }

    return {
      officials: this.parseOfficials(this.section(response.xmlData, 'EventOfficialList')),
      referees: this.parseEventReferees(this.section(response.xmlData, 'EventRefereeList'))
    };
  }

  /**
   * Raw `<BeachMatch>` rows of an event, attributes flattened onto an object.
   *
   * Screens read `NoReferee1` / `NoReferee2` / `Referee1Name` / `Referee2Name`
   * off these rows; the client's `GetBeachMatchList` field list is a superset of
   * what they used to request by hand.
   */
  static async getEventMatches(
    eventNo: string
  ): Promise<{ matches: Record<string, string>[]; error?: string }> {
    const key = `${this.EVENT_MATCHES_PREFIX}${eventNo}`;

    // Match lists move while play is on: 'match' TTL (15 s), not 120 s.
    return this.cached(key, 'match', 'Scheduled', async () => {
      const response = await this.call('GetBeachMatchList', client =>
        client.getBeachMatchList({ eventNo, includeReferees: true })
      );

      if (response.error) {
        return { value: null, error: response.error };
      }

      return { value: this.parseElements(response.xmlData, 'BeachMatch') };
    }, matches => ({ matches }));
  }

  /**
   * The whole beach-volleyball referee directory.
   *
   * `app/all-referees.tsx` asked for it twice per load (once to resolve the
   * active referees, once more in the background pass for the inactive ones).
   * Both now hit the same cache entry.
   */
  static async getAllReferees(sport: string = 'BV'): Promise<RefereeListResult> {
    const key = `${this.ALL_REFEREES_PREFIX}${sport}`;

    return this.cached(key, 'referee', undefined, async () => {
      const response = await this.call('GetRefereeList', client =>
        client.getRefereeList({ sport, fields: REFEREE_LIST_FIELDS })
      );

      if (response.error) {
        return { value: null, error: response.error };
      }

      // GetRefereeList answers with <Referee> rows, not <EventReferee>.
      const referees = this.parseElements(response.xmlData, 'Referee')
        .map(row => this.toDirectoryReferee(row))
        // Same normalisation the screens applied inline: keep the 6-digit id
        // only when it really is one, and drop nameless rows.
        .map(referee => ({
          ...referee,
          RefereeId: /^\d{6}$/.test(referee.RefereeId) ? referee.RefereeId : ''
        }))
        .filter(referee => referee.firstName.trim() || referee.lastName.trim());

      return { value: referees };
    }, referees => ({ referees }));
  }

  /** A single referee's full record. */
  static async getReferee(
    refereeNo: string
  ): Promise<{ referee: DirectoryRefereeDetail | null; error?: string }> {
    const key = `${this.REFEREE_PREFIX}${refereeNo}`;

    return this.cached(key, 'referee', undefined, async () => {
      const response = await this.call('GetReferee', client =>
        client.getReferee({ refereeNo })
      );

      if (response.error) {
        return { value: null, error: response.error };
      }

      const rows = this.parseElements(response.xmlData, 'Referee');
      const row = rows[0];

      if (!row) {
        return { value: null, error: `GetReferee returned no <Referee> for ${refereeNo}` };
      }

      return { value: this.toDirectoryRefereeDetail(row, refereeNo) };
    }, referee => ({ referee }));
  }

  /**
   * Beach events, newest first, as `app/all-referees.tsx` lists them.
   *
   * The screen used to filter with `Sport="BV"`; the client's `GetEventList`
   * already pins `HasBeachTournament="True"`, which selects the same set.
   */
  static async getBeachEvents(): Promise<{ events: DirectoryEvent[]; error?: string }> {
    const key = `${this.EVENTS_PREFIX}beach`;

    return this.cached(key, 'tournament', undefined, async () => {
      const response = await this.call('GetEventList', client =>
        client.getEventList({ fields: EVENT_LIST_FIELDS })
      );

      if (response.error) {
        return { value: null, error: response.error };
      }

      const events = this.parseElements(response.xmlData, 'Event')
        .filter(row => row.No && row.Name && row.StartDate)
        .map(row => ({
          visNo: row.No!,
          name: row.Name!,
          startDate: row.StartDate!
        }))
        .sort((a, b) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime());

      return { value: events };
    }, events => ({ events }));
  }

  /**
   * Portrait URL of a referee, or `null` when VIS has no image for them.
   * The portrait is decorative: callers render without it rather than fail.
   */
  static async getRefereePortraitUrl(refereeId: string): Promise<string | null> {
    const key = `${this.PORTRAIT_PREFIX}${refereeId}`;
    const { cache } = this.getDependencies();

    const cached = await cache.get<string>(key);
    if (cached.data !== undefined) {
      return cached.data || null;
    }

    const response = await this.call('GetImageList', client =>
      client.getImageList({
        dataType: PORTRAIT_DATA_TYPE,
        dataNo: refereeId,
        imageType: PORTRAIT_IMAGE_TYPE
      })
    );

    if (response.error) {
      return null;
    }

    const match = response.xmlData.match(/<Image[^>]*\sNo="(\d+)"/);
    if (!match || !match[1]) {
      return null;
    }

    const url = `https://www.fivb.org/Vis2009/Images/GetImage.asmx?No=${match[1]}&MaxSize=300`;
    await cache.set(key, url, 'referee');
    return url;
  }

  /**
   * One-shot document URL for a referee's ID card, or `null`.
   *
   * Deliberately **not** cached: the VIS hands out a single-use token, so a
   * cached URL would open a dead document on the second tap.
   */
  static async getRefereeIdCardUrl(refereeId: string): Promise<string | null> {
    for (const volleyType of ID_CARD_VOLLEY_TYPES) {
      const response = await this.call('GetRefereeIdCard', client =>
        client.getRefereeIdCard({ refereeNo: refereeId, volleyType })
      );

      if (response.error) {
        continue;
      }

      const match = response.xmlData.match(/Token="([^"]+)"/);
      if (match && match[1]) {
        return `https://www.fivb.org/Vis2009/Documents/GetDocument.asmx?Token=${match[1]}`;
      }
    }

    return null;
  }

  /** Drop every cached entry scoped to an event. */
  static async invalidateEvent(eventNo: string): Promise<void> {
    const { cache } = this.getDependencies();
    await cache.delete(`${this.EVENT_REFEREES_PREFIX}${eventNo}`);
    await cache.delete(`${this.EVENT_OFFICIALS_PREFIX}${eventNo}`);
    await cache.delete(`${this.EVENT_MATCHES_PREFIX}${eventNo}`);
  }

  // ==========================================================================
  // API call accounting (this is what issue #46, AC5 asserts on)
  // ==========================================================================

  private static apiCallCount = 0;

  /** VIS calls issued by this service since {@link resetCallCount}. */
  static getApiCallCount(): number {
    return this.apiCallCount;
  }

  static resetCallCount(): void {
    this.apiCallCount = 0;
  }

  // ==========================================================================
  // Internals
  // ==========================================================================

  /**
   * Cache-then-fetch, with the two rules {@link OfficialsService} established:
   * a hit never reaches the network, and a failure is never cached so the next
   * call retries.
   */
  private static async cached<TValue, TResult extends object>(
    key: string,
    entityType: 'tournament' | 'match' | 'referee' | 'ranking',
    status: string | undefined,
    fetcher: () => Promise<{ value: TValue | null; error?: string }>,
    wrap: (value: TValue) => TResult
  ): Promise<TResult & { error?: string }> {
    const { cache } = this.getDependencies();

    const hit = await cache.get<TValue>(key);
    if (hit.data !== undefined) {
      return wrap(hit.data);
    }

    const { value, error } = await fetcher();

    if (error || value === null) {
      return { ...wrap(this.emptyLike(value)), error: error ?? `No data for ${key}` };
    }

    await cache.set(key, value, entityType, status);
    return wrap(value);
  }

  /** Empty stand-in of the right shape for a failed fetch. */
  private static emptyLike<TValue>(value: TValue | null): TValue {
    return (Array.isArray(value) ? value : ([] as unknown)) as TValue;
  }

  /**
   * Single funnel through {@link VisApiClient}: counts the call and flattens a
   * throw or an unsuccessful response into `{ error }`.
   */
  private static async call(
    operation: string,
    invoke: (client: RefereeDirectoryApiClient) => Promise<VisApiResponse>
  ): Promise<{ xmlData: string; error?: string }> {
    const { client } = this.getDependencies();

    try {
      this.apiCallCount += 1;
      const response = await invoke(client);

      if (!response.success) {
        return { xmlData: '', error: `${operation} failed — ${response.errorCode}: ${response.error}` };
      }

      return { xmlData: response.xmlData ?? '' };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return { xmlData: '', error: `${operation} threw — ${message}` };
    }
  }

  /**
   * Flatten every `<Tag .../>` of a VIS response into an attribute map.
   *
   * Regex rather than a DOM/XML parser on purpose: this is the exact extraction
   * the screens performed, it tolerates the several envelopes the VIS wraps
   * these responses in (`<Responses>`, `<Response>`, bare), and it does not
   * depend on `DOMParser`, which does not exist on native.
   */
  private static parseElements(xml: string, tag: string): Record<string, string>[] {
    if (!xml) {
      return [];
    }

    // `[^>]*` and the `[\s/>]` guard keep <Referee .../> from also matching
    // <RefereeChallenge .../> or <EventReferee .../>.
    const elementPattern = new RegExp(`<${tag}([\\s/>][^>]*)?>`, 'g');
    const rows: Record<string, string>[] = [];

    for (const element of xml.match(elementPattern) ?? []) {
      const attributes: Record<string, string> = {};
      const attributePattern = /([\w.]+)="([^"]*)"/g;
      let attribute: RegExpExecArray | null;

      while ((attribute = attributePattern.exec(element)) !== null) {
        attributes[attribute[1]!] = attribute[2]!;
      }

      rows.push(attributes);
    }

    return rows;
  }

  /** Inner XML of `<tag>…</tag>`, or `''` when the wrapper is absent. */
  private static section(xml: string, tag: string): string {
    const match = xml.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`));
    return match?.[1] ?? '';
  }

  private static parseEventReferees(xml: string): DirectoryReferee[] {
    return this.parseElements(xml, 'EventReferee')
      .map(row => this.toDirectoryReferee(row))
      .filter(referee => referee.firstName.trim() || referee.lastName.trim());
  }

  private static parseOfficials(xml: string): DirectoryOfficial[] {
    return this.parseElements(xml, 'EventOfficial').map(row => ({
      FederationCode: row.FederationCode ?? '',
      FirstName: row.FirstName ?? '',
      Gender: row.Gender ?? '',
      LastName: row.LastName ?? '',
      NoPortraitPhoto: row.NoPortraitPhoto ?? '',
      NoOfficial: row.NoOfficial ?? '',
      Role: row.Role ?? '',
      Signatures: row.Signatures ?? '',
      Status: row.Status ?? '',
      Type: row.Type ?? ''
    }));
  }

  private static toDirectoryReferee(row: Record<string, string>): DirectoryReferee {
    const referee: DirectoryReferee = {
      RefereeId: row.NoReferee ?? row.No ?? '',
      firstName: row.FirstName ?? '',
      lastName: row.LastName ?? '',
      federationCode: row.FederationCode ?? '',
      gender: row.Gender ?? '',
      level: row.Level ?? '',
      role: row.Role ?? '',
      status: row.Status ?? '',
      type: row.Type ?? ''
    };

    if (row.No !== undefined) {
      referee.eventRefereeNo = row.No;
    }

    return referee;
  }

  private static toDirectoryRefereeDetail(
    row: Record<string, string>,
    fallbackNo: string
  ): DirectoryRefereeDetail {
    return {
      ...this.toDirectoryReferee(row),
      RefereeId: row.NoReferee ?? fallbackNo,
      noPortraitPhoto: row.NoPortraitPhoto ?? '',
      signatures: row.Signatures ?? '',
      conclusion: row.Conclusion ?? '',
      strongPoints: row.StrongPoints ?? '',
      weakPoints: row.WeakPoints ?? '',
      theoryTest: row.TheoryTest ?? ''
    };
  }
}

export default RefereeDirectoryService;
