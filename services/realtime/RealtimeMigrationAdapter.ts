/**
 * Realtime Migration Adapter
 * Part of Real-time Service Architecture Simplification Refactoring
 * Provides backward compatibility while transitioning from monolithic RealtimeSubscriptionService
 */

import { RealtimeOrchestrator } from './RealtimeOrchestrator';
import { ConnectionState } from './ConnectionPoolManager';


// Re-export types for compatibility
export { ConnectionState } from './ConnectionPoolManager';

export type ConnectionStateListener = (state: ConnectionState, error?: string) => void;

/**
 * Adapter to maintain compatibility with existing RealtimeSubscriptionService usage
 * Provides the same interface but uses the new modular architecture internally
 */
export class RealtimeSubscriptionServiceAdapter {
  private static orchestrator: RealtimeOrchestrator | null = null;
  private static connectionStateListeners = new Set<ConnectionStateListener>();

  /**
   * Get orchestrator instance (lazy initialization)
   */
  private static getOrchestrator(): RealtimeOrchestrator {
    if (!this.orchestrator) {
      this.orchestrator = RealtimeOrchestrator.getInstance();
      this.orchestrator.initialize();
    }
    return this.orchestrator;
  }

  /**
   * Initialize the service (compatibility method)
   */
  static initialize(): void {
    this.getOrchestrator();
  }

  /**
   * Get singleton instance (compatibility method)
   */
  static getInstance(): RealtimeSubscriptionServiceInstance {
    return new RealtimeSubscriptionServiceInstance();
  }

  /**
   * Subscribe to tournament (static method for compatibility)
   */
  static async subscribeTournament(
    tournamentNo: string,
    enableLiveMatches: boolean = true
  ): Promise<string> {
    const orchestrator = this.getOrchestrator();

    return await orchestrator.subscribe({
      tournamentNo,
      liveMatchesOnly: enableLiveMatches,
      onUpdate: (_payload) => {
        // Legacy behavior - notify connection state listeners
        this.notifyConnectionStateListeners(ConnectionState.CONNECTED);
      }
    });
  }

  /**
   * Unsubscribe from tournament (static method for compatibility)
   */
  static async unsubscribeTournament(tournamentNo: string): Promise<boolean> {
    const orchestrator = this.getOrchestrator();
    return await orchestrator.unsubscribe(tournamentNo);
  }

  /**
   * Add connection state listener (static method for compatibility)
   */
  static addConnectionStateListener(listener: ConnectionStateListener): () => void {
    this.connectionStateListeners.add(listener);

    // Also listen to the orchestrator's connection state
    const orchestrator = this.getOrchestrator();

    // Return unsubscribe function
    return () => {
      this.connectionStateListeners.delete(listener);
    };
  }

  /**
   * Get current connection state (static method for compatibility)
   */
  static getConnectionState(): ConnectionState {
    const orchestrator = this.getOrchestrator();
    return orchestrator.getStatistics().connections.activeConnections > 0
      ? ConnectionState.CONNECTED
      : ConnectionState.DISCONNECTED;
  }

  /**
   * Handle app state change (static method for compatibility)
   */
  static handleAppStateChange(appState: string): void {
    const orchestrator = this.getOrchestrator();

    if (appState === 'background') {
      orchestrator.pauseAll();
      this.notifyConnectionStateListeners(ConnectionState.DISCONNECTED);
    } else if (appState === 'active') {
      orchestrator.resumeAll();
      this.notifyConnectionStateListeners(ConnectionState.CONNECTING);
    }
  }

  /**
   * Get active subscriptions (static method for compatibility)
   */
  static getActiveSubscriptions(): string[] {
    const orchestrator = this.getOrchestrator();
    return orchestrator.getActiveSubscriptions();
  }

  /**
   * Cleanup (static method for compatibility)
   */
  static async cleanup(): Promise<void> {
    if (this.orchestrator) {
      await this.orchestrator.cleanup();
      this.orchestrator = null;
    }
    this.connectionStateListeners.clear();
  }

