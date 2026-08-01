/**
 * Markdown Reporter
 * Feature: 002-production-refactoring
 *
 * Generates human-readable Markdown audit reports.
 * Includes executive summary, findings grouped by severity, and trend analysis.
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import { AuditReport, Severity, Finding } from '../types';
import { getReportPath } from '../config';
import {
  getSeverityEmoji,
  groupBySeverity,
} from '../utils/severity-classifier';
import { getExitCodeEmoji } from '../utils/exit-code-manager';
import { getTrendEmoji, getTrendSummary } from '../tracking/trend-analyzer';

/**
 * Generate and save Markdown audit report
 * @param report - Audit report to save
 * @param filename - Report filename (default: 'latest.md')
 * @returns Path to saved report
 */
export async function generateMarkdownReport(
  report: AuditReport,
  filename: string = 'latest.md'
): Promise<string> {
  const reportPath = getReportPath(filename);

  // Generate markdown content
  const markdown = exportReportAsMarkdown(report);

  // Ensure directory exists
  const reportDir = path.dirname(reportPath);
  await fs.mkdir(reportDir, { recursive: true });

  // Write markdown report
  await fs.writeFile(reportPath, markdown, 'utf-8');

  return reportPath;
}

/**
 * Export audit report as Markdown string
 * @param report - Audit report
 * @returns Markdown string
 */
export function exportReportAsMarkdown(report: AuditReport): string {
  const sections: string[] = [];

  // Header
  sections.push(generateHeader(report));

  // Summary
  sections.push(generateSummary(report));

  // Gate
  const gateSection = generateGateSection(report);
  if (gateSection) {
    sections.push(gateSection);
  }

  // Trend Analysis (if available)
  if (report.trendAnalysis) {
    sections.push(generateTrendSection(report));
  }

  // Findings by Severity
  sections.push(generateFindingsSection(report));

  // Manual Review Items
  const manualReviewItems = report.findings.filter(
    (f) => f.requiresManualReview
  );
  if (manualReviewItems.length > 0) {
    sections.push(generateManualReviewSection(manualReviewItems));
  }

  // Checker Results
  sections.push(generateCheckerResultsSection(report));

  // Footer
  sections.push(generateFooter(report));

  return sections.join('\n\n');
}

/**
 * Generate markdown header
 */
function generateHeader(report: AuditReport): string {
  const statusEmoji = getExitCodeEmoji(report.exitCode);
  const dateStr = new Date(report.timestamp).toLocaleString('en-US', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });

  return `# Production Audit Report

**Date**: ${dateStr} | **Status**: ${statusEmoji} ${report.overallStatus} | **Exit Code**: ${report.exitCode}`;
}

/**
 * Generate summary section
 */
function generateSummary(report: AuditReport): string {
  const { summary } = report;

  const criticalIcon = summary.criticalCount > 0 ? '❌' : '✅';
  const highIcon = summary.highCount > 0 ? '❌' : '✅';
  const mediumIcon = summary.mediumCount > 0 ? '⚠️' : '✅';
  const lowIcon = summary.lowCount > 0 ? 'ℹ️' : '✅';

  return `## Summary

- **Total Findings**: ${summary.totalFindings} (🆕 ${summary.newFindings} new, ✅ ${summary.resolvedFindings} resolved)
- **Critical**: ${summary.criticalCount} ${criticalIcon}${summary.criticalCount > 0 ? ' (blocks deployment)' : ''}
- **High**: ${summary.highCount} ${highIcon}${summary.highCount > 0 ? ' (blocks deployment)' : ''}
- **Medium**: ${summary.mediumCount} ${mediumIcon}
- **Low**: ${summary.lowCount} ${lowIcon}
- **Manual Review Required**: ${summary.manualReviewCount} findings`;
}

/**
 * Generate trend analysis section
 */
function generateTrendSection(report: AuditReport): string {
  const trend = report.trendAnalysis!;

  const totalTrend = getTrendEmoji(trend.totalFindingsChange);
  const criticalTrend = getTrendEmoji(trend.criticalChange);
  const highTrend = getTrendEmoji(trend.highChange);

  const summary = getTrendSummary(trend);

  return `## Trend Analysis

**Compared to**: ${trend.previousRunId}

- **Total Findings**: ${totalTrend} ${trend.totalFindingsChange > 0 ? '+' : ''}${trend.totalFindingsChange}
- **Critical**: ${criticalTrend} ${trend.criticalChange > 0 ? '+' : ''}${trend.criticalChange}
- **High**: ${highTrend} ${trend.highChange > 0 ? '+' : ''}${trend.highChange}
- **Resolution Rate**: ${trend.resolutionRate}%
- **New Finding Rate**: ${trend.newFindingRate}%

**Summary**: ${summary}`;
}

/**
 * Generate findings section grouped by severity
 */
function generateFindingsSection(report: AuditReport): string {
  if (report.findings.length === 0) {
    return `## Findings

No findings detected. Great job! ✨`;
  }

  const grouped = groupBySeverity(report.findings);
  const sections: string[] = ['## Findings'];

  // Generate section for each severity level
  for (const severity of [
    Severity.CRITICAL,
    Severity.HIGH,
    Severity.MEDIUM,
    Severity.LOW,
  ]) {
    const findings = grouped.get(severity);
    if (!findings || findings.length === 0) {
      continue;
    }

    const emoji = getSeverityEmoji(severity);
    sections.push(`### ${emoji} ${severity} (${findings.length})`);
    sections.push('');

    for (const finding of findings) {
      sections.push(generateFindingMarkdown(finding));
    }
  }

  return sections.join('\n');
}

