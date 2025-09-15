/**
 * Connection Pool Manager
 * Part of Real-time Service Architecture Simplification Refactoring
 * Focused responsibility: Managing connection lifecycle, retries, and pooling
 */

import { AppState } from 'react-native';
import { ConnectionCircuitBreaker, CircuitState } from '../ConnectionCircuitBreaker';

export enum ConnectionState {
  DISCONNECTED = 'DISCONNECTED',
  CONNECTING = 'CONNECTING',
  CONNECTED = 'CONNECTED',
  RECONNECTING = 'RECONNECTING',
  ERROR = 'ERROR'
}

export interface ConnectionHealth {
  state: ConnectionState;
  lastConnected?: number;
  totalConnections: number;
  failedConnections: number;
  averageLatency: number;
  circuitBreakerState: CircuitState;
}

export interface RetryConfig {
  maxAttempts: number;
  baseDelay: number;
  maxDelay: number;
  exponentialBackoff: boolean;
}

export type ConnectionStateListener = (state: ConnectionState, error?: string) => void;

/**
 * Manages connection pooling, retry logic, and connection health
 * Single responsibility: Connection lifecycle management
 */
export class ConnectionPoolManager {
  private connectionState: ConnectionState = ConnectionState.DISCONNECTED;
  private connectionStateListeners = new Set<ConnectionStateListener>();
  private reconnectTimeouts = new Map<string, NodeJS.Timeout>();
  private appStateSubscription: any = null;
  private circuitBreakers = new Map<string, ConnectionCircuitBreaker>();
  private connectionHealth = new Map<string, ConnectionHealth>();

  // Configuration
  private readonly retryConfig: RetryConfig = {
    maxAttempts: 5,
    baseDelay: 1000,
    maxDelay: 30000,
    exponentialBackoff: true
  };

  private isInitialized = false;

  /**
   * Initialize connection pool manager
   */
  initialize(): void {
    if (this.isInitialized) return;

    // Set up app state monitoring for battery optimization
    this.appStateSubscription = AppState.addEventListener('change', (nextAppState) => {
      this.handleAppStateChange(nextAppState);
    });

    this.isInitialized = true;
  }

  /**
   * Get or create circuit breaker for a connection
   */
  getCircuitBreaker(connectionId: string): ConnectionCircuitBreaker {
    if (!this.circuitBreakers.has(connectionId)) {
      const circuitBreaker = ConnectionCircuitBreaker.getInstance(
        connectionId,
        {
          failureThreshold: 3,
          recoveryTimeout: 30000,
          successThreshold: 2,
          maxTimeout: 300000,
        }
      );
      this.circuitBreakers.set(connectionId, circuitBreaker);
    }
    return this.circuitBreakers.get(connectionId)!;
  }

  /**
   * Check if connection is allowed by circuit breaker
   */
  canConnect(connectionId: string): boolean {
    const circuitBreaker = this.getCircuitBreaker(connectionId);
    return circuitBreaker.canExecute();
  }

  /**
   * Record successful connection
   */
  recordConnectionSuccess(connectionId: string): void {
    const circuitBreaker = this.getCircuitBreaker(connectionId);
    circuitBreaker.onSuccess();

    // Update connection health
    const health = this.getConnectionHealth(connectionId);
    health.totalConnections += 1;
    health.lastConnected = Date.now();
    health.state = ConnectionState.CONNECTED;
    health.circuitBreakerState = circuitBreaker.getState();

    this.setConnectionState(ConnectionState.CONNECTED);
    this.clearReconnectTimeout(connectionId);
  }

  /**
   * Record connection failure
   */
  recordConnectionFailure(connectionId: string, error: string): void {
    const circuitBreaker = this.getCircuitBreaker(connectionId);
    circuitBreaker.onFailure(error);

    // Update connection health
    const health = this.getConnectionHealth(connectionId);
    health.failedConnections += 1;
    health.state = ConnectionState.ERROR;
    health.circuitBreakerState = circuitBreaker.getState();

    this.setConnectionState(ConnectionState.ERROR, error);
  }

  /**
   * Schedule reconnection with exponential backoff
   */
  scheduleReconnection(
    connectionId: string,
    reconnectCallback: () => Promise<void>,
    attempt: number = 1
  ): void {
    if (attempt > this.retryConfig.maxAttempts) {
      console.error(`Maximum reconnection attempts reached for ${connectionId}`);
      this.setConnectionState(ConnectionState.ERROR, 'Maximum reconnection attempts reached');
      return;
    }

    this.setConnectionState(ConnectionState.RECONNECTING);

    const delay = this.calculateRetryDelay(attempt);

    const timeout = setTimeout(async () => {
      try {
        await reconnectCallback();
      } catch (error) {
        console.error(`Reconnection attempt ${attempt} failed for ${connectionId}:`, error);
        this.scheduleReconnection(connectionId, reconnectCallback, attempt + 1);
      }
    }, delay);

    this.reconnectTimeouts.set(connectionId, timeout);
  }

