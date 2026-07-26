import { NetworkStateManager } from './NetworkStateManager';
import { AppStateManager, AppLifecycleState } from './AppStateManager';
import { RealtimePerformanceMonitor } from './RealtimePerformanceMonitor';
import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Device capability profile
 */
export interface DeviceProfile {
  memoryCapacity: 'low' | 'medium' | 'high';
  processingPower: 'low' | 'medium' | 'high';
  batteryCapacity: 'low' | 'medium' | 'high';
  networkCapability: 'basic' | 'standard' | 'advanced';
  thermalThrottling: boolean;
  backgroundRefreshEnabled: boolean;
}

/**
 * Resource usage metrics
 */
export interface ResourceMetrics {
  memoryUsage: {
    current: number; // MB
    peak: number;
    available: number;
    pressure: 'low' | 'medium' | 'high' | 'critical';
  };
  batteryUsage: {
    level: number; // 0-100
    isCharging: boolean;
    estimatedTimeRemaining: number; // minutes
    drainRate: number; // %/hour
    connectionImpact: number; // % additional drain from connections
  };
  cpuUsage: {
    average: number; // 0-100
    peak: number;
    connectionThreads: number;
    thermalState: 'normal' | 'warm' | 'hot' | 'throttled';
  };
  networkUsage: {
    bytesReceived: number;
    bytesSent: number;
    connectionsActive: number;
    dataEfficiency: number; // 0-100 score
  };
}

/**
 * Optimization recommendations
 */
export interface OptimizationRecommendation {
  type: 'memory' | 'battery' | 'network' | 'performance';
  priority: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  description: string;
  impact: string;
  autoApplicable: boolean;
  estimatedBenefit: string;
  actions: string[];
}

/**
 * Resource optimization configuration
 */
export interface OptimizationConfig {
  enableMemoryOptimization: boolean;
  enableBatteryOptimization: boolean;
  enableNetworkOptimization: boolean;
  enableThermalProtection: boolean;
  aggressiveOptimization: boolean;
  lowBatteryThreshold: number; // %
  memoryPressureThreshold: number; // MB
  backgroundOptimizationDelay: number; // seconds
}

/**
 * Advanced Resource Optimization Manager
 * Handles memory, battery, and performance optimization for connection management
 */
export class ResourceOptimizationManager {
  private static instance: ResourceOptimizationManager | null = null;
  
  private networkStateManager: NetworkStateManager;
  private appStateManager: AppStateManager;
  private performanceMonitor: RealtimePerformanceMonitor;
  
  private currentMetrics: ResourceMetrics | null = null;
  private deviceProfile: DeviceProfile | null = null;
  private optimizationConfig: OptimizationConfig;
  
  private metricsUpdateTimer: TimerHandle | null = null;
  private optimizationTimer: TimerHandle | null = null;
  
  private memoryPressureListeners = new Set<() => void>();
  private batteryOptimizationListeners = new Set<(enabled: boolean) => void>();
  
  private isOptimizing = false;
  private lastOptimizationTime = 0;

  private readonly DEFAULT_CONFIG: OptimizationConfig = {
    enableMemoryOptimization: true,
    enableBatteryOptimization: true,
    enableNetworkOptimization: true,
    enableThermalProtection: true,
    aggressiveOptimization: false,
    lowBatteryThreshold: 20,
    memoryPressureThreshold: 100, // MB
    backgroundOptimizationDelay: 30, // seconds
  };

  private constructor() {
    this.networkStateManager = NetworkStateManager.getInstance();
    this.appStateManager = AppStateManager.getInstance();
    this.performanceMonitor = RealtimePerformanceMonitor.getInstance();
    
    this.optimizationConfig = { ...this.DEFAULT_CONFIG };
    
    this.initialize();
  }

  /**
   * Get singleton instance
   */
  static getInstance(): ResourceOptimizationManager {
    if (!this.instance) {
      this.instance = new ResourceOptimizationManager();
    }
    return this.instance;
  }

  /**
   * Initialize resource optimization
   */
  private async initialize(): Promise<void> {

    try {
      // Load saved configuration
      await this.loadConfiguration();
      
      // Assess device capabilities
      await this.assessDeviceCapabilities();
      
      // Start monitoring
      this.startResourceMonitoring();
      
      // Set up app state listeners
      this.appStateManager.addStateChangeListener((event) => {
        this.handleAppStateChange(event.currentState);
      });

    } catch (error) {
      // console.error('Failed to initialize ResourceOptimizationManager:', error);
    }
  }

