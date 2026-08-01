/**
 * Per-checker audit scope for the Deno Edge Functions
 * Issue #60
 *
 * `supabase/functions/**` holds Deno Edge Functions. They are first-party code
 * that runs in production and handles data, but they are audited by checkers
 * written for an Expo / React Native app: `architecture` looks for Expo Router
 * conventions, `error-handling` for React error boundaries, `performance` for
 * the client CacheService, `data-flow` for hook subscriptions. On a Deno HTTP
 * handler those rules mostly produce noise.
 *
 * The comfortable answer would have been the one already applied to
 * `BeachRef-app/**`: exclude the directory outright. That would also have
 * removed the *credential* scan from the only server-side code in the repo —
 * and issue #56 is what that costs: a production superuser password sat in a
 * tracked file on a public repo for ten months and was found by the security
 * scanner on its first run ever.
 *
 * So the scope is differentiated, and this file freezes both halves of it:
 *
 *  1. `security` still sees `supabase/functions` and still reports a credential
 *     planted there (AC2/AC7).
 *  2. The Expo-shaped checkers do not walk it (AC7), while every global
 *     exclusion continues to apply to every checker (AC4 — the per-checker
 *     mechanism must not weaken the shared list).
 */

import * as fs from 'fs/promises';
import * as os from 'os';
import * as path from 'path';
import {
  AUDIT_CONFIG,
  describeScopeReductions,
  getCheckerScopeExclusions,
  shouldExcludePath,
} from '../../../scripts/audit/config';
import { SecurityScanner } from '../../../scripts/audit/checkers/security-scanner';
import { ArchitectureValidator } from '../../../scripts/audit/checkers/architecture-validator';
import { ErrorHandlingValidator } from '../../../scripts/audit/checkers/error-handling-validator';
import { PerformanceValidator } from '../../../scripts/audit/checkers/performance-validator';
import { DataFlowValidator } from '../../../scripts/audit/checkers/data-flow-validator';
import { BuildValidator } from '../../../scripts/audit/checkers/build-validator';

// These tests walk the real project tree. Under a full `npm test` run, with
// every other suite competing for I/O, a walk takes well past jest's 5s
// default — the failure looks like a broken checker but is only the clock.
jest.setTimeout(120000);

const EDGE_FUNCTIONS = 'supabase/functions';

type Walker = { findFiles(dir: string, pattern: RegExp): Promise<string[]> };

const expoShapedCheckers: [string, () => Walker][] = [
  ['architecture', () => new ArchitectureValidator() as unknown as Walker],
  ['error-handling', () => new ErrorHandlingValidator() as unknown as Walker],
  ['performance', () => new PerformanceValidator() as unknown as Walker],
  ['data-flow', () => new DataFlowValidator() as unknown as Walker],
  ['build', () => new BuildValidator() as unknown as Walker],
];

const toPosix = (p: string): string => p.replace(/\\/g, '/');

describe('per-checker exclusions (issue #60, AC4)', () => {
  it('excludes supabase/functions for the Expo-shaped checkers only', () => {
    const edgeFile = path.join(
      AUDIT_CONFIG.projectRoot,
      'supabase',
      'functions',
      'vis-adapter',
      'index.ts'
    );

    for (const [id] of expoShapedCheckers) {
      expect(shouldExcludePath(edgeFile, id)).toBe(true);
    }

    // The framework-agnostic checkers keep it in scope.
    for (const id of ['security', 'typescript', 'complexity', 'eslint']) {
      expect(shouldExcludePath(edgeFile, id)).toBe(false);
    }

    // No checker id at all == global list only.
    expect(shouldExcludePath(edgeFile)).toBe(false);
  });

  it('never weakens the global exclusions', () => {
    // Passing a checker id may only ADD exclusions. If this ever inverts, a
    // per-checker entry could re-open node_modules — the #44 failure mode.
    const globallyExcluded = [
      path.join(AUDIT_CONFIG.projectRoot, 'node_modules', '@types', 'node', 'util.d.ts'),
      path.join(AUDIT_CONFIG.projectRoot, 'dist', 'index.js'),
      path.join(AUDIT_CONFIG.projectRoot, 'BeachRef-app', 'lib', 'main.dart.ts'),
    ];

    const everyCheckerId = [
      'typescript',
      'eslint',
      'complexity',
      'security',
      'architecture',
      'error-handling',
      'performance',
      'data-flow',
      'build',
    ];

    for (const id of everyCheckerId) {
      for (const file of globallyExcluded) {
        expect(shouldExcludePath(file, id)).toBe(true);
      }
    }
  });

  it('gives every exclusion a reason, so the output can explain itself', () => {
    for (const checkerId of Object.keys(AUDIT_CONFIG.checkerExcludePaths)) {
      for (const exclusion of getCheckerScopeExclusions(checkerId)) {
        expect(exclusion.pattern).toBeTruthy();
        expect(exclusion.reason.length).toBeGreaterThan(20);
      }
    }
  });

  it('reports the reduction for the checkers in a run (AC3)', () => {
    const reductions = describeScopeReductions([
      'security',
      'architecture',
      'error-handling',
    ]);

    expect(reductions.map((r) => r.checkerId)).toEqual([
      'architecture',
      'error-handling',
    ]);
    // security is absent precisely because it is NOT reduced
    expect(reductions.some((r) => r.checkerId === 'security')).toBe(false);
  });

  it('reports nothing when no requested checker is reduced', () => {
    expect(describeScopeReductions(['security', 'typescript'])).toEqual([]);
  });
});

