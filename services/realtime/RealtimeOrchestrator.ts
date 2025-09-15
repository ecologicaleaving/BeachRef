/**
 * Realtime Orchestrator
 * Part of Real-time Service Architecture Simplification Refactoring
 * Focused responsibility: Coordinate between subscription, connection, and fallback services
 */

import { SubscriptionManager, SubscriptionConfig, SubscriptionEventHandler } from './SubscriptionManager';
import { ConnectionPoolManager, ConnectionState } from './ConnectionPoolManager';
import { RealtimePerformanceMonitor } from '../RealtimePerformanceMonitor';
import { RealtimeFallbackService } from '../RealtimeFallbackService';
import { BeachMatch } from '../../types/match';
import { CacheServiceCompatibility as CacheService } from '../../hooks/compatibility/CacheServiceCompatibility';

export interface OrchestratorConfig {
  enableFallback: boolean;
  enablePerformanceMonitoring: boolean;
  cacheInvalidationEnabled: boolean;
}

export interface SubscriptionRequest {
  tournamentNo: string;
  liveMatchesOnly?: boolean;
  fallbackEnabled?: boolean;
  onUpdate?: SubscriptionEventHandler;
}

export interface SubscriptionStatus {
  active: boolean;
  retrying: boolean;
  fallbackActive: boolean;
  connectionHealth: any;
}

/**
 * Orchestrates real-time services with dependency injection
 * Single responsibility: Service coordination and high-level operations
 */
export class RealtimeOrchestrator {
  private static instance: RealtimeOrchestrator | null = null;

  private subscriptionManager: SubscriptionManager;
  private connectionManager: ConnectionPoolManager;
  private isInitialized = false;

  private readonly config: OrchestratorConfig = {
    enableFallback: true,
    enablePerformanceMonitoring: true,
    cacheInvalidationEnabled: true
  };

  private constructor(
    subscriptionManager?: SubscriptionManager,
    connectionManager?: ConnectionPoolManager
  ) {
    // Dependency injection - allows for testing with mocks
    this.subscriptionManager = subscriptionManager || new SubscriptionManager();
    this.connectionManager = connectionManager || new ConnectionPoolManager();
  }

  /**
   * Get singleton instance with dependency injection support
   */
  static getInstance(
    subscriptionManager?: SubscriptionManager,
    connectionManager?: ConnectionPoolManager
  ): RealtimeOrchestrator {
    if (!RealtimeOrchestrator.instance) {
      RealtimeOrchestrator.instance = new RealtimeOrchestrator(
        subscriptionManager,
        connectionManager
      );
    }
    return RealtimeOrchestrator.instance;
  }

  /**
   * Initialize the orchestrator and all services
   */
  initialize(): void {
    if (this.isInitialized) return;

    console.log('Initializing Realtime Orchestrator...');

    // Initialize sub-services
    this.connectionManager.initialize();

    if (this.config.enablePerformanceMonitoring) {
      RealtimePerformanceMonitor.initialize();
    }

    if (this.config.enableFallback) {
      RealtimeFallbackService.initialize();
    }

    // Set up connection state monitoring
    this.connectionManager.addConnectionStateListener((state, error) => {
      if (state === ConnectionState.ERROR && this.config.enableFallback) {
        this.handleConnectionFailure(error);
      }
    });

    this.isInitialized = true;
  }

  /**
   * Subscribe to tournament with intelligent fallback management
   */
  async subscribe(request: SubscriptionRequest): Promise<string> {
    this.initialize();

    const { tournamentNo, liveMatchesOnly = true, fallbackEnabled = true, onUpdate } = request;
    const connectionId = `tournament-${tournamentNo}`;

    // Check if connection is allowed by circuit breaker
    if (!this.connectionManager.canConnect(connectionId)) {
      if (fallbackEnabled && this.config.enableFallback) {
        return this.activateFallback(tournamentNo, liveMatchesOnly, onUpdate);
      }
      throw new Error(`Connection blocked by circuit breaker for ${tournamentNo}`);
    }

    try {
      // Create subscription
      const subscriptionId = await this.subscriptionManager.createSubscription(
        tournamentNo,
        { liveMatchesOnly } as SubscriptionConfig
      );

      // Add event handler if provided
      if (onUpdate) {
        this.subscriptionManager.addEventHandler(subscriptionId, (payload) => {
          this.handleSubscriptionUpdate(tournamentNo, payload, onUpdate);
        });
      }

      // Record successful connection
      this.connectionManager.recordConnectionSuccess(connectionId);

      return subscriptionId;
    } catch (error) {
      console.error(`Failed to establish subscription for ${tournamentNo}:`, error);

      // Record connection failure
      this.connectionManager.recordConnectionFailure(connectionId, error.message);

      // Try fallback if enabled
      if (fallbackEnabled && this.config.enableFallback) {
        return this.activateFallback(tournamentNo, liveMatchesOnly, onUpdate);
      }

      throw error;
    }
  }

  /**
   * Unsubscribe from tournament
   */
  async unsubscribe(subscriptionIdOrTournamentNo: string): Promise<boolean> {
    // Handle both subscription ID and tournament number formats
    const subscriptionId = subscriptionIdOrTournamentNo.startsWith('matches_')
      ? subscriptionIdOrTournamentNo
      : `matches_${subscriptionIdOrTournamentNo}`;

    const success = await this.subscriptionManager.removeSubscription(subscriptionId);

    // Also deactivate fallback if active
    const tournamentNo = subscriptionId.replace('matches_', '');
    RealtimeFallbackService.stopPollingFallback(tournamentNo);

    return success;
  }

