import NetInfo, { NetInfoState } from '@react-native-community/netinfo';

/**
 * Network connectivity monitoring service
 * Handles network state detection and notifications
 */
export class NetworkMonitor {
  private static instance: NetworkMonitor | null = null;
  private listeners: Array<(isConnected: boolean) => void> = [];
  private _isConnected: boolean = true;
  private unsubscribe: (() => void) | null = null;

  private constructor() {
    this.initialize();
  }

  /**
   * Get singleton instance
   */
  static getInstance(): NetworkMonitor {
    if (!NetworkMonitor.instance) {
      NetworkMonitor.instance = new NetworkMonitor();
    }
    return NetworkMonitor.instance;
  }

  /**
   * Initialize network monitoring
   */
  private async initialize(): Promise<void> {
    try {
      // Get initial network state
      const state = await NetInfo.fetch();
      this._isConnected = state.isConnected ?? true;

      // Subscribe to network state changes
      this.unsubscribe = NetInfo.addEventListener((state: NetInfoState) => {
        const wasConnected = this._isConnected;
        this._isConnected = state.isConnected ?? false;

        // Only notify if state changed
        if (wasConnected !== this._isConnected) {
          this.notifyListeners();
        }
      });

    } catch (error) {
      // console.error('Failed to initialize NetworkMonitor:', error);
      // Default to connected on error
      this._isConnected = true;
    }
  }

  /**
   * Get current connection status
   */
  get isConnected(): boolean {
    return this._isConnected;
  }

  /**
   * Get detailed network information
   */
  async getNetworkState(): Promise<{
    isConnected: boolean;
    type: string | null;
    isInternetReachable: boolean | null;
  }> {
    try {
      const state = await NetInfo.fetch();
      return {
        isConnected: state.isConnected ?? false,
        type: state.type || null,
        isInternetReachable: state.isInternetReachable
      };
    } catch (error) {
      // console.error('Failed to get network state:', error);
      return {
        isConnected: this._isConnected,
        type: null,
        isInternetReachable: null
      };
    }
  }

  /**
   * Add network status listener
   */
  addListener(callback: (isConnected: boolean) => void): () => void {
    this.listeners.push(callback);

    // Return unsubscribe function
    return () => {
      const index = this.listeners.indexOf(callback);
      if (index > -1) {
        this.listeners.splice(index, 1);
      }
    };
  }

  /**
   * Remove network status listener
   */
  removeListener(callback: (isConnected: boolean) => void): void {
    const index = this.listeners.indexOf(callback);
    if (index > -1) {
      this.listeners.splice(index, 1);
    }
  }

  /**
   * Notify all listeners of network status change
   */
  private notifyListeners(): void {
    this.listeners.forEach(callback => {
      try {
        callback(this._isConnected);
      } catch (error) {
        // console.error('Error in network status listener:', error);
      }
    });
  }

  /**
   * Wait for network connection to be established
   */
  async waitForConnection(timeoutMs: number = 10000): Promise<boolean> {
    if (this._isConnected) {
      return true;
    }

    return new Promise((resolve) => {
      const timeout = setTimeout(() => {
        this.removeListener(listener);
        resolve(false);
      }, timeoutMs);

      const listener = (isConnected: boolean) => {
        if (isConnected) {
          clearTimeout(timeout);
          this.removeListener(listener);
          resolve(true);
        }
      };

      this.addListener(listener);
    });
  }

  /**
   * Check if network is reachable (with timeout)
   */
  async checkReachability(timeoutMs: number = 5000): Promise<boolean> {
    try {
      const state = await Promise.race([
        NetInfo.fetch(),
        new Promise<NetInfoState>((_, reject) => 
          setTimeout(() => reject(new Error('Timeout')), timeoutMs)
        )
      ]);

      return state.isConnected && state.isInternetReachable !== false;
    } catch (error) {
      // console.warn('Network reachability check failed:', error);
      return this._isConnected;
    }
  }

  /**
   * Get network connection quality indicator
   */
  getConnectionQuality(): 'excellent' | 'good' | 'poor' | 'offline' {
    if (!this._isConnected) {
      return 'offline';
    }

    // For now, just return good when connected
    // Could be enhanced with actual connection speed testing
    return 'good';
  }

  /**
   * Cleanup and destroy the monitor
   */
  destroy(): void {
    if (this.unsubscribe) {
      this.unsubscribe();
      this.unsubscribe = null;
    }
    
    this.listeners = [];
    NetworkMonitor.instance = null;
  }
}