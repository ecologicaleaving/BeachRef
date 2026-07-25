import NetInfo, { NetInfoState } from '@react-native-community/netinfo';
// Connection circuit breaker types are imported when needed

/**
 * Network state information
 */
export interface NetworkState {
  isConnected: boolean;
  type: 'wifi' | 'cellular' | 'ethernet' | 'unknown';
  isInternetReachable: boolean | null;
  details: {
    strength?: number;
    cellularGeneration?: '2g' | '3g' | '4g' | '5g';
    carrier?: string;
    ssid?: string;
    bssid?: string;
    subnet?: string;
    ipAddress?: string;
  };
}

/**
 * Connection quality assessment
 */
export interface ConnectionQuality {
  score: number; // 0-100
  level: 'excellent' | 'good' | 'fair' | 'poor' | 'offline';
  latency: number;
  stability: number;
  throughput: number;
  recommendation: ConnectionStrategy;
}

/**
 * Connection strategy types
 */
export enum ConnectionStrategy {
  AGGRESSIVE_WEBSOCKET = 'AGGRESSIVE_WEBSOCKET',   // Fast, reliable connections
  CONSERVATIVE_WEBSOCKET = 'CONSERVATIVE_WEBSOCKET', // Slower/cellular connections
  HYBRID_MODE = 'HYBRID_MODE',                     // Mixed WebSocket/polling
  POLLING_ONLY = 'POLLING_ONLY',                   // Fallback to polling
  OFFLINE_MODE = 'OFFLINE_MODE'                    // No connection
}

/**
 * Network change listener type
 */
export type NetworkChangeListener = (state: NetworkState, quality: ConnectionQuality) => void;

/**
 * Network State Manager for connection management and quality assessment
 */
export class NetworkStateManager {
  private static instance: NetworkStateManager | null = null;
  private networkState: NetworkState | null = null;
  private connectionQuality: ConnectionQuality | null = null;
  private listeners = new Set<NetworkChangeListener>();
  private qualityHistory: number[] = [];
  private latencyHistory: number[] = [];
  private unsubscribeNetInfo: (() => void) | null = null;
  private qualityAssessmentTimer: NodeJS.Timeout | null = null;
  private deferredAssessmentTimer: ReturnType<typeof setTimeout> | null = null;
  private isInitialized = false;

  // Latency probe de-duplication (issue #36).
  // The probe used to run once per NetInfo state change AND once per interval
  // tick with no coalescing, so several concurrent requests to the site root
  // piled up on the critical path of the first render.
  private latencyProbeInFlight: Promise<number> | null = null;
  private lastLatencyProbeAt = 0;
  private lastLatencyValue: number | null = null;
  private static readonly LATENCY_PROBE_MIN_INTERVAL_MS = 15000;
  private static readonly FIRST_ASSESSMENT_DELAY_MS = 4000;

  // Connection quality thresholds
  private readonly QUALITY_THRESHOLDS = {
    EXCELLENT: 90,
    GOOD: 70,
    FAIR: 50,
    POOR: 20
  };

  // Latency thresholds (milliseconds)
  private readonly LATENCY_THRESHOLDS = {
    WIFI_EXCELLENT: 50,
    WIFI_GOOD: 150,
    CELLULAR_EXCELLENT: 100,
    CELLULAR_GOOD: 300
  };

  // Strategy configurations
  private readonly STRATEGY_CONFIG = {
    [ConnectionStrategy.AGGRESSIVE_WEBSOCKET]: {
      reconnectDelay: 1000,
      maxReconnectAttempts: 10,
      heartbeatInterval: 30000,
      timeoutMs: 5000
    },
    [ConnectionStrategy.CONSERVATIVE_WEBSOCKET]: {
      reconnectDelay: 3000,
      maxReconnectAttempts: 6,
      heartbeatInterval: 60000,
      timeoutMs: 10000
    },
    [ConnectionStrategy.HYBRID_MODE]: {
      reconnectDelay: 5000,
      maxReconnectAttempts: 4,
      heartbeatInterval: 90000,
      timeoutMs: 15000
    },
    [ConnectionStrategy.POLLING_ONLY]: {
      pollInterval: 10000,
      maxRetries: 3,
      timeoutMs: 8000
    }
  };

