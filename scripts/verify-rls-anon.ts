/**
 * What can the *public* anon key actually do against the project?
 *
 * `EXPO_PUBLIC_SUPABASE_ANON_KEY` is an `EXPO_PUBLIC_*` variable: once it is
 * set on Netlify it is inlined into the JavaScript bundle and readable by
 * anyone who opens devtools. That is how the anon key is designed to work — but
 * only if the database says no. This script is the check, run **with the anon
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
 * ## What it demands (issue #77)
 *
 * The database is deny-all for `anon` and `authenticated` — see
 * `supabase/migrations/017_deny_all_public_api_roles.sql` and `supabase/RLS.md`.
 * So the bar here is not "no row came back". It is **an explicit refusal**:
 * every probe must fail with `42501 permission denied`. Anything softer is
 * reported as *inconclusive* and fails the run.
 *
 * That distinction is the whole point of this rewrite. The previous version
 * could not tell a refusal from an empty table, and got it wrong in both
 * directions at once:
 *
 * - **SELECT**: a policy that denies a row does not raise, it removes the row.
 *   `readable, no rows returned` therefore established nothing — and seven of
 *   the twelve "leaking" tables reported by issue #77 were in exactly that
 *   state.
 * - **UPDATE / DELETE**: RLS filters the rows a statement may touch; it does
 *   not reject the statement. The old probe filtered on an id that cannot
 *   exist, so *zero rows matched* and the statement always succeeded —
 *   producing "17 tables are writable" from tables that had no write policy at
 *   all.
 * - **INSERT** was the one honest probe: `WITH CHECK` is evaluated before the
 *   NOT NULL constraints, so `42501` means denied while `23502` means the
 *   policy let the row through.
 *
 * All three claims are pinned by `supabase/tests/rls_deny_all.test.sql`
 * (assertions A2–A5), which runs them against a real PostgreSQL.
 *
 * A verification that cannot fail honestly is worse than none, because it gets
 * quoted. Under deny-all every refusal is an explicit privilege error, raised
 * before any row is considered — which is what finally makes this script able
 * to say something true.
 *
 * ## Safety
 *
 * - It **refuses to run with a `service_role` key** (checked by decoding the
 *   JWT `role` claim). Auditing with privileged credentials would report that
 *   everything is writable and prove nothing.
 * - It never persists anything:
 *   - **read**: `select … limit 1`;
 *   - **insert**: `insert({})` — an empty row, rejected either by the privilege
 *     gate, by RLS, or by the NOT NULL constraints;
 *   - **update / delete**: filtered with `<primary key> IS NULL`, which is
 *     false for every row of every table by definition, so nothing can ever
 *     match. The primary key is named per table below rather than assumed to be
 *     `id`: assuming it is what produced the two unexplained `PGRST204` results
 *     in issue #77 — `sync_status` and `schema_versions` are keyed on
 *     `entity_type` and `version`, and have no `id` column at all.
 *
 * ## Output
 *
 * A Markdown table for pasting into a PR. Exit 1 if any probe is not an
 * explicit denial, or if a deliberately opened table exposes a column nobody
 * declared; exit 2 if the verification could not be performed at all.
 */

import { createClient, PostgrestError, SupabaseClient } from '@supabase/supabase-js';

/* ------------------------------------------------------------------ */
/* What we probe                                                       */
/* ------------------------------------------------------------------ */

interface TableSpec {
  readonly table: string;
  /**
   * The primary key, used only to build a filter that can never match a row.
   * Must be NOT NULL — every primary key is.
   */
  readonly primaryKey: string;
  /**
   * Columns the anon key is *deliberately* allowed to read, as decided in a
   * migration. `undefined` means the table is closed — which is the state of
   * the entire project today, because nothing consumes this database through
   * the public API. Opening one means writing the migration, naming the
   * consumer, and listing its columns here; see `supabase/RLS.md`.
   */
  readonly publicColumns?: readonly string[];
  readonly note?: string;
}

/**
 * Every table created by `supabase/migrations/**`. Primary keys are taken from
 * the migration production actually reflects, and noted where the migration
 * folder disagrees with itself.
 */
