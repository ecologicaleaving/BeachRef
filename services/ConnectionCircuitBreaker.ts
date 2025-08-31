import { NetworkStateManager, ConnectionStrategy, NetworkState, ConnectionQuality } from './NetworkStateManager';

/**
 * Circuit Breaker implementation for WebSocket connection management
 * Prevents excessive reconnection attempts and provides fallback mechanisms
 * Enhanced with network-aware connection management
 */
export enum CircuitState {
  CLOSED = 'CLOSED',     // Normal operation
  OPEN = 'OPEN',         // Circuit is open, blocking requests
  HALF_OPEN = 'HALF_OPEN' // Testing if service is back online
}

interface CircuitBreakerConfig {
  failureThreshold: number;    // Number of failures before opening circuit
  recoveryTimeout: number;     // Time to wait before trying half-open
  successThreshold: number;    // Successes needed in half-open to close circuit
  maxTimeout: number;          // Maximum recovery timeout (with backoff)
  networkAwareThresholds: boolean; // Enable network-aware failure thresholds
  cellularFailureThreshold: number; // Higher threshold for cellular networks
  wifiFailureThreshold: number;     // Lower threshold for Wi-Fi networks
}

interface CircuitBreakerStats {
  failures: number;
  successes: number;
  lastFailureTime: number;
  lastSuccessTime: number;
  consecutiveFailures: number;
  consecutiveSuccesses: number;
  state: CircuitState;
  recoveryTimeout: number;
  networkType: string;
  connectionQuality: number;
  lastNetworkChange: number;
}

export class ConnectionCircuitBreaker {
  private static instances = new Map<string, ConnectionCircuitBreaker>();
  
  private config: CircuitBreakerConfig;
  private stats: CircuitBreakerStats;
  private recoveryTimer: NodeJS.Timeout | null = null;
  private stateChangeListeners = new Set<(state: CircuitState) => void>();
  private networkStateManager: NetworkStateManager;
  private networkChangeListener: (() => void) | null = null;

  private constructor(
    private serviceId: string,
    config: Partial<CircuitBreakerConfig> = {}
  ) {
    this.config = {
      failureThreshold: 5,
      recoveryTimeout: 30000,  // 30 seconds
      successThreshold: 2,
      maxTimeout: 300000,      // 5 minutes
      networkAwareThresholds: true,
      cellularFailureThreshold: 8, // Higher tolerance for cellular
      wifiFailureThreshold: 4,     // Lower tolerance for Wi-Fi
      ...config
    };

    this.networkStateManager = NetworkStateManager.getInstance();

    const networkState = this.networkStateManager.getCurrentNetworkState();
    const connectionQuality = this.networkStateManager.getCurrentConnectionQuality();

    this.stats = {
      failures: 0,
      successes: 0,
      lastFailureTime: 0,
      lastSuccessTime: 0,
      consecutiveFailures: 0,
      consecutiveSuccesses: 0,
      state: CircuitState.CLOSED,
      recoveryTimeout: this.config.recoveryTimeout,
      networkType: networkState?.type || 'unknown',
      connectionQuality: connectionQuality?.score || 0,
      lastNetworkChange: Date.now(),
    };

    // Listen for network state changes
    this.networkChangeListener = this.networkStateManager.addNetworkChangeListener(
      (state: NetworkState, quality: ConnectionQuality) => {
        this.handleNetworkStateChange(state, quality);
      }
    );

    // console.log(`Circuit breaker initialized for service: ${serviceId}`, {
    //   networkType: this.stats.networkType,
    //   connectionQuality: this.stats.connectionQuality,
    // });
  }

  /**
   * Get or create circuit breaker instance for a service
   */
  static getInstance(serviceId: string, config?: Partial<CircuitBreakerConfig>): ConnectionCircuitBreaker {
    if (!this.instances.has(serviceId)) {
      this.instances.set(serviceId, new ConnectionCircuitBreaker(serviceId, config));
    }
    return this.instances.get(serviceId)!;
  }

