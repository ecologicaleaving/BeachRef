/**
 * Unit tests for useLiveScores hook
 * Part of EPIC-001 Live Score Display - Story 1.3
 */

import { renderHook, act, waitFor } from '@testing-library/react-native';
import { useLiveScores } from '../useLiveScores';
import { LiveScorePollingService } from '../../services/live-score/LiveScorePollingService';
import { BeachLive } from '../../types/beach-live';

// Mock dependencies
jest.mock('@react-native-community/netinfo', () => ({
  addEventListener: jest.fn(() => jest.fn()),
  fetch: () => Promise.resolve({ isConnected: true })
}));

// Nessun `jest.mock('react-native')` qui: vedi TESTING.md regola 2. Il mock
// globale di `jest.env.js` fornisce gia' esattamente questo `AppState`
// (`currentState: 'active'` e un `addEventListener` che ritorna `{ remove }`),
// ma senza cancellare il resto del modulo (issue #94).

jest.mock('@react-navigation/native', () => ({
  useFocusEffect: jest.fn((callback) => {
    // Simulate screen focus
    const cleanup = callback();
    return cleanup;
  })
}));

// Mock the polling service
const mockPollingService = {
  startPolling: jest.fn(),
  stopPolling: jest.fn(),
  stopAllPolling: jest.fn(),
  getCachedLiveScore: jest.fn(),
  getStatistics: jest.fn(() => ({
    totalPolls: 0,
    successfulPolls: 0,
    failureRate: 0,
    bandwidthSavedPercent: 0,
    activePolls: 0,
    circuitBreakerState: 'CLOSED'
  })),
  destroy: jest.fn()
} as unknown as LiveScorePollingService;

jest.mock('../../services/live-score/LiveScorePollingService', () => ({
  createLiveScorePollingService: jest.fn(() => mockPollingService)
}));

jest.mock('../../services/api/VisApiClient', () => ({
  VisApiClient: {
    getInstance: jest.fn(() => ({}))
  }
}));

jest.mock('../../services/ConnectionCircuitBreaker');

const mockBeachLive: BeachLive = {
  version: 1,
  pollDelay: 5000,
  isBallInPlay: false,
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
    status: 'InProgress',
    dateTime: '2025-08-25T10:00:00Z',
    court: { no: 1, name: 'Court 1', surface: 'Sand' },
    round: { no: 1, name: 'Pool A', phase: 'Pool', type: 'Pool' }
  },
  sets: [
    { no: 1, pointsTeamA: 21, pointsTeamB: 18, status: 'Completed' },
    { no: 2, pointsTeamA: 15, pointsTeamB: 12, status: 'InProgress' }
  ],
  teamA: {
    no: 1,
    name: 'Team A',
    federationCode: 'USA',
    players: [],
    matchPoints: 1,
    isServing: true,
    timeoutsRemaining: 1
  },
  teamB: {
    no: 2,
    name: 'Team B',
    federationCode: 'CAN',
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
    federation: 'FIVB'
  }
};

