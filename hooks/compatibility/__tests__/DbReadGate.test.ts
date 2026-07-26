/**
 * Issue #54, phase 2 — the gate where it is actually wired.
 *
 * These tests run with `EXPO_PUBLIC_SUPABASE_URL` and
 * `EXPO_PUBLIC_SUPABASE_ANON_KEY` set (see `jest.env.js`): the exact state that
 * the Netlify site will be in once Davide adds the variables. What must hold is
 * that this state, on its own, changes nothing.
 */

import { CacheServiceCompatibility } from '../CacheServiceCompatibility';
import {
  DB_READ_ENV_VAR,
  isDbMarkedUnavailable,
  resetDbReadFlagsForTests,
  setDbReadOverride,
} from '../../../services/flags/DbReadFlags';

/** Counts every load of the DualReadService module through the dynamic import. */
const mockModuleLoads = { count: 0 };
const mockInstance = {
  configure: jest.fn(),
  getTournaments: jest.fn(),
  getMatches: jest.fn(),
  getReferees: jest.fn(),
  invalidateCache: jest.fn().mockResolvedValue(undefined),
  getPerformanceMetrics: jest.fn(() => new Map()),
};
/** When set, `getInstance()` throws it — the `supabaseUrl is required.` case. */
let mockGetInstanceThrows: Error | null = null;

jest.mock('../../../services/DualReadService', () => ({
  get DualReadService() {
    mockModuleLoads.count += 1;
    return {
      getInstance: () => {
        if (mockGetInstanceThrows) throw mockGetInstanceThrows;
        return mockInstance;
      },
    };
  },
}));

jest.mock('../../../lib/queryClient', () => ({
  queryClient: {
    clear: jest.fn(),
    removeQueries: jest.fn(),
    setQueryData: jest.fn(),
    getQueryData: jest.fn(),
  },
}));

const okResult = (source: 'database' | 'api') => ({
  data: [],
  source,
  timestamp: Date.now(),
  performance: { queryTime: 1, fallbackUsed: false },
});

beforeEach(() => {
  jest.clearAllMocks();
  mockModuleLoads.count = 0;
  mockGetInstanceThrows = null;
  delete process.env[DB_READ_ENV_VAR];
  resetDbReadFlagsForTests();
  mockInstance.getTournaments.mockResolvedValue(okResult('database'));
  mockInstance.getMatches.mockResolvedValue(okResult('database'));
  mockInstance.getReferees.mockResolvedValue({ ...okResult('database'), data: [] });
});

describe('AC4 — Supabase configured, flag off → nothing goes to the database', () => {
  it('rejects every read so the caller stays on the VIS API path', async () => {
    await expect(CacheServiceCompatibility.getTournaments()).rejects.toThrow(/disabled/);
    await expect(CacheServiceCompatibility.getMatches('MWBVT2024')).rejects.toThrow(/disabled/);
    await expect(CacheServiceCompatibility.getRefereeData('MWBVT2024')).rejects.toThrow(/disabled/);

    expect(mockInstance.getTournaments).not.toHaveBeenCalled();
    expect(mockInstance.getMatches).not.toHaveBeenCalled();
    expect(mockInstance.getReferees).not.toHaveBeenCalled();
  });

  it('does not even load the DualReadService module', async () => {
    await CacheServiceCompatibility.getTournaments().catch(() => undefined);
    await CacheServiceCompatibility.clearCache();
    CacheServiceCompatibility.initialize();

    // No Supabase client is built, and the async chunk is never fetched.
    expect(mockModuleLoads.count).toBe(0);
  });

  it('reports the same thing through the legacy predicate', () => {
    expect(CacheServiceCompatibility.isUsingNewHooks()).toBe(false);
  });
});

