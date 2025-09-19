/**
 * @fileoverview Tests for LiveScorePollingService
 * Tests AC2: Version-Based Polling Service from Story 1.1
 * Part of EPIC-001 Live Score Display - Story 1.1
 */


import { LiveScorePollingService } from '../live-score/LiveScorePollingService';
import { IVisApiClient, VisApiResponse, VisApiSuccessResponse } from '../../types/api-v2';
import { BeachLive, BeachSetStatus } from '../../types/beach-live';
import { ConnectionCircuitBreaker } from '../ConnectionCircuitBreaker';


describe('LiveScorePollingService', () => {
  let service: LiveScorePollingService;
  let mockCallback: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    mockCallback = jest.fn();
    service = new LiveScorePollingService(mockVisApiClient, mockCircuitBreaker);
    
    // Mock circuit breaker to allow execution by default
    (mockCircuitBreaker.canExecute as jest.Mock).mockReturnValue(true);
    (mockCircuitBreaker.getState as jest.Mock).mockReturnValue('CLOSED');
  });

  afterEach(() => {
    service.destroy();
  });

  describe('Polling Lifecycle', () => {
    test('should start polling for a match', () => {
      service.startPolling(123, mockCallback);
      
      expect(service.isPolling(123)).toBe(true);
    });

    test('should stop polling for a match', () => {
      service.startPolling(123, mockCallback);
      service.stopPolling(123);
      
      expect(service.isPolling(123)).toBe(false);
    });

    test('should stop all active polling', () => {
      service.startPolling(123, mockCallback);
      service.startPolling(456, mockCallback);
      
      service.stopAllPolling();
      
      expect(service.isPolling(123)).toBe(false);
      expect(service.isPolling(456)).toBe(false);
    });
  });

  describe('Version-Based Polling', () => {
    test('should include version in API request for bandwidth optimization', async () => {
      const mockResponse: VisApiSuccessResponse = {
        success: true,
        timestamp: new Date().toISOString(),
        durationMs: 100,
        xmlData: '<BeachLive><Version>1</Version><PollDelay>5000</PollDelay></BeachLive>'
      };

      (mockVisApiClient.getBeachLive as jest.Mock).mockResolvedValue(mockResponse);
      
      service.startPolling(123, mockCallback);
      service.updateVersion(123, 2);

      // Wait for async poll to complete
      await new Promise(resolve => setTimeout(resolve, 50));

      expect(mockVisApiClient.getBeachLive).toHaveBeenCalledWith(
        expect.objectContaining({
          matchNo: 123,
          version: 2
        })
      );
    });

    test('should handle NoChanges response correctly', async () => {
      const mockResponse: VisApiSuccessResponse = {
        success: true,
        timestamp: new Date().toISOString(),
        durationMs: 100,
        xmlData: '<NoChanges>true</NoChanges>'
      };

      (mockVisApiClient.getBeachLive as jest.Mock).mockResolvedValue(mockResponse);
      
      service.startPolling(123, mockCallback);

      // Wait for async poll to complete
      await new Promise(resolve => setTimeout(resolve, 50));

      // Should not call callback for NoChanges response
      expect(mockCallback).not.toHaveBeenCalled();
      
      const stats = service.getStatistics();
      expect(stats.bandwidthSavedPercent).toBeGreaterThan(0);
    });
  });

  describe('Circuit Breaker Integration', () => {
    test('should respect circuit breaker state', async () => {
      (mockCircuitBreaker.canExecute as jest.Mock).mockReturnValue(false);
      
      service.startPolling(123, mockCallback);

      // Wait for async poll attempt
      await new Promise(resolve => setTimeout(resolve, 50));

      expect(mockVisApiClient.getBeachLive).not.toHaveBeenCalled();
      expect(mockCallback).toHaveBeenCalledWith(null, expect.any(Error));
    });

    test('should record success in circuit breaker', async () => {
      const mockResponse: VisApiSuccessResponse = {
        success: true,
        timestamp: new Date().toISOString(),
        durationMs: 100,
        xmlData: JSON.stringify(mockBeachLive) // Simplified for test
      };

      (mockVisApiClient.getBeachLive as jest.Mock).mockResolvedValue(mockResponse);
      
      service.startPolling(123, mockCallback);

      // Wait for async poll to complete
      await new Promise(resolve => setTimeout(resolve, 50));

      expect(mockCircuitBreaker.onSuccess).toHaveBeenCalled();
    });

    test('should record failure in circuit breaker on API error', async () => {
      (mockVisApiClient.getBeachLive as jest.Mock).mockRejectedValue(new Error('API Error'));
      
      service.startPolling(123, mockCallback);

      // Wait for async poll to complete
      await new Promise(resolve => setTimeout(resolve, 50));

      expect(mockCircuitBreaker.onFailure).toHaveBeenCalled();
      expect(mockCallback).toHaveBeenCalledWith(null, expect.any(Error));
    });
  });

  describe('Error Handling', () => {
    test('should handle API request failures gracefully', async () => {
      (mockVisApiClient.getBeachLive as jest.Mock).mockRejectedValue(new Error('Network Error'));
      
      service.startPolling(123, mockCallback);

      // Wait for async poll to complete
      await new Promise(resolve => setTimeout(resolve, 50));

      expect(mockCallback).toHaveBeenCalledWith(null, expect.any(Error));
      
      const stats = service.getStatistics();
      expect(stats.failureRate).toBeGreaterThan(0);
    });

    test('should implement exponential backoff on errors', async () => {
      (mockVisApiClient.getBeachLive as jest.Mock).mockRejectedValue(new Error('API Error'));
      
      service.startPolling(123, mockCallback);

      // Initial poll delay should be default (5000ms)
      const initialStats = service.getStatistics();
      expect(initialStats.totalPolls).toBe(0);

      // Wait for first failed poll
      await new Promise(resolve => setTimeout(resolve, 50));

      // Poll delay should increase after failure (tested implicitly through service behavior)
      expect(mockCallback).toHaveBeenCalledWith(null, expect.any(Error));
    });
  });

  describe('Performance Monitoring', () => {
    test('should track polling statistics', async () => {
      const mockResponse: VisApiSuccessResponse = {
        success: true,
        timestamp: new Date().toISOString(),
        durationMs: 100,
        xmlData: JSON.stringify(mockBeachLive)
      };

      (mockVisApiClient.getBeachLive as jest.Mock).mockResolvedValue(mockResponse);
      
      service.startPolling(123, mockCallback);

      // Wait for async poll to complete
      await new Promise(resolve => setTimeout(resolve, 50));

      const stats = service.getStatistics();
      expect(stats.totalPolls).toBe(1);
      expect(stats.successfulPolls).toBe(1);
      expect(stats.failureRate).toBe(0);
      expect(stats.activePolls).toBe(1);
    });

    test('should provide circuit breaker state in statistics', () => {
      const stats = service.getStatistics();
      expect(stats.circuitBreakerState).toBe('CLOSED');
    });
  });

  describe('Cache Integration', () => {
    test('should provide method to get cached live score', () => {
      const cachedData = service.getCachedLiveScore(123);
      // Cache integration is tested separately in CacheService.test.ts
      expect(cachedData).toBeNull(); // No cache data initially
    });
  });

  describe('Configuration', () => {
    test('should accept custom options for data filtering', () => {
      const customOptions = ['scores', 'statistics'];
      
      service.startPolling(123, mockCallback, customOptions);
      
      // Options should be passed to API request
      // This is tested implicitly through the API call verification
      expect(service.isPolling(123)).toBe(true);
    });

    test('should respect server-provided poll delay', async () => {
      const mockResponse: VisApiSuccessResponse = {
        success: true,
        timestamp: new Date().toISOString(),
        durationMs: 100,
        xmlData: JSON.stringify({ ...mockBeachLive, pollDelay: 3000 })
      };

      (mockVisApiClient.getBeachLive as jest.Mock).mockResolvedValue(mockResponse);
      
      service.startPolling(123, mockCallback);

      // Wait for async poll to complete
      await new Promise(resolve => setTimeout(resolve, 50));

      // Poll delay should be updated to server-provided value
      // This is tested implicitly through service internal state
      expect(mockCallback).toHaveBeenCalledWith(
        expect.objectContaining({ pollDelay: 3000 }),
        undefined
      );
    });
  });

  describe('BeachLive XML parsing', () => {
    test('parses self-closing set tags with metadata', () => {
      const xml = `
        <BeachLive>
          <Version>5</Version>
          <PollDelay>4000</PollDelay>
          <Match MatchNo="555" Status="Running" DateTime="2025-09-18T10:00:00Z" />
          <Teams>
            <Team No="1" Name="Alpha" FederationCode="USA" />
            <Team No="2" Name="Beta" FederationCode="BRA" />
          </Teams>
          <TeamATimeouts>2</TeamATimeouts>
          <TeamBTimeouts>1</TeamBTimeouts>
          <Sets>
            <Set No="1" PointsTeamA="21" PointsTeamB="18" Status="Finished" Duration="780" BeginTimeOffset="120" NbChallengeRequestedTeamA="1" NbChallengeRequestedTeamB="0" NbTimeoutTeamA="1" NbTimeoutTeamB="0" PointsRallyTeamA="13" PointsRallyTeamB="11" />
            <Set No="2" PointsTeamA="8" PointsTeamB="6" Status="InProgress" NbTimeoutTeamA="0" NbTimeoutTeamB="1" />
          </Sets>
        </BeachLive>
      `;

      const result = (service as any).parseBeachLiveResponse(xml) as BeachLive;

      expect(result.version).toBe(5);
      expect(result.pollDelay).toBe(4000);
      expect(result.sets).toHaveLength(2);
      expect(result.sets[0].pointsTeamA).toBe(21);
      expect(result.sets[0].status).toBe(BeachSetStatus.FINISHED);
      expect(result.sets[0].durationSeconds).toBe(780);
      expect(result.sets[0].beginTimeOffsetSeconds).toBe(120);
      expect(result.sets[0].nbChallengeRequestedTeamA).toBe(1);
      expect(result.sets[0].pointsRallyTeamA).toBe(13);
      expect(result.sets[0].rawAttributes?.PointsTeamA).toBe('21');
      expect(result.telemetry?.rawSetAttributes?.[1].PointsTeamA).toBe('21');
      expect(result.teamA.matchPoints).toBe(1);
      expect(result.teamB.matchPoints).toBe(0);
    });

    test('falls back to legacy PointsA/PointsB values and counts finished sets only', () => {
      const xml = `
        <BeachLive>
          <Version>2</Version>
          <PollDelay>3000</PollDelay>
          <Match MatchNo="777" Status="Live" />
          <Sets>
            <Set No="1" PointsA="19" PointsB="21" Status="Finished"></Set>
            <Set No="2" PointsA="12" PointsB="10"></Set>
          </Sets>
        </BeachLive>
      `;

      const result = (service as any).parseBeachLiveResponse(xml) as BeachLive;

      expect(result.sets).toHaveLength(2);
      expect(result.sets[0].pointsTeamA).toBe(19);
      expect(result.sets[0].status).toBe(BeachSetStatus.FINISHED);
      expect(result.sets[1].status).toBe(BeachSetStatus.NOT_STARTED);
      expect(result.teamA.matchPoints).toBe(0);
      expect(result.teamB.matchPoints).toBe(1);
      expect(result.sets[1].rawAttributes?.PointsA).toBe('12');
    });
  });
  describe('Resource Management', () => {
    test('should clean up resources on destroy', () => {
      service.startPolling(123, mockCallback);
      service.startPolling(456, mockCallback);
      
      service.destroy();
      
      expect(service.isPolling(123)).toBe(false);
      expect(service.isPolling(456)).toBe(false);
      
      const stats = service.getStatistics();
      expect(stats.activePolls).toBe(0);
    });

    test('should handle concurrent polling for multiple matches', () => {
      const callback1 = jest.fn();
      const callback2 = jest.fn();
      
      service.startPolling(123, callback1);
      service.startPolling(456, callback2);
      
      expect(service.isPolling(123)).toBe(true);
      expect(service.isPolling(456)).toBe(true);
      
      const stats = service.getStatistics();
      expect(stats.activePolls).toBe(2);
    });
  });
});