const TABLES: readonly TableSpec[] = [
  { table: 'tournaments', primaryKey: 'id' },
  { table: 'events', primaryKey: 'id' },
  { table: 'matches', primaryKey: 'id' },
  { table: 'referees', primaryKey: 'id', note: 'personal data' },
  // `match_referees` non ha una colonna `id`: la sua chiave primaria e'
  // composta, `(match_id, role)` — vedi migration 018 (issue #89), che l'ha
  // ricreata sui tipi che il database ha davvero dopo che la 013 l'aveva
  // lasciata cadere.
  //
  // Dichiararla `id` non produceva un falso "sicuro" ma un INCONCLUSIVO
  // (`42703: column match_referees.id does not exist`), che questo script
  // tratta come fallimento — ed e' la ragione per cui il gate era rosso su un
  // database in cui tutto e' effettivamente chiuso. "Non ho potuto stabilirlo"
  // non e' "e' sicuro": e' la lezione della issue #77.
  { table: 'match_referees', primaryKey: 'match_id' },
  { table: 'match_events', primaryKey: 'id' },

  // Analytics.
  { table: 'referee_analytics', primaryKey: 'id' },
  { table: 'analytics_events', primaryKey: 'id' },

  // Notifications — device tokens and preferences.
  { table: 'push_notification_tokens', primaryKey: 'id', note: 'device tokens' },
  { table: 'notification_preferences', primaryKey: 'id' },
  { table: 'notification_logs', primaryKey: 'id' },

  // Sync / operational tables.
  // `sync_status` is keyed on `entity_type` (migrations 002 / 002.5). Migrations
  // 009 and 010 both redeclare it with an `id bigint`; production kept the older
  // shape, which is why an `id` filter came back as PGRST204.
  { table: 'sync_status', primaryKey: 'entity_type' },

  // La coda del backfill (migration 019, issue #90). Tabelle puramente
  // operative: nessun client deve vederle, mai. Sono qui perche' una tabella
  // nuova che nessuno sonda e' esattamente il modo in cui questo database e'
  // arrivato allo stato che la issue #77 documenta.
  { table: 'sync_backlog', primaryKey: 'event_no' },
  { table: 'sync_backlog_config', primaryKey: 'id' },

  { table: 'sync_execution_history', primaryKey: 'id' },
  { table: 'sync_tournament_results', primaryKey: 'id' },
  { table: 'sync_error_log', primaryKey: 'id', note: 'error payloads can leak internals' },
  { table: 'sync_performance_logs', primaryKey: 'id' },
  { table: 'manual_sync_audit', primaryKey: 'id' },
  { table: 'alert_rules', primaryKey: 'id' },

  // Schema bookkeeping and backups — nothing outside the service role.
  { table: 'schema_versions', primaryKey: 'version' },
  { table: 'schema_backup_info', primaryKey: 'id' },
  { table: 'tournaments_backup', primaryKey: 'id' },
  { table: 'matches_backup', primaryKey: 'id' },
  { table: 'tournaments_timezone_backup', primaryKey: 'id' },
  { table: 'matches_timezone_backup', primaryKey: 'id' },
  { table: 'sync_status_legacy_backup', primaryKey: 'entity_type' },
] as const;

/* ------------------------------------------------------------------ */
/* Verdicts                                                            */
/* ------------------------------------------------------------------ */

type Verdict =
  /** The database refused, explicitly. The only passing verdict. */
  | 'denied'
  /** The database let it through. A finding. */
  | 'allowed'
  /** The relation does not exist. */
  | 'missing'
  /**
   * The probe could not establish what the database would have allowed — an
   * empty result set, a zero-row write, or an error about the probe itself.
   * Treated as a failure: "we could not tell" is not "it is safe".
   */
  | 'inconclusive';

interface Probe {
  readonly verdict: Verdict;
  readonly detail: string;
  readonly columns?: readonly string[];
}

/** Codes that unambiguously mean "the database refused". */
const DENIED_CODES = new Set(['42501', 'PGRST301']);
/** Relation does not exist / is not exposed. */
const MISSING_CODES = new Set(['42P01', 'PGRST205']);

function isDenial(error: PostgrestError): boolean {
  const code = error.code ?? '';
  return (
    DENIED_CODES.has(code) ||
    /permission denied/i.test(error.message) ||
    /row-level security/i.test(error.message)
  );
}

