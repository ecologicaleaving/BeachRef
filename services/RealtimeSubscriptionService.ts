import { BeachMatch } from '../types/match';
import { supabase } from './supabase';
import { CacheServiceCompatibility as CacheService } from '../hooks/compatibility/CacheServiceCompatibility';
import { AppState } from 'react-native';
import { RealtimePerformanceMonitor, ConnectionState } from './RealtimePerformanceMonitor';
// `ConnectionState` is a runtime enum and `hooks/useRealtimeSubscription.ts`
// imports it *from this module* and compares against its members. Importing a
// name is not re-exporting it: without this line the hook received `undefined`
// and `state === ConnectionState.CONNECTED` threw. Same family as the two bugs
// above (issues #71 / #73).
export { ConnectionState };
import { RealtimeFallbackService } from './RealtimeFallbackService';
import { ConnectionCircuitBreaker, CircuitState } from './ConnectionCircuitBreaker';
import { NotificationTriggerService } from './notifications/NotificationTriggerService';
// `RefereeAssignmentsService` has no default export — only `export class`.
// The default import used to resolve to `undefined` at runtime, so every
// notification-triggering path below died with
// "Cannot read properties of undefined (reading 'getCurrentReferee')".
// Same family as issue #43/#71: a singleton imported the wrong way.
import { RefereeAssignmentsService } from './RefereeAssignmentsService';

// Subscription configuration
interface SubscriptionConfig {
  tournamentNo: string;
  maxRetries: number;
  retryDelay: number;
  lastRetryAttempt?: number;
}

// Event listeners for connection state changes
type ConnectionStateListener = (state: ConnectionState, error?: string) => void;

/**
 * Enhanced Real-time subscription service for live match updates
 * Manages WebSocket connections with automatic reconnection and battery optimization
 * 
 * Features:
 * - Connection state management with automatic reconnection
 * - Exponential backoff retry logic
 * - Battery optimization through efficient connection management
 * - Subscription filtering for live matches only
 * - Component lifecycle management
 */
export class RealtimeSubscriptionService {
  private static instance: RealtimeSubscriptionService | null = null;
  private static activeSubscriptions = new Map<string, any>();
  private static subscriptionConfigs = new Map<string, SubscriptionConfig>();
  private static connectionState: ConnectionState = ConnectionState.DISCONNECTED;
  private static connectionStateListeners = new Set<ConnectionStateListener>();
  private static isInitialized = false;
  private static reconnectTimeouts = new Map<string, TimerHandle>();
  private static appStateSubscription: any = null;
  private static circuitBreakers = new Map<string, ConnectionCircuitBreaker>();
  private static fallbackActive = new Map<string, boolean>();
  
  // Configuration constants
  private static readonly MAX_RETRY_ATTEMPTS = 5;
  private static readonly BASE_RETRY_DELAY = 1000; // 1 second
  private static readonly MAX_RETRY_DELAY = 30000; // 30 seconds
  private static readonly CONNECTION_TIMEOUT = 10000; // 10 seconds

  /**
   * Private constructor to prevent direct instantiation
   */
  private constructor() {}

  /**
   * Get singleton instance
   */
  public static getInstance(): RealtimeSubscriptionService {
    if (!RealtimeSubscriptionService.instance) {
      RealtimeSubscriptionService.instance = new RealtimeSubscriptionService();
    }
    return RealtimeSubscriptionService.instance;
  }

  /**
   * Instance method: Subscribe to matches for a tournament (delegates to static method)
   */
  public subscribeToMatches(tournamentCode: string, callback?: (match: any) => void): string | null {
    // Extract tournament number from code if needed
    const tournamentNo = tournamentCode;
    
    // Subscribe to tournament and return subscription ID
    RealtimeSubscriptionService.subscribeTournament(tournamentNo, true);
    
    // Return subscription ID for compatibility
    return `matches_${tournamentNo}`;
  }

  /**
   * Instance method: Unsubscribe from a subscription (delegates to static method)
   */
  public unsubscribe(subscriptionId: string): void {
    // Extract tournament number from subscription ID
    const tournamentNo = subscriptionId.replace('matches_', '');
    
    // Unsubscribe from tournament
    RealtimeSubscriptionService.unsubscribeTournament(tournamentNo);
  }