  private constructor() {
    // Initialize synchronously for better testability
    this.initializeNetworkMonitoring().catch(error => {
      // console.error('Failed to initialize NetworkStateManager:', error);
      this.setOfflineState();
    });
    this.startQualityAssessment();
  }

  /**
   * Get singleton instance
   */
  static getInstance(): NetworkStateManager {
    if (!this.instance) {
      this.instance = new NetworkStateManager();
    }
    return this.instance;
  }

  /**
   * Initialize network monitoring
   */
  private async initializeNetworkMonitoring(): Promise<void> {
    try {
      // Get initial network state
      const netInfoState = await NetInfo.fetch();
      this.updateNetworkState(netInfoState);

      // Subscribe to network changes
      this.unsubscribeNetInfo = NetInfo.addEventListener((state) => {
        this.updateNetworkState(state);
      });

      this.isInitialized = true;
    } catch {
      // console.error('Failed to initialize network monitoring:', _error);
      this.setOfflineState();
      this.isInitialized = true; // Still mark as initialized even on error
    }
  }

  /**
   * Update network state from NetInfo
   */
  private updateNetworkState(netInfoState: NetInfoState): void {
    const networkState: NetworkState = {
      isConnected: netInfoState.isConnected || false,
      type: this.mapNetworkType(netInfoState.type),
      isInternetReachable: netInfoState.isInternetReachable,
      details: {
        strength: netInfoState.details?.strength,
        cellularGeneration: netInfoState.details?.cellularGeneration as any,
        carrier: netInfoState.details?.carrier,
        ssid: (netInfoState.details as any)?.ssid,
        bssid: (netInfoState.details as any)?.bssid,
        subnet: (netInfoState.details as any)?.subnet,
        ipAddress: (netInfoState.details as any)?.ipAddress,
      }
    };

    this.networkState = networkState;

    // NOTE (issue #36): do NOT probe the network synchronously here. This ran on
    // every NetInfo state change during app boot and put a same-origin request
    // on the critical path before the first VIS API call. Quality is still
    // recomputed immediately (from the last real measurement or an estimate) so
    // consumers never observe a null/stale value; only the network probe itself
    // is deferred.
    this.assessConnectionQualitySync();
    this.scheduleQualityAssessment();
    this.notifyListeners();

    //   type: networkState.type,
    //   isConnected: networkState.isConnected,
    //   isInternetReachable: networkState.isInternetReachable
    // });
  }

  /**
   * Map NetInfo network type to our type
   */
  private mapNetworkType(netInfoType: string | null): 'wifi' | 'cellular' | 'ethernet' | 'unknown' {
    switch (netInfoType) {
      case 'wifi':
        return 'wifi';
      case 'cellular':
        return 'cellular';
      case 'ethernet':
        return 'ethernet';
      default:
        return 'unknown';
    }
  }

  /**
   * Set offline state when initialization fails
   */
  private setOfflineState(): void {
    this.networkState = {
      isConnected: false,
      type: 'unknown',
      isInternetReachable: false,
      details: {}
    };

    this.connectionQuality = {
      score: 0,
      level: 'offline',
      latency: 0,
      stability: 0,
      throughput: 0,
      recommendation: ConnectionStrategy.OFFLINE_MODE
    };

    this.notifyListeners();
  }

  /**
   * Start periodic connection quality assessment
   */
  private startQualityAssessment(): void {
    this.qualityAssessmentTimer = setInterval(() => {
      this.assessConnectionQuality();
    }, 30000); // Assess every 30 seconds
  }

