import { BeachMatch } from '../types/match';
import { VisApiClient, DEFAULT_RETRY_CONFIG } from './api/VisApiClient';
import { CacheServiceCompatibility as CacheService } from '../hooks/compatibility/CacheServiceCompatibility';
import { ConnectionCircuitBreaker, CircuitState } from './ConnectionCircuitBreaker';
import NetworkStateManager, { ConnectionStrategy, NetworkState, ConnectionQuality } from './NetworkStateManager';

export enum FallbackMode {
  PURE_WEBSOCKET = 'PURE_WEBSOCKET',           // WebSocket only, no polling
  HYBRID_WEBSOCKET_POLLING = 'HYBRID_WEBSOCKET_POLLING', // WebSocket primary, polling backup
  SMART_POLLING = 'SMART_POLLING',             // Intelligent polling with adaptive intervals
  AGGRESSIVE_POLLING = 'AGGRESSIVE_POLLING',    // High-frequency polling for critical data
  OFFLINE_CACHE = 'OFFLINE_CACHE'              // Cache-only mode
}

export interface FallbackConfiguration {
  mode: FallbackMode;
  pollingInterval: number;
  maxRetries: number;
  enableHybridMode: boolean;
  networkAware: boolean;
}

/**
 * Enhanced fallback service for real-time updates with intelligent mode switching
 * Provides network-aware polling, hybrid modes, and graceful degradation
 */
export class RealtimeFallbackService {
  private static pollingIntervals = new Map<string, NodeJS.Timeout>();
  private static isInitialized = false;
  private static circuitBreaker = ConnectionCircuitBreaker.getInstance('realtime-fallback');
  private static networkStateManager: NetworkStateManager;
  private static networkChangeListener: (() => void) | null = null;
  private static visApiClient = new VisApiClient({
    baseUrl: 'https://www.fivb.org/Vis2009/XmlRequest.asmx',
    timeoutMs: 10000,
    maxRetries: 3,
    retryDelayMs: 1000,
    exponentialBackoff: true,
    enableLogging: true,
    headers: {
      'X-FIVB-App-ID': '2a9523517c52420da73d927c6d6bab23'
    }
  }, DEFAULT_RETRY_CONFIG);
  
  // Enhanced polling configuration with network awareness
  private static readonly WIFI_FAST_INTERVAL = 10000;     // 10 seconds for Wi-Fi
  private static readonly WIFI_NORMAL_INTERVAL = 20000;   // 20 seconds for Wi-Fi
  private static readonly CELLULAR_FAST_INTERVAL = 20000; // 20 seconds for cellular
  private static readonly CELLULAR_NORMAL_INTERVAL = 40000; // 40 seconds for cellular
  private static readonly SLOW_CONNECTION_INTERVAL = 60000; // 1 minute for poor connections
  private static readonly OFFLINE_INTERVAL = 120000;     // 2 minutes for offline mode
  
  // Fallback mode tracking
  private static currentMode = FallbackMode.SMART_POLLING;
  private static modeHistory: Array<{ mode: FallbackMode; timestamp: number; reason: string }> = [];
  private static fallbackConfigs = new Map<string, FallbackConfiguration>();
  
  // Enhanced error tracking
  private static errorCounts = new Map<string, number>();
  private static lastPollingAttempts = new Map<string, number>();
  private static connectionQualityHistory: number[] = [];

  /**
   * Initialize the enhanced fallback service
   */
  static initialize(): void {
    if (this.isInitialized) return;

    
    // Initialize network state manager
    this.networkStateManager = NetworkStateManager.getInstance();
    
    // Set up circuit breaker monitoring with enhanced recommendations
    this.circuitBreaker.addStateChangeListener((state) => {
      this.handleCircuitBreakerStateChange(state);
    });

    // Listen for network state changes
    this.networkChangeListener = this.networkStateManager.addNetworkChangeListener(
      (networkState: NetworkState, connectionQuality: ConnectionQuality) => {
        this.handleNetworkStateChange(networkState, connectionQuality);
      }
    );

    // Set initial fallback mode based on current network conditions
    this.updateFallbackModeBasedOnNetwork();

    this.isInitialized = true;
  }

  /**
   * Handle circuit breaker state changes
   */
  private static handleCircuitBreakerStateChange(state: CircuitState): void {
    switch (state) {
      case CircuitState.OPEN:
        this.switchToMode(FallbackMode.OFFLINE_CACHE, 'Circuit breaker opened');
        break;
      case CircuitState.HALF_OPEN:
        this.switchToMode(FallbackMode.SMART_POLLING, 'Circuit breaker testing recovery');
        break;
      case CircuitState.CLOSED:
        this.updateFallbackModeBasedOnNetwork();
        break;
    }
  }

