/**
 * Db-read feature flags (issue #54, phase 2).
 *
 * ## Why this module exists
 *
 * Before this file, "Supabase is configured" and "the application reads from
 * the database" were **the same fact**. `DualReadService` is hard-configured
 * with `readStrategy: 'db_first'`, and its constructor called
 * `createClient(process.env.EXPO_PUBLIC_SUPABASE_URL!, ...)`. Without the
 * variable, `createClient` throws `supabaseUrl is required.` — *in the
 * constructor*, not on a query. That throw is the only reason the DB branch is
 * inert today: every caller of `CacheServiceCompatibility` gets a rejected
 * promise and falls back to the VIS API path.
 *
 * The consequence is that **the moment `EXPO_PUBLIC_SUPABASE_URL` and
 * `EXPO_PUBLIC_SUPABASE_ANON_KEY` appear in the Netlify site settings, the data
 * source of `getTournaments`, `getMatches`, `getReferees` and `clearCache`
 * changes for every user at once**, with no gradual rollout and no way back
 * except deleting the variables and redeploying.
 *
 * This module decouples the two: configuration is a *precondition*, the flag is
 * the *decision*, and the decision is taken **per read domain**.
 *
 * ## Where the flag lives, and why
 *
 * Resolution order, highest precedence first:
 *
 * | # | Layer | Set by | Survives reload | Needs a deploy |
 * |---|---|---|---|---|
 * | 1 | Runtime kill switch | `markDbUnavailable()` — set by the code itself when the client cannot be built or the DB misbehaves | no | no |
 * | 2 | URL query parameter `?dbReads=` | anyone with the link | yes (it is persisted into layer 3) | no |
 * | 3 | Persisted local override | `setDbReadOverride()`, the console handle, or layer 2 | yes | no |
 * | 4 | Environment default `EXPO_PUBLIC_DB_READS` | Netlify site settings | yes | **yes** |
 * | 5 | Built-in default: **nothing enabled** | — | — | — |
 *
 * An environment variable alone cannot satisfy AC6 ("rollback without removing
 * variables and without redeploying"): changing a Netlify variable *is* a
 * redeploy. So the env var is only the **floor**, and layers 2-3 can always
 * override it in both directions, instantly, from the browser:
 *
 * ```
 * https://beachrefs.netlify.app/?dbReads=off          # rollback, persisted
 * https://beachrefs.netlify.app/?dbReads=tournaments  # enable one domain
 * https://beachrefs.netlify.app/?dbReads=all          # enable everything
 * ```
 *
 * or, from the devtools console:
 *
 * ```js
 * __beachrefDbReads.off()                  // rollback
 * __beachrefDbReads.set(['tournaments'])   // one domain
 * __beachrefDbReads.describe()             // why is it on/off?
 * ```
 *
 * **Honest limitation.** Layers 2 and 3 are per-browser. A *fleet-wide*
 * rollback of an env-var-driven activation still needs the variable changed and
 * a redeploy. The operational consequence, and it is deliberate: **phase 3 must
 * roll out through layer 2/3 (opt-in per tester), and `EXPO_PUBLIC_DB_READS`
 * must stay unset until a domain has been observed working.** A fleet-wide kill
 * switch would need a runtime config source (a remote JSON, a Supabase row);
 * that is new infrastructure and is intentionally not introduced here. What is
 * introduced is layer 1: the app disables itself automatically the moment the
 * database misbehaves, which covers the failure mode a human kill switch would
 * be racing against anyway.
 *
 * This module deliberately imports nothing. It is read on the hot path and must
 * not pull anything into the web entry chunk.
 */

/** The read domains that can be switched to the database independently. */
export type DbReadDomain = 'tournaments' | 'matches' | 'referees';

export const DB_READ_DOMAINS: readonly DbReadDomain[] = [
  'tournaments',
  'matches',
  'referees',
] as const;

/** Storage key for the persisted override (layer 3). */
export const DB_READ_OVERRIDE_STORAGE_KEY = 'beachref.dbReads';

/** Query parameter that sets the override (layer 2). */
export const DB_READ_QUERY_PARAM = 'dbReads';

/** Environment variable holding the deployment-wide default (layer 4). */
export const DB_READ_ENV_VAR = 'EXPO_PUBLIC_DB_READS';

/**
 * How long a runtime kill switch stays armed before the domain is retried.
 * Short enough that a transient Supabase blip heals by itself, long enough that
 * a hard outage is not re-probed on every read.
 */
export const DB_UNAVAILABLE_COOLDOWN_MS = 60_000;