  /**
   * Schedule a quality assessment off the critical rendering path (issue #36).
   *
   * Coalesces bursts of NetInfo events into a single deferred assessment and,
   * on web, waits for the browser to be idle so the probe never competes with
   * the first paint or with the first VIS API call.
   */
  private scheduleQualityAssessment(): void {
    if (this.deferredAssessmentTimer) return; // already scheduled

    this.deferredAssessmentTimer = setTimeout(() => {
      this.deferredAssessmentTimer = null;
      this.runWhenIdle(() => {
        this.assessConnectionQuality().then(() => this.notifyListeners());
      });
    }, NetworkStateManager.FIRST_ASSESSMENT_DELAY_MS);

    // Never keep a Node/Jest process alive just for a diagnostic probe.
    (this.deferredAssessmentTimer as any)?.unref?.();
  }

  /**
   * Run a callback when the browser is idle, falling back to a direct call on
   * platforms without `requestIdleCallback` (native, older Safari, jsdom).
   */
  private runWhenIdle(callback: () => void): void {
    const ric = (typeof globalThis !== 'undefined'
      ? (globalThis as any).requestIdleCallback
      : undefined) as undefined | ((cb: () => void, opts?: { timeout: number }) => void);

    if (typeof ric === 'function') {
      ric(callback, { timeout: 5000 });
    } else {
      callback();
    }
  }

  /**
   * Assess connection quality and recommend strategy
   */
  private async assessConnectionQuality(options: { force?: boolean } = {}): Promise<void> {
    if (!this.networkState?.isConnected) {
      this.connectionQuality = {
        score: 0,
        level: 'offline',
        latency: 0,
        stability: 0,
        throughput: 0,
        recommendation: ConnectionStrategy.OFFLINE_MODE
      };
      return;
    }

    try {
      // Measure latency with a quick HTTP request
      const latency = await this.measureLatency(options.force ? { force: true } : {});
      this.applyQualityMeasurement(latency);

      //   score: qualityScore,
      //   level: this.connectionQuality.level,
      //   strategy: this.connectionQuality.recommendation,
      //   latency,
      //   networkType: this.networkState.type
      // });

    } catch {
      // console.error('Failed to assess connection quality:', error);
      // Fallback quality assessment
      this.connectionQuality = {
        score: 30,
        level: 'poor',
        latency: 1000,
        stability: 50,
        throughput: 20,
        recommendation: ConnectionStrategy.POLLING_ONLY
      };
    }
  }

  /**
   * Assess connection quality WITHOUT touching the network (issue #36).
   *
   * Called synchronously on every NetInfo state change so `connectionQuality`
   * is never null or stale for consumers, while the actual latency probe is
   * deferred off the critical path. Uses the last real measurement when we
   * have one, otherwise a connection-type based estimate.
   */
  private assessConnectionQualitySync(): void {
    if (!this.networkState?.isConnected) {
      this.connectionQuality = {
        score: 0,
        level: 'offline',
        latency: 0,
        stability: 0,
        throughput: 0,
        recommendation: ConnectionStrategy.OFFLINE_MODE
      };
      return;
    }

    this.applyQualityMeasurement(
      this.lastLatencyValue ?? this.estimateLatencyFromType(),
      { recordHistory: false }
    );
  }

  /**
   * Turn a latency figure into the current quality snapshot.
   */
  private applyQualityMeasurement(
    latency: number,
    options: { recordHistory?: boolean } = {}
  ): void {
    if (!this.networkState) return;

    const { recordHistory = true } = options;
    const stability = this.calculateStability();
    const throughputScore = this.estimateThroughput();
    const qualityScore = this.calculateQualityScore(latency, stability, throughputScore);

    this.connectionQuality = {
      score: qualityScore,
      level: this.getQualityLevel(qualityScore),
      latency,
      stability,
      throughput: throughputScore,
      recommendation: this.recommendStrategy(qualityScore, this.networkState.type)
    };

    if (!recordHistory) return;

    // Update history for trend analysis — only for real measurements, so
    // estimates never pollute the stability trend.
    this.qualityHistory.push(qualityScore);
    this.latencyHistory.push(latency);

    // Keep only last 20 measurements
    if (this.qualityHistory.length > 20) {
      this.qualityHistory.shift();
      this.latencyHistory.shift();
    }
  }

