/**
 * useApiAudit Hook
 *
 * React hook for accessing API audit data in development mode.
 * Provides real-time audit insights for debugging and optimization.
 *
 * Feature: specs/001-vis-api-optimization
 * Tasks: T026, T027
 */

import { useState, useEffect, useCallback } from 'react';
import { ApiRequest, AuditFinding, AuditReport } from '../types/audit';
import { ApiAuditService } from '../services/monitoring/ApiAuditService';
import { AuditStorageService } from '../services/monitoring/AuditStorageService';
import { AuditReportGenerator } from '../services/monitoring/AuditReportGenerator';

/**
 * Hook return type
 */
export interface UseApiAuditReturn {
  /** All captured API requests */
  requests: ApiRequest[];
  /** All audit findings */
  findings: AuditFinding[];
  /** Latest audit report (if generated) */
  latestReport: AuditReport | null;
  /** Whether audit is enabled (__DEV__ only) */
  isEnabled: boolean;
  /** Generate a new audit report */
  generateReport: (periodStart?: number, periodEnd?: number) => AuditReport | null;
  /** Export report as JSON string */
  exportReportJson: (report?: AuditReport) => string | null;
  /** Export findings summary */
  exportSummary: (report?: AuditReport) => string | null;
  /** Clear all audit data */
  clearAudit: () => void;
  /** Refresh audit data from storage */
  refresh: () => void;
  /** Get audit metrics */
  metrics: {
    totalRequests: number;
    malformedCount: number;
    overFetchingCount: number;
    cacheHitRate: number;
    avgPayloadSize: number;
    avgResponseTime: number;
  };
}

/**
 * useApiAudit Hook
 *
 * Access API audit data and generate reports in development mode.
 *
 * **Usage:**
 * ```typescript
 * const { requests, findings, generateReport, metrics } = useApiAudit();
 *
 * // Generate report for last hour
 * const report = generateReport(Date.now() - 3600000, Date.now());
 *
 * // Export as JSON
 * const json = exportReportJson(report);
 * console.log(json);
 * ```
 *
 * @example
 * ```typescript
 * function AuditDashboard() {
 *   const { metrics, findings, generateReport } = useApiAudit();
 *
 *   return (
 *     <View>
 *       <Text>Total Requests: {metrics.totalRequests}</Text>
 *       <Text>Malformed: {metrics.malformedCount}</Text>
 *       <Text>Cache Hit Rate: {(metrics.cacheHitRate * 100).toFixed(1)}%</Text>
 *       <Button onPress={() => {
 *         const report = generateReport();
 *         console.log(report);
 *       }}>
 *         Generate Report
 *       </Button>
 *     </View>
 *   );
 * }
 * ```
 */
