/**
 * JSON Reporter
 * Feature: 002-production-refactoring
 *
 * Generates JSON format audit reports for programmatic consumption.
 * Conforms to specs/002-production-refactoring/contracts/audit-report.schema.json
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import { AuditReport } from '../types';
import { getReportPath } from '../config';

/**
 * Generate and save JSON audit report
 * @param report - Audit report to save
 * @param filename - Report filename (default: 'latest.json')
 * @returns Path to saved report
 */
export async function generateJsonReport(
  report: AuditReport,
  filename: string = 'latest.json'
): Promise<string> {
  const reportPath = getReportPath(filename);

  // Ensure directory exists
  const reportDir = path.dirname(reportPath);
  await fs.mkdir(reportDir, { recursive: true });

  // Write JSON report
  await fs.writeFile(reportPath, JSON.stringify(report, null, 2), 'utf-8');

  return reportPath;
}

/**
 * Generate archived JSON report with timestamp
 * @param report - Audit report to archive
 * @returns Path to archived report
 */
export async function archiveJsonReport(
  report: AuditReport
): Promise<string> {
  const timestamp = report.auditRunId.replace('run-', '');
  const filename = `audit-${timestamp}.json`;

  return generateJsonReport(report, filename);
}

/**
 * Export audit report as JSON string
 * @param report - Audit report
 * @param pretty - Whether to format with indentation (default: true)
 * @returns JSON string
 */
export function exportReportAsJson(
  report: AuditReport,
  pretty: boolean = true
): string {
  return pretty
    ? JSON.stringify(report, null, 2)
    : JSON.stringify(report);
}
