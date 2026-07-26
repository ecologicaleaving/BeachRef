/**
 * Issue #54, phase 1 (AC1/AC2) — what can the *public* anon key actually do?
 *
 * `EXPO_PUBLIC_SUPABASE_ANON_KEY` is an `EXPO_PUBLIC_*` variable: once it is
 * set on Netlify it is inlined into the JavaScript bundle and readable by
 * anyone who opens devtools. That is how the anon key is designed to work — but
 * only if the RLS policies hold. This script is the check, run **with the anon
 * key and nothing else**, against the real project.
 *
 * ## Running it
 *
 * ```bash
 * export SUPABASE_URL='https://<project>.supabase.co'
 * export SUPABASE_ANON_KEY='<the anon key, never the service_role key>'
 * npm run verify:rls
 * ```
 *
 * `EXPO_PUBLIC_SUPABASE_URL` / `EXPO_PUBLIC_SUPABASE_ANON_KEY` are accepted as
 * fallbacks. Nothing is read from a file and no credential is committed: the
 * script refuses to run without the key rather than defaulting to one.
 *
 * ## Safety
 *
 * - It **refuses to run with a `service_role` key** (checked by decoding the
 *   JWT `role` claim). Running the audit with privileged credentials would
 *   report that everything is writable and prove nothing.
 * - It never persists anything:
 *   - **read**: `select ... limit 1`;
 *   - **insert**: `insert({})` — an empty row. If RLS denies it, Postgres
 *     answers `42501`. If RLS *allows* it, the statement still fails on the
 *     NOT NULL constraints, so nothing is written — but the different error
 *     code tells us the policy let it through, which is exactly what we need
 *     to know;
 *   - **update / delete**: filtered on an id that cannot exist, so zero rows
 *     are ever matched. Denied → `42501`; allowed → success, 0 rows.
 *
 * ## Output
 *
 * A Markdown table (table × read/insert/update/delete) for pasting into the PR,
 * as AC1 requires. Exit code 1 if anything is writable by anon or if a table
 * that should not be public is readable — AC2's gate.
 */

import { createClient, PostgrestError, SupabaseClient } from '@supabase/supabase-js';

/* ------------------------------------------------------------------ */
/* What we probe                                                       */
/* ------------------------------------------------------------------ */

type Expectation = 'public-read' | 'private';

interface TableSpec {
  readonly table: string;
  /**
   * `public-read` — the web app needs to read this with the anon key.
   * `private`     — nothing outside the service role should see it; a readable
   *                 one is an AC2 stop-the-line finding.
   */
  readonly expectation: Expectation;
  readonly note?: string;
}

/**
 * Every table created by `supabase/migrations/**`. The expectation column is
 * the *claim* being tested, taken from the migrations that declare the
 * policies; the script's job is to find out whether production agrees.
 */
const TABLES: readonly TableSpec[] = [
  // Data the web app reads (the three domains of the issue #54 flag).
  { table: 'tournaments', expectation: 'public-read' },
  { table: 'events', expectation: 'public-read' },
  { table: 'matches', expectation: 'public-read' },
  { table: 'referees', expectation: 'public-read', note: 'personal data — check which columns come back' },
  { table: 'match_referees', expectation: 'public-read' },
  { table: 'match_events', expectation: 'public-read' },

  // Analytics.
  { table: 'referee_analytics', expectation: 'private' },
  { table: 'analytics_events', expectation: 'private' },

  // Notifications — device tokens and preferences.
  { table: 'push_notification_tokens', expectation: 'private', note: 'device tokens' },
  { table: 'notification_preferences', expectation: 'private' },
  { table: 'notification_logs', expectation: 'private' },

  // Sync / operational tables.
  { table: 'sync_status', expectation: 'private' },
  { table: 'sync_execution_history', expectation: 'private' },
  { table: 'sync_tournament_results', expectation: 'private' },
  { table: 'sync_error_log', expectation: 'private', note: 'error payloads can leak internals' },
  { table: 'sync_performance_logs', expectation: 'private' },
  { table: 'manual_sync_audit', expectation: 'private' },
  { table: 'alert_rules', expectation: 'private' },

  // Schema bookkeeping and backups — nothing outside the service role.
  { table: 'schema_versions', expectation: 'private' },
  { table: 'schema_backup_info', expectation: 'private' },
  { table: 'tournaments_backup', expectation: 'private' },
  { table: 'matches_backup', expectation: 'private' },
  { table: 'tournaments_timezone_backup', expectation: 'private' },
  { table: 'matches_timezone_backup', expectation: 'private' },
  { table: 'sync_status_legacy_backup', expectation: 'private' },
] as const;

