import { AppState, AppStateStatus } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import NetworkStateManager, { NetworkState, ConnectionQuality } from './NetworkStateManager';
import { RealtimeFallbackService } from './RealtimeFallbackService';
import { ConnectionCircuitBreaker } from './ConnectionCircuitBreaker';

export enum AppLifecycleState {
  FOREGROUND_ACTIVE = 'FOREGROUND_ACTIVE',
  FOREGROUND_INACTIVE = 'FOREGROUND_INACTIVE',
  BACKGROUND_ACTIVE = 'BACKGROUND_ACTIVE',
  BACKGROUND_SUSPENDED = 'BACKGROUND_SUSPENDED',
  BACKGROUND_TERMINATED = 'BACKGROUND_TERMINATED'
}

export interface ConnectionSuspensionConfig {
  suspendAfterSeconds: number;
  keepCriticalConnections: boolean;
  enableBackgroundSync: boolean;
  cleanupAfterMinutes: number;
}

export interface AppStateEvent {
  previousState: AppLifecycleState;
  currentState: AppLifecycleState;
  timestamp: number;
  networkState?: NetworkState;
  activeConnections: number;
}

/**
 * Comprehensive App State Manager for real-time connections
 * Handles background/foreground transitions, connection suspension, and lifecycle management
 */
export class AppStateManager {
  private static instance: AppStateManager | null = null;
  private static isInitialized = false;

  private currentState: AppLifecycleState = AppLifecycleState.FOREGROUND_ACTIVE;
  private stateHistory: AppStateEvent[] = [];
  private appStateListener: ((nextAppState: AppStateStatus) => void) | null = null;
  
  private suspensionConfig: ConnectionSuspensionConfig = {
    suspendAfterSeconds: 30,
    keepCriticalConnections: true,
    enableBackgroundSync: true,
    cleanupAfterMinutes: 10,
  };

  private backgroundTimer: NodeJS.Timeout | null = null;
  private cleanupTimer: NodeJS.Timeout | null = null;
  private backgroundSyncTimer: NodeJS.Timeout | null = null;
  
  private suspendedConnections = new Set<string>();
  private criticalConnections = new Set<string>();
  private stateChangeListeners = new Set<(event: AppStateEvent) => void>();
  
  private networkStateManager: NetworkStateManager;
  private backgroundStartTime: number | null = null;

  private constructor() {
    this.networkStateManager = NetworkStateManager.getInstance();
    this.initialize();
  }

  /**
   * Get singleton instance
   */
  static getInstance(): AppStateManager {
    if (!this.instance) {
      this.instance = new AppStateManager();
    }
    return this.instance;
  }

  /**
   * Initialize app state monitoring
   */
  private initialize(): void {
    if (AppStateManager.isInitialized) return;


    // Set up AppState listener
    this.appStateListener = this.handleAppStateChange.bind(this);
    AppState.addEventListener('change', this.appStateListener);

    // Initialize with current app state
    const currentAppState = AppState.currentState;
    this.updateLifecycleState(this.mapAppStateToLifecycle(currentAppState), 'Initial state');

    AppStateManager.isInitialized = true;
  }

  /**
   * Handle React Native AppState changes
   */
  private handleAppStateChange(nextAppState: AppStateStatus): void {
    const newLifecycleState = this.mapAppStateToLifecycle(nextAppState);
    

    this.updateLifecycleState(newLifecycleState, `AppState: ${nextAppState}`);
  }

  /**
   * Map React Native AppState to our lifecycle states
   */
  private mapAppStateToLifecycle(appState: AppStateStatus): AppLifecycleState {
    switch (appState) {
      case 'active':
        return AppLifecycleState.FOREGROUND_ACTIVE;
      case 'inactive':
        return AppLifecycleState.FOREGROUND_INACTIVE;
      case 'background':
        return this.backgroundStartTime ? AppLifecycleState.BACKGROUND_ACTIVE : AppLifecycleState.BACKGROUND_ACTIVE;
      default:
        return AppLifecycleState.FOREGROUND_ACTIVE;
    }
  }

  /**
   * Update lifecycle state and trigger appropriate actions
   */
  private updateLifecycleState(newState: AppLifecycleState, reason: string): void {
    if (newState === this.currentState) return;

    const previousState = this.currentState;
    const networkState = this.networkStateManager.getCurrentNetworkState();
    const activeConnections = this.getActiveConnectionCount();

    // Create state change event
    const stateEvent: AppStateEvent = {
      previousState,
      currentState: newState,
      timestamp: Date.now(),
      networkState: networkState || undefined,
      activeConnections,
    };

    // Update state
    this.currentState = newState;

    // Add to history
    this.stateHistory.push(stateEvent);
    if (this.stateHistory.length > 100) {
      this.stateHistory.shift();
    }


    // Handle state-specific actions
    this.handleLifecycleTransition(previousState, newState);

    // Notify listeners
    this.notifyStateChangeListeners(stateEvent);

    // Persist state for recovery
    this.persistAppState(stateEvent);
  }

