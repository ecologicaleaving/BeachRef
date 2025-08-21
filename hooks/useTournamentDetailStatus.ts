import { useState, useEffect, useCallback, useRef } from 'react';
import { Tournament } from '../types/tournament';
import { BeachMatch } from '../types/match';
import { 
  TournamentStatusSubscriptionService, 
  TournamentStatusEvent, 
  TournamentStatusEventType 
} from '../services/TournamentStatusSubscriptionService';
import { TournamentStatusMonitor, TournamentProgress, ScheduleChangeResult, CourtAssignmentChange } from '../services/TournamentStatusMonitor';
import { useNetworkStatus } from './useNetworkStatus';

/**
 * Tournament detail status hook configuration
 */
interface UseTournamentDetailStatusConfig {
  tournament: Tournament;
  matches?: BeachMatch[];
  enableScheduleChangeTracking?: boolean;
  enableCourtChangeTracking?: boolean;
  enableProgressTracking?: boolean;
}

/**
 * Tournament detail status hook return type
 */
interface UseTournamentDetailStatusReturn {
  tournament: Tournament;
  statusEvents: TournamentStatusEvent[];
  scheduleChanges: ScheduleChangeResult | null;
  courtChanges: CourtAssignmentChange[];
  progress: TournamentProgress | null;
  recentScheduleChanges: Set<string>; // Match numbers with recent schedule changes
  recentCourtChanges: Set<string>; // Match numbers with recent court changes
  subscriptionActive: boolean;
  error: string | null;
  lastUpdate: Date | null;
  clearRecentChanges: () => void;
  refreshTournamentStatus: () => Promise<void>;
}

/**
 * Match change tracking
 */
interface MatchChangeTracker {
  matchNo: string;
  lastUpdate: Date;
  changeType: 'schedule' | 'court' | 'status';
  isRecent: boolean;
}

/**
 * Hook for managing tournament detail real-time status subscriptions
 */