  /**
   * Initialize the real-time subscription service with app state monitoring
   */
  static initialize(): void {
    if (this.isInitialized) return;

    
    // Initialize performance monitoring
    RealtimePerformanceMonitor.initialize();
    
    // Initialize fallback service
    RealtimeFallbackService.initialize();
    
    // Set up app state change monitoring for battery optimization
    this.appStateSubscription = AppState.addEventListener('change', (nextAppState) => {
      this.handleAppStateChange(nextAppState);
    });
    
    this.isInitialized = true;
    this.setConnectionState(ConnectionState.DISCONNECTED);
  }

  /**
   * Get or create circuit breaker for a tournament
   */
  private static getCircuitBreaker(tournamentNo: string): ConnectionCircuitBreaker {
    if (!this.circuitBreakers.has(tournamentNo)) {
      const circuitBreaker = ConnectionCircuitBreaker.getInstance(
        `tournament-${tournamentNo}`,
        {
          failureThreshold: 3,
          recoveryTimeout: 30000,
          successThreshold: 2,
          maxTimeout: 300000,
        }
      );
      this.circuitBreakers.set(tournamentNo, circuitBreaker);
    }
    return this.circuitBreakers.get(tournamentNo)!;
  }

  /**
   * Add a connection state listener
   */
  static addConnectionStateListener(listener: ConnectionStateListener): () => void {
    this.connectionStateListeners.add(listener);
    // Return unsubscribe function
    return () => {
      this.connectionStateListeners.delete(listener);
    };
  }

  /**
   * Get current connection state
   */
  static getConnectionState(): ConnectionState {
    return this.connectionState;
  }

  /**
   * Set connection state and notify listeners
   */
  private static setConnectionState(state: ConnectionState, error?: string): void {
    if (this.connectionState !== state) {
      this.connectionState = state;
      
      // Notify all listeners
      this.connectionStateListeners.forEach(listener => {
        try {
          listener(state, error);
        } catch (err) {
          // console.error('Error in connection state listener:', err);
        }
      });
    }
  }

  /**
   * Handle app state changes for battery optimization
   */
  private static handleAppStateChange(nextAppState: string): void {
    if (nextAppState === 'background') {
      this.pauseAllSubscriptions();
    } else if (nextAppState === 'active') {
      this.resumeAllSubscriptions();
    }
  }

  /**
   * Pause all active subscriptions (for battery optimization)
   */
  private static pauseAllSubscriptions(): void {
    for (const [_tournamentNo, subscription] of this.activeSubscriptions) {
      try {
        subscription.unsubscribe();
      } catch (error) {
        // console.error(`Error pausing subscription for tournament ${tournamentNo}:`, error);
      }
    }
  }

  /**
   * Resume all paused subscriptions
   */
  private static resumeAllSubscriptions(): void {
    const tournamentNumbers = Array.from(this.subscriptionConfigs.keys());
    
    for (const tournamentNo of tournamentNumbers) {
      this.reconnectTournament(tournamentNo);
    }
  }

  /**
   * Subscribe to live match updates for a tournament with enhanced error handling
   */
  static async subscribeTournament(tournamentNo: string, liveMatchesOnly: boolean = true): Promise<boolean> {
    this.initialize();

    if (!tournamentNo) {
      // console.warn('Cannot subscribe without tournament number');
      return false;
    }

    // Check if we already have a subscription for this tournament
    if (this.activeSubscriptions.has(tournamentNo)) {
      return true;
    }

    // Initialize configuration for this tournament
    const config: SubscriptionConfig = {
      tournamentNo,
      maxRetries: this.MAX_RETRY_ATTEMPTS,
      retryDelay: this.BASE_RETRY_DELAY
    };
    
    this.subscriptionConfigs.set(tournamentNo, config);

    return this.establishSubscription(tournamentNo, liveMatchesOnly);
  }

  /**
   * Subscribe to live match updates using matches array (backward compatibility)
   */
  static async subscribeLiveMatches(matches: BeachMatch[]): Promise<void> {
    this.initialize();

    const liveMatches = matches.filter(match => this.isLiveMatch(match));
    if (liveMatches.length === 0) {
      return;
    }

    // Extract tournament number from matches (they should all be from same tournament)
    const tournamentNo = this.extractTournamentNo(liveMatches[0]);
    if (!tournamentNo) {
      // console.warn('Cannot determine tournament number for real-time subscription');
      return;
    }

    await this.subscribeTournament(tournamentNo, true);
  }

