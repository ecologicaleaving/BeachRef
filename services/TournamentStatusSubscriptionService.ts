import { Tournament } from '../types/tournament';
import { BeachMatch } from '../types/match';
import { supabase } from './supabase';
import { RealtimeSubscriptionService, ConnectionState } from './RealtimeSubscriptionService';
import { ConnectionCircuitBreaker } from './ConnectionCircuitBreaker';
import { RealtimePerformanceMonitor } from './RealtimePerformanceMonitor';
import { matchStatusPollingManager } from './MatchStatusPollingManager';
import { MatchPollingStatus } from '../types/api-v2';

/**
 * Tournament status change event types
 */
export enum TournamentStatusEventType {
  CRITICAL = 'CRITICAL',        // Tournament cancellation, postponement
  INFORMATIONAL = 'INFORMATIONAL', // Schedule adjustments, court changes
  COMPLETION = 'COMPLETION'     // Tournament completion
}

/**
 * Tournament status change event
 */
export interface TournamentStatusEvent {
  tournamentNo: string;
  eventType: TournamentStatusEventType;
  oldStatus?: string;
  newStatus: string;
  changes: {
    status?: { old: string; new: string };
    startDate?: { old: string; new: string };
    endDate?: { old: string; new: string };
    court?: { old: string; new: string };
    localDate?: { old: string; new: string };
    localTime?: { old: string; new: string };
  };
  timestamp: Date;
  priority: 'high' | 'normal' | 'low';
}

/**
 * Tournament status subscription configuration
 */
interface TournamentStatusSubscriptionConfig {
  tournamentNumbers: string[];
  eventTypes: TournamentStatusEventType[];
  enableBatching: boolean;
  batchDelay: number;
}

/**
 * Tournament status subscription listener
 */
type TournamentStatusListener = (events: TournamentStatusEvent[]) => void;

/**
 * Tournament Status Real-Time Subscription Service
 * Extends existing RealTimeSubscriptionService for tournament-specific updates
 */
export class TournamentStatusSubscriptionService {
  private static isInitialized = false;
  private static activeTournamentSubscriptions = new Map<string, any>();
  private static activeMatchSubscriptions = new Map<string, any>();
  private static statusListeners = new Set<TournamentStatusListener>();
  private static circuitBreaker: ConnectionCircuitBreaker;
  private static eventQueue: TournamentStatusEvent[] = [];
  private static batchTimeout: NodeJS.Timeout | null = null;
  
  // Configuration
  private static readonly MAX_CONCURRENT_TOURNAMENTS = 10;
  private static readonly BATCH_DELAY_MS = 2000; // 2 seconds
  private static readonly SUBSCRIPTION_FILTER_DAYS = 7; // Only subscribe to tournaments within 7 days

  /**
   * Initialize the tournament status subscription service
   */
  static initialize(): void {
    if (this.isInitialized) return;

    // console.log('Initializing TournamentStatusSubscriptionService');
    
    // Initialize base real-time service
    RealtimeSubscriptionService.initialize();
    
    // Initialize circuit breaker for tournament subscriptions
    this.circuitBreaker = ConnectionCircuitBreaker.getInstance('tournament-status', {
      failureThreshold: 3,
      recoveryTimeout: 30000,
      successThreshold: 2,
      maxTimeout: 300000,
    });
    
    this.isInitialized = true;
  }

  /**
   * Subscribe to tournament status changes for specific tournaments
   */
  static async subscribeTournamentStatus(
    config: TournamentStatusSubscriptionConfig,
    listener: TournamentStatusListener
  ): Promise<boolean> {
    this.initialize();

    if (!this.circuitBreaker.canExecute()) {
      const recommendation = this.circuitBreaker.getRecommendation();
      // console.warn(`Cannot subscribe to tournament status: ${recommendation.reason}`);
      return false;
    }

    // Limit concurrent subscriptions for performance
    if (config.tournamentNumbers.length > this.MAX_CONCURRENT_TOURNAMENTS) {
      // console.warn(`Too many tournaments requested (${config.tournamentNumbers.length}), limiting to ${this.MAX_CONCURRENT_TOURNAMENTS}`);
      config.tournamentNumbers = config.tournamentNumbers.slice(0, this.MAX_CONCURRENT_TOURNAMENTS);
    }

    // Add listener
    this.statusListeners.add(listener);

    try {
      // Subscribe to tournament table changes
      const tournamentSuccess = await this.establishTournamentSubscriptions(config.tournamentNumbers);
      
      // Subscribe to match table changes for schedule/court updates
      const matchSuccess = await this.establishMatchSubscriptions(config.tournamentNumbers);

      const success = tournamentSuccess && matchSuccess;
      
      if (success) {
        this.circuitBreaker.onSuccess();
        // console.log(`Successfully subscribed to tournament status for ${config.tournamentNumbers.length} tournaments`);
      } else {
        this.circuitBreaker.onFailure('Failed to establish tournament status subscriptions');
      }

      return success;
      
    } catch (error) {
      // console.error('Failed to subscribe to tournament status:', error);
      this.circuitBreaker.onFailure(error instanceof Error ? error.message : 'Unknown error');
      return false;
    }
  }

