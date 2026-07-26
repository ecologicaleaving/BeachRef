/**
 * @fileoverview OfficialsService — names of the officials of a tournament.
 *
 * Consolidates the VIS recipe that used to live only in throwaway scripts
 * (issue #40). Three endpoints, all reached through {@link VisApiClient}:
 *
 * | # | Call                                                   | Yields                                                   |
 * |---|--------------------------------------------------------|----------------------------------------------------------|
 * | 1 | `GetEvent No=<eventNo> Fields="No Name AuxiliaryPersons"` | the roster: `No`, `FirstName`, `LastName`, `NationalityCode`, `Functions` |
 * | 2 | `GetBeachMatchList` filtered by `NoEvent`, with `Personnel` | per match, the *ids* of Scorer / AssistantScorer / LineJudge1 / LineJudge2 |
 * | 3 | `GetEventRefereeList` filtered by `NoEvent`               | the refereeing delegation with names and federation        |
 *
 * `AuxiliaryPersons` and `Personnel` are XML escaped inside an XML attribute;
 * see {@link parseEmbeddedXml}. The ids of call 2 are resolved **locally**
 * against the roster of call 1 — no extra request per match, so the officials
 * of a whole tournament cost **2 calls** regardless of the number of matches
 * (issue #40, AC4).
 *
 * ---
 * **Known limitation — do not re-investigate (issue #40, AC8).**
 * The names of the *referee coach* and the *technical delegate* cannot be
 * obtained from the public VIS API. `GetEventOfficialList` returns exactly the
 * 2 entities that almost certainly are those roles, but exposes only `No` and
 * `Version`; ~60 candidate field names were probed at event, tournament and
 * match level on two distinct events, and the VIS silently ignores every one of
 * them. The singular `GetEventOfficial` answers `<NotInNewFormat id="1008" />`.
 * The affected roles are listed in {@link UNAVAILABLE_EVENT_OFFICIAL_ROLES} and
 * echoed on every result so consumers can render them as *unavailable*.
 * ---
 *
 * Error policy (AC9): no method throws. A failed call yields a result carrying
 * an `error` string and empty collections, mirroring how the rest of the
 * service layer degrades instead of propagating raw exceptions.
 */

import { XMLParser } from 'fast-xml-parser';
import { VisApiClient } from './api/VisApiClient';
import { CacheService } from './cache/CacheService';
import { cacheMmkvStorage } from './cache/MmkvStorage';
import type { GetBeachMatchListRequest, GetEventRefereeListRequest, GetEventRequest, VisApiResponse } from '../types/api-v2';
import { DEFAULT_RETRY_CONFIG } from '../types/api-v2';
import {
  AuxiliaryFunction,
  EventAuxiliaryOfficial,
  EventOfficialsRoster,
  EventReferee,
  MatchOfficialAssignment,
  MatchOfficials,
  OfficialRole,
  OfficialStatus,
  OfficialType,
  TournamentOfficials,
  UNAVAILABLE_EVENT_OFFICIAL_ROLES,
  mapAuxiliaryFunctionCode
} from '../types/referee-v2';
import { parseEmbeddedXml, toArray } from '../utils/visEmbeddedXml';

/**
 * Subset of the VIS client this service needs. Declaring it explicitly keeps
 * the service testable without touching the network (AC10).
 */
export interface OfficialsApiClient {
  getEvent(request: GetEventRequest): Promise<VisApiResponse>;
  getBeachMatchList(request: GetBeachMatchListRequest): Promise<VisApiResponse>;
  getEventRefereeList(request: GetEventRefereeListRequest): Promise<VisApiResponse>;
}

/** Subset of {@link CacheService} used here. */
export interface OfficialsCache {
  get<T>(key: string, revalidate?: () => Promise<T>): Promise<{ data: T | undefined; isStale: boolean }>;
  set(key: string, value: any, entityType: 'tournament' | 'match' | 'referee' | 'ranking', status?: string): Promise<void>;
  delete(key: string): Promise<void>;
}

export interface OfficialsServiceDependencies {
  readonly client: OfficialsApiClient;
  readonly cache: OfficialsCache;
}

