#!/usr/bin/env node
/**
 * Production Readiness Audit - Main Orchestrator
 * Feature: 002-production-refactoring
 *
 * Coordinates audit execution, checker management, and report generation.
 * Entry point for npm run audit commands.
 */

import {
  AuditReport,
  AuditChecker,
  Finding,
  CheckerResult,
  CheckerRoster,
  CheckerStatus,
  AuditStatus,
  AuditSummary,
  AuditCliArgs,
  FindingStatus,
  GateResult,
  Severity,
} from './types';
import { AUDIT_CONFIG } from './config';
import { TypeScriptChecker } from './checkers/typescript-checker';
import { EslintChecker } from './checkers/eslint-checker';
import { ComplexityChecker } from './checkers/complexity-checker';
import { SecurityScanner } from './checkers/security-scanner';
import { ArchitectureValidator } from './checkers/architecture-validator';
import { ErrorHandlingValidator } from './checkers/error-handling-validator';
import { PerformanceValidator } from './checkers/performance-validator';
import { DataFlowValidator } from './checkers/data-flow-validator';
import { BuildValidator } from './checkers/build-validator';
import {
  loadAuditHistory,
  saveAuditHistory,
  updateHistoryWithReport,
  determineFindingStatus,
} from './tracking/audit-history-manager';
import { generateTrendAnalysis } from './tracking/trend-analyzer';
import {
  AuditBaseline,
  buildBaseline,
  loadBaseline,
  saveBaseline,
  splitRegressions,
} from './tracking/baseline-manager';
import { generateJsonReport } from './reporters/json-reporter';
import { generateMarkdownReport } from './reporters/markdown-reporter';
import {
  printAuditReport,
  printAuditStart,
  printCheckerStart,
  printCheckerRoster,
  printReportPaths,
} from './reporters/console-reporter';
import {
  parseFailOnLevels,
  determineOverallExitCode,
  exitCodeToStatus,
  getErroredCheckers,
  ExitCode,
} from './utils/exit-code-manager';
import { sortBySeverity } from './utils/severity-classifier';

/**
 * Main audit execution
 */
async function main(): Promise<void> {
  try {
    // Parse CLI arguments
    const args = parseCliArgs(process.argv.slice(2));

    // Show version and exit
    if (args.version) {
      console.log('Production Audit v1.0.0');
      process.exit(0);
    }

    printAuditStart();

    // Load audit history
    const history = await loadAuditHistory();

    // Resolve which checkers run — and, just as importantly, which do not
    const roster = resolveRoster(args.checks);
    printCheckerRoster(roster);

    if (roster.unknown.length > 0) {
      // An unknown checker id used to be a console.warn that still produced a
      // green run. A typo in --checks must not silently reduce coverage.
      console.error(
        `Unknown checker id(s): ${roster.unknown.join(', ')}. Known: ${roster.available.join(', ')}`
      );
      process.exit(ExitCode.ERROR);
    }

    const checkers = createCheckers(roster);

    if (checkers.length === 0) {
      console.error('No checkers selected. Use --checks to specify checkers.');
      process.exit(ExitCode.ERROR);
    }

    // Load the frozen baseline up front so a corrupt baseline fails loudly
    // before spending minutes running checkers.
    const baseline = args.noBaseline ? null : await loadBaseline();

    // Run audit
    const startTime = Date.now();
    const allFindings: Finding[] = [];
    const checkerResults: CheckerResult[] = [];

    // Execute checkers
    for (const checker of checkers) {
      printCheckerStart(checker.name);

      const checkerStart = Date.now();
      try {
        const findings = await executeCheckerWithTimeout(
          checker,
          AUDIT_CONFIG.performance.checkerTimeoutMs
        );

        // Determine status for each finding using history
        for (const finding of findings) {
          finding.status = determineFindingStatus(finding, history);
        }

        allFindings.push(...findings);

        checkerResults.push({
          checkerId: checker.id,
          checkerName: checker.name,
          status: CheckerStatus.SUCCESS,
          durationMs: Date.now() - checkerStart,
          findingCount: findings.length,
        });
      } catch (error) {
        checkerResults.push({
          checkerId: checker.id,
          checkerName: checker.name,
          status: CheckerStatus.ERROR,
          durationMs: Date.now() - checkerStart,
          findingCount: 0,
          errorMessage: (error as Error).message,
        });
      }
    }

    // Generate report
    const report = generateReport(
      allFindings,
      checkerResults,
      roster,
      baseline,
      startTime,
      history,
      args
    );

    // --update-baseline: freeze the current blocking findings instead of gating
    if (args.updateBaseline) {
      const erroredCheckers = getErroredCheckers(checkerResults);
      if (erroredCheckers.length > 0) {
        console.error(
          `Refusing to write a baseline: ${erroredCheckers.length} checker(s) failed, the finding set is incomplete.`
        );
        process.exit(ExitCode.ERROR);
      }
      if (roster.skipped.length > 0) {
        console.error(
          `Refusing to write a baseline from a partial run. Skipped checkers: ${roster.skipped.join(', ')}. Run without --checks.`
        );
        process.exit(ExitCode.ERROR);
      }

      const blocking = filterBlockingFindings(
        report.findings,
        report.gate.failOnSeverities
      );
      const written = await saveBaseline(
        buildBaseline(blocking, roster.requested, report.gate.failOnSeverities)
      );
      printAuditReport(report);
      console.log('');
      console.log(
        `📌 Baseline updated: ${written} (${blocking.length} blocking findings frozen)`
      );
      process.exit(ExitCode.PASS);
    }

    // Update and save history
    const updatedHistory = updateHistoryWithReport(history, report);
    await saveAuditHistory(updatedHistory);

    // Generate output files
    const jsonPath = await generateJsonReport(report);
    const markdownPath = await generateMarkdownReport(report);

    // Print to console
    printAuditReport(report);
    console.log(''); // Spacing
    printReportPaths(jsonPath, markdownPath);

    // Exit with appropriate code
    process.exit(report.exitCode);
  } catch (error) {
    console.error('Audit execution failed:', (error as Error).message);
    console.error((error as Error).stack);
    process.exit(ExitCode.ERROR);
  }
}