  /**
   * Establish tournament table subscriptions
   */
  private static async establishTournamentSubscriptions(tournamentNumbers: string[]): Promise<boolean> {
    try {
      const tournamentFilter = `no=in.(${tournamentNumbers.join(',')})`;
      
      const subscription = supabase
        .channel('tournament_status_changes')
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'tournaments',
            filter: tournamentFilter
          },
          (payload) => {
            this.handleTournamentStatusChange(payload);
          }
        )
        .subscribe((status) => {
          // console.log(`Tournament status subscription status: ${status}`);
          
          if (status === 'SUBSCRIBED') {
            // console.log('Tournament status subscription established');
          } else if (status === 'CLOSED') {
            // console.log('Tournament status subscription closed');
            this.circuitBreaker.onFailure('Tournament subscription closed');
          }
        });

      this.activeTournamentSubscriptions.set('tournament_status', subscription);
      return true;
      
    } catch (error) {
      // console.error('Failed to establish tournament subscriptions:', error);
      return false;
    }
  }

  /**
   * Establish match table subscriptions for schedule/court changes
   */
  private static async establishMatchSubscriptions(tournamentNumbers: string[]): Promise<boolean> {
    try {
      const matchFilter = `tournament_no=in.(${tournamentNumbers.join(',')})`;
      
      const subscription = supabase
        .channel('tournament_match_changes')
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'matches',
            filter: matchFilter
          },
          (payload) => {
            this.handleMatchScheduleChange(payload);
          }
        )
        .subscribe((status) => {
          // console.log(`Match schedule subscription status: ${status}`);
          
          if (status === 'SUBSCRIBED') {
            // console.log('Match schedule subscription established');
          } else if (status === 'CLOSED') {
            // console.log('Match schedule subscription closed');
            this.circuitBreaker.onFailure('Match subscription closed');
          }
        });

      this.activeMatchSubscriptions.set('tournament_matches', subscription);
      return true;
      
    } catch (error) {
      // console.error('Failed to establish match subscriptions:', error);
      return false;
    }
  }

  /**
   * Handle tournament status changes
   */
  private static handleTournamentStatusChange(payload: any): void {
    try {
      const oldTournament = payload.old;
      const newTournament = payload.new;
      
      // console.log(`Tournament status change detected for ${newTournament.no}:`, {
        oldStatus: oldTournament.status,
        newStatus: newTournament.status
      });

      // Track message for performance monitoring
      const messageSize = JSON.stringify(payload).length;
      RealtimePerformanceMonitor.trackMessageReceived(messageSize, newTournament.no);

      // Create tournament status event
      const event = this.createTournamentStatusEvent(oldTournament, newTournament);
      
      // Add to event queue for batched processing
      this.queueEvent(event);
      
    } catch (error) {
      // console.error('Error handling tournament status change:', error);
    }
  }

  /**
   * Handle match schedule/court changes
   */
  private static handleMatchScheduleChange(payload: any): void {
    try {
      const oldMatch = payload.old;
      const newMatch = payload.new;
      
      // console.log(`Match schedule change detected for tournament ${newMatch.tournament_no}:`, {
        match: newMatch.no_in_tournament,
        changes: this.detectMatchChanges(oldMatch, newMatch)
      });

      // Track message for performance monitoring
      const messageSize = JSON.stringify(payload).length;
      RealtimePerformanceMonitor.trackMessageReceived(messageSize, newMatch.tournament_no);

      // Create schedule change event if significant
      const event = this.createMatchScheduleEvent(oldMatch, newMatch);
      if (event) {
        this.queueEvent(event);
      }
      
    } catch (error) {
      // console.error('Error handling match schedule change:', error);
    }
  }

  /**
   * Create tournament status event from database payload
   */
  private static createTournamentStatusEvent(
    oldTournament: any, 
    newTournament: any
  ): TournamentStatusEvent {
    const changes: any = {};
    
    // Detect status changes
    if (oldTournament.status !== newTournament.status) {
      changes.status = { old: oldTournament.status, new: newTournament.status };
    }
    
    // Detect date changes
    if (oldTournament.start_date !== newTournament.start_date) {
      changes.startDate = { old: oldTournament.start_date, new: newTournament.start_date };
    }
    
    if (oldTournament.end_date !== newTournament.end_date) {
      changes.endDate = { old: oldTournament.end_date, new: newTournament.end_date };
    }

    // Determine event type and priority
    const eventType = this.categorizeStatusEvent(oldTournament, newTournament, changes);
    const priority = this.determinePriority(eventType, changes);

    return {
      tournamentNo: newTournament.no,
      eventType,
      oldStatus: oldTournament.status,
      newStatus: newTournament.status,
      changes,
      timestamp: new Date(),
      priority
    };
  }

  /**
   * Create match schedule event from database payload
   */
  private static createMatchScheduleEvent(
    oldMatch: any, 
    newMatch: any
  ): TournamentStatusEvent | null {
    const changes: any = {};
    
    // Detect schedule changes
    if (oldMatch.local_date !== newMatch.local_date) {
      changes.localDate = { old: oldMatch.local_date, new: newMatch.local_date };
    }
    
    if (oldMatch.local_time !== newMatch.local_time) {
      changes.localTime = { old: oldMatch.local_time, new: newMatch.local_time };
    }
    
    // Detect court changes
    if (oldMatch.court !== newMatch.court) {
      changes.court = { old: oldMatch.court, new: newMatch.court };
    }

    // Only create event if there are significant changes
    if (Object.keys(changes).length === 0) {
      return null;
    }

    const eventType = TournamentStatusEventType.INFORMATIONAL;
    const priority = this.determinePriority(eventType, changes);

    return {
      tournamentNo: newMatch.tournament_no,
      eventType,
      oldStatus: oldMatch.status,
      newStatus: newMatch.status,
      changes,
      timestamp: new Date(),
      priority
    };
  }

  /**
   * Categorize tournament status event type
   */
  private static categorizeStatusEvent(
    oldTournament: any, 
    newTournament: any, 
    changes: any
  ): TournamentStatusEventType {
    // Critical events
    if (newTournament.status === 'Cancelled' || newTournament.status === 'Postponed') {
      return TournamentStatusEventType.CRITICAL;
    }
    
    // Completion events
    if (newTournament.status === 'Finished' && oldTournament.status !== 'Finished') {
      return TournamentStatusEventType.COMPLETION;
    }
    
    // Significant date changes (> 2 hours)
    if (changes.startDate || changes.endDate) {
      const oldDate = new Date(oldTournament.start_date || oldTournament.end_date);
      const newDate = new Date(newTournament.start_date || newTournament.end_date);
      const hoursDiff = Math.abs(newDate.getTime() - oldDate.getTime()) / (1000 * 60 * 60);
      
      if (hoursDiff > 2) {
        return TournamentStatusEventType.CRITICAL;
      }
    }
    
    return TournamentStatusEventType.INFORMATIONAL;
  }

  /**
   * Determine event priority
   */
  private static determinePriority(
    eventType: TournamentStatusEventType, 
    changes: any
  ): 'high' | 'normal' | 'low' {
    if (eventType === TournamentStatusEventType.CRITICAL) {
      return 'high';
    }
    
    if (eventType === TournamentStatusEventType.COMPLETION) {
      return 'normal';
    }
    
    // Court changes are low priority
    if (changes.court && Object.keys(changes).length === 1) {
      return 'low';
    }
    
    return 'normal';
  }

  /**
   * Detect changes between old and new match data
   */
  private static detectMatchChanges(oldMatch: any, newMatch: any): string[] {
    const changes: string[] = [];
    
    if (oldMatch.local_date !== newMatch.local_date) changes.push('date');
    if (oldMatch.local_time !== newMatch.local_time) changes.push('time');
    if (oldMatch.court !== newMatch.court) changes.push('court');
    if (oldMatch.status !== newMatch.status) changes.push('status');
    
    return changes;
  }

  /**
   * Queue event for batched processing
   */
  private static queueEvent(event: TournamentStatusEvent): void {
    this.eventQueue.push(event);
    
    // Set up batched processing if not already scheduled
    if (!this.batchTimeout) {
      this.batchTimeout = setTimeout(() => {
        this.processBatchedEvents();
      }, this.BATCH_DELAY_MS);
    }
  }

  /**
   * Process batched events and notify listeners
   */
  private static processBatchedEvents(): void {
    if (this.eventQueue.length === 0) {
      this.batchTimeout = null;
      return;
    }

    // console.log(`Processing ${this.eventQueue.length} tournament status events`);
    
    // Sort events by priority and timestamp
    const sortedEvents = this.eventQueue.sort((a, b) => {
      const priorityOrder = { high: 3, normal: 2, low: 1 };
      const priorityDiff = priorityOrder[b.priority] - priorityOrder[a.priority];
      
      if (priorityDiff !== 0) return priorityDiff;
      return b.timestamp.getTime() - a.timestamp.getTime();
    });

    // Notify all listeners
    this.statusListeners.forEach(listener => {
      try {
        listener([...sortedEvents]);
      } catch (error) {
        // console.error('Error in tournament status listener:', error);
      }
    });

    // Update adaptive polling for match status changes
    this.updateAdaptivePollingFromEvents(sortedEvents);

    // Clear queue and reset timeout
    this.eventQueue = [];
    this.batchTimeout = null;
  }

  /**
   * Update adaptive polling manager based on tournament status events
   */
  private static updateAdaptivePollingFromEvents(events: TournamentStatusEvent[]): void {
    events.forEach(event => {
      // Only process events that include match status changes
      if (event.changes.status) {
        const matchNo = this.extractMatchNumber(event);
        if (matchNo) {
          const pollingStatus = this.mapStatusToPollingStatus(event.newStatus);
          matchStatusPollingManager.updateMatchStatus(matchNo, pollingStatus);
        }
      }
    });
  }

  /**
   * Extract match number from tournament event (if applicable)
   */
  private static extractMatchNumber(event: TournamentStatusEvent): number | null {
    // In a real implementation, this would extract match number from the event
    // For now, we'll return null since tournament events don't directly contain match numbers
    // This would be extended when match-specific events are added
    return null;
  }

  /**
   * Map tournament/match status to polling status
   */
  private static mapStatusToPollingStatus(status: string): MatchPollingStatus {
    switch (status.toLowerCase()) {
      case 'inprogress':
      case 'running':
      case 'live':
        return MatchPollingStatus.RUNNING;
      case 'scheduled':
      case 'upcoming':
      case 'notstarted':
        return MatchPollingStatus.SCHEDULED;
      case 'finished':
      case 'completed':
      case 'ended':
        return MatchPollingStatus.FINISHED;
      default:
        return MatchPollingStatus.SCHEDULED;
    }
  }

  /**
   * Remove tournament status listener
   */
  static removeStatusListener(listener: TournamentStatusListener): void {
    this.statusListeners.delete(listener);
  }

  /**
   * Get active subscription status
   */
  static getSubscriptionStatus(): {
    activeTournaments: number;
    activeMatches: number;
    circuitBreakerState: string;
    queuedEvents: number;
  } {
    return {
      activeTournaments: this.activeTournamentSubscriptions.size,
      activeMatches: this.activeMatchSubscriptions.size,
      circuitBreakerState: this.circuitBreaker.getState(),
      queuedEvents: this.eventQueue.length,
    };
  }

  /**
   * Cleanup all subscriptions
   */
  static async cleanup(): Promise<void> {
    // console.log('Cleaning up tournament status subscriptions');
    
    // Clear batch timeout
    if (this.batchTimeout) {
      clearTimeout(this.batchTimeout);
      this.batchTimeout = null;
    }

    // Remove all tournament subscriptions
    for (const [key, subscription] of this.activeTournamentSubscriptions) {
      try {
        await supabase.removeChannel(subscription);
        // console.log(`Removed tournament subscription: ${key}`);
      } catch (error) {
        // console.error(`Error removing tournament subscription ${key}:`, error);
      }
    }
    this.activeTournamentSubscriptions.clear();

    // Remove all match subscriptions  
    for (const [key, subscription] of this.activeMatchSubscriptions) {
      try {
        await supabase.removeChannel(subscription);
        // console.log(`Removed match subscription: ${key}`);
      } catch (error) {
        // console.error(`Error removing match subscription ${key}:`, error);
      }
    }
    this.activeMatchSubscriptions.clear();

    // Clear listeners and queue
    this.statusListeners.clear();
    this.eventQueue = [];
    
    // Cleanup circuit breaker
    if (this.circuitBreaker) {
      this.circuitBreaker.cleanup();
    }

    this.isInitialized = false;
    // console.log('Tournament status subscriptions cleanup complete');
  }
}