  /**
   * Rough latency estimate used before the first real probe completes.
   */
  private estimateLatencyFromType(): number {
    switch (this.networkState?.type) {
      case 'ethernet':
        return 30;
      case 'wifi':
        return 60;
      case 'cellular':
        return 150;
      default:
        return 200;
    }
  }

  /**
   * Measure network latency
   */
  private async measureLatency(options: { force?: boolean } = {}): Promise<number> {
    // De-duplicate: reuse an in-flight probe instead of opening a second socket.
    if (this.latencyProbeInFlight) {
      return this.latencyProbeInFlight;
    }

    // Throttle: reuse the last measurement if it is still recent. Prevents the
    // "three concurrent requests to /" behaviour reported in issue #36.
    const age = Date.now() - this.lastLatencyProbeAt;
    if (
      !options.force &&
      this.lastLatencyValue !== null &&
      age < NetworkStateManager.LATENCY_PROBE_MIN_INTERVAL_MS
    ) {
      return this.lastLatencyValue;
    }

    this.latencyProbeInFlight = this.runLatencyProbe();
    try {
      const latency = await this.latencyProbeInFlight;
      this.lastLatencyProbeAt = Date.now();
      this.lastLatencyValue = latency;
      return latency;
    } finally {
      this.latencyProbeInFlight = null;
    }
  }

