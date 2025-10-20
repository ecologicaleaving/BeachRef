/**
 * Trend Analyzer
 * Feature: 002-production-refactoring
 *
 * Analyzes historical audit data to identify trends in code quality.
 * Calculates resolution rates, new finding rates, and severity changes.
 */

import {
  AuditHistory,
  TrendAnalysis,
  AuditReport,
  AuditRunSummary,
} from '../types';
import { getPreviousRun, getRecentRuns } from './audit-history-manager';

/**
 * Generate trend analysis from current report and historical data
 * @param report - Current audit report
 * @param history - Audit history
 * @returns Trend analysis or undefined if no previous run
 */
export function generateTrendAnalysis(
  report: AuditReport,
  history: AuditHistory
): TrendAnalysis | undefined {
  const previousRun = getPreviousRun(history);

  if (!previousRun) {
    // No previous run, can't generate trends
    return undefined;
  }

  // Calculate changes
  const totalFindingsChange =
    report.summary.totalFindings - previousRun.totalFindings;
  const criticalChange =
    report.summary.criticalCount - previousRun.criticalCount;
  const highChange = report.summary.highCount - previousRun.highCount;

  // Calculate rates
  const resolutionRate = calculateResolutionRate(
    report.summary.resolvedFindings,
    previousRun.totalFindings
  );

  const newFindingRate = calculateNewFindingRate(
    report.summary.newFindings,
    report.summary.totalFindings
  );

  // Get recent runs for charting
  const recentRuns = getRecentRuns(history, 10).map(
    (run): AuditRunSummary => ({
      auditRunId: run.id,
      timestamp: run.timestamp,
      totalFindings: run.totalFindings,
      criticalCount: run.criticalCount,
      highCount: run.highCount,
      exitCode: run.exitCode,
    })
  );

  return {
    previousRunId: previousRun.id,
    totalFindingsChange,
    criticalChange,
    highChange,
    resolutionRate,
    newFindingRate,
    recentRuns,
  };
}

/**
 * Calculate resolution rate (percentage of previous findings that were resolved)
 * @param resolvedCount - Number of findings resolved in this run
 * @param previousTotalCount - Total findings in previous run
 * @returns Percentage (0-100)
 */
function calculateResolutionRate(
  resolvedCount: number,
  previousTotalCount: number
): number {
  if (previousTotalCount === 0) {
    return 0;
  }

  const rate = (resolvedCount / previousTotalCount) * 100;
  return Math.round(rate * 10) / 10; // Round to 1 decimal place
}

/**
 * Calculate new finding rate (percentage of current findings that are new)
 * @param newCount - Number of new findings
 * @param currentTotalCount - Total findings in current run
 * @returns Percentage (0-100)
 */
function calculateNewFindingRate(
  newCount: number,
  currentTotalCount: number
): number {
  if (currentTotalCount === 0) {
    return 0;
  }

  const rate = (newCount / currentTotalCount) * 100;
  return Math.round(rate * 10) / 10; // Round to 1 decimal place
}

/**
 * Get trend direction emoji for a numeric change
 * @param change - Numeric change (negative is improvement for findings)
 * @returns Emoji indicator
 */
export function getTrendEmoji(change: number): string {
  if (change < 0) {
    return '📉'; // Decreasing (good for findings)
  } else if (change > 0) {
    return '📈'; // Increasing (bad for findings)
  } else {
    return '➡️'; // Stable
  }
}

/**
 * Determine if trends are improving overall
 * @param trendAnalysis - Trend analysis data
 * @returns True if improving (more resolutions than new findings)
 */
export function isImproving(trendAnalysis: TrendAnalysis): boolean {
  // Improving if:
  // 1. Total findings decreased OR
  // 2. Critical/High findings decreased OR
  // 3. Resolution rate > new finding rate
  return (
    trendAnalysis.totalFindingsChange < 0 ||
    (trendAnalysis.criticalChange < 0 && trendAnalysis.highChange < 0) ||
    trendAnalysis.resolutionRate > trendAnalysis.newFindingRate
  );
}

/**
 * Get trend summary text
 * @param trendAnalysis - Trend analysis data
 * @returns Human-readable summary
 */
export function getTrendSummary(trendAnalysis: TrendAnalysis): string {
  const parts: string[] = [];

  // Total findings trend
  if (trendAnalysis.totalFindingsChange < 0) {
    parts.push(
      `${Math.abs(trendAnalysis.totalFindingsChange)} fewer findings`
    );
  } else if (trendAnalysis.totalFindingsChange > 0) {
    parts.push(`${trendAnalysis.totalFindingsChange} more findings`);
  } else {
    parts.push('same number of findings');
  }

  // Critical/High trend
  if (trendAnalysis.criticalChange !== 0 || trendAnalysis.highChange !== 0) {
    const criticalText =
      trendAnalysis.criticalChange !== 0
        ? `${trendAnalysis.criticalChange > 0 ? '+' : ''}${trendAnalysis.criticalChange} Critical`
        : '';
    const highText =
      trendAnalysis.highChange !== 0
        ? `${trendAnalysis.highChange > 0 ? '+' : ''}${trendAnalysis.highChange} High`
        : '';

    const severityParts = [criticalText, highText].filter(Boolean);
    if (severityParts.length > 0) {
      parts.push(`severity: ${severityParts.join(', ')}`);
    }
  }

  // Rates
  parts.push(
    `${trendAnalysis.resolutionRate}% resolved, ${trendAnalysis.newFindingRate}% new`
  );

  return parts.join(' | ');
}
