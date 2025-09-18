import { useState, useEffect, useCallback, useRef } from 'react';
import { Tournament } from '../types/tournament';
import { 
  TournamentStatusSubscriptionService, 
  TournamentStatusEvent, 
  TournamentStatusEventType 
} from '../services/TournamentStatusSubscriptionService';
import { TournamentStatusMonitor, TournamentProgress } from '../services/TournamentStatusMonitor';
import { useNetworkStatus } from './useNetworkStatus';

/**
 * Tournament status subscription hook configuration
 */
interface UseTournamentStatusConfig {
  tournaments?: Tournament[];
  eventTypes?: TournamentStatusEventType[];
  enableBatching?: boolean;
  batchDelay?: number;
  enableAutoRefresh?: boolean;
}

/**
 * Tournament status hook return type
 */
interface UseTournamentStatusReturn {
  tournaments: Tournament[];
  statusEvents: TournamentStatusEvent[];
  recentlyChangedTournaments: Set<string>;
  subscriptionActive: boolean;
  progress: Map<string, TournamentProgress>;
  error: string | null;
  lastUpdate: Date | null;
  clearRecentChanges: () => void;
  refreshTournamentStatus: (tournamentNo: string) => Promise<void>;
}

/**
 * Hook for managing tournament status real-time subscriptions
 */
