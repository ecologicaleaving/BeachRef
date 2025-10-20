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
  CheckerStatus,
  AuditStatus,
  AuditSummary,
  AuditCliArgs,
  FindingStatus,
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
import { generateJsonReport } from './reporters/json-reporter';
import { generateMarkdownReport } from './reporters/markdown-reporter';
import {
  printAuditReport,
  printAuditStart,
  printCheckerStart,
  printReportPaths,
} from './reporters/console-reporter';
import {
  determineExitCodeWithCheckers,
  parseFailOnLevels,
  determineExitCodeWithCustomLevels,
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

    // Create checkers based on --checks argument
    const checkers = createCheckers(args.checks);

    if (checkers.length === 0) {
      console.error('No checkers selected. Use --checks to specify checkers.');
      process.exit(ExitCode.ERROR);
    }

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
      startTime,
      history,
      args
    );

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
 * Generate audit report from findings and checker results
 */
function generateReport(
  findings: Finding[],
  checkerResults: CheckerResult[],
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

  // Determine exit code
  let exitCode: ExitCode;
  if (args.failOn) {
    // Custom fail-on levels
    const failOnLevels = parseFailOnLevels(args.failOn);
    exitCode = determineExitCodeWithCustomLevels(sortedFindings, failOnLevels);
  } else {
    // Default: fail on Critical/High
    exitCode = determineExitCodeWithCheckers(checkerResults, sortedFindings);
  }

  // Determine overall status
  const overallStatus =
    exitCode === ExitCode.PASS ? AuditStatus.PASS : AuditStatus.FAIL;

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
 * Create checkers based on CLI arguments
 */
function createCheckers(checksArg?: string): AuditChecker[] {
  // Default: all code quality checkers (US1)
  const defaultCheckers = ['typescript', 'eslint', 'complexity'];

  // Parse --checks argument
  const checksToRun = checksArg
    ? checksArg.split(',').map((s) => s.trim().toLowerCase())
    : defaultCheckers;

  const checkers: AuditChecker[] = [];

  for (const checkId of checksToRun) {
    switch (checkId) {
      case 'typescript':
        checkers.push(new TypeScriptChecker());
        break;
      case 'eslint':
        checkers.push(new EslintChecker());
        break;
      case 'complexity':
        checkers.push(new ComplexityChecker());
        break;
      case 'security':
        checkers.push(new SecurityScanner());
        break;
      case 'architecture':
        checkers.push(new ArchitectureValidator());
        break;
      case 'error-handling':
        checkers.push(new ErrorHandlingValidator());
        break;
      case 'performance':
        checkers.push(new PerformanceValidator());
        break;
      case 'data-flow':
        checkers.push(new DataFlowValidator());
        break;
      case 'build':
        checkers.push(new BuildValidator());
        break;
      case 'quality':
        // Alias for all code quality checkers (US1)
        checkers.push(new TypeScriptChecker());
        checkers.push(new EslintChecker());
        checkers.push(new ComplexityChecker());
        break;
      case 'all':
        // All checkers (US1-US7)
        checkers.push(new TypeScriptChecker());
        checkers.push(new EslintChecker());
        checkers.push(new ComplexityChecker());
        checkers.push(new SecurityScanner());
        checkers.push(new ArchitectureValidator());
        checkers.push(new ErrorHandlingValidator());
        checkers.push(new PerformanceValidator());
        checkers.push(new DataFlowValidator());
        checkers.push(new BuildValidator());
        break;
      default:
        console.warn(`Unknown checker: ${checkId}`);
    }
  }

  // Remove duplicates
  const uniqueCheckers = Array.from(
    new Map(checkers.map((c) => [c.id, c])).values()
  );

  return uniqueCheckers;
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
function parseCliArgs(args: string[]): AuditCliArgs {
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
  --checks <checks>       Run specific checks (e.g., 'typescript,eslint')
  --severity <levels>     Show only specific severity levels
  --scope <path>          Scope audit to specific files/directories
  --ignore <ids>          Ignore specific finding IDs
  --exclude <paths>       Exclude paths from auditing
  --version               Show version
  --help, -h              Show this help

Examples:
  npm run audit
  npm run audit -- --checks=typescript
  npm run audit -- --severity=critical,high
  npm run audit:ci

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
  quality                 All code quality checks - US1 (alias)
  all                     All checkers - US1 through US7 (alias)

Exit Codes:
  0                       PASS - No Critical/High findings
  1                       FAIL - Critical/High findings present
  2                       ERROR - Audit tool failure
`);
}

// Execute main
main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(ExitCode.ERROR);
});
