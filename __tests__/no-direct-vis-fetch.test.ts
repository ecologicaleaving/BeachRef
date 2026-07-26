/**
 * AC1 of issue #47, frozen.
 *
 * `ApiAuditService` measures what goes through {@link VisApiClient}. A `fetch`
 * that names `fivb.org` directly is therefore traffic the audit cannot see, on
 * top of skipping retry, the circuit breaker and every cache. Issues #46 and #47
 * removed the last 23 of them; this test is what stops the 24th.
 *
 * Only `services/api/` may address the VIS host — that is where the client
 * lives. Everything else asks the client.
 */

import * as fs from 'fs';
import * as path from 'path';

const PROJECT_ROOT = path.resolve(__dirname, '..');

/** Application source. Deno edge functions and one-off scripts are not it. */
const SCANNED_DIRS = ['app', 'components', 'hooks', 'screens', 'services', 'utils', 'lib'];

/** `services/api` owns the VIS endpoint; tests and fixtures quote it on purpose. */
const EXEMPT_PREFIXES = ['services/api/', '__tests__/', '__mocks__/'];

const SOURCE_EXTENSIONS = new Set(['.ts', '.tsx']);

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
 * A `fetch(` whose first argument mentions the VIS host — string literal or
 * template. Comments mentioning `fetch('https://www.fivb.org/...')` are not
 * matched because they never carry the opening `fetch(` unquoted at the start
 * of an expression; to be safe, comment lines are stripped first.
 */
const DIRECT_FETCH = /fetch\s*\(\s*[`'"][^`'"]*fivb\.org/;

function stripComments(source: string): string {
  return source
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .split('\n')
    .map(line => line.replace(/^\s*(\/\/|\*|\/\*).*$/, ''))
    .join('\n');
}

describe('no direct fetch to the VIS outside services/api (issue #47, AC1)', () => {
  it('finds none', () => {
    const offenders: string[] = [];

    for (const dir of SCANNED_DIRS) {
      for (const file of walk(path.join(PROJECT_ROOT, dir))) {
        const relative = path.relative(PROJECT_ROOT, file).split(path.sep).join('/');

        if (EXEMPT_PREFIXES.some(prefix => relative.startsWith(prefix))) {
          continue;
        }

        const source = stripComments(fs.readFileSync(file, 'utf8'));
        if (DIRECT_FETCH.test(source)) {
          offenders.push(relative);
        }
      }
    }

    expect(offenders).toEqual([]);
  });
});
