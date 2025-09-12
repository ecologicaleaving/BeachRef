import { BeachMatch } from '../types/match';
import { Tournament } from '../types/tournament';
import { supabase } from './supabase';
import { CacheServiceCompatibility as CacheService } from '../hooks/compatibility/CacheServiceCompatibility';
import { AppState } from 'react-native';
import { RealtimePerformanceMonitor, ConnectionState } from './RealtimePerformanceMonitor';
import { RealtimeFallbackService } from './RealtimeFallbackService';
import { ConnectionCircuitBreaker, CircuitState } from './ConnectionCircuitBreaker';

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
  private static reconnectTimeouts = new Map<string, NodeJS.Timeout>();
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

    // console.log('Initializing Enhanced RealtimeSubscriptionService');
    
    // Initialize performance monitoring
    RealtimePerformanceMonitor.initialize();
    
    // Initialize fallback service
    RealtimeFallbackService.initialize();
    
    // Set up app state change monitoring for battery optimization
    this.appStateSubscription = AppState.addEventListener('change', (nextAppState) => {
      // console.log(`App state changed to: ${nextAppState}`);
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
      // console.log(`Connection state changed: ${this.connectionState} -> ${state}${error ? ` (${error})` : ''}`);
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
      // console.log('App went to background - pausing real-time subscriptions');
      this.pauseAllSubscriptions();
    } else if (nextAppState === 'active') {
      // console.log('App became active - resuming real-time subscriptions');
      this.resumeAllSubscriptions();
    }
  }

  /**
   * Pause all active subscriptions (for battery optimization)
   */
  private static pauseAllSubscriptions(): void {
    for (const [tournamentNo, subscription] of this.activeSubscriptions) {
      try {
        subscription.unsubscribe();
        // console.log(`Paused subscription for tournament ${tournamentNo}`);
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
      // console.log(`Real-time subscription already active for tournament ${tournamentNo}`);
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
      // console.log('No live matches found, skipping real-time subscription');
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
      // console.log(`Establishing real-time subscription for tournament ${tournamentNo}${liveMatchesOnly ? ' (live matches only)' : ''}`);
      
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
            // console.log('Live match update received:', payload);
            
            // Track message for performance monitoring
            const messageSize = JSON.stringify(payload).length;
            RealtimePerformanceMonitor.trackMessageReceived(messageSize, tournamentNo);
            
            this.handleMatchUpdate(payload);
          }
        )
        .subscribe((status) => {
          // console.log(`Real-time subscription status for tournament ${tournamentNo}:`, status);
          
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
      // console.log(`Real-time subscription established for tournament ${tournamentNo}`);
      
      return true;

    } catch (error) {
      // console.error(`Failed to establish real-time subscription for tournament ${tournamentNo}:`, error);
      this.setConnectionState(ConnectionState.ERROR, error.message);
      
      // Record failure in circuit breaker
      circuitBreaker.onFailure(error.message);
      
      // Check if we should use fallback
      const recommendation = circuitBreaker.getRecommendation();
      if (recommendation.fallbackSuggested) {
        // console.log(`Activating fallback for tournament ${tournamentNo} due to connection failure`);
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
    
    // console.log(`Scheduling reconnection for tournament ${tournamentNo} in ${config.retryDelay}ms (attempts remaining: ${config.maxRetries})`);
    
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
    // console.log(`Attempting to reconnect tournament ${tournamentNo}`);
    
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
      // console.log(`No active subscription found for tournament ${tournamentNo}`);
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
      
      // console.log(`Real-time subscription removed for tournament ${tournamentNo}`);
      
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
    // console.log(`Cleaning up ${this.activeSubscriptions.size} active real-time subscriptions`);
    
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
    
    // console.log('All real-time subscriptions cleaned up');
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
      // console.log(`Match update for match ${updatedMatch.no_in_tournament}: Status=${updatedMatch.status}`);
      
      // Clear relevant cache entries to force fresh data on next request
      await this.invalidateMatchCache(updatedMatch.tournament_no);
      
      // Check if match is no longer live - if so, we can remove the subscription
      if (!this.isLiveMatchStatus(updatedMatch.status)) {
        // console.log(`Match ${updatedMatch.no_in_tournament} is no longer live, checking if tournament subscription should be removed`);
        this.checkTournamentSubscriptionNeeded(updatedMatch.tournament_no);
      }
    } catch (error) {
      // console.error('Error handling match update:', error);
    }
  }

  /**
   * Invalidate cache for a tournament when live updates are received
   */
  private static async invalidateMatchCache(tournamentNo: string): Promise<void> {
    try {
      await CacheService.invalidateMatchCache(tournamentNo);
      // console.log(`Successfully invalidated cache for tournament ${tournamentNo} due to live update`);
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
    // console.log(`Checking if tournament ${tournamentNo} still needs real-time subscription`);
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
    // console.log(`Activating fallback polling for tournament ${tournamentNo}`);
    
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
      // console.log(`Fallback polling activated for tournament ${tournamentNo}`);
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
      // console.log(`Deactivating fallback polling for tournament ${tournamentNo}`);
      RealtimeFallbackService.stopPollingFallback(tournamentNo);
      this.fallbackActive.set(tournamentNo, false);
    }
  }

  /**
   * Handle updates from fallback polling
   */
  private static async handleFallbackUpdate(tournamentNo: string, matches: BeachMatch[]): Promise<void> {
    try {
      // console.log(`Fallback update received for tournament ${tournamentNo}: ${matches.length} matches`);
      
      // Trigger the same cache invalidation as real-time updates
      await this.invalidateMatchCache(tournamentNo);
      
      // Note: The UI will update automatically through the cache invalidation
      // and the useRealtimeData hooks will fetch the new data
      
    } catch (error) {
      // console.error(`Error handling fallback update for tournament ${tournamentNo}:`, error);
    }
  }
}