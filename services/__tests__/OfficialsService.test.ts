/**
 * OfficialsService — issue #40
 *
 * All tests run against captured VIS payloads (services/__tests__/fixtures);
 * the client is a counting stub, so no test touches the network (AC10).
 */

import { OfficialsService, OfficialsApiClient, OfficialsCache } from '../OfficialsService';
import { decodeXmlEntities, parseEmbeddedXml, toArray } from '../../utils/visEmbeddedXml';
import {
  AuxiliaryFunction,
  OfficialRole,
  UNAVAILABLE_EVENT_OFFICIAL_ROLES,
  mapAuxiliaryFunctionCode
} from '../../types/referee-v2';
import {
  GET_BEACH_MATCH_LIST_1719_XML,
  GET_EVENT_1719_XML,
  GET_EVENT_REFEREE_LIST_1719_XML,
  MATCH_WITHOUT_PERSONNEL_NO,
  MATCH_WITH_PERSONNEL_NO
} from './fixtures/visOfficialsFixtures';

const EVENT_NO = '1719';

const success = (xmlData: string) => ({
  success: true as const,
  xmlData,
  timestamp: new Date().toISOString(),
  durationMs: 1,
  sizeBytes: xmlData.length
});

const failure = (error: string) => ({
  success: false as const,
  errorCode: 'VIS_ERROR',
  error,
  timestamp: new Date().toISOString(),
  durationMs: 1
});

interface StubClient extends OfficialsApiClient {
  calls: { operation: string; request: any }[];
}

function createClient(overrides: Partial<Record<'event' | 'matches' | 'referees', any>> = {}): StubClient {
  const calls: { operation: string; request: any }[] = [];

  return {
    calls,
    async getEvent(request) {
      calls.push({ operation: 'GetEvent', request });
      return overrides.event ?? success(GET_EVENT_1719_XML);
    },
    async getBeachMatchList(request) {
      calls.push({ operation: 'GetBeachMatchList', request });
      return overrides.matches ?? success(GET_BEACH_MATCH_LIST_1719_XML);
    },
    async getEventRefereeList(request) {
      calls.push({ operation: 'GetEventRefereeList', request });
      return overrides.referees ?? success(GET_EVENT_REFEREE_LIST_1719_XML);
    }
  } as StubClient;
}

/** In-memory stand-in for CacheService with the same read/write semantics. */
function createCache(): OfficialsCache & { store: Map<string, any>; enabled: boolean } {
  const store = new Map<string, any>();
  const cache = {
    store,
    enabled: true,
    async get<T>(key: string) {
      if (!cache.enabled) {
        return { data: undefined, isStale: false };
      }
      return { data: store.get(key) as T | undefined, isStale: false };
    },
    async set(key: string, value: any) {
      store.set(key, value);
    },
    async delete(key: string) {
      store.delete(key);
    }
  };
  return cache;
}

function install(client: StubClient) {
  const cache = createCache();
  OfficialsService.setDependencies({ client, cache });
  OfficialsService.resetCallCount();
  return cache;
}

afterEach(() => {
  OfficialsService.setDependencies(null);
  OfficialsService.resetCallCount();
});

// ============================================================================
// AC6 — embedded XML decoding
// ============================================================================

