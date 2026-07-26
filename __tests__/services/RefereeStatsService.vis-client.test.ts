/**
 * RefereeStatsService — issue #47.
 *
 * The six requests this service used to build by hand and send with a raw
 * `fetch` now go through {@link VisApiClient}. These tests run on fixtures with
 * an injected client and **assert that `global.fetch` is never called**, which
 * is the whole point of the issue: traffic that does not pass the client is
 * traffic `ApiAuditService` cannot see.
 */

import { RefereeStatsService, type RefereeStatsApiClient } from '../../services/RefereeStatsService';
import { RefereeDirectoryService } from '../../services/RefereeDirectoryService';
import type { GetBeachMatchListRequest, GetEventRefereeListRequest, VisApiResponse } from '../../types/api-v2';

const ok = (xmlData: string): VisApiResponse => ({
  success: true,
  xmlData,
  timestamp: new Date().toISOString(),
  durationMs: 1,
  sizeBytes: xmlData.length
} as VisApiResponse);

const EVENT_REFEREE_LIST_XML = `<?xml version="1.0" encoding="utf-8"?>
<Responses>
  <EventReferees>
    <EventReferee No="88" NoReferee="123456" FirstName="Anna" LastName="Rossi" FederationCode="ITA" Gender="1" Role="1" Status="Active" Type="Referee" />
  </EventReferees>
</Responses>`;

/** Two matches for 123456: one as first referee, one as second. */
const BEACH_MATCH_LIST_XML = `<?xml version="1.0" encoding="utf-8"?>
<Responses>
  <BeachMatches>
    <BeachMatch No="9001" NoEvent="1053" TournamentGender="0" LocalDateTime="2026-06-02T10:00:00" LocalDate="2026-06-02" Status="Finished" NoReferee1="123456" NoReferee2="654321" Referee1Name="Anna Rossi" Referee2Name="Bob Smith" TeamAName="A" TeamBName="B" />
    <BeachMatch No="9002" NoEvent="1053" TournamentGender="1" LocalDateTime="2026-06-03T10:00:00" LocalDate="2026-06-03" Status="Finished" NoReferee1="654321" NoReferee2="123456" Referee1Name="Bob Smith" Referee2Name="Anna Rossi" TeamAName="C" TeamBName="D" />
  </BeachMatches>
</Responses>`;

interface RecordedCall {
  readonly method: 'getBeachMatchList' | 'getEventRefereeList';
  readonly request: any;
}

function makeClient(): RefereeStatsApiClient & { calls: RecordedCall[] } {
  const calls: RecordedCall[] = [];
  return {
    calls,
    async getBeachMatchList(request: GetBeachMatchListRequest): Promise<VisApiResponse> {
      calls.push({ method: 'getBeachMatchList', request });
      return ok(BEACH_MATCH_LIST_XML);
    },
    async getEventRefereeList(request: GetEventRefereeListRequest): Promise<VisApiResponse> {
      calls.push({ method: 'getEventRefereeList', request });
      return ok(EVENT_REFEREE_LIST_XML);
    }
  };
}

/** In-memory stand-in for the CacheService subset RefereeDirectoryService uses. */
class FakeCache {
  private store = new Map<string, any>();
  async get<T>(key: string): Promise<{ data: T | undefined; isStale: boolean }> {
    return { data: this.store.get(key) as T | undefined, isStale: false };
  }
  async set(key: string, value: any): Promise<void> {
    this.store.set(key, value);
  }
  async delete(key: string): Promise<void> {
    this.store.delete(key);
  }
}

describe('RefereeStatsService — every VIS call goes through VisApiClient (#47)', () => {
  let client: ReturnType<typeof makeClient>;
  let fetchSpy: jest.SpyInstance;

  beforeEach(() => {
    client = makeClient();
    RefereeStatsService.setVisApiClient(client);

    // RefereeDirectoryService backs the two name-resolution steps.
    RefereeDirectoryService.setDependencies({
      client: {
        getEvent: async () => ok('<Responses />'),
        getEventRefereeList: async (request) => {
          client.calls.push({ method: 'getEventRefereeList', request });
          return ok(EVENT_REFEREE_LIST_XML);
        },
        getEventOfficialList: async () => ok('<Responses />'),
        getBeachMatchList: async () => ok(BEACH_MATCH_LIST_XML),
        getEventList: async () => ok('<Responses />'),
        getRefereeList: async () => ok('<Responses />'),
        getReferee: async () => ok('<Responses />'),
        getImageList: async () => ok('<Responses />'),
        getRefereeIdCard: async () => ok('<Responses />')
      } as any,
      cache: new FakeCache() as any
    });

    fetchSpy = jest.spyOn(global as any, 'fetch');
  });

  afterEach(() => {
    fetchSpy.mockRestore();
    RefereeStatsService.setVisApiClient(null);
    RefereeDirectoryService.setDependencies(null);
  });

  it('asks GetBeachMatchList through the client, filtered by event and referee slot', async () => {
    const result = await RefereeStatsService.getEnhancedTournamentStats('123456', '1053');

    expect(fetchSpy).not.toHaveBeenCalled();

    const matchCalls = client.calls.filter(c => c.method === 'getBeachMatchList');
    expect(matchCalls).toHaveLength(2); // one per referee slot

    expect(matchCalls[0]!.request).toEqual(expect.objectContaining({
      eventNo: '1053',
      NoReferee1: '123456'
    }));
    expect(matchCalls[1]!.request).toEqual(expect.objectContaining({
      eventNo: '1053',
      NoReferee2: '123456'
    }));

    // The stats parser needs fields the client's default set does not carry.
    for (const call of matchCalls) {
      expect(call.request.fields).toEqual(expect.arrayContaining([
        'TournamentGender', 'LocalDateTime', 'NoReferee1', 'NoReferee2'
      ]));
    }

    // One match per slot, so both roles are represented and the gender split
    // comes from TournamentGender (0 = men, 1 = women).
    expect(result?.stats).toEqual(expect.objectContaining({
      totalMatches: 2,
      matchesAsFirst: 1,
      matchesAsSecond: 1,
      menMatches: 1,
      womenMatches: 1
    }));
  });

  it('resolves a referee name to NoReferee without touching the network', async () => {
    // A non-numeric id forces the name-resolution path, which is the request
    // that used to be a raw fetch plus a raw fallback fetch.
    const result = await RefereeStatsService.getEnhancedTournamentStats('Anna_Rossi', '1053');

    expect(fetchSpy).not.toHaveBeenCalled();

    const refereeCalls = client.calls.filter(c => c.method === 'getEventRefereeList');
    expect(refereeCalls.length).toBeGreaterThan(0);
    expect(refereeCalls[0]!.request).toEqual(expect.objectContaining({
      eventNo: '1053',
      firstName: 'Anna',
      lastName: 'Rossi'
    }));

    expect(result?.stats.totalMatches).toBe(2);
  });
});
