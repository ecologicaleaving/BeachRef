/**
 * Issue #54 — AC7, simulated rather than deduced.
 *
 * The issue is explicit that the fallback must be *proved*, because the failure
 * mode is a constructor that throws: reading the code and concluding "there is
 * a `fallbackEnabled` flag, so it degrades" is exactly the reasoning that was
 * wrong. So this suite drives the **real** `DualReadService` against the real
 * `@supabase/supabase-js`, and breaks the transport underneath it.
 *
 * Two failure shapes, because they fail differently:
 *
 * 1. **Unreachable** — `fetch` rejects. PostgREST surfaces it as a query error.
 * 2. **Slow** — `fetch` never settles. Nothing in the service used to bound
 *    this: `dbTimeoutMs` was declared in `DualReadConfig` and applied to
 *    nothing. Without `withDbTimeout` this test hangs until jest kills it.
 */

jest.mock('../NetworkMonitor', () => ({
  NetworkMonitor: { getInstance: () => ({ isConnected: () => true, addListener: jest.fn() }) },
}));
jest.mock('../ErrorLogger', () => ({
  ErrorLogger: { getInstance: () => ({ logError: jest.fn().mockResolvedValue(undefined) }) },
}));
jest.mock('../ConnectionCircuitBreaker', () => ({
  ConnectionCircuitBreaker: { getInstance: () => ({ execute: (fn: () => unknown) => fn() }) },
}));
jest.mock('../SetScoreService', () => ({ SetScoreService: class {} }));

import { DualReadService } from '../DualReadService';

const DB_TIMEOUT_MS = 150;
const realFetch = global.fetch;

function freshService(): DualReadService {
  (DualReadService as unknown as { instance: DualReadService | null }).instance = null;
  const service = DualReadService.getInstance();
  service.configure({
    readStrategy: 'db_first',
    fallbackEnabled: true,
    dbTimeoutMs: DB_TIMEOUT_MS,
    apiTimeoutMs: DB_TIMEOUT_MS,
  });
  return service;
}

beforeEach(() => {
  process.env.EXPO_PUBLIC_SUPABASE_URL = 'https://unreachable.invalid';
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY = 'anon-key-for-the-test';
  delete process.env.EXPO_PUBLIC_EDGE_URL;
});

afterEach(() => {
  global.fetch = realFetch;
});

describe('AC7 — Supabase unreachable', () => {
  it('does not hang, does not serve database data, and reports the failure', async () => {
    global.fetch = jest.fn().mockRejectedValue(new TypeError('fetch failed')) as typeof fetch;

    const started = Date.now();
    const result = await freshService().getTournaments();

    expect(Date.now() - started).toBeLessThan(5_000);
    expect(result.source).not.toBe('database');
    // With no Edge URL configured the dual-read service has nowhere else to go,
    // so it reports rather than pretends. The VIS fallback lives one level up,
    // in the callers of CacheServiceCompatibility.
    expect(result.data).toBeNull();
    expect(result.error).toBeTruthy();
  });
});

describe('AC7 — Supabase slow', () => {
  it('gives up on the database after dbTimeoutMs instead of waiting forever', async () => {
    // A request that never settles: the shape of a hung connection, which is
    // strictly worse than an error because nothing downstream ever runs.
    global.fetch = jest.fn(() => new Promise<Response>(() => {})) as unknown as typeof fetch;

    const started = Date.now();
    const result = await freshService().getTournaments();
    const elapsed = Date.now() - started;

    expect(elapsed).toBeGreaterThanOrEqual(DB_TIMEOUT_MS - 20);
    expect(elapsed).toBeLessThan(DB_TIMEOUT_MS * 20);
    expect(result.source).not.toBe('database');
  }, 10_000);
});

describe('AC7 — Supabase not configured at all (today\'s production)', () => {
  it('skips the database instead of throwing out of the constructor', () => {
    delete process.env.EXPO_PUBLIC_SUPABASE_URL;
    delete process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

    expect(DualReadService.isSupabaseConfigured()).toBe(false);
    // The whole point: `getInstance()` used to throw `supabaseUrl is required.`
    // right here.
    expect(() => freshService()).not.toThrow();
  });

  it('returns an API-sourced result rather than a rejected promise', async () => {
    delete process.env.EXPO_PUBLIC_SUPABASE_URL;
    delete process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

    const result = await freshService().getTournaments();

    expect(result.source).toBe('api');
  });
});
