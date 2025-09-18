import { NetworkStateManager, NetworkState, ConnectionQuality, ConnectionStrategy } from './NetworkStateManager';
import { AppStateManager, AppLifecycleState } from './AppStateManager';
import { ConnectionCircuitBreaker, CircuitState } from './ConnectionCircuitBreaker';
import { RealtimeFallbackService } from './RealtimeFallbackService';
import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Connection health assessment results
 */
export interface ConnectionHealth {
  overall: 'excellent' | 'good' | 'fair' | 'poor' | 'critical';
  score: number; // 0-100
  issues: ConnectionIssue[];
  recommendations: string[];
  lastAssessment: number;
  diagnostics: {
    networkState: NetworkState | null;
    connectionQuality: ConnectionQuality | null;
    circuitBreakerState: CircuitState;
    appLifecycleState: AppLifecycleState;
    activeConnections: number;
    failureRate: number;
    averageLatency: number;
    stabilityTrend: 'improving' | 'stable' | 'degrading';
  };
}

/**
 * Connection issue types
 */
export interface ConnectionIssue {
  type: 'network' | 'performance' | 'stability' | 'configuration' | 'resource';
  severity: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  description: string;
  impact: string;
  resolution: string[];
  autoFixable: boolean;
}

/**
 * Diagnostic test result
 */
export interface DiagnosticTest {
  name: string;
  passed: boolean;
  duration: number;
  details: string;
  error?: string;
}

/**
 * Connection reset options
 */
export interface ConnectionResetOptions {
  resetCircuitBreaker?: boolean;
  clearCache?: boolean;
  resetFallbackService?: boolean;
  forceReconnect?: boolean;
  clearStoredState?: boolean;
}

/**
 * Connection Diagnostics Service
 * Provides comprehensive connection health assessment and recovery procedures
 */
export class ConnectionDiagnostics {
  private static instance: ConnectionDiagnostics | null = null;
  
  private networkStateManager: NetworkStateManager;
  private appStateManager: AppStateManager;
  
  private lastHealthAssessment: ConnectionHealth | null = null;
  private diagnosticHistory: ConnectionHealth[] = [];
  private isRunningDiagnostics = false;

  private readonly HEALTH_THRESHOLDS = {
    EXCELLENT: 90,
    GOOD: 75,
    FAIR: 50,
    POOR: 25
  };

  private constructor() {
    this.networkStateManager = NetworkStateManager.getInstance();
    this.appStateManager = AppStateManager.getInstance();
  }

  /**
   * Get singleton instance
   */
  static getInstance(): ConnectionDiagnostics {
    if (!this.instance) {
      this.instance = new ConnectionDiagnostics();
    }
    return this.instance;
  }

  /**
   * Assess overall connection health
   */
  async assessConnectionHealth(): Promise<ConnectionHealth> {
    this.isRunningDiagnostics = true;

    try {
      const networkState = this.networkStateManager.getCurrentNetworkState();
      const connectionQuality = this.networkStateManager.getCurrentConnectionQuality();
      const appLifecycleState = this.appStateManager.getCurrentState();
      const connectionStats = this.networkStateManager.getConnectionStats();
      const lifecycleStats = this.appStateManager.getLifecycleStats();

      // Run diagnostic tests
      const diagnosticTests = await this.runDiagnosticTests();
      
      // Identify issues
      const issues = this.identifyConnectionIssues(
        networkState,
        connectionQuality,
        connectionStats,
        lifecycleStats,
        diagnosticTests
      );

      // Calculate overall health score
      const score = this.calculateHealthScore(issues, connectionQuality, connectionStats);
      const overall = this.getHealthLevel(score);

      // Generate recommendations
      const recommendations = this.generateRecommendations(issues, networkState, connectionQuality);

      const health: ConnectionHealth = {
        overall,
        score,
        issues,
        recommendations,
        lastAssessment: Date.now(),
        diagnostics: {
          networkState,
          connectionQuality,
          circuitBreakerState: CircuitState.CLOSED, // Would get from actual circuit breaker
          appLifecycleState,
          activeConnections: lifecycleStats.suspendedConnections + lifecycleStats.criticalConnections,
          failureRate: this.calculateFailureRate(connectionStats),
          averageLatency: connectionStats.averageLatency,
          stabilityTrend: connectionStats.stabilityTrend,
        }
      };

      this.lastHealthAssessment = health;
      this.diagnosticHistory.push(health);

      // Keep only last 20 assessments
      if (this.diagnosticHistory.length > 20) {
        this.diagnosticHistory.shift();
      }

      //   overall: health.overall,
      //   score: health.score,
      //   issuesCount: health.issues.length
      // });

      return health;

    } catch (error) {
      // console.error('Failed to assess connection health:', error);
      
      // Return critical health status on error
      const criticalHealth: ConnectionHealth = {
        overall: 'critical',
        score: 0,
        issues: [{
          type: 'configuration',
          severity: 'critical',
          title: 'Diagnostic System Failure',
          description: 'Unable to assess connection health',
          impact: 'Cannot determine connection status or issues',
          resolution: ['Restart the application', 'Check system permissions'],
          autoFixable: false
        }],
        recommendations: ['Restart the application and try again'],
        lastAssessment: Date.now(),
        diagnostics: {
          networkState: null,
          connectionQuality: null,
          circuitBreakerState: CircuitState.OPEN,
          appLifecycleState: AppLifecycleState.FOREGROUND_ACTIVE,
          activeConnections: 0,
          failureRate: 100,
          averageLatency: 0,
          stabilityTrend: 'degrading',
        }
      };

      this.lastHealthAssessment = criticalHealth;
      return criticalHealth;

    } finally {
      this.isRunningDiagnostics = false;
    }
  }

