import { TournamentStatusSubscriptionService, TournamentStatusEventType } from '../TournamentStatusSubscriptionService';
import { ConnectionCircuitBreaker, CircuitState } from '../ConnectionCircuitBreaker';
import { RealtimePerformanceMonitor } from '../RealtimePerformanceMonitor';
import { supabase } from '../supabase';

// Mock dependencies
jest.mock('../supabase');
jest.mock('../RealtimeSubscriptionService');
jest.mock('../ConnectionCircuitBreaker');
jest.mock('../RealtimePerformanceMonitor');

/**
 * Il servizio raggruppa gli eventi con `BATCH_DELAY_MS = 2000`.
 *
 * I test aspettavano 150 ms reali e poi asserivano che l'ascoltatore fosse
 * stato chiamato: non lo era, e non poteva esserlo — mancavano 1850 ms. Sei
 * fallimenti tutti con "Number of calls: 0", nessuno dei quali riguardava il
 * comportamento in prova.
 *
 * Aspettare 2 secondi veri sette volte avrebbe aggiunto quattordici secondi
 * alla suite per non provare niente di piu'. Con i timer finti l'attesa e'
 * istantanea E deterministica: se un giorno la soglia cambia, il test continua
 * a valere perche' avanza di piu' della costante, non di un numero scelto a
 * occhio.
 */
const RITARDO_BATCH_MS = 2000;

async function avanzaOltreIlBatch(): Promise<void> {
  await jest.advanceTimersByTimeAsync(RITARDO_BATCH_MS + 50);
}