  /**
   * Handle network state changes
   */
  private static handleNetworkStateChange(networkState: NetworkState, connectionQuality: ConnectionQuality): void {
    //   type: networkState.type,
    //   quality: connectionQuality.score,
    //   level: connectionQuality.level,
    // });

    // Track connection quality history
    this.connectionQualityHistory.push(connectionQuality.score);
    if (this.connectionQualityHistory.length > 20) {
      this.connectionQualityHistory.shift();
    }

    // Update fallback mode based on new network conditions
    this.updateFallbackModeBasedOnNetwork();
  }

  /**
   * Update fallback mode based on current network conditions
   */
  private static updateFallbackModeBasedOnNetwork(): void {
    const networkState = this.networkStateManager.getCurrentNetworkState();
    const connectionQuality = this.networkStateManager.getCurrentConnectionQuality();

    if (!networkState || !connectionQuality) return;

    const newMode = this.determineOptimalFallbackMode(networkState, connectionQuality);
    const reason = `Network: ${networkState.type}, Quality: ${connectionQuality.level} (${connectionQuality.score})`;
    
    if (newMode !== this.currentMode) {
      this.switchToMode(newMode, reason);
    }
  }

  /**
   * Determine optimal fallback mode based on network conditions
   */
  private static determineOptimalFallbackMode(networkState: NetworkState, connectionQuality: ConnectionQuality): FallbackMode {
    // If offline, use cache only
    if (!networkState.isConnected || connectionQuality.score === 0) {
      return FallbackMode.OFFLINE_CACHE;
    }

    // For excellent connections, prefer hybrid or pure WebSocket (handled externally)
    if (connectionQuality.score >= 80) {
      return FallbackMode.SMART_POLLING; // Light polling as backup
    }

    // For good connections, use smart polling
    if (connectionQuality.score >= 60) {
      return FallbackMode.SMART_POLLING;
    }

    // For fair connections, use aggressive polling for critical data
    if (connectionQuality.score >= 40) {
      return FallbackMode.AGGRESSIVE_POLLING;
    }

    // For poor connections, use offline cache with minimal polling
    return FallbackMode.OFFLINE_CACHE;
  }

  /**
   * Switch to a new fallback mode
   */
  private static switchToMode(newMode: FallbackMode, reason: string): void {
    if (newMode === this.currentMode) return;


    // Record mode change in history
    this.modeHistory.push({
      mode: newMode,
      timestamp: Date.now(),
      reason,
    });

    // Keep only last 50 mode changes
    if (this.modeHistory.length > 50) {
      this.modeHistory.shift();
    }

    const oldMode = this.currentMode;
    this.currentMode = newMode;

    // Adjust existing polling intervals based on new mode
    this.adjustAllPollingIntervals(oldMode, newMode);
  }

  /**
   * Adjust all existing polling intervals based on mode change
   */
  private static adjustAllPollingIntervals(oldMode: FallbackMode, newMode: FallbackMode): void {
    if (this.pollingIntervals.size === 0) return;


    // Get new interval for the new mode
    for (const [tournamentNo] of this.pollingIntervals.entries()) {
      const config = this.fallbackConfigs.get(tournamentNo);
      const hasLiveMatches = config?.mode === FallbackMode.AGGRESSIVE_POLLING;
      
      // Stop current polling
      const oldInterval = this.pollingIntervals.get(tournamentNo);
      if (oldInterval) {
        clearInterval(oldInterval);
      }

      // Start new polling with adjusted interval
      const newInterval = this.getAdaptivePollingInterval(hasLiveMatches, newMode);
      const intervalId = setInterval(async () => {
        try {
          await this.performPollingUpdate(tournamentNo, () => {});
        } catch (error) {
          this.handlePollingError(tournamentNo, error);
        }
      }, newInterval);

      this.pollingIntervals.set(tournamentNo, intervalId);
      
    }
  }

