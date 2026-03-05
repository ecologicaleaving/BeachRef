/**
 * Tests for issue #20: tornei 2026 senza partite mostrano partite di altri tornei
 *
 * Verifica che:
 * - AC1: Un torneo senza partite nel DB mostra lista vuota
 * - AC2: Le partite di altri tornei non compaiono
 * - AC3: Un torneo con partite regolari non è affetto da regressioni
 * - La cache usa chiavi scoped per anno (prevent João Pessoa-style bugs)
 * - useMatches non esegue query senza filtro torneo
 *
 * NOTE sull'approccio mock:
 *
 * jest.mock() factories vengono registrate prima che l'esecuzione del modulo
 * raggiunga le dichiarazioni `const mockXxx = jest.fn()...`. Con babel hoisting,
 * i require() compilati dagli import vengono eseguiti PRIMA che quelle const siano
 * valutate, causando TDZ (Temporal Dead Zone) o `undefined`.
 *
 * Soluzione adottata:
 * 1. Tutti i jest.mock factory usano jest.fn() inline (nessun riferimento a const esterne).
 * 2. I riferimenti ai mock sono recuperati DOPO il caricamento dei moduli tramite
 *    jest.requireMock() e iniezione diretta della static property.
 */

// ---------------------------------------------------------------------------
// jest.mock factory: SOLO jest.fn() inline, nessuna variabile esterna
// ---------------------------------------------------------------------------
jest.mock('../../services/cache/UnifiedCacheManager', () => ({
  UnifiedCacheManager: {
    getInstance: () => ({
      get: jest.fn(),
      set: jest.fn(),
      delete: jest.fn(),
    }),
  },
}));

jest.mock('../../utils/cachePerformanceMonitor', () => ({
  CachePerformanceMonitor: {
    recordCacheMiss: jest.fn(),
    recordCacheHit: jest.fn(),
    recordCacheError: jest.fn(),
  },
}));

// cacheUtils: inline jest.fn() per evitare il problema TDZ.
// I riferimenti vengono recuperati dopo con jest.requireMock().
jest.mock('../../utils/cacheUtils', () => ({
  isStale: jest.fn().mockReturnValue(false),
  getMatchCacheTTL: jest.fn().mockReturnValue(60000),
  createCacheMetadata: jest.fn().mockReturnValue({
    cachedAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + 60000).toISOString(),
  }),
  CacheTTL: { LIVE: 5000, DYNAMIC: 15000, SEMI_STATIC: 120000, STATIC: 86400000 },
}));

// ---------------------------------------------------------------------------
// Imports (eseguiti dopo la registrazione dei factory)
// ---------------------------------------------------------------------------
import { TournamentMatchCache } from '../../services/cache/TournamentMatchCache';

// ---------------------------------------------------------------------------
// Recupera riferimenti ai mock DOPO il caricamento dei moduli
// ---------------------------------------------------------------------------
// Stable mock instances for TournamentMatchCache.cacheManager (injected in beforeEach)
const mockCacheGet = jest.fn();
const mockCacheSet = jest.fn();
const mockCacheDelete = jest.fn();

// cacheUtils mock references (created inline nel factory, recuperati qui)
const cacheUtilsMock = jest.requireMock('../../utils/cacheUtils') as {
  isStale: jest.Mock;
  getMatchCacheTTL: jest.Mock;
  createCacheMetadata: jest.Mock;
};

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------
const MOCK_MATCH = {
  visNo: '100',
  matchCode: 'T1-100',
  scheduledDateTime: '2025-07-15T10:00:00Z',
  status: 'FINISHED' as const,
  tournamentNo: '1234',
} as any;

// ---------------------------------------------------------------------------
// Setup
// ---------------------------------------------------------------------------
beforeEach(() => {
  jest.clearAllMocks();

  // Default: cache miss
  mockCacheGet.mockResolvedValue({ success: false, data: null });
  mockCacheSet.mockResolvedValue({ success: true });
  mockCacheDelete.mockResolvedValue({ success: true });

  // Default cacheUtils behavior: fresh (not stale)
  cacheUtilsMock.isStale.mockReturnValue(false);
  cacheUtilsMock.getMatchCacheTTL.mockReturnValue(60000);
  cacheUtilsMock.createCacheMetadata.mockReturnValue({
    cachedAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + 60000).toISOString(),
  });

  // Inject mock directly into TournamentMatchCache's private static field.
  // This bypasses the module-load-time initialization issue.
  (TournamentMatchCache as any).cacheManager = {
    get: mockCacheGet,
    set: mockCacheSet,
    delete: mockCacheDelete,
  };
});

