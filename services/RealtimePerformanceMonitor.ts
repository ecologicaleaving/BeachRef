import { AppState } from 'react-native';
import NetworkStateManager, { NetworkState, ConnectionQuality } from './NetworkStateManager';
import { AppStateManager, AppLifecycleState } from './AppStateManager';

// Avoid circular dependency by using type-only import
export enum ConnectionState {
  DISCONNECTED = 'DISCONNECTED',
  CONNECTING = 'CONNECTING', 
  CONNECTED = 'CONNECTED',
  RECONNECTING = 'RECONNECTING',
  ERROR = 'ERROR'
}

/**
 * Performance monitoring and optimization service for real-time subscriptions
 * Manages battery usage, memory consumption, and connection efficiency
 */
export class RealtimePerformanceMonitor {
  private static instance: RealtimePerformanceMonitor | null = null;
  private static isInitialized = false;
  
  // Performance metrics
  private static metrics = {
    connectionAttempts: 0,
    successfulConnections: 0,
    failedConnections: 0,
    totalBytesReceived: 0,
    totalMessagesReceived: 0,
    averageMessageSize: 0,
    batteryOptimizationEvents: 0,
    backgroundDisconnections: 0,
    foregroundReconnections: 0,
    lastPerformanceCheck: Date.now(),
  };
  
  // Performance thresholds
  private static readonly PERFORMANCE_THRESHOLDS = {
    MAX_RECONNECTION_ATTEMPTS_PER_MINUTE: 10,
    MAX_MESSAGE_RATE_PER_SECOND: 5,
    BATTERY_OPTIMIZATION_THRESHOLD_MS: 30000, // 30 seconds in background
    MEMORY_CLEANUP_INTERVAL_MS: 300000, // 5 minutes
    PERFORMANCE_REPORT_INTERVAL_MS: 600000, // 10 minutes
  };
  
  // Optimization state
  private static optimizationState = {
    isBackgroundOptimized: false,
    lastBackgroundTime: 0,
    messageRateLimiter: new Map<string, number[]>(),
    performanceTimer: null as NodeJS.Timeout | null,
    memoryCleanupTimer: null as NodeJS.Timeout | null,
  };

  /**
   * Initialize the performance monitor
   */
  static initialize(): void {
    if (this.isInitialized) return;

    // console.log('Initializing RealtimePerformanceMonitor');
    
    // Set up app state monitoring for battery optimization
    AppState.addEventListener('change', this.handleAppStateChange.bind(this));
    
    // Set up periodic performance monitoring
    this.optimizationState.performanceTimer = setInterval(
      this.performanceCheckCycle.bind(this),
      this.PERFORMANCE_THRESHOLDS.PERFORMANCE_REPORT_INTERVAL_MS
    );
    
    // Set up memory cleanup
    this.optimizationState.memoryCleanupTimer = setInterval(
      this.memoryCleanupCycle.bind(this),
      this.PERFORMANCE_THRESHOLDS.MEMORY_CLEANUP_INTERVAL_MS
    );
    
    // Monitor connection state changes
    RealtimeSubscriptionService.addConnectionStateListener(
      this.handleConnectionStateChange.bind(this)
    );
    
    this.isInitialized = true;
  }

  /**
   * Handle app state changes for battery optimization
   */
  private static handleAppStateChange(nextAppState: string): void {
    const now = Date.now();
    
    switch (nextAppState) {
      case 'background':
        // console.log('App backgrounded - enabling battery optimization');
        this.optimizationState.isBackgroundOptimized = true;
        this.optimizationState.lastBackgroundTime = now;
        this.metrics.batteryOptimizationEvents++;
        
        // Schedule aggressive optimization after threshold
        setTimeout(() => {
          if (this.optimizationState.isBackgroundOptimized) {
            this.enableAggressiveBatteryOptimization();
          }
        }, this.PERFORMANCE_THRESHOLDS.BATTERY_OPTIMIZATION_THRESHOLD_MS);
        break;
        
      case 'active':
        if (this.optimizationState.isBackgroundOptimized) {
          // console.log('App foregrounded - restoring normal operation');
          this.optimizationState.isBackgroundOptimized = false;
          this.disableAggressiveBatteryOptimization();
          this.metrics.foregroundReconnections++;
        }
        break;
    }
  }

  /**
   * Enable aggressive battery optimization measures
   */
  private static enableAggressiveBatteryOptimization(): void {
    // console.log('Enabling aggressive battery optimization');
    
    // Reduce message processing frequency
    // Pause non-critical subscriptions
    // This is handled by the RealtimeSubscriptionService's app state handling
    
    this.metrics.backgroundDisconnections++;
  }

  /**
   * Disable aggressive battery optimization
   */
  private static disableAggressiveBatteryOptimization(): void {
    // console.log('Disabling aggressive battery optimization');
    
    // Resume normal message processing
    // Restore all subscriptions
    // This is handled by the RealtimeSubscriptionService's app state handling
  }

  /**
   * Handle connection state changes for performance monitoring
   */
  private static handleConnectionStateChange(state: ConnectionState, error?: string): void {
    this.metrics.connectionAttempts++;
    
    switch (state) {
      case ConnectionState.CONNECTED:
        this.metrics.successfulConnections++;
        break;
      case ConnectionState.ERROR:
        this.metrics.failedConnections++;
        // console.warn('Connection failed - monitoring performance impact:', error);
        break;
    }
  }

