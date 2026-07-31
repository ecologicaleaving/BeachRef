/**
 * Production Readiness Audit Configuration
 * Feature: 002-production-refactoring
 *
 * This configuration defines thresholds, severity mappings, and operational
 * parameters for the audit system as per spec clarifications.
 */

import {
  AuditConfig,
  CheckerScopeExclusion,
  CheckerScopeReduction,
  Severity,
} from './types';
import * as path from 'path';
import * as fs from 'fs';

/**
 * Default audit configuration
 * Based on clarifications from specs/002-production-refactoring/spec.md
 */
export const AUDIT_CONFIG: AuditConfig = {
  // Project root (resolved at runtime).
  // AUDIT_PROJECT_ROOT lets tests point the audit at a fixture directory, which
  // is how the "a broken checker must not exit 0" guarantee (issue #42, AC1) is
  // verified end-to-end without hand-breaking the real repo.
  projectRoot: process.env.AUDIT_PROJECT_ROOT
    ? path.resolve(process.env.AUDIT_PROJECT_ROOT)
    : path.resolve(__dirname, '../..'),

  // Paths to exclude from auditing.
  // NOTE (issue #42): these are matched against POSIX-normalised relative paths.
  // Before #42 they were matched against raw `path.relative()` output, which on
  // Windows uses backslashes — so none of these patterns ever matched and the
  // security scanner happily walked node_modules, docs/ and build artifacts.
  excludePaths: [
    'node_modules/**',
    'dist/**',
    'build/**',
    '.expo/**',
    '.git/**',
    '.claude/**',
    '.audit-history/**',
    'specs/002-production-refactoring/reports/**',
    'android/**',
    'ios/**',
    '**/*.test.ts',
    '**/*.spec.ts',
    '**/__tests__/**',
    // Vendored / generated / archived artifacts — not first-party source.
    // They are tracked in git for historical reasons but are not code we own.
    'docs/**',
    'archive/**',
    'BeachRef-app/**',
    'BeachRef-Complete-Deploy/**',
    'dist-test/**',
    // Output of `npx expo export --platform web --source-maps --output-dir
    // dist-map`, the build `scripts/analyze-bundle.js` reads (issue #38). Same
    // nature as `dist/**`: bundled third-party code, minified, not ours.
    'dist-map/**',
    'coverage/**',
    'web-build/**',
    'netlify/**',
    'public/**',
    '**/*.min.js',
  ],

  // Per-checker path exclusions (issue #60).
  //
  // `excludePaths` above answers "is this our code?". This map answers a
  // different question: "do THIS checker's rules mean anything for that code?".
  //
  // `supabase/functions/**` holds the Deno Edge Functions. They are first-party
  // production code that handles data, so excluding them wholesale — the way
  // `BeachRef-app/**` is excluded above — would be the comfortable and wrong
  // choice: it would leave the only server-side code in the repo with no
  // credential scanning at all, which is exactly the hole that cost ten months
  // of exposed production credentials in #56. So `security` still walks them,
  // and only the checkers whose rules encode Expo/React-Native assumptions
  // stop at the door.
  //
  // Decision per checker is documented in CLAUDE.md ("Audit scope per checker").
  // A checker absent from this map audits the whole tree.
  checkerExcludePaths: {
    architecture: [
      {
        pattern: 'supabase/functions/**',
        reason:
          'Deno Edge Functions: the rules check Expo Router file conventions, ' +
          'React component separation and constructor DI in services/. None of ' +
          'those concepts exist in a Deno HTTP handler.',
      },
    ],
    'error-handling': [
      {
        pattern: 'supabase/functions/**',
        reason:
          'Deno Edge Functions: the rules look for React error boundaries and ' +
          'for the app\'s client-side fetch-in-try-catch pattern. A Deno handler ' +
          'reports failures by returning a non-2xx Response, which these ' +
          'heuristics read as a missing catch.',
      },
    ],
    performance: [
      {
        pattern: 'supabase/functions/**',
        reason:
          'Deno Edge Functions: the rules audit the client CacheService, ' +
          'polling intervals and React render cost. Edge Functions are ' +
          'request-scoped and hold none of that machinery.',
      },
    ],
    'data-flow': [
      {
        pattern: 'supabase/functions/**',
        reason:
          'Deno Edge Functions: the rules audit hook subscriptions, SyncManager ' +
          'and React state immutability. A stateless request handler has no ' +
          'subscriptions to leak and no shared state to mutate.',
      },
    ],
    build: [
      {
        pattern: 'supabase/functions/**',
        reason:
          'Deno Edge Functions: the rules validate app.json/tsconfig and ' +
          'React Native platform compatibility (Platform.OS guards). Edge ' +
          'Functions are not part of the Expo build and ship no native APIs.',
      },
    ],
    // Deliberately NOT listed, i.e. they keep auditing supabase/functions:
    //   security   — first-party production code handling data; the one
    //                checker whose value is highest exactly there (#56).
    //   typescript — framework-agnostic. Note it already sees nothing under
    //                supabase/functions because tsconfig.json excludes that
    //                directory (Deno resolves npm:/jsr: specifiers that tsc
    //                cannot). No per-checker rule needed; adding one would
    //                imply a decision the tsconfig already makes.
    //   complexity — framework-agnostic; cyclomatic/cognitive complexity means
    //                the same thing in Deno. Its `complexityRoots` list does
    //                not include supabase today, but that is a roots question,
    //                not an exclusion: nothing here blocks it.
    //   eslint     — framework-agnostic, but scoped to `lintRoots` for parity
    //                with `npm run lint`; supabase/functions is linted by
    //                `deno lint`, not by this config.
  },

  // Source roots linted by the ESLint checker.
  // Kept deliberately identical to what `npm run lint` (expo lint) covers, so
  // the two counts are cross-checkable (issue #42, AC3). `expo lint` defaults to
  // ['src', 'app', 'components'] — see @expo/cli/build/src/lint/lintAsync.js.
  lintRoots: ['src', 'app', 'components'],

  // Source roots analysed by the Complexity checker. Wider than lintRoots on
  // purpose: the heaviest functions live in services/, and complexity findings
  // are non-blocking so a wider net costs nothing.
  complexityRoots: [
    'src',
    'app',
    'components',
    'services',
    'hooks',
    'utils',
    'lib',
    'theme',
    'screens',
    'repositories',
    'config',
  ],

  // Complexity thresholds (from clarification Q2)
  complexity: {
    cyclomatic: 15,
    cognitive: 20,
  },

  // Severity mapping for finding types
  // Critical/High findings block deployment (exitCode: 1)
  severityMap: {
    // Critical - Immediate remediation required
    'security-credential': Severity.CRITICAL,
    'security-cve-critical': Severity.CRITICAL,
    'build-failure': Severity.CRITICAL,

    // High - Fix before release
    // NOTE (issue #42): 'typescript-error' used to be mapped to MEDIUM "for
    // deployment flexibility". Since Medium never blocks, that made the ~2.7k
    // type errors structurally invisible to the gate. It is now classified
    // honestly as High; the frozen baseline (.audit-baseline.json) is what keeps
    // the pre-existing backlog from blocking commits, and only *regressions*
    // fail the build. See "Audit gate" in CLAUDE.md.
    'typescript-error': Severity.HIGH,
    'eslint-error': Severity.HIGH,
    'security-http': Severity.HIGH,
    'security-cve-high': Severity.HIGH,
    'security-encryption': Severity.HIGH,
    'error-handling-api': Severity.HIGH,
    'error-handling-promise': Severity.HIGH,

    // Medium - Fix within sprint
    'complexity-cyclomatic': Severity.MEDIUM,
    'complexity-cognitive': Severity.MEDIUM,
    'architecture-di': Severity.MEDIUM,
    'architecture-navigation': Severity.MEDIUM,
    'architecture-component': Severity.MEDIUM,
    'architecture-state': Severity.MEDIUM,
    'error-handling-boundary': Severity.MEDIUM,
    'performance-cache': Severity.MEDIUM,
    'performance-polling': Severity.MEDIUM,
    'performance-resource': Severity.MEDIUM,
    'data-flow': Severity.MEDIUM,
    'data-subscription': Severity.MEDIUM,
    'data-sync': Severity.MEDIUM,
    'data-immutability': Severity.MEDIUM,
    'security-cve-medium': Severity.MEDIUM,
    'security-sanitization': Severity.MEDIUM,
    'build-config': Severity.MEDIUM,
    'build-platform': Severity.MEDIUM,

    // Low - Fix when convenient
    'eslint-warning': Severity.LOW,
    'build-checklist': Severity.LOW,
    'security-cve-low': Severity.LOW,
  },

  // Report output paths
  reports: {
    outputDir: 'specs/002-production-refactoring/reports/',
    latestJson: 'latest.json',
    latestMarkdown: 'latest.md',
    archiveFormat: 'YYYY-MM-DD-HH-MM-SS', // For archived reports
  },

  // History persistence configuration
  history: {
    directory: '.audit-history/',
    findingsFile: 'findings.json',
    runsFile: 'audit-runs.json',
    maxHistoricalRuns: 100,
    maxHistoricalFindings: 1000,
  },

  // Frozen baseline of pre-existing blocking findings (issue #42, AC7)
  baselineFile: '.audit-baseline.json',

  // Performance limits (from spec FR-046)
  performance: {
    maxDurationMs: 15 * 60 * 1000, // 15 minutes total
    checkerTimeoutMs: 5 * 60 * 1000, // 5 minutes per checker
  },
};