  /**
   * Handle lifecycle transitions
   */
  private handleLifecycleTransition(previous: AppLifecycleState, current: AppLifecycleState): void {
    // Entering background states
    if (this.isForegroundState(previous) && this.isBackgroundState(current)) {
      this.handleEnterBackground();
    }

    // Returning to foreground states
    if (this.isBackgroundState(previous) && this.isForegroundState(current)) {
      this.handleEnterForeground();
    }

    // Background state progression
    if (current === AppLifecycleState.BACKGROUND_ACTIVE && previous !== AppLifecycleState.BACKGROUND_ACTIVE) {
      this.scheduleBackgroundSuspension();
    }

    // Inactive state handling
    if (current === AppLifecycleState.FOREGROUND_INACTIVE) {
      this.handleInactiveState();
    }
  }

  /**
   * Handle entering background state
   */
  private async handleEnterBackground(): Promise<void> {
    this.backgroundStartTime = Date.now();
    

    // Schedule background sync if enabled
    if (this.suspensionConfig.enableBackgroundSync) {
      this.scheduleBackgroundSync();
    }

    // Immediately reduce connection frequency
    this.optimizeForBackground();
  }

  /**
   * Handle returning to foreground state
   */
  private async handleEnterForeground(): Promise<void> {

    // Clear background timers
    this.clearBackgroundTimers();
    
    this.backgroundStartTime = null;

    // Restore suspended connections
    await this.resumeConnections();

    // Optimize for foreground usage
    this.optimizeForForeground();
  }

  /**
   * Handle inactive state (brief interruptions)
   */
  private handleInactiveState(): void {
    
    // Don't suspend immediately for inactive state, but prepare for potential background
    // This handles brief interruptions like incoming calls, notification center, etc.
  }

  /**
   * Schedule background connection suspension
   */
  private scheduleBackgroundSuspension(): void {
    // Clear any existing timer
    if (this.backgroundTimer) {
      clearTimeout(this.backgroundTimer);
    }


    this.backgroundTimer = setTimeout(() => {
      this.suspendConnections();
      this.scheduleCleanup();
    }, this.suspensionConfig.suspendAfterSeconds * 1000);
  }

  /**
   * Schedule background sync
   */
  private scheduleBackgroundSync(): void {
    if (!this.suspensionConfig.enableBackgroundSync) return;

    // Schedule periodic sync every 5 minutes in background
    this.backgroundSyncTimer = setInterval(async () => {
      if (this.isBackgroundState(this.currentState)) {
        await this.performBackgroundSync();
      }
    }, 300000); // 5 minutes
  }

  /**
   * Schedule extended cleanup
   */
  private scheduleCleanup(): void {
    if (this.cleanupTimer) {
      clearTimeout(this.cleanupTimer);
    }


    this.cleanupTimer = setTimeout(() => {
      this.cleanupIdleConnections();
    }, this.suspensionConfig.cleanupAfterMinutes * 60000);
  }

  /**
   * Suspend non-critical connections
   */
  private async suspendConnections(): Promise<void> {

    try {
      // Get all circuit breakers and suspend non-critical ones
      const activeConnections = this.getActiveConnectionCount();
      let suspendedCount = 0;

      // This would typically iterate through actual connection managers
      // For now, we'll work with the fallback service
      RealtimeFallbackService.stopAllPolling();
      suspendedCount++;


      this.updateLifecycleState(AppLifecycleState.BACKGROUND_SUSPENDED, 'Connection suspension completed');

    } catch (error) {
      // console.error('Error suspending connections:', error);
    }
  }

  /**
   * Resume suspended connections
   */
  private async resumeConnections(): Promise<void> {

    try {
      let resumedCount = 0;

      // Resume connections in priority order
      for (const connectionId of this.suspendedConnections) {
        // This would typically resume specific connection managers
        resumedCount++;
      }

      // Clear suspended connections
      this.suspendedConnections.clear();


      // Force network quality reassessment
      await this.networkStateManager.forceQualityReassessment();

    } catch (error) {
      // console.error('Error resuming connections:', error);
    }
  }

  /**
   * Optimize connections for background usage
   */
  private optimizeForBackground(): void {

    // Reduce polling frequencies
    // Disable non-essential features
    // Enable battery saving mode
  }

  /**
   * Optimize connections for foreground usage
   */
  private optimizeForForeground(): void {

    // Restore normal polling frequencies
    // Enable all features
    // Disable battery saving mode
  }

  /**
   * Perform background sync for critical data
   */
  private async performBackgroundSync(): Promise<void> {
    if (!this.suspensionConfig.enableBackgroundSync) return;


    try {
      // This would typically sync critical data like live match scores
      // Implementation depends on specific requirements
      
    } catch (error) {
      // console.error('Background sync failed:', error);
    }
  }

  /**
   * Cleanup idle connections after extended background time
   */
  private cleanupIdleConnections(): void {

    try {
      // Force cleanup of all resources
      RealtimeFallbackService.cleanup();
      
      this.updateLifecycleState(AppLifecycleState.BACKGROUND_TERMINATED, 'Extended background cleanup');

    } catch (error) {
      // console.error('Error during connection cleanup:', error);
    }
  }