/**
 * Generate markdown for a single finding
 */
function generateFindingMarkdown(finding: Finding): string {
  const location = finding.line
    ? `\`${finding.file}:${finding.line}\``
    : `\`${finding.file}\``;

  const statusBadge =
    finding.status === 'New'
      ? '🆕 New'
      : finding.status === 'Existing'
        ? '📌 Existing'
        : '✅ Resolved';

  const ruleInfo = finding.ruleId ? ` (Rule: \`${finding.ruleId}\`)` : '';

  return `#### ${finding.type}${ruleInfo}

**Location**: ${location}
**Status**: ${statusBadge}
**Message**: ${finding.message}

---
`;
}

/**
 * Generate manual review section
 */
function generateManualReviewSection(findings: Finding[]): string {
  const sections: string[] = [
    '## 🔍 Manual Review Required',
    '',
    `${findings.length} finding(s) require human judgment:`,
    '',
  ];

  for (const finding of findings) {
    sections.push(generateManualReviewItem(finding));
  }

  return sections.join('\n');
}

/**
 * Generate manual review item
 */
function generateManualReviewItem(finding: Finding): string {
  const location = finding.line
    ? `\`${finding.file}:${finding.line}\``
    : `\`${finding.file}\``;

  return `### ${finding.type}

**Location**: ${location}
**Message**: ${finding.message}

**Review Guidance**: ${finding.reviewGuidance || 'Please manually verify this finding.'}

---
`;
}

/**
 * Generate checker results section
 */
function generateCheckerResultsSection(report: AuditReport): string {
  const sections: string[] = ['## Checker Results', ''];

  for (const checker of report.checkerResults) {
    const errored = checker.status === 'error';

    const statusEmoji = errored
      ? '❌'
      : checker.status === 'failure'
        ? '⚠️'
        : '✅';

    const durationSeconds = (checker.durationMs / 1000).toFixed(1);

    sections.push(
      `- ${statusEmoji} **${checker.checkerName}** (${durationSeconds}s) - ${errored ? '**DID NOT RUN**' : `${checker.findingCount} findings`}`
    );

    if (checker.errorMessage) {
      sections.push(`  - Error: ${checker.errorMessage}`);
    }
  }

  const { checkerRoster } = report;
  if (checkerRoster) {
    sections.push('');
    sections.push(
      `**Roster**: ${checkerRoster.requested.length}/${checkerRoster.available.length} checkers selected.`
    );
    sections.push('');
    sections.push(`- Running: \`${checkerRoster.requested.join('`, `') || 'none'}\``);
    if (checkerRoster.skipped.length > 0) {
      sections.push(`- **NOT running**: \`${checkerRoster.skipped.join('`, `')}\``);
    }
  }

  // Per-checker scope reductions (issue #60, AC3). A reduced run is allowed,
  // a silent one is not — so the artifact states what was skipped and why.
  const reductions = report.scopeReductions ?? [];
  const reducedIds = new Set(reductions.map((r) => r.checkerId));
  const fullScope = (checkerRoster?.requested ?? []).filter(
    (id) => !reducedIds.has(id)
  );

  sections.push('');
  sections.push('**Scope**');
  sections.push('');

  if (reductions.length === 0) {
    sections.push('- Every checker in this run inspected the full tree.');
    return sections.join('\n');
  }

  sections.push(
    `- Full tree: \`${fullScope.join('`, `') || 'none'}\``
  );
  sections.push('');
  sections.push('| Checker | Not inspected | Why |');
  sections.push('|---|---|---|');
  for (const reduction of reductions) {
    for (const exclusion of reduction.exclusions) {
      sections.push(
        `| \`${reduction.checkerId}\` | \`${exclusion.pattern}\` | ${exclusion.reason} |`
      );
    }
  }

  return sections.join('\n');
}

/**
 * Generate the gate section — how PASS/FAIL was decided (issue #42)
 */
function generateGateSection(report: AuditReport): string {
  const { gate } = report;

  if (!gate) {
    return '';
  }

  const lines: string[] = ['## Gate', ''];

  lines.push(
    `| Property | Value |`,
    `|---|---|`,
    `| Mode | \`${gate.mode}\`${gate.baselineFile ? ` (\`${gate.baselineFile}\`)` : ''} |`,
    `| Blocking severities | ${gate.failOnSeverities.join(', ')} |`,
    `| Blocking findings | ${gate.blockingFindingCount} |`,
    `| Known / baselined | ${gate.baselinedCount} |`,
    `| **Regressions (block the build)** | **${gate.regressionCount}** |`
  );

  const errored = report.checkerResults.filter((c) => c.status === 'error');
  if (errored.length > 0) {
    lines.push('');
    lines.push(
      `> ⚠️ ${errored.length} checker(s) could not run — this result is **not trustworthy** and the audit exits with code 2.`
    );
  }

  return lines.join('\n');
}

/**
 * Generate footer
 */
function generateFooter(report: AuditReport): string {
  const durationSeconds = (report.durationMs / 1000).toFixed(1);

  return `---

**Audit Run ID**: \`${report.auditRunId}\`
**Duration**: ${durationSeconds}s
**Generated**: ${new Date(report.timestamp).toISOString()}`;
}