/**
 * Get severity for a finding type
 * @param findingType - The finding type to classify
 * @returns Severity level (defaults to Medium if not mapped)
 */
export function getSeverity(findingType: string): Severity {
  return AUDIT_CONFIG.severityMap[findingType] ?? Severity.MEDIUM;
}

/**
 * Check if a severity level blocks deployment
 * @param severity - The severity to check
 * @returns True if Critical or High (blocks deployment)
 */
export function isBlockingSeverity(severity: Severity): boolean {
  return severity === Severity.CRITICAL || severity === Severity.HIGH;
}

/**
 * Get full path for history file
 * @param filename - History filename (findings.json or audit-runs.json)
 * @returns Absolute path to history file
 */
export function getHistoryPath(filename: string): string {
  return path.join(
    AUDIT_CONFIG.projectRoot,
    AUDIT_CONFIG.history.directory,
    filename
  );
}

/**
 * Get full path for report file
 * @param filename - Report filename
 * @returns Absolute path to report file
 */
export function getReportPath(filename: string): string {
  return path.join(
    AUDIT_CONFIG.projectRoot,
    AUDIT_CONFIG.reports.outputDir,
    filename
  );
}

/**
 * Normalise a path to a POSIX-style path relative to the project root.
 *
 * Every exclusion pattern in this file is written with forward slashes, so the
 * candidate path must use forward slashes too. On Windows `path.relative()`
 * returns backslashes, which silently defeated every exclusion before #42.
 *
 * @param filePath - Absolute or relative file path
 * @returns POSIX-style path relative to project root
 */