describe('visEmbeddedXml (AC6)', () => {
  it('decodes every entity the VIS emits', () => {
    expect(decodeXmlEntities('&lt;a&gt;')).toBe('<a>');
    expect(decodeXmlEntities('&quot;x&quot;')).toBe('"x"');
    expect(decodeXmlEntities('&#39;x&#39;')).toBe("'x'");
    expect(decodeXmlEntities('&apos;x&apos;')).toBe("'x'");
    expect(decodeXmlEntities('a&amp;b')).toBe('a&b');
    expect(decodeXmlEntities('a&#xD;&#xA;b')).toBe('a\r\nb');
  });

  it('decodes in a single pass so &amp;lt; stays the literal text &lt;', () => {
    expect(decodeXmlEntities('&amp;lt;')).toBe('&lt;');
  });

  it('leaves unknown entities untouched and tolerates empty input', () => {
    expect(decodeXmlEntities('&nosuchentity;')).toBe('&nosuchentity;');
    expect(decodeXmlEntities(undefined)).toBe('');
    expect(decodeXmlEntities(null)).toBe('');
  });

  it('parses an escaped document and returns null on garbage', () => {
    const parsed = parseEmbeddedXml<{ Personnel?: Record<string, string> }>(
      '&lt;Personnel Scorer=&quot;5&quot; LineJudge1=&quot;17&quot; /&gt;'
    );
    expect(parsed?.Personnel?.Scorer).toBe('5');
    expect(parsed?.Personnel?.LineJudge1).toBe('17');
    expect(parseEmbeddedXml('')).toBeNull();
    expect(parseEmbeddedXml(undefined)).toBeNull();
  });

  it('normalises single/multiple/absent nodes', () => {
    expect(toArray(undefined)).toEqual([]);
    expect(toArray({ a: 1 })).toEqual([{ a: 1 }]);
    expect(toArray([{ a: 1 }, { a: 2 }])).toEqual([{ a: 1 }, { a: 2 }]);
  });
});

// ============================================================================
// AC7 — Functions mapping
// ============================================================================

describe('Functions code mapping (AC7)', () => {
  it('maps the two observed codes', () => {
    expect(mapAuxiliaryFunctionCode('2')).toBe(AuxiliaryFunction.LINE_JUDGE);
    expect(mapAuxiliaryFunctionCode('4')).toBe(AuxiliaryFunction.SCORER);
    expect(mapAuxiliaryFunctionCode(4)).toBe(AuxiliaryFunction.SCORER);
  });

  it('degrades to Unknown for an unseen code instead of throwing', () => {
    expect(mapAuxiliaryFunctionCode('99')).toBe(AuxiliaryFunction.UNKNOWN);
    expect(mapAuxiliaryFunctionCode('')).toBe(AuxiliaryFunction.UNKNOWN);
    expect(mapAuxiliaryFunctionCode(undefined)).toBe(AuxiliaryFunction.UNKNOWN);
    expect(mapAuxiliaryFunctionCode(null)).toBe(AuxiliaryFunction.UNKNOWN);
  });
});

// ============================================================================
// AC1 / AC5 — event roster
// ============================================================================

describe('OfficialsService.getEventOfficials', () => {
  it('parses the roster of the reference event', async () => {
    install(createClient());

    const roster = await OfficialsService.getEventOfficials(EVENT_NO);

    expect(roster.error).toBeUndefined();
    expect(roster.eventNo).toBe('1719');
    expect(roster.eventName).toBe('BPT Elite João Pessoa 2026');
    expect(roster.auxiliaryOfficials).toHaveLength(18);

    const first = roster.auxiliaryOfficials[0];
    expect(first).toMatchObject({
      no: '1',
      firstName: 'Carolinna',
      lastName: 'Cavalcante',
      nationalityCode: 'BR',
      functionCode: '4',
      function: AuxiliaryFunction.SCORER
    });

    expect(
      roster.auxiliaryOfficials.some(o => o.function === AuxiliaryFunction.LINE_JUDGE)
    ).toBe(true);
  });

  it('requests only the three fields the recipe needs', async () => {
    const client = createClient();
    install(client);

    await OfficialsService.getEventOfficials(EVENT_NO);

    expect(client.calls[0].request.fields).toEqual(['No', 'Name', 'AuxiliaryPersons']);
  });

  it('flags the roles the VIS cannot provide (AC8)', async () => {
    install(createClient());

    const roster = await OfficialsService.getEventOfficials(EVENT_NO);

    expect(roster.unavailableRoles).toEqual(UNAVAILABLE_EVENT_OFFICIAL_ROLES);
    expect(roster.unavailableRoles).toContain('RefereeCoach');
    expect(roster.unavailableRoles).toContain('TechnicalDelegate');
  });

  it('serves the roster from cache on the second call (AC3)', async () => {
    const client = createClient();
    install(client);

    await OfficialsService.getEventOfficials(EVENT_NO);
    await OfficialsService.getEventOfficials(EVENT_NO);
    await OfficialsService.getEventOfficials(EVENT_NO);

    expect(client.calls.filter(c => c.operation === 'GetEvent')).toHaveLength(1);
  });

  it('does not cache a failed roster so the next call retries (AC9)', async () => {
    const client = createClient({ event: failure('boom') });
    install(client);

    const first = await OfficialsService.getEventOfficials(EVENT_NO);
    const second = await OfficialsService.getEventOfficials(EVENT_NO);

    expect(first.error).toContain('GetEvent failed');
    expect(first.auxiliaryOfficials).toEqual([]);
    expect(second.error).toBeDefined();
    expect(client.calls.filter(c => c.operation === 'GetEvent')).toHaveLength(2);
  });

  it('returns an error result instead of throwing when the client rejects (AC9)', async () => {
    const client = createClient();
    client.getEvent = async () => {
      throw new Error('socket hang up');
    };
    install(client);

    const roster = await OfficialsService.getEventOfficials(EVENT_NO);

    expect(roster.error).toContain('socket hang up');
    expect(roster.auxiliaryOfficials).toEqual([]);
  });
});

