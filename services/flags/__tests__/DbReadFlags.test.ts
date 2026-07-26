/**
 * Issue #54, phase 2 — the flag itself.
 *
 * `jest.env.js` sets `EXPO_PUBLIC_SUPABASE_URL` and
 * `EXPO_PUBLIC_SUPABASE_ANON_KEY` for every suite, which makes this file run in
 * exactly the configuration that the issue is afraid of: **Supabase fully
 * configured**. Everything below therefore asserts the decoupling directly.
 */

import {
  DB_READ_DOMAINS,
  DB_READ_ENV_VAR,
  DB_READ_QUERY_PARAM,
  clearDbUnavailable,
  describeDbReadFlags,
  getEnabledDbReadDomains,
  isDbMarkedUnavailable,
  isDbReadEnabled,
  markDbUnavailable,
  parseDbReadDomains,
  resetDbReadFlagsForTests,
  setDbReadOverride,
} from '../DbReadFlags';

const originalEnv = process.env[DB_READ_ENV_VAR];

beforeEach(() => {
  delete process.env[DB_READ_ENV_VAR];
  resetDbReadFlagsForTests();
});

afterAll(() => {
  if (originalEnv === undefined) delete process.env[DB_READ_ENV_VAR];
  else process.env[DB_READ_ENV_VAR] = originalEnv;
  resetDbReadFlagsForTests();
});

describe('AC4 — configured is not the same as enabled', () => {
  it('reads nothing from the database by default, with Supabase fully configured', () => {
    expect(process.env.EXPO_PUBLIC_SUPABASE_URL).toBeTruthy();
    expect(process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY).toBeTruthy();

    expect(getEnabledDbReadDomains()).toEqual([]);
    for (const domain of DB_READ_DOMAINS) {
      expect(isDbReadEnabled(domain)).toBe(false);
    }
    expect(describeDbReadFlags().source).toBe('default');
  });
});

describe('AC5 — activation is per read domain', () => {
  it('enables one domain without enabling the others', () => {
    setDbReadOverride(['tournaments']);

    expect(isDbReadEnabled('tournaments')).toBe(true);
    expect(isDbReadEnabled('matches')).toBe(false);
    expect(isDbReadEnabled('referees')).toBe(false);
  });

  it('enables a pair of domains', () => {
    setDbReadOverride(['matches', 'referees']);
    expect(getEnabledDbReadDomains().sort()).toEqual(['matches', 'referees']);
  });

  it('reads a per-domain list from the environment default', () => {
    process.env[DB_READ_ENV_VAR] = 'tournaments';
    resetDbReadFlagsForTests();

    expect(describeDbReadFlags().source).toBe('env');
    expect(getEnabledDbReadDomains()).toEqual(['tournaments']);
  });
});

describe('AC6 — rollback beats the environment, with no deploy', () => {
  it('an explicit "off" override wins over an env var that enables everything', () => {
    process.env[DB_READ_ENV_VAR] = 'all';
    resetDbReadFlagsForTests();
    expect(getEnabledDbReadDomains()).toHaveLength(DB_READ_DOMAINS.length);

    // This is the rollback: no variable removed, nothing redeployed.
    setDbReadOverride('off');

    expect(getEnabledDbReadDomains()).toEqual([]);
    expect(describeDbReadFlags().source).toBe('local-override');
    // The variable is still there — that is the point.
    expect(process.env[DB_READ_ENV_VAR]).toBe('all');
  });

  it('clearing the override returns to the environment default', () => {
    process.env[DB_READ_ENV_VAR] = 'matches';
    resetDbReadFlagsForTests();

    setDbReadOverride('off');
    expect(getEnabledDbReadDomains()).toEqual([]);

    setDbReadOverride(null);
    expect(getEnabledDbReadDomains()).toEqual(['matches']);
  });

  it('exposes a console handle so the rollback is reachable from devtools', () => {
    const handle = (globalThis as any).__beachrefDbReads;
    expect(handle).toBeDefined();

    handle.set(['tournaments']);
    expect(isDbReadEnabled('tournaments')).toBe(true);

    handle.off();
    expect(getEnabledDbReadDomains()).toEqual([]);
    expect(handle.describe().source).toBe('local-override');
  });
});

describe('AC7 — the runtime kill switch', () => {
  it('disables every domain while armed, and heals after the cooldown', () => {
    setDbReadOverride('all');
    expect(getEnabledDbReadDomains()).toHaveLength(DB_READ_DOMAINS.length);

    markDbUnavailable('supabaseUrl is required.', 50);
    expect(isDbMarkedUnavailable()).toBe(true);
    expect(getEnabledDbReadDomains()).toEqual([]);
    expect(describeDbReadFlags().source).toBe('kill-switch');
    expect(describeDbReadFlags().layers.killSwitch.reason).toContain('supabaseUrl');

    clearDbUnavailable();
    expect(getEnabledDbReadDomains()).toHaveLength(DB_READ_DOMAINS.length);
  });
});

describe('query parameter (layer 2)', () => {
  const setSearch = (search: string) => {
    (globalThis as any).location = { search };
  };

  afterEach(() => {
    delete (globalThis as any).location;
  });

  it('?dbReads=tournaments enables exactly one domain', () => {
    setSearch(`?${DB_READ_QUERY_PARAM}=tournaments`);
    resetDbReadFlagsForTests();

    expect(getEnabledDbReadDomains()).toEqual(['tournaments']);
  });

  it('?dbReads=off is the one-URL rollback and beats the env default', () => {
    process.env[DB_READ_ENV_VAR] = 'all';
    setSearch(`?${DB_READ_QUERY_PARAM}=off`);
    resetDbReadFlagsForTests();

    expect(getEnabledDbReadDomains()).toEqual([]);
  });
});

describe('parsing is fail-closed', () => {
  it.each([
    [undefined, []],
    [null, []],
    ['', []],
    ['off', []],
    ['none', []],
    ['false', []],
    ['nonsense', []],
    ['tournaments,typo', ['tournaments']],
    ['tournament', ['tournaments']],
    ['all', [...DB_READ_DOMAINS]],
    ['tournaments, matches', ['tournaments', 'matches']],
  ])('parseDbReadDomains(%p) → %p', (raw, expected) => {
    expect(parseDbReadDomains(raw as string | null | undefined)).toEqual(expected);
  });

  it('never enables a domain because of a typo', () => {
    expect(parseDbReadDomains('tournamnets')).toEqual([]);
  });
});
