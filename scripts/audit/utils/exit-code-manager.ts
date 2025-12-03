/**
 * Exit Code Management Utility
 * Feature: 002-production-refactoring
 *
 * Determines process exit codes based on audit results.
 *
 * Exit Code Semantics (from spec clarifications):
 * - 0: PASS - No Critical or High findings
 * - 1: FAIL - Critical or High findings present
 * - 2: ERROR - Audit tool failure
 */

import { Severity, Finding, CheckerResult, CheckerStatus } from '../types';
import { blocksDeployment } from './severity-classifier';

/**
 * Exit code enumeration
 */
export enum ExitCode {
  PASS = 0,
  FAIL = 1,
  ERROR = 2,
}

/**
 * Determine exit code from findings
 * @param findings - All findings from audit
 * @returns Exit code (0=pass, 1=fail, 2=error)
 */
export function determineExitCode(findings: Finding[]): ExitCode {
  // Check for blocking severity findings
  const hasBlockingFindings = findings.some((finding) =>
    blocksDeployment(finding.severity)
  );

  return hasBlockingFindings ? ExitCode.FAIL : ExitCode.PASS;
}

/**
 * Determine exit code from checker results
 * If any checker errored, return ERROR exit code
 * Otherwise, use findings to determine PASS/FAIL
 *
 * @param checkerResults - Results from all checkers
 * @param findings - All findings from audit
 * @returns Exit code
 */
export function determineExitCodeWithCheckers(
  checkerResults: CheckerResult[],
  findings: Finding[]
): ExitCode {
  // If any checker errored, audit fails with error code
  const hasCheckerErrors = checkerResults.some(
    (result) => result.status === CheckerStatus.ERROR
  );

  if (hasCheckerErrors) {
    return ExitCode.ERROR;
  }

  // Otherwise, determine from findings
  return determineExitCode(findings);
}

/**
 * Get exit code description
 * @param exitCode - Exit code to describe
 * @returns Human-readable description
 */
export function getExitCodeDescription(exitCode: ExitCode): string {
  switch (exitCode) {
    case ExitCode.PASS:
      return 'PASS - No Critical/High findings';
    case ExitCode.FAIL:
      return 'FAIL - Critical or High findings present';
    case ExitCode.ERROR:
      return 'ERROR - Audit tool failure';
    default:
      return 'UNKNOWN';
  }
}

/**
 * Get exit code emoji indicator
 * @param exitCode - Exit code
 * @returns Emoji string
 */
export function getExitCodeEmoji(exitCode: ExitCode): string {
  switch (exitCode) {
    case ExitCode.PASS:
      return '✅';
    case ExitCode.FAIL:
      return '❌';
    case ExitCode.ERROR:
      return '🔴';
    default:
      return '⚪';
  }
}

/**
 * Check if exit code indicates failure
 * @param exitCode - Exit code to check
 * @returns True if FAIL or ERROR
 */
export function isFailureExitCode(exitCode: ExitCode): boolean {
  return exitCode === ExitCode.FAIL || exitCode === ExitCode.ERROR;
}

/**
 * Parse custom fail-on severity levels from CLI
 * @param failOnArg - Comma-separated severity levels (e.g., 'critical,high')
 * @returns Set of severity levels that should trigger failure
 */
export function parseFailOnLevels(failOnArg?: string): Set<Severity> {
  if (!failOnArg) {
    // Default: fail on Critical and High
    return new Set([Severity.CRITICAL, Severity.HIGH]);
  }

  const levels = failOnArg.toLowerCase().split(',').map((s) => s.trim());
  const severitySet = new Set<Severity>();

  for (const level of levels) {
    switch (level) {
      case 'critical':
        severitySet.add(Severity.CRITICAL);
        break;
      case 'high':
        severitySet.add(Severity.HIGH);
        break;
      case 'medium':
        severitySet.add(Severity.MEDIUM);
        break;
      case 'low':
        severitySet.add(Severity.LOW);
        break;
    }
  }

  return severitySet;
}

/**
 * Determine exit code with custom fail-on levels
 * @param findings - All findings from audit
 * @param failOnLevels - Set of severity levels that should trigger failure
 * @returns Exit code
 */
export function determineExitCodeWithCustomLevels(
  findings: Finding[],
  failOnLevels: Set<Severity>
): ExitCode {
  const hasFailingFindings = findings.some((finding) =>
    failOnLevels.has(finding.severity)
  );

  return hasFailingFindings ? ExitCode.FAIL : ExitCode.PASS;
}
