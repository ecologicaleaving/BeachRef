/**
 * Audit Report Generator
 *
 * Generates aggregated audit reports with findings, recommendations,
 * and compliance scoring.
 *
 * Feature: specs/001-vis-api-optimization
 * Tasks: T015, T021, T024, T025, T027
 */

import { v4 as uuidv4 } from 'uuid';
import {
  ApiRequest,
  AuditFinding,
  AuditReport,
  Severity,
} from '../../types/audit';

/**
 * AuditReportGenerator
 *
 * Aggregates audit findings and generates comprehensive reports.
 *
 * **Features:**
 * - Compliance score calculation (100 - criticals*10 - warnings*3 - info*1)
 * - Impact assessment aggregation
 * - Prioritized recommendations
 * - JSON export for developer review
 */
export class AuditReportGenerator {
  /**
   * Generate audit report from requests and findings (T024)
   *
   * @param requests - All captured API requests
   * @param findings - All audit findings
   * @param periodStart - Start of audit period (Unix ms)
   * @param periodEnd - End of audit period (Unix ms)
   * @returns Complete audit report
   */
  generateReport(
    requests: ApiRequest[],
    findings: AuditFinding[],
    periodStart: number,
    periodEnd: number
  ): AuditReport {
    // Calculate metrics
    const totalRequests = requests.length;
    const malformedRequests = this.countMalformedRequests(findings);
    const overFetchingInstances = this.countOverFetchingInstances(findings);
    const averagePayloadSize = this.calculateAveragePayloadSize(requests);
    const averageResponseTime = this.calculateAverageResponseTime(requests);
    const cacheHitRate = this.calculateCacheHitRate(requests);

    // T021: Calculate compliance score
    const complianceScore = this.calculateComplianceScore(findings);

    // Generate prioritized recommendations
    const recommendations = this.generateRecommendations(findings, requests);

    return {
      id: uuidv4(),
      generatedAt: Date.now(),
      periodStart,
      periodEnd,
      totalRequests,
      malformedRequests,
      overFetchingInstances,
      averagePayloadSize,
      averageResponseTime,
      cacheHitRate,
      findings,
      recommendations,
      complianceScore,
    };
  }

  /**
   * T021: Calculate compliance score (0-100)
   *
   * Formula: 100 - (criticals * 10 + warnings * 3 + info * 1)
   */
  private calculateComplianceScore(findings: AuditFinding[]): number {
    const criticals = findings.filter(f => f.severity === 'critical').length;
    const warnings = findings.filter(f => f.severity === 'warning').length;
    const infos = findings.filter(f => f.severity === 'info').length;

    const score = 100 - (criticals * 10 + warnings * 3 + infos * 1);
    return Math.max(0, Math.min(100, score)); // Clamp to 0-100
  }

  /**
   * Count requests with malformed XML or incorrect parameters
   */
  private countMalformedRequests(findings: AuditFinding[]): number {
    const malformedRequestIds = new Set(
      findings
        .filter(f => f.category === 'malformed' || f.category === 'incorrect-parameter')
        .map(f => f.apiRequestId)
    );
    return malformedRequestIds.size;
  }

  /**
   * Count over-fetching instances
   */
  private countOverFetchingInstances(findings: AuditFinding[]): number {
    return findings.filter(f => f.category === 'over-fetching').length;
  }

  /**
   * Calculate average payload size
   */
  private calculateAveragePayloadSize(requests: ApiRequest[]): number {
    if (requests.length === 0) return 0;
    const totalSize = requests.reduce((sum, r) => sum + r.payloadSize, 0);
    return Math.round(totalSize / requests.length);
  }

  /**
   * Calculate average response time
   */
  private calculateAverageResponseTime(requests: ApiRequest[]): number {
    if (requests.length === 0) return 0;
    const totalTime = requests.reduce((sum, r) => sum + r.responseTime, 0);
    return Math.round(totalTime / requests.length);
  }

  /**
   * Calculate cache hit rate (0-1)
   */
  private calculateCacheHitRate(requests: ApiRequest[]): number {
    if (requests.length === 0) return 0;
    const cacheHits = requests.filter(r => r.cacheHit).length;
    return cacheHits / requests.length;
  }

