import { renderHook, act, waitFor } from '@testing-library/react-native';
import { useTournamentStatus } from '../useTournamentStatus';
import { TournamentStatusSubscriptionService, TournamentStatusEventType } from '../../services/TournamentStatusSubscriptionService';
import { useNetworkStatus } from '../useNetworkStatus';
import { Tournament } from '../../types/tournament';

// Mock dependencies
jest.mock('../../services/TournamentStatusSubscriptionService');
jest.mock('../useNetworkStatus');
jest.mock('../../services/TournamentStatusMonitor');

const mockUseNetworkStatus = useNetworkStatus as jest.MockedFunction<typeof useNetworkStatus>;
const mockTournamentService = TournamentStatusSubscriptionService as jest.Mocked<typeof TournamentStatusSubscriptionService>;

describe('useTournamentStatus', () => {
  const mockTournaments: Tournament[] = [
    {
      No: 'TOURNAMENT_1',
      Title: 'Test Tournament 1',
      Status: 'Running',
      StartDate: '2025-01-15',
      EndDate: '2025-01-17'
    } as Tournament,
    {
      No: 'TOURNAMENT_2', 
      Title: 'Test Tournament 2',
      Status: 'Scheduled',
      StartDate: '2025-01-20',
      EndDate: '2025-01-22'
    } as Tournament
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock network status as connected
    mockUseNetworkStatus.mockReturnValue({
      isConnected: true,
      isOffline: false,
      connectionType: 'wifi',
      isExpensive: false
    });

    // Mock tournament subscription service
    mockTournamentService.initialize = jest.fn();
    mockTournamentService.subscribeTournamentStatus = jest.fn().mockResolvedValue(true);
    mockTournamentService.removeStatusListener = jest.fn();
    mockTournamentService.cleanup = jest.fn().mockResolvedValue(undefined);
  });

  test('should initialize with tournaments', () => {
    const { result } = renderHook(() => useTournamentStatus({
      tournaments: mockTournaments,
      enableBatching: true,
      batchDelay: 1000
    }));

    expect(result.current.tournaments).toEqual(mockTournaments);
    expect(result.current.subscriptionActive).toBe(false);
    expect(result.current.recentlyChangedTournaments.size).toBe(0);
    expect(result.current.statusEvents).toEqual([]);
  });

  test('should establish subscription when connected and tournaments provided', async () => {
    const { result } = renderHook(() => useTournamentStatus({
      tournaments: mockTournaments,
      eventTypes: [TournamentStatusEventType.CRITICAL],
      enableBatching: true,
      batchDelay: 1000
    }));

    await waitFor(() => {
      expect(mockTournamentService.initialize).toHaveBeenCalled();
      expect(mockTournamentService.subscribeTournamentStatus).toHaveBeenCalledWith(
        {
          tournamentNumbers: ['TOURNAMENT_1', 'TOURNAMENT_2'],
          eventTypes: [TournamentStatusEventType.CRITICAL],
          enableBatching: true,
          batchDelay: 1000
        },
        expect.any(Function)
      );
    });

    // Dentro `waitFor`, non dopo: la `waitFor` sopra aspetta soltanto che il
    // servizio venga CHIAMATO, mentre `subscriptionActive` diventa vero quando
    // la promessa si risolve e React riesegue il render. Leggerlo subito dopo
    // e' una gara che il test perde.
    await waitFor(() => {
      expect(result.current.subscriptionActive).toBe(true);
    });
    expect(result.current.error).toBeNull();
  });

  test('should handle subscription failure', async () => {
    mockTournamentService.subscribeTournamentStatus.mockResolvedValue(false);

    const { result } = renderHook(() => useTournamentStatus({
      tournaments: mockTournaments
    }));

    await waitFor(() => {
      expect(result.current.subscriptionActive).toBe(false);
      expect(result.current.error).toBe('Failed to establish tournament status subscription');
    });
  });

  test('should not establish subscription when offline', () => {
    mockUseNetworkStatus.mockReturnValue({
      isConnected: false,
      isOffline: true,
      connectionType: 'none',
      isExpensive: false
    });

    const { result } = renderHook(() => useTournamentStatus({
      tournaments: mockTournaments
    }));

    expect(mockTournamentService.subscribeTournamentStatus).not.toHaveBeenCalled();
    expect(result.current.subscriptionActive).toBe(false);
  });

  test('should handle status events', async () => {
    let eventHandler: Function = () => {};
    
    mockTournamentService.subscribeTournamentStatus.mockImplementation(async (config, handler) => {
      eventHandler = handler;
      return true;
    });

    const { result } = renderHook(() => useTournamentStatus({
      tournaments: mockTournaments
    }));

    await waitFor(() => {
      expect(result.current.subscriptionActive).toBe(true);
    });

    // Simulate status events
    const statusEvents = [
      {
        tournamentNo: 'TOURNAMENT_1',
        eventType: TournamentStatusEventType.CRITICAL,
        oldStatus: 'Running',
        newStatus: 'Cancelled',
        changes: {
          status: { old: 'Running', new: 'Cancelled' }
        },
        timestamp: new Date(),
        priority: 'high' as const
      }
    ];

    act(() => {
      eventHandler(statusEvents);
    });

    expect(result.current.statusEvents).toEqual(statusEvents);
    expect(result.current.recentlyChangedTournaments.has('TOURNAMENT_1')).toBe(true);
    expect(result.current.lastUpdate).toBeDefined();

    // Check that tournament status is updated
    const updatedTournament = result.current.tournaments.find(t => t.No === 'TOURNAMENT_1');
    expect(updatedTournament?.Status).toBe('Cancelled');
  });

  test('should clear recent changes', async () => {
    let eventHandler: Function = () => {};
    
    mockTournamentService.subscribeTournamentStatus.mockImplementation(async (config, handler) => {
      eventHandler = handler;
      return true;
    });

    const { result } = renderHook(() => useTournamentStatus({
      tournaments: mockTournaments
    }));

    await waitFor(() => {
      expect(result.current.subscriptionActive).toBe(true);
    });

    // Add some recent changes
    act(() => {
      eventHandler([{
        tournamentNo: 'TOURNAMENT_1',
        eventType: TournamentStatusEventType.INFORMATIONAL,
        oldStatus: 'Running',
        newStatus: 'Running',
        changes: {},
        timestamp: new Date(),
        priority: 'normal' as const
      }]);
    });

    expect(result.current.recentlyChangedTournaments.size).toBeGreaterThan(0);

    // Clear changes
    act(() => {
      result.current.clearRecentChanges();
    });

    expect(result.current.recentlyChangedTournaments.size).toBe(0);
  });

  test('should cleanup subscription on unmount', async () => {
    const { unmount } = renderHook(() => useTournamentStatus({
      tournaments: mockTournaments
    }));

    await waitFor(() => {
      expect(mockTournamentService.subscribeTournamentStatus).toHaveBeenCalled();
    });

    unmount();

    expect(mockTournamentService.cleanup).toHaveBeenCalled();
  });

  test('should handle tournament refresh', async () => {
    const { result } = renderHook(() => useTournamentStatus({
      tournaments: mockTournaments
    }));

    await act(async () => {
      await result.current.refreshTournamentStatus('TOURNAMENT_1');
    });

    // Should not throw error
    expect(result.current.error).toBeNull();
  });

  test('should handle subscription errors gracefully', async () => {
    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
    mockTournamentService.subscribeTournamentStatus.mockRejectedValue(new Error('Connection failed'));

    const { result } = renderHook(() => useTournamentStatus({
      tournaments: mockTournaments
    }));

    await waitFor(() => {
      expect(result.current.subscriptionActive).toBe(false);
      expect(result.current.error).toBe('Connection failed');
    });

    consoleErrorSpy.mockRestore();
  });

  test('should limit tournaments to prevent performance issues', () => {
    const manyTournaments = Array.from({ length: 15 }, (_, i) => ({
      No: `TOURNAMENT_${i + 1}`,
      Title: `Test Tournament ${i + 1}`,
      Status: 'Running'
    } as Tournament));

    renderHook(() => useTournamentStatus({
      tournaments: manyTournaments
    }));

    // Should limit to reasonable number
    expect(mockTournamentService.subscribeTournamentStatus).toHaveBeenCalledWith(
      expect.objectContaining({
        tournamentNumbers: expect.arrayContaining(manyTournaments.slice(0, 10).map(t => t.No))
      }),
      expect.any(Function)
    );
  });

  test('should update tournaments when initial tournaments change', () => {
    const { result, rerender } = renderHook(
      (props) => useTournamentStatus(props),
      {
        initialProps: { tournaments: mockTournaments.slice(0, 1) }
      }
    );

    expect(result.current.tournaments).toHaveLength(1);

    rerender({ tournaments: mockTournaments });

    expect(result.current.tournaments).toHaveLength(2);
  });
});