/**
 * Findings at one of the blocking severity levels
 */
export function filterBlockingFindings(
  findings: Finding[],
  failOnSeverities: Severity[]
): Finding[] {
  const levels = new Set(failOnSeverities);
  return findings.filter((f) => levels.has(f.severity));
}

/**
 * Evaluate the gate for a run (issue #42, AC2 + AC7).
 *
 * Order of precedence:
 *   1. any checker errored  -> ERROR  (exit 2), whatever the findings say
 *   2. blocking regressions -> FAIL   (exit 1)
 *   3. otherwise            -> PASS   (exit 0)
 */
export function evaluateGate(
  findings: Finding[],
  checkerResults: CheckerResult[],
  baseline: AuditBaseline | null,
  args: AuditCliArgs
): { gate: GateResult; exitCode: ExitCode; overallStatus: AuditStatus } {
  const failOnSeverities = [...parseFailOnLevels(args.failOn)];
  const blocking = filterBlockingFindings(findings, failOnSeverities);

  const useBaseline = !args.noBaseline;
  const { regressions, baselined } = useBaseline
    ? splitRegressions(blocking, baseline)
    : { regressions: blocking, baselined: [] as Finding[] };

  const exitCode = determineOverallExitCode(checkerResults, regressions);

  const gate: GateResult = {
    mode: useBaseline ? 'baseline' : 'absolute',
    failOnSeverities,
    blockingFindingCount: blocking.length,
    regressionCount: regressions.length,
    baselinedCount: baselined.length,
    regressionFindingIds: regressions.map((f) => f.id),
  };

  if (useBaseline && baseline) {
    gate.baselineFile = AUDIT_CONFIG.baselineFile;
  }

  return { gate, exitCode, overallStatus: exitCodeToStatus(exitCode) };
}

/**
 * Generate audit report from findings and checker results
 */
function generateReport(
  findings: Finding[],
  checkerResults: CheckerResult[],
  checkerRoster: CheckerRoster,
  baseline: AuditBaseline | null,
  startTime: number,
  history: any,
  args: AuditCliArgs
): AuditReport {
  // Sort findings by severity (Critical > High > Medium > Low)
  const sortedFindings = sortBySeverity(findings);

  // Calculate summary
  const summary = calculateSummary(sortedFindings);

  // Generate trend analysis (if previous run exists)
  const trendAnalysis = generateTrendAnalysis(
    {
      summary,
      findings: sortedFindings,
    } as any,
    history
  );

  const { gate, exitCode, overallStatus } = evaluateGate(
    sortedFindings,
    checkerResults,
    baseline,
    args
  );

  // Generate audit run ID
  const auditRunId = generateAuditRunId();

  const report: AuditReport = {
    auditRunId,
    timestamp: new Date().toISOString(),
    overallStatus,
    exitCode,
    durationMs: Date.now() - startTime,
    summary,
    findings: sortedFindings,
    checkerResults,
    checkerRoster,
    gate,
  };

  // Add trend analysis only if it exists
  if (trendAnalysis) {
    report.trendAnalysis = trendAnalysis;
  }

  return report;
}

