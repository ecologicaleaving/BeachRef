/**
 * Severity Classification Utility
 * Feature: 002-production-refactoring
 *
 * Determines severity levels for findings based on type and context.
 */

import { Severity, FindingType } from '../types';
import { getSeverity, isBlockingSeverity } from '../config';

/**
 * Classify a finding's severity based on its type
 * @param findingType - The type of finding to classify
 * @returns Severity level
 */
export function classifySeverity(findingType: FindingType | string): Severity {
  return getSeverity(findingType);
}

/**
 * Check if a severity level blocks deployment (Critical or High)
 * @param severity - Severity to check
 * @returns True if this severity blocks deployment
 */
export function blocksDeployment(severity: Severity): boolean {
  return isBlockingSeverity(severity);
}

/**
 * Get emoji indicator for severity level
 * @param severity - Severity level
 * @returns Emoji string
 */
export function getSeverityEmoji(severity: Severity): string {
  switch (severity) {
    case Severity.CRITICAL:
      return '🔴';
    case Severity.HIGH:
      return '🟠';
    case Severity.MEDIUM:
      return '🟡';
    case Severity.LOW:
      return '🔵';
    default:
      return '⚪';
  }
}

/**
 * Get color code for severity level (for terminal output)
 * @param severity - Severity level
 * @returns ANSI color code
 */
export function getSeverityColor(severity: Severity): string {
  switch (severity) {
    case Severity.CRITICAL:
      return '\x1b[31m'; // Red
    case Severity.HIGH:
      return '\x1b[33m'; // Yellow
    case Severity.MEDIUM:
      return '\x1b[36m'; // Cyan
    case Severity.LOW:
      return '\x1b[37m'; // White
    default:
      return '\x1b[0m'; // Reset
  }
}

/**
 * Sort findings by severity (Critical > High > Medium > Low)
 * @param findings - Array of findings with severity property
 * @returns Sorted array (descending severity)
 */
export function sortBySeverity<T extends { severity: Severity }>(
  findings: T[]
): T[] {
  const severityOrder = {
    [Severity.CRITICAL]: 0,
    [Severity.HIGH]: 1,
    [Severity.MEDIUM]: 2,
    [Severity.LOW]: 3,
  };

  return [...findings].sort(
    (a, b) => severityOrder[a.severity] - severityOrder[b.severity]
  );
}

/**
 * Group findings by severity level
 * @param findings - Array of findings with severity property
 * @returns Map of severity to findings
 */
export function groupBySeverity<T extends { severity: Severity }>(
  findings: T[]
): Map<Severity, T[]> {
  const groups = new Map<Severity, T[]>();

  for (const finding of findings) {
    const existing = groups.get(finding.severity) ?? [];
    existing.push(finding);
    groups.set(finding.severity, existing);
  }

  return groups;
}

/**
 * Count findings by severity level
 * @param findings - Array of findings with severity property
 * @returns Object with counts per severity
 */
export function countBySeverity<T extends { severity: Severity }>(
  findings: T[]
): {
  critical: number;
  high: number;
  medium: number;
  low: number;
} {
  return {
    critical: findings.filter((f) => f.severity === Severity.CRITICAL).length,
    high: findings.filter((f) => f.severity === Severity.HIGH).length,
    medium: findings.filter((f) => f.severity === Severity.MEDIUM).length,
    low: findings.filter((f) => f.severity === Severity.LOW).length,
  };
}