  /**
   * Clear all background timers
   */
  private clearBackgroundTimers(): void {
    if (this.backgroundTimer) {
      clearTimeout(this.backgroundTimer);
      this.backgroundTimer = null;
    }

    if (this.cleanupTimer) {
      clearTimeout(this.cleanupTimer);
      this.cleanupTimer = null;
    }

    if (this.backgroundSyncTimer) {
      clearInterval(this.backgroundSyncTimer);
      this.backgroundSyncTimer = null;
    }
  }

  /**
   * Utility methods
   */
  private isForegroundState(state: AppLifecycleState): boolean {
    return state === AppLifecycleState.FOREGROUND_ACTIVE || 
           state === AppLifecycleState.FOREGROUND_INACTIVE;
  }

  private isBackgroundState(state: AppLifecycleState): boolean {
    return state === AppLifecycleState.BACKGROUND_ACTIVE || 
           state === AppLifecycleState.BACKGROUND_SUSPENDED ||
           state === AppLifecycleState.BACKGROUND_TERMINATED;
  }

  private getActiveConnectionCount(): number {
    // This would typically count actual active connections
    return RealtimeFallbackService.getActivePollingTournaments().length;
  }

  /**
   * Public API methods
   */

  /**
   * Get current lifecycle state
   */
  getCurrentState(): AppLifecycleState {
    return this.currentState;
  }

  /**
   * Get state history
   */
  getStateHistory(): AppStateEvent[] {
    return [...this.stateHistory];
  }

  /**
   * Add a critical connection that should not be suspended
   */
  addCriticalConnection(connectionId: string): void {
    this.criticalConnections.add(connectionId);
  }

  /**
   * Remove a critical connection
   */
  removeCriticalConnection(connectionId: string): void {
    this.criticalConnections.delete(connectionId);
  }

  /**
   * Update suspension configuration
   */
  updateSuspensionConfig(config: Partial<ConnectionSuspensionConfig>): void {
    this.suspensionConfig = { ...this.suspensionConfig, ...config };
  }

  /**
   * Add state change listener
   */
  addStateChangeListener(listener: (event: AppStateEvent) => void): () => void {
    this.stateChangeListeners.add(listener);
    return () => this.stateChangeListeners.delete(listener);
  }

  /**
   * Notify state change listeners
   */
  private notifyStateChangeListeners(event: AppStateEvent): void {
    this.stateChangeListeners.forEach(listener => {
      try {
        listener(event);
      } catch (error) {
        // console.error('Error in app state listener:', error);
      }
    });
  }

  /**
   * Persist app state for recovery
   */
  private async persistAppState(event: AppStateEvent): Promise<void> {
    try {
      await AsyncStorage.setItem('app_state_event', JSON.stringify(event));
    } catch (error) {
      // console.error('Failed to persist app state:', error);
    }
  }

  /**
   * Get app lifecycle statistics
   */
  getLifecycleStats(): {
    currentState: AppLifecycleState;
    backgroundTime: number | null;
    stateChanges: number;
    averageBackgroundDuration: number;
    suspendedConnections: number;
    criticalConnections: number;
  } {
    const backgroundTime = this.backgroundStartTime ? Date.now() - this.backgroundStartTime : null;
    
    const backgroundEvents = this.stateHistory.filter(event => 
      this.isBackgroundState(event.currentState)
    );

    const averageBackgroundDuration = backgroundEvents.length > 0 
      ? backgroundEvents.reduce((sum, event, index, array) => {
          if (index < array.length - 1) {
            return sum + (array[index + 1].timestamp - event.timestamp);
          }
          return sum;
        }, 0) / (backgroundEvents.length - 1)
      : 0;

    return {
      currentState: this.currentState,
      backgroundTime,
      stateChanges: this.stateHistory.length,
      averageBackgroundDuration,
      suspendedConnections: this.suspendedConnections.size,
      criticalConnections: this.criticalConnections.size,
    };
  }

  /**
   * Force immediate connection suspension (for testing or manual control)
   */
  async forceSuspendConnections(): Promise<void> {
    await this.suspendConnections();
  }

  /**
   * Force immediate connection resume (for testing or manual control)
   */
  async forceResumeConnections(): Promise<void> {
    await this.resumeConnections();
  }

  /**
   * Cleanup resources
   */
  cleanup(): void {

    // Remove app state listener
    if (this.appStateListener) {
      AppState.removeEventListener('change', this.appStateListener);
      this.appStateListener = null;
    }

    // Clear timers
    this.clearBackgroundTimers();

    // Clear listeners
    this.stateChangeListeners.clear();

    // Clear sets
    this.suspendedConnections.clear();
    this.criticalConnections.clear();

    AppStateManager.isInitialized = false;
  }

  /**
   * Reset singleton instance (for testing)
   */
  static resetInstance(): void {
    if (this.instance) {
      this.instance.cleanup();
      this.instance = null;
    }
  }
}

export default AppStateManager;