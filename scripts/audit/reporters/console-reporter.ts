/**
 * Console Reporter
 * Feature: 002-production-refactoring
 *
 * Generates colored terminal output for audit results.
 * Provides immediate feedback during audit execution.
 */

import { AuditReport, CheckerResult, CheckerRoster, CheckerStatus } from '../types';
import { countBySeverity } from '../utils/severity-classifier';
import {
  getExitCodeEmoji,
  getExitCodeDescription,
} from '../utils/exit-code-manager';
import { getTrendEmoji } from '../tracking/trend-analyzer';

// ANSI color codes
const RESET = '\x1b[0m';
const BOLD = '\x1b[1m';
const DIM = '\x1b[2m';
const GREEN = '\x1b[32m';
const YELLOW = '\x1b[33m';
const RED = '\x1b[31m';
const CYAN = '\x1b[36m';

/**
 * Print audit report to console
 * @param report - Audit report to display
 */
export function printAuditReport(report: AuditReport): void {
  console.log(''); // Blank line for spacing

  // Print checker results
  printCheckerResults(report.checkerResults);

  console.log(''); // Separator

  // Print summary box
  printSummaryBox(report);

  console.log(''); // Separator

  // Print gate explanation
  printGate(report);

  console.log(''); // Separator

  // Print trend analysis (if available)
  if (report.trendAnalysis) {
    printTrendAnalysis(report);
    console.log(''); // Separator
  }

  // Print exit status
  printExitStatus(report);

  console.log(''); // Blank line for spacing
}

/**
 * Print checker execution results
 */
function printCheckerResults(checkerResults: CheckerResult[]): void {
  for (const checker of checkerResults) {
    const errored = checker.status === CheckerStatus.ERROR;

    const statusIcon = errored
      ? '❌'
      : checker.status === CheckerStatus.FAILURE
        ? '⚠️'
        : '✅';

    const durationSeconds = (checker.durationMs / 1000).toFixed(1);

    // A checker that errored has no finding count worth printing — showing
    // "0 findings" in green is precisely the lie issue #42 is about.
    const findingsSuffix = errored
      ? `${RED}DID NOT RUN${RESET}`
      : checker.findingCount === 0
        ? `${GREEN}0 findings${RESET}`
        : checker.findingCount === 1
          ? '1 finding'
          : `${checker.findingCount} findings`;

    console.log(
      `${statusIcon} ${BOLD}${checker.checkerName}${RESET} ${DIM}(${durationSeconds}s)${RESET} - ${findingsSuffix}`
    );

    if (checker.errorMessage) {
      console.log(`   ${RED}Error: ${checker.errorMessage}${RESET}`);
    }
  }
}

/**
 * Print which checkers will run and which will not (issue #42, AC5).
 */
export function printCheckerRoster(roster: CheckerRoster): void {
  console.log(
    `${BOLD}Checkers:${RESET} ${roster.requested.length}/${roster.available.length} selected`
  );
  console.log(`  ${GREEN}running:${RESET} ${roster.requested.join(', ') || '(none)'}`);

  if (roster.skipped.length > 0) {
    console.log(`  ${YELLOW}NOT running:${RESET} ${roster.skipped.join(', ')}`);
  }

  if (roster.unknown.length > 0) {
    console.log(`  ${RED}unknown ids:${RESET} ${roster.unknown.join(', ')}`);
  }

  console.log('');
}

/**
 * Explain how PASS/FAIL was decided (issue #42, AC7).
 */
function printGate(report: AuditReport): void {
  const { gate } = report;

  console.log(`${BOLD}🚦 Gate${RESET}`);
  console.log(
    `  Mode: ${gate.mode === 'baseline' ? `baseline (${gate.baselineFile ?? 'no baseline file yet'})` : 'absolute (baseline ignored)'}`
  );
  console.log(
    `  Blocking severities: ${gate.failOnSeverities.join(', ')}`
  );
  console.log(`  Blocking findings: ${gate.blockingFindingCount}`);
  console.log(`  ${DIM}└ known / baselined: ${gate.baselinedCount}${RESET}`);

  const regressionColor = gate.regressionCount > 0 ? RED : GREEN;
  console.log(
    `  ${regressionColor}└ regressions (block the build): ${gate.regressionCount}${RESET}`
  );

  const erroredCount = report.checkerResults.filter(
    (c) => c.status === CheckerStatus.ERROR
  ).length;

  if (erroredCount > 0) {
    console.log(
      `  ${RED}${erroredCount} checker(s) could not run — result is NOT trustworthy${RESET}`
    );
  }
}

/**
 * Print summary box
 */