/** `Personnel` attribute → match slot. Order drives the display order. */
const PERSONNEL_ROLE_MAP: readonly { attribute: string; role: OfficialRole }[] = [
  { attribute: 'Scorer', role: OfficialRole.SCORER },
  { attribute: 'AssistantScorer', role: OfficialRole.ASSISTANT_SCORER },
  { attribute: 'LineJudge1', role: OfficialRole.LINE_JUDGE_1 },
  { attribute: 'LineJudge2', role: OfficialRole.LINE_JUDGE_2 },
  { attribute: 'LineJudge3', role: OfficialRole.LINE_JUDGE_3 },
  { attribute: 'LineJudge4', role: OfficialRole.LINE_JUDGE_4 }
];

/**
 * Minimum this service needs out of call 2 — a subset of the field list that
 * VisApiClient already hardcodes for GetBeachMatchList:
 * `No NoInTournament NoEvent Status Court LocalDate LocalTime TeamAName
 *  TeamBName Referee1Name Referee2Name Personnel`
 */
const REFEREE_LIST_FIELDS: readonly string[] = [
  'No', 'NoReferee', 'FirstName', 'LastName', 'FederationCode', 'Gender', 'Type'
];

const responseParser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: '',
  textNodeName: '_text',
  parseAttributeValue: false,
  trimValues: true
});

export class OfficialsService {
  /** Cache namespace; `tournament` entity type ⇒ 120 s TTL (semi-static). */
  private static readonly ROSTER_CACHE_PREFIX = 'officials:roster:';
  private static readonly MATCHES_CACHE_PREFIX = 'officials:matches:';
  private static readonly REFEREES_CACHE_PREFIX = 'officials:referees:';

  private static dependencies: OfficialsServiceDependencies | null = null;

  /**
   * Override the collaborators (tests, or a caller that already owns a client).
   * Pass `null` to go back to the defaults.
   */
  static setDependencies(dependencies: Partial<OfficialsServiceDependencies> | null): void {
    if (dependencies === null) {
      this.dependencies = null;
      return;
    }

    // Only build the real collaborators when one of them is actually missing —
    // a test that injects both must not trigger the default construction.
    const current = dependencies.client && dependencies.cache ? null : this.getDependencies();

    this.dependencies = {
      client: dependencies.client ?? current!.client,
      cache: dependencies.cache ?? current!.cache
    };
  }

  private static getDependencies(): OfficialsServiceDependencies {
    if (!this.dependencies) {
      // Collaborators are still built lazily (only when nobody injected one),
      // but they are now *statically imported*: the jest config handles the
      // native/ESM modules they pull in — see docs/testing-services.md.
      this.dependencies = {
        client: new VisApiClient({
          baseUrl: 'https://www.fivb.org/Vis2009/XmlRequest.asmx',
          timeoutMs: 10000,
          maxRetries: 3,
          retryDelayMs: 1000,
          exponentialBackoff: true,
          // No custom headers on purpose: any header outside the CORS safelist makes
          // the POST non-simple, and the VIS preflight is not cacheable — every
          // request would cost two round trips. See VisApiClientConfig.headers (#67).
          enableLogging: false
        }, DEFAULT_RETRY_CONFIG),
        cache: CacheService.getInstance() as unknown as OfficialsCache
      };
    }
    return this.dependencies;
  }

  // ==========================================================================
  // Public API
  // ==========================================================================

  /**
   * Event roster: every auxiliary official of the event with its decoded role.
   *
   * Cached (AC3): repeated calls for the same event do not re-issue `GetEvent`
   * while the entry is fresh.
   */
  static async getEventOfficials(eventNo: string): Promise<EventOfficialsRoster> {
    const key = `${this.ROSTER_CACHE_PREFIX}${eventNo}`;
    const { cache } = this.getDependencies();

    const cached = await cache.get<EventOfficialsRoster>(key);
    if (cached.data) {
      return cached.data;
    }

    const roster = await this.fetchEventOfficials(eventNo);

    // Never cache a failure — the next call must retry.
    if (!roster.error) {
      await cache.set(key, roster, 'tournament');
    }

    return roster;
  }

  /**
   * Officials of a single match, names already resolved.
   *
   * Reuses the cached roster and the cached event-wide match list, so asking
   * for many matches of the same tournament still costs at most 2 calls.
   */
  static async getMatchOfficials(eventNo: string, matchNo: string | number): Promise<MatchOfficials> {
    const wantedMatchNo = String(matchNo);
    const roster = await this.getEventOfficials(eventNo);
    const matches = await this.getEventMatchPersonnel(eventNo);

    if (roster.error || matches.error) {
      return {
        eventNo,
        matchNo: wantedMatchNo,
        hasPersonnelData: false,
        assignments: [],
        unavailableRoles: UNAVAILABLE_EVENT_OFFICIAL_ROLES,
        error: roster.error ?? matches.error ?? 'Unknown failure'
      };
    }

    const rawMatch = matches.data.find(match => String(match.No ?? '') === wantedMatchNo);

    if (!rawMatch) {
      return {
        eventNo,
        matchNo: wantedMatchNo,
        hasPersonnelData: false,
        assignments: [],
        unavailableRoles: UNAVAILABLE_EVENT_OFFICIAL_ROLES,
        error: `Match ${wantedMatchNo} not found in event ${eventNo}`
      };
    }

    return this.buildMatchOfficials(eventNo, rawMatch, this.indexRoster(roster));
  }

