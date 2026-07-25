/**
 * Audit CLI end-to-end exit code test
 * Issue #42 (AC1, AC10)
 *
 * The unit tests in audit-gate.test.ts cover the decision logic. This one runs
 * the real CLI against a deliberately broken project so the guarantee is proven
 * end-to-end: a checker that cannot run must never produce exit 0.
 *
 * AUDIT_PROJECT_ROOT points the audit at a fixture directory with no tsconfig
 * and no ESLint config, which is the cheapest reproducible way to break every
 * quality checker at once.
 */

import { execFileSync } from 'child_process';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

const REPO_ROOT = path.resolve(__dirname, '../../..');
const RUNNER = path.join(REPO_ROOT, 'scripts', 'audit', 'run-audit.ts');

/**
 * Resolve the tsx CLI. Node walks up the directory tree, so this also works in
 * a git worktree whose node_modules lives in the parent checkout.
 */
function resolveTsxCli(): string | null {
  // Walk up from the repo root looking for node_modules/tsx.
  let dir = REPO_ROOT;

  for (;;) {
    const candidate = path.join(dir, 'node_modules', 'tsx', 'dist', 'cli.mjs');
    if (fs.existsSync(candidate)) {
      return candidate;
    }

    const parent = path.dirname(dir);
    if (parent === dir) {
      return null;
    }
    dir = parent;
  }
}

const TSX_CLI = resolveTsxCli();

interface RunResult {
  status: number;
  output: string;
}

function runAudit(projectRoot: string, args: string[]): RunResult {
  try {
    const stdout = execFileSync(
      process.execPath,
      [TSX_CLI!, RUNNER, ...args],
      {
        cwd: REPO_ROOT,
        env: { ...process.env, AUDIT_PROJECT_ROOT: projectRoot, NO_COLOR: '1' },
        encoding: 'utf-8',
        stdio: ['ignore', 'pipe', 'pipe'],
      }
    );
    return { status: 0, output: stdout };
  } catch (error) {
    const err = error as { status?: number; stdout?: string; stderr?: string };
    return {
      status: err.status ?? -1,
      output: `${err.stdout ?? ''}${err.stderr ?? ''}`,
    };
  }
}

// Skip rather than fail the whole suite if the tsx CLI cannot be located.
const describeIfTsx = TSX_CLI ? describe : describe.skip;

describeIfTsx('audit CLI — a broken checker never exits 0 (AC1)', () => {
  let fixtureRoot: string;

  beforeAll(() => {
    fixtureRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'audit-broken-'));
    // A directory the checkers cannot possibly analyse: no tsconfig.json,
    // no eslint config, no source roots.
    fs.mkdirSync(path.join(fixtureRoot, 'app'), { recursive: true });
    fs.writeFileSync(path.join(fixtureRoot, 'app', 'index.ts'), 'export const a = 1;\n');
  });

  afterAll(() => {
    fs.rmSync(fixtureRoot, { recursive: true, force: true });
  });

  it('exits non-zero when checkers cannot run', () => {
    const result = runAudit(fixtureRoot, ['--checks=quality']);

    expect(result.status).not.toBe(0);
    expect(result.output).toContain('DID NOT RUN');
  });

  it('exits 2 (ERROR), not 1 (FAIL), so the failure mode is distinguishable', () => {
    const result = runAudit(fixtureRoot, ['--checks=quality']);

    expect(result.status).toBe(2);
    expect(result.output).toContain('ERROR');
  });

  it('still exits non-zero with --fail-on=critical, the pre-commit invocation', () => {
    const result = runAudit(fixtureRoot, ['--checks=quality', '--fail-on=critical']);

    expect(result.status).toBe(2);
  });

  it('still exits non-zero with --ci --fail-on=critical,high, the pre-push invocation', () => {
    const result = runAudit(fixtureRoot, [
      '--ci',
      '--checks=all',
      '--fail-on=critical,high',
    ]);

    expect(result.status).toBe(2);
  });

  it('exits 2 on an unknown --checks id instead of silently reducing coverage', () => {
    const result = runAudit(fixtureRoot, ['--checks=typo-checker']);

    expect(result.status).toBe(2);
    expect(result.output).toContain('Unknown checker id');
  });

  it('names the checkers that are not running', () => {
    const result = runAudit(fixtureRoot, ['--checks=quality']);

    expect(result.output).toContain('NOT running');
    expect(result.output).toContain('security');
  });
}, 300000);