export function useApiAudit(): UseApiAuditReturn {
  const [requests, setRequests] = useState<ApiRequest[]>([]);
  const [findings, setFindings] = useState<AuditFinding[]>([]);
  const [latestReport, setLatestReport] = useState<AuditReport | null>(null);
  const [isEnabled] = useState(__DEV__);

  // Get service instances
  const auditService = ApiAuditService.getInstance();
  const storageService = AuditStorageService.getInstance();
  const reportGenerator = new AuditReportGenerator();

  /**
   * Load audit data from services
   */
  const refresh = useCallback(() => {
    if (!isEnabled) return;

    try {
      // Load from in-memory service
      const memoryRequests = auditService.getAllRequests();
      const memoryFindings = auditService.getAllFindings();

      // Load from storage (persisted data)
      const storedRequests = storageService.getRequests();
      const storedFindings = storageService.getFindings();
      const storedReport = storageService.getLatestReport();

      // Merge memory and storage (deduplicate by ID)
      const allRequests = [
        ...memoryRequests,
        ...storedRequests.filter(sr => !memoryRequests.find(mr => mr.id === sr.id)),
      ];

      const allFindings = [
        ...memoryFindings,
        ...storedFindings.filter(sf => !memoryFindings.find(mf => mf.id === sf.id)),
      ];

      setRequests(allRequests);
      setFindings(allFindings);
      setLatestReport(storedReport);
    } catch (error) {
      console.error('[useApiAudit] Failed to refresh audit data:', error);
    }
  }, [isEnabled]);

  /**
   * Load data on mount and set up refresh interval
   */
  useEffect(() => {
    if (!isEnabled) return;

    // Initial load
    refresh();

    // Auto-refresh every 10 seconds
    const interval = setInterval(refresh, 10000);

    return () => clearInterval(interval);
  }, [isEnabled, refresh]);

  /**
   * Generate audit report (T024)
   */
  const generateReport = useCallback(
    (periodStart?: number, periodEnd?: number): AuditReport | null => {
      if (!isEnabled) return null;

      try {
        const start = periodStart || Date.now() - 3600000; // Default: last hour
        const end = periodEnd || Date.now();

        // Filter requests and findings within period
        const periodRequests = requests.filter(
          r => r.timestamp >= start && r.timestamp <= end
        );

        const periodFindings = findings.filter(
          f => f.timestamp >= start && f.timestamp <= end
        );

        // Generate report
        const report = reportGenerator.generateReport(
          periodRequests,
          periodFindings,
          start,
          end
        );

        // Store report
        storageService.storeReport(report);
        setLatestReport(report);

        // Log console-friendly report
        console.log(reportGenerator.generateConsoleReport(report));

        return report;
      } catch (error) {
        console.error('[useApiAudit] Failed to generate report:', error);
        return null;
      }
    },
    [isEnabled, requests, findings]
  );

  /**
   * T027: Export report as JSON
   */
  const exportReportJson = useCallback(
    (report?: AuditReport): string | null => {
      if (!isEnabled) return null;

      try {
        const targetReport = report || latestReport;
        if (!targetReport) return null;

        return reportGenerator.exportReportAsJson(targetReport);
      } catch (error) {
        console.error('[useApiAudit] Failed to export report:', error);
        return null;
      }
    },
    [isEnabled, latestReport]
  );

  /**
   * Export findings summary
   */
  const exportSummary = useCallback(
    (report?: AuditReport): string | null => {
      if (!isEnabled) return null;

      try {
        const targetReport = report || latestReport;
        if (!targetReport) return null;

        return reportGenerator.exportFindingsSummary(targetReport);
      } catch (error) {
        console.error('[useApiAudit] Failed to export summary:', error);
        return null;
      }
    },
    [isEnabled, latestReport]
  );

  /**
   * Clear all audit data
   */
  const clearAudit = useCallback(() => {
    if (!isEnabled) return;

    try {
      auditService.clearAudit();
      storageService.clearAll();
      setRequests([]);
      setFindings([]);
      setLatestReport(null);
      console.log('[useApiAudit] Cleared all audit data');
    } catch (error) {
      console.error('[useApiAudit] Failed to clear audit:', error);
    }
  }, [isEnabled]);

  /**
   * Calculate real-time metrics
   */
  const metrics = {
    totalRequests: requests.length,
    malformedCount: new Set(
      findings
        .filter(f => f.category === 'malformed' || f.category === 'incorrect-parameter')
        .map(f => f.apiRequestId)
    ).size,
    overFetchingCount: findings.filter(f => f.category === 'over-fetching').length,
    cacheHitRate: requests.length > 0
      ? requests.filter(r => r.cacheHit).length / requests.length
      : 0,
    avgPayloadSize: requests.length > 0
      ? Math.round(requests.reduce((sum, r) => sum + r.payloadSize, 0) / requests.length)
      : 0,
    avgResponseTime: requests.length > 0
      ? Math.round(requests.reduce((sum, r) => sum + r.responseTime, 0) / requests.length)
      : 0,
  };

  return {
    requests,
    findings,
    latestReport,
    isEnabled,
    generateReport,
    exportReportJson,
    exportSummary,
    clearAudit,
    refresh,
    metrics,
  };
}
