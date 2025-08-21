/**
 * StatusUpdateService
 * Story 2.4: Professional Status Indicator System
 * 
 * Real-time status update service with WebSocket integration
 */

import { StatusType, StatusUpdate, StatusIndicatorContext } from '../types/status';
import { isValidStatusTransition } from '../utils/statusIndicators';

// Status update event types
export type StatusUpdateEventType = 
  | 'status_changed'
  | 'batch_update'
  | 'sync_complete'
  | 'connection_changed'
  | 'error';

export interface StatusUpdateEvent {
  type: StatusUpdateEventType;
  data: any;
  timestamp: Date;
}

// Real-time status update service
export class StatusUpdateService {
  private subscribers: Map<string, Set<(update: StatusUpdate) => void>> = new Map();
  private globalSubscribers: Set<(event: StatusUpdateEvent) => void> = new Set();
  private statusCache: Map<string, StatusType> = new Map();
  private websocket: WebSocket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectInterval = 1000;
  private isConnected = false;
  
  constructor(private websocketUrl?: string) {
    this.initializeWebSocket();
  }
  
  // Initialize WebSocket connection
  private initializeWebSocket(): void {
    if (!this.websocketUrl) return;
    
    try {
      this.websocket = new WebSocket(this.websocketUrl);
      
      this.websocket.onopen = () => {
        // console.log('StatusUpdateService: WebSocket connected');
        this.isConnected = true;
        this.reconnectAttempts = 0;
        this.notifyGlobalSubscribers({
          type: 'connection_changed',
          data: { connected: true },
          timestamp: new Date(),
        });
      };
      
      this.websocket.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          this.handleWebSocketMessage(data);
        } catch (error) {
          // console.error('StatusUpdateService: Failed to parse WebSocket message', error);
        }
      };
      
      this.websocket.onclose = () => {
        // console.log('StatusUpdateService: WebSocket disconnected');
        this.isConnected = false;
        this.notifyGlobalSubscribers({
          type: 'connection_changed',
          data: { connected: false },
          timestamp: new Date(),
        });
        this.handleReconnect();
      };
      