  /**
   * Establish WebSocket subscription with automatic reconnection
   */
  private static async establishSubscription(tournamentNo: string, liveMatchesOnly: boolean): Promise<boolean> {
    const config = this.subscriptionConfigs.get(tournamentNo);
    if (!config) {
      // console.error(`No configuration found for tournament ${tournamentNo}`);
      return false;
    }

    const circuitBreaker = this.getCircuitBreaker(tournamentNo);
    
    // Check circuit breaker before attempting connection
    if (!circuitBreaker.canExecute()) {
      const recommendation = circuitBreaker.getRecommendation();
      // console.warn(`Circuit breaker blocks connection to ${tournamentNo}: ${recommendation.reason}`);
      
      if (recommendation.fallbackSuggested) {
        return this.activateFallback(tournamentNo, liveMatchesOnly);
      }
      return false;
    }

    this.setConnectionState(ConnectionState.CONNECTING);

    try {
      
      // Build filter for live matches if requested
      const filter = liveMatchesOnly 
        ? `tournament_no=eq.${tournamentNo}&status=in.(live,in_progress,running)`
        : `tournament_no=eq.${tournamentNo}`;
      
      // Create Supabase real-time subscription with connection timeout
      const subscription = supabase
        .channel(`matches_${tournamentNo}`)
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'matches',
            filter: filter
          },
          (payload) => {
            
            // Track message for performance monitoring
            const messageSize = JSON.stringify(payload).length;
            RealtimePerformanceMonitor.trackMessageReceived(messageSize, tournamentNo);
            
            this.handleMatchUpdate(payload);
          }
        )
        .subscribe((status) => {
          
          if (status === 'SUBSCRIBED') {
            this.setConnectionState(ConnectionState.CONNECTED);
            // Reset retry config on successful connection
            config.retryDelay = this.BASE_RETRY_DELAY;
            config.lastRetryAttempt = undefined;
            // Record success in circuit breaker
            circuitBreaker.onSuccess();
            // Stop fallback if it was active
            this.deactivateFallback(tournamentNo);
          } else if (status === 'CLOSED') {
            this.setConnectionState(ConnectionState.DISCONNECTED);
            // Record failure in circuit breaker
            circuitBreaker.onFailure('Connection closed');
            // Attempt reconnection or fallback
            this.scheduleReconnection(tournamentNo);
          }
        });

      this.activeSubscriptions.set(tournamentNo, subscription);
      