  /**
   * Officials of every match of the tournament, plus the roster.
   *
   * Costs at most 2 VIS calls (AC4); the actual number is reported on
   * {@link TournamentOfficials.apiCallCount}, cache hits excluded.
   */
  static async getTournamentOfficials(eventNo: string): Promise<TournamentOfficials> {
    const callsBefore = this.apiCallCount;
    const roster = await this.getEventOfficials(eventNo);
    const matches = await this.getEventMatchPersonnel(eventNo);
    const apiCallCount = this.apiCallCount - callsBefore;

    if (roster.error || matches.error) {
      return {
        eventNo,
        roster,
        matches: [],
        apiCallCount,
        error: roster.error ?? matches.error ?? 'Unknown failure'
      };
    }

    const index = this.indexRoster(roster);

    return {
      eventNo,
      roster,
      matches: matches.data.map(match => this.buildMatchOfficials(eventNo, match, index)),
      apiCallCount
    };
  }

  /**
   * Refereeing delegation of the event (names + federation).
   *
   * This is the *third* call of the recipe and is deliberately kept out of
   * {@link getTournamentOfficials}: the referees of each match already travel
   * with the match list as `Referee1Name` / `Referee2Name`.
   */
  static async getTournamentReferees(eventNo: string): Promise<{ referees: readonly EventReferee[]; error?: string }> {
    const key = `${this.REFEREES_CACHE_PREFIX}${eventNo}`;
    const { cache, client } = this.getDependencies();

    const cached = await cache.get<readonly EventReferee[]>(key);
    if (cached.data) {
      return { referees: cached.data };
    }

    try {
      this.apiCallCount += 1;
      const response = await client.getEventRefereeList({ eventNo, fields: REFEREE_LIST_FIELDS });

      if (!response.success) {
        return { referees: [], error: this.describeFailure('GetEventRefereeList', response) };
      }

      const referees = this.parseEventReferees(response.xmlData);
      await cache.set(key, referees, 'referee');
      return { referees };
    } catch (error) {
      return { referees: [], error: this.describeError('GetEventRefereeList', error) };
    }
  }

  /**
   * Publish the event roster in the flat MMKV entry that
   * {@link getSupportingOfficialsSync} reads **synchronously** during render.
   *
   * Issue #47 folded `utils/auxiliaryPersonsSync.ts` in here. That module issued
   * its own `fetch` to `GetEvent Fields="AuxiliaryPersons"` and re-implemented
   * the double XML decode — the very recipe this service already owns — so it
   * was a duplicate with divergent parsing, invisible to `ApiAuditService`.
   *
   * What survives of it is only the *shape* of the cache entry, because
   * `matchOfficialsSync` cannot await: it reads `event:<eventNo>:auxiliaryPersons`
   * off raw MMKV inside a render. Hence this method — the network and the
   * parsing come from {@link getEventOfficials} (cached, 120 s), and the result
   * is projected into that entry with the keys the sync reader expects
   * (`No` as a **string**: it is compared against `Personnel` ids stringified).
   *
   * Never throws; a failure leaves the entry absent and the match cards simply
   * render without supporting officials, exactly as before.
   */
  static async primeAuxiliaryPersonsCache(eventNo: string): Promise<void> {
    try {
      const roster = await this.getEventOfficials(eventNo);

      if (roster.error) {
        console.warn(`[OfficialsService] AuxiliaryPersons unavailable for event ${eventNo}: ${roster.error}`);
        return;
      }

      const persons = roster.auxiliaryOfficials.map(official => ({
        No: official.no,
        FirstName: official.firstName,
        LastName: official.lastName,
        NationalityCode: official.nationalityCode,
        Gender: official.gender === '0' ? 'M' : official.gender === '1' ? 'F' : '',
        Functions: official.functionCode
      }));

      // 120 min, the TTL auxiliaryPersonsSync used — kept so a long session on
      // one tournament does not re-request the roster on every match render.
      await cacheMmkvStorage.cacheAuxiliaryPersons(eventNo, persons, 120 * 60);
    } catch (error) {
      console.warn(`[OfficialsService] Failed to prime AuxiliaryPersons for event ${eventNo}:`, error);
    }
  }

