import { RealtimeSubscriptionService, ConnectionState } from '../RealtimeSubscriptionService';
import { CacheServiceCompatibility as CacheService } from '../../hooks/compatibility/CacheServiceCompatibility';
import { supabase } from '../supabase';
import { AppState } from 'react-native';

// Mock dependencies
jest.mock('../supabase');
jest.mock('../../hooks/compatibility/CacheServiceCompatibility');
// Nessun `jest.mock('react-native')` qui: vedi TESTING.md regola 2.
// Questo file ne aveva uno che sostituiva l'INTERO modulo con il solo
// `AppState`, cancellando il mock globale di `jest.env.js` — e con esso
// `Platform`, che qualcosa nella catena di import legge. Risultato:
// `Cannot read properties of undefined (reading 'OS')` all'import, cioè la
// suite non caricava affatto e nessuno dei suoi test girava (issue #94).
// Il mock globale fornisce già `AppState.addEventListener`, e in versione
// migliore: restituisce una subscription con `remove`, come quella vera.

describe('RealtimeSubscriptionService', () => {
  const mockTournamentNo = 'TEST_TOURNAMENT_123';
  const mockSubscription = {
    unsubscribe: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Reset service state
    RealtimeSubscriptionService.cleanup();
    
    // Mock supabase channel methods
    const mockChannel = {
      on: jest.fn().mockReturnThis(),
      subscribe: jest.fn((callback) => {
        callback('SUBSCRIBED');
        return mockSubscription;
      }),
    };
    
    (supabase.channel as jest.Mock) = jest.fn(() => mockChannel);
    (supabase.removeChannel as jest.Mock) = jest.fn();
  });

  afterEach(async () => {
    await RealtimeSubscriptionService.cleanup();
  });

  describe('Initialization', () => {
    test('should initialize service correctly', () => {
      expect(RealtimeSubscriptionService.getConnectionState()).toBe(ConnectionState.DISCONNECTED);
      expect(RealtimeSubscriptionService.getActiveSubscriptions()).toEqual([]);
    });

    test('should set up app state monitoring on initialize', () => {
      RealtimeSubscriptionService.initialize();
      
      expect(AppState.addEventListener).toHaveBeenCalledWith('change', expect.any(Function));
    });

    test('should not initialize twice', () => {
      RealtimeSubscriptionService.initialize();
      RealtimeSubscriptionService.initialize();
      
      // Should only be called once
      expect(AppState.addEventListener).toHaveBeenCalledTimes(1);
    });
  });

  describe('Connection State Management', () => {
    test('should notify listeners on state changes', () => {
      const listener = jest.fn();
      const unsubscribe = RealtimeSubscriptionService.addConnectionStateListener(listener);
      
      RealtimeSubscriptionService.initialize();
      
      expect(listener).toHaveBeenCalledWith(ConnectionState.DISCONNECTED);
      
      unsubscribe();
    });

    test('should return unsubscribe function', () => {
      const listener = jest.fn();
      const unsubscribe = RealtimeSubscriptionService.addConnectionStateListener(listener);
      
      expect(typeof unsubscribe).toBe('function');
      
      unsubscribe();
      RealtimeSubscriptionService.initialize();
      
      // Should not be called after unsubscribe
      expect(listener).not.toHaveBeenCalled();
    });
  });

  describe('Tournament Subscription', () => {
    test('should subscribe to tournament successfully', async () => {
      const result = await RealtimeSubscriptionService.subscribeTournament(mockTournamentNo);
      
      expect(result).toBe(true);
      expect(supabase.channel).toHaveBeenCalledWith(`matches_${mockTournamentNo}`);
      expect(RealtimeSubscriptionService.getActiveSubscriptions()).toContain(mockTournamentNo);
    });

    test('should not create duplicate subscriptions', async () => {
      await RealtimeSubscriptionService.subscribeTournament(mockTournamentNo);
      const result = await RealtimeSubscriptionService.subscribeTournament(mockTournamentNo);
      
      expect(result).toBe(true);
      expect(supabase.channel).toHaveBeenCalledTimes(1);
    });

    test('should handle subscription errors', async () => {
      (supabase.channel as jest.Mock).mockImplementation(() => {
        throw new Error('Connection failed');
      });
      
      const result = await RealtimeSubscriptionService.subscribeTournament(mockTournamentNo);
      
      expect(result).toBe(false);
      expect(RealtimeSubscriptionService.getConnectionState()).toBe(ConnectionState.ERROR);
    });

    test('should filter for live matches only', async () => {
      await RealtimeSubscriptionService.subscribeTournament(mockTournamentNo, true);
      
      const mockChannel = (supabase.channel as jest.Mock).mock.results[0].value;
      expect(mockChannel.on).toHaveBeenCalledWith(
        'postgres_changes',
        expect.objectContaining({
          filter: `tournament_no=eq.${mockTournamentNo}&status=in.(live,in_progress,running)`
        }),
        expect.any(Function)
      );
    });
  });

  describe('Subscription Management', () => {
    test('should unsubscribe from tournament', async () => {
      await RealtimeSubscriptionService.subscribeTournament(mockTournamentNo);
      await RealtimeSubscriptionService.unsubscribeTournament(mockTournamentNo);
      
      expect(supabase.removeChannel).toHaveBeenCalledWith(mockSubscription);
      expect(RealtimeSubscriptionService.getActiveSubscriptions()).not.toContain(mockTournamentNo);
    });

    test('should handle unsubscribe from non-existent subscription', async () => {
      await expect(
        RealtimeSubscriptionService.unsubscribeTournament('NON_EXISTENT')
      ).resolves.not.toThrow();
    });

    test('should get subscription status', async () => {
      const status = RealtimeSubscriptionService.getSubscriptionStatus(mockTournamentNo);
      expect(status.active).toBe(false);
      expect(status.retrying).toBe(false);
      
      await RealtimeSubscriptionService.subscribeTournament(mockTournamentNo);
      const activeStatus = RealtimeSubscriptionService.getSubscriptionStatus(mockTournamentNo);
      expect(activeStatus.active).toBe(true);
    });
  });

  describe('App State Handling', () => {
    test('should pause subscriptions when app goes to background', async () => {
      await RealtimeSubscriptionService.subscribeTournament(mockTournamentNo);
      
      // Simulate app state change to background
      const appStateCallback = (AppState.addEventListener as jest.Mock).mock.calls[0][1];
      appStateCallback('background');
      
      expect(mockSubscription.unsubscribe).toHaveBeenCalled();
    });

    test('should resume subscriptions when app becomes active', async () => {
      await RealtimeSubscriptionService.subscribeTournament(mockTournamentNo);
      
      // Simulate background then active
      const appStateCallback = (AppState.addEventListener as jest.Mock).mock.calls[0][1];
      appStateCallback('background');
      appStateCallback('active');
      
      // Should attempt to reconnect
      expect(supabase.channel).toHaveBeenCalledTimes(2);
    });
  });

  describe('Cache Integration', () => {
    test('should invalidate cache on match updates', async () => {
      const mockPayload = {
        new: {
          tournament_no: mockTournamentNo,
          no_in_tournament: 'M001',
          status: 'live'
        }
      };

      await RealtimeSubscriptionService.subscribeTournament(mockTournamentNo);
      
      // Get the match update handler from the subscription
      const mockChannel = (supabase.channel as jest.Mock).mock.results[0].value;
      const updateHandler = mockChannel.on.mock.calls[0][2];
      
      await updateHandler(mockPayload);
      
      expect(CacheService.invalidateMatchCache).toHaveBeenCalledWith(mockTournamentNo);
    });
  });

  describe('Cleanup', () => {
    test('should cleanup all subscriptions', async () => {
      await RealtimeSubscriptionService.subscribeTournament(mockTournamentNo);
      await RealtimeSubscriptionService.subscribeTournament('TOURNAMENT_2');
      
      await RealtimeSubscriptionService.cleanup();
      
      expect(RealtimeSubscriptionService.getActiveSubscriptions()).toEqual([]);
      expect(RealtimeSubscriptionService.getConnectionState()).toBe(ConnectionState.DISCONNECTED);
    });

    test('should remove app state listener on cleanup', async () => {
      const mockRemove = jest.fn();
      (AppState.addEventListener as jest.Mock).mockReturnValue({
        remove: mockRemove
      });
      
      RealtimeSubscriptionService.initialize();
      await RealtimeSubscriptionService.cleanup();
      
      expect(mockRemove).toHaveBeenCalled();
    });
  });

  describe('Utility Methods', () => {
    test('should identify live matches correctly', () => {
      const liveMatch = { Status: 'live' } as any;
      const finishedMatch = { Status: 'finished' } as any;
      
      expect(RealtimeSubscriptionService['isLiveMatch'](liveMatch)).toBe(true);
      expect(RealtimeSubscriptionService['isLiveMatch'](finishedMatch)).toBe(false);
    });

    test('should extract tournament number from match', () => {
      const match = { tournament_no: 'TEST_123' } as any;
      const result = RealtimeSubscriptionService['extractTournamentNo'](match);
      
      expect(result).toBe('TEST_123');
    });

    test('should handle missing tournament number', () => {
      const match = {} as any;
      const result = RealtimeSubscriptionService['extractTournamentNo'](match);
      
      expect(result).toBe(null);
    });
  });

  describe('Error Handling', () => {
    test('should handle match update errors gracefully', async () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      
      (CacheService.invalidateMatchCache as jest.Mock).mockRejectedValue(
        new Error('Cache invalidation failed')
      );
      
      const mockPayload = {
        new: {
          tournament_no: mockTournamentNo,
          status: 'live'
        }
      };

      await RealtimeSubscriptionService.subscribeTournament(mockTournamentNo);
      
      const mockChannel = (supabase.channel as jest.Mock).mock.results[0].value;
      const updateHandler = mockChannel.on.mock.calls[0][2];
      
      await expect(updateHandler(mockPayload)).resolves.not.toThrow();
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Error handling match update')
      );
      
      consoleSpy.mockRestore();
    });

    test('should handle listener errors gracefully', () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      const errorListener = jest.fn().mockImplementation(() => {
        throw new Error('Listener error');
      });
      
      RealtimeSubscriptionService.addConnectionStateListener(errorListener);
      RealtimeSubscriptionService.initialize();
      
      expect(consoleSpy).toHaveBeenCalledWith(
        'Error in connection state listener:',
        expect.any(Error)
      );
      
      consoleSpy.mockRestore();
    });
  });
});