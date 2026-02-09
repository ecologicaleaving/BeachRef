/**
 * Assignment Status Management Service
 * Centralized status state management for referee assignment status across screens
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { Alert, Vibration } from 'react-native';
import NotificationService from './notifications/NotificationService';
import NotificationPreferencesService from './notifications/NotificationPreferencesService';
import { NotificationType } from '../types/notifications';

// Simple EventEmitter implementation for React Native compatibility
class EventEmitter {
  private events: { [key: string]: Function[] } = {};

  on(event: string, listener: Function): void {
    if (!this.events[event]) {
      this.events[event] = [];
    }
    this.events[event].push(listener);
  }

  off(event: string, listener: Function): void {
    if (!this.events[event]) return;
    this.events[event] = this.events[event].filter(l => l !== listener);
  }

  emit(event: string, ...args: any[]): void {
    if (!this.events[event]) return;
    this.events[event].forEach(listener => listener(...args));
  }
}

// Assignment Status Types (from Dev Notes)
export type AssignmentStatus = 
  | 'current' 
  | 'upcoming' 
  | 'completed' 
  | 'cancelled' 
  | 'emergency';

// Notification Types
export type NotificationType = 
  | 'status_change'
  | 'urgency_alert'
  | 'sync_update'
  | 'assignment_reminder';

export interface NotificationConfig {
  enabled: boolean;
  statusChanges: boolean;
  urgencyAlerts: boolean;
  offlineSync: boolean;
  sound: boolean;
  vibration: boolean;
}

export interface StatusHistoryEntry {
  id: string;
  assignmentId: string;
  previousStatus: AssignmentStatus | undefined;
  newStatus: AssignmentStatus;
  urgency: 'normal' | 'warning' | 'critical';
  timestamp: string;
  source: 'user' | 'system' | 'sync';
  reason?: string;
}

export interface AssignmentStatusState {
  id: string;
  status: AssignmentStatus;
  assignmentId: string;
  matchId: string;
  courtNumber: string;
  teams: string[];
  matchTime: string;
  urgency: 'normal' | 'warning' | 'critical';
  lastUpdated: string;
  syncStatus: 'synced' | 'pending' | 'offline';
}

export interface StatusUpdateEvent {
  type: 'status_change' | 'urgency_change' | 'sync_status_change';
  assignmentId: string;
  previousStatus?: AssignmentStatus;
  newStatus: AssignmentStatus;
  timestamp: string;
}

class AssignmentStatusManager extends EventEmitter {
  private static instance: AssignmentStatusManager;
  private statusStates: Map<string, AssignmentStatusState> = new Map();
  private statusHistory: StatusHistoryEntry[] = [];
  private notificationConfig: NotificationConfig = {
    enabled: true,
    statusChanges: true,
    urgencyAlerts: true,
    offlineSync: true,
    sound: false,
    vibration: true,
  };
  private persistenceKey = 'assignment_status_states';
  private historyKey = 'assignment_status_history';
  private configKey = 'notification_config';
  private syncQueue: StatusUpdateEvent[] = [];
  private isOnline: boolean = true;

  private constructor() {
    super();
    // Initialize async but don't wait for it in constructor
    this.initializeFromStorage().catch(console.error);
  }

  public static getInstance(): AssignmentStatusManager {
    if (!AssignmentStatusManager.instance) {
      AssignmentStatusManager.instance = new AssignmentStatusManager();
    }
    return AssignmentStatusManager.instance;
  }

  /**
   * Initialize status states, history, and config from AsyncStorage
   */
  private async initializeFromStorage(): Promise<void> {
    try {
      // Load status states
      const storedStates = await AsyncStorage.getItem(this.persistenceKey);
      if (storedStates) {
        const parsedStates = JSON.parse(storedStates);
        this.statusStates = new Map(Object.entries(parsedStates));
      }

      // Load status history
      const storedHistory = await AsyncStorage.getItem(this.historyKey);
      if (storedHistory) {
        this.statusHistory = JSON.parse(storedHistory);
      }

      // Load notification config
      const storedConfig = await AsyncStorage.getItem(this.configKey);
      if (storedConfig) {
        this.notificationConfig = { ...this.notificationConfig, ...JSON.parse(storedConfig) };
      }
    } catch (error) {
      // console.error('AssignmentStatusManager: Failed to initialize from storage:', error);
    }
  }

  /**
   * Persist status states, history, and config to AsyncStorage
   */
  private async persistToStorage(): Promise<void> {
    try {
      // Persist status states
      const statesObject = Object.fromEntries(this.statusStates);
      await AsyncStorage.setItem(this.persistenceKey, JSON.stringify(statesObject));

      // Persist status history (keep last 1000 entries)
      const trimmedHistory = this.statusHistory.slice(-1000);
      this.statusHistory = trimmedHistory;
      await AsyncStorage.setItem(this.historyKey, JSON.stringify(trimmedHistory));

      // Persist notification config
      await AsyncStorage.setItem(this.configKey, JSON.stringify(this.notificationConfig));
    } catch (error) {
      // console.error('AssignmentStatusManager: Failed to persist to storage:', error);
    }
  }

  /**
   * Update assignment status with real-time propagation, notifications, and history
   */
  public async updateStatus(
    assignmentId: string,
    newStatus: AssignmentStatus,
    urgency: 'normal' | 'warning' | 'critical' = 'normal',
    source: 'user' | 'system' | 'sync' = 'user',
    reason?: string
  ): Promise<void> {
    const currentState = this.statusStates.get(assignmentId);
    const previousStatus = currentState?.status;
    const timestamp = new Date().toISOString();

    const updatedState: AssignmentStatusState = {
      ...currentState,
      id: currentState?.id || `status_${Date.now()}`,
      status: newStatus,
      assignmentId,
      urgency,
      lastUpdated: timestamp,
      syncStatus: this.isOnline ? 'synced' : 'pending',
      matchId: currentState?.matchId || '',
      courtNumber: currentState?.courtNumber || '',
      teams: currentState?.teams || [],
      matchTime: currentState?.matchTime || '',
    };

    this.statusStates.set(assignmentId, updatedState);

    // Add to status history
    const historyEntry: StatusHistoryEntry = {
      id: `history_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      assignmentId,
      previousStatus,
      newStatus,
      urgency,
      timestamp,
      source,
      reason,
    };
    this.statusHistory.push(historyEntry);

    // Create status update event
    const statusEvent: StatusUpdateEvent = {
      type: 'status_change',
      assignmentId,
      previousStatus,
      newStatus,
      timestamp,
    };

    // Handle notifications
    this.handleStatusChangeNotification(updatedState, previousStatus, source);

    // Add to sync queue if offline
    if (!this.isOnline) {
      this.syncQueue.push(statusEvent);
    }

    // Emit real-time update event
    this.emit('statusUpdate', statusEvent);
    
    // Persist to storage
    await this.persistToStorage();

  }

  /**
   * Get current status for assignment
   */
  public getStatus(assignmentId: string): AssignmentStatusState | undefined {
    return this.statusStates.get(assignmentId);
  }

  /**
   * Get all assignment statuses
   */
  public getAllStatuses(): AssignmentStatusState[] {
    return Array.from(this.statusStates.values());
  }

  /**
   * Get assignments by status type
   */
  public getAssignmentsByStatus(status: AssignmentStatus): AssignmentStatusState[] {
    return Array.from(this.statusStates.values()).filter(state => state.status === status);
  }

  /**
   * Set network connectivity status
   */
  public setNetworkStatus(isOnline: boolean): void {
    const wasOffline = !this.isOnline;
    this.isOnline = isOnline;

    if (wasOffline && isOnline) {
      // Trigger sync when coming back online
      this.syncOfflineChanges();
    }

    // Update all states sync status
    for (const [_id, state] of this.statusStates.entries()) {
      if (state.syncStatus === 'pending' && isOnline) {
        state.syncStatus = 'synced';
      } else if (!isOnline && state.syncStatus === 'synced') {
        state.syncStatus = 'offline';
      }
    }

    this.emit('networkStatusChange', { isOnline });
    this.persistToStorage();
  }

  /**
   * Sync offline changes when network comes back online
   */
  private async syncOfflineChanges(): Promise<void> {
    if (this.syncQueue.length === 0) {
      return;
    }

    const syncedCount = this.syncQueue.length;

    for (const event of this.syncQueue) {
      // In real implementation, this would sync with backend
      
      // Update sync status to synced
      const state = this.statusStates.get(event.assignmentId);
      if (state) {
        state.syncStatus = 'synced';
      }
    }

    this.syncQueue = [];
    await this.persistToStorage();

    // Emit with correct count
    this.emit('syncCompleted', { syncedCount });
  }

  /**
   * Calculate assignment urgency based on time
   */
  public calculateUrgency(matchTime: string): 'normal' | 'warning' | 'critical' {
    const now = new Date();
    const assignmentTime = new Date(matchTime);
    const minutesUntil = (assignmentTime.getTime() - now.getTime()) / (1000 * 60);

    if (minutesUntil <= 5 && minutesUntil > 0) {
      return 'critical';
    } else if (minutesUntil <= 15 && minutesUntil > 0) {
      return 'warning';
    }
    return 'normal';
  }

  /**
   * Subscribe to status updates
   */
  public subscribeToUpdates(callback: (event: StatusUpdateEvent) => void): () => void {
    this.on('statusUpdate', callback);
    return () => this.off('statusUpdate', callback);
  }

  /**
   * Subscribe to network status changes
   */
  public subscribeToNetworkChanges(callback: (event: { isOnline: boolean }) => void): () => void {
    this.on('networkStatusChange', callback);
    return () => this.off('networkStatusChange', callback);
  }

  /**
   * Handle status change notifications and feedback
   */
  private async handleStatusChangeNotification(
    updatedState: AssignmentStatusState,
    previousStatus: AssignmentStatus | undefined,
    source: 'user' | 'system' | 'sync'
  ): Promise<void> {
    if (!this.notificationConfig.enabled) return;

    const { status, urgency, courtNumber, teams } = updatedState;

    // Status change notifications
    if (this.notificationConfig.statusChanges && source === 'system' && previousStatus !== status) {
      const message = this.getStatusChangeMessage(status, courtNumber, teams);

      // Use NotificationService instead of Alert.alert
      try {
        const notificationService = NotificationService.getInstance();
        const preferencesService = NotificationPreferencesService.getInstance();

        // Check if referee has notifications enabled
        const preferences = await preferencesService.getPreferences(this.refereeId);

        if (preferences.enabled && preferences.statusChanges) {
          // Check quiet hours
          const isQuietHours = await preferencesService.isInQuietHours(this.refereeId);

          if (!isQuietHours) {
            await notificationService.sendNotification(
              {
                type: NotificationType.STATUS_CHANGE,
                title: 'Assignment Status Update',
                body: message,
                data: {
                  assignmentId: updatedState.id,
                  courtNumber,
                  deepLink: 'beachref://referee-dashboard'
                },
                priority: urgency === 'critical' || urgency === 'warning' ? 'high' : 'default',
                sound: preferences.sound ? 'default' : undefined,
                vibrate: preferences.vibration
              },
              true // Enable fallback to Alert.alert
            );
          }
        }
      } catch (error) {
        console.error('[AssignmentStatusService] Failed to send notification:', error);
        // Fallback to Alert.alert on error
        Alert.alert('Assignment Status Update', message);
      }
    }

    // Urgency alerts
    if (this.notificationConfig.urgencyAlerts && (urgency === 'critical' || urgency === 'warning')) {
      const urgencyMessage = this.getUrgencyMessage(urgency, courtNumber, status);

      try {
        const notificationService = NotificationService.getInstance();
        const preferencesService = NotificationPreferencesService.getInstance();
        const preferences = await preferencesService.getPreferences(this.refereeId);

        if (preferences.enabled) {
          await notificationService.sendNotification(
            {
              type: NotificationType.STATUS_CHANGE,
              title: urgency === 'critical' ? '🚨 Critical Alert' : '⚠️ Warning',
              body: urgencyMessage,
              data: {
                assignmentId: updatedState.id,
                urgency,
                courtNumber,
                deepLink: 'beachref://referee-dashboard'
              },
              priority: 'high',
              sound: preferences.sound ? 'default' : undefined,
              vibrate: preferences.vibration
            },
            true
          );
        }
      } catch (error) {
        console.error('[AssignmentStatusService] Failed to send urgency alert:', error);
        Alert.alert(
          urgency === 'critical' ? '🚨 Critical Alert' : '⚠️ Warning',
          urgencyMessage,
          [{ text: 'OK', style: urgency === 'critical' ? 'destructive' : 'default' }]
        );
      }

      // Vibration feedback for urgency alerts
      if (this.notificationConfig.vibration) {
        if (urgency === 'critical') {
          Vibration.vibrate([100, 200, 100, 200, 100]); // Long pattern for critical
        } else {
          Vibration.vibrate([100, 100, 100]); // Short pattern for warning
        }
      }
    }

    // Emergency status special handling
    if (status === 'emergency') {
      try {
        const notificationService = NotificationService.getInstance();
        const preferencesService = NotificationPreferencesService.getInstance();
        const preferences = await preferencesService.getPreferences(this.refereeId);

        if (preferences.enabled) {
          await notificationService.sendNotification(
            {
              type: NotificationType.EMERGENCY,
              title: '🚨 EMERGENCY ASSIGNMENT',
              body: `Urgent assignment change for Court ${courtNumber}. Please check your assignments immediately.`,
              data: {
                assignmentId: updatedState.id,
                courtNumber,
                deepLink: 'beachref://referee-dashboard'
              },
              priority: 'high',
              sound: preferences.sound ? 'default' : undefined,
              vibrate: preferences.vibration
            },
            true
          );
        }
      } catch (error) {
        console.error('[AssignmentStatusService] Failed to send emergency notification:', error);
        Alert.alert(
          '🚨 EMERGENCY ASSIGNMENT',
          `Urgent assignment change for Court ${courtNumber}. Please check your assignments immediately.`,
          [{ text: 'View Assignments', style: 'destructive' }]
        );
      }

      if (this.notificationConfig.vibration) {
        Vibration.vibrate([200, 100, 200, 100, 200, 100, 200]);
      }
    }
  }

  /**
   * Generate status change message
   */
  private getStatusChangeMessage(status: AssignmentStatus, courtNumber: string, teams: string[]): string {
    const teamsText = teams.length > 0 ? ` (${teams.join(' vs ')})` : '';
    
    switch (status) {
      case 'current':
        return `Your assignment for Court ${courtNumber}${teamsText} is now active.`;
      case 'upcoming':
        return `You have an upcoming assignment for Court ${courtNumber}${teamsText}.`;
      case 'completed':
        return `Your assignment for Court ${courtNumber}${teamsText} has been completed.`;
      case 'cancelled':
        return `Your assignment for Court ${courtNumber}${teamsText} has been cancelled.`;
      case 'emergency':
        return `URGENT: Emergency assignment change for Court ${courtNumber}${teamsText}.`;
      default:
        return `Assignment status updated for Court ${courtNumber}${teamsText}.`;
    }
  }

  /**
   * Generate urgency message
   */
  private getUrgencyMessage(urgency: 'warning' | 'critical', courtNumber: string, status: AssignmentStatus): string {
    const statusText = status === 'current' ? 'active' : status;
    
    if (urgency === 'critical') {
      return `Your ${statusText} assignment for Court ${courtNumber} requires immediate attention. Match starts in 5 minutes or less.`;
    } else {
      return `Your ${statusText} assignment for Court ${courtNumber} is approaching. Match starts within 15 minutes.`;
    }
  }

  /**
   * Update notification configuration
   */
  public async updateNotificationConfig(config: Partial<NotificationConfig>): Promise<void> {
    this.notificationConfig = { ...this.notificationConfig, ...config };
    await this.persistToStorage();
  }

  /**
   * Get current notification configuration
   */
  public getNotificationConfig(): NotificationConfig {
    return { ...this.notificationConfig };
  }

  /**
   * Get status history for assignment
   */
  public getStatusHistory(assignmentId?: string): StatusHistoryEntry[] {
    if (assignmentId) {
      return this.statusHistory.filter(entry => entry.assignmentId === assignmentId);
    }
    return [...this.statusHistory];
  }

  /**
   * Get recent status changes (last 24 hours)
   */
  public getRecentStatusChanges(): StatusHistoryEntry[] {
    const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    return this.statusHistory.filter(entry => entry.timestamp >= dayAgo);
  }

  /**
   * Trigger manual sync of offline changes
   */
  public async triggerManualSync(): Promise<boolean> {
    if (!this.isOnline) {
      if (this.notificationConfig.offlineSync) {
        Alert.alert('Sync Failed', 'Cannot sync while offline. Please check your internet connection.');
      }
      return false;
    }

    if (this.syncQueue.length === 0) {
      if (this.notificationConfig.offlineSync) {
        Alert.alert('Sync Complete', 'All assignment statuses are already synchronized.');
      }
      return true;
    }

    await this.syncOfflineChanges();
    
    if (this.notificationConfig.offlineSync) {
      Alert.alert('Sync Complete', `Successfully synchronized ${this.syncQueue.length} status changes.`);
    }

    return true;
  }

  /**
   * Subscribe to sync completion events
   */
  public subscribeToSyncEvents(callback: (event: { syncedCount: number }) => void): () => void {
    this.on('syncCompleted', callback);
    return () => this.off('syncCompleted', callback);
  }

  /**
   * Clear all status data (for testing/reset)
   */
  public async clearAllStatuses(): Promise<void> {
    this.statusStates.clear();
    this.statusHistory = [];
    this.syncQueue = [];
    await AsyncStorage.removeItem(this.persistenceKey);
    await AsyncStorage.removeItem(this.historyKey);
    this.emit('statusesCleared');
  }
}

export default AssignmentStatusManager;