  /** Drop every cached entry of an event (roster, match personnel, referees). */
  static async invalidateEvent(eventNo: string): Promise<void> {
    const { cache } = this.getDependencies();
    await cache.delete(`${this.ROSTER_CACHE_PREFIX}${eventNo}`);
    await cache.delete(`${this.MATCHES_CACHE_PREFIX}${eventNo}`);
    await cache.delete(`${this.REFEREES_CACHE_PREFIX}${eventNo}`);
  }

  // ==========================================================================
  // API call accounting (exposed so the demo script and AC4 can assert on it)
  // ==========================================================================

  private static apiCallCount = 0;

  /** Number of VIS calls issued by this service since {@link resetCallCount}. */
  static getApiCallCount(): number {
    return this.apiCallCount;
  }

  static resetCallCount(): void {
    this.apiCallCount = 0;
  }

  // ==========================================================================
  // Internals
  // ==========================================================================

  private static async fetchEventOfficials(eventNo: string): Promise<EventOfficialsRoster> {
    const { client } = this.getDependencies();

    const empty = (error?: string): EventOfficialsRoster => ({
      eventNo,
      eventName: '',
      auxiliaryOfficials: [],
      retrievedAt: new Date().toISOString(),
      unavailableRoles: UNAVAILABLE_EVENT_OFFICIAL_ROLES,
      ...(error ? { error } : {})
    });

    try {
      this.apiCallCount += 1;
      const response = await client.getEvent({
        eventNo,
        fields: ['No', 'Name', 'AuxiliaryPersons']
      });

      if (!response.success) {
        return empty(this.describeFailure('GetEvent', response));
      }

      const parsed = responseParser.parse(response.xmlData) as { Event?: Record<string, any> };
      const event = parsed?.Event;

      if (!event) {
        return empty(`GetEvent returned no <Event> for event ${eventNo}`);
      }

      return {
        eventNo: String(event.No ?? eventNo),
        eventName: String(event.Name ?? ''),
        auxiliaryOfficials: this.parseAuxiliaryPersons(event.AuxiliaryPersons),
        retrievedAt: new Date().toISOString(),
        unavailableRoles: UNAVAILABLE_EVENT_OFFICIAL_ROLES
      };
    } catch (error) {
      return empty(this.describeError('GetEvent', error));
    }
  }

  /**
   * Event-wide match list carrying `Personnel`, cached under its own key so
   * that per-match lookups never trigger a second request.
   */
  private static async getEventMatchPersonnel(
    eventNo: string
  ): Promise<{ data: Record<string, any>[]; error?: string }> {
    const key = `${this.MATCHES_CACHE_PREFIX}${eventNo}`;
    const { cache, client } = this.getDependencies();

    const cached = await cache.get<Record<string, any>[]>(key);
    if (cached.data) {
      return { data: cached.data };
    }

    try {
      this.apiCallCount += 1;
      // The client's GetBeachMatchList field set already carries Personnel and
      // NoEvent — see REFEREE_LIST_FIELDS's neighbouring comment for the subset
      // this service actually reads.
      const response = await client.getBeachMatchList({
        eventNo,
        includeResults: false,
        includeReferees: true
      });

      if (!response.success) {
        return { data: [], error: this.describeFailure('GetBeachMatchList', response) };
      }

      const parsed = responseParser.parse(response.xmlData) as { BeachMatches?: { BeachMatch?: any } };
      const matches = toArray<Record<string, any>>(parsed?.BeachMatches?.BeachMatch);

      // Match lists change during play — 'match' TTL (15 s) rather than 120 s.
      await cache.set(key, matches, 'match', 'Scheduled');
      return { data: matches };
    } catch (error) {
      return { data: [], error: this.describeError('GetBeachMatchList', error) };
    }
  }

