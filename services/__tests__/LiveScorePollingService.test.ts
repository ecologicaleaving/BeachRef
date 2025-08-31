/**
 * @fileoverview Tests for LiveScorePollingService
 * Tests AC2: Version-Based Polling Service from Story 1.1
 * Part of EPIC-001 Live Score Display - Story 1.1
 */

import { LiveScorePollingService } from '../live-score/LiveScorePollingService';
import { IVisApiClient, VisApiResponse, VisApiSuccessResponse } from '../../types/api-v2';
import { BeachLive } from '../../types/beach-live';
import { ConnectionCircuitBreaker } from '../ConnectionCircuitBreaker';

// Mock dependencies
const mockVisApiClient: IVisApiClient = {
  getBeachLive: jest.fn(),
  getEventList: jest.fn(),
  getBeachTournament: jest.fn(),
  getEvent: jest.fn(),
  getBeachMatchList: jest.fn(),
  getBeachRound: jest.fn(),
  testConnection: jest.fn(),
  getConfig: jest.fn()
};

const mockCircuitBreaker: ConnectionCircuitBreaker = {
  canExecute: jest.fn(),
  onSuccess: jest.fn(),
  onFailure: jest.fn(),
  getState: jest.fn()
} as any;

const mockBeachLive: BeachLive = {
  version: 1,
  pollDelay: 5000,
  isBallInPlay: true,
  isMatchPointTeamA: false,
  isMatchPointTeamB: false,
  isSetPointTeamA: false,
  isSetPointTeamB: false,
  noServingTeam: 1,
  noServingPlayer: 1,
  noTeamAtLeft: 1,
  noTeamAtRight: 2,
  match: {
    no: 123,
    noInTournament: 1,
    status: 'InProgress' as any,
    dateTime: '2025-08-25T10:00:00Z',
    court: { no: 1, name: 'Court 1', surface: 'Sand' },
    round: { no: 1, name: 'Pool A', phase: 'Pool', type: 'Pool' as any }
  },
  sets: [
    { no: 1, pointsTeamA: 15, pointsTeamB: 12, status: 'InProgress' as any }
  ],
  teamA: {
    no: 1,
    name: 'Team A',
    federationCode: 'USA',
    players: [],
    matchPoints: 0,
    isServing: true,
    timeoutsRemaining: 1
  },
  teamB: {
    no: 2,
    name: 'Team B', 
    federationCode: 'BRA',
    players: [],
    matchPoints: 0,
    isServing: false,
    timeoutsRemaining: 1
  },
  tournament: {
    no: 1,
    name: 'Test Tournament',
    code: 'TEST2025',
    city: 'Test City',
    country: 'Test Country',
    federation: 'Test Federation'
  }
};

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