describe('TournamentStatusSubscriptionService', () => {
  let mockSubscription: any;
  let mockChannel: any;
  let tournamentStatusCallback: any;
  let matchStatusCallback: any;

  afterEach(() => {
    // I timer pendenti non devono sopravvivere al test che li ha accesi: il
    // servizio ne tiene uno solo (`batchTimeout`) ma e' statico, quindi
    // sarebbe condiviso con la prova successiva.
    jest.clearAllTimers();
    jest.useRealTimers();
  });

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();

    // Clean up service state
    TournamentStatusSubscriptionService.cleanup();
    
    // Set up mock subscription
    mockSubscription = {
      unsubscribe: jest.fn(),
    };

    mockChannel = {
      on: jest.fn().mockImplementation((event, config, callback) => {
        if (config.table === 'tournaments') {
          tournamentStatusCallback = callback;
        } else if (config.table === 'matches') {
          matchStatusCallback = callback;
        }
        return mockChannel;
      }),
      subscribe: jest.fn().mockImplementation((statusCallback) => {
        setTimeout(() => statusCallback('SUBSCRIBED'), 100);
        return mockSubscription;
      }),
    };

    (supabase.channel as jest.Mock) = jest.fn(() => mockChannel);
    (supabase.removeChannel as jest.Mock) = jest.fn();

    // Mock circuit breaker
    const mockCircuitBreaker = {
      canExecute: jest.fn(() => true),
      onSuccess: jest.fn(),
      onFailure: jest.fn(),
      getState: jest.fn(() => CircuitState.CLOSED),
      cleanup: jest.fn(),
    };
    (ConnectionCircuitBreaker.getInstance as jest.Mock) = jest.fn(() => mockCircuitBreaker);

    // Mock performance monitor
    (RealtimePerformanceMonitor.trackMessageReceived as jest.Mock) = jest.fn();
  });

  afterEach(async () => {
    await TournamentStatusSubscriptionService.cleanup();
  });

  describe('Initialization', () => {
    test('should initialize correctly', () => {
      TournamentStatusSubscriptionService.initialize();
      
      expect(ConnectionCircuitBreaker.getInstance).toHaveBeenCalledWith('tournament-status', {
        failureThreshold: 3,
        recoveryTimeout: 30000,
        successThreshold: 2,
        maxTimeout: 300000,
      });
    });

    test('should not initialize multiple times', () => {
      TournamentStatusSubscriptionService.initialize();
      TournamentStatusSubscriptionService.initialize();
      
      expect(ConnectionCircuitBreaker.getInstance).toHaveBeenCalledTimes(1);
    });
  });

  describe('Tournament Status Subscriptions', () => {
    test('should establish tournament and match subscriptions', async () => {
      const config = {
        tournamentNumbers: ['TOURNAMENT_1', 'TOURNAMENT_2'],
        eventTypes: [TournamentStatusEventType.CRITICAL],
        enableBatching: true,
        batchDelay: 1000,
      };

      const listener = jest.fn();
      
      const success = await TournamentStatusSubscriptionService.subscribeTournamentStatus(config, listener);
      
      expect(success).toBe(true);
      expect(supabase.channel).toHaveBeenCalledTimes(2);
      expect(mockChannel.on).toHaveBeenCalledWith(
        'postgres_changes',
        expect.objectContaining({
          event: 'UPDATE',
          schema: 'public',
          table: 'tournaments',
          filter: 'no=in.(TOURNAMENT_1,TOURNAMENT_2)',
        }),
        expect.any(Function)
      );
      expect(mockChannel.on).toHaveBeenCalledWith(
        'postgres_changes',
        expect.objectContaining({
          event: 'UPDATE',
          schema: 'public',
          table: 'matches',
          filter: 'tournament_no=in.(TOURNAMENT_1,TOURNAMENT_2)',
        }),
        expect.any(Function)
      );
    });

    test('should limit concurrent subscriptions', async () => {
      const config = {
        tournamentNumbers: new Array(15).fill(0).map((_, i) => `TOURNAMENT_${i}`),
        eventTypes: [TournamentStatusEventType.INFORMATIONAL],
        enableBatching: true,
        batchDelay: 1000,
      };

      const listener = jest.fn();
      
      await TournamentStatusSubscriptionService.subscribeTournamentStatus(config, listener);
      
      // Should limit to MAX_CONCURRENT_TOURNAMENTS (10)
      expect(config.tournamentNumbers).toHaveLength(10);
    });

    test('should handle circuit breaker blocking', async () => {
      const mockCircuitBreaker = {
        canExecute: jest.fn(() => false),
        onSuccess: jest.fn(),
        onFailure: jest.fn(),
        getState: jest.fn(() => CircuitState.OPEN),
        getRecommendation: jest.fn(() => ({
          shouldExecute: false,
          reason: 'Circuit is open',
          fallbackSuggested: true,
        })),
        cleanup: jest.fn(),
      };
      (ConnectionCircuitBreaker.getInstance as jest.Mock) = jest.fn(() => mockCircuitBreaker);

      const config = {
        tournamentNumbers: ['TOURNAMENT_1'],
        eventTypes: [TournamentStatusEventType.CRITICAL],
        enableBatching: true,
        batchDelay: 1000,
      };

      const listener = jest.fn();
      
      const success = await TournamentStatusSubscriptionService.subscribeTournamentStatus(config, listener);
      
      expect(success).toBe(false);
      expect(supabase.channel).not.toHaveBeenCalled();
    });
  });

  describe('Tournament Status Change Handling', () => {
    test('should handle tournament status change events', async () => {
      const config = {
        tournamentNumbers: ['TOURNAMENT_1'],
        eventTypes: [TournamentStatusEventType.CRITICAL],
        enableBatching: false,
        batchDelay: 0,
      };

      const listener = jest.fn();
      
      await TournamentStatusSubscriptionService.subscribeTournamentStatus(config, listener);
      
      // Simulate tournament status change
      const payload = {
        old: {
          no: 'TOURNAMENT_1',
          status: 'Running',
          start_date: '2025-01-15',
        },
        new: {
          no: 'TOURNAMENT_1', 
          status: 'Finished',
          start_date: '2025-01-15',
        }
      };

      tournamentStatusCallback(payload);

      expect(RealtimePerformanceMonitor.trackMessageReceived).toHaveBeenCalledWith(
        JSON.stringify(payload).length,
        'TOURNAMENT_1'
      );
    });

    test('should categorize tournament events correctly', async () => {
      const config = {
        tournamentNumbers: ['TOURNAMENT_1'],
        eventTypes: [TournamentStatusEventType.CRITICAL, TournamentStatusEventType.COMPLETION],
        enableBatching: true,
        batchDelay: 100,
      };

      const listener = jest.fn();
      
      await TournamentStatusSubscriptionService.subscribeTournamentStatus(config, listener);
      
      // Test critical event (cancellation)
      const criticalPayload = {
        old: { no: 'TOURNAMENT_1', status: 'Running' },
        new: { no: 'TOURNAMENT_1', status: 'Cancelled' }
      };

      tournamentStatusCallback(criticalPayload);

      // Test completion event
      const completionPayload = {
        old: { no: 'TOURNAMENT_1', status: 'Running' },
        new: { no: 'TOURNAMENT_1', status: 'Finished' }
      };

      tournamentStatusCallback(completionPayload);

      // Wait for batched processing
      await avanzaOltreIlBatch();

      expect(listener).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            eventType: TournamentStatusEventType.CRITICAL,
            priority: 'high'
          }),
          expect.objectContaining({
            eventType: TournamentStatusEventType.COMPLETION,
            priority: 'normal'
          })
        ])
      );
    });
  });

  describe('Match Schedule Change Handling', () => {
    test('should handle match schedule changes', async () => {
      const config = {
        tournamentNumbers: ['TOURNAMENT_1'],
        eventTypes: [TournamentStatusEventType.INFORMATIONAL],
        enableBatching: true,
        batchDelay: 100,
      };

      const listener = jest.fn();
      
      await TournamentStatusSubscriptionService.subscribeTournamentStatus(config, listener);
      
      // Simulate match schedule change
      const payload = {
        old: {
          tournament_no: 'TOURNAMENT_1',
          no_in_tournament: 'M001',
          local_date: '2025-01-15',
          local_time: '10:00',
          court: 'Court 1',
          status: 'scheduled'
        },
        new: {
          tournament_no: 'TOURNAMENT_1',
          no_in_tournament: 'M001', 
          local_date: '2025-01-15',
          local_time: '11:00', // Time changed
          court: 'Court 2',   // Court changed
          status: 'scheduled'
        }
      };

      matchStatusCallback(payload);

      // Wait for batched processing
      await avanzaOltreIlBatch();

      expect(listener).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            tournamentNo: 'TOURNAMENT_1',
            eventType: TournamentStatusEventType.INFORMATIONAL,
            changes: expect.objectContaining({
              localTime: { old: '10:00', new: '11:00' },
              court: { old: 'Court 1', new: 'Court 2' }
            })
          })
        ])
      );
    });

    test('should ignore insignificant match changes', async () => {
      const config = {
        tournamentNumbers: ['TOURNAMENT_1'],
        eventTypes: [TournamentStatusEventType.INFORMATIONAL],
        enableBatching: true,
        batchDelay: 100,
      };

      const listener = jest.fn();
      
      await TournamentStatusSubscriptionService.subscribeTournamentStatus(config, listener);
      
      // Simulate match with no significant changes
      const payload = {
        old: {
          tournament_no: 'TOURNAMENT_1',
          no_in_tournament: 'M001',
          local_date: '2025-01-15',
          local_time: '10:00',
          court: 'Court 1',
          status: 'scheduled'
        },
        new: {
          tournament_no: 'TOURNAMENT_1',
          no_in_tournament: 'M001',
          local_date: '2025-01-15',
          local_time: '10:00',
          court: 'Court 1',
          status: 'scheduled'
        }
      };

      matchStatusCallback(payload);

      // Wait for batched processing  
      await avanzaOltreIlBatch();

      // Should not trigger any events
      expect(listener).not.toHaveBeenCalled();
    });
  });

  describe('Event Batching and Processing', () => {
    test('should batch multiple events', async () => {
      const config = {
        tournamentNumbers: ['TOURNAMENT_1', 'TOURNAMENT_2'],
        eventTypes: [TournamentStatusEventType.INFORMATIONAL],
        enableBatching: true,
        batchDelay: 100,
      };

      const listener = jest.fn();
      
      await TournamentStatusSubscriptionService.subscribeTournamentStatus(config, listener);
      
      // Send multiple events quickly
      const payload1 = {
        old: { no: 'TOURNAMENT_1', status: 'Scheduled' },
        new: { no: 'TOURNAMENT_1', status: 'Running' }
      };
      
      const payload2 = {
        old: { no: 'TOURNAMENT_2', status: 'Scheduled' },
        new: { no: 'TOURNAMENT_2', status: 'Running' }
      };

      tournamentStatusCallback(payload1);
      tournamentStatusCallback(payload2);

      // Wait for batched processing
      await avanzaOltreIlBatch();

      // Should receive both events in single batch
      expect(listener).toHaveBeenCalledTimes(1);
      expect(listener).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({ tournamentNo: 'TOURNAMENT_1' }),
          expect.objectContaining({ tournamentNo: 'TOURNAMENT_2' })
        ])
      );
    });

    test('should sort events by priority', async () => {
      const config = {
        tournamentNumbers: ['TOURNAMENT_1'],
        eventTypes: [TournamentStatusEventType.CRITICAL, TournamentStatusEventType.INFORMATIONAL],
        enableBatching: true,
        batchDelay: 100,
      };

      const listener = jest.fn();
      
      await TournamentStatusSubscriptionService.subscribeTournamentStatus(config, listener);
      
      // Send low priority event first
      const lowPriorityPayload = {
        old: { no: 'TOURNAMENT_1', status: 'Running' },
        new: { no: 'TOURNAMENT_1', status: 'Running' } // No real change, low priority
      };
      
      // Send high priority event second
      const highPriorityPayload = {
        old: { no: 'TOURNAMENT_1', status: 'Running' },
        new: { no: 'TOURNAMENT_1', status: 'Cancelled' }
      };

      tournamentStatusCallback(lowPriorityPayload);
      tournamentStatusCallback(highPriorityPayload);

      // Wait for batched processing
      await avanzaOltreIlBatch();

      const calledWith = listener.mock.calls[0][0];
      expect(calledWith[0].priority).toBe('high'); // High priority should be first
    });
  });

  describe('Subscription Management', () => {
    test('should provide subscription status', async () => {
      const config = {
        tournamentNumbers: ['TOURNAMENT_1'],
        eventTypes: [TournamentStatusEventType.CRITICAL],
        enableBatching: true,
        batchDelay: 1000,
      };

      const listener = jest.fn();
      
      await TournamentStatusSubscriptionService.subscribeTournamentStatus(config, listener);
      
      const status = TournamentStatusSubscriptionService.getSubscriptionStatus();
      
      expect(status).toEqual({
        activeTournaments: 1,
        activeMatches: 1,
        circuitBreakerState: CircuitState.CLOSED,
        queuedEvents: 0,
      });
    });

    test('should remove listeners', async () => {
      const config = {
        tournamentNumbers: ['TOURNAMENT_1'],
        eventTypes: [TournamentStatusEventType.CRITICAL],
        enableBatching: true,
        batchDelay: 100,
      };

      const listener = jest.fn();
      
      await TournamentStatusSubscriptionService.subscribeTournamentStatus(config, listener);
      TournamentStatusSubscriptionService.removeStatusListener(listener);
      
      // Send event
      const payload = {
        old: { no: 'TOURNAMENT_1', status: 'Running' },
        new: { no: 'TOURNAMENT_1', status: 'Finished' }
      };

      tournamentStatusCallback(payload);

      // Wait for processing
      await avanzaOltreIlBatch();

      // Listener should not have been called
      expect(listener).not.toHaveBeenCalled();
    });
  });

  describe('Cleanup', () => {
    test('should cleanup all resources', async () => {
      const config = {
        tournamentNumbers: ['TOURNAMENT_1', 'TOURNAMENT_2'],
        eventTypes: [TournamentStatusEventType.CRITICAL],
        enableBatching: true,
        batchDelay: 1000,
      };

      const listener = jest.fn();
      
      await TournamentStatusSubscriptionService.subscribeTournamentStatus(config, listener);
      await TournamentStatusSubscriptionService.cleanup();
      
      expect(supabase.removeChannel).toHaveBeenCalledTimes(2);
      
      const status = TournamentStatusSubscriptionService.getSubscriptionStatus();
      expect(status.activeTournaments).toBe(0);
      expect(status.activeMatches).toBe(0);
    });

    test('should handle cleanup errors gracefully', async () => {
      const config = {
        tournamentNumbers: ['TOURNAMENT_1'],
        eventTypes: [TournamentStatusEventType.CRITICAL],
        enableBatching: true,
        batchDelay: 1000,
      };

      const listener = jest.fn();
      
      await TournamentStatusSubscriptionService.subscribeTournamentStatus(config, listener);
      
      // Mock cleanup error
      (supabase.removeChannel as jest.Mock).mockRejectedValue(new Error('Cleanup failed'));
      
      // Should not throw
      await expect(TournamentStatusSubscriptionService.cleanup()).resolves.not.toThrow();
    });
  });

  describe('Error Handling', () => {
    test('should handle tournament status change errors gracefully', async () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      
      const config = {
        tournamentNumbers: ['TOURNAMENT_1'],
        eventTypes: [TournamentStatusEventType.CRITICAL],
        enableBatching: true,
        batchDelay: 1000,
      };

      const listener = jest.fn();
      
      await TournamentStatusSubscriptionService.subscribeTournamentStatus(config, listener);
      
      // Send malformed payload
      tournamentStatusCallback(null);

      expect(consoleSpy).toHaveBeenCalledWith(
        'Error handling tournament status change:',
        expect.any(Error)
      );
      
      consoleSpy.mockRestore();
    });

    test('should handle listener errors gracefully', async () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      
      const config = {
        tournamentNumbers: ['TOURNAMENT_1'],
        eventTypes: [TournamentStatusEventType.CRITICAL],
        enableBatching: true,
        batchDelay: 100,
      };

      const errorListener = jest.fn().mockImplementation(() => {
        throw new Error('Listener error');
      });
      
      await TournamentStatusSubscriptionService.subscribeTournamentStatus(config, errorListener);
      
      const payload = {
        old: { no: 'TOURNAMENT_1', status: 'Running' },
        new: { no: 'TOURNAMENT_1', status: 'Finished' }
      };

      tournamentStatusCallback(payload);

      // Wait for processing
      await avanzaOltreIlBatch();

      expect(consoleSpy).toHaveBeenCalledWith(
        'Error in tournament status listener:',
        expect.any(Error)
      );
      
      consoleSpy.mockRestore();
    });
  });
});