      this.websocket.onerror = (error) => {
        // console.error('StatusUpdateService: WebSocket error', error);
        this.notifyGlobalSubscribers({
          type: 'error',
          data: { error: 'WebSocket connection error' },
          timestamp: new Date(),
        });
      };
    } catch (error) {
      // console.error('StatusUpdateService: Failed to initialize WebSocket', error);
    }
  }
  
  // Handle WebSocket reconnection
  private handleReconnect(): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      // console.error('StatusUpdateService: Max reconnect attempts reached');
      return;
    }
    
    this.reconnectAttempts++;
    const delay = this.reconnectInterval * Math.pow(2, this.reconnectAttempts - 1);
    
    setTimeout(() => {
      // console.log(`StatusUpdateService: Reconnecting attempt ${this.reconnectAttempts}`);
      this.initializeWebSocket();
    }, delay);
  }
  
  // Handle incoming WebSocket messages
  private handleWebSocketMessage(data: any): void {
    switch (data.type) {
      case 'status_update':
        this.processStatusUpdate(data.payload);
        break;
      case 'batch_update':
        this.processBatchUpdate(data.payload);
        break;
      case 'sync_complete':
        this.handleSyncComplete(data.payload);
        break;
      default:
        // console.warn('StatusUpdateService: Unknown message type', data.type);
    }
  }
  
  // Process individual status update
  private processStatusUpdate(payload: {
    id: string;
    status: StatusType;
    previousStatus?: StatusType;
    metadata?: Record<string, any>;
  }): void {
    const { id, status, previousStatus, metadata } = payload;
    
    // Validate status transition if previous status is known
    if (previousStatus && !isValidStatusTransition(previousStatus, status)) {
      // console.warn(`StatusUpdateService: Invalid status transition from ${previousStatus} to ${status} for ${id}`);
      return;
    }
    
    // Update cache
    const currentStatus = this.statusCache.get(id);
    this.statusCache.set(id, status);
    
    // Create update object
    const update: StatusUpdate = {
      id,
      type: status,
      previousStatus: previousStatus || currentStatus,
      timestamp: new Date(),
      metadata,
    };
    
    // Notify subscribers
    this.notifySubscribers(id, update);
    this.notifyGlobalSubscribers({
      type: 'status_changed',
      data: update,
      timestamp: new Date(),
    });
  }
  
  // Process batch status updates
  private processBatchUpdate(payload: {
    updates: Array<{
      id: string;
      status: StatusType;
      previousStatus?: StatusType;
      metadata?: Record<string, any>;
    }>;
  }): void {
    const { updates } = payload;
    
    updates.forEach(update => {
      this.processStatusUpdate(update);
    });
    
    this.notifyGlobalSubscribers({
      type: 'batch_update',
      data: { count: updates.length },
      timestamp: new Date(),
    });
  }
  
  // Handle sync completion
  private handleSyncComplete(payload: any): void {
    this.notifyGlobalSubscribers({
      type: 'sync_complete',
      data: payload,
      timestamp: new Date(),
    });
  }
  
  // Notify specific subscribers
  private notifySubscribers(statusId: string, update: StatusUpdate): void {
    const subscribers = this.subscribers.get(statusId);
    if (subscribers) {
      subscribers.forEach(callback => {
        try {
          callback(update);
        } catch (error) {
          // console.error('StatusUpdateService: Error in subscriber callback', error);
        }
      });
    }
  }
  
  // Notify global subscribers
  private notifyGlobalSubscribers(event: StatusUpdateEvent): void {
    this.globalSubscribers.forEach(callback => {
      try {
        callback(event);
      } catch (error) {
        // console.error('StatusUpdateService: Error in global subscriber callback', error);
      }
    });
  }
  
  // Subscribe to status updates for a specific ID
  subscribeToUpdates(statusId: string, callback: (update: StatusUpdate) => void): () => void {
    if (!this.subscribers.has(statusId)) {
      this.subscribers.set(statusId, new Set());
    }
    
    const subscribers = this.subscribers.get(statusId)!;
    subscribers.add(callback);
    
    // Return unsubscribe function
    return () => {
      subscribers.delete(callback);
      if (subscribers.size === 0) {
        this.subscribers.delete(statusId);
      }
    };
  }
  
  // Subscribe to global status events
  subscribeToGlobalEvents(callback: (event: StatusUpdateEvent) => void): () => void {
    this.globalSubscribers.add(callback);
    
    return () => {
      this.globalSubscribers.delete(callback);
    };
  }
  
  // Update status manually (will sync to server if connected)
  updateStatus(statusId: string, newStatus: StatusType, metadata?: Record<string, any>): void {
    const previousStatus = this.statusCache.get(statusId);
    
    // Validate transition
    if (previousStatus && !isValidStatusTransition(previousStatus, newStatus)) {
      throw new Error(`Invalid status transition from ${previousStatus} to ${newStatus}`);
    }
    
    // Update local cache immediately
    this.statusCache.set(statusId, newStatus);
    
    // Create update object
    const update: StatusUpdate = {
      id: statusId,
      type: newStatus,
      previousStatus,
      timestamp: new Date(),
      metadata,
    };
    
    // Notify local subscribers immediately
    this.notifySubscribers(statusId, update);
    
    // Send to server if connected
    if (this.isConnected && this.websocket) {
      try {
        this.websocket.send(JSON.stringify({
          type: 'status_update',
          payload: {
            id: statusId,
            status: newStatus,
            previousStatus,
            metadata,
          },
        }));
      } catch (error) {
        // console.error('StatusUpdateService: Failed to send status update to server', error);
      }
    }
  }
  
  // Get current status for an ID
  getStatus(statusId: string): StatusType | null {
    return this.statusCache.get(statusId) || null;
  }
  
  // Get all cached statuses
  getAllStatuses(): Map<string, StatusType> {
    return new Map(this.statusCache);
  }
  
  // Clear cached status
  clearStatus(statusId: string): void {
    this.statusCache.delete(statusId);
  }
  
  // Clear all cached statuses
  clearAllStatuses(): void {
    this.statusCache.clear();
  }
  
  // Check if service is connected
  isServiceConnected(): boolean {
    return this.isConnected;
  }
  
  // Get connection status
  getConnectionInfo(): {
    connected: boolean;
    reconnectAttempts: number;
    subscriberCount: number;
    cachedStatusCount: number;
  } {
    return {
      connected: this.isConnected,
      reconnectAttempts: this.reconnectAttempts,
      subscriberCount: this.globalSubscribers.size,
      cachedStatusCount: this.statusCache.size,
    };
  }
  
  // Cleanup resources
  destroy(): void {
    if (this.websocket) {
      this.websocket.close();
      this.websocket = null;
    }
    
    this.subscribers.clear();
    this.globalSubscribers.clear();
    this.statusCache.clear();
    this.isConnected = false;
  }
}

// Create status indicator context implementation
export const createStatusIndicatorContext = (
  websocketUrl?: string
): StatusIndicatorContext => {
  const service = new StatusUpdateService(websocketUrl);
  
  return {
    subscribeToUpdates: (statusId: string, callback: (update: StatusUpdate) => void) => 
      service.subscribeToUpdates(statusId, callback),
    updateStatus: (statusId: string, newStatus: StatusType, metadata?: Record<string, any>) => 
      service.updateStatus(statusId, newStatus, metadata),
    getStatus: (statusId: string) => 
      service.getStatus(statusId),
  };
};

// Singleton instance for global use
let globalStatusUpdateService: StatusUpdateService | null = null;

export const getGlobalStatusUpdateService = (websocketUrl?: string): StatusUpdateService => {
  if (!globalStatusUpdateService) {
    globalStatusUpdateService = new StatusUpdateService(websocketUrl);
  }
  return globalStatusUpdateService;
};

export const destroyGlobalStatusUpdateService = (): void => {
  if (globalStatusUpdateService) {
    globalStatusUpdateService.destroy();
    globalStatusUpdateService = null;
  }
};