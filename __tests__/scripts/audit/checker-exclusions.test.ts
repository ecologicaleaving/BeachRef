/**
 * Checker path-exclusion tests
 * Issue #44
 *
 * Four of the nine checkers (error-handling, performance, data-flow, build)
 * each carried their own copy-pasted directory walker that matched
 * `AUDIT_CONFIG.excludePaths` against raw `path.relative()` output.
 *
 * On Windows `path.relative()` returns backslashes, so the pattern
 * `node_modules/**` never matched `node_modules\@types\node\util.d.ts` and all
 * four checkers walked the entire dependency tree. Issue #42 had already found
 * and fixed exactly this bug — but only for the security scanner, via the
 * shared `shouldExcludePath()`, which normalises to POSIX separators first.
 *
 * The consequence was not cosmetic: the Error Handling validator reported 150
 * findings instead of 39, of which 111 came from third-party code. Those 111
 * were counted as *blocking regressions* against the frozen baseline, so
 * `npm run audit:ci` — and therefore `.husky/pre-push` — failed on `master` on
 * any machine that had run `npm install`. A gate that is red for everyone all
 * the time is a gate nobody reads.
 *
 * What is frozen here: every checker that walks the tree must exclude the same
 * paths the shared helper excludes, on any platform.
 */

import * as path from 'path';
import { AUDIT_CONFIG, shouldExcludePath } from '../../../scripts/audit/config';
import { ErrorHandlingValidator } from '../../../scripts/audit/checkers/error-handling-validator';
import { PerformanceValidator } from '../../../scripts/audit/checkers/performance-validator';
import { DataFlowValidator } from '../../../scripts/audit/checkers/data-flow-validator';
import { BuildValidator } from '../../../scripts/audit/checkers/build-validator';

type Walker = {
  findFiles(dir: string, pattern: RegExp): Promise<string[]>;
};

const walkers: [string, () => Walker][] = [
  ['ErrorHandlingValidator', () => new ErrorHandlingValidator() as unknown as Walker],
  ['PerformanceValidator', () => new PerformanceValidator() as unknown as Walker],
  ['DataFlowValidator', () => new DataFlowValidator() as unknown as Walker],
  ['BuildValidator', () => new BuildValidator() as unknown as Walker],
];

describe('shouldExcludePath normalises separators', () => {
  it('excludes node_modules given a Windows-style absolute path', () => {
    const winStyle = path.join(AUDIT_CONFIG.projectRoot, 'node_modules', '@types', 'node', 'util.d.ts');
    expect(shouldExcludePath(winStyle)).toBe(true);
  });

  it('excludes dist/ and .expo/ regardless of separator', () => {
    expect(shouldExcludePath(path.join(AUDIT_CONFIG.projectRoot, 'dist', 'index.js'))).toBe(true);
    expect(shouldExcludePath(path.join(AUDIT_CONFIG.projectRoot, '.expo', 'x.ts'))).toBe(true);
  });

  it('does not exclude first-party source', () => {
    expect(shouldExcludePath(path.join(AUDIT_CONFIG.projectRoot, 'services', 'SyncManager.ts'))).toBe(
      false
    );
  });
});

/**
 * One walk crosses the whole repository, so it costs seconds, not
 * milliseconds. Re-walking inside each `it()` meant twelve full walks (three
 * assertions × four walkers) for ~42 s, and any single one of them could
 * overrun jest's 5 s default once the parallel workers were competing for the
 * disk: the suite was green on an idle machine and red on a busy one, which is
 * the whole of issue #94's "three runs give three numbers".
 *
 * Walk once per walker, in a hook that is allowed to take the time an IO test
 * takes. The assertions are then pure and instantaneous.
 */
const WALK_TIMEOUT_MS = 60_000;

describe.each(walkers)('%s file discovery', (_name, make) => {
  let files: string[];

  beforeAll(async () => {
    files = await make().findFiles(AUDIT_CONFIG.projectRoot, /\.(ts|tsx)$/);
  }, WALK_TIMEOUT_MS);

  it('never walks into node_modules', () => {
    const leaked = files.filter((f) => f.replace(/\\/g, '/').includes('/node_modules/'));
    expect(leaked).toEqual([]);
  });

  it('honours every excludePaths pattern', () => {
    const leaked = files.filter((f) => shouldExcludePath(f));
    expect(leaked).toEqual([]);
  });

  it('still finds first-party source', () => {
    expect(files.length).toBeGreaterThan(0);
    expect(files.some((f) => f.replace(/\\/g, '/').includes('/services/'))).toBe(true);
  });
});
