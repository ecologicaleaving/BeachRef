/**
 * AC6 of issue #67, frozen.
 *
 * A `VisApiClient` configured with any header outside the CORS safelist turns
 * every POST into a preflighted request, and the VIS answers its `OPTIONS`
 * without `Access-Control-Max-Age` — so the browser cannot cache the preflight
 * and re-runs it for each request. The cost is a permanent ×2 on VIS round
 * trips, and on a polling loop a ×2 per tick. See the doc comment on
 * `VisApiClientConfig.headers` (`types/api-v2.ts`) for the measurement.
 *
 * The pattern spread by copy-paste — 13 files at its peak, all of them
 * `headers: { 'X-FIVB-App-ID': ... }` copied verbatim from the one before. This
 * test is the barrier.
 *
 * **Why a test and not an ESLint rule.** `AUDIT_CONFIG.lintRoots` mirrors
 * `expo lint` and covers `src`, `app` and `components` only — every single one
 * of the offending sites lived in `services/` or `hooks/`, where no ESLint rule
 * runs today (CLAUDE.md, "Broaden the ESLint scope"). A lint rule would have
 * been a barrier that does not stand in front of the door. Jest walks whatever
 * we point it at, and `npm test` runs on both hooks and in CI.
 *
 * If a header ever becomes genuinely necessary, add it to `ALLOWED` below with
 * the evidence — that is the deliberate, reviewable choice the issue asks for.
 */

import * as fs from 'fs';
import * as path from 'path';

const PROJECT_ROOT = path.resolve(__dirname, '..');

/** Application source. Deno edge functions and one-off scripts are not it. */
const SCANNED_DIRS = ['app', 'components', 'hooks', 'screens', 'services', 'utils', 'lib'];

const EXEMPT_PREFIXES = ['__tests__/', '__mocks__/'];

const SOURCE_EXTENSIONS = new Set(['.ts', '.tsx']);

/**
 * Headers that may be sent to the VIS. Empty on purpose.
 *
 * `Content-Type: application/x-www-form-urlencoded` is set by `VisApiClient`
 * itself and is CORS-safelisted, so it never appears in a config object.
 *
 * `supabase/functions/contextual-vis-sync/index.ts` still sends
 * `X-FIVB-App-ID` and is deliberately not scanned: it is a Deno function
 * running server-side, where there is no browser and therefore no preflight.
 * The header is useless there too, but removing it buys nothing and touches a
 * separately deployed runtime.
 */
const ALLOWED: readonly string[] = [];

function* walk(dir: string): Generator<string> {
  if (!fs.existsSync(dir)) {
    return;
  }

  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      if (entry.name === 'node_modules' || entry.name === '__tests__' || entry.name === '__mocks__') {
        continue;
      }
      yield* walk(full);
      continue;
    }

    if (SOURCE_EXTENSIONS.has(path.extname(entry.name))) {
      yield full;
    }
  }
}

/**
 * A quoted header-looking key followed by `:` and a string value, i.e. an entry
 * of a headers object literal.
 *
 * Only applied inside a `new VisApiClient({ ... })` argument — Supabase and the
 * edge functions send `Authorization` and `x-client-info` legitimately, and
 * those requests are not the ones paying for the VIS preflight. Traffic that
 * reaches the VIS by any other route is already banned by
 * `no-direct-vis-fetch.test.ts`, so between the two tests every VIS request in
 * the app is covered.
 */
const HEADER_ENTRY = /['"`]((?:X-|x-)[A-Za-z0-9-]+|[Aa]uthorization|Cookie)['"`]\s*:\s*['"`]/g;

/** Any mention of the header this issue removed, wherever it appears. */
const BANNED_HEADER = /X-FIVB-App-ID/gi;

const CLIENT_CONSTRUCTION = /new\s+VisApiClient\s*\(/g;

/** Substring from `start` to the `)` that closes the call opened just before it. */
function callArguments(source: string, start: number): string {
  let depth = 1;
  for (let i = start; i < source.length; i++) {
    const c = source[i];
    if (c === '(' || c === '{' || c === '[') depth++;
    else if (c === ')' || c === '}' || c === ']') {
      depth--;
      if (depth === 0) return source.slice(start, i);
    }
  }
  return source.slice(start);
}

function stripComments(source: string): string {
  // CRLF first: `.` does not match `\r`, so on a Windows checkout a line-comment
  // regex anchored with `$` would silently match nothing.
  return source
    .replace(/\r\n/g, '\n')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .split('\n')
    .map(line => line.replace(/^\s*(\/\/|\*|\/\*).*$/, ''))
    .join('\n');
}

describe('no custom headers on VIS requests (issue #67, AC6)', () => {
  it('finds none', () => {
    const offenders: string[] = [];

    for (const dir of SCANNED_DIRS) {
      for (const file of walk(path.join(PROJECT_ROOT, dir))) {
        const relative = path.relative(PROJECT_ROOT, file).split(path.sep).join('/');

        if (EXEMPT_PREFIXES.some(prefix => relative.startsWith(prefix))) {
          continue;
        }

        const source = stripComments(fs.readFileSync(file, 'utf8'));

        if (BANNED_HEADER.test(source)) {
          BANNED_HEADER.lastIndex = 0;
          offenders.push(`${relative}: X-FIVB-App-ID`);
        }

        for (const construction of source.matchAll(CLIENT_CONSTRUCTION)) {
          const args = callArguments(source, construction.index + construction[0].length);

          for (const match of args.matchAll(HEADER_ENTRY)) {
            const header = match[1] as string;
            if (ALLOWED.some(allowed => allowed.toLowerCase() === header.toLowerCase())) {
              continue;
            }
            offenders.push(`${relative}: ${header}`);
          }
        }
      }
    }

    expect(offenders).toEqual([]);
  });

  it('would catch the pattern issue #67 removed', () => {
    // The exact shape that was copy-pasted into 13 files.
    const sample = stripComments(
      `const c = new VisApiClient({\n  enableLogging: false,\n  headers: {\n` +
        `    'X-Some-App-ID': 'abc'\n  }\n}, DEFAULT_RETRY_CONFIG);`
    );

    const construction = [...sample.matchAll(CLIENT_CONSTRUCTION)][0]!;
    const args = callArguments(sample, construction.index + construction[0].length);

    expect([...args.matchAll(HEADER_ENTRY)].map(m => m[1])).toEqual(['X-Some-App-ID']);
  });

  it('ignores headers that are not on a VIS client', () => {
    const sample = stripComments(
      `supabase.functions.invoke('x', { headers: { Authorization: 'Bearer t' } });`
    );

    expect([...sample.matchAll(CLIENT_CONSTRUCTION)]).toEqual([]);
  });
});