  private async runLatencyProbe(): Promise<number> {
    const startTime = Date.now();
    try {
      // NOTE (issue #36): on web this used to GET the site root, i.e. download
      // and let the browser parse the full prerendered HTML document (~4.5 s on
      // the measured trace). Probe a tiny static file with HEAD instead — it is
      // same-origin (no CORS), a few hundred bytes, and never triggers a parse.
      const testUrl = (typeof window !== 'undefined' && window.location?.origin)
        ? window.location.origin + '/favicon.ico'
        : 'https://httpbin.org/json';

      const isWebProbe = testUrl.endsWith('/favicon.ico');

      const response = await Promise.race([
        fetch(testUrl, {
          method: isWebProbe ? 'HEAD' : 'GET',
          cache: 'no-store',
        }),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('Timeout')), 5000)
        )
      ]);

      if ((response as any)?.ok) {
        return Date.now() - startTime;
      } else {
        return 2000; // Default high latency for failed requests
      }
    } catch {
      return 3000; // Default very high latency for errors
    }
  }

  /**
   * Calculate connection stability based on history
   */
  private calculateStability(): number {
    if (this.qualityHistory.length < 3) return 50; // Default stability

    const variance = this.calculateVariance(this.qualityHistory);
    const maxVariance = 1000; // Arbitrary max variance for normalization
    return Math.max(0, Math.min(100, 100 - (variance / maxVariance) * 100));
  }

  /**
   * Estimate throughput score based on network type and quality
   */
  private estimateThroughput(): number {
    if (!this.networkState) return 0;

    const baseScore = {
      'wifi': 80,
      'ethernet': 95,
      'cellular': 50,
      'unknown': 20
    }[this.networkState.type];

    // Adjust based on cellular generation
    if (this.networkState.type === 'cellular' && this.networkState.details.cellularGeneration) {
      const generationMultiplier = {
        '2g': 0.2,
        '3g': 0.5,
        '4g': 0.8,
        '5g': 1.2
      }[this.networkState.details.cellularGeneration] || 0.5;

      return Math.min(100, baseScore * generationMultiplier);
    }

    return baseScore;
  }

  /**
   * Calculate overall quality score
   */
  private calculateQualityScore(latency: number, stability: number, throughput: number): number {
    // Normalize latency to 0-100 scale (lower is better)
    const latencyScore = Math.max(0, Math.min(100, 100 - (latency / 1000) * 100));
    
    // Weighted average: latency (40%), stability (30%), throughput (30%)
    return Math.round(latencyScore * 0.4 + stability * 0.3 + throughput * 0.3);
  }

  /**
   * Get quality level from score
   */
  private getQualityLevel(score: number): 'excellent' | 'good' | 'fair' | 'poor' | 'offline' {
    if (score >= this.QUALITY_THRESHOLDS.EXCELLENT) return 'excellent';
    if (score >= this.QUALITY_THRESHOLDS.GOOD) return 'good';
    if (score >= this.QUALITY_THRESHOLDS.FAIR) return 'fair';
    if (score >= this.QUALITY_THRESHOLDS.POOR) return 'poor';
    return 'poor';
  }

  /**
   * Recommend connection strategy based on quality and network type
   */
  private recommendStrategy(qualityScore: number, networkType: string): ConnectionStrategy {
    if (qualityScore >= this.QUALITY_THRESHOLDS.EXCELLENT) {
      return ConnectionStrategy.AGGRESSIVE_WEBSOCKET;
    }

    if (qualityScore >= this.QUALITY_THRESHOLDS.GOOD) {
      return networkType === 'wifi' 
        ? ConnectionStrategy.AGGRESSIVE_WEBSOCKET 
        : ConnectionStrategy.CONSERVATIVE_WEBSOCKET;
    }

    if (qualityScore >= this.QUALITY_THRESHOLDS.FAIR) {
      return ConnectionStrategy.HYBRID_MODE;
    }

    return qualityScore > 0 ? ConnectionStrategy.POLLING_ONLY : ConnectionStrategy.OFFLINE_MODE;
  }

  /**
   * Calculate variance of an array
   */
  private calculateVariance(values: number[]): number {
    if (values.length < 2) return 0;

    const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
    const squaredDiffs = values.map(val => Math.pow(val - mean, 2));
    return squaredDiffs.reduce((sum, val) => sum + val, 0) / values.length;
  }

  /**
   * Get adaptive connection configuration based on current strategy
   */
  getAdaptiveConnectionConfig(strategy?: ConnectionStrategy) {
    const currentStrategy = strategy || this.connectionQuality?.recommendation || ConnectionStrategy.CONSERVATIVE_WEBSOCKET;
    return this.STRATEGY_CONFIG[currentStrategy];
  }

  /**
   * Get exponential backoff delay with jitter
   */
  getExponentialBackoffDelay(attempt: number, baseDelay: number = 1000, maxDelay: number = 30000): number {
    // Standard exponential backoff: delay = baseDelay * 2^attempt
    const exponentialDelay = Math.min(baseDelay * Math.pow(2, attempt), maxDelay);
    
    // Add jitter (±25% random variation) to avoid thundering herd
    const jitter = exponentialDelay * 0.25;
    const randomOffset = (Math.random() - 0.5) * 2 * jitter;
    
    return Math.max(1000, exponentialDelay + randomOffset); // Minimum 1 second delay
  }

  /**
   * Check if should use cellular-specific optimizations
   */
  shouldUseCellularOptimizations(): boolean {
    return this.networkState?.type === 'cellular' || 
           (this.connectionQuality?.score || 0) < this.QUALITY_THRESHOLDS.GOOD;
  }

  /**
   * Check if network quality supports aggressive reconnection
   */
  supportsAggressiveReconnection(): boolean {
    return (this.connectionQuality?.score || 0) >= this.QUALITY_THRESHOLDS.GOOD &&
           this.networkState?.type === 'wifi';
  }

  /**
   * Add network change listener
   */
  addNetworkChangeListener(listener: NetworkChangeListener): () => void {
    this.listeners.add(listener);
    
    // Immediately call with current state if available
    if (this.networkState && this.connectionQuality) {
      listener(this.networkState, this.connectionQuality);
    }

    return () => this.listeners.delete(listener);
  }

  /**
   * Notify all listeners of network state changes
   */
  private notifyListeners(): void {
    if (this.networkState && this.connectionQuality) {
      this.listeners.forEach(listener => {
        try {
          listener(this.networkState!, this.connectionQuality!);
        } catch {
          // console.error('Error in network state listener:', error);
        }
      });
    }
  }

  /**
   * Get current network state
   */
  getCurrentNetworkState(): NetworkState | null {
    return this.networkState;
  }

  /**
   * Get current connection quality
   */
  getCurrentConnectionQuality(): ConnectionQuality | null {
    return this.connectionQuality;
  }

  /**
   * Check if the network state manager is initialized
   */
  isReady(): boolean {
    return this.isInitialized;
  }

  /**
   * Wait for initialization to complete
   */
  async waitForInitialization(timeoutMs: number = 5000): Promise<void> {
    if (this.isInitialized) return;

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('NetworkStateManager initialization timeout'));
      }, timeoutMs);

      const checkInterval = setInterval(() => {
        if (this.isInitialized) {
          clearTimeout(timeout);
          clearInterval(checkInterval);
          resolve();
        }
      }, 100);
    });
  }

  /**
   * Force connection quality reassessment
   */
  async forceQualityReassessment(): Promise<void> {
    // Explicit caller intent — bypass the probe throttle (issue #36).
    await this.assessConnectionQuality({ force: true });
    this.notifyListeners();
  }

  /**
   * Get connection statistics
   */
  getConnectionStats(): {
    currentQuality: number;
    averageQuality: number;
    averageLatency: number;
    stabilityTrend: 'improving' | 'stable' | 'degrading';
  } {
    const currentQuality = this.connectionQuality?.score || 0;
    const averageQuality = this.qualityHistory.length > 0 
      ? this.qualityHistory.reduce((sum, q) => sum + q, 0) / this.qualityHistory.length 
      : 0;
    
    const averageLatency = this.latencyHistory.length > 0
      ? this.latencyHistory.reduce((sum, l) => sum + l, 0) / this.latencyHistory.length
      : 0;

    // Determine trend from last 5 measurements
    const recentHistory = this.qualityHistory.slice(-5);
    let stabilityTrend: 'improving' | 'stable' | 'degrading' = 'stable';
    
    if (recentHistory.length >= 3) {
      const firstHalf = recentHistory.slice(0, Math.floor(recentHistory.length / 2));
      const secondHalf = recentHistory.slice(Math.floor(recentHistory.length / 2));
      
      const firstAvg = firstHalf.reduce((sum, q) => sum + q, 0) / firstHalf.length;
      const secondAvg = secondHalf.reduce((sum, q) => sum + q, 0) / secondHalf.length;
      
      const difference = secondAvg - firstAvg;
      if (Math.abs(difference) > 10) { // Significant change threshold
        stabilityTrend = difference > 0 ? 'improving' : 'degrading';
      }
    }

    return {
      currentQuality,
      averageQuality,
      averageLatency,
      stabilityTrend
    };
  }

  /**
   * Cleanup resources
   */
  cleanup(): void {
    if (this.unsubscribeNetInfo) {
      this.unsubscribeNetInfo();
      this.unsubscribeNetInfo = null;
    }

    if (this.qualityAssessmentTimer) {
      clearInterval(this.qualityAssessmentTimer);
      this.qualityAssessmentTimer = null;
    }

    if (this.deferredAssessmentTimer) {
      clearTimeout(this.deferredAssessmentTimer);
      this.deferredAssessmentTimer = null;
    }

    this.listeners.clear();
    this.qualityHistory = [];
    this.latencyHistory = [];
    this.latencyProbeInFlight = null;
    this.lastLatencyProbeAt = 0;
    this.lastLatencyValue = null;

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

export default NetworkStateManager;
