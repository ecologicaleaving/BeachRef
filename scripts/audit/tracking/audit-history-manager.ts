/**
 * Audit History Manager
 * Feature: 002-production-refactoring
 *
 * Manages persistent storage of audit findings and runs over time.
 * Enables trend analysis and finding lifecycle tracking (New/Existing/Resolved).
 *
 * Persistence:
 * - .audit-history/findings.json: Map of finding IDs to historical data
 * - .audit-history/audit-runs.json: Array of run summaries (max 100)
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import {
  AuditHistory,
  HistoricalRun,
  Finding,
  FindingStatus,
  AuditReport,
} from '../types';
import { getHistoryPath } from '../config';

/**
 * Load audit history from disk
 * @returns Audit history or empty history if files don't exist
 */
export async function loadAuditHistory(): Promise<AuditHistory> {
  try {
    const findingsPath = getHistoryPath('findings.json');
    const runsPath = getHistoryPath('audit-runs.json');

    // Check if files exist
    const [findingsExist, runsExist] = await Promise.all([
      fileExists(findingsPath),
      fileExists(runsPath),
    ]);

    if (!findingsExist || !runsExist) {
      return createEmptyHistory();
    }

    // Load files
    const [findingsData, runsData] = await Promise.all([
      fs.readFile(findingsPath, 'utf-8'),
      fs.readFile(runsPath, 'utf-8'),
    ]);

    const findings = JSON.parse(findingsData);
    const runs = JSON.parse(runsData);

    return { findings, runs };
  } catch (error) {
    console.warn('Failed to load audit history, starting fresh:', error);
    return createEmptyHistory();
  }
}

/**
 * Save audit history to disk
 * @param history - Audit history to save
 */
export async function saveAuditHistory(
  history: AuditHistory
): Promise<void> {
  try {
    const findingsPath = getHistoryPath('findings.json');
    const runsPath = getHistoryPath('audit-runs.json');

    // Ensure directory exists
    const historyDir = path.dirname(findingsPath);
    await fs.mkdir(historyDir, { recursive: true });

    // Save files
    await Promise.all([
      fs.writeFile(findingsPath, JSON.stringify(history.findings, null, 2)),
      fs.writeFile(runsPath, JSON.stringify(history.runs, null, 2)),
    ]);
  } catch (error) {
    console.error('Failed to save audit history:', error);
    throw new Error('Audit history persistence failed');
  }
}

/**
 * Update audit history with new audit run results
 * @param history - Current audit history
 * @param report - New audit report
 * @returns Updated audit history
 */
export function updateHistoryWithReport(
  history: AuditHistory,
  report: AuditReport
): AuditHistory {
  const updatedHistory: AuditHistory = {
    findings: { ...history.findings },
    runs: [...history.runs],
  };

  // Update findings
  for (const finding of report.findings) {
    const existingFinding = updatedHistory.findings[finding.id];

    if (existingFinding) {
      // Update existing finding
      existingFinding.lastSeen = finding.timestamp;
      existingFinding.status = finding.status === FindingStatus.RESOLVED
        ? 'Resolved'
        : 'Active';
      existingFinding.occurrences.push({
        auditRunId: report.auditRunId,
        timestamp: finding.timestamp,
        severity: finding.severity,
        file: finding.file,
        line: finding.line,
      });
    } else {
      // New finding
      updatedHistory.findings[finding.id] = {
        id: finding.id,
        type: finding.type,
        firstSeen: finding.timestamp,
        lastSeen: finding.timestamp,
        status: 'Active',
        occurrences: [
          {
            auditRunId: report.auditRunId,
            timestamp: finding.timestamp,
            severity: finding.severity,
            file: finding.file,
            line: finding.line,
          },
        ],
      };
    }
  }

  // Mark findings as resolved if they didn't appear in this run
  const currentFindingIds = new Set(report.findings.map((f) => f.id));
  for (const [id, finding] of Object.entries(updatedHistory.findings)) {
    if (!currentFindingIds.has(id) && finding.status === 'Active') {
      finding.status = 'Resolved';
    }
  }

  // Add run summary
  const runSummary: HistoricalRun = {
    id: report.auditRunId,
    timestamp: report.timestamp,
    totalFindings: report.summary.totalFindings,
    criticalCount: report.summary.criticalCount,
    highCount: report.summary.highCount,
    mediumCount: report.summary.mediumCount,
    lowCount: report.summary.lowCount,
    newFindings: report.summary.newFindings,
    resolvedFindings: report.summary.resolvedFindings,
    exitCode: report.exitCode,
  };

  updatedHistory.runs.push(runSummary);

  // Trim runs to max 100
  if (updatedHistory.runs.length > 100) {
    updatedHistory.runs = updatedHistory.runs.slice(-100);
  }

  // Trim findings to max 1000 (remove oldest resolved findings)
  const findingsArray = Object.entries(updatedHistory.findings);
  if (findingsArray.length > 1000) {
    // Sort by last seen (oldest first)
    findingsArray.sort((a, b) => {
      const dateA = new Date(a[1].lastSeen).getTime();
      const dateB = new Date(b[1].lastSeen).getTime();
      return dateA - dateB;
    });

    // Keep only active findings and most recent 1000
    const toKeep = findingsArray.filter((f) => f[1].status === 'Active');
    const resolved = findingsArray.filter((f) => f[1].status === 'Resolved');

    // Add resolved findings until we hit 1000 total
    const remaining = 1000 - toKeep.length;
    toKeep.push(...resolved.slice(-remaining));

    updatedHistory.findings = Object.fromEntries(toKeep);
  }

  return updatedHistory;
}

/**
 * Determine finding status by comparing with history
 * @param finding - Current finding
 * @param history - Audit history
 * @returns Finding status (New/Existing/Resolved)
 */
export function determineFindingStatus(
  finding: Omit<Finding, 'status'>,
  history: AuditHistory
): FindingStatus {
  const historical = history.findings[finding.id];

  if (!historical) {
    return FindingStatus.NEW;
  }

  if (historical.status === 'Resolved') {
    // Reappeared after being resolved
    return FindingStatus.NEW;
  }

  return FindingStatus.EXISTING;
}

/**
 * Get the previous audit run from history
 * @param history - Audit history
 * @returns Previous run or undefined if no history
 */
export function getPreviousRun(
  history: AuditHistory
): HistoricalRun | undefined {
  if (history.runs.length === 0) {
    return undefined;
  }

  return history.runs[history.runs.length - 1];
}

/**
 * Get recent audit runs for trend analysis
 * @param history - Audit history
 * @param count - Number of recent runs to retrieve (default: 10)
 * @returns Array of recent runs (newest first)
 */
export function getRecentRuns(
  history: AuditHistory,
  count: number = 10
): HistoricalRun[] {
  return history.runs.slice(-count).reverse();
}

/**
 * Create empty audit history structure
 * @returns Empty audit history
 */
function createEmptyHistory(): AuditHistory {
  return {
    findings: {},
    runs: [],
  };
}

/**
 * Check if a file exists
 * @param filePath - Path to check
 * @returns True if file exists
 */
async function fileExists(filePath: string): Promise<boolean> {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}
