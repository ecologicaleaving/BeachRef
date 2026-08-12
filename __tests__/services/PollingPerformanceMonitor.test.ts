/**
 * @fileoverview Tests for PollingPerformanceMonitor
 * Tests performance metrics collection and analysis
 * Part of Story 1.3: Optimize Polling and Field Selection
 */

import { PollingPerformanceMonitor, pollingPerformanceMonitor } from '../../services/PollingPerformanceMonitor';
import { VisApiEndpoint, MatchPollingStatus, FieldSelectionMode } from '../../types/api-v2';

describe('PollingPerformanceMonitor', () => {
  let monitor: PollingPerformanceMonitor;

  beforeEach(() => {
    monitor = new PollingPerformanceMonitor();
  });

  afterEach(() => {
    monitor.clearMetrics();
  });

  describe('Performance Event Recording', () => {
    it('should record request events correctly', () => {
      monitor.recordRequest({
        matchNo: 123,
        endpoint: VisApiEndpoint.GET_BEACH_LIVE,
        status: MatchPollingStatus.RUNNING,
        fieldSelectionMode: FieldSelectionMode.SLIM,
        intervalMs: 3000,
        responseSizeBytes: 1500,
        requestSaved: false
      });

      const summary = monitor.getPerformanceSummary(60000);
      expect(summary.totalEvents).toBe(1);
    });

    it('should record interval changes', () => {
      monitor.recordIntervalChange(123, 5000, 3000, MatchPollingStatus.RUNNING);

      const metrics = monitor.getMetrics();
      // Un cambio di intervallo non e' una richiesta (issue #94): la partita
      // entra nel conteggio delle partite osservate e nella media degli
      // intervalli, ma `requestCount` conta le interrogazioni al VIS, e qui non
      // ne e' stata fatta nessuna. Prima questo campo veniva incrementato
      // proprio qui, e mai da `recordRequest`.
      expect(metrics.byStatus[MatchPollingStatus.RUNNING].requestCount).toBe(0);
      expect(metrics.byStatus[MatchPollingStatus.RUNNING].matchCount).toBe(1);
      expect(metrics.avgPollingIntervalMs).toBe(3000);
    });

    it('should record field optimization events', () => {
      monitor.recordFieldOptimization(
        VisApiEndpoint.GET_BEACH_LIVE,
        FieldSelectionMode.SLIM,
        3,
        200
      );

      const metrics = monitor.getMetrics();
      expect(metrics.byFieldSelection[FieldSelectionMode.SLIM].requestCount).toBe(1);
      expect(metrics.byFieldSelection[FieldSelectionMode.SLIM].totalBytesSaved).toBe(200);
    });
  });

  describe('Metrics Calculation', () => {
    beforeEach(() => {
      // Setup test data
      monitor.recordRequest({
        matchNo: 123,
        endpoint: VisApiEndpoint.GET_BEACH_LIVE,
        status: MatchPollingStatus.RUNNING,
        fieldSelectionMode: FieldSelectionMode.SLIM,
        intervalMs: 3000,
        responseSizeBytes: 1000,
        requestSaved: false
      });

      monitor.recordRequest({
        matchNo: 124,
        endpoint: VisApiEndpoint.GET_BEACH_LIVE,
        status: MatchPollingStatus.RUNNING,
        fieldSelectionMode: FieldSelectionMode.SLIM,
        intervalMs: 3000,
        responseSizeBytes: 0,
        requestSaved: true
      });

      monitor.recordFieldOptimization(
        VisApiEndpoint.GET_BEACH_LIVE,
        FieldSelectionMode.SLIM,
        3,
        500
      );
    });

    it('should calculate request savings correctly', () => {
      const metrics = monitor.getMetrics();
      
      expect(metrics.totalRequests).toBe(2);
      expect(metrics.requestsSaved).toBe(1);
      expect(metrics.requestSavingsPercent).toBe(50);
    });

    it('should calculate bandwidth savings', () => {
      const metrics = monitor.getMetrics();
      
      expect(metrics.bandwidthSavedBytes).toBe(500);
      expect(metrics.bandwidthSavingsPercent).toBeGreaterThan(0);
    });

    it('should track metrics by status', () => {
      monitor.recordIntervalChange(123, 5000, 3000, MatchPollingStatus.RUNNING);
      monitor.recordIntervalChange(124, 30000, 5000, MatchPollingStatus.SCHEDULED);

      const metrics = monitor.getMetrics();
      
      // Le due richieste del beforeEach sono entrambe RUNNING (partite 123 e
      // 124); i due cambi di intervallo non aggiungono richieste, ma portano
      // la 124 anche fra le partite osservate in stato SCHEDULED.
      expect(metrics.byStatus[MatchPollingStatus.RUNNING].requestCount).toBe(2);
      expect(metrics.byStatus[MatchPollingStatus.RUNNING].matchCount).toBe(2);
      expect(metrics.byStatus[MatchPollingStatus.SCHEDULED].requestCount).toBe(0);
      expect(metrics.byStatus[MatchPollingStatus.SCHEDULED].matchCount).toBe(1);
      expect(metrics.byStatus[MatchPollingStatus.RUNNING].avgIntervalMs).toBe(3000);
      expect(metrics.byStatus[MatchPollingStatus.SCHEDULED].avgIntervalMs).toBe(5000);
    });

    it('should track metrics by field selection mode', () => {
      const metrics = monitor.getMetrics();
      
      expect(metrics.byFieldSelection[FieldSelectionMode.SLIM].requestCount).toBe(1);
      expect(metrics.byFieldSelection[FieldSelectionMode.SLIM].totalBytesSaved).toBe(500);
    });

    it('should track metrics by endpoint', () => {
      const metrics = monitor.getMetrics();
      
      expect(metrics.byEndpoint[VisApiEndpoint.GET_BEACH_LIVE].requestCount).toBe(2);
      expect(metrics.byEndpoint[VisApiEndpoint.GET_BEACH_LIVE].avgResponseSizeBytes).toBe(500);
    });
  });

  describe('Performance Summary', () => {
    it('should provide quick performance overview', () => {
      monitor.recordRequest({
        matchNo: 123,
        endpoint: VisApiEndpoint.GET_BEACH_LIVE,
        status: MatchPollingStatus.RUNNING,
        fieldSelectionMode: FieldSelectionMode.SLIM,
        intervalMs: 3000,
        responseSizeBytes: 1000,
        requestSaved: true
      });

      monitor.recordIntervalChange(123, 5000, 3000, MatchPollingStatus.RUNNING);
      monitor.recordFieldOptimization(VisApiEndpoint.GET_BEACH_LIVE, FieldSelectionMode.SLIM, 3, 300);

      const summary = monitor.getPerformanceSummary();
      
      expect(summary.requestSavingsPercent).toBe(100);
      expect(summary.bandwidthSavingsPercent).toBeGreaterThan(0);
      expect(summary.avgIntervalMs).toBe(3000);
      expect(summary.totalEvents).toBe(3);
    });
  });

  describe('Memory Management', () => {
    it('should limit event storage to prevent memory leaks', () => {
      // Add more than max events
      for (let i = 0; i < 10005; i++) {
        monitor.recordRequest({
          matchNo: i,
          endpoint: VisApiEndpoint.GET_BEACH_LIVE,
          status: MatchPollingStatus.RUNNING,
          fieldSelectionMode: FieldSelectionMode.SLIM,
          intervalMs: 3000,
          responseSizeBytes: 100,
          requestSaved: false
        });
      }

      const exportData = monitor.exportMetrics();
      expect(exportData.rawEvents.length).toBeLessThanOrEqual(10000);
    });

    it('should clear metrics when requested', () => {
      monitor.recordRequest({
        matchNo: 123,
        endpoint: VisApiEndpoint.GET_BEACH_LIVE,
        status: MatchPollingStatus.RUNNING,
        fieldSelectionMode: FieldSelectionMode.SLIM,
        intervalMs: 3000,
        responseSizeBytes: 100,
        requestSaved: false
      });

      expect(monitor.getPerformanceSummary().totalEvents).toBe(1);
      
      monitor.clearMetrics();
      
      expect(monitor.getPerformanceSummary().totalEvents).toBe(0);
    });
  });

  describe('Time Range Filtering', () => {
    it('should filter metrics by time range', () => {
      const now = Date.now();
      
      // Mock older event
      const oldEvent = {
        matchNo: 123,
        endpoint: VisApiEndpoint.GET_BEACH_LIVE,
        status: MatchPollingStatus.RUNNING,
        fieldSelectionMode: FieldSelectionMode.SLIM,
        intervalMs: 3000,
        responseSizeBytes: 100,
        requestSaved: false
      };
      
      monitor.recordRequest(oldEvent);
      
      // Get metrics for last 1 second (should include recent event)
      const recentMetrics = monitor.getMetrics(1000);
      expect(recentMetrics.totalRequests).toBe(1);
      
      // Get metrics for a very short time range (may exclude event depending on timing)
      const veryRecentMetrics = monitor.getMetrics(1);
      expect(veryRecentMetrics.totalRequests).toBeLessThanOrEqual(1);
    });
  });

  describe('Export Functionality', () => {
    it('should export metrics and raw events', () => {
      monitor.recordRequest({
        matchNo: 123,
        endpoint: VisApiEndpoint.GET_BEACH_LIVE,
        status: MatchPollingStatus.RUNNING,
        fieldSelectionMode: FieldSelectionMode.SLIM,
        intervalMs: 3000,
        responseSizeBytes: 100,
        requestSaved: false
      });

      const exportData = monitor.exportMetrics();
      
      expect(exportData.metrics).toBeDefined();
      expect(exportData.rawEvents).toBeDefined();
      expect(exportData.rawEvents.length).toBe(1);
      expect(exportData.metrics.totalRequests).toBe(1);
    });
  });

  describe('Singleton Instance', () => {
    it('should provide singleton instance', () => {
      expect(pollingPerformanceMonitor).toBeInstanceOf(PollingPerformanceMonitor);
      
      pollingPerformanceMonitor.recordRequest({
        matchNo: 999,
        endpoint: VisApiEndpoint.GET_BEACH_LIVE,
        status: MatchPollingStatus.RUNNING,
        fieldSelectionMode: FieldSelectionMode.SLIM,
        intervalMs: 3000,
        responseSizeBytes: 100,
        requestSaved: false
      });

      expect(pollingPerformanceMonitor.getPerformanceSummary().totalEvents).toBe(1);
      
      // Clean up
      pollingPerformanceMonitor.clearMetrics();
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty metrics gracefully', () => {
      const metrics = monitor.getMetrics();
      
      expect(metrics.totalRequests).toBe(0);
      expect(metrics.requestSavingsPercent).toBe(0);
      expect(metrics.bandwidthSavingsPercent).toBe(0);
      expect(metrics.avgPollingIntervalMs).toBe(5000); // Default
    });

    it('should handle missing optional fields in events', () => {
      monitor.recordRequest({
        matchNo: 123,
        endpoint: VisApiEndpoint.GET_BEACH_LIVE
      });

      const metrics = monitor.getMetrics();
      expect(metrics.totalRequests).toBe(1);
    });

    it('should handle bandwidth calculation with no field data', () => {
      monitor.recordRequest({
        matchNo: 123,
        endpoint: VisApiEndpoint.GET_BEACH_LIVE,
        responseSizeBytes: undefined
      });

      const metrics = monitor.getMetrics();
      expect(metrics.bandwidthSavedBytes).toBe(0);
    });
  });
});