  /**
   * Assess device capabilities
   */
  async assessDeviceCapabilities(): Promise<DeviceProfile> {

    // In a real implementation, this would use device-specific APIs
    // For now, we'll make reasonable estimates
    
    const profile: DeviceProfile = {
      memoryCapacity: 'medium', // Would check available RAM
      processingPower: 'medium', // Would check CPU specs
      batteryCapacity: 'medium', // Would check battery info
      networkCapability: 'standard', // Based on connection types supported
      thermalThrottling: false, // Would check thermal state
      backgroundRefreshEnabled: true, // Would check settings
    };

    // Adjust based on current network state
    const networkState = this.networkStateManager.getCurrentNetworkState();
    if (networkState?.type === 'wifi') {
      profile.networkCapability = 'advanced';
    } else if (networkState?.type === 'cellular') {
      // Check cellular generation
      const generation = networkState.details?.cellularGeneration;
      if (generation === '5g') {
        profile.networkCapability = 'advanced';
      } else if (generation === '4g') {
        profile.networkCapability = 'standard';
      } else {
        profile.networkCapability = 'basic';
      }
    }

    this.deviceProfile = profile;
    
    return profile;
  }

  /**
   * Start resource monitoring
   */
  private startResourceMonitoring(): void {
    // Update metrics every 30 seconds
    this.metricsUpdateTimer = setInterval(() => {
      this.updateResourceMetrics();
    }, 30000);

    // Run optimization check every 60 seconds
    this.optimizationTimer = setInterval(() => {
      this.checkAndOptimize();
    }, 60000);

    // Initial metrics update
    this.updateResourceMetrics();
  }

  /**
   * Update resource metrics
   */
  private async updateResourceMetrics(): Promise<void> {
    try {
      // In a real implementation, these would use device-specific APIs
      const metrics: ResourceMetrics = {
        memoryUsage: {
          current: this.estimateMemoryUsage(),
          peak: this.estimateMemoryUsage() * 1.2,
          available: 1024, // Would check available memory
          pressure: this.assessMemoryPressure(),
        },
        batteryUsage: {
          level: 80, // Would get actual battery level
          isCharging: false, // Would check charging state
          estimatedTimeRemaining: 480, // Would calculate from current usage
          drainRate: 5, // Would calculate from historical data
          connectionImpact: this.calculateConnectionBatteryImpact(),
        },
        cpuUsage: {
          average: 15, // Would get actual CPU usage
          peak: 25,
          connectionThreads: 3, // Would count actual threads
          thermalState: 'normal', // Would check thermal state
        },
        networkUsage: {
          bytesReceived: 0, // Would track actual network usage
          bytesSent: 0,
          connectionsActive: this.getActiveConnectionCount(),
          dataEfficiency: this.calculateDataEfficiency(),
        },
      };

      this.currentMetrics = metrics;
      
      // Check for critical conditions
      this.checkCriticalConditions(metrics);

    } catch (error) {
      // console.error('Failed to update resource metrics:', error);
    }
  }

  /**
   * Estimate current memory usage
   */
  private estimateMemoryUsage(): number {
    // This would use actual memory monitoring APIs
    // For now, estimate based on connection count and app state
    const baseUsage = 50; // MB
    const connectionOverhead = this.getActiveConnectionCount() * 5; // MB per connection
    return baseUsage + connectionOverhead;
  }

  /**
   * Assess memory pressure
   */
  private assessMemoryPressure(): 'low' | 'medium' | 'high' | 'critical' {
    const currentUsage = this.estimateMemoryUsage();
    const threshold = this.optimizationConfig.memoryPressureThreshold;
    
    if (currentUsage > threshold * 2) return 'critical';
    if (currentUsage > threshold * 1.5) return 'high';
    if (currentUsage > threshold) return 'medium';
    return 'low';
  }

  /**
   * Calculate connection battery impact
   */
  private calculateConnectionBatteryImpact(): number {
    const activeConnections = this.getActiveConnectionCount();
    const networkState = this.networkStateManager.getCurrentNetworkState();
    
    // Base impact per connection
    let impactPerConnection = 1; // 1% per connection
    
    // Adjust based on network type
    if (networkState?.type === 'cellular') {
      impactPerConnection *= 2; // Cellular uses more battery
    }
    
    // Adjust based on connection quality
    const connectionQuality = this.networkStateManager.getCurrentConnectionQuality();
    if (connectionQuality && connectionQuality.score < 50) {
      impactPerConnection *= 1.5; // Poor connections use more battery due to retries
    }
    
    return Math.min(20, activeConnections * impactPerConnection); // Cap at 20%
  }