  /** Decode the escaped `AuxiliaryPersons` document into typed officials. */
  private static parseAuxiliaryPersons(raw: unknown): EventAuxiliaryOfficial[] {
    if (typeof raw !== 'string' || raw.trim().length === 0) {
      return [];
    }

    const parsed = parseEmbeddedXml<{ AuxiliaryPersons?: { AuxiliaryPerson?: any } }>(raw);
    const persons = toArray<Record<string, any>>(parsed?.AuxiliaryPersons?.AuxiliaryPerson);

    return persons
      .filter(person => person && person.No !== undefined && person.No !== null)
      .map(person => {
        const functionCode = person.Functions === undefined || person.Functions === null
          ? ''
          : String(person.Functions);

        return {
          no: String(person.No),
          firstName: String(person.FirstName ?? ''),
          lastName: String(person.LastName ?? ''),
          nationalityCode: String(person.NationalityCode ?? ''),
          gender: String(person.Gender ?? ''),
          functionCode,
          function: mapAuxiliaryFunctionCode(functionCode)
        };
      });
  }

  /** Turn one raw `<BeachMatch>` into resolved officials. */
  private static buildMatchOfficials(
    eventNo: string,
    rawMatch: Record<string, any>,
    roster: ReadonlyMap<string, EventAuxiliaryOfficial>
  ): MatchOfficials {
    const matchNo = String(rawMatch.No ?? '');
    const personnelRaw = rawMatch.Personnel;

    // 1 match out of 124 on the reference event carries no Personnel at all:
    // that is an empty result, not an error and definitely not a crash (AC9).
    if (typeof personnelRaw !== 'string' || personnelRaw.trim().length === 0) {
      return {
        eventNo,
        matchNo,
        hasPersonnelData: false,
        assignments: [],
        unavailableRoles: UNAVAILABLE_EVENT_OFFICIAL_ROLES
      };
    }

    const parsed = parseEmbeddedXml<{ Personnel?: Record<string, any> }>(personnelRaw);
    const personnel = parsed?.Personnel;

    if (!personnel) {
      return {
        eventNo,
        matchNo,
        hasPersonnelData: false,
        assignments: [],
        unavailableRoles: UNAVAILABLE_EVENT_OFFICIAL_ROLES
      };
    }

    const assignments: MatchOfficialAssignment[] = [];

    for (const { attribute, role } of PERSONNEL_ROLE_MAP) {
      const value = personnel[attribute];
      if (value === undefined || value === null || String(value).trim() === '') {
        continue;
      }

      const officialNo = String(value).trim();
      const person = roster.get(officialNo);

      assignments.push({
        role,
        officialNo,
        resolved: person !== undefined,
        firstName: person?.firstName ?? '',
        lastName: person?.lastName ?? '',
        nationalityCode: person?.nationalityCode ?? '',
        displayName: person ? `${person.firstName} ${person.lastName}`.trim() : `#${officialNo}`,
        function: person?.function ?? AuxiliaryFunction.UNKNOWN
      });
    }

    return {
      eventNo,
      matchNo,
      hasPersonnelData: true,
      assignments,
      unavailableRoles: UNAVAILABLE_EVENT_OFFICIAL_ROLES
    };
  }

  private static indexRoster(roster: EventOfficialsRoster): ReadonlyMap<string, EventAuxiliaryOfficial> {
    const index = new Map<string, EventAuxiliaryOfficial>();
    for (const official of roster.auxiliaryOfficials) {
      index.set(official.no, official);
    }
    return index;
  }

  private static parseEventReferees(xmlData: string): EventReferee[] {
    const parsed = responseParser.parse(xmlData) as Record<string, any>;

    // The VIS answers GetEventRefereeList inside a <Responses> envelope.
    const container = parsed?.Responses?.EventReferees ?? parsed?.EventReferees;
    const rows = toArray<Record<string, any>>(container?.EventReferee);

    return rows.map(row => ({
      id: String(row.No ?? ''),
      RefereeId: String(row.NoReferee ?? ''),
      firstName: String(row.FirstName ?? ''),
      lastName: String(row.LastName ?? ''),
      federationCode: String(row.FederationCode ?? ''),
      // VIS gender code: '0' = male, '1' = female.
      gender: String(row.Gender ?? '') === '1' ? 'W' : 'M',
      status: OfficialStatus.ACTIVE,
      type: OfficialType.REFEREE
    }));
  }

  private static describeFailure(operation: string, response: VisApiResponse): string {
    const detail = response.success ? 'unknown error' : `${response.errorCode}: ${response.error}`;
    return `${operation} failed — ${detail}`;
  }

  private static describeError(operation: string, error: unknown): string {
    const message = error instanceof Error ? error.message : String(error);
    return `${operation} threw — ${message}`;
  }
}

export default OfficialsService;