describe('useLiveScores', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockPollingService.getCachedLiveScore.mockReturnValue(null);
    mockPollingService.getStatistics.mockReturnValue({
      totalPolls: 0,
      successfulPolls: 0,
      failureRate: 0,
      bandwidthSavedPercent: 0,
      activePolls: 0,
      circuitBreakerState: 'CLOSED'
    });
  });

  it('should initialize with empty live scores when no match numbers provided', () => {
    const { result } = renderHook(() => useLiveScores({
      matchNumbers: []
    }));

    expect(result.current.liveScores).toEqual({});
    expect(result.current.isLoading).toBe(false);
    expect(result.current.isPolling).toBe(false);
    expect(result.current.isOnline).toBe(true);
  });

  it('should initialize live score states for provided match numbers', async () => {
    const matchNumbers = [123, 456];
    
    const { result } = renderHook(() => useLiveScores({
      matchNumbers,
      autoStart: false // Don't auto-start for this test
    }));

    await waitFor(() => {
      expect(Object.keys(result.current.liveScores)).toEqual(['123', '456']);
    });

    expect(result.current.liveScores[123]).toEqual({
      matchNo: 123,
      liveScore: null,
      isLoading: false,
      error: null,
      isPolling: false,
      lastUpdated: null
    });

    expect(result.current.liveScores[456]).toEqual({
      matchNo: 456,
      liveScore: null,
      isLoading: false,
      error: null,
      isPolling: false,
      lastUpdated: null
    });
  });

  it('should start polling when autoStart is enabled', async () => {
    const matchNumbers = [123];
    
    renderHook(() => useLiveScores({
      matchNumbers,
      autoStart: true
    }));

    await waitFor(() => {
      expect(mockPollingService.startPolling).toHaveBeenCalledWith(
        123,
        expect.any(Function)
      );
    });
  });

  it('should not start polling when autoStart is disabled', async () => {
    const matchNumbers = [123];
    
    renderHook(() => useLiveScores({
      matchNumbers,
      autoStart: false
    }));

    await waitFor(() => {
      expect(mockPollingService.startPolling).not.toHaveBeenCalled();
    });
  });

  it('should handle live score updates from polling service', async () => {
    const matchNumbers = [123];
    let liveScoreCallback: Function;

    mockPollingService.startPolling.mockImplementation((matchNo, callback) => {
      liveScoreCallback = callback;
    });

    const { result } = renderHook(() => useLiveScores({
      matchNumbers,
      autoStart: true
    }));

    await waitFor(() => {
      expect(mockPollingService.startPolling).toHaveBeenCalled();
    });

    // Simulate live score update
    act(() => {
      liveScoreCallback!(mockBeachLive);
    });

    await waitFor(() => {
      expect(result.current.liveScores[123].liveScore).toEqual(mockBeachLive);
      expect(result.current.liveScores[123].isLoading).toBe(false);
      expect(result.current.liveScores[123].error).toBeNull();
      expect(result.current.liveScores[123].lastUpdated).toBeInstanceOf(Date);
    });
  });

  it('should handle polling errors', async () => {
    const matchNumbers = [123];
    const testError = new Error('Polling failed');
    let liveScoreCallback: Function;

    mockPollingService.startPolling.mockImplementation((matchNo, callback) => {
      liveScoreCallback = callback;
    });

    const { result } = renderHook(() => useLiveScores({
      matchNumbers,
      autoStart: true
    }));

    await waitFor(() => {
      expect(mockPollingService.startPolling).toHaveBeenCalled();
    });

    // Simulate polling error
    act(() => {
      liveScoreCallback!(null, testError);
    });

    await waitFor(() => {
      expect(result.current.liveScores[123].error).toEqual(testError);
      expect(result.current.liveScores[123].isLoading).toBe(false);
      expect(result.current.liveScores[123].liveScore).toBeNull();
    });
  });

  it('should start polling for specific match', async () => {
    const matchNumbers = [123];
    
    const { result } = renderHook(() => useLiveScores({
      matchNumbers,
      autoStart: false
    }));

    act(() => {
      result.current.startPollingMatch(123);
    });

    await waitFor(() => {
      expect(mockPollingService.startPolling).toHaveBeenCalledWith(
        123,
        expect.any(Function)
      );
    });
  });

  it('should stop polling for specific match', async () => {
    const matchNumbers = [123];
    
    const { result } = renderHook(() => useLiveScores({
      matchNumbers,
      autoStart: false
    }));

    act(() => {
      result.current.stopPollingMatch(123);
    });

    expect(mockPollingService.stopPolling).toHaveBeenCalledWith(123);
  });

  it('should stop all polling when stopPolling is called', async () => {
    const matchNumbers = [123, 456];
    
    const { result } = renderHook(() => useLiveScores({
      matchNumbers,
      autoStart: false
    }));

    act(() => {
      result.current.stopPolling();
    });

    expect(mockPollingService.stopAllPolling).toHaveBeenCalled();
  });

  it('should get live score with fallback to cache', () => {
    const matchNumbers = [123];
    mockPollingService.getCachedLiveScore.mockReturnValue(mockBeachLive);
    
    const { result } = renderHook(() => useLiveScores({
      matchNumbers,
      autoStart: false
    }));

    const liveScore = result.current.getLiveScore(123);
    expect(liveScore).toEqual(mockBeachLive);
    expect(mockPollingService.getCachedLiveScore).toHaveBeenCalledWith(123);
  });

  it('should refresh live scores', async () => {
    const matchNumbers = [123];
    
    const { result } = renderHook(() => useLiveScores({
      matchNumbers,
      autoStart: true
    }));

    act(() => {
      result.current.refreshLiveScores();
    });

    // Should stop and restart polling
    expect(mockPollingService.stopAllPolling).toHaveBeenCalled();
    
    await waitFor(() => {
      expect(mockPollingService.startPolling).toHaveBeenCalledTimes(2); // Initial + refresh
    });
  });

  it('should use custom polling service when provided', () => {
    const customService = {
      ...mockPollingService,
      customMethod: jest.fn()
    } as any;

    renderHook(() => useLiveScores({
      matchNumbers: [123],
      pollingService: customService,
      autoStart: false
    }));

    // Should not create new service instance
    expect(require('../../services/live-score/LiveScorePollingService').createLiveScorePollingService)
      .not.toHaveBeenCalled();
  });

  it('should cleanup polling service on unmount', () => {
    const matchNumbers = [123];
    
    const { unmount } = renderHook(() => useLiveScores({
      matchNumbers,
      autoStart: false
    }));

    unmount();

    expect(mockPollingService.destroy).toHaveBeenCalled();
  });

  it('should derive loading and polling states correctly', async () => {
    const matchNumbers = [123, 456];
    let callbacks: { [key: number]: Function } = {};

    mockPollingService.startPolling.mockImplementation((matchNo, callback) => {
      callbacks[matchNo] = callback;
    });

    const { result } = renderHook(() => useLiveScores({
      matchNumbers,
      autoStart: true
    }));

    await waitFor(() => {
      expect(mockPollingService.startPolling).toHaveBeenCalledTimes(2);
    });

    // Initially should show loading state
    await waitFor(() => {
      expect(result.current.isLoading).toBe(true);
      expect(result.current.isPolling).toBe(true);
    });

    // Complete one match polling
    act(() => {
      callbacks[123]!(mockBeachLive);
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(true); // Still loading other match
      expect(result.current.isPolling).toBe(true); // Still polling other match
    });

    // Complete second match polling
    act(() => {
      callbacks[456]!(mockBeachLive);
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false); // All matches loaded
      expect(result.current.isPolling).toBe(true); // Still polling for updates
    });
  });

  it('should provide statistics from polling service', () => {
    const mockStats = {
      totalPolls: 10,
      successfulPolls: 8,
      failureRate: 0.2,
      bandwidthSavedPercent: 60,
      activePolls: 2,
      circuitBreakerState: 'CLOSED'
    };

    mockPollingService.getStatistics.mockReturnValue(mockStats);

    const { result } = renderHook(() => useLiveScores({
      matchNumbers: [123],
      autoStart: false
    }));

    expect(result.current.statistics).toEqual(mockStats);
  });
});