/**
 * RefereeDirectoryService — issue #46.
 *
 * Fixtures only, no network: both collaborators are injected, as
 * {@link RefereeDirectoryService.setDependencies} exists for. The cache double
 * is a real in-memory map rather than a `jest.fn()`, so the "a remount inside
 * the TTL issues no request" property (AC4) and the call budget (AC5) are
 * measured, not asserted by construction.
 */

import {
  RefereeDirectoryService,
  type RefereeDirectoryApiClient,
  type RefereeDirectoryCache
} from '../../services/RefereeDirectoryService';
import type { VisApiResponse } from '../../types/api-v2';

// ---------------------------------------------------------------------------
// Fixtures — trimmed from real VIS responses
// ---------------------------------------------------------------------------

const EVENT_REFEREE_LIST_XML = `<?xml version="1.0" encoding="utf-8"?>
<Responses>
  <EventReferees>
    <EventReferee No="8811" NoReferee="123456" FirstName="Anna" LastName="Rossi" FederationCode="ITA" Gender="1" Level="International" Role="1" Status="Active" Type="Referee" />
    <EventReferee No="8812" NoReferee="654321" FirstName="Bob" LastName="Smith" FederationCode="USA" Gender="0" Level="International" Role="2" Status="Active" Type="Referee" />
    <EventReferee No="8813" NoReferee="" FirstName="" LastName="" FederationCode="" Gender="" />
  </EventReferees>
</Responses>`;

const REFEREE_LIST_XML = `<?xml version="1.0" encoding="utf-8"?>
<Responses>
  <Referees>
    <Referee NoReferee="123456" FirstName="Anna" LastName="Rossi" FederationCode="ITA" Gender="1" Level="International" Status="Active" />
    <Referee NoReferee="99" FirstName="Short" LastName="Id" FederationCode="FRA" Gender="0" Level="National" Status="Active" />
    <Referee NoReferee="777777" FirstName="  " LastName="" FederationCode="GER" Gender="0" Level="" Status="Active" />
  </Referees>
</Responses>`;

const REFEREE_XML = `<?xml version="1.0" encoding="utf-8"?>
<Responses>
  <Referee NoReferee="123456" FirstName="Anna" LastName="Rossi" FederationCode="ITA" Gender="1" Status="Active" Type="Referee" NoPortraitPhoto="4242" StrongPoints="Positioning" WeakPoints="" TheoryTest="92" Conclusion="Promote" Signatures="2" />
</Responses>`;

const EVENT_OFFICIAL_LIST_XML = `<?xml version="1.0" encoding="utf-8"?>
<Responses>
  <EventOfficials>
    <EventOfficial NoOfficial="5001" FirstName="Carla" LastName="Bianchi" FederationCode="ITA" Gender="1" Role="Technical Delegate" Status="Active" Type="Official" NoPortraitPhoto="" Signatures="" />
  </EventOfficials>
</Responses>`;

const BEACH_MATCH_LIST_XML = `<?xml version="1.0" encoding="utf-8"?>
<Responses>
  <BeachMatches>
    <BeachMatch No="1" NoEvent="1053" Status="Finished" NoReferee1="123456" NoReferee2="654321" Referee1Name="Anna Rossi" Referee2Name="Bob Smith" RefereeChallengeName="Carla Bianchi" />
    <BeachMatch No="2" NoEvent="1053" Status="Scheduled" NoReferee1="654321" NoReferee2="" Referee1Name="Bob Smith" Referee2Name="TBD" />
  </BeachMatches>
</Responses>`;

const EVENT_LIST_XML = `<?xml version="1.0" encoding="utf-8"?>
<Responses>
  <Events>
    <Event No="1053" Name="Rome Open" StartDate="2026-06-01" />
    <Event No="1099" Name="Vienna Major" StartDate="2026-08-14" />
    <Event No="900" Name="Old Cup" StartDate="2019-05-02" />
    <Event No="901" Name="No Date Cup" />
  </Events>
</Responses>`;

const IMAGE_LIST_XML = `<Responses><Images><Image No="778899" /></Images></Responses>`;

const ID_CARD_XML = `<Responses><RefereeIdCard Token="abc-123-token" /></Responses>`;