function printSummaryBox(report: AuditReport): void {
  const { summary } = report;
  const counts = countBySeverity(report.findings);

  const boxWidth = 60;
  const line = '─'.repeat(boxWidth);

  console.log(line);
  console.log(`${BOLD}📊 Audit Summary${RESET}`);
  console.log(line);

  // Total findings
  const newBadge = summary.newFindings > 0 ? ` (🆕 ${summary.newFindings} new)` : '';
  const resolvedBadge =
    summary.resolvedFindings > 0 ? ` (✅ ${summary.resolvedFindings} resolved)` : '';

  console.log(
    `Total Findings: ${BOLD}${summary.totalFindings}${RESET}${newBadge}${resolvedBadge}`
  );

  // Severity breakdown
  const criticalColor = counts.critical > 0 ? RED : GREEN;
  const highColor = counts.high > 0 ? YELLOW : GREEN;
  const mediumColor = counts.medium > 0 ? CYAN : GREEN;

  console.log(`  ${criticalColor}Critical: ${counts.critical}${RESET} ${counts.critical > 0 ? '❌' : '✅'}`);
  console.log(`  ${highColor}High: ${counts.high}${RESET} ${counts.high > 0 ? '❌' : '✅'}`);
  console.log(`  ${mediumColor}Medium: ${counts.medium}${RESET} ${counts.medium > 0 ? '⚠️' : '✅'}`);
  console.log(`  Low: ${counts.low} ${counts.low > 0 ? 'ℹ️' : '✅'}`);

  console.log('');

  // Manual review
  if (summary.manualReviewCount > 0) {
    console.log(
      `${YELLOW}Manual Review Required: ${summary.manualReviewCount} findings${RESET}`
    );
    console.log('');
  }

  // Overall status
  const statusEmoji = getExitCodeEmoji(report.exitCode);
  const statusColor =
    report.exitCode === 0 ? GREEN : report.exitCode === 1 ? RED : YELLOW;

  console.log(
    `Overall Status: ${statusEmoji} ${statusColor}${BOLD}${report.overallStatus}${RESET}`
  );
  console.log(`Exit Code: ${report.exitCode}`);

  // Duration
  const durationSeconds = (report.durationMs / 1000).toFixed(1);
  console.log(`${DIM}Duration: ${durationSeconds}s${RESET}`);

  console.log(line);
}

/**
 * Print trend analysis
 */
function printTrendAnalysis(report: AuditReport): void {
  const trend = report.trendAnalysis!;

  console.log(`${BOLD}📈 Trend Analysis${RESET}`);
  console.log(`Compared to: ${DIM}${trend.previousRunId}${RESET}`);
  console.log('');

  // Total findings change
  const totalEmoji = getTrendEmoji(trend.totalFindingsChange);
  const totalColor = trend.totalFindingsChange < 0 ? GREEN : trend.totalFindingsChange > 0 ? RED : RESET;
  console.log(
    `  ${totalEmoji} Total Findings: ${totalColor}${trend.totalFindingsChange > 0 ? '+' : ''}${trend.totalFindingsChange}${RESET}`
  );

  // Critical change
  const criticalEmoji = getTrendEmoji(trend.criticalChange);
  const criticalColor =
    trend.criticalChange < 0 ? GREEN : trend.criticalChange > 0 ? RED : RESET;
  console.log(
    `  ${criticalEmoji} Critical: ${criticalColor}${trend.criticalChange > 0 ? '+' : ''}${trend.criticalChange}${RESET}`
  );

  // High change
  const highEmoji = getTrendEmoji(trend.highChange);
  const highColor = trend.highChange < 0 ? GREEN : trend.highChange > 0 ? RED : RESET;
  console.log(
    `  ${highEmoji} High: ${highColor}${trend.highChange > 0 ? '+' : ''}${trend.highChange}${RESET}`
  );

  console.log('');

  // Rates
  const resolutionColor = trend.resolutionRate > 50 ? GREEN : YELLOW;
  const newFindingColor = trend.newFindingRate > 50 ? RED : YELLOW;

  console.log(
    `  Resolution Rate: ${resolutionColor}${trend.resolutionRate}%${RESET}`
  );
  console.log(
    `  New Finding Rate: ${newFindingColor}${trend.newFindingRate}%${RESET}`
  );
}

/**
 * Print exit status
 */
function printExitStatus(report: AuditReport): void {
  const emoji = getExitCodeEmoji(report.exitCode);
  const description = getExitCodeDescription(report.exitCode);
  const color =
    report.exitCode === 0 ? GREEN : report.exitCode === 1 ? RED : YELLOW;

  console.log(
    `${color}${BOLD}${emoji} ${description}${RESET}`
  );
}

/**
 * Print checker start message
 * @param checkerName - Name of checker starting
 */
export function printCheckerStart(checkerName: string): void {
  console.log(`${DIM}Running ${checkerName}...${RESET}`);
}

/**
 * Print overall start message
 */
export function printAuditStart(): void {
  console.log('');
  console.log(`${BOLD}🔍 Starting Production Readiness Audit...${RESET}`);
  console.log('');
}

/**
 * Print report paths
 * @param jsonPath - Path to JSON report
 * @param markdownPath - Path to Markdown report
 */
export function printReportPaths(
  jsonPath: string,
  markdownPath: string
): void {
  console.log(`${BOLD}📄 Reports generated:${RESET}`);
  console.log(`  - ${jsonPath}`);
  console.log(`  - ${markdownPath}`);
}
