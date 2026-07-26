/**
 * OfficialsService.primeAuxiliaryPersonsCache — issue #47.
 *
 * `utils/auxiliaryPersonsSync.ts` was deleted: it issued its own
 * `GetEvent Fields="AuxiliaryPersons"` with a raw `fetch` and re-implemented the
 * double XML decode that {@link OfficialsService} already owns. What had to
 * survive is the *shape* of the MMKV entry, because
 * {@link getSupportingOfficialsSync} reads it synchronously during render and
 * cannot await.
 *
 * These tests pin that contract end to end on fixtures, with no network: the
 * service writes the entry, and the sync reader resolves names off it.
 */

import { OfficialsService } from '../../services/OfficialsService';
import { getSupportingOfficialsSync } from '../../utils/matchOfficialsSync';
import { cacheMmkvStorage } from '../../services/cache/MmkvStorage';
import type { VisApiResponse } from '../../types/api-v2';

const ok = (xmlData: string): VisApiResponse => ({
  success: true,
  xmlData,
  timestamp: new Date().toISOString(),
  durationMs: 1,
  sizeBytes: xmlData.length
} as VisApiResponse);

/**
 * `AuxiliaryPersons` travels XML-escaped inside an XML attribute — the exact
 * reason the old module needed its own entity decoder.
 */
const GET_EVENT_XML = `<?xml version="1.0" encoding="utf-8"?>
<Event No="1053" Name="Rome Open" AuxiliaryPersons="&lt;AuxiliaryPersons&gt;&lt;AuxiliaryPerson No=&quot;3&quot; FirstName=&quot;Marta&quot; LastName=&quot;Neri&quot; NationalityCode=&quot;ITA&quot; Gender=&quot;1&quot; Functions=&quot;4&quot; /&gt;&lt;AuxiliaryPerson No=&quot;10&quot; FirstName=&quot;Luca&quot; LastName=&quot;Verdi&quot; NationalityCode=&quot;FRA&quot; Gender=&quot;0&quot; Functions=&quot;2&quot; /&gt;&lt;/AuxiliaryPersons&gt;" />`;

/** A match carrying an escaped `Personnel` document, as GetBeachMatchList does. */
const MATCH_WITH_PERSONNEL = {
  NoEvent: '1053',
  Personnel: '&lt;Personnel Scorer="3" LineJudge1="10" /&gt;'
};

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

describe('OfficialsService.primeAuxiliaryPersonsCache (#47)', () => {
  let getEventCalls: number;

  beforeEach(async () => {
    getEventCalls = 0;
    OfficialsService.setDependencies({
      client: {
        getEvent: async () => {
          getEventCalls += 1;
          return ok(GET_EVENT_XML);
        },
        getBeachMatchList: async () => ok('<Responses />'),
        getEventRefereeList: async () => ok('<Responses />')
      },
      cache: new FakeCache() as any
    });
    await cacheMmkvStorage.removeItem('event:1053:auxiliaryPersons');
  });

  afterEach(async () => {
    OfficialsService.setDependencies(null);
    await cacheMmkvStorage.removeItem('event:1053:auxiliaryPersons');
  });

  it('publishes the roster in the entry the synchronous reader expects', async () => {
    await OfficialsService.primeAuxiliaryPersonsCache('1053');

    const raw = cacheMmkvStorage.getRawStorage().getString('event:1053:auxiliaryPersons');
    expect(raw).toBeDefined();

    const entry = JSON.parse(raw!);
    expect(entry.expiresAt).toBeGreaterThan(Date.now());
    expect(entry.data).toEqual([
      { No: '3', FirstName: 'Marta', LastName: 'Neri', NationalityCode: 'ITA', Gender: 'F', Functions: '4' },
      { No: '10', FirstName: 'Luca', LastName: 'Verdi', NationalityCode: 'FRA', Gender: 'M', Functions: '2' }
    ]);

    // `No` must stay a string: matchOfficialsSync compares it against
    // stringified Personnel ids.
    expect(typeof entry.data[0].No).toBe('string');
  });

  it('lets getSupportingOfficialsSync resolve Personnel ids to names', async () => {
    await OfficialsService.primeAuxiliaryPersonsCache('1053');

    expect(getSupportingOfficialsSync(MATCH_WITH_PERSONNEL)).toEqual([
      { role: 'SC', name: 'Neri, M.', federationCode: 'ITA' },
      { role: 'LJ1', name: 'Verdi, L.', federationCode: 'FRA' }
    ]);
  });

  it('reuses the cached roster instead of re-issuing GetEvent', async () => {
    await OfficialsService.primeAuxiliaryPersonsCache('1053');
    await OfficialsService.primeAuxiliaryPersonsCache('1053');

    expect(getEventCalls).toBe(1);
  });

  it('leaves the entry absent — and never throws — when the VIS call fails', async () => {
    OfficialsService.setDependencies({
      client: {
        getEvent: async () => ({
          success: false,
          error: 'boom',
          errorCode: 'VIS_ERROR',
          timestamp: new Date().toISOString(),
          durationMs: 1
        } as VisApiResponse),
        getBeachMatchList: async () => ok('<Responses />'),
        getEventRefereeList: async () => ok('<Responses />')
      },
      cache: new FakeCache() as any
    });

    await expect(OfficialsService.primeAuxiliaryPersonsCache('1053')).resolves.toBeUndefined();
    expect(cacheMmkvStorage.getRawStorage().getString('event:1053:auxiliaryPersons')).toBeUndefined();
    expect(getSupportingOfficialsSync(MATCH_WITH_PERSONNEL)).toEqual([]);
  });
});