export const useTournamentDetailStatus = (
  config: UseTournamentDetailStatusConfig
): UseTournamentDetailStatusReturn => {
  const {
    tournament,
    matches = [],
    enableScheduleChangeTracking = true,
    enableCourtChangeTracking = true,
    enableProgressTracking = true
  } = config;

  const [updatedTournament, setUpdatedTournament] = useState<Tournament>(tournament);
  const [statusEvents, setStatusEvents] = useState<TournamentStatusEvent[]>([]);
  const [scheduleChanges, setScheduleChanges] = useState<ScheduleChangeResult | null>(null);
  const [courtChanges, setCourtChanges] = useState<CourtAssignmentChange[]>([]);
  const [progress, setProgress] = useState<TournamentProgress | null>(null);
  const [recentScheduleChanges, setRecentScheduleChanges] = useState<Set<string>>(new Set());
  const [recentCourtChanges, setRecentCourtChanges] = useState<Set<string>>(new Set());
  const [subscriptionActive, setSubscriptionActive] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);

  const { isConnected } = useNetworkStatus();
  const matchChangeTrackerRef = useRef<Map<string, MatchChangeTracker>>(new Map());
  const previousMatchesRef = useRef<BeachMatch[]>([]);

  /**
   * Handle tournament status events from subscription
   */
  const handleStatusEvents = useCallback((events: TournamentStatusEvent[]) => {
    // console.log(`Received ${events.length} tournament detail status events for tournament ${tournament.No}`);
    
    setStatusEvents(prevEvents => {
      // Keep last 20 events for detail view
      const newEvents = [...events, ...prevEvents].slice(0, 20);
      return newEvents;
    });

    // Process events for the current tournament
    const tournamentEvents = events.filter(event => event.tournamentNo === tournament.No);
    
    if (tournamentEvents.length === 0) return;

    // Update tournament data with status changes
    setUpdatedTournament(prevTournament => {
      const latestEvent = tournamentEvents[0];
      return {
        ...prevTournament,
        Status: latestEvent.newStatus,
        // Update dates if they changed
        StartDate: latestEvent.changes.startDate?.new || prevTournament.StartDate,
        EndDate: latestEvent.changes.endDate?.new || prevTournament.EndDate,
      };
    });

    // Track schedule and court changes
    tournamentEvents.forEach(event => {
      // Track schedule changes
      if (event.changes.localDate || event.changes.localTime) {
        setRecentScheduleChanges(prev => {
          const updated = new Set(prev);
          // For schedule changes, we might not have the specific match number
          // In a real implementation, this would be included in the event
          updated.add('schedule_changed');
          return updated;
        });
      }

      // Track court changes
      if (event.changes.court) {
        setRecentCourtChanges(prev => {
          const updated = new Set(prev);
          updated.add('court_changed');
          return updated;
        });
      }
    });

    setLastUpdate(new Date());
    setError(null);
  }, [tournament.No]);

  /**
   * Track match changes when matches update
   */
  const trackMatchChanges = useCallback(async () => {
    if (matches.length === 0 || previousMatchesRef.current.length === 0) {
      previousMatchesRef.current = matches;
      return;
    }

    try {
      // Detect schedule changes
      if (enableScheduleChangeTracking) {
        const scheduleResult = await TournamentStatusMonitor.detectScheduleChanges(
          tournament.No, 
          matches
        );
        
        if (scheduleResult.changeCount > 0) {
          setScheduleChanges(scheduleResult);
          
          // Track recently changed matches
          const changedMatchNos = scheduleResult.changedMatches.map(change => change.matchNo);
          setRecentScheduleChanges(prev => {
            const updated = new Set(prev);
            changedMatchNos.forEach(no => updated.add(no));
            return updated;
          });
        }
      }

      // Detect court assignment changes
      if (enableCourtChangeTracking) {
        const courtChangeResults = TournamentStatusMonitor.trackCourtAssignmentChanges(
          tournament.No,
          previousMatchesRef.current,
          matches
        );
        
        if (courtChangeResults.length > 0) {
          setCourtChanges(prevChanges => [...courtChangeResults, ...prevChanges].slice(0, 20));
          
          // Track recently changed matches
          const changedMatchNos = courtChangeResults.map(change => change.matchNo);
          setRecentCourtChanges(prev => {
            const updated = new Set(prev);
            changedMatchNos.forEach(no => updated.add(no));
            return updated;
          });
        }
      }

      // Update tournament progress
      if (enableProgressTracking) {
        const progressData = TournamentStatusMonitor.calculateTournamentProgress(
          tournament.No,
          matches
        );
        setProgress(progressData);
      }

      previousMatchesRef.current = matches;
      
    } catch (error) {
      // console.error('Error tracking match changes:', error);
    }
  }, [matches, tournament.No, enableScheduleChangeTracking, enableCourtChangeTracking, enableProgressTracking]);

  /**
   * Initialize tournament status subscription
   */
  const initializeSubscription = useCallback(async () => {
    if (!isConnected) {
      setSubscriptionActive(false);
      return;
    }

    try {
      TournamentStatusSubscriptionService.initialize();

      const subscriptionConfig = {
        tournamentNumbers: [tournament.No],
        eventTypes: [
          TournamentStatusEventType.CRITICAL,
          TournamentStatusEventType.COMPLETION,
          TournamentStatusEventType.INFORMATIONAL
        ],
        enableBatching: true,
        batchDelay: 1000, // Faster updates for detail view
      };

      // console.log(`Subscribing to tournament detail status for tournament ${tournament.No}`);
      
      const success = await TournamentStatusSubscriptionService.subscribeTournamentStatus(
        subscriptionConfig,
        handleStatusEvents
      );

      if (success) {
        setSubscriptionActive(true);
        // console.log('Tournament detail status subscription established successfully');
      } else {
        setSubscriptionActive(false);
        setError('Failed to establish tournament detail status subscription');
      }
      
    } catch (error) {
      // console.error('Error initializing tournament detail status subscription:', error);
      setSubscriptionActive(false);
      setError(error instanceof Error ? error.message : 'Unknown subscription error');
    }
  }, [tournament.No, isConnected, handleStatusEvents]);

  /**
   * Cleanup subscription
   */
  const cleanupSubscription = useCallback(async () => {
    // console.log('Cleaning up tournament detail status subscription');
    
    try {
      await TournamentStatusSubscriptionService.cleanup();
      setSubscriptionActive(false);
      
    } catch (error) {
      // console.error('Error cleaning up tournament detail status subscription:', error);
    }
  }, []);

  /**
   * Clear recently changed indicators
   */
  const clearRecentChanges = useCallback(() => {
    setRecentScheduleChanges(new Set());
    setRecentCourtChanges(new Set());
    matchChangeTrackerRef.current.clear();
  }, []);

  /**
   * Refresh tournament status manually
   */
  const refreshTournamentStatus = useCallback(async () => {
    try {
      // console.log(`Manually refreshing tournament detail status for ${tournament.No}`);
      
      // Update sync status
      await TournamentStatusMonitor.updateSyncStatus(tournament.No, 'manual_refresh_detail');
      
      // Re-track match changes
      await trackMatchChanges();
      
    } catch (error) {
      // console.error(`Error refreshing tournament detail status:`, error);
      setError(error instanceof Error ? error.message : 'Failed to refresh status');
    }
  }, [tournament.No, trackMatchChanges]);

  /**
   * Auto-clear recent changes after timeout
   */
  useEffect(() => {
    if (recentScheduleChanges.size > 0 || recentCourtChanges.size > 0) {
      const timeout = setTimeout(() => {
        setRecentScheduleChanges(new Set());
        setRecentCourtChanges(new Set());
      }, 30000); // 30 seconds

      return () => clearTimeout(timeout);
    }
  }, [recentScheduleChanges, recentCourtChanges]);

  /**
   * Track match changes when matches update
   */
  useEffect(() => {
    if (matches.length > 0) {
      trackMatchChanges();
    }
  }, [matches, trackMatchChanges]);

  /**
   * Initialize subscription when tournament or connection changes
   */
  useEffect(() => {
    if (isConnected) {
      initializeSubscription();
    }
    
    return () => {
      cleanupSubscription();
    };
  }, [tournament.No, isConnected]); // Only depend on tournament and connection

  /**
   * Update tournament when prop changes
   */
  useEffect(() => {
    setUpdatedTournament(tournament);
  }, [tournament]);

  /**
   * Cleanup on unmount
   */
  useEffect(() => {
    return () => {
      cleanupSubscription();
    };
  }, []);

  return {
    tournament: updatedTournament,
    statusEvents,
    scheduleChanges,
    courtChanges,
    progress,
    recentScheduleChanges,
    recentCourtChanges,
    subscriptionActive,
    error,
    lastUpdate,
    clearRecentChanges,
    refreshTournamentStatus,
  };
};

export default useTournamentDetailStatus;