describe('AC5 — one domain at a time', () => {
  it('sends tournaments to the DB while matches and referees stay on the API', async () => {
    setDbReadOverride(['tournaments']);

    const tournaments = await CacheServiceCompatibility.getTournaments();
    expect(tournaments.source).toBe('supabase');
    expect(mockInstance.getTournaments).toHaveBeenCalledTimes(1);
    expect(mockInstance.configure).toHaveBeenCalledWith(
      expect.objectContaining({ readStrategy: 'db_first', fallbackEnabled: true })
    );

    await expect(CacheServiceCompatibility.getMatches('MWBVT2024')).rejects.toThrow(/"matches"/);
    await expect(CacheServiceCompatibility.getRefereeData('MWBVT2024')).rejects.toThrow(/"referees"/);
    expect(mockInstance.getMatches).not.toHaveBeenCalled();
    expect(mockInstance.getReferees).not.toHaveBeenCalled();
  });

  it('invalidates only the enabled domains on clearCache', async () => {
    setDbReadOverride(['matches']);

    await CacheServiceCompatibility.clearCache();

    expect(mockInstance.invalidateCache).toHaveBeenCalledTimes(1);
    expect(mockInstance.invalidateCache).toHaveBeenCalledWith('matches');
  });
});

describe('AC6 — rollback with the variables still in place', () => {
  it('stops reading from the DB the moment the flag is turned off', async () => {
    process.env[DB_READ_ENV_VAR] = 'all';
    resetDbReadFlagsForTests();

    expect((await CacheServiceCompatibility.getTournaments()).source).toBe('supabase');

    CacheServiceCompatibility.disableNewHooks(); // == setDbReadOverride('off')

    await expect(CacheServiceCompatibility.getTournaments()).rejects.toThrow(/disabled/);
    expect(mockInstance.getTournaments).toHaveBeenCalledTimes(1);
    // Neither variable was removed.
    expect(process.env.EXPO_PUBLIC_SUPABASE_URL).toBeTruthy();
    expect(process.env[DB_READ_ENV_VAR]).toBe('all');
  });
});

describe('AC7 — Supabase unavailable while the flag is ON', () => {
  it('survives the throwing constructor and falls back instead of propagating it', async () => {
    setDbReadOverride('all');
    // The real failure mode: `createClient()` throws `supabaseUrl is required.`
    // straight out of `DualReadService.getInstance()`.
    mockGetInstanceThrows = new Error('supabaseUrl is required.');

    await expect(CacheServiceCompatibility.getTournaments()).rejects.toThrow(/disabled/);
    // The Supabase error is not what reaches the caller — the fallback signal is.
    await expect(CacheServiceCompatibility.getTournaments()).rejects.not.toThrow(
      /supabaseUrl is required/
    );

    expect(isDbMarkedUnavailable()).toBe(true);
  });

  it('arms the kill switch so the other domains stop trying too', async () => {
    setDbReadOverride('all');
    mockGetInstanceThrows = new Error('supabaseUrl is required.');

    await CacheServiceCompatibility.getTournaments().catch(() => undefined);
    const loadsAfterFirstFailure = mockModuleLoads.count;

    // Matches and referees short-circuit on the flag now, without retrying.
    await CacheServiceCompatibility.getMatches('MWBVT2024').catch(() => undefined);
    await CacheServiceCompatibility.getRefereeData('MWBVT2024').catch(() => undefined);

    expect(mockModuleLoads.count).toBe(loadsAfterFirstFailure);
  });

  it('recovers on the next successful read', async () => {
    setDbReadOverride('all');
    mockGetInstanceThrows = new Error('supabaseUrl is required.');
    await CacheServiceCompatibility.getTournaments().catch(() => undefined);
    expect(isDbMarkedUnavailable()).toBe(true);

    // Cooldown elapses, Supabase is healthy again.
    jest.spyOn(Date, 'now').mockReturnValue(Date.now() + 120_000);
    mockGetInstanceThrows = null;
    try {
      expect((await CacheServiceCompatibility.getTournaments()).source).toBe('supabase');
      expect(isDbMarkedUnavailable()).toBe(false);
    } finally {
      (Date.now as jest.Mock).mockRestore();
    }
  });
});