  /**
   * T025: Generate prioritized recommendations with impact assessment
   */
  private generateRecommendations(
    findings: AuditFinding[],
    requests: ApiRequest[]
  ): string[] {
    const recommendations: { text: string; priority: number; impact: number }[] = [];

    // Group findings by category
    const criticalFindings = findings.filter(f => f.severity === 'critical');
    const warningFindings = findings.filter(f => f.severity === 'warning');

    // Critical: Malformed requests
    if (criticalFindings.length > 0) {
      const totalImpact = criticalFindings.reduce(
        (sum, f) => sum + f.impactAssessment.payloadIncrease,
        0
      );

      recommendations.push({
        text: `FIX CRITICAL: ${criticalFindings.length} requests have malformed XML or incorrect parameters. This causes BadRequestSyntax errors and failed API calls. Review VIS API documentation for correct request format.`,
        priority: 1,
        impact: criticalFindings.length * 1000, // High impact
      });
    }

    // Warning: Over-fetching
    const overFetchingFindings = warningFindings.filter(f => f.category === 'over-fetching');
    if (overFetchingFindings.length > 0) {
      const totalPayloadIncrease = overFetchingFindings.reduce(
        (sum, f) => sum + f.impactAssessment.payloadIncrease,
        0
      );

      recommendations.push({
        text: `OPTIMIZE: ${overFetchingFindings.length} requests are over-fetching data (~${Math.round(totalPayloadIncrease / 1024)}KB excess payload). Implement field selection modes (slim/default/full) to reduce payload sizes by 40%+.`,
        priority: 2,
        impact: totalPayloadIncrease,
      });
    }

    // Cache optimization
    const cacheHitRate = this.calculateCacheHitRate(requests);
    if (cacheHitRate < 0.7) {
      recommendations.push({
        text: `CACHE: Current cache hit rate is ${(cacheHitRate * 100).toFixed(1)}% (target: 70%+). Implement adaptive TTL and stale-while-revalidate patterns to improve cache efficiency.`,
        priority: 3,
        impact: (0.7 - cacheHitRate) * 1000,
      });
    }

    // Response time optimization
    const avgResponseTime = this.calculateAverageResponseTime(requests);
    if (avgResponseTime > 2000) {
      recommendations.push({
        text: `PERFORMANCE: Average response time is ${avgResponseTime}ms (target: <2s). Consider payload optimization, field selection, and cache warming strategies.`,
        priority: 4,
        impact: avgResponseTime - 2000,
      });
    }

    // Sort by priority then impact
    recommendations.sort((a, b) => {
      if (a.priority !== b.priority) return a.priority - b.priority;
      return b.impact - a.impact;
    });

    return recommendations.map(r => r.text);
  }

  /**
   * T027: Export audit report as JSON
   *
   * @param report - Audit report to export
   * @returns JSON string formatted for developer review
   */
  exportReportAsJson(report: AuditReport): string {
    return JSON.stringify(report, null, 2);
  }

  /**
   * Export findings summary (lightweight version)
   */
  exportFindingsSummary(report: AuditReport): string {
    const summary = {
      generatedAt: new Date(report.generatedAt).toISOString(),
      period: {
        start: new Date(report.periodStart).toISOString(),
        end: new Date(report.periodEnd).toISOString(),
      },
      metrics: {
        totalRequests: report.totalRequests,
        malformedRequests: report.malformedRequests,
        overFetchingInstances: report.overFetchingInstances,
        cacheHitRate: `${(report.cacheHitRate * 100).toFixed(1)}%`,
        avgPayloadSize: `${(report.averagePayloadSize / 1024).toFixed(2)}KB`,
        avgResponseTime: `${report.averageResponseTime}ms`,
      },
      complianceScore: report.complianceScore,
      topRecommendations: report.recommendations.slice(0, 5),
      findingsByCategory: this.groupFindingsByCategory(report.findings),
    };

    return JSON.stringify(summary, null, 2);
  }

  /**
   * Group findings by category for summary
   */
  private groupFindingsByCategory(findings: AuditFinding[]): Record<string, number> {
    const grouped: Record<string, number> = {};

    findings.forEach(finding => {
      grouped[finding.category] = (grouped[finding.category] || 0) + 1;
    });

    return grouped;
  }

  /**
   * Generate console-friendly report
   */
  generateConsoleReport(report: AuditReport): string {
    const lines = [
      '',
      '═══════════════════════════════════════════════════════════════',
      '                    VIS API AUDIT REPORT',
      '═══════════════════════════════════════════════════════════════',
      '',
      `Generated: ${new Date(report.generatedAt).toLocaleString()}`,
      `Period: ${new Date(report.periodStart).toLocaleString()} - ${new Date(report.periodEnd).toLocaleString()}`,
      '',
      '─────────────────────────────────────────────────────────────',
      '  METRICS',
      '─────────────────────────────────────────────────────────────',
      `Total Requests:         ${report.totalRequests}`,
      `Malformed Requests:     ${report.malformedRequests}`,
      `Over-fetching:          ${report.overFetchingInstances}`,
      `Cache Hit Rate:         ${(report.cacheHitRate * 100).toFixed(1)}%`,
      `Avg Payload Size:       ${(report.averagePayloadSize / 1024).toFixed(2)}KB`,
      `Avg Response Time:      ${report.averageResponseTime}ms`,
      `Compliance Score:       ${report.complianceScore}/100`,
      '',
      '─────────────────────────────────────────────────────────────',
      '  TOP RECOMMENDATIONS',
      '─────────────────────────────────────────────────────────────',
      ...report.recommendations.slice(0, 5).map((rec, i) => `${i + 1}. ${rec}`),
      '',
      '═══════════════════════════════════════════════════════════════',
      '',
    ];

    return lines.join('\n');
  }
}
