/**
 * @fileoverview Integration tests for adaptive polling system
 * Tests end-to-end adaptive polling with performance monitoring
 * Part of Story 1.3: Optimize Polling and Field Selection
 */

import { LiveScorePollingService, createLiveScorePollingService } from '../../services/live-score/LiveScorePollingService';
import { VisApiClient } from '../../services/api/VisApiClient';
import { ConnectionCircuitBreaker } from '../../services/ConnectionCircuitBreaker';
import { MatchStatusPollingManager } from '../../services/MatchStatusPollingManager';
import { pollingPerformanceMonitor } from '../../services/PollingPerformanceMonitor';
import { 
  VisApiClientConfig, 
  MatchPollingStatus, 
  FieldSelectionMode, 
  VisApiEndpoint,
  DEFAULT_RETRY_CONFIG 
} from '../../types/api-v2';

// Mock the API responses
jest.mock('../../services/api/VisApiClient');
jest.mock('../../services/ConnectionCircuitBreaker');

describe('Adaptive Polling Integration', () => {
  let pollingService: LiveScorePollingService;
  let mockApiClient: jest.Mocked<VisApiClient>;
  let mockCircuitBreaker: jest.Mocked<ConnectionCircuitBreaker>;
  let statusManager: MatchStatusPollingManager;

  beforeEach(() => {
    // Clear performance monitor
    pollingPerformanceMonitor.clearMetrics();

    // Create mocks
    const config: VisApiClientConfig = {
      baseUrl: 'https://api.test.com',
      timeoutMs: 10000,
      maxRetries: 3,
      retryDelayMs: 1000,
      exponentialBackoff: true,
      enableLogging: false
    };

    mockApiClient = new VisApiClient(config, DEFAULT_RETRY_CONFIG) as jest.Mocked<VisApiClient>;
    mockCircuitBreaker = new ConnectionCircuitBreaker({ 
      failureThreshold: 3,
      resetTimeoutMs: 30000 
    }) as jest.Mocked<ConnectionCircuitBreaker>;
    
    statusManager = new MatchStatusPollingManager();
    
    // Setup default mocks
    mockCircuitBreaker.canExecute.mockReturnValue(true);
    mockCircuitBreaker.onSuccess.mockImplementation();
    mockCircuitBreaker.onFailure.mockImplementation();
    mockCircuitBreaker.getState.mockReturnValue('CLOSED');

    mockApiClient.getBeachLive.mockResolvedValue({
      success: true,
      xmlData: `
        <BeachLive>
          <Version>1</Version>
          <PollDelay>3000</PollDelay>
          <Match MatchNo="123" Status="Running">
            <TeamA>Team A</TeamA>
            <TeamB>Team B</TeamB>
          </Match>
        </BeachLive>
      `,
      responseTime: 150,
      cached: false
    });

    pollingService = new LiveScorePollingService(mockApiClient, mockCircuitBreaker, statusManager);
  });

  afterEach(() => {
    pollingService.stopAllPolling();
    jest.clearAllMocks();
  });

  describe('Adaptive Polling Lifecycle', () => {
    it('should start with correct interval for running matches', async () => {
      const matchNo = 123;
      const callback = jest.fn();

      // Set match as running
      statusManager.updateMatchStatus(matchNo, MatchPollingStatus.RUNNING);

      // Start adaptive polling
      pollingService.startPolling(matchNo, callback, [], true);

      // Wait for first poll
      await new Promise(resolve => setTimeout(resolve, 100));

      // `options: []` e non `undefined`: e' il test stesso a passare `[]` a
      // `startPolling`, e il servizio lo inoltra fedelmente.
      expect(mockApiClient.getBeachLive).toHaveBeenCalledWith({
        matchNo: 123,
        version: undefined,
        options: []
      });

      // Verify performance monitoring recorded the request
      const summary = pollingPerformanceMonitor.getPerformanceSummary();
      expect(summary.totalEvents).toBeGreaterThan(0);
    });

    it('should adapt polling interval based on status changes', async () => {
      const matchNo = 123;
      const callback = jest.fn();

      // Start with scheduled status (30s interval)
      statusManager.updateMatchStatus(matchNo, MatchPollingStatus.SCHEDULED);
      pollingService.startPolling(matchNo, callback, [], true);

      await new Promise(resolve => setTimeout(resolve, 50));

      // Change to running status (3s interval) 
      statusManager.updateMatchStatus(matchNo, MatchPollingStatus.RUNNING);

      // Verify interval change was recorded
      const metrics = pollingPerformanceMonitor.getMetrics();
      expect(metrics.byStatus[MatchPollingStatus.RUNNING]).toBeDefined();
      expect(metrics.byStatus[MatchPollingStatus.SCHEDULED]).toBeDefined();
    });

    it('should stop polling when match finishes', async () => {
      const matchNo = 123;
      const callback = jest.fn();

      // Start with running status
      statusManager.updateMatchStatus(matchNo, MatchPollingStatus.RUNNING);
      pollingService.startPolling(matchNo, callback, [], true);

      expect(pollingService.isPolling(matchNo)).toBe(true);

      // Change to finished
      statusManager.updateMatchStatus(matchNo, MatchPollingStatus.FINISHED);

      // Wait for status change to be processed
      await new Promise(resolve => setTimeout(resolve, 50));

      expect(pollingService.isPolling(matchNo)).toBe(false);
    });
  });

  describe('Field Selection Integration', () => {
    it('should use slim fields for running matches', async () => {
      const matchNo = 123;
      const callback = jest.fn();

      // Set match as running (should use slim fields)
      statusManager.updateMatchStatus(matchNo, MatchPollingStatus.RUNNING);
      pollingService.startPolling(matchNo, callback, [], true);

      await new Promise(resolve => setTimeout(resolve, 50));

      // Verify field optimization was recorded
      const metrics = pollingPerformanceMonitor.getMetrics();
      expect(metrics.byFieldSelection[FieldSelectionMode.SLIM]).toBeDefined();
    });

    it('should use full fields for scheduled matches', async () => {
      const matchNo = 123;
      const callback = jest.fn();

      // Set match as scheduled (should use full fields)
      statusManager.updateMatchStatus(matchNo, MatchPollingStatus.SCHEDULED);
      pollingService.startPolling(matchNo, callback, [], true);

      await new Promise(resolve => setTimeout(resolve, 50));

      // Verify request was recorded
      const summary = pollingPerformanceMonitor.getPerformanceSummary();
      expect(summary.totalEvents).toBeGreaterThan(0);
    });
  });

  describe('Performance Monitoring Integration', () => {
    it('should track bandwidth savings from version-based polling', async () => {
      const matchNo = 123;
      const callback = jest.fn();

      // Mock "no changes" response for second request
      mockApiClient.getBeachLive
        .mockResolvedValueOnce({
          success: true,
          xmlData: `<BeachLive><Version>1</Version><PollDelay>3000</PollDelay></BeachLive>`,
          responseTime: 150,
          cached: false
        })
        .mockResolvedValueOnce({
          success: true,
          xmlData: `<NoChanges>true</NoChanges>`,
          responseTime: 50,
          cached: false
        });

      pollingService.startPolling(matchNo, callback, [], true);

      // Wait for multiple polls
      await new Promise(resolve => setTimeout(resolve, 200));

      const metrics = pollingPerformanceMonitor.getMetrics();
      expect(metrics.totalRequests).toBeGreaterThan(0);
    });

    it('should provide comprehensive performance metrics', async () => {
      const matchNo = 123;
      const callback = jest.fn();

      statusManager.updateMatchStatus(matchNo, MatchPollingStatus.RUNNING);
      pollingService.startPolling(matchNo, callback, [], true);

      await new Promise(resolve => setTimeout(resolve, 100));

      // Test direct access to performance metrics
      const adaptiveMetrics = pollingService.getAdaptivePollingMetrics();
      const summary = pollingService.getPerformanceSummary();

      expect(adaptiveMetrics).toBeDefined();
      expect(adaptiveMetrics.totalRequests).toBeGreaterThanOrEqual(0);
      expect(summary).toBeDefined();
      expect(summary.totalEvents).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Error Handling and Resilience', () => {
    it('should handle API errors gracefully with adaptive polling', async () => {
      const matchNo = 123;
      const callback = jest.fn();

      // Mock API error
      mockApiClient.getBeachLive.mockRejectedValue(new Error('API Error'));

      statusManager.updateMatchStatus(matchNo, MatchPollingStatus.RUNNING);
      pollingService.startPolling(matchNo, callback, [], true);

      await new Promise(resolve => setTimeout(resolve, 100));

      expect(callback).toHaveBeenCalledWith(null, expect.any(Error));
      expect(mockCircuitBreaker.onFailure).toHaveBeenCalled();
    });

    it('should continue polling after circuit breaker recovery', async () => {
      const matchNo = 123;
      const callback = jest.fn();

      // Start with circuit breaker open
      mockCircuitBreaker.canExecute.mockReturnValue(false);

      statusManager.updateMatchStatus(matchNo, MatchPollingStatus.RUNNING);
      pollingService.startPolling(matchNo, callback, [], true);

      await new Promise(resolve => setTimeout(resolve, 50));

      // Restore circuit breaker
      mockCircuitBreaker.canExecute.mockReturnValue(true);

      await new Promise(resolve => setTimeout(resolve, 50));

      // Should be able to continue polling
      expect(pollingService.isPolling(matchNo)).toBe(true);
    });
  });

  describe('Multiple Match Scenarios', () => {
    it('should handle multiple matches with different statuses', async () => {
      const runningMatchNo = 123;
      const scheduledMatchNo = 124;
      const callback1 = jest.fn();
      const callback2 = jest.fn();

      // Setup different statuses
      statusManager.updateMatchStatus(runningMatchNo, MatchPollingStatus.RUNNING);
      statusManager.updateMatchStatus(scheduledMatchNo, MatchPollingStatus.SCHEDULED);

      // La risposta deve dipendere dalla PARTITA.
      //
      // Il doppio restituiva la stessa risposta a entrambe — una partita in
      // corso — e il servizio aggiorna lo stato leggendolo dal contenuto:
      // subito dopo il primo sondaggio la partita "programmata" risultava
      // anch'essa in corso, e la statistica per stato SCHEDULED restava a
      // zero. Il codice ha ragione (il server e' l'autorita' sullo stato); era
      // lo scenario a non essere realistico.
      mockApiClient.getBeachLive.mockImplementation((richiesta: any) => {
        const inCorso = richiesta?.matchNo === runningMatchNo;
        return Promise.resolve({
          success: true,
          xmlData: `
            <BeachLive>
              <Version>1</Version>
              <PollDelay>3</PollDelay>
              <Match MatchNo="${richiesta?.matchNo}" Status="${inCorso ? 'Running' : 'Scheduled'}">
                <TeamA>Team A</TeamA>
                <TeamB>Team B</TeamB>
              </Match>
            </BeachLive>
          `,
          responseTime: 150,
          cached: false,
        });
      });

      // Start polling both
      pollingService.startPolling(runningMatchNo, callback1, [], true);
      pollingService.startPolling(scheduledMatchNo, callback2, [], true);

      await new Promise(resolve => setTimeout(resolve, 100));

      expect(pollingService.isPolling(runningMatchNo)).toBe(true);
      expect(pollingService.isPolling(scheduledMatchNo)).toBe(true);

      const metrics = pollingPerformanceMonitor.getMetrics();
      // NOTA (#94): questa asserzione resta rossa e non e' stata forzata.
      //
      // Misurato: i due sondaggi RIESCONO (getStatistics riporta
      // successfulPolls: 2), gli stati sono corretti ('Running' e
      // 'Scheduled'), le callback scattano — ma `getMetrics()` non vede
      // nessun evento. `recordRequest` sta sulla stessa riga di codice che
      // incrementa `successfulPolls`, e il monitor e' un singolo modulo senza
      // duplicati. La causa non e' stata isolata; forzare il verde qui
      // significherebbe nascondere che una statistica non registra.
      expect(metrics.byStatus[MatchPollingStatus.RUNNING].matchCount).toBeGreaterThan(0);
      expect(metrics.byStatus[MatchPollingStatus.SCHEDULED].matchCount).toBeGreaterThan(0);
    });

    it('should track performance across multiple matches', async () => {
      const matches = [123, 124, 125];
      const callbacks = [jest.fn(), jest.fn(), jest.fn()];

      // Start polling all matches
      matches.forEach((matchNo, index) => {
        statusManager.updateMatchStatus(matchNo, MatchPollingStatus.RUNNING);
        pollingService.startPolling(matchNo, callbacks[index], [], true);
      });

      await new Promise(resolve => setTimeout(resolve, 150));

      const summary = pollingPerformanceMonitor.getPerformanceSummary();
      expect(summary.activeMatches).toBeGreaterThan(0);
      expect(summary.totalEvents).toBeGreaterThan(0);
    });
  });

  describe('Backward Compatibility', () => {
    it('should work without adaptive polling enabled', async () => {
      const matchNo = 123;
      const callback = jest.fn();

      // Start polling without adaptive polling
      pollingService.startPolling(matchNo, callback, [], false);

      await new Promise(resolve => setTimeout(resolve, 100));

      expect(mockApiClient.getBeachLive).toHaveBeenCalled();
      expect(pollingService.isPolling(matchNo)).toBe(true);
    });

    it('should maintain existing statistics interface', () => {
      const stats = pollingService.getStatistics();
      
      expect(stats).toHaveProperty('totalPolls');
      expect(stats).toHaveProperty('successfulPolls');
      expect(stats).toHaveProperty('failureRate');
      expect(stats).toHaveProperty('activePolls');
    });
  });
});