  /**
   * Handle network state changes
   */
  private handleNetworkStateChange(networkState: NetworkState, connectionQuality: ConnectionQuality): void {
    const oldNetworkType = this.stats.networkType;
    const oldQuality = this.stats.connectionQuality;

    this.stats.networkType = networkState.type;
    this.stats.connectionQuality = connectionQuality.score;
    this.stats.lastNetworkChange = Date.now();

    // Reset circuit when network significantly improves
    if (connectionQuality.score > oldQuality + 20 && this.stats.state === CircuitState.OPEN) {
      // console.log(`Network quality improved significantly for ${this.serviceId}, considering reset`);
      this.resetStats();
    }

    // Network type changed - adjust thresholds
    if (oldNetworkType !== networkState.type) {
      // console.log(`Network type changed for ${this.serviceId}: ${oldNetworkType} -> ${networkState.type}`);
    }
  }

  /**
   * Add state change listener
   */
  addStateChangeListener(listener: (state: CircuitState) => void): () => void {
    this.stateChangeListeners.add(listener);
    return () => this.stateChangeListeners.delete(listener);
  }

  /**
   * Check if operation is allowed
   */
  canExecute(): boolean {
    switch (this.stats.state) {
      case CircuitState.CLOSED:
        return true;
      case CircuitState.OPEN:
        return this.shouldAttemptReset();
      case CircuitState.HALF_OPEN:
        return true;
      default:
        return false;
    }
  }

  /**
   * Record successful operation
   */
  onSuccess(): void {
    this.stats.successes++;
    this.stats.consecutiveSuccesses++;
    this.stats.consecutiveFailures = 0;
    this.stats.lastSuccessTime = Date.now();

    switch (this.stats.state) {
      case CircuitState.HALF_OPEN:
        if (this.stats.consecutiveSuccesses >= this.config.successThreshold) {
          this.transitionToState(CircuitState.CLOSED);
          this.resetRecoveryTimeout();
        }
        break;
      case CircuitState.OPEN:
        // This shouldn't happen, but handle it gracefully
        this.transitionToState(CircuitState.HALF_OPEN);
        break;
    }

    // console.log(`Circuit breaker success for ${this.serviceId}:`, {
    //   consecutiveSuccesses: this.stats.consecutiveSuccesses,
    //   state: this.stats.state,
    // });
  }

  /**
   * Get network-aware failure threshold
   */
  private getNetworkAwareFailureThreshold(): number {
    if (!this.config.networkAwareThresholds) {
      return this.config.failureThreshold;
    }

    const networkType = this.stats.networkType;
    const connectionQuality = this.stats.connectionQuality;

    // Base threshold on network type
    let threshold: number;
    switch (networkType) {
      case 'cellular':
        threshold = this.config.cellularFailureThreshold;
        break;
      case 'wifi':
        threshold = this.config.wifiFailureThreshold;
        break;
      default:
        threshold = this.config.failureThreshold;
        break;
    }

    // Adjust based on connection quality
    if (connectionQuality < 30) {
      threshold *= 1.5; // Higher tolerance for poor connections
    } else if (connectionQuality > 80) {
      threshold *= 0.8; // Lower tolerance for excellent connections
    }

    return Math.round(threshold);
  }

  /**
   * Record failed operation
   */
  onFailure(error?: string): void {
    this.stats.failures++;
    this.stats.consecutiveFailures++;
    this.stats.consecutiveSuccesses = 0;
    this.stats.lastFailureTime = Date.now();

    const adaptiveThreshold = this.getNetworkAwareFailureThreshold();

    // console.warn(`Circuit breaker failure for ${this.serviceId}:`, {
    //   error,
    //   consecutiveFailures: this.stats.consecutiveFailures,
    //   baseThreshold: this.config.failureThreshold,
    //   adaptiveThreshold,
    //   networkType: this.stats.networkType,
    //   connectionQuality: this.stats.connectionQuality,
    //   state: this.stats.state,
    // });

    switch (this.stats.state) {
      case CircuitState.CLOSED:
        if (this.stats.consecutiveFailures >= adaptiveThreshold) {
          this.transitionToState(CircuitState.OPEN);
          this.scheduleRecoveryAttempt();
        }
        break;
      case CircuitState.HALF_OPEN:
        this.transitionToState(CircuitState.OPEN);
        this.increaseRecoveryTimeout();
        this.scheduleRecoveryAttempt();
        break;
    }
  }

  /**
   * Get current circuit state
   */
  getState(): CircuitState {
    return this.stats.state;
  }

  /**
   * Get circuit statistics
   */
  getStats(): Readonly<CircuitBreakerStats> {
    return { ...this.stats };
  }

  /**
   * Check if should attempt to reset (transition to half-open)
   */
  private shouldAttemptReset(): boolean {
    const timeSinceLastFailure = Date.now() - this.stats.lastFailureTime;
    return timeSinceLastFailure >= this.stats.recoveryTimeout;
  }