// ============================================================================
// AC1 — match officials with names resolved
// ============================================================================

describe('OfficialsService.getMatchOfficials', () => {
  it('resolves the ids of a match against the event roster', async () => {
    install(createClient());

    const officials = await OfficialsService.getMatchOfficials(EVENT_NO, MATCH_WITH_PERSONNEL_NO);

    expect(officials.error).toBeUndefined();
    expect(officials.hasPersonnelData).toBe(true);
    expect(officials.assignments.length).toBeGreaterThanOrEqual(4);

    const roles = officials.assignments.map(a => a.role);
    expect(roles).toContain(OfficialRole.SCORER);
    expect(roles).toContain(OfficialRole.ASSISTANT_SCORER);
    expect(roles).toContain(OfficialRole.LINE_JUDGE_1);
    expect(roles).toContain(OfficialRole.LINE_JUDGE_2);

    for (const assignment of officials.assignments) {
      expect(assignment.resolved).toBe(true);
      expect(assignment.displayName).not.toMatch(/^#/);
      expect(assignment.firstName.length).toBeGreaterThan(0);
      expect(assignment.lastName.length).toBeGreaterThan(0);
    }

    const scorer = officials.assignments.find(a => a.role === OfficialRole.SCORER)!;
    expect(scorer.function).toBe(AuxiliaryFunction.SCORER);
    const lineJudge = officials.assignments.find(a => a.role === OfficialRole.LINE_JUDGE_1)!;
    expect(lineJudge.function).toBe(AuxiliaryFunction.LINE_JUDGE);
  });

  it('returns an empty result for the one match without Personnel (AC9)', async () => {
    install(createClient());

    const officials = await OfficialsService.getMatchOfficials(EVENT_NO, MATCH_WITHOUT_PERSONNEL_NO);

    expect(officials.error).toBeUndefined();
    expect(officials.hasPersonnelData).toBe(false);
    expect(officials.assignments).toEqual([]);
  });

  it('reports an unknown match as an error, not a crash', async () => {
    install(createClient());

    const officials = await OfficialsService.getMatchOfficials(EVENT_NO, '999999');

    expect(officials.assignments).toEqual([]);
    expect(officials.error).toContain('not found');
  });

  it('keeps an unresolvable id visible instead of dropping the slot', async () => {
    const rosterlessEvent = success('<Event No="1719" Name="Test" AuxiliaryPersons="" />');
    install(createClient({ event: rosterlessEvent }));

    const officials = await OfficialsService.getMatchOfficials(EVENT_NO, MATCH_WITH_PERSONNEL_NO);

    expect(officials.hasPersonnelData).toBe(true);
    expect(officials.assignments.length).toBeGreaterThan(0);
    for (const assignment of officials.assignments) {
      expect(assignment.resolved).toBe(false);
      expect(assignment.displayName).toBe(`#${assignment.officialNo}`);
      expect(assignment.function).toBe(AuxiliaryFunction.UNKNOWN);
    }
  });

  it('propagates an API failure as an error result (AC9)', async () => {
    install(createClient({ matches: failure('service unavailable') }));

    const officials = await OfficialsService.getMatchOfficials(EVENT_NO, MATCH_WITH_PERSONNEL_NO);

    expect(officials.error).toContain('GetBeachMatchList failed');
    expect(officials.assignments).toEqual([]);
  });
});

// ============================================================================
// AC4 — cost of a whole tournament
// ============================================================================

describe('OfficialsService.getTournamentOfficials (AC4)', () => {
  it('costs exactly 2 API calls for every match of the tournament', async () => {
    const client = createClient();
    install(client);

    const result = await OfficialsService.getTournamentOfficials(EVENT_NO);

    expect(result.error).toBeUndefined();
    expect(client.calls).toHaveLength(2);
    expect(client.calls.map(c => c.operation)).toEqual(['GetEvent', 'GetBeachMatchList']);
    expect(result.apiCallCount).toBe(2);
    expect(result.matches.length).toBeGreaterThan(1);
  });

  it('filters the match list by event, not by tournament', async () => {
    const client = createClient();
    install(client);

    await OfficialsService.getTournamentOfficials(EVENT_NO);

    const matchCall = client.calls.find(c => c.operation === 'GetBeachMatchList')!;
    expect(matchCall.request.eventNo).toBe(EVENT_NO);
    expect(matchCall.request.tournamentNo).toBeUndefined();
  });

  it('does not grow with the number of matches asked for one by one', async () => {
    const client = createClient();
    install(client);

    const all = await OfficialsService.getTournamentOfficials(EVENT_NO);
    const callsAfterBulk = client.calls.length;

    for (const match of all.matches) {
      await OfficialsService.getMatchOfficials(EVENT_NO, match.matchNo);
    }

    expect(callsAfterBulk).toBe(2);
    expect(client.calls).toHaveLength(2);
  });

  it('resolves names for every match that has Personnel', async () => {
    install(createClient());

    const result = await OfficialsService.getTournamentOfficials(EVENT_NO);

    const withPersonnel = result.matches.filter(m => m.hasPersonnelData);
    const withoutPersonnel = result.matches.filter(m => !m.hasPersonnelData);

    expect(withPersonnel.length).toBeGreaterThan(0);
    expect(withoutPersonnel).toHaveLength(1);

    for (const match of withPersonnel) {
      expect(match.assignments.every(a => a.resolved)).toBe(true);
    }
  });
});

// ============================================================================
// AC1 — refereeing delegation
// ============================================================================

describe('OfficialsService.getTournamentReferees', () => {
  it('parses the <Responses> envelope into typed referees', async () => {
    const client = createClient();
    install(client);

    const { referees, error } = await OfficialsService.getTournamentReferees(EVENT_NO);

    expect(error).toBeUndefined();
    expect(referees).toHaveLength(3);
    expect(referees[0]).toMatchObject({
      RefereeId: '153097',
      firstName: 'Giseli',
      lastName: 'Amantino',
      federationCode: 'BRA',
      gender: 'W'
    });
    expect(referees[1].gender).toBe('M');
  });

  it('is cached (AC3)', async () => {
    const client = createClient();
    install(client);

    await OfficialsService.getTournamentReferees(EVENT_NO);
    await OfficialsService.getTournamentReferees(EVENT_NO);

    expect(client.calls.filter(c => c.operation === 'GetEventRefereeList')).toHaveLength(1);
  });

  it('returns an error result when the endpoint fails (AC9)', async () => {
    install(createClient({ referees: failure('NotInNewFormat') }));

    const { referees, error } = await OfficialsService.getTournamentReferees(EVENT_NO);

    expect(referees).toEqual([]);
    expect(error).toContain('GetEventRefereeList failed');
  });
});

// ============================================================================
// Cache invalidation
// ============================================================================

describe('OfficialsService.invalidateEvent', () => {
  it('forces a refetch after invalidation', async () => {
    const client = createClient();
    install(client);

    await OfficialsService.getEventOfficials(EVENT_NO);
    await OfficialsService.invalidateEvent(EVENT_NO);
    await OfficialsService.getEventOfficials(EVENT_NO);

    expect(client.calls.filter(c => c.operation === 'GetEvent')).toHaveLength(2);
  });
});