export interface DbReadFlagResolution {
  /** Domains that are actually enabled right now. */
  readonly enabled: DbReadDomain[];
  /** Which layer decided the outcome. */
  readonly source: 'kill-switch' | 'query-param' | 'local-override' | 'env' | 'default';
  /** Raw value of each layer, for debugging. */
  readonly layers: {
    readonly killSwitch: { readonly disabledUntil: number | null; readonly reason: string | null };
    readonly localOverride: string | null;
    readonly env: string | null;
  };
}

interface MutableState {
  /** Cached parse of the persisted override; `undefined` means "not read yet". */
  localOverride: string | null | undefined;
  killSwitchUntil: number;
  killSwitchReason: string | null;
  queryParamApplied: boolean;
}

const state: MutableState = {
  localOverride: undefined,
  killSwitchUntil: 0,
  killSwitchReason: null,
  queryParamApplied: false,
};

/* ------------------------------------------------------------------ */
/* Parsing                                                             */
/* ------------------------------------------------------------------ */

function isDbReadDomain(value: string): value is DbReadDomain {
  return (DB_READ_DOMAINS as readonly string[]).includes(value);
}

/**
 * Parse a flag value into the set of enabled domains.
 *
 * Accepted: `off` / `none` / `false` / empty → nothing; `all` / `true` →
 * everything; otherwise a comma or space separated list of domain names.
 * Unknown names are ignored rather than throwing: a typo must never *enable*
 * something, and must never crash the read path either.
 */
export function parseDbReadDomains(raw: string | null | undefined): DbReadDomain[] {
  if (raw === null || raw === undefined) return [];

  const value = raw.trim().toLowerCase();
  if (value === '' || value === 'off' || value === 'none' || value === 'false' || value === '0') {
    return [];
  }
  if (value === 'all' || value === 'true' || value === '1' || value === '*') {
    return [...DB_READ_DOMAINS];
  }

  const parts = value.split(/[\s,;]+/).filter(Boolean);
  const out: DbReadDomain[] = [];
  for (const part of parts) {
    // Tolerate the singular form, which is what people type.
    const normalised = part.endsWith('s') ? part : `${part}s`;
    if (isDbReadDomain(normalised) && !out.includes(normalised)) {
      out.push(normalised);
    }
  }
  return out;
}

/* ------------------------------------------------------------------ */
/* Storage (layer 3) — synchronous, best effort, never throws          */
/* ------------------------------------------------------------------ */

function getWebStorage(): Storage | null {
  try {
    const storage = (globalThis as { localStorage?: Storage }).localStorage;
    if (!storage) return null;
    // Safari private mode throws on write, not on access.
    return storage;
  } catch {
    return null;
  }
}

function readPersistedOverride(): string | null {
  const storage = getWebStorage();
  if (!storage) return null;
  try {
    return storage.getItem(DB_READ_OVERRIDE_STORAGE_KEY);
  } catch {
    return null;
  }
}

function writePersistedOverride(value: string | null): void {
  const storage = getWebStorage();
  if (!storage) return;
  try {
    if (value === null) {
      storage.removeItem(DB_READ_OVERRIDE_STORAGE_KEY);
    } else {
      storage.setItem(DB_READ_OVERRIDE_STORAGE_KEY, value);
    }
  } catch {
    /* private mode, quota, native platform without localStorage — ignore */
  }
}

/* ------------------------------------------------------------------ */
/* Query parameter (layer 2)                                           */
/* ------------------------------------------------------------------ */

function applyQueryParamOnce(): void {
  if (state.queryParamApplied) return;
  state.queryParamApplied = true;

  let search: string | null = null;
  try {
    const location = (globalThis as { location?: { search?: string } }).location;
    search = location?.search ?? null;
  } catch {
    search = null;
  }
  if (!search) return;

  let raw: string | null = null;
  try {
    raw = new URLSearchParams(search).get(DB_READ_QUERY_PARAM);
  } catch {
    raw = null;
  }
  if (raw === null) return;

  // The query parameter is written through to the persisted layer so that a
  // reload, or a navigation that drops the query string, keeps the decision.
  const domains = parseDbReadDomains(raw);
  state.localOverride = domains.length > 0 ? domains.join(',') : 'off';
  writePersistedOverride(state.localOverride);
}

/* ------------------------------------------------------------------ */
/* Public API                                                          */
/* ------------------------------------------------------------------ */

