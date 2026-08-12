/**
 * @fileoverview Tests for adaptive polling functionality in LiveScorePollingService
 * Tests status-based interval management and field selection optimization
 * Part of Story 1.3: Optimize Polling and Field Selection
 */

import { LiveScorePollingService } from '../../../services/live-score/LiveScorePollingService';
import { MatchStatusPollingManager } from '../../../services/MatchStatusPollingManager';
import { IVisApiClient, MatchPollingStatus, FieldSelectionMode, GetBeachLiveRequest, VisApiSuccessResponse } from '../../../types/api-v2';
import { ConnectionCircuitBreaker } from '../../../services/ConnectionCircuitBreaker';

// Mock dependencies
jest.mock('../../../hooks/compatibility/CacheServiceCompatibility');
jest.mock('../../../types/beach-live');

describe('LiveScorePollingService - Adaptive Polling', () => {
  let service: LiveScorePollingService;
  let mockVisApiClient: jest.Mocked<IVisApiClient>;
  let mockCircuitBreaker: jest.Mocked<ConnectionCircuitBreaker>;
  let statusPollingManager: MatchStatusPollingManager;
  let mockCallback: jest.Mock;

  // Mock timer functions
  beforeEach(() => {
    jest.useFakeTimers();
    jest.clearAllMocks();

    // Create mocked dependencies
    mockVisApiClient = {
      getBeachLive: jest.fn(),
      testConnection: jest.fn(),
      getConfig: jest.fn()
    } as any;

    mockCircuitBreaker = {
      canExecute: jest.fn().mockReturnValue(true),
      onSuccess: jest.fn(),
      onFailure: jest.fn(),
      getState: jest.fn().mockReturnValue('CLOSED')
    } as any;

    statusPollingManager = new MatchStatusPollingManager();
    mockCallback = jest.fn();

    service = new LiveScorePollingService(
      mockVisApiClient,
      mockCircuitBreaker,
      statusPollingManager
    );
  });

  afterEach(() => {
    service.destroy();
    jest.useRealTimers();
  });

  describe('MatchStatusPollingManager', () => {
    it('should return correct polling configuration for RUNNING matches', () => {
      const config = statusPollingManager.getPollingConfig(MatchPollingStatus.RUNNING);
      
      expect(config).toEqual({
        status: MatchPollingStatus.RUNNING,
        // Gli intervalli sono stati alzati deliberatamente da 3s/30s a
        // 15s/60s dal commit 246a289 ("optimize polling intervals"), per
        // ridurre il carico sul VIS. I test erano rimasti ai valori di prima.
        intervalMs: 15000,
        shouldPoll: true,
        fieldSelectionMode: FieldSelectionMode.SLIM
      });
    });

    it('should return correct polling configuration for SCHEDULED matches', () => {
      const config = statusPollingManager.getPollingConfig(MatchPollingStatus.SCHEDULED);
      
      expect(config).toEqual({
        status: MatchPollingStatus.SCHEDULED,
        intervalMs: 60000,
        shouldPoll: true,
        fieldSelectionMode: FieldSelectionMode.FULL
      });
    });

    it('should return correct polling configuration for FINISHED matches', () => {
      const config = statusPollingManager.getPollingConfig(MatchPollingStatus.FINISHED);
      
      expect(config).toEqual({
        status: MatchPollingStatus.FINISHED,
        intervalMs: 0,
        shouldPoll: false,
        fieldSelectionMode: FieldSelectionMode.FULL
      });
    });

    it('should track match status changes and notify listeners', () => {
      const listener = jest.fn();
      statusPollingManager.addStatusChangeListener(listener);

      const matchNo = 12345;
      const changed1 = statusPollingManager.updateMatchStatus(matchNo, MatchPollingStatus.RUNNING);
      const changed2 = statusPollingManager.updateMatchStatus(matchNo, MatchPollingStatus.RUNNING); // Same status
      const changed3 = statusPollingManager.updateMatchStatus(matchNo, MatchPollingStatus.FINISHED);

      expect(changed1).toBe(true);
      expect(changed2).toBe(false); // No change
      expect(changed3).toBe(true);

      expect(listener).toHaveBeenCalledTimes(2);
      expect(listener).toHaveBeenNthCalledWith(1, matchNo, MatchPollingStatus.SCHEDULED, MatchPollingStatus.RUNNING);
      expect(listener).toHaveBeenNthCalledWith(2, matchNo, MatchPollingStatus.RUNNING, MatchPollingStatus.FINISHED);

      statusPollingManager.removeStatusChangeListener(listener);
    });

    it('should provide performance metrics', () => {
      statusPollingManager.updateMatchStatus(1, MatchPollingStatus.RUNNING);
      statusPollingManager.updateMatchStatus(2, MatchPollingStatus.SCHEDULED);
      statusPollingManager.updateMatchStatus(3, MatchPollingStatus.FINISHED);

      const metrics = statusPollingManager.getPerformanceMetrics();

      expect(metrics).toEqual({
        totalMatches: 3,
        runningMatches: 1,
        scheduledMatches: 1,
        finishedMatches: 1,
        activePolling: 2
      });
    });
  });

  describe('Adaptive Polling Integration', () => {
    const mockSuccessResponse: VisApiSuccessResponse = {
      success: true,
      timestamp: new Date().toISOString(),
      durationMs: 100,
      xmlData: '<BeachLive><Match Status="InProgress" /></BeachLive>'
    };

    beforeEach(() => {
      mockVisApiClient.getBeachLive.mockResolvedValue(mockSuccessResponse);
    });

    it('should start polling with adaptive intervals for RUNNING matches', () => {
      const matchNo = 12345;
      statusPollingManager.updateMatchStatus(matchNo, MatchPollingStatus.RUNNING);

      service.startPolling(matchNo, mockCallback, [], true);

      // Should use 3 second interval for running matches
      expect(service.isPolling(matchNo)).toBe(true);
    });

    it('should start polling with adaptive intervals for SCHEDULED matches', () => {
      const matchNo = 12346;
      statusPollingManager.updateMatchStatus(matchNo, MatchPollingStatus.SCHEDULED);

      service.startPolling(matchNo, mockCallback, [], true);

      // Should use 30 second interval for scheduled matches
      expect(service.isPolling(matchNo)).toBe(true);
    });

    it('should not start polling for FINISHED matches with adaptive polling', () => {
      const matchNo = 12347;
      statusPollingManager.updateMatchStatus(matchNo, MatchPollingStatus.FINISHED);

      service.startPolling(matchNo, mockCallback, [], true);

      // Should not start polling for finished matches
      expect(service.isPolling(matchNo)).toBe(false);
    });

    it('should update match status from API response during adaptive polling', async () => {
      const matchNo = 12348;
      const mockRunningResponse: VisApiSuccessResponse = {
        success: true,
        timestamp: new Date().toISOString(),
        durationMs: 100,
        xmlData: '<BeachLive><Match Status="Running" MatchNo="12348" /></BeachLive>'
      };

      mockVisApiClient.getBeachLive.mockResolvedValue(mockRunningResponse);
      
      // Mock the required beach-live functions
      const { isValidBeachLive } = require('../../../types/beach-live');
      isValidBeachLive.mockReturnValue(true);

      service.startPolling(matchNo, mockCallback, [], true);

      // Advance timers to trigger polling
      await jest.runOnlyPendingTimersAsync();

      // Match status should be updated from response
      expect(statusPollingManager.getMatchStatus(matchNo)).toBe(MatchPollingStatus.RUNNING);
    });

    it('should adjust polling interval when match status changes', async () => {
      const matchNo = 12349;
      
      // Start with scheduled match
      statusPollingManager.updateMatchStatus(matchNo, MatchPollingStatus.SCHEDULED);
      service.startPolling(matchNo, mockCallback, [], true);

      expect(service.isPolling(matchNo)).toBe(true);

      // Change to running status
      statusPollingManager.updateMatchStatus(matchNo, MatchPollingStatus.RUNNING);

      // Should continue polling with new interval
      expect(service.isPolling(matchNo)).toBe(true);

      // Change to finished status
      statusPollingManager.updateMatchStatus(matchNo, MatchPollingStatus.FINISHED);

      // Should stop polling
      expect(service.isPolling(matchNo)).toBe(false);
    });

    it('should handle status mapping from API responses correctly', () => {
      const testCases = [
        { apiStatus: 'InProgress', expected: MatchPollingStatus.RUNNING },
        { apiStatus: 'Running', expected: MatchPollingStatus.RUNNING },
        { apiStatus: 'Live', expected: MatchPollingStatus.RUNNING },
        { apiStatus: 'Scheduled', expected: MatchPollingStatus.SCHEDULED },
        { apiStatus: 'Upcoming', expected: MatchPollingStatus.SCHEDULED },
        { apiStatus: 'NotStarted', expected: MatchPollingStatus.SCHEDULED },
        { apiStatus: 'Finished', expected: MatchPollingStatus.FINISHED },
        { apiStatus: 'Completed', expected: MatchPollingStatus.FINISHED },
        { apiStatus: 'Ended', expected: MatchPollingStatus.FINISHED },
        { apiStatus: 'Unknown', expected: MatchPollingStatus.SCHEDULED }
      ];

      testCases.forEach(({ apiStatus, expected }) => {
        const matchNo = Math.floor(Math.random() * 10000);
        service['updateMatchStatusFromResponse'](matchNo, apiStatus);
        expect(statusPollingManager.getMatchStatus(matchNo)).toBe(expected);
      });
    });
  });

  describe('Backward Compatibility', () => {
    it('should work with traditional polling when adaptive polling is disabled', () => {
      const matchNo = 12350;
      
      service.startPolling(matchNo, mockCallback);

      expect(service.isPolling(matchNo)).toBe(true);
      
      // Should not be affected by status manager changes
      statusPollingManager.updateMatchStatus(matchNo, MatchPollingStatus.FINISHED);
      expect(service.isPolling(matchNo)).toBe(true);
    });

    it('should use default field selection when adaptive polling is disabled', () => {
      const matchNo = 12351;
      
      service.startPolling(matchNo, mockCallback, [], false);

      // Should continue using traditional polling behavior
      expect(service.isPolling(matchNo)).toBe(true);
    });
  });

  describe('Error Handling', () => {
    it('should handle status change listener errors gracefully', () => {
      const errorListener = jest.fn(() => {
        throw new Error('Listener error');
      });
      
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
      
      statusPollingManager.addStatusChangeListener(errorListener);
      statusPollingManager.updateMatchStatus(12352, MatchPollingStatus.RUNNING);

      expect(consoleErrorSpy).toHaveBeenCalledWith('Error in status change listener:', expect.any(Error));
      
      consoleErrorSpy.mockRestore();
      statusPollingManager.removeStatusChangeListener(errorListener);
    });

    it('should handle adaptive polling configuration updates gracefully', () => {
      const matchNo = 12353;
      
      service.startPolling(matchNo, mockCallback, [], true);
      
      // Should handle status changes without errors
      statusPollingManager.updateMatchStatus(matchNo, MatchPollingStatus.RUNNING);
      statusPollingManager.updateMatchStatus(matchNo, MatchPollingStatus.FINISHED);
      statusPollingManager.updateMatchStatus(matchNo, MatchPollingStatus.SCHEDULED);

      // No errors should be thrown
      expect(true).toBe(true);
    });
  });

  describe('Performance Metrics', () => {
    it('should track adaptive polling performance separately', () => {
      const normalMatch = 1000;
      const adaptiveMatch = 2000;

      // Explicitly set status for adaptive match to ensure tracking
      statusPollingManager.updateMatchStatus(adaptiveMatch, MatchPollingStatus.RUNNING);

      service.startPolling(normalMatch, mockCallback, [], false);
      service.startPolling(adaptiveMatch, mockCallback, [], true);

      const serviceStats = service.getStatistics();
      const managerMetrics = statusPollingManager.getPerformanceMetrics();

      expect(serviceStats.activePolls).toBe(2);
      expect(managerMetrics.totalMatches).toBeGreaterThanOrEqual(1);
    });
  });
});