/**
 * Calculate audit summary from findings
 */
function calculateSummary(findings: Finding[]): AuditSummary {
  const criticalCount = findings.filter((f) => f.severity === 'Critical').length;
  const highCount = findings.filter((f) => f.severity === 'High').length;
  const mediumCount = findings.filter((f) => f.severity === 'Medium').length;
  const lowCount = findings.filter((f) => f.severity === 'Low').length;

  const newFindings = findings.filter((f) => f.status === FindingStatus.NEW).length;
  const existingFindings = findings.filter(
    (f) => f.status === FindingStatus.EXISTING
  ).length;
  const resolvedFindings = findings.filter(
    (f) => f.status === FindingStatus.RESOLVED
  ).length;

  const manualReviewCount = findings.filter((f) => f.requiresManualReview).length;

  return {
    totalFindings: findings.length,
    criticalCount,
    highCount,
    mediumCount,
    lowCount,
    newFindings,
    existingFindings,
    resolvedFindings,
    manualReviewCount,
  };
}

/**
 * Generate unique audit run ID
 * Format: run-YYYY-MM-DD-HH-MM-SS
 */
function generateAuditRunId(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  const seconds = String(now.getSeconds()).padStart(2, '0');

  return `run-${year}-${month}-${day}-${hours}-${minutes}-${seconds}`;
}

/**
 * Single source of truth for the checker registry.
 *
 * Issue #42: previously the roster lived inline in a switch statement and the
 * default was the 3-checker 'quality' preset, so six checkers — including the
 * security scanner — were never instantiated by `npm run audit` or
 * `npm run audit:ci`. The registry is now enumerable, the default is every
 * checker, and whatever is NOT run is printed explicitly.
 */
export const CHECKER_REGISTRY: Record<string, () => AuditChecker> = {
  typescript: () => new TypeScriptChecker(),
  eslint: () => new EslintChecker(),
  complexity: () => new ComplexityChecker(),
  security: () => new SecurityScanner(),
  architecture: () => new ArchitectureValidator(),
  'error-handling': () => new ErrorHandlingValidator(),
  performance: () => new PerformanceValidator(),
  'data-flow': () => new DataFlowValidator(),
  build: () => new BuildValidator(),
};

/** Named presets. 'all' is the default for both `audit` and `audit:ci`. */
export const CHECKER_PRESETS: Record<string, string[]> = {
  all: Object.keys(CHECKER_REGISTRY),
  quality: ['typescript', 'eslint', 'complexity'],
};

/** Every checker id the tool knows about */
export function allCheckerIds(): string[] {
  return Object.keys(CHECKER_REGISTRY);
}

/**
 * Resolve the --checks argument into a roster.
 * Default (no argument): every checker.
 */
export function resolveRoster(checksArg?: string): CheckerRoster {
  const available = allCheckerIds();

  const requestedRaw = checksArg
    ? checksArg.split(',').map((s) => s.trim().toLowerCase()).filter(Boolean)
    : ['all'];

  const requested: string[] = [];
  const unknown: string[] = [];

  for (const id of requestedRaw) {
    const preset = CHECKER_PRESETS[id];
    if (preset) {
      requested.push(...preset);
    } else if (available.includes(id)) {
      requested.push(id);
    } else {
      unknown.push(id);
    }
  }

  // De-duplicate while keeping registry order for stable output
  const requestedSet = new Set(requested);
  const orderedRequested = available.filter((id) => requestedSet.has(id));

  return {
    available,
    requested: orderedRequested,
    skipped: available.filter((id) => !requestedSet.has(id)),
    unknown,
  };
}

/**
 * Instantiate the checkers for a roster
 */
export function createCheckers(roster: CheckerRoster): AuditChecker[] {
  return roster.requested.map((id) => CHECKER_REGISTRY[id]!());
}

/**
 * Execute checker with timeout
 */
async function executeCheckerWithTimeout(
  checker: AuditChecker,
  timeoutMs: number
): Promise<Finding[]> {
  return Promise.race([
    checker.check(),
    new Promise<Finding[]>((_, reject) =>
      setTimeout(
        () => reject(new Error(`Checker timeout after ${timeoutMs}ms`)),
        timeoutMs
      )
    ),
  ]);
}