  /**
   * Run comprehensive diagnostic tests
   */
  private async runDiagnosticTests(): Promise<DiagnosticTest[]> {
    const tests: DiagnosticTest[] = [];

    // Network connectivity test
    try {
      const startTime = Date.now();
      const response = await fetch('https://httpbin.org/json', { 
        method: 'GET',
        cache: 'no-cache',
        signal: AbortSignal.timeout(5000)
      });
      const duration = Date.now() - startTime;
      
      tests.push({
        name: 'Network Connectivity',
        passed: response.ok,
        duration,
        details: `Response time: ${duration}ms, Status: ${response.status}`,
      });
    } catch (error) {
      tests.push({
        name: 'Network Connectivity',
        passed: false,
        duration: 5000,
        details: 'Failed to establish connection',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }

    // Network state manager test
    try {
      const startTime = Date.now();
      await this.networkStateManager.forceQualityReassessment();
      const duration = Date.now() - startTime;
      const networkState = this.networkStateManager.getCurrentNetworkState();
      
      tests.push({
        name: 'Network State Manager',
        passed: !!networkState,
        duration,
        details: `Network type: ${networkState?.type || 'unknown'}`,
      });
    } catch (error) {
      tests.push({
        name: 'Network State Manager',
        passed: false,
        duration: 0,
        details: 'Failed to assess network state',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }

    // Storage access test
    try {
      const startTime = Date.now();
      const testKey = 'connection_diagnostic_test';
      const testValue = Date.now().toString();
      await AsyncStorage.setItem(testKey, testValue);
      const retrievedValue = await AsyncStorage.getItem(testKey);
      await AsyncStorage.removeItem(testKey);
      const duration = Date.now() - startTime;
      
      tests.push({
        name: 'Storage Access',
        passed: retrievedValue === testValue,
        duration,
        details: `Storage read/write successful`,
      });
    } catch (error) {
      tests.push({
        name: 'Storage Access',
        passed: false,
        duration: 0,
        details: 'Failed to access storage',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }

    return tests;
  }

  /**
   * Identify connection issues based on diagnostic data
   */
  private identifyConnectionIssues(
    networkState: NetworkState | null,
    connectionQuality: ConnectionQuality | null,
    connectionStats: any,
    lifecycleStats: any,
    diagnosticTests: DiagnosticTest[]
  ): ConnectionIssue[] {
    const issues: ConnectionIssue[] = [];

    // Network connectivity issues
    if (!networkState?.isConnected) {
      issues.push({
        type: 'network',
        severity: 'critical',
        title: 'No Network Connection',
        description: 'Device is not connected to any network',
        impact: 'All real-time features will be unavailable',
        resolution: [
          'Check Wi-Fi or cellular data settings',
          'Move to an area with better signal',
          'Restart network connection'
        ],
        autoFixable: false
      });
    }

    // Poor connection quality
    if (connectionQuality && connectionQuality.score < 30) {
      issues.push({
        type: 'performance',
        severity: connectionQuality.score < 15 ? 'critical' : 'high',
        title: 'Poor Connection Quality',
        description: `Connection quality score: ${connectionQuality.score}/100`,
        impact: 'Slow updates, frequent disconnections, poor user experience',
        resolution: [
          'Move closer to Wi-Fi router',
          'Switch to a different network',
          'Consider using offline mode'
        ],
        autoFixable: true
      });
    }

    // High latency issues
    if (connectionStats.averageLatency > 1000) {
      issues.push({
        type: 'performance',
        severity: connectionStats.averageLatency > 3000 ? 'high' : 'medium',
        title: 'High Network Latency',
        description: `Average latency: ${Math.round(connectionStats.averageLatency)}ms`,
        impact: 'Delayed updates, poor real-time experience',
        resolution: [
          'Switch to Wi-Fi if using cellular',
          'Close bandwidth-heavy apps',
          'Contact network provider if persistent'
        ],
        autoFixable: false
      });
    }

    // Stability issues
    if (connectionStats.stabilityTrend === 'degrading') {
      issues.push({
        type: 'stability',
        severity: 'medium',
        title: 'Connection Stability Degrading',
        description: 'Network connection becoming less stable over time',
        impact: 'Increased reconnection attempts, inconsistent service',
        resolution: [
          'Check for network interference',
          'Restart router/modem',
          'Update network drivers'
        ],
        autoFixable: false
      });
    }

    // Failed diagnostic tests
    const failedTests = diagnosticTests.filter(test => !test.passed);
    if (failedTests.length > 0) {
      issues.push({
        type: 'configuration',
        severity: failedTests.some(test => test.name === 'Network Connectivity') ? 'critical' : 'medium',
        title: 'Diagnostic Tests Failed',
        description: `${failedTests.length} of ${diagnosticTests.length} tests failed`,
        impact: 'Some features may not work correctly',
        resolution: [
          'Check network permissions',
          'Restart the application',
          'Clear application cache'
        ],
        autoFixable: true
      });
    }

    // Battery optimization warnings
    if (networkState?.type === 'cellular' && lifecycleStats.backgroundTime && lifecycleStats.backgroundTime > 300000) {
      issues.push({
        type: 'resource',
        severity: 'low',
        title: 'Extended Background Usage on Cellular',
        description: 'App has been in background for extended time on cellular network',
        impact: 'Increased battery and data usage',
        resolution: [
          'Consider switching to Wi-Fi',
          'Enable battery optimization',
          'Limit background refresh'
        ],
        autoFixable: true
      });
    }

    return issues;
  }

  /**
   * Calculate overall health score
   */
  private calculateHealthScore(
    issues: ConnectionIssue[],
    connectionQuality: ConnectionQuality | null,
    connectionStats: any
  ): number {
    let score = 100;

    // Deduct points for issues
    issues.forEach(issue => {
      const deduction = {
        'critical': 30,
        'high': 20,
        'medium': 10,
        'low': 5
      }[issue.severity];
      
      score -= deduction;
    });

    // Factor in connection quality
    if (connectionQuality) {
      score = Math.round((score + connectionQuality.score) / 2);
    }

    // Factor in stability
    if (connectionStats.stabilityTrend === 'degrading') {
      score -= 10;
    } else if (connectionStats.stabilityTrend === 'improving') {
      score += 5;
    }

    return Math.max(0, Math.min(100, score));
  }

  /**
   * Get health level from score
   */
  private getHealthLevel(score: number): 'excellent' | 'good' | 'fair' | 'poor' | 'critical' {
    if (score >= this.HEALTH_THRESHOLDS.EXCELLENT) return 'excellent';
    if (score >= this.HEALTH_THRESHOLDS.GOOD) return 'good';
    if (score >= this.HEALTH_THRESHOLDS.FAIR) return 'fair';
    if (score >= this.HEALTH_THRESHOLDS.POOR) return 'poor';
    return 'critical';
  }

  /**
   * Generate recommendations based on issues
   */
  private generateRecommendations(
    issues: ConnectionIssue[],
    networkState: NetworkState | null,
    connectionQuality: ConnectionQuality | null
  ): string[] {
    const recommendations: string[] = [];

    // Critical issues first
    const criticalIssues = issues.filter(issue => issue.severity === 'critical');
    if (criticalIssues.length > 0) {
      recommendations.push('Address critical connection issues immediately');
    }

    // Network-specific recommendations
    if (networkState?.type === 'cellular' && connectionQuality && connectionQuality.score < 50) {
      recommendations.push('Switch to Wi-Fi for better performance');
    }

    if (networkState?.type === 'wifi' && connectionQuality && connectionQuality.score < 30) {
      recommendations.push('Check Wi-Fi signal strength and move closer to router');
    }

    // Auto-fixable issues
    const autoFixableIssues = issues.filter(issue => issue.autoFixable);
    if (autoFixableIssues.length > 0) {
      recommendations.push('Some issues can be automatically fixed - see diagnostic details');
    }

    // General recommendations
    if (issues.length === 0) {
      recommendations.push('Connection is healthy - no action needed');
    } else if (issues.length > 3) {
      recommendations.push('Multiple issues detected - consider restarting the application');
    }

    return recommendations;
  }

  /**
   * Calculate failure rate from connection stats
   */
  private calculateFailureRate(connectionStats: any): number {
    // This would typically calculate based on actual connection attempts
    // For now, estimate based on quality and stability
    const qualityFactor = (100 - connectionStats.currentQuality) / 100;
    const stabilityFactor = connectionStats.stabilityTrend === 'degrading' ? 0.3 : 0.1;
    
    return Math.min(100, (qualityFactor + stabilityFactor) * 100);
  }

  /**
   * Reset connection state
   */
  async resetConnection(options: ConnectionResetOptions = {}): Promise<void> {

    try {
      // Reset circuit breaker if requested
      if (options.resetCircuitBreaker) {
        // This would reset actual circuit breakers
      }

      // Clear cache if requested
      if (options.clearCache) {
        try {
          await AsyncStorage.removeItem('network_state_cache');
          await AsyncStorage.removeItem('connection_quality_cache');
          await AsyncStorage.removeItem('app_state_event');
        } catch (error) {
          // console.error('Failed to clear cache:', error);
        }
      }

      // Reset fallback service if requested
      if (options.resetFallbackService) {
        RealtimeFallbackService.cleanup();
      }

      // Force reconnect if requested
      if (options.forceReconnect) {
        await this.networkStateManager.forceQualityReassessment();
      }

      // Clear stored state if requested
      if (options.clearStoredState) {
        try {
          const keysToRemove = await AsyncStorage.getAllKeys();
          const connectionKeys = keysToRemove.filter(key => 
            key.includes('connection') || key.includes('network') || key.includes('app_state')
          );
          
          if (connectionKeys.length > 0) {
            await AsyncStorage.multiRemove(connectionKeys);
          }
        } catch (error) {
          // console.error('Failed to clear stored state:', error);
        }
      }


    } catch (error) {
      // console.error('Failed to reset connection:', error);
      throw error;
    }
  }

  /**
   * Force connection mode
   */
  forceConnectionMode(mode: ConnectionStrategy): void {
    
    // This would typically set the mode on actual connection managers
    // For now, log the request
    
    // In a real implementation, this would:
    // 1. Update the RealtimeFallbackService mode
    // 2. Reconfigure all active connections
    // 3. Store the preference for future sessions
  }

  /**
   * Clear connection-related cache
   */
  async clearConnectionCache(): Promise<void> {
    await this.resetConnection({ clearCache: true });
  }

  /**
   * Get last health assessment
   */
  getLastHealthAssessment(): ConnectionHealth | null {
    return this.lastHealthAssessment;
  }

  /**
   * Get diagnostic history
   */
  getDiagnosticHistory(): ConnectionHealth[] {
    return [...this.diagnosticHistory];
  }

  /**
   * Check if diagnostics are currently running
   */
  isRunningDiagnostics(): boolean {
    return this.isRunningDiagnostics;
  }

  /**
   * Get connection troubleshooting steps
   */
  getTroubleshootingSteps(): string[] {
    return [
      'Check network connection (Wi-Fi/cellular)',
      'Move to area with better signal strength',
      'Restart the application',
      'Clear application cache',
      'Switch between Wi-Fi and cellular data',
      'Check for app updates',
      'Restart your device',
      'Contact support if issues persist'
    ];
  }

  /**
   * Cleanup resources
   */
  cleanup(): void {
    this.lastHealthAssessment = null;
    this.diagnosticHistory = [];
    this.isRunningDiagnostics = false;
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

export default ConnectionDiagnostics;