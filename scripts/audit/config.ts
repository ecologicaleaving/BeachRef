/**
 * Production Readiness Audit Configuration
 * Feature: 002-production-refactoring
 *
 * This configuration defines thresholds, severity mappings, and operational
 * parameters for the audit system as per spec clarifications.
 */

import { AuditConfig, Severity } from './types';
import * as path from 'path';

/**
 * Default audit configuration
 * Based on clarifications from specs/002-production-refactoring/spec.md
 */
export const AUDIT_CONFIG: AuditConfig = {
  // Project root (resolved at runtime)
  projectRoot: path.resolve(__dirname, '../..'),

  // Paths to exclude from auditing
  excludePaths: [
    'node_modules/**',
    'dist/**',
    'build/**',
    '.expo/**',
    '.audit-history/**',
    'specs/002-production-refactoring/reports/**',
    'android/**',
    'ios/**',
    '**/*.test.ts',
    '**/*.spec.ts',
    '**/__tests__/**',
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
    'typescript-error': Severity.CRITICAL,
    'security-credential': Severity.CRITICAL,
    'security-cve-critical': Severity.CRITICAL,
    'build-failure': Severity.CRITICAL,

    // High - Fix before release
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
 * Check if a file path should be excluded from auditing
 * @param filePath - Relative file path from project root
 * @returns True if file should be excluded
 */
export function shouldExcludePath(filePath: string): boolean {
  const relativePath = path.relative(AUDIT_CONFIG.projectRoot, filePath);

  return AUDIT_CONFIG.excludePaths.some((pattern) => {
    // Simple glob pattern matching (supports ** and *)
    const regex = new RegExp(
      '^' + pattern.replace(/\*\*/g, '.*').replace(/\*/g, '[^/]*') + '$'
    );
    return regex.test(relativePath);
  });
}