/**
 * Parse command-line arguments
 */
export function parseCliArgs(args: string[]): AuditCliArgs {
  const parsed: AuditCliArgs = {};

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];

    // Handle --arg=value format
    if (arg?.startsWith('--') && arg.includes('=')) {
      const [key, value] = arg.split('=');
      switch (key) {
        case '--checks':
          parsed.checks = value;
          break;
        case '--fail-on':
          parsed.failOn = value;
          break;
        case '--severity':
          parsed.severity = value;
          break;
        case '--scope':
          parsed.scope = value;
          break;
        case '--ignore':
          parsed.ignore = value;
          break;
        case '--exclude':
          parsed.exclude = value;
          break;
      }
      continue;
    }

    switch (arg) {
      case '--ci':
        parsed.ci = true;
        break;
      case '--fail-on':
        i++;
        if (i < args.length && args[i]) {
          parsed.failOn = args[i]!;
        }
        break;
      case '--watch':
        parsed.watch = true;
        break;
      case '--checks':
        i++;
        if (i < args.length && args[i]) {
          parsed.checks = args[i]!;
        }
        break;
      case '--severity':
        i++;
        if (i < args.length && args[i]) {
          parsed.severity = args[i]!;
        }
        break;
      case '--scope':
        i++;
        if (i < args.length && args[i]) {
          parsed.scope = args[i]!;
        }
        break;
      case '--ignore':
        i++;
        if (i < args.length && args[i]) {
          parsed.ignore = args[i]!;
        }
        break;
      case '--exclude':
        i++;
        if (i < args.length && args[i]) {
          parsed.exclude = args[i]!;
        }
        break;
      case '--update-baseline':
        parsed.updateBaseline = true;
        break;
      case '--no-baseline':
        parsed.noBaseline = true;
        break;
      case '--version':
        parsed.version = true;
        break;
      case '--help':
      case '-h':
        printHelp();
        process.exit(0);
        break;
    }
  }

  return parsed;
}

/**
 * Print help text
 */
function printHelp(): void {
  console.log(`
Production Readiness Audit

Usage:
  npm run audit [options]

Options:
  --ci                    Run in CI mode (strict exit codes)
  --fail-on <levels>      Fail on specific severity levels (e.g., 'critical,high')
  --watch                 Watch mode for continuous auditing
  --checks <checks>       Run specific checks (default: all)
  --severity <levels>     Show only specific severity levels
  --scope <path>          Scope audit to specific files/directories
  --ignore <ids>          Ignore specific finding IDs
  --exclude <paths>       Exclude paths from auditing
  --update-baseline       Freeze current blocking findings into .audit-baseline.json
  --no-baseline           Ignore the baseline; gate on the absolute finding count
  --version               Show version
  --help, -h              Show this help

Examples:
  npm run audit
  npm run audit -- --checks=typescript
  npm run audit -- --severity=critical,high
  npm run audit:ci
  npm run audit:baseline

Checkers:
  typescript              TypeScript compiler errors (US1)
  eslint                  ESLint errors and warnings (US1)
  complexity              Cyclomatic/cognitive complexity (US1)
  security                Security scanning - credentials, HTTP, encryption (US2)
  architecture            Architecture validation - DI, navigation, components (US3)
  error-handling          Error handling - API errors, boundaries, promises (US4)
  performance             Performance - cache, polling, resource usage (US5)
  data-flow               Data flow - subscriptions, sync, immutability (US6)
  build                   Build validation - Expo config, platform compatibility (US7)
  quality                 TypeScript + ESLint + Complexity only (alias, used by pre-commit)
  all                     All 9 checkers (alias) — DEFAULT

Exit Codes:
  0                       PASS  - every requested checker ran, no blocking regressions
  1                       FAIL  - blocking regressions vs .audit-baseline.json
  2                       ERROR - a checker could not run; the result is not trustworthy

Gate:
  Findings are classified honestly (TypeScript errors are High). The frozen
  baseline in .audit-baseline.json records the pre-existing backlog per
  (file, finding type); only findings IN EXCESS of it fail the build.
  Regenerate it with 'npm run audit:baseline' — the numbers should only go down.
`);
}

// Execute main only when run as a CLI, so the pure decision helpers above can
// be imported by tests without kicking off a full audit.
if (require.main === module) {
  main().catch((error) => {
    console.error('Fatal error:', error);
    process.exit(ExitCode.ERROR);
  });
}
