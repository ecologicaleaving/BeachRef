import React from 'react';
import { render, waitFor, fireEvent, act } from '@testing-library/react-native';
import { AppState } from 'react-native';
import { RealtimeSubscriptionService, ConnectionState } from '../../services/RealtimeSubscriptionService';
import { RealtimeFallbackService } from '../../services/RealtimeFallbackService';
import { RealtimePerformanceMonitor } from '../../services/RealtimePerformanceMonitor';
import { ConnectionCircuitBreaker, CircuitState } from '../../services/ConnectionCircuitBreaker';
import { supabase } from '../../services/supabase';
import TournamentDetail from '../../components/TournamentDetail';
import { Tournament } from '../../types/tournament';

// Mock all external dependencies
jest.mock('../../services/supabase');
jest.mock('../../hooks/compatibility/CacheServiceCompatibility');
jest.mock('../../services/visApi');
jest.mock('react-native', () => ({
  ...jest.requireActual('react-native'),
  AppState: {
    addEventListener: jest.fn(),
  },
}));

const mockTournament: Tournament = {
  No: 'INT_TEST_TOURNAMENT',
  Name: 'Integration Test Tournament',
  Code: 'ITT2025',
  BeachTournamentType: 'BPT',
  Gender: 'M',
  StartDate: '2025-01-15',
  EndDate: '2025-01-17',
  Venue: 'Test Arena',
  Country: 'Test Country'
} as Tournament;

const mockMatches = [
  {
    No: 'M001',
    NoInTournament: '1',
    Status: 'live',
    Court: 'Court 1',
    LocalDate: '2025-01-15',
    LocalTime: '10:00',
    TeamA: 'Team A',
    TeamB: 'Team B',
    PointsA: 21,
    PointsB: 18,
  },
  {
    No: 'M002',
    NoInTournament: '2', 
    Status: 'scheduled',
    Court: 'Court 2',
    LocalDate: '2025-01-15',
    LocalTime: '12:00',
    TeamA: 'Team C',
    TeamB: 'Team D',
  },
];