describe('MatchStatusPollingManager - Standalone Tests', () => {
  let manager: MatchStatusPollingManager;

  beforeEach(() => {
    manager = new MatchStatusPollingManager();
  });

  it('should initialize with empty state', () => {
    const metrics = manager.getPerformanceMetrics();
    expect(metrics.totalMatches).toBe(0);
    expect(manager.getAllMatches().size).toBe(0);
  });

  it('should clear all matches', () => {
    manager.updateMatchStatus(1, MatchPollingStatus.RUNNING);
    manager.updateMatchStatus(2, MatchPollingStatus.SCHEDULED);
    
    expect(manager.getPerformanceMetrics().totalMatches).toBe(2);
    
    manager.clear();
    
    expect(manager.getPerformanceMetrics().totalMatches).toBe(0);
  });

  it('should remove individual matches', () => {
    manager.updateMatchStatus(1, MatchPollingStatus.RUNNING);
    manager.updateMatchStatus(2, MatchPollingStatus.SCHEDULED);
    
    expect(manager.getPerformanceMetrics().totalMatches).toBe(2);
    
    manager.removeMatch(1);
    
    expect(manager.getPerformanceMetrics().totalMatches).toBe(1);
    expect(manager.getMatchStatus(1)).toBe(MatchPollingStatus.SCHEDULED); // Default
    expect(manager.getMatchStatus(2)).toBe(MatchPollingStatus.SCHEDULED);
  });

  it('should return readonly map of all matches', () => {
    manager.updateMatchStatus(1, MatchPollingStatus.RUNNING);
    manager.updateMatchStatus(2, MatchPollingStatus.FINISHED);
    
    const allMatches = manager.getAllMatches();
    
    expect(allMatches.get(1)).toBe(MatchPollingStatus.RUNNING);
    expect(allMatches.get(2)).toBe(MatchPollingStatus.FINISHED);
    expect(allMatches.size).toBe(2);
    
    // Check TypeScript readonly type (at compile time the map is readonly)
    expect(allMatches).toBeDefined();
    expect(allMatches instanceof Map).toBe(true);
  });
});