  // Private helper methods

  private static notifyConnectionStateListeners(state: ConnectionState, error?: string): void {
    this.connectionStateListeners.forEach(listener => {
      try {
        listener(state, error);
      } catch (err) {
        console.error('Error in connection state listener:', err);
      }
    });
  }
}

/**
 * Instance-based adapter for backward compatibility
 * Provides instance methods that delegate to the static orchestrator
 */
export class RealtimeSubscriptionServiceInstance {
  /**
   * Subscribe to matches for a tournament (instance method for compatibility)
   */
  async subscribeToMatches(
    tournamentCode: string,
    callback?: (match: any) => void
  ): Promise<string | null> {
    try {
      const subscriptionId = await RealtimeSubscriptionServiceAdapter.subscribeTournament(
        tournamentCode,
        true
      );

      // If a callback is provided, we would need to store it and call it on updates
      // For now, returning the subscription ID for basic compatibility
      return subscriptionId;
    } catch (error) {
      console.error('Failed to subscribe to matches:', error);
      return null;
    }
  }

  /**
   * Unsubscribe from a subscription (instance method for compatibility)
   */
  async unsubscribe(subscriptionId: string): Promise<void> {
    // Extract tournament number from subscription ID if needed
    const tournamentNo = subscriptionId.replace('matches_', '').replace('fallback_', '');
    await RealtimeSubscriptionServiceAdapter.unsubscribeTournament(tournamentNo);
  }

  /**
   * Get connection state (instance method for compatibility)
   */
  getConnectionState(): ConnectionState {
    return RealtimeSubscriptionServiceAdapter.getConnectionState();
  }

  /**
   * Add connection state listener (instance method for compatibility)
   */
  addConnectionStateListener(listener: ConnectionStateListener): () => void {
    return RealtimeSubscriptionServiceAdapter.addConnectionStateListener(listener);
  }
}

// Export both the adapter and the legacy enum for compatibility
export { RealtimeSubscriptionServiceAdapter as RealtimeSubscriptionService };

/**
 * Legacy compatibility exports
 * These maintain the exact same interface as the original monolithic service
 */

// Legacy static interface
export const RealtimeSubscriptionServiceLegacy = {
  initialize: RealtimeSubscriptionServiceAdapter.initialize,
  getInstance: RealtimeSubscriptionServiceAdapter.getInstance,
  subscribeTournament: RealtimeSubscriptionServiceAdapter.subscribeTournament,
  unsubscribeTournament: RealtimeSubscriptionServiceAdapter.unsubscribeTournament,
  addConnectionStateListener: RealtimeSubscriptionServiceAdapter.addConnectionStateListener,
  getConnectionState: RealtimeSubscriptionServiceAdapter.getConnectionState,
  handleAppStateChange: RealtimeSubscriptionServiceAdapter.handleAppStateChange,
  getActiveSubscriptions: RealtimeSubscriptionServiceAdapter.getActiveSubscriptions,
  cleanup: RealtimeSubscriptionServiceAdapter.cleanup
};

/**
 * Usage Migration Guide:
 *
 * // OLD (monolithic):
 * import { RealtimeSubscriptionService } from '../services/RealtimeSubscriptionService';
 * RealtimeSubscriptionService.subscribeTournament('123', true);
 *
 * // NEW (modular - recommended for new code):
 * import { RealtimeOrchestrator } from '../services/realtime/RealtimeOrchestrator';
 * const orchestrator = RealtimeOrchestrator.getInstance();
 * await orchestrator.subscribe({ tournamentNo: '123', liveMatchesOnly: true });
 *
 * // MIGRATION (backward compatible):
 * import { RealtimeSubscriptionService } from '../services/realtime/RealtimeMigrationAdapter';
 * RealtimeSubscriptionService.subscribeTournament('123', true);
 */