function classify(error: PostgrestError | null, onSuccess: Probe): Probe {
  if (!error) return onSuccess;
  const code = error.code ?? '';
  if (MISSING_CODES.has(code)) return { verdict: 'missing', detail: 'relation does not exist' };
  if (isDenial(error)) return { verdict: 'denied', detail: `${code || 'RLS'}: ${error.message}` };
  // Anything else — a constraint, an unknown column, a schema-cache miss — tells
  // us about the probe, not about the policy.
  return { verdict: 'inconclusive', detail: `${code || '?'}: ${error.message}` };
}

async function probeRead(client: SupabaseClient, spec: TableSpec): Promise<Probe> {
  const { data, error } = await client.from(spec.table).select('*').limit(1);
  if (error) return classify(error, { verdict: 'allowed', detail: 'unreachable' });

  if (!data || data.length === 0) {
    // Not a pass. RLS removes rows rather than raising, so an empty result is
    // what a denial and an empty table both look like from here.
    return {
      verdict: 'inconclusive',
      detail: 'the select succeeded and returned no row — a denial and an empty table look identical',
    };
  }
  const columns = Object.keys(data[0] as object);
  return { verdict: 'allowed', detail: `${columns.length} columns readable`, columns };
}

/**
 * Table constraints that only get a chance to fire once the row has been
 * admitted. `WITH CHECK` is evaluated *before* them — pinned by assertion A5 of
 * `supabase/tests/rls_deny_all.test.sql` — so reaching one of these is positive
 * evidence that the write was permitted, not merely an inconclusive probe.
 */
const CONSTRAINT_CODES = new Set(['23502', '23503', '23505', '23514']);

async function probeInsert(client: SupabaseClient, spec: TableSpec): Promise<Probe> {
  const { error } = await client.from(spec.table).insert({} as never);
  if (error && CONSTRAINT_CODES.has(error.code ?? '')) {
    return {
      verdict: 'allowed',
      detail: `the row passed the policy and was stopped by a table constraint (${error.code})`,
    };
  }
  return classify(error, { verdict: 'allowed', detail: 'the insert was accepted' });
}

/** `<primary key> IS NULL` is false for every row of every table. */
async function probeUpdate(client: SupabaseClient, spec: TableSpec): Promise<Probe> {
  const { error } = await client
    .from(spec.table)
    .update({ [spec.primaryKey]: null } as never)
    .is(spec.primaryKey, null);
  return classify(error, {
    verdict: 'inconclusive',
    detail: 'the update succeeded against zero rows — RLS filters rows, it does not refuse',
  });
}

async function probeDelete(client: SupabaseClient, spec: TableSpec): Promise<Probe> {
  const { error } = await client.from(spec.table).delete().is(spec.primaryKey, null);
  return classify(error, {
    verdict: 'inconclusive',
    detail: 'the delete succeeded against zero rows — RLS filters rows, it does not refuse',
  });
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
  denied: 'denied',
  allowed: 'OPEN',
  missing: '—',
  inconclusive: '?',
};

interface Row {
  readonly spec: TableSpec;
  readonly read: Probe;
  readonly insert: Probe;
  readonly update: Probe;
  readonly delete: Probe;
}

function renderTable(rows: readonly Row[]): string {
  const lines = [
    '| Table | Declared | Read | Insert | Update | Delete | Notes |',
    '|---|---|---|---|---|---|---|',
  ];
  for (const row of rows) {
    const declared = row.spec.publicColumns ? `read: ${row.spec.publicColumns.join(', ')}` : 'closed';
    const notes = [row.spec.note, row.read.columns?.length ? `${row.read.columns.length} cols` : null]
      .filter(Boolean)
      .join('; ');
    lines.push(
      `| \`${row.spec.table}\` | ${declared} | ${SYMBOL[row.read.verdict]} | ` +
        `${SYMBOL[row.insert.verdict]} | ${SYMBOL[row.update.verdict]} | ${SYMBOL[row.delete.verdict]} | ${notes} |`
    );
  }
  return lines.join('\n');
}