/** An id no row can have, so update/delete probes always match zero rows. */
const IMPOSSIBLE_ID = '00000000-0000-0000-0000-000000000000';

/* ------------------------------------------------------------------ */
/* Verdicts                                                            */
/* ------------------------------------------------------------------ */

type Verdict = 'allowed' | 'denied' | 'missing' | 'unknown';

interface Probe {
  readonly verdict: Verdict;
  readonly detail: string;
}

/** PostgREST/Postgres codes that unambiguously mean "RLS said no". */
const DENIED_CODES = new Set(['42501', 'PGRST301', 'PGRST116']);
/** Codes that mean the statement got *past* RLS and died on the data itself. */
const CONSTRAINT_CODES = new Set(['23502', '23503', '23505', '23514', '22P02', '42703']);
/** Relation does not exist. */
const MISSING_CODES = new Set(['42P01', 'PGRST205']);

function classifyWrite(error: PostgrestError | null): Probe {
  if (!error) return { verdict: 'allowed', detail: 'statement accepted' };
  const code = error.code ?? '';
  if (MISSING_CODES.has(code)) return { verdict: 'missing', detail: 'relation does not exist' };
  if (DENIED_CODES.has(code) || /row-level security/i.test(error.message)) {
    return { verdict: 'denied', detail: `${code || 'RLS'}: ${error.message}` };
  }
  if (CONSTRAINT_CODES.has(code)) {
    return { verdict: 'allowed', detail: `passed RLS, blocked by a constraint (${code})` };
  }
  return { verdict: 'unknown', detail: `${code || '?'}: ${error.message}` };
}

async function probeRead(client: SupabaseClient, table: string): Promise<Probe & { columns?: string[] }> {
  const { data, error } = await client.from(table).select('*').limit(1);
  if (error) {
    const code = error.code ?? '';
    if (MISSING_CODES.has(code)) return { verdict: 'missing', detail: 'relation does not exist' };
    if (DENIED_CODES.has(code) || /permission denied/i.test(error.message)) {
      return { verdict: 'denied', detail: `${code || 'RLS'}: ${error.message}` };
    }
    return { verdict: 'unknown', detail: `${code || '?'}: ${error.message}` };
  }
  const columns = data && data.length > 0 ? Object.keys(data[0] as object) : [];
  return {
    verdict: 'allowed',
    detail: data && data.length > 0 ? `${columns.length} columns visible` : 'readable, no rows returned',
    columns,
  };
}

async function probeInsert(client: SupabaseClient, table: string): Promise<Probe> {
  const { error } = await client.from(table).insert({} as never);
  return classifyWrite(error);
}

async function probeUpdate(client: SupabaseClient, table: string): Promise<Probe> {
  // Zero rows can match, so a permitted UPDATE changes nothing.
  const { error } = await client
    .from(table)
    .update({ id: IMPOSSIBLE_ID } as never)
    .eq('id', IMPOSSIBLE_ID);
  return classifyWrite(error);
}

async function probeDelete(client: SupabaseClient, table: string): Promise<Probe> {
  const { error } = await client.from(table).delete().eq('id', IMPOSSIBLE_ID);
  return classifyWrite(error);
}

/* ------------------------------------------------------------------ */
/* Key handling                                                        */
/* ------------------------------------------------------------------ */