  /**
   * Transition to new state and notify listeners
   */
  private transitionToState(newState: CircuitState): void {
    if (this.stats.state === newState) return;

    const oldState = this.stats.state;
    this.stats.state = newState;

    // console.log(`Circuit breaker state change for ${this.serviceId}: ${oldState} -> ${newState}`);

    // Notify listeners
    this.stateChangeListeners.forEach(listener => {
      try {
        listener(newState);
      } catch (error) {
        // console.error('Error in circuit breaker state change listener:', error);
      }
    });
  }

  /**
   * Get adaptive recovery timeout based on network conditions
   */
  private getAdaptiveRecoveryTimeout(): number {
    const baseTimeout = this.stats.recoveryTimeout;
    const connectionQuality = this.stats.connectionQuality;
    const networkType = this.stats.networkType;

    // Network type multipliers
    const networkMultipliers = {
      'wifi': 0.8,
      'ethernet': 0.7,
      'cellular': 1.5,
      'unknown': 2.0
    };

    let adaptiveTimeout = baseTimeout * (networkMultipliers[networkType] || 1.0);

    // Connection quality adjustments
    if (connectionQuality > 70) {
      adaptiveTimeout *= 0.7; // Faster recovery for good connections
    } else if (connectionQuality < 30) {
      adaptiveTimeout *= 1.8; // Slower recovery for poor connections
    }

    // Use exponential backoff with network state manager
    const backoffDelay = this.networkStateManager.getExponentialBackoffDelay(
      this.stats.consecutiveFailures,
      adaptiveTimeout,
      this.config.maxTimeout
    );

    return Math.min(backoffDelay, this.config.maxTimeout);
  }

  /**
   * Schedule recovery attempt (transition to half-open)
   */
  private scheduleRecoveryAttempt(): void {
    if (this.recoveryTimer) {
      clearTimeout(this.recoveryTimer);
    }

    const adaptiveTimeout = this.getAdaptiveRecoveryTimeout();

    this.recoveryTimer = setTimeout(() => {
      if (this.stats.state === CircuitState.OPEN) {
        this.transitionToState(CircuitState.HALF_OPEN);
      }
    }, adaptiveTimeout);

    // console.log(`Recovery attempt scheduled for ${this.serviceId}`, {
    //   baseTimeout: this.stats.recoveryTimeout,
    //   adaptiveTimeout,
    //   networkType: this.stats.networkType,
    //   connectionQuality: this.stats.connectionQuality,
    // });
  }

  /**
   * Increase recovery timeout with exponential backoff
   */
  private increaseRecoveryTimeout(): void {
    this.stats.recoveryTimeout = Math.min(
      this.stats.recoveryTimeout * 2,
      this.config.maxTimeout
    );
    // console.log(`Increased recovery timeout for ${this.serviceId} to ${this.stats.recoveryTimeout}ms`);
  }

  /**
   * Reset recovery timeout to initial value
   */
  private resetRecoveryTimeout(): void {
    this.stats.recoveryTimeout = this.config.recoveryTimeout;
    // console.log(`Reset recovery timeout for ${this.serviceId} to ${this.stats.recoveryTimeout}ms`);
  }

  /**
   * Force circuit to open state (useful for maintenance)
   */
  forceOpen(): void {
    this.transitionToState(CircuitState.OPEN);
    if (this.recoveryTimer) {
      clearTimeout(this.recoveryTimer);
      this.recoveryTimer = null;
    }
  }

  /**
   * Force circuit to closed state (useful for testing)
   */
  forceClose(): void {
    this.transitionToState(CircuitState.CLOSED);
    this.stats.consecutiveFailures = 0;
    this.stats.consecutiveSuccesses = 0;
    if (this.recoveryTimer) {
      clearTimeout(this.recoveryTimer);
      this.recoveryTimer = null;
    }
  }

  /**
   * Reset all statistics
   */
  resetStats(): void {
    this.stats = {
      failures: 0,
      successes: 0,
      lastFailureTime: 0,
      lastSuccessTime: 0,
      consecutiveFailures: 0,
      consecutiveSuccesses: 0,
      state: CircuitState.CLOSED,
      recoveryTimeout: this.config.recoveryTimeout,
    };

    if (this.recoveryTimer) {
      clearTimeout(this.recoveryTimer);
      this.recoveryTimer = null;
    }
  }