/** Findings for one table, in the order they should be read. */
function findingsFor(row: Row): string[] {
  const out: string[] = [];
  const { spec } = row;

  for (const [op, probe] of [
    ['insert', row.insert],
    ['update', row.update],
    ['delete', row.delete],
  ] as const) {
    if (probe.verdict === 'allowed') {
      out.push(`\`${spec.table}\` accepts an anonymous **${op}** — ${probe.detail}`);
    } else if (probe.verdict === 'inconclusive') {
      out.push(`\`${spec.table}\` ${op}: not an explicit denial — ${probe.detail}`);
    }
  }

  if (row.read.verdict === 'allowed') {
    if (!spec.publicColumns) {
      out.push(
        `\`${spec.table}\` is **readable** by the public key and nothing declares it open — ` +
          `${row.read.detail}${spec.note ? ` (${spec.note})` : ''}`
      );
    } else {
      const extra = (row.read.columns ?? []).filter(c => !spec.publicColumns!.includes(c));
      if (extra.length > 0) {
        out.push(
          `\`${spec.table}\` exposes ${extra.length} column(s) beyond what was declared: ` +
            extra.map(c => `\`${c}\``).join(', ')
        );
      }
    }
  } else if (row.read.verdict === 'inconclusive') {
    out.push(`\`${spec.table}\` read: not an explicit denial — ${row.read.detail}`);
  } else if (row.read.verdict === 'denied' && spec.publicColumns) {
    out.push(`\`${spec.table}\` is declared readable but the database refused — ${row.read.detail}`);
  }

  return out;
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
        '   Auditing with a privileged key proves nothing: it would report that\n' +
        '   everything is readable and writable because it genuinely is, for that key.\n' +
        '   Use the anon key. Never put a service_role key in this environment.'
    );
  }
  if (!role) {
    console.warn("⚠️  could not decode the key's role claim; continuing, but check it is the anon key.");
  }

  console.log(`\nProbing ${url} with the anon key (${TABLES.length} tables)\n`);

  const client = createClient(url, anonKey, { auth: { persistSession: false } });

  // Preflight. A rejected key answers "Invalid API key" to every probe, which
  // would otherwise read as "nothing is reachable" — a run that proves nothing
  // must not look like a run that passed.
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
    const read = await probeRead(client, spec);
    const [insert, update, del] = await Promise.all([
      probeInsert(client, spec),
      probeUpdate(client, spec),
      probeDelete(client, spec),
    ]);
    rows.push({ spec, read, insert, update, delete: del });
    process.stdout.write(
      `  ${spec.table.padEnd(30)} read=${SYMBOL[read.verdict]} ` +
        `insert=${SYMBOL[insert.verdict]} update=${SYMBOL[update.verdict]} delete=${SYMBOL[del.verdict]}\n`
    );
  }

  // If every relation came back missing, the schema cache — not the policies —
  // is what answered. Passing on that would be the same mistake again.
  const existing = rows.filter(r => r.read.verdict !== 'missing');
  if (existing.length === 0) {
    fail(
      'every table came back as "relation does not exist".\n\n' +
        '   That is a schema-cache or project-mismatch answer, not a security result.\n' +
        '   Nothing was verified.'
    );
  }

  console.log('\n## What the public anon key can reach (issue #77)\n');
  console.log(renderTable(rows));

  const findings = rows.flatMap(findingsFor);

  console.log('\n### Findings\n');
  if (findings.length === 0) {
    console.log(
      `- ✅ every probe on the ${existing.length} existing table(s) was refused explicitly by the database`
    );
    console.log('- ✅ nothing is readable, insertable, updatable or deletable with the public key');
    console.log('\n**Gate: PASSED.**\n');
    return;
  }

  for (const finding of findings) console.log(`- ❌ ${finding}`);
  console.log(
    '\n**Gate: FAILED.** Do not configure the Supabase variables on Netlify.\n' +
      'Every line above is either an opening nobody declared, or a probe that could not\n' +
      'establish what the database would have allowed — see `supabase/RLS.md`.\n'
  );
  process.exitCode = 1;
}

main().catch(error => {
  if (error instanceof SilentExit) return;
  console.error('\n❌ the verification could not complete:', error);
  process.exitCode = 2;
});