  /**
   * Get adaptive polling interval based on network conditions and mode
   */
  private static getAdaptivePollingInterval(hasLiveMatches: boolean, mode?: FallbackMode): number {
    const currentMode = mode || this.currentMode;
    const networkState = this.networkStateManager.getCurrentNetworkState();
    const connectionQuality = this.networkStateManager.getCurrentConnectionQuality();

    // Base intervals based on mode
    let baseInterval: number;
    switch (currentMode) {
      case FallbackMode.AGGRESSIVE_POLLING:
        baseInterval = hasLiveMatches ? 10000 : 15000; // 10-15 seconds
        break;
      case FallbackMode.SMART_POLLING:
        baseInterval = hasLiveMatches ? 20000 : 30000; // 20-30 seconds
        break;
      case FallbackMode.OFFLINE_CACHE:
        baseInterval = hasLiveMatches ? 120000 : 300000; // 2-5 minutes
        break;
      default:
        baseInterval = hasLiveMatches ? 30000 : 60000; // 30-60 seconds
        break;
    }

    // Adjust based on network conditions
    if (networkState && connectionQuality) {
      // Network type adjustments
      const networkMultiplier = {
        'wifi': 0.8,        // 20% faster on Wi-Fi
        'ethernet': 0.7,    // 30% faster on ethernet
        'cellular': 1.3,    // 30% slower on cellular
        'unknown': 1.5      // 50% slower on unknown
      }[networkState.type] || 1.0;

      // Connection quality adjustments
      let qualityMultiplier = 1.0;
      if (connectionQuality.score >= 80) {
        qualityMultiplier = 0.7; // 30% faster for excellent connections
      } else if (connectionQuality.score >= 60) {
        qualityMultiplier = 0.9; // 10% faster for good connections
      } else if (connectionQuality.score < 30) {
        qualityMultiplier = 1.8; // 80% slower for poor connections
      }

      baseInterval = Math.round(baseInterval * networkMultiplier * qualityMultiplier);
    }

    // Ensure reasonable bounds
    const minInterval = hasLiveMatches ? 5000 : 10000;   // 5-10 seconds minimum
    const maxInterval = hasLiveMatches ? 300000 : 600000; // 5-10 minutes maximum

    return Math.max(minInterval, Math.min(maxInterval, baseInterval));
  }

  /**
   * Start enhanced polling for a tournament with network-aware configuration
   */
  static async startPollingFallback(
    tournamentNo: string, 
    onUpdate: (matches: BeachMatch[]) => void,
    hasLiveMatches: boolean = false
  ): Promise<boolean> {
    this.initialize();

    if (!this.circuitBreaker.canExecute()) {
      const recommendation = this.circuitBreaker.getRecommendation();
      // console.warn(`Cannot start polling fallback: ${recommendation.reason}`);
      return false;
    }

    // Clear any existing polling for this tournament
    this.stopPollingFallback(tournamentNo);

    const pollingInterval = hasLiveMatches 
      ? this.AGGRESSIVE_POLLING_INTERVAL 
      : this.DEFAULT_POLLING_INTERVAL;


    try {
      // Perform initial poll
      await this.performPollingUpdate(tournamentNo, onUpdate);

      // Set up recurring polling
      const intervalId = setInterval(async () => {
        try {
          await this.performPollingUpdate(tournamentNo, onUpdate);
        } catch (error) {
          // console.error(`Error in polling interval for ${tournamentNo}:`, error);
          this.handlePollingError(tournamentNo, error);
        }
      }, pollingInterval);

      this.pollingIntervals.set(tournamentNo, intervalId);
      this.circuitBreaker.onSuccess();
      return true;

    } catch (error) {
      // console.error(`Failed to start polling fallback for ${tournamentNo}:`, error);
      this.circuitBreaker.onFailure(error instanceof Error ? error.message : 'Unknown error');
      return false;
    }
  }

  /**
   * Stop polling for a tournament
   */
  static stopPollingFallback(tournamentNo: string): void {
    const intervalId = this.pollingIntervals.get(tournamentNo);
    if (intervalId) {
      clearInterval(intervalId);
      this.pollingIntervals.delete(tournamentNo);
      this.errorCounts.delete(tournamentNo);
      this.lastPollingAttempts.delete(tournamentNo);
    }
  }

  /**
   * Perform a single polling update
   */
  private static async performPollingUpdate(
    tournamentNo: string, 
    onUpdate: (matches: BeachMatch[]) => void
  ): Promise<void> {
    const now = Date.now();
    this.lastPollingAttempts.set(tournamentNo, now);

    try {
      
      // Force refresh from API (bypass cache for real-time accuracy)
      await CacheService.invalidateMatchCache(tournamentNo);
      const matches = await this.visApiClient.fetchMatchesForTournament(tournamentNo);

      // Reset error count on success
      this.errorCounts.delete(tournamentNo);

      // Call the update callback
      onUpdate(matches);
      

    } catch (error) {
      // console.error(`Polling failed for tournament ${tournamentNo}:`, error);
      this.handlePollingError(tournamentNo, error);
      throw error;
    }
  }