// ---------------------------------------------------------------------------
// Doubles
// ---------------------------------------------------------------------------

const ok = (xmlData: string): VisApiResponse => ({
  success: true,
  xmlData,
  timestamp: new Date().toISOString(),
  durationMs: 1,
  sizeBytes: xmlData.length
} as VisApiResponse);

const fail = (error = 'boom'): VisApiResponse => ({
  success: false,
  error,
  errorCode: 'VIS_ERROR',
  timestamp: new Date().toISOString(),
  durationMs: 1
} as VisApiResponse);

/** In-memory cache with the same contract as CacheService's subset. */
class FakeCache implements RefereeDirectoryCache {
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

  /** Everything the cache holds — used to assert on what got stored. */
  keys(): string[] {
    return [...this.store.keys()];
  }

  /** Simulate the TTL elapsing. */
  expireAll(): void {
    this.store.clear();
  }
}

const makeClient = (overrides: Partial<RefereeDirectoryApiClient> = {}) => {
  const calls: string[] = [];
  const record = <T>(name: string, response: T) => {
    calls.push(name);
    return Promise.resolve(response);
  };

  const client: RefereeDirectoryApiClient & { calls: string[] } = {
    calls,
    getEvent: () => record('getEvent', ok('<Responses><Event No="1053" /></Responses>')),
    getEventRefereeList: () => record('getEventRefereeList', ok(EVENT_REFEREE_LIST_XML)),
    getEventOfficialList: () => record('getEventOfficialList', ok(EVENT_OFFICIAL_LIST_XML)),
    getBeachMatchList: () => record('getBeachMatchList', ok(BEACH_MATCH_LIST_XML)),
    getEventList: () => record('getEventList', ok(EVENT_LIST_XML)),
    getRefereeList: () => record('getRefereeList', ok(REFEREE_LIST_XML)),
    getReferee: () => record('getReferee', ok(REFEREE_XML)),
    getImageList: () => record('getImageList', ok(IMAGE_LIST_XML)),
    getRefereeIdCard: () => record('getRefereeIdCard', ok(ID_CARD_XML)),
    ...overrides
  } as RefereeDirectoryApiClient & { calls: string[] };

  return client;
};