  /**
   * Cancel reconnection for a connection
   */
  cancelReconnection(connectionId: string): void {
    this.clearReconnectTimeout(connectionId);
  }

  /**
   * Add connection state listener
   */
  addConnectionStateListener(listener: ConnectionStateListener): () => void {
    this.connectionStateListeners.add(listener);
    return () => {
      this.connectionStateListeners.delete(listener);
    };
  }

  /**
   * Get current connection state
   */
  getConnectionState(): ConnectionState {
    return this.connectionState;
  }

  /**
   * Get connection health for a specific connection
   */
  getConnectionHealth(connectionId: string): ConnectionHealth {
    if (!this.connectionHealth.has(connectionId)) {
      this.connectionHealth.set(connectionId, {
        state: ConnectionState.DISCONNECTED,
        totalConnections: 0,
        failedConnections: 0,
        averageLatency: 0,
        circuitBreakerState: CircuitState.CLOSED
      });
    }
    return this.connectionHealth.get(connectionId)!;
  }

  /**
   * Get health statistics for all connections
   */
  getOverallHealth(): {
    totalConnections: number;
    activeConnections: number;
    failedConnections: number;
    averageLatency: number;
    circuitBreakersOpen: number;
  } {
    const healths = Array.from(this.connectionHealth.values());

    return {
      totalConnections: healths.reduce((sum, h) => sum + h.totalConnections, 0),
      activeConnections: healths.filter(h => h.state === ConnectionState.CONNECTED).length,
      failedConnections: healths.reduce((sum, h) => sum + h.failedConnections, 0),
      averageLatency: healths.reduce((sum, h) => sum + h.averageLatency, 0) / Math.max(healths.length, 1),
      circuitBreakersOpen: healths.filter(h => h.circuitBreakerState === CircuitState.OPEN).length
    };
  }

  /**
   * Force disconnect all connections
   */
  disconnectAll(): void {
    // Clear all timeouts
    for (const timeout of this.reconnectTimeouts.values()) {
      clearTimeout(timeout);
    }
    this.reconnectTimeouts.clear();

    this.setConnectionState(ConnectionState.DISCONNECTED);
  }

  /**
   * Cleanup all resources
   */
  cleanup(): void {
    this.disconnectAll();

    // Clean up app state subscription
    if (this.appStateSubscription) {
      this.appStateSubscription?.remove();
      this.appStateSubscription = null;
    }

    // Clean up circuit breakers
    for (const circuitBreaker of this.circuitBreakers.values()) {
      circuitBreaker.cleanup();
    }
    this.circuitBreakers.clear();

    // Clear state
    this.connectionStateListeners.clear();
    this.connectionHealth.clear();
    this.isInitialized = false;
  }

  // Private methods

  private handleAppStateChange(nextAppState: string): void {
    if (nextAppState === 'background') {
      // App went to background
      this.setConnectionState(ConnectionState.DISCONNECTED);
    } else if (nextAppState === 'active') {
      // App became active
      // Connection resumption will be handled by the orchestrator
    }
  }

  private setConnectionState(state: ConnectionState, error?: string): void {
    if (this.connectionState !== state) {
      this.connectionState = state;

      // Notify all listeners
      this.connectionStateListeners.forEach(listener => {
        try {
          listener(state, error);
        } catch (err) {
          console.error('Error in connection state listener:', err);
        }
      });
    }
  }

  private calculateRetryDelay(attempt: number): number {
    if (!this.retryConfig.exponentialBackoff) {
      return this.retryConfig.baseDelay;
    }

    const delay = this.retryConfig.baseDelay * Math.pow(2, attempt - 1);
    const jitter = Math.random() * 1000; // Add jitter to prevent thundering herd

    return Math.min(delay + jitter, this.retryConfig.maxDelay);
  }

  private clearReconnectTimeout(connectionId: string): void {
    const timeout = this.reconnectTimeouts.get(connectionId);
    if (timeout) {
      clearTimeout(timeout);
      this.reconnectTimeouts.delete(connectionId);
    }
  }

  /**
   * Update retry configuration
   */
  updateRetryConfig(config: Partial<RetryConfig>): void {
    Object.assign(this.retryConfig, config);
  }

  /**
   * Get current retry configuration
   */
  getRetryConfig(): Readonly<RetryConfig> {
    return { ...this.retryConfig };
  }
}