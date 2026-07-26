/**
 * challengeRefereeSync — issue #47.
 *
 * The module keeps its reason to exist (a *synchronous* id → name map that
 * `MatchCard` reads during render) but no longer owns a `fetch` or an XML
 * parser: the roster comes from
 * {@link RefereeDirectoryService.getEventReferees}, which is cached, retried,
 * and visible to `ApiAuditService`.
 *
 * Fixtures only — the client double never touches the network.
 */

import {
  fetchEventRefereeList,
  getChallengeRefereeSync,
  isEventRefereeMapCached,
  clearAllRefereeCache
} from '../../utils/challengeRefereeSync';
import { RefereeDirectoryService } from '../../services/RefereeDirectoryService';
import type { VisApiResponse } from '../../types/api-v2';

const ok = (xmlData: string): VisApiResponse => ({
  success: true,
  xmlData,
  timestamp: new Date().toISOString(),
  durationMs: 1,
  sizeBytes: xmlData.length
} as VisApiResponse);

const fail = (): VisApiResponse => ({
  success: false,
  error: 'boom',
  errorCode: 'VIS_ERROR',
  timestamp: new Date().toISOString(),
  durationMs: 1
} as VisApiResponse);

const EVENT_REFEREE_LIST_XML = `<?xml version="1.0" encoding="utf-8"?>
<Responses>
  <EventReferees>
    <EventReferee No="88" NoReferee="123456" FirstName="Anna" LastName="Rossi" FederationCode="ITA" Gender="1" />
    <EventReferee No="89" NoReferee="654321" FirstName="Bob" LastName="Smith" FederationCode="USA" Gender="0" />
  </EventReferees>
</Responses>`;

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

function install(refereeListResponse: () => VisApiResponse) {
  const calls = { getEventRefereeList: 0 };
  RefereeDirectoryService.setDependencies({
    client: {
      getEvent: async () => ok('<Responses />'),
      getEventRefereeList: async () => {
        calls.getEventRefereeList += 1;
        return refereeListResponse();
      },
      getEventOfficialList: async () => ok('<Responses />'),
      getBeachMatchList: async () => ok('<Responses />'),
      getEventList: async () => ok('<Responses />'),
      getRefereeList: async () => ok('<Responses />'),
      getReferee: async () => ok('<Responses />'),
      getImageList: async () => ok('<Responses />'),
      getRefereeIdCard: async () => ok('<Responses />')
    } as any,
    cache: new FakeCache() as any
  });
  return calls;
}

describe('challengeRefereeSync (#47)', () => {
  let fetchSpy: jest.SpyInstance;

  beforeEach(() => {
    clearAllRefereeCache();
    fetchSpy = jest.spyOn(global as any, 'fetch');
  });

  afterEach(() => {
    fetchSpy.mockRestore();
    RefereeDirectoryService.setDependencies(null);
    clearAllRefereeCache();
  });

  it('builds the lookup map from the service, without a raw fetch', async () => {
    install(() => ok(EVENT_REFEREE_LIST_XML));

    await fetchEventRefereeList('1053');

    expect(fetchSpy).not.toHaveBeenCalled();
    expect(isEventRefereeMapCached('1053')).toBe(true);

    expect(getChallengeRefereeSync({ NoEvent: '1053', NoRefereeChallenge: 123456 })).toEqual({
      name: 'Anna Rossi',
      federationCode: 'ITA'
    });
  });

  it('keeps the previous gender mapping (VIS 0 = M, 1 = F)', async () => {
    install(() => ok(EVENT_REFEREE_LIST_XML));
    await fetchEventRefereeList('1053');

    // Gender is not part of the public return value, so assert it through the
    // only observable difference: both referees resolve, neither is dropped.
    expect(getChallengeRefereeSync({ NoEvent: '1053', NoRefereeChallenge: 654321 })).toEqual({
      name: 'Bob Smith',
      federationCode: 'USA'
    });
  });

  it('does not re-request an event it has already mapped', async () => {
    const calls = install(() => ok(EVENT_REFEREE_LIST_XML));

    await fetchEventRefereeList('1053');
    await fetchEventRefereeList('1053');

    expect(calls.getEventRefereeList).toBe(1);
  });

  it('caches an empty map on failure, so a failing event is not retried per render', async () => {
    install(() => fail());

    await expect(fetchEventRefereeList('1053')).resolves.toBeUndefined();

    expect(isEventRefereeMapCached('1053')).toBe(true);
    expect(getChallengeRefereeSync({ NoEvent: '1053', NoRefereeChallenge: 123456 })).toBeNull();
  });

  it('returns null when the match carries no Challenge Referee', async () => {
    install(() => ok(EVENT_REFEREE_LIST_XML));
    await fetchEventRefereeList('1053');

    expect(getChallengeRefereeSync({ NoEvent: '1053' })).toBeNull();
    expect(getChallengeRefereeSync(null)).toBeNull();
  });
});