describe.each(expoShapedCheckers)(
  '%s does not walk the Deno Edge Functions (AC7)',
  (_id, make) => {
    it('finds no file under supabase/functions', async () => {
      const files = await make().findFiles(AUDIT_CONFIG.projectRoot, /\.(ts|tsx)$/);
      const leaked = files.filter((f) => toPosix(f).includes(`/${EDGE_FUNCTIONS}/`));
      expect(leaked).toEqual([]);
    });

    it('still finds first-party app source', async () => {
      const files = await make().findFiles(AUDIT_CONFIG.projectRoot, /\.(ts|tsx)$/);
      expect(files.some((f) => toPosix(f).includes('/services/'))).toBe(true);
    });
  }
);

describe('security still scans the Deno Edge Functions (AC2/AC7)', () => {
  const scanner = new SecurityScanner() as unknown as {
    getFilesToScan(patterns: string[], maxFiles?: number): Promise<string[]>;
  };

  it('walks supabase/functions', async () => {
    const files = await scanner.getFilesToScan(['**/*.ts', '**/*.tsx', '**/*.js']);
    const edgeFiles = files.filter((f) => toPosix(f).includes(`/${EDGE_FUNCTIONS}/`));

    // Before #60 this was 0: the walk stopped at a 500-file cap, alphabetically
    // before `supabase/`, so the scanner silently never read a single Edge
    // Function. "The security scanner covers them" was true in configuration
    // and false in fact.
    expect(edgeFiles.length).toBeGreaterThan(0);
  });

  it('reaches the whole first-party tree, not a truncated prefix', async () => {
    const files = await scanner.getFilesToScan(['**/*.ts', '**/*.tsx', '**/*.js']);
    const topLevel = new Set(
      files.map((f) => toPosix(path.relative(AUDIT_CONFIG.projectRoot, f)).split('/')[0])
    );

    // `supabase` and `utils` both sort after `services`, which is where the old
    // cap ran out.
    expect(topLevel.has('supabase')).toBe(true);
    expect(topLevel.has('utils')).toBe(true);
  });

  it('reports a credential planted in an Edge Function', async () => {
    const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'audit-scope-'));
    const projectRoot = AUDIT_CONFIG.projectRoot;
    const fixtureFunctions = path.join(dir, 'supabase', 'functions', 'planted');
    await fs.mkdir(fixtureFunctions, { recursive: true });

    // A fake credential, shaped like a real one. Never use a real secret here.
    await fs.writeFile(
      path.join(fixtureFunctions, 'index.ts'),
      [
        'Deno.serve(() => new Response("ok"));',
        'const apiKey = "NotARealSecretPlantedByTest1234567890";',
        'console.log(apiKey);',
      ].join('\n'),
      'utf-8'
    );

    AUDIT_CONFIG.projectRoot = dir;
    try {
      const findings = await new SecurityScanner().check();
      const credential = findings.filter(
        (f) =>
          f.type === 'security-credential' &&
          toPosix(f.file).includes(`${EDGE_FUNCTIONS}/planted/index.ts`)
      );

      expect(credential).toHaveLength(1);
      expect(credential[0]!.severity).toBe('Critical');
    } finally {
      AUDIT_CONFIG.projectRoot = projectRoot;
      await fs.rm(dir, { recursive: true, force: true });
    }
  });

  it('does not flag a credential-shaped line whose value is not a literal', () => {
    const isNonLiteral = (line: string): boolean =>
      (
        SecurityScanner as unknown as {
          isNonLiteralCredentialOnly(l: string): boolean;
        }
      ).isNonLiteralCredentialOnly(line);

    // supabase/functions/_shared/auth.ts:118 — interpolation, not a secret
    expect(
      isNonLiteral('`<Requests Username="${this.creds.username}" Password="${this.creds.password}">`')
    ).toBe(true);
    expect(isNonLiteral('const token = Deno.env.get("VIS_TOKEN");')).toBe(true);
    expect(isNonLiteral('const apiKey = process.env.API_KEY;')).toBe(true);

    // A literal is still a literal, alone or next to an interpolation.
    expect(isNonLiteral('const apiKey = "NotARealSecretPlantedByTest1234567890";')).toBe(false);
    expect(
      isNonLiteral('const a = `${x}`; const password = "hunter2hunter2hunter2";')
    ).toBe(false);
  });
});