  /**
   * Get subscription status
   */
  getSubscriptionStatus(tournamentNo: string): SubscriptionStatus {
    const subscriptionId = `matches_${tournamentNo}`;
    const subscription = this.subscriptionManager.getSubscription(subscriptionId);
    const connectionId = `tournament-${tournamentNo}`;
    const connectionHealth = this.connectionManager.getConnectionHealth(connectionId);

    return {
      active: subscription?.status === 'active' || false,
      retrying: subscription?.status === 'connecting' || false,
      fallbackActive: false, // TODO: Check fallback service status
      connectionHealth
    };
  }

  /**
   * Get all active subscriptions
   */
  getActiveSubscriptions(): string[] {
    return this.subscriptionManager
      .getAllSubscriptions()
      .filter(sub => sub.status === 'active')
      .map(sub => sub.tournamentNo);
  }

  /**
   * Get orchestrator statistics
   */
  getStatistics() {
    const subscriptionStats = this.subscriptionManager.getSubscriptionStats();
    const connectionHealth = this.connectionManager.getOverallHealth();

    return {
      subscriptions: subscriptionStats,
      connections: connectionHealth,
      performance: this.config.enablePerformanceMonitoring
        ? RealtimePerformanceMonitor.getPerformanceReport()
        : null,
      fallbackServices: {
        enabled: this.config.enableFallback,
        // TODO: Get fallback statistics from RealtimeFallbackService
      }
    };
  }

  /**
   * Pause all subscriptions (for battery optimization)
   */
  pauseAll(): void {
    const subscriptions = this.subscriptionManager.getAllSubscriptions();

    subscriptions.forEach(subscription => {
      this.subscriptionManager.pauseSubscription(subscription.id);
    });

    this.connectionManager.disconnectAll();
  }

  /**
   * Resume all paused subscriptions
   */
  async resumeAll(): Promise<void> {
    const subscriptions = this.subscriptionManager.getAllSubscriptions();

    const resumePromises = subscriptions
      .filter(sub => sub.status === 'paused')
      .map(subscription =>
        this.connectionManager.scheduleReconnection(
          subscription.tournamentNo,
          () => this.subscriptionManager.resumeSubscription(subscription.id)
        )
      );

    // Note: scheduleReconnection doesn't return promises, so we can't await them
    // The reconnections will happen asynchronously
  }

  /**
   * Update orchestrator configuration
   */
  updateConfig(configUpdate: Partial<OrchestratorConfig>): void {
    Object.assign(this.config, configUpdate);
  }

  /**
   * Cleanup all resources
   */
  async cleanup(): Promise<void> {
    console.log('Cleaning up Realtime Orchestrator...');

    await this.subscriptionManager.cleanup();
    this.connectionManager.cleanup();

    if (this.config.enablePerformanceMonitoring) {
      RealtimePerformanceMonitor.cleanup();
    }

    if (this.config.enableFallback) {
      RealtimeFallbackService.cleanup();
    }

    this.isInitialized = false;
    RealtimeOrchestrator.instance = null;
  }

  // Private methods

  private async activateFallback(
    tournamentNo: string,
    liveMatchesOnly: boolean,
    onUpdate?: SubscriptionEventHandler
  ): Promise<string> {
    console.log(`Activating fallback polling for tournament ${tournamentNo}`);

    const success = await RealtimeFallbackService.startPollingFallback(
      tournamentNo,
      (matches) => {
        if (onUpdate) {
          // Convert matches to the expected payload format
          const payload = { new: matches, old: null, eventType: 'UPDATE' };
          onUpdate(payload);
        }
        this.handleFallbackUpdate(tournamentNo, matches);
      },
      liveMatchesOnly
    );

    if (!success) {
      throw new Error(`Failed to activate fallback for tournament ${tournamentNo}`);
    }

    return `fallback_${tournamentNo}`;
  }

  private handleConnectionFailure(error?: string): void {
    console.warn('Connection failure detected:', error);

    if (this.config.enableFallback) {
      // The fallback activation will be handled per-subscription basis
      console.log('Fallback services are available for affected subscriptions');
    }
  }

  private handleSubscriptionUpdate(
    tournamentNo: string,
    payload: any,
    onUpdate: SubscriptionEventHandler
  ): void {
    try {
      // Track performance if enabled
      if (this.config.enablePerformanceMonitoring) {
        const messageSize = JSON.stringify(payload).length;
        RealtimePerformanceMonitor.trackMessageReceived(messageSize, tournamentNo);
      }

      // Invalidate cache if enabled
      if (this.config.cacheInvalidationEnabled) {
        this.invalidateMatchCache(tournamentNo);
      }

      // Call the user's update handler
      onUpdate(payload);
    } catch (error) {
      console.error('Error handling subscription update:', error);
    }
  }

  private async handleFallbackUpdate(tournamentNo: string, matches: BeachMatch[]): Promise<void> {
    try {
      console.log(`Fallback update received for tournament ${tournamentNo}: ${matches.length} matches`);

      if (this.config.cacheInvalidationEnabled) {
        await this.invalidateMatchCache(tournamentNo);
      }
    } catch (error) {
      console.error(`Error handling fallback update for tournament ${tournamentNo}:`, error);
    }
  }

  private async invalidateMatchCache(tournamentNo: string): Promise<void> {
    try {
      await CacheService.invalidateMatchCache(tournamentNo);
    } catch (error) {
      console.error(`Failed to invalidate cache for tournament ${tournamentNo}:`, error);
    }
  }
}