  /**
   * Check if service is healthy based on recent performance
   */
  isHealthy(): boolean {
    const recentSuccessRate = this.getRecentSuccessRate();
    return this.stats.state === CircuitState.CLOSED && recentSuccessRate > 0.7;
  }

  /**
   * Get success rate (overall)
   */
  getSuccessRate(): number {
    const total = this.stats.successes + this.stats.failures;
    return total > 0 ? this.stats.successes / total : 1;
  }

  /**
   * Get recent success rate (based on current state and consecutive operations)
   */
  private getRecentSuccessRate(): number {
    if (this.stats.state === CircuitState.CLOSED) {
      // In closed state, recent performance is good
      return this.stats.consecutiveFailures === 0 ? 1 : 0.5;
    } else {
      // In open or half-open state, recent performance is poor
      return 0.2;
    }
  }

  /**
   * Get connection quality assessment
   */
  getConnectionQuality(): {
    score: number;
    level: string;
    networkType: string;
    recommendation: string;
  } {
    const quality = this.stats.connectionQuality;
    const networkType = this.stats.networkType;

    let level: string;
    let recommendation: string;

    if (quality >= 80) {
      level = 'excellent';
      recommendation = 'Use aggressive connection strategies';
    } else if (quality >= 60) {
      level = 'good';
      recommendation = 'Standard connection strategies work well';
    } else if (quality >= 40) {
      level = 'fair';
      recommendation = 'Consider conservative connection strategies';
    } else if (quality >= 20) {
      level = 'poor';
      recommendation = 'Use polling fallback';
    } else {
      level = 'offline';
      recommendation = 'Enable offline mode';
    }

    return {
      score: quality,
      level,
      networkType,
      recommendation
    };
  }

  /**
   * Get network-specific connection strategy
   */
  getRecommendedConnectionStrategy(): ConnectionStrategy {
    const quality = this.networkStateManager.getCurrentConnectionQuality();
    if (!quality) return ConnectionStrategy.CONSERVATIVE_WEBSOCKET;
    
    return quality.recommendation;
  }

  /**
   * Get recommendation for operation
   */
  getRecommendation(): {
    shouldExecute: boolean;
    reason: string;
    fallbackSuggested: boolean;
    connectionStrategy: ConnectionStrategy;
    networkInfo: {
      type: string;
      quality: number;
      adaptive: boolean;
    };
  } {
    const canExecute = this.canExecute();
    const connectionStrategy = this.getRecommendedConnectionStrategy();
    
    const networkInfo = {
      type: this.stats.networkType,
      quality: this.stats.connectionQuality,
      adaptive: this.config.networkAwareThresholds,
    };

    switch (this.stats.state) {
      case CircuitState.CLOSED:
        return {
          shouldExecute: true,
          reason: 'Circuit is closed, service is healthy',
          fallbackSuggested: false,
          connectionStrategy,
          networkInfo,
        };
      case CircuitState.OPEN:
        return {
          shouldExecute: false,
          reason: `Circuit is open due to ${this.stats.consecutiveFailures} consecutive failures (threshold: ${this.getNetworkAwareFailureThreshold()})`,
          fallbackSuggested: true,
          connectionStrategy: ConnectionStrategy.POLLING_ONLY,
          networkInfo,
        };
      case CircuitState.HALF_OPEN:
        return {
          shouldExecute: true,
          reason: 'Circuit is half-open, testing service recovery',
          fallbackSuggested: true,
          connectionStrategy: ConnectionStrategy.CONSERVATIVE_WEBSOCKET,
          networkInfo,
        };
      default:
        return {
          shouldExecute: false,
          reason: 'Unknown circuit state',
          fallbackSuggested: true,
          connectionStrategy: ConnectionStrategy.OFFLINE_MODE,
          networkInfo,
        };
    }
  }

  /**
   * Cleanup resources
   */
  cleanup(): void {
    if (this.recoveryTimer) {
      clearTimeout(this.recoveryTimer);
      this.recoveryTimer = null;
    }
    
    if (this.networkChangeListener) {
      this.networkChangeListener();
      this.networkChangeListener = null;
    }
    
    this.stateChangeListeners.clear();
  }

  /**
   * Cleanup all instances
   */
  static cleanupAll(): void {
    for (const [serviceId, instance] of this.instances) {
      instance.cleanup();
    }
    this.instances.clear();
  }
}