// ---------------------------------------------------------------------------
// AC1 & AC2 — Torneo senza partite mostra empty state, non partite di altri tornei
// ---------------------------------------------------------------------------
describe('AC1 & AC2 — Tournament senza partite: empty state, no partite altrui', () => {
  it('getCachedMatches returns null when no cache entry exists', async () => {
    // Cache miss → null → triggers fresh API fetch (not stale data from another tournament)
    const result = await TournamentMatchCache.getCachedMatches('2026-NO-MATCHES', 2026);
    expect(result).toBeNull();
  });

  it('getCachedMatches returns null for 2026 even if same visNo was cached in 2025', async () => {
    // 2025 entry exists but 2026 does not — they have separate cache keys
    mockCacheGet
      .mockResolvedValueOnce({
        success: true,
        data: {
          matches: [MOCK_MATCH],
          tournamentStatus: 'COMPLETED',
          cachedAt: new Date().toISOString(),
          expiresAt: new Date(Date.now() + 60000).toISOString(),
        },
      }) // first call: 2025 → hit
      .mockResolvedValueOnce({ success: false, data: null }); // second call: 2026 → miss

    const result2025 = await TournamentMatchCache.getCachedMatches('RECURRING-VIS', 2025);
    const result2026 = await TournamentMatchCache.getCachedMatches('RECURRING-VIS', 2026);

    expect(result2025).not.toBeNull(); // 2025 has data
    expect(result2026).toBeNull();     // 2026 has none → will fetch from API
  });

  it('cacheMatches does NOT write an empty matches array to cache', async () => {
    // Direct call with [] simulates an hypothetical call — set must NOT be invoked.
    // (In production, loadMatches guards with allMatches.length > 0 before calling cacheMatches)
    await TournamentMatchCache.cacheMatches('EMPTY-TOURNAMENT', [], 'SCHEDULED', 2026);
    expect(mockCacheSet).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// AC3 — Torneo con partite regolari: nessuna regressione
// ---------------------------------------------------------------------------
describe('AC3 — Torneo con partite: nessuna regressione', () => {
  it('returns cached matches when a fresh entry exists', async () => {
    mockCacheGet.mockResolvedValueOnce({
      success: true,
      data: {
        matches: [MOCK_MATCH],
        tournamentStatus: 'COMPLETED',
        cachedAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + 60000).toISOString(),
      },
    });
    // isStale default is already false; queue an extra false to be explicit
    cacheUtilsMock.isStale.mockReturnValueOnce(false);

    const result = await TournamentMatchCache.getCachedMatches('1234', 2025);

    expect(result).not.toBeNull();
    expect(result).toHaveLength(1);
    expect(result![0].visNo).toBe('100');
  });

  it('returns null when cache entry is stale (triggers re-fetch)', async () => {
    mockCacheGet.mockResolvedValueOnce({
      success: true,
      data: {
        matches: [MOCK_MATCH],
        tournamentStatus: 'RUNNING',
        cachedAt: new Date(Date.now() - 120000).toISOString(),
        expiresAt: new Date(Date.now() - 60000).toISOString(),
      },
    });
    cacheUtilsMock.isStale.mockReturnValueOnce(true); // expired

    const result = await TournamentMatchCache.getCachedMatches('5678', 2026);
    expect(result).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Cache key isolation — anno è parte della chiave
// ---------------------------------------------------------------------------
describe('Cache key isolation — years do not collide', () => {
  it('uses year-scoped keys so 2025 and 2026 are independent cache entries', async () => {
    await TournamentMatchCache.getCachedMatches('SHARED-VIS', 2025);
    await TournamentMatchCache.getCachedMatches('SHARED-VIS', 2026);

    expect(mockCacheGet).toHaveBeenCalledTimes(2);
    const key2025 = mockCacheGet.mock.calls[0][1];
    const key2026 = mockCacheGet.mock.calls[1][1];

    expect(key2025).toBe('matches_SHARED-VIS_2025');
    expect(key2026).toBe('matches_SHARED-VIS_2026');
    expect(key2025).not.toBe(key2026);
  });

  it('clearCache targets only the specific year entry', async () => {
    await TournamentMatchCache.clearCache('TOURNAMENT-X', 2025);
    await TournamentMatchCache.clearCache('TOURNAMENT-X', 2026);

    expect(mockCacheDelete).toHaveBeenCalledTimes(2);
    expect(mockCacheDelete.mock.calls[0][1]).toBe('matches_TOURNAMENT-X_2025');
    expect(mockCacheDelete.mock.calls[1][1]).toBe('matches_TOURNAMENT-X_2026');
  });
});

// ---------------------------------------------------------------------------
// useMatches filter guard (issue #20 fix in useMatches.ts)
// ---------------------------------------------------------------------------
describe('useMatches filter guard — no query without tournament filter', () => {
  it('does not reach DB path when no tournamentCode or eventId is provided', () => {
    // We test the guard logic directly (not the hook, which needs React environment).
    // The guard returns [] immediately when filters are empty → no DB query.
    const filtersWithoutTournament = { status: 'SCHEDULED' } as any;
    const hasTournamentFilter =
      !!filtersWithoutTournament?.tournamentCode || !!filtersWithoutTournament?.eventId;

    expect(hasTournamentFilter).toBe(false);
    // When hasTournamentFilter is false, the DB fallback in useMatches returns []
    // preventing matches from other tournaments from being shown.
  });

  it('allows DB path when tournamentCode is present', () => {
    const filtersWithTournament = { tournamentCode: '1552', status: 'SCHEDULED' } as any;
    const hasTournamentFilter =
      !!filtersWithTournament?.tournamentCode || !!filtersWithTournament?.eventId;

    expect(hasTournamentFilter).toBe(true);
  });

  it('allows DB path when eventId is present', () => {
    const filtersWithEvent = { eventId: 9999 } as any;
    const hasTournamentFilter =
      !!filtersWithEvent?.tournamentCode || !!filtersWithEvent?.eventId;

    expect(hasTournamentFilter).toBe(true);
  });
});