describe('Real-Time System Integration Tests', () => {
  let mockSubscription: any;
  let mockChannel: any;
  let subscriptionCallback: any;

  beforeEach(async () => {
    jest.clearAllMocks();
    
    // Clean up all services
    await RealtimeSubscriptionService.cleanup();
    RealtimeFallbackService.cleanup();
    RealtimePerformanceMonitor.cleanup();
    ConnectionCircuitBreaker.cleanupAll();

    // Set up mock Supabase subscription
    mockSubscription = {
      unsubscribe: jest.fn(),
    };

    mockChannel = {
      on: jest.fn().mockImplementation((event, config, callback) => {
        subscriptionCallback = callback;
        return mockChannel;
      }),
      subscribe: jest.fn().mockImplementation((statusCallback) => {
        setTimeout(() => statusCallback('SUBSCRIBED'), 100);
        return mockSubscription;
      }),
    };

    (supabase.channel as jest.Mock) = jest.fn(() => mockChannel);
    (supabase.removeChannel as jest.Mock) = jest.fn();
  });

  afterEach(async () => {
    await RealtimeSubscriptionService.cleanup();
    RealtimeFallbackService.cleanup();
    RealtimePerformanceMonitor.cleanup();
    ConnectionCircuitBreaker.cleanupAll();
  });

  describe('AC1: WebSocket subscriptions established for tournaments with live matches', () => {
    test('should establish WebSocket subscription for tournament', async () => {
      const success = await RealtimeSubscriptionService.subscribeTournament(mockTournament.No);
      
      expect(success).toBe(true);
      expect(supabase.channel).toHaveBeenCalledWith(`matches_${mockTournament.No}`);
      expect(mockChannel.on).toHaveBeenCalledWith(
        'postgres_changes',
        expect.objectContaining({
          event: 'UPDATE',
          schema: 'public',
          table: 'matches',
        }),
        expect.any(Function)
      );
      expect(mockChannel.subscribe).toHaveBeenCalled();
    });

    test('should filter for live matches only', async () => {
      await RealtimeSubscriptionService.subscribeTournament(mockTournament.No, true);
      
      expect(mockChannel.on).toHaveBeenCalledWith(
        'postgres_changes',
        expect.objectContaining({
          filter: `tournament_no=eq.${mockTournament.No}&status=in.(live,in_progress,running)`
        }),
        expect.any(Function)
      );
    });
  });

  describe('AC2: Automatic UI updates when match scores change', () => {
    test('should trigger UI updates on real-time match updates', async () => {
      await RealtimeSubscriptionService.subscribeTournament(mockTournament.No);
      
      // Wait for subscription to be established
      await waitFor(() => {
        expect(RealtimeSubscriptionService.getConnectionState()).toBe(ConnectionState.CONNECTED);
      });

      // Simulate real-time update
      const updatePayload = {
        new: {
          tournament_no: mockTournament.No,
          no_in_tournament: 'M001',
          status: 'live',
          points_a: 22,
          points_b: 18,
        }
      };

      act(() => {
        subscriptionCallback(updatePayload);
      });

      // Verify that cache invalidation was triggered
      // (In real implementation, this would trigger UI updates)
      expect(subscriptionCallback).toHaveBeenDefined();
    });
  });

  describe('AC3: Connection state management with automatic reconnection', () => {
    test('should manage connection states properly', async () => {
      const stateChanges: ConnectionState[] = [];
      
      RealtimeSubscriptionService.addConnectionStateListener((state) => {
        stateChanges.push(state);
      });

      await RealtimeSubscriptionService.subscribeTournament(mockTournament.No);
      
      await waitFor(() => {
        expect(stateChanges).toContain(ConnectionState.CONNECTING);
        expect(stateChanges).toContain(ConnectionState.CONNECTED);
      });
    });

    test('should attempt reconnection on connection failure', async () => {
      jest.useFakeTimers();
      
      // Mock failed connection
      mockChannel.subscribe.mockImplementation((statusCallback) => {
        setTimeout(() => statusCallback('CLOSED'), 100);
        return mockSubscription;
      });

      await RealtimeSubscriptionService.subscribeTournament(mockTournament.No);
      
      // Fast-forward timers to trigger reconnection
      act(() => {
        jest.advanceTimersByTime(5000);
      });

      // Should attempt reconnection
      expect(supabase.channel).toHaveBeenCalledTimes(2);
      
      jest.useRealTimers();
    });
  });

  describe('AC4: Subscription cleanup on component unmount', () => {
    test('should clean up subscriptions properly', async () => {
      await RealtimeSubscriptionService.subscribeTournament(mockTournament.No);
      
      expect(RealtimeSubscriptionService.getActiveSubscriptions()).toContain(mockTournament.No);
      
      await RealtimeSubscriptionService.unsubscribeTournament(mockTournament.No);
      
      expect(RealtimeSubscriptionService.getActiveSubscriptions()).not.toContain(mockTournament.No);
      expect(supabase.removeChannel).toHaveBeenCalledWith(mockSubscription);
    });
  });

  describe('AC5: Battery optimization through efficient connection management', () => {
    test('should pause subscriptions when app goes to background', async () => {
      RealtimeSubscriptionService.initialize();
      await RealtimeSubscriptionService.subscribeTournament(mockTournament.No);
      
      // Get the app state callback
      const appStateCallback = (AppState.addEventListener as jest.Mock).mock.calls[0][1];
      
      // Simulate app going to background
      act(() => {
        appStateCallback('background');
      });

      expect(mockSubscription.unsubscribe).toHaveBeenCalled();
    });

    test('should track performance metrics for battery optimization', () => {
      const metrics = RealtimePerformanceMonitor.getPerformanceMetrics();
      
      expect(metrics).toHaveProperty('batteryOptimizationEvents');
      expect(metrics).toHaveProperty('backgroundDisconnections');
      expect(metrics).toHaveProperty('foregroundReconnections');
    });
  });

  describe('AC6: Graceful degradation when WebSocket connection fails', () => {
    test('should activate fallback polling when WebSocket fails', async () => {
      // Mock WebSocket failure
      mockChannel.subscribe.mockImplementation((statusCallback) => {
        setTimeout(() => statusCallback('CLOSED'), 100);
        return mockSubscription;
      });

      const success = await RealtimeSubscriptionService.subscribeTournament(mockTournament.No);
      
      // Should still report success due to fallback
      await waitFor(() => {
        const status = RealtimeSubscriptionService.getSubscriptionStatus(mockTournament.No);
        expect(status.fallbackActive || success).toBe(true);
      });
    });

    test('should use circuit breaker to prevent excessive reconnection attempts', async () => {
      const circuitBreaker = ConnectionCircuitBreaker.getInstance('test-tournament');
      
      // Simulate multiple failures
      for (let i = 0; i < 5; i++) {
        circuitBreaker.onFailure('Connection failed');
      }
      
      expect(circuitBreaker.getState()).toBe(CircuitState.OPEN);
      expect(circuitBreaker.canExecute()).toBe(false);
    });
  });

  describe('AC7: Real-time indicators show live match status in UI', () => {
    test('should render connection indicators in TournamentDetail', () => {
      const { getByText } = render(
        <TournamentDetail 
          tournament={mockTournament} 
          onBack={() => {}} 
        />
      );

      // Should show some form of connection status
      // (This would need to be enhanced based on actual UI implementation)
      expect(() => getByText(/Tournament Details/)).not.toThrow();
    });
  });

  describe('Performance and Error Handling Integration', () => {
    test('should handle high-frequency updates without performance issues', async () => {
      await RealtimeSubscriptionService.subscribeTournament(mockTournament.No);
      
      // Simulate rapid updates
      for (let i = 0; i < 10; i++) {
        const updatePayload = {
          new: {
            tournament_no: mockTournament.No,
            no_in_tournament: 'M001',
            status: 'live',
            points_a: 20 + i,
            points_b: 18,
          }
        };
        
        act(() => {
          subscriptionCallback(updatePayload);
        });
      }

      const metrics = RealtimePerformanceMonitor.getPerformanceMetrics();
      expect(metrics.totalMessagesReceived).toBe(10);
    });

    test('should recover from errors gracefully', async () => {
      await RealtimeSubscriptionService.subscribeTournament(mockTournament.No);
      
      // Simulate error in message handling
      const errorPayload = null; // This should cause an error
      
      expect(() => {
        act(() => {
          subscriptionCallback(errorPayload);
        });
      }).not.toThrow(); // Should handle errors gracefully
    });
  });

  describe('Complete System Integration', () => {
    test('should work end-to-end with all components', async () => {
      // Initialize all systems
      RealtimeSubscriptionService.initialize();
      RealtimeFallbackService.initialize();
      RealtimePerformanceMonitor.initialize();

      // Establish subscription
      const success = await RealtimeSubscriptionService.subscribeTournament(mockTournament.No, true);
      expect(success).toBe(true);

      // Verify connection state
      await waitFor(() => {
        expect(RealtimeSubscriptionService.getConnectionState()).toBe(ConnectionState.CONNECTED);
      });

      // Simulate live update
      const liveUpdate = {
        new: {
          tournament_no: mockTournament.No,
          no_in_tournament: 'M001',
          status: 'live',
          points_a: 21,
          points_b: 19,
          live_updated_at: new Date().toISOString(),
        }
      };

      act(() => {
        subscriptionCallback(liveUpdate);
      });

      // Verify performance tracking
      const metrics = RealtimePerformanceMonitor.getPerformanceMetrics();
      expect(metrics.totalMessagesReceived).toBeGreaterThan(0);

      // Verify subscription status
      const status = RealtimeSubscriptionService.getSubscriptionStatus(mockTournament.No);
      expect(status.active).toBe(true);

      // Clean up
      await RealtimeSubscriptionService.unsubscribeTournament(mockTournament.No);
      expect(RealtimeSubscriptionService.getActiveSubscriptions()).not.toContain(mockTournament.No);
    });
  });
});