      return true;

    } catch (error) {
      // console.error(`Failed to establish real-time subscription for tournament ${tournamentNo}:`, error);
      this.setConnectionState(ConnectionState.ERROR, error.message);
      
      // Record failure in circuit breaker
      circuitBreaker.onFailure(error.message);
      
      // Check if we should use fallback
      const recommendation = circuitBreaker.getRecommendation();
      if (recommendation.fallbackSuggested) {
        return this.activateFallback(tournamentNo, liveMatchesOnly);
      }
      
      // Schedule reconnection with exponential backoff
      this.scheduleReconnection(tournamentNo);
      return false;
    }
  }

  /**
   * Schedule reconnection with exponential backoff
   */
  private static scheduleReconnection(tournamentNo: string): void {
    const config = this.subscriptionConfigs.get(tournamentNo);
    if (!config) return;

    // Clear existing timeout if any
    const existingTimeout = this.reconnectTimeouts.get(tournamentNo);
    if (existingTimeout) {
      clearTimeout(existingTimeout);
    }

    if (config.maxRetries <= 0) {
      // console.error(`Maximum reconnection attempts reached for tournament ${tournamentNo}`);
      this.setConnectionState(ConnectionState.ERROR, 'Maximum reconnection attempts reached');
      return;
    }

    this.setConnectionState(ConnectionState.RECONNECTING);
    
    
    const timeout = setTimeout(() => {
      this.reconnectTournament(tournamentNo);
    }, config.retryDelay);
    
    this.reconnectTimeouts.set(tournamentNo, timeout);
    
    // Exponential backoff with jitter
    config.retryDelay = Math.min(
      config.retryDelay * 2 + (Math.random() * 1000),
      this.MAX_RETRY_DELAY
    );
    config.maxRetries--;
    config.lastRetryAttempt = Date.now();
  }

  /**
   * Reconnect to tournament subscription
   */
  private static async reconnectTournament(tournamentNo: string): Promise<void> {
    
    // Remove existing subscription if any
    await this.unsubscribeTournament(tournamentNo);
    
    // Re-establish subscription
    const config = this.subscriptionConfigs.get(tournamentNo);
    if (config) {
      await this.establishSubscription(tournamentNo, true);
    }
  }

  /**
   * Unsubscribe from real-time updates for a tournament
   */
  static async unsubscribeTournament(tournamentNo: string): Promise<void> {
    const subscription = this.activeSubscriptions.get(tournamentNo);
    if (!subscription) {
      return;
    }

    try {
      // Clear reconnection timeout if any
      const timeout = this.reconnectTimeouts.get(tournamentNo);
      if (timeout) {
        clearTimeout(timeout);
        this.reconnectTimeouts.delete(tournamentNo);
      }

      await supabase.removeChannel(subscription);
      this.activeSubscriptions.delete(tournamentNo);
      this.subscriptionConfigs.delete(tournamentNo);
      
      
      // Update connection state if no more active subscriptions
      if (this.activeSubscriptions.size === 0) {
        this.setConnectionState(ConnectionState.DISCONNECTED);
      }
    } catch (error) {
      // console.error(`Error removing real-time subscription for tournament ${tournamentNo}:`, error);
    }
  }

  /**
   * Clean up all active subscriptions (call when app is unmounting or pausing)
   */
  static async cleanup(): Promise<void> {
    
    // Clear all timeouts
    for (const timeout of this.reconnectTimeouts.values()) {
      clearTimeout(timeout);
    }
    this.reconnectTimeouts.clear();
    
    // Unsubscribe from all tournaments
    const cleanupPromises = Array.from(this.activeSubscriptions.keys()).map(
      tournamentNo => this.unsubscribeTournament(tournamentNo)
    );

    await Promise.all(cleanupPromises);
    
    // Clean up app state subscription
    if (this.appStateSubscription) {
      this.appStateSubscription?.remove();
      this.appStateSubscription = null;
    }
    
    // Clean up performance monitoring
    RealtimePerformanceMonitor.cleanup();
    
    // Clean up fallback service
    RealtimeFallbackService.cleanup();
    
    // Clean up circuit breakers
    for (const circuitBreaker of this.circuitBreakers.values()) {
      circuitBreaker.cleanup();
    }
    this.circuitBreakers.clear();
    this.fallbackActive.clear();
    
    // Clear all listeners and reset state
    this.connectionStateListeners.clear();
    this.setConnectionState(ConnectionState.DISCONNECTED);
    this.isInitialized = false;
    
  }

  /**
   * Get list of active subscription tournament numbers
   */
  static getActiveSubscriptions(): string[] {
    return Array.from(this.activeSubscriptions.keys());
  }

  /**
   * Get subscription status for a tournament
   */
  static getSubscriptionStatus(tournamentNo: string): { 
    active: boolean; 
    retrying: boolean; 
    lastRetryAttempt?: number; 
    retriesRemaining?: number;
    fallbackActive: boolean;
    circuitBreakerState?: CircuitState;
  } {
    const hasActiveSubscription = this.activeSubscriptions.has(tournamentNo);
    const config = this.subscriptionConfigs.get(tournamentNo);
    const hasReconnectTimeout = this.reconnectTimeouts.has(tournamentNo);
    const fallbackActive = this.fallbackActive.get(tournamentNo) || false;
    const circuitBreaker = this.circuitBreakers.get(tournamentNo);
    
    return {
      active: hasActiveSubscription,
      retrying: hasReconnectTimeout,
      lastRetryAttempt: config?.lastRetryAttempt,
      retriesRemaining: config?.maxRetries,
      fallbackActive,
      circuitBreakerState: circuitBreaker?.getState(),
    };
  }

  /**
   * Handle real-time match updates
   */
  private static async handleMatchUpdate(payload: any): Promise<void> {
    try {
      const updatedMatch = payload.new;
      const oldMatch = payload.old;

      // Clear relevant cache entries to force fresh data on next request
      await this.invalidateMatchCache(updatedMatch.tournament_no);

      // Trigger notification if match just finished
      if (
        updatedMatch.status === 'Finished' &&
        oldMatch?.status !== 'Finished'
      ) {
        await this.notifyMatchFinished(updatedMatch);
      }

      // Check if match is no longer live - if so, we can remove the subscription
      if (!this.isLiveMatchStatus(updatedMatch.status)) {
        this.checkTournamentSubscriptionNeeded(updatedMatch.tournament_no);
      }
    } catch (error) {
      // console.error('Error handling match update:', error);
    }
  }

  /**
   * Send notification when match finishes
   */
  private static async notifyMatchFinished(match: any): Promise<void> {
    try {
      // Get current referee to check if they are assigned to this match
      const referee = await RefereeAssignmentsService.getCurrentReferee();

      if (!referee) {
        return;
      }

      // Get referee assignments for this tournament
      const assignments = await RefereeAssignmentsService.getRefereeAssignments(
        match.tournament_no.toString()
      );

      // Check if referee is assigned to this match
      const allAssignments = [
        ...assignments.current,
        ...assignments.upcoming,
        ...assignments.completed
      ];

      const isAssigned = allAssignments.some(
        a => a.matchNo === match.match_no?.toString()
      );

      if (!isAssigned) {
        return;
      }

      // Build teams string
      let teams = '';
      if (match.team1_name && match.team2_name) {
        teams = `${match.team1_name} vs ${match.team2_name}`;
      }

      // Trigger notification
      await NotificationTriggerService.getInstance().triggerMatchResult({
        refereeId: referee.id?.toString() || referee.visRefereeNo,
        matchId: match.id,
        tournamentNo: match.tournament_no.toString(),
        status: match.status,
        teams
      });

      console.log('[RealtimeSubscriptionService] Triggered match result notification for match:', match.match_no);
    } catch (error) {
      console.error('[RealtimeSubscriptionService] Failed to notify match finished:', error);
    }
  }

  /**
   * Invalidate cache for a tournament when live updates are received
   */
  private static async invalidateMatchCache(tournamentNo: string): Promise<void> {
    try {
      await CacheService.invalidateMatchCache(tournamentNo);
    } catch (error) {
      // console.error(`Failed to invalidate cache for tournament ${tournamentNo}:`, error);
    }
  }

  /**
   * Check if tournament still has live matches and adjust subscription accordingly
   */
  private static async checkTournamentSubscriptionNeeded(tournamentNo: string): Promise<void> {
    // This would check if the tournament still has live matches
    // If no live matches remain, we could remove the subscription
  }

  /**
   * Check if a match is live and requires real-time updates
   */
  private static isLiveMatch(match: BeachMatch): boolean {
    const status = match.Status?.toLowerCase();
    return status === 'live' || 
           status === 'inprogress' || 
           status === 'running';
  }

  /**
   * Check if a status indicates a live match
   */
  private static isLiveMatchStatus(status: string): boolean {
    const lowerStatus = status?.toLowerCase();
    return lowerStatus === 'live' || 
           lowerStatus === 'inprogress' || 
           lowerStatus === 'running';
  }

  /**
   * Extract tournament number from match data
   */
  private static extractTournamentNo(match: BeachMatch): string | null {
    // Check if match has tournament number in different possible fields
    return (match as any).tournamentNo || 
           (match as any).tournament_no || 
           (match as any).TournamentNo ||
           null;
  }

  /**
   * Activate fallback polling for a tournament
   */
  private static async activateFallback(tournamentNo: string, liveMatchesOnly: boolean): Promise<boolean> {
    
    const hasLiveMatches = liveMatchesOnly;
    this.fallbackActive.set(tournamentNo, true);
    
    const success = await RealtimeFallbackService.startPollingFallback(
      tournamentNo,
      (matches) => {
        // Simulate real-time update by triggering cache invalidation
        this.handleFallbackUpdate(tournamentNo, matches);
      },
      hasLiveMatches
    );
    
    if (success) {
      this.setConnectionState(ConnectionState.CONNECTED); // Show as connected via fallback
    } else {
      this.fallbackActive.set(tournamentNo, false);
      // console.error(`Failed to activate fallback polling for tournament ${tournamentNo}`);
    }
    
    return success;
  }

  /**
   * Deactivate fallback polling for a tournament
   */
  private static deactivateFallback(tournamentNo: string): void {
    if (this.fallbackActive.get(tournamentNo)) {
      RealtimeFallbackService.stopPollingFallback(tournamentNo);
      this.fallbackActive.set(tournamentNo, false);
    }
  }

  /**
   * Handle updates from fallback polling
   */
  private static async handleFallbackUpdate(tournamentNo: string, matches: BeachMatch[]): Promise<void> {
    try {
      
      // Trigger the same cache invalidation as real-time updates
      await this.invalidateMatchCache(tournamentNo);
      
      // Note: The UI will update automatically through the cache invalidation
      // and the useRealtimeData hooks will fetch the new data
      
    } catch (error) {
      // console.error(`Error handling fallback update for tournament ${tournamentNo}:`, error);
    }
  }
}