function decodeJwtRole(token: string): string | null {
  const parts = token.split('.');
  const claims = parts.length === 3 ? parts[1] : undefined;
  if (!claims) return null;
  try {
    const payload = JSON.parse(Buffer.from(claims, 'base64url').toString('utf8'));
    return typeof payload.role === 'string' ? payload.role : null;
  } catch {
    return null;
  }
}

/** Thrown by `fail()`; unwinds to `main().catch` without an extra stack trace. */
class SilentExit extends Error {}

/**
 * Abort with exit code 2 — "the verification did not happen", as distinct from
 * exit 1, "the verification happened and found a problem".
 *
 * `process.exitCode` rather than `process.exit()`: an immediate exit tears down
 * libuv handles that the Supabase fetch still owns, which on Windows aborts the
 * process with `Assertion failed: !(handle->flags & UV_HANDLE_CLOSING)` and
 * makes a clean refusal look like a crash.
 */
function fail(message: string): never {
  console.error(`\n❌ ${message}\n`);
  process.exitCode = 2;
  throw new SilentExit(message);
}

/* ------------------------------------------------------------------ */
/* Report                                                              */
/* ------------------------------------------------------------------ */

const SYMBOL: Record<Verdict, string> = {
  allowed: 'YES',
  denied: 'no',
  missing: '—',
  unknown: '?',
};

interface Row {
  readonly spec: TableSpec;
  readonly read: Probe & { columns?: string[] };
  readonly insert: Probe;
  readonly update: Probe;
  readonly delete: Probe;
}

function renderTable(rows: readonly Row[]): string {
  const lines = [
    '| Table | Expected | Read | Insert | Update | Delete | Notes |',
    '|---|---|---|---|---|---|---|',
  ];
  for (const row of rows) {
    const notes = [row.spec.note, row.read.columns?.length ? `${row.read.columns.length} cols` : null]
      .filter(Boolean)
      .join('; ');
    lines.push(
      `| \`${row.spec.table}\` | ${row.spec.expectation} | ${SYMBOL[row.read.verdict]} | ` +
        `${SYMBOL[row.insert.verdict]} | ${SYMBOL[row.update.verdict]} | ${SYMBOL[row.delete.verdict]} | ${notes} |`
    );
  }
  return lines.join('\n');
}