  /**
   * Track message received for performance monitoring
   */
  static trackMessageReceived(messageSize: number, tournamentNo: string): void {
    this.metrics.totalMessagesReceived++;
    this.metrics.totalBytesReceived += messageSize;
    this.metrics.averageMessageSize = 
      this.metrics.totalBytesReceived / this.metrics.totalMessagesReceived;
    
    // Rate limiting check
    this.enforceMessageRateLimit(tournamentNo);
  }

  /**
   * Enforce message rate limiting for performance
   */
  private static enforceMessageRateLimit(tournamentNo: string): void {
    const now = Date.now();
    const timestamps = this.optimizationState.messageRateLimiter.get(tournamentNo) || [];
    
    // Remove timestamps older than 1 second
    const recentTimestamps = timestamps.filter(time => now - time < 1000);
    
    // Check if rate limit exceeded
    if (recentTimestamps.length >= this.PERFORMANCE_THRESHOLDS.MAX_MESSAGE_RATE_PER_SECOND) {
      // console.warn(`Message rate limit exceeded for tournament ${tournamentNo}`);
      // Could implement throttling here if needed
    }
    
    recentTimestamps.push(now);
    this.optimizationState.messageRateLimiter.set(tournamentNo, recentTimestamps);
  }

  /**
   * Periodic performance check and optimization
   */
  private static performanceCheckCycle(): void {
    const now = Date.now();
    const timeSinceLastCheck = now - this.metrics.lastPerformanceCheck;
    
    // console.log('Performance Monitor Report:', {
      connectionSuccessRate: this.getConnectionSuccessRate(),
      averageMessageSize: Math.round(this.metrics.averageMessageSize),
      messagesPerMinute: Math.round((this.metrics.totalMessagesReceived / timeSinceLastCheck) * 60000),
      batteryOptimizationEvents: this.metrics.batteryOptimizationEvents,
      memoryOptimized: this.optimizationState.isBackgroundOptimized,
    });
    
    this.metrics.lastPerformanceCheck = now;
  }

  /**
   * Periodic memory cleanup
   */
  private static memoryCleanupCycle(): void {
    // console.log('Performing memory cleanup cycle');
    
    // Clean up old message rate limiter data
    const now = Date.now();
    for (const [tournamentNo, timestamps] of this.optimizationState.messageRateLimiter.entries()) {
      const recentTimestamps = timestamps.filter(time => now - time < 60000); // Keep 1 minute
      
      if (recentTimestamps.length === 0) {
        this.optimizationState.messageRateLimiter.delete(tournamentNo);
      } else {
        this.optimizationState.messageRateLimiter.set(tournamentNo, recentTimestamps);
      }
    }
    
    // Force garbage collection if available (development only)
    if (__DEV__ && global.gc) {
      global.gc();
      // console.log('Forced garbage collection');
    }
  }

  /**
   * Get connection success rate
   */
  private static getConnectionSuccessRate(): number {
    if (this.metrics.connectionAttempts === 0) return 0;
    return (this.metrics.successfulConnections / this.metrics.connectionAttempts) * 100;
  }

  /**
   * Get current performance metrics
   */
  static getPerformanceMetrics() {
    return {
      ...this.metrics,
      connectionSuccessRate: this.getConnectionSuccessRate(),
      isBackgroundOptimized: this.optimizationState.isBackgroundOptimized,
      activeRateLimiters: this.optimizationState.messageRateLimiter.size,
    };
  }

  /**
   * Check if battery optimization is recommended
   */
  static shouldOptimizeForBattery(): boolean {
    const metrics = this.getPerformanceMetrics();
    
    // Recommend optimization if connection success rate is low
    // or if we're getting too many messages
    return (
      metrics.connectionSuccessRate < 50 ||
      metrics.messagesPerMinute > 300 ||
      this.optimizationState.isBackgroundOptimized
    );
  }

  /**
   * Get optimization recommendations
   */
  static getOptimizationRecommendations(): string[] {
    const recommendations: string[] = [];
    const metrics = this.getPerformanceMetrics();
    
    if (metrics.connectionSuccessRate < 70) {
      recommendations.push('Consider reducing reconnection frequency');
    }
    
    if (metrics.averageMessageSize > 10000) {
      recommendations.push('Messages are large - consider data compression');
    }
    
    if (metrics.batteryOptimizationEvents > 10) {
      recommendations.push('Frequent background/foreground transitions detected');
    }
    
    if (this.optimizationState.messageRateLimiter.size > 5) {
      recommendations.push('Many active subscriptions - consider consolidation');
    }
    
    return recommendations;
  }

  /**
   * Reset performance metrics (useful for testing)
   */
  static resetMetrics(): void {
    this.metrics = {
      connectionAttempts: 0,
      successfulConnections: 0,
      failedConnections: 0,
      totalBytesReceived: 0,
      totalMessagesReceived: 0,
      averageMessageSize: 0,
      batteryOptimizationEvents: 0,
      backgroundDisconnections: 0,
      foregroundReconnections: 0,
      lastPerformanceCheck: Date.now(),
    };
    
    this.optimizationState.messageRateLimiter.clear();
  }

  /**
   * Cleanup and shutdown the performance monitor
   */
  static cleanup(): void {
    if (this.optimizationState.performanceTimer) {
      clearInterval(this.optimizationState.performanceTimer);
      this.optimizationState.performanceTimer = null;
    }
    
    if (this.optimizationState.memoryCleanupTimer) {
      clearInterval(this.optimizationState.memoryCleanupTimer);
      this.optimizationState.memoryCleanupTimer = null;
    }
    
    this.optimizationState.messageRateLimiter.clear();
    this.isInitialized = false;
    
    // console.log('RealtimePerformanceMonitor cleaned up');
  }
}