export const useTournamentStatus = (
  config: UseTournamentStatusConfig = {}
): UseTournamentStatusReturn => {
  const {
    tournaments: initialTournaments = [],
    eventTypes = [
      TournamentStatusEventType.CRITICAL,
      TournamentStatusEventType.COMPLETION,
      TournamentStatusEventType.INFORMATIONAL
    ],
    enableBatching = true,
    batchDelay = 2000,
    enableAutoRefresh = false
  } = config;

  const [tournaments, setTournaments] = useState<Tournament[]>(initialTournaments);
  const [statusEvents, setStatusEvents] = useState<TournamentStatusEvent[]>([]);
  const [recentlyChangedTournaments, setRecentlyChangedTournaments] = useState<Set<string>>(new Set());
  const [subscriptionActive, setSubscriptionActive] = useState(false);
  const [progress, setProgress] = useState<Map<string, TournamentProgress>>(new Map());
  const [error, setError] = useState<string | null>(null);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);

  const { isConnected } = useNetworkStatus();
  const listenersRef = useRef<Set<any>>(new Set());
  const subscriptionConfigRef = useRef<any>(null);

  /**
   * Handle tournament status events from subscription
   */
  const handleStatusEvents = useCallback((events: TournamentStatusEvent[]) => {
    
    setStatusEvents(prevEvents => {
      // Keep last 50 events
      const newEvents = [...events, ...prevEvents].slice(0, 50);
      return newEvents;
    });

    // Track recently changed tournaments
    const changedTournamentNos = events.map(event => event.tournamentNo);
    setRecentlyChangedTournaments(prev => {
      const updated = new Set(prev);
      changedTournamentNos.forEach(no => updated.add(no));
      return updated;
    });

    // Update tournament data with status changes
    setTournaments(prevTournaments => {
      const updatedTournaments = prevTournaments.map(tournament => {
        const statusEvent = events.find(event => event.tournamentNo === tournament.No);
        if (statusEvent) {
          return {
            ...tournament,
            Status: statusEvent.newStatus,
            // Update dates if they changed
            StartDate: statusEvent.changes.startDate?.new || tournament.StartDate,
            EndDate: statusEvent.changes.endDate?.new || tournament.EndDate,
          };
        }
        return tournament;
      });
      
      return updatedTournaments;
    });

    // Update progress tracking
    events.forEach(async event => {
      if (event.eventType === TournamentStatusEventType.COMPLETION) {
        try {
          // This would require match data - in practice you'd fetch this
          const progressData = TournamentStatusMonitor.getTournamentProgress(event.tournamentNo);
          if (progressData) {
            setProgress(prev => {
              const updated = new Map(prev);
              updated.set(event.tournamentNo, progressData);
              return updated;
            });
          }
        } catch (error) {
          // console.error(`Error updating progress for tournament ${event.tournamentNo}:`, error);
        }
      }
    });

    setLastUpdate(new Date());
    setError(null);
  }, []);

  /**
   * Initialize tournament status subscriptions
   */
  const initializeSubscription = useCallback(async () => {
    if (!isConnected || tournaments.length === 0) {
      setSubscriptionActive(false);
      return;
    }

    try {
      TournamentStatusSubscriptionService.initialize();

      const tournamentNumbers = tournaments.map(t => t.No);
      const subscriptionConfig = {
        tournamentNumbers,
        eventTypes,
        enableBatching,
        batchDelay,
      };

      
      const success = await TournamentStatusSubscriptionService.subscribeTournamentStatus(
        subscriptionConfig,
        handleStatusEvents
      );

      if (success) {
        setSubscriptionActive(true);
        subscriptionConfigRef.current = subscriptionConfig;
      } else {
        setSubscriptionActive(false);
        setError('Failed to establish tournament status subscription');
      }
      
    } catch (error) {
      // console.error('Error initializing tournament status subscription:', error);
      setSubscriptionActive(false);
      setError(error instanceof Error ? error.message : 'Unknown subscription error');
    }
  }, [tournaments, eventTypes, enableBatching, batchDelay, isConnected, handleStatusEvents]);

  /**
   * Cleanup subscriptions
   */
  const cleanupSubscription = useCallback(async () => {
    
    try {
      // Remove listeners
      listenersRef.current.forEach(listener => {
        TournamentStatusSubscriptionService.removeStatusListener(listener);
      });
      listenersRef.current.clear();

      // Cleanup the service
      await TournamentStatusSubscriptionService.cleanup();
      setSubscriptionActive(false);
      
    } catch (error) {
      // console.error('Error cleaning up tournament status subscription:', error);
    }
  }, []);

  /**
   * Clear recently changed tournament indicators
   */
  const clearRecentChanges = useCallback(() => {
    setRecentlyChangedTournaments(new Set());
  }, []);

  /**
   * Refresh tournament status manually
   */
  const refreshTournamentStatus = useCallback(async (tournamentNo: string) => {
    try {
      // In a real implementation, this would trigger a fresh data fetch
      // For now, we'll just update the sync status
      await TournamentStatusMonitor.updateSyncStatus(tournamentNo, 'manual_refresh');
    } catch (error) {
      // console.error(`Error refreshing tournament status for ${tournamentNo}:`, error);
    }
  }, []);

  /**
   * Auto-clear recent changes after timeout
   */
  useEffect(() => {
    if (recentlyChangedTournaments.size > 0) {
      const timeout = setTimeout(() => {
        setRecentlyChangedTournaments(prev => {
          // Clear tournaments that have been marked as changed for more than 30 seconds
          const now = new Date();
          return new Set(); // For simplicity, clear all after 30 seconds
        });
      }, 30000); // 30 seconds

      return () => clearTimeout(timeout);
    }
  }, [recentlyChangedTournaments]);

  /**
   * Initialize subscription when tournaments change
   */
  useEffect(() => {
    if (tournaments.length > 0 && isConnected) {
      initializeSubscription();
    }
    
    return () => {
      cleanupSubscription();
    };
  }, [tournaments, isConnected]); // Only depend on tournaments and connection

  /**
   * Update tournaments when initialTournaments prop changes
   */
  useEffect(() => {
    setTournaments(initialTournaments);
  }, [initialTournaments]);

  /**
   * Cleanup on unmount
   */
  useEffect(() => {
    return () => {
      cleanupSubscription();
    };
  }, []);

  return {
    tournaments,
    statusEvents,
    recentlyChangedTournaments,
    subscriptionActive,
    progress,
    error,
    lastUpdate,
    clearRecentChanges,
    refreshTournamentStatus,
  };
};

/**
 * Lightweight hook for tournament status indicators only
 */
export const useTournamentStatusIndicator = (
  tournamentNumbers: string[]
): {
  recentlyChanged: Set<string>;
  subscriptionActive: boolean;
  clearRecentChanges: () => void;
} => {
  const { 
    recentlyChangedTournaments, 
    subscriptionActive, 
    clearRecentChanges 
  } = useTournamentStatus({
    tournaments: tournamentNumbers.map(no => ({ No: no }) as Tournament),
    eventTypes: [TournamentStatusEventType.CRITICAL, TournamentStatusEventType.COMPLETION],
    enableBatching: true,
    batchDelay: 1000,
  });

  return {
    recentlyChanged: recentlyChangedTournaments,
    subscriptionActive,
    clearRecentChanges,
  };
};

export default useTournamentStatus;