describe('RefereeDirectoryService', () => {
  let cache: FakeCache;
  let client: ReturnType<typeof makeClient>;

  const install = (c: ReturnType<typeof makeClient> = makeClient()) => {
    client = c;
    cache = new FakeCache();
    RefereeDirectoryService.setDependencies({ client, cache });
    RefereeDirectoryService.resetCallCount();
  };

  beforeEach(() => install());

  afterAll(() => RefereeDirectoryService.setDependencies(null));

  // -------------------------------------------------------------------------
  // Parsing
  // -------------------------------------------------------------------------

  describe('parsing', () => {
    it('reads the event referee roster and drops nameless rows', async () => {
      const { referees, error } = await RefereeDirectoryService.getEventReferees('1053');

      expect(error).toBeUndefined();
      expect(referees).toHaveLength(2);
      expect(referees[0]).toMatchObject({
        RefereeId: '123456',
        eventRefereeNo: '8811',
        firstName: 'Anna',
        lastName: 'Rossi',
        federationCode: 'ITA',
        level: 'International',
        role: '1',
        status: 'Active'
      });
    });

    it('normalises the global directory: 6-digit ids only, no nameless rows', async () => {
      const { referees } = await RefereeDirectoryService.getAllReferees();

      // "Short Id" keeps its name but loses the non-conforming id;
      // the whitespace-only row is dropped entirely.
      expect(referees).toHaveLength(2);
      expect(referees.map(r => r.RefereeId)).toEqual(['123456', '']);
    });

    it('does not confuse <Referee> with <EventReferee> or <RefereeChallenge>', async () => {
      const { matches } = await RefereeDirectoryService.getEventMatches('1053');
      expect(matches).toHaveLength(2);
      expect(matches[0]!.RefereeChallengeName).toBe('Carla Bianchi');

      // The global directory must not pick up the <EventReferee> rows of a
      // differently-shaped payload.
      install(makeClient({ getRefereeList: () => Promise.resolve(ok(EVENT_REFEREE_LIST_XML)) }));
      const { referees } = await RefereeDirectoryService.getAllReferees();
      expect(referees).toHaveLength(0);
    });

    it('reads a single referee record', async () => {
      const { referee, error } = await RefereeDirectoryService.getReferee('123456');

      expect(error).toBeUndefined();
      expect(referee).toMatchObject({
        RefereeId: '123456',
        firstName: 'Anna',
        strongPoints: 'Positioning',
        theoryTest: '92',
        noPortraitPhoto: '4242'
      });
    });

    it('reads event officials', async () => {
      const { officials } = await RefereeDirectoryService.getEventOfficials('1053');

      expect(officials).toHaveLength(1);
      expect(officials[0]).toMatchObject({ NoOfficial: '5001', LastName: 'Bianchi', Role: 'Technical Delegate' });
    });

    it('sorts beach events newest first and drops incomplete rows', async () => {
      const { events } = await RefereeDirectoryService.getBeachEvents();

      expect(events.map(e => e.visNo)).toEqual(['1099', '1053', '900']);
    });
  });

  // -------------------------------------------------------------------------
  // AC4 — cache
  // -------------------------------------------------------------------------

  describe('caching (AC4)', () => {
    it('serves a second read of the same event from cache — zero extra calls', async () => {
      await RefereeDirectoryService.getEventReferees('1053');
      expect(client.calls).toEqual(['getEventRefereeList']);

      await RefereeDirectoryService.getEventReferees('1053');
      await RefereeDirectoryService.getEventReferees('1053');

      expect(client.calls).toEqual(['getEventRefereeList']);
      expect(RefereeDirectoryService.getApiCallCount()).toBe(1);
    });

    it('keys the cache per event — a different event still hits the network', async () => {
      await RefereeDirectoryService.getEventReferees('1053');
      await RefereeDirectoryService.getEventReferees('1099');

      expect(client.calls).toEqual(['getEventRefereeList', 'getEventRefereeList']);
    });

    it('refetches once the entry expires', async () => {
      await RefereeDirectoryService.getEventReferees('1053');
      cache.expireAll();
      await RefereeDirectoryService.getEventReferees('1053');

      expect(client.calls).toHaveLength(2);
    });

    it('never caches a failure — the next call retries', async () => {
      let attempt = 0;
      install(makeClient({
        getEventRefereeList: () => {
          attempt += 1;
          return Promise.resolve(attempt === 1 ? fail('temporary') : ok(EVENT_REFEREE_LIST_XML));
        }
      }));

      const first = await RefereeDirectoryService.getEventReferees('1053');
      expect(first.error).toContain('GetEventRefereeList failed');
      expect(first.referees).toEqual([]);
      expect(cache.keys()).toHaveLength(0);

      const second = await RefereeDirectoryService.getEventReferees('1053');
      expect(second.error).toBeUndefined();
      expect(second.referees).toHaveLength(2);
    });

    it('invalidateEvent drops every entry of that event', async () => {
      await RefereeDirectoryService.getEventReferees('1053');
      await RefereeDirectoryService.getEventOfficials('1053');
      await RefereeDirectoryService.getEventMatches('1053');
      expect(cache.keys()).toHaveLength(3);

      await RefereeDirectoryService.invalidateEvent('1053');
      expect(cache.keys()).toHaveLength(0);
    });
  });

  // -------------------------------------------------------------------------
  // AC5 — call budget for the real navigation scenarios
  // -------------------------------------------------------------------------

  describe('API call budget (AC5)', () => {
    /**
     * `app/tournament-ref.tsx` asks for the event roster three times in a
     * single load (`loadRefereesFromAPI`, the id→name map, and
     * `fetchAllRefereesFromAPI`) plus the match list once. Before #46 that was
     * 4 requests per mount and 8 for open → back → reopen.
     */
    const tournamentRefLoad = async (eventNo: string) => {
      await RefereeDirectoryService.getEventReferees(eventNo);
      await RefereeDirectoryService.getEventMatches(eventNo);
      await RefereeDirectoryService.getEventReferees(eventNo);
      await RefereeDirectoryService.getEventReferees(eventNo);
    };

    it('collapses one tournament-ref load from 4 requests to 2', async () => {
      await tournamentRefLoad('1053');

      expect(client.calls).toEqual(['getEventRefereeList', 'getBeachMatchList']);
      expect(RefereeDirectoryService.getApiCallCount()).toBe(2);
    });

    it('open → back → reopen costs 2 requests instead of 8', async () => {
      await tournamentRefLoad('1053'); // open
      await tournamentRefLoad('1053'); // reopen after going back

      expect(RefereeDirectoryService.getApiCallCount()).toBe(2);
    });

    /**
     * `app/all-referees.tsx` walks the event list, then up to 10 events, then
     * asks for the whole directory twice (active pass + background inactive
     * pass). The second directory read is what the cache removes here.
     */
    it('all-referees downloads the global directory once, not twice', async () => {
      await RefereeDirectoryService.getBeachEvents();
      await RefereeDirectoryService.getAllReferees(); // active pass
      await RefereeDirectoryService.getAllReferees(); // background inactive pass

      expect(client.calls.filter(c => c === 'getRefereeList')).toHaveLength(1);
    });

    it('ref-mode load costs 3 requests, and 0 on reopen', async () => {
      const refModeLoad = async () => {
        await RefereeDirectoryService.getEventReferees('1053');
        await RefereeDirectoryService.getEventOfficials('1053');
        await RefereeDirectoryService.getEventRosterFromEvent('1053');
      };

      await refModeLoad();
      const afterFirst = RefereeDirectoryService.getApiCallCount();
      expect(afterFirst).toBe(3);

      await refModeLoad();
      // getEventRosterFromEvent is deliberately uncached (it is the preserved
      // legacy fallback), so only it repeats.
      expect(RefereeDirectoryService.getApiCallCount() - afterFirst).toBe(1);
    });
  });

  // -------------------------------------------------------------------------
  // Media
  // -------------------------------------------------------------------------

  describe('portrait and ID card', () => {
    it('resolves and caches a portrait URL', async () => {
      const url = await RefereeDirectoryService.getRefereePortraitUrl('123456');
      expect(url).toBe('https://www.fivb.org/Vis2009/Images/GetImage.asmx?No=778899&MaxSize=300');

      await RefereeDirectoryService.getRefereePortraitUrl('123456');
      expect(client.calls.filter(c => c === 'getImageList')).toHaveLength(1);
    });

    it('returns null rather than throwing when there is no portrait', async () => {
      install(makeClient({ getImageList: () => Promise.resolve(ok('<Responses><Images /></Responses>')) }));

      await expect(RefereeDirectoryService.getRefereePortraitUrl('123456')).resolves.toBeNull();
    });

    it('falls back from Volley to Beach for the ID card', async () => {
      install(makeClient({
        getRefereeIdCard: (request) =>
          Promise.resolve(request.volleyType === 'Volley' ? ok('<Responses />') : ok(ID_CARD_XML))
      }));

      const url = await RefereeDirectoryService.getRefereeIdCardUrl('123456');
      expect(url).toBe('https://www.fivb.org/Vis2009/Documents/GetDocument.asmx?Token=abc-123-token');
    });

    it('does not cache the ID card token — it is one-shot', async () => {
      await RefereeDirectoryService.getRefereeIdCardUrl('123456');
      await RefereeDirectoryService.getRefereeIdCardUrl('123456');

      expect(client.calls.filter(c => c === 'getRefereeIdCard')).toHaveLength(2);
    });
  });

  // -------------------------------------------------------------------------
  // Error policy
  // -------------------------------------------------------------------------

  describe('error policy', () => {
    it('never throws when the client rejects', async () => {
      install(makeClient({
        getEventRefereeList: () => Promise.reject(new Error('socket hang up'))
      }));

      const { referees, error } = await RefereeDirectoryService.getEventReferees('1053');
      expect(referees).toEqual([]);
      expect(error).toContain('socket hang up');
    });

    it('reports a failed GetRefereeList as an empty directory plus an error', async () => {
      install(makeClient({ getRefereeList: () => Promise.resolve(fail('rate limited')) }));

      const { referees, error } = await RefereeDirectoryService.getAllReferees();
      expect(referees).toEqual([]);
      expect(error).toContain('rate limited');
    });
  });
});