/** Full resolution, with the reason. Used by tests, by the console handle and by logs. */
export function describeDbReadFlags(): DbReadFlagResolution {
  applyQueryParamOnce();

  if (state.localOverride === undefined) {
    state.localOverride = readPersistedOverride();
  }

  const env = process.env[DB_READ_ENV_VAR] ?? null;
  const killSwitchActive = state.killSwitchUntil > Date.now();

  const layers = {
    killSwitch: {
      disabledUntil: killSwitchActive ? state.killSwitchUntil : null,
      reason: killSwitchActive ? state.killSwitchReason : null,
    },
    localOverride: state.localOverride,
    env,
  } as const;

  if (killSwitchActive) {
    return { enabled: [], source: 'kill-switch', layers };
  }

  if (state.localOverride !== null) {
    return {
      enabled: parseDbReadDomains(state.localOverride),
      source: 'local-override',
      layers,
    };
  }

  if (env !== null && env.trim() !== '') {
    return { enabled: parseDbReadDomains(env), source: 'env', layers };
  }

  return { enabled: [], source: 'default', layers };
}

/** Domains currently reading from the database. */
export function getEnabledDbReadDomains(): DbReadDomain[] {
  return describeDbReadFlags().enabled;
}

/**
 * The single question every DB read path must ask.
 *
 * Returns `false` unless someone explicitly asked for this domain. Note that
 * "Supabase is configured" is *not* consulted here on purpose: configuration is
 * checked separately, at the point where the client is built, so that a
 * configured-but-flagged-off deployment behaves exactly like today.
 */
export function isDbReadEnabled(domain: DbReadDomain): boolean {
  return getEnabledDbReadDomains().includes(domain);
}

/**
 * Set (or clear) the persisted override — the instant rollback of AC6.
 *
 * - `setDbReadOverride('off')` → nothing reads from the DB, whatever the env says.
 * - `setDbReadOverride(['tournaments'])` → only tournaments.
 * - `setDbReadOverride(null)` → forget the override, fall back to the env default.
 */
export function setDbReadOverride(value: DbReadDomain[] | 'off' | 'all' | null): void {
  if (value === null) {
    state.localOverride = null;
    writePersistedOverride(null);
    return;
  }
  const serialised =
    value === 'off' ? 'off' : value === 'all' ? 'all' : value.length > 0 ? value.join(',') : 'off';
  state.localOverride = serialised;
  writePersistedOverride(serialised);
}

/**
 * Arm the runtime kill switch (layer 1) — AC7.
 *
 * Called by the read path when the Supabase client cannot even be built
 * (`supabaseUrl is required.`), when a DB query times out, or when it fails.
 * Everything falls back to the VIS API path for the cooldown, then one probe is
 * allowed through. This is what makes the fallback *automatic* rather than
 * something an operator has to notice and trigger.
 */
export function markDbUnavailable(reason: string, cooldownMs: number = DB_UNAVAILABLE_COOLDOWN_MS): void {
  state.killSwitchUntil = Date.now() + cooldownMs;
  state.killSwitchReason = reason;
  if (typeof __DEV__ !== 'undefined' && __DEV__) {
    console.warn(
      `[DbReadFlags] database reads disabled for ${Math.round(cooldownMs / 1000)}s: ${reason}`
    );
  }
}

/** Clear the runtime kill switch (a successful read does this). */
export function clearDbUnavailable(): void {
  state.killSwitchUntil = 0;
  state.killSwitchReason = null;
}

/** Is the runtime kill switch currently armed? */
export function isDbMarkedUnavailable(): boolean {
  return state.killSwitchUntil > Date.now();
}

/**
 * Reset every layer of in-memory state. Tests only — the persisted value is
 * left alone unless `clearPersisted` is passed.
 */
export function resetDbReadFlagsForTests(clearPersisted = true): void {
  state.localOverride = undefined;
  state.killSwitchUntil = 0;
  state.killSwitchReason = null;
  state.queryParamApplied = false;
  if (clearPersisted) writePersistedOverride(null);
}

/* ------------------------------------------------------------------ */
/* Console handle — the rollback path a human actually uses            */
/* ------------------------------------------------------------------ */

interface DbReadConsoleHandle {
  get(): DbReadDomain[];
  set(value: DbReadDomain[] | 'off' | 'all' | null): DbReadFlagResolution;
  off(): DbReadFlagResolution;
  describe(): DbReadFlagResolution;
}

const consoleHandle: DbReadConsoleHandle = {
  get: getEnabledDbReadDomains,
  set: (value) => {
    setDbReadOverride(value);
    return describeDbReadFlags();
  },
  off: () => {
    setDbReadOverride('off');
    return describeDbReadFlags();
  },
  describe: describeDbReadFlags,
};

try {
  (globalThis as { __beachrefDbReads?: DbReadConsoleHandle }).__beachrefDbReads = consoleHandle;
} catch {
  /* frozen global, SSR — the flag still works, only the console handle is missing */
}