export function toProjectRelativePosixPath(filePath: string): string {
  const relativePath = path.isAbsolute(filePath)
    ? path.relative(AUDIT_CONFIG.projectRoot, filePath)
    : filePath;

  return relativePath.replace(/\\/g, '/');
}

/**
 * Compile a simple glob pattern (supports `**` and `*`) into a RegExp.
 * `**` crosses path separators, `*` does not.
 */
function globToRegExp(pattern: string): RegExp {
  const escaped = pattern
    .replace(/[.+^${}()|[\]\\]/g, '\\$&')
    .replace(/\*\*\//g, ' SLASHSTAR ')
    .replace(/\*\*/g, ' GLOBSTAR ')
    .replace(/\*/g, '[^/]*')
    .replace(/ SLASHSTAR /g, '(?:.*/)?')
    .replace(/ GLOBSTAR /g, '.*')
    .replace(/\?/g, '[^/]');

  return new RegExp('^' + escaped + '$');
}

/**
 * Per-checker exclusions in force for a checker (issue #60).
 * Unknown / unlisted checker ids get an empty list: audit everything.
 */
export function getCheckerScopeExclusions(
  checkerId?: string
): CheckerScopeExclusion[] {
  if (!checkerId) {
    return [];
  }
  return AUDIT_CONFIG.checkerExcludePaths[checkerId] ?? [];
}

/**
 * Scope reductions in force for a set of checkers, for reporting (issue #60,
 * AC3). Only checkers that actually have exclusions are returned.
 */
export function describeScopeReductions(
  checkerIds: string[]
): CheckerScopeReduction[] {
  return checkerIds
    .map((checkerId) => ({
      checkerId,
      exclusions: getCheckerScopeExclusions(checkerId),
    }))
    .filter((r) => r.exclusions.length > 0);
}

/**
 * Check if a file path should be excluded from auditing.
 *
 * @param filePath - Absolute or project-relative file path
 * @param checkerId - Optional checker id. When given, that checker's own
 *   exclusions (AUDIT_CONFIG.checkerExcludePaths) apply ON TOP of the global
 *   list — the global list is never weakened by passing an id (issue #60, AC4).
 * @returns True if file should be excluded
 */
export function shouldExcludePath(
  filePath: string,
  checkerId?: string
): boolean {
  const relativePath = toProjectRelativePosixPath(filePath);

  // Anything outside the project root (starts with ../) is always excluded
  if (relativePath.startsWith('../')) {
    return true;
  }

  const globalHit = AUDIT_CONFIG.excludePaths.some((pattern) =>
    globToRegExp(pattern).test(relativePath)
  );

  if (globalHit) {
    return true;
  }

  return getCheckerScopeExclusions(checkerId).some((exclusion) =>
    globToRegExp(exclusion.pattern).test(relativePath)
  );
}

/**
 * Resolve the audit source roots that actually exist on disk.
 * @param roots - Candidate directory names, relative to project root
 * @returns Absolute paths of the directories that exist
 */
export function resolveExistingRoots(roots: string[]): string[] {
  return roots
    .map((dir) => path.join(AUDIT_CONFIG.projectRoot, dir))
    .filter((abs) => fs.existsSync(abs));
}

/**
 * Absolute path of the frozen baseline file (issue #42, AC7)
 */
export function getBaselinePath(): string {
  return path.join(AUDIT_CONFIG.projectRoot, AUDIT_CONFIG.baselineFile);
}