async function main(): Promise<void> {
  const url = process.env.SUPABASE_URL || process.env.EXPO_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.SUPABASE_ANON_KEY || process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

  if (!url) {
    fail(
      'SUPABASE_URL is not set.\n\n' +
        "   export SUPABASE_URL='https://<project>.supabase.co'\n" +
        "   export SUPABASE_ANON_KEY='<anon key>'\n" +
        '   npm run verify:rls'
    );
  }
  if (!anonKey) {
    fail(
      'SUPABASE_ANON_KEY is not set.\n\n' +
        '   This script exists precisely to test what the *public* key can do, so it\n' +
        '   will not run without one and will never fall back to a committed value.\n\n' +
        "   export SUPABASE_ANON_KEY='<anon key from Supabase → Settings → API>'"
    );
  }

  const role = decodeJwtRole(anonKey);
  if (role && role !== 'anon') {
    fail(
      `the supplied key has role "${role}", not "anon".\n\n` +
        '   Auditing RLS with a privileged key proves nothing: it would report that\n' +
        '   everything is readable and writable because it genuinely is, for that key.\n' +
        '   Use the anon key. Never put a service_role key in this environment.'
    );
  }
  if (!role) {
    console.warn('⚠️  could not decode the key\'s role claim; continuing, but check it is the anon key.');
  }

  console.log(`\nProbing ${url} with the anon key (${TABLES.length} tables)\n`);

  const client = createClient(url, anonKey, { auth: { persistSession: false } });

  // Preflight. A rejected key answers "Invalid API key" to every probe, which
  // would otherwise be classified as `unknown` 100 times over and — worse —
  // reported as "nothing is writable". A run that proves nothing must not look
  // like a run that passed.
  const preflightTable = TABLES[0]?.table ?? 'tournaments';
  const preflight = await client.from(preflightTable).select('*').limit(1);
  if (preflight.error && /invalid api key|jwt|not authorized/i.test(preflight.error.message)) {
    fail(
      `the project rejected the key: "${preflight.error.message}".\n\n` +
        '   Check that SUPABASE_ANON_KEY belongs to the project at SUPABASE_URL.\n' +
        '   Nothing was verified.'
    );
  }

  const rows: Row[] = [];

  for (const spec of TABLES) {
    const read = await probeRead(client, spec.table);
    const [insert, update, del] = await Promise.all([
      probeInsert(client, spec.table),
      probeUpdate(client, spec.table),
      probeDelete(client, spec.table),
    ]);
    rows.push({ spec, read, insert, update, delete: del });
    process.stdout.write(
      `  ${spec.table.padEnd(30)} read=${SYMBOL[read.verdict]} ` +
        `insert=${SYMBOL[insert.verdict]} update=${SYMBOL[update.verdict]} delete=${SYMBOL[del.verdict]}\n`
    );
  }

  console.log('\n## RLS verification with the anon key (issue #54, AC1)\n');
  console.log(renderTable(rows));

  const writable = rows.filter(
    r => r.insert.verdict === 'allowed' || r.update.verdict === 'allowed' || r.delete.verdict === 'allowed'
  );
  const leaking = rows.filter(r => r.spec.expectation === 'private' && r.read.verdict === 'allowed');
  const unknown = rows.filter(r =>
    [r.read, r.insert, r.update, r.delete].some(p => p.verdict === 'unknown')
  );

  console.log('\n### Findings\n');
  if (writable.length > 0) {
    console.log(`- ❌ **${writable.length} table(s) are writable by the anon key**:`);
    for (const r of writable) {
      const ops = [
        r.insert.verdict === 'allowed' ? `insert (${r.insert.detail})` : null,
        r.update.verdict === 'allowed' ? `update (${r.update.detail})` : null,
        r.delete.verdict === 'allowed' ? `delete (${r.delete.detail})` : null,
      ].filter(Boolean);
      console.log(`  - \`${r.spec.table}\`: ${ops.join(', ')}`);
    }
  } else {
    console.log('- ✅ no table accepts writes from the anon key');
  }

  if (leaking.length > 0) {
    console.log(`- ❌ **${leaking.length} table(s) expected to be private are readable**:`);
    for (const r of leaking) {
      console.log(`  - \`${r.spec.table}\`: ${r.read.detail}${r.spec.note ? ` — ${r.spec.note}` : ''}`);
    }
  } else {
    console.log('- ✅ no table expected to be private is readable by the anon key');
  }

  if (unknown.length > 0) {
    console.log(`- ⚠️ ${unknown.length} table(s) produced an unclassified result — read the detail and decide:`);
    for (const r of unknown) {
      for (const [op, probe] of [
        ['read', r.read],
        ['insert', r.insert],
        ['update', r.update],
        ['delete', r.delete],
      ] as const) {
        if (probe.verdict === 'unknown') console.log(`  - \`${r.spec.table}\` ${op}: ${probe.detail}`);
      }
    }
  }

  // `unknown` blocks too. An unclassified probe means this script does not know
  // what the database allowed, and "we could not tell" is not "it is safe".
  const blocking = writable.length + leaking.length + unknown.length;
  if (blocking > 0) {
    console.log(
      '\n**AC2 gate: FAILED.** Do not configure the Supabase variables on Netlify.\n' +
        'Open a hardening issue for the findings above and stop here.\n'
    );
    process.exitCode = 1;
    return;
  }

  console.log('\n**AC2 gate: PASSED** for the tables probed above.\n');
}

main().catch(error => {
  if (error instanceof SilentExit) return;
  console.error('\n❌ the verification could not complete:', error);
  process.exitCode = 2;
});