  /**
   * Handle polling errors and implement backoff
   */
  private static handlePollingError(tournamentNo: string, error: any): void {
    const currentErrorCount = this.errorCounts.get(tournamentNo) || 0;
    const newErrorCount = currentErrorCount + 1;
    this.errorCounts.set(tournamentNo, newErrorCount);

    // console.warn(`Polling error #${newErrorCount} for tournament ${tournamentNo}:`, error);

    // Implement exponential backoff for errors
    if (newErrorCount >= 3) {
      // console.warn(`Too many polling errors for ${tournamentNo}, slowing down polling`);
      this.adjustPollingInterval(tournamentNo, this.SLOW_POLLING_INTERVAL);
    }

    if (newErrorCount >= 5) {
      // console.error(`Excessive polling errors for ${tournamentNo}, stopping fallback`);
      this.stopPollingFallback(tournamentNo);
      this.circuitBreaker.onFailure('Excessive polling failures');
    }
  }

  /**
   * Adjust polling interval for a tournament
   */
  private static adjustPollingInterval(tournamentNo: string, newInterval: number): void {
    const currentInterval = this.pollingIntervals.get(tournamentNo);
    if (!currentInterval) return;

    // Stop current polling
    this.stopPollingFallback(tournamentNo);

    // Restart with new interval
    const intervalId = setInterval(async () => {
      try {
        await this.performPollingUpdate(tournamentNo, () => {});
      } catch (error) {
        this.handlePollingError(tournamentNo, error);
      }
    }, newInterval);

    this.pollingIntervals.set(tournamentNo, intervalId);
  }

  /**
   * Check if polling is active for a tournament
   */
  static isPolling(tournamentNo: string): boolean {
    return this.pollingIntervals.has(tournamentNo);
  }

  /**
   * Get active polling tournaments
   */
  static getActivePollingTournaments(): string[] {
    return Array.from(this.pollingIntervals.keys());
  }

  /**
   * Get fallback statistics
   */
  static getFallbackStats(): {
    activePollingCount: number;
    totalErrors: number;
    circuitBreakerState: CircuitState;
    circuitBreakerStats: any;
  } {
    const totalErrors = Array.from(this.errorCounts.values()).reduce((sum, count) => sum + count, 0);
    
    return {
      activePollingCount: this.pollingIntervals.size,
      totalErrors,
      circuitBreakerState: this.circuitBreaker.getState(),
      circuitBreakerStats: this.circuitBreaker.getStats(),
    };
  }

  /**
   * Force immediate poll for a tournament
   */
  static async forcePollingUpdate(
    tournamentNo: string,
    onUpdate: (matches: BeachMatch[]) => void
  ): Promise<boolean> {
    if (!this.circuitBreaker.canExecute()) {
      // console.warn(`Cannot perform forced poll for ${tournamentNo}: circuit breaker is open`);
      return false;
    }

    try {
      await this.performPollingUpdate(tournamentNo, onUpdate);
      return true;
    } catch (error) {
      // console.error(`Forced poll failed for ${tournamentNo}:`, error);
      return false;
    }
  }

  /**
   * Check if fallback is healthy and working
   */
  static isFallbackHealthy(): boolean {
    const stats = this.getFallbackStats();
    return (
      stats.circuitBreakerState === CircuitState.CLOSED &&
      stats.totalErrors < 10 && // Reasonable error threshold
      this.circuitBreaker.isHealthy()
    );
  }

  /**
   * Get recommendations for fallback optimization
   */
  static getFallbackRecommendations(): string[] {
    const recommendations: string[] = [];
    const stats = this.getFallbackStats();

    if (stats.activePollingCount > 5) {
      recommendations.push('Consider reducing number of active polling connections');
    }

    if (stats.totalErrors > 20) {
      recommendations.push('High error rate detected - check network connectivity');
    }

    if (stats.circuitBreakerState === CircuitState.OPEN) {
      recommendations.push('Fallback service is circuit-broken - will retry automatically');
    }

    if (stats.activePollingCount === 0) {
      recommendations.push('No active polling connections - consider enabling fallback');
    }

    return recommendations;
  }

  /**
   * Graceful shutdown of all polling
   */
  static stopAllPolling(): void {
    
    for (const [tournamentNo, intervalId] of this.pollingIntervals.entries()) {
      clearInterval(intervalId);
    }

    this.pollingIntervals.clear();
    this.errorCounts.clear();
    this.lastPollingAttempts.clear();
  }

  /**
   * Cleanup all resources
   */
  static cleanup(): void {
    this.stopAllPolling();
    this.circuitBreaker.cleanup();
    this.isInitialized = false;
  }

  /**
   * Reset fallback service (useful for testing)
   */
  static reset(): void {
    this.cleanup();
    this.initialize();
  }
}