  /**
   * Calculate data efficiency
   */
  private calculateDataEfficiency(): number {
    // This would calculate actual data efficiency based on useful data vs overhead
    // For now, estimate based on connection strategy
    const networkState = this.networkStateManager.getCurrentNetworkState();
    const connectionQuality = this.networkStateManager.getCurrentConnectionQuality();
    
    if (!networkState || !connectionQuality) return 50;
    
    let efficiency = 70; // Base efficiency
    
    // Adjust based on connection strategy
    if (connectionQuality.recommendation === 'AGGRESSIVE_WEBSOCKET') {
      efficiency = 85;
    } else if (connectionQuality.recommendation === 'POLLING_ONLY') {
      efficiency = 60;
    }
    
    return efficiency;
  }

  /**
   * Get active connection count
   */
  private getActiveConnectionCount(): number {
    // This would count actual active connections
    const lifecycleStats = this.appStateManager.getLifecycleStats();
    return lifecycleStats.suspendedConnections + lifecycleStats.criticalConnections;
  }

  /**
   * Check for critical resource conditions
   */
  private checkCriticalConditions(metrics: ResourceMetrics): void {
    // Memory pressure
    if (metrics.memoryUsage.pressure === 'critical') {
      // console.warn('Critical memory pressure detected');
      this.handleMemoryPressure();
    }

    // Low battery
    if (metrics.batteryUsage.level < this.optimizationConfig.lowBatteryThreshold && !metrics.batteryUsage.isCharging) {
      // console.warn('Low battery detected, enabling aggressive optimization');
      this.handleLowBattery();
    }

    // Thermal throttling
    if (metrics.cpuUsage.thermalState === 'throttled') {
      // console.warn('Thermal throttling detected');
      this.handleThermalThrottling();
    }
  }

  /**
   * Handle memory pressure
   */
  private handleMemoryPressure(): void {
    if (!this.optimizationConfig.enableMemoryOptimization) return;

    
    // Notify listeners
    this.memoryPressureListeners.forEach(listener => {
      try {
        listener();
      } catch (error) {
        // console.error('Error in memory pressure listener:', error);
      }
    });

    // Optimize memory usage
    this.optimizeMemoryUsage();
  }

  /**
   * Handle low battery
   */
  private handleLowBattery(): void {
    if (!this.optimizationConfig.enableBatteryOptimization) return;

    
    // Enable aggressive optimization temporarily
    const wasAggressive = this.optimizationConfig.aggressiveOptimization;
    this.optimizationConfig.aggressiveOptimization = true;
    
    // Notify listeners
    this.batteryOptimizationListeners.forEach(listener => {
      try {
        listener(true);
      } catch (error) {
        // console.error('Error in battery optimization listener:', error);
      }
    });

    // Optimize battery usage
    this.optimizeBatteryUsage();

    // Restore previous setting after 5 minutes
    setTimeout(() => {
      this.optimizationConfig.aggressiveOptimization = wasAggressive;
      this.batteryOptimizationListeners.forEach(listener => {
        try {
          listener(false);
        } catch (error) {
          // console.error('Error in battery optimization listener:', error);
        }
      });
    }, 300000);
  }

  /**
   * Handle thermal throttling
   */
  private handleThermalThrottling(): void {
    if (!this.optimizationConfig.enableThermalProtection) return;

    
    // Reduce connection frequency
    // Suspend non-critical connections
    // Disable intensive features
  }

  /**
   * Check and optimize resources automatically
   */
  private async checkAndOptimize(): Promise<void> {
    if (this.isOptimizing || Date.now() - this.lastOptimizationTime < 60000) {
      return; // Skip if already optimizing or optimized recently
    }

    const recommendations = await this.getOptimizationRecommendations();
    const criticalRecommendations = recommendations.filter(r => r.priority === 'critical');
    const autoApplicable = recommendations.filter(r => r.autoApplicable);

    // Apply critical and auto-applicable optimizations
    if (criticalRecommendations.length > 0 || autoApplicable.length > 2) {
      await this.applyAutomaticOptimizations(recommendations);
    }
  }

  /**
   * Handle app state changes
   */
  private handleAppStateChange(newState: AppLifecycleState): void {
    if (newState === AppLifecycleState.BACKGROUND_ACTIVE) {
      // Start background optimization after delay
      setTimeout(() => {
        this.optimizeForBackground();
      }, this.optimizationConfig.backgroundOptimizationDelay * 1000);
    } else if (newState === AppLifecycleState.FOREGROUND_ACTIVE) {
      // Restore foreground optimizations
      this.optimizeForForeground();
    }
  }

  /**
   * Optimize memory usage
   */
  private optimizeMemoryUsage(): void {
    
    // This would typically:
    // 1. Clear unused caches
    // 2. Consolidate connection pools
    // 3. Reduce buffer sizes
    // 4. Suspend non-critical services
  }

  /**
   * Optimize battery usage
   */
  private optimizeBatteryUsage(): void {
    
    // This would typically:
    // 1. Reduce connection frequency
    // 2. Increase polling intervals
    // 3. Disable non-essential features
    // 4. Use more conservative connection strategies
  }

  /**
   * Optimize connection pooling
   */
  optimizeConnectionPooling(): void {
    
    const metrics = this.currentMetrics;
    if (!metrics) return;

    // Consolidate connections based on resource usage
    if (metrics.memoryUsage.pressure === 'high' || metrics.memoryUsage.pressure === 'critical') {
      // Reduce connection pool size
      // Reuse connections more aggressively
    }
  }

  /**
   * Optimize for background usage
   */
  private optimizeForBackground(): void {
    
    if (this.optimizationConfig.aggressiveOptimization) {
      // Aggressive background optimization
      this.optimizeMemoryUsage();
      this.optimizeBatteryUsage();
      this.optimizeConnectionPooling();
    }
  }

  /**
   * Optimize for foreground usage
   */
  private optimizeForForeground(): void {
    
    // Restore normal operation parameters
    // Re-enable suspended features
    // Increase connection frequencies if needed
  }

  /**
   * Get optimization recommendations
   */
  async getOptimizationRecommendations(): Promise<OptimizationRecommendation[]> {
    const recommendations: OptimizationRecommendation[] = [];
    const metrics = this.currentMetrics;
    const profile = this.deviceProfile;

    if (!metrics || !profile) return recommendations;

    // Memory recommendations
    if (metrics.memoryUsage.pressure === 'high' || metrics.memoryUsage.pressure === 'critical') {
      recommendations.push({
        type: 'memory',
        priority: metrics.memoryUsage.pressure === 'critical' ? 'critical' : 'high',
        title: 'High Memory Usage Detected',
        description: `Current memory usage: ${metrics.memoryUsage.current}MB`,
        impact: 'May cause app crashes or performance issues',
        autoApplicable: true,
        estimatedBenefit: '20-30% memory reduction',
        actions: ['Clear unused caches', 'Consolidate connections', 'Suspend non-critical services'],
      });
    }

    // Battery recommendations
    if (metrics.batteryUsage.level < this.optimizationConfig.lowBatteryThreshold) {
      recommendations.push({
        type: 'battery',
        priority: metrics.batteryUsage.level < 10 ? 'critical' : 'high',
        title: 'Low Battery Level',
        description: `Battery level: ${metrics.batteryUsage.level}%`,
        impact: 'Device may shut down soon',
        autoApplicable: true,
        estimatedBenefit: '30-50% battery life extension',
        actions: ['Reduce connection frequency', 'Enable battery saver mode', 'Disable non-essential features'],
      });
    }

    // Network recommendations
    if (metrics.networkUsage.dataEfficiency < 60) {
      recommendations.push({
        type: 'network',
        priority: 'medium',
        title: 'Poor Data Efficiency',
        description: `Data efficiency: ${metrics.networkUsage.dataEfficiency}%`,
        impact: 'Increased data usage and costs',
        autoApplicable: true,
        estimatedBenefit: '15-25% data usage reduction',
        actions: ['Optimize polling frequencies', 'Compress data transfers', 'Cache more aggressively'],
      });
    }

    // Thermal recommendations
    if (metrics.cpuUsage.thermalState === 'hot' || metrics.cpuUsage.thermalState === 'throttled') {
      recommendations.push({
        type: 'performance',
        priority: metrics.cpuUsage.thermalState === 'throttled' ? 'high' : 'medium',
        title: 'Device Overheating',
        description: `Thermal state: ${metrics.cpuUsage.thermalState}`,
        impact: 'Reduced performance and potential damage',
        autoApplicable: true,
        estimatedBenefit: 'Prevent thermal throttling',
        actions: ['Reduce CPU intensive operations', 'Lower connection frequencies', 'Pause non-critical tasks'],
      });
    }

    return recommendations;
  }

  /**
   * Apply automatic optimizations
   */
  private async applyAutomaticOptimizations(recommendations: OptimizationRecommendation[]): Promise<void> {
    this.isOptimizing = true;

    try {
      const autoApplicable = recommendations.filter(r => r.autoApplicable);
      
      for (const recommendation of autoApplicable) {
        switch (recommendation.type) {
          case 'memory':
            this.optimizeMemoryUsage();
            break;
          case 'battery':
            this.optimizeBatteryUsage();
            break;
          case 'network':
            this.optimizeConnectionPooling();
            break;
          case 'performance':
            this.handleThermalThrottling();
            break;
        }
      }

      this.lastOptimizationTime = Date.now();

    } catch (error) {
      // console.error('Failed to apply automatic optimizations:', error);
    } finally {
      this.isOptimizing = false;
    }
  }

  /**
   * Load configuration from storage
   */
  private async loadConfiguration(): Promise<void> {
    try {
      const savedConfig = await AsyncStorage.getItem('resource_optimization_config');
      if (savedConfig) {
        const config = JSON.parse(savedConfig);
        this.optimizationConfig = { ...this.DEFAULT_CONFIG, ...config };
      }
    } catch (error) {
      // console.error('Failed to load configuration:', error);
    }
  }

  /**
   * Save configuration to storage
   */
  private async saveConfiguration(): Promise<void> {
    try {
      await AsyncStorage.setItem('resource_optimization_config', JSON.stringify(this.optimizationConfig));
    } catch (error) {
      // console.error('Failed to save configuration:', error);
    }
  }

  /**
   * Public API methods
   */

  /**
   * Get current resource metrics
   */
  getCurrentMetrics(): ResourceMetrics | null {
    return this.currentMetrics;
  }

  /**
   * Get device profile
   */
  getDeviceProfile(): DeviceProfile | null {
    return this.deviceProfile;
  }

  /**
   * Update optimization configuration
   */
  async updateConfiguration(config: Partial<OptimizationConfig>): Promise<void> {
    this.optimizationConfig = { ...this.optimizationConfig, ...config };
    await this.saveConfiguration();
  }

  /**
   * Add memory pressure listener
   */
  addMemoryPressureListener(listener: () => void): () => void {
    this.memoryPressureListeners.add(listener);
    return () => this.memoryPressureListeners.delete(listener);
  }

  /**
   * Add battery optimization listener
   */
  addBatteryOptimizationListener(listener: (enabled: boolean) => void): () => void {
    this.batteryOptimizationListeners.add(listener);
    return () => this.batteryOptimizationListeners.delete(listener);
  }

  /**
   * Manually trigger optimization
   */
  async triggerOptimization(): Promise<void> {
    const recommendations = await this.getOptimizationRecommendations();
    await this.applyAutomaticOptimizations(recommendations);
  }

  /**
   * Get resource usage report
   */
  getResourceReport(): {
    metrics: ResourceMetrics | null;
    profile: DeviceProfile | null;
    recommendations: Promise<OptimizationRecommendation[]>;
    lastOptimization: number;
    isOptimizing: boolean;
  } {
    return {
      metrics: this.currentMetrics,
      profile: this.deviceProfile,
      recommendations: this.getOptimizationRecommendations(),
      lastOptimization: this.lastOptimizationTime,
      isOptimizing: this.isOptimizing,
    };
  }

  /**
   * Cleanup resources
   */
  cleanup(): void {
    if (this.metricsUpdateTimer) {
      clearInterval(this.metricsUpdateTimer);
      this.metricsUpdateTimer = null;
    }

    if (this.optimizationTimer) {
      clearInterval(this.optimizationTimer);
      this.optimizationTimer = null;
    }

    this.memoryPressureListeners.clear();
    this.batteryOptimizationListeners.clear();
    
    this.currentMetrics = null;
    this.deviceProfile = null;
    this.isOptimizing = false;
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

export default ResourceOptimizationManager;