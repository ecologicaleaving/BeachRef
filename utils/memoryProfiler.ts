/**
 * @fileoverview Memory Profiling Utility for BeachRef
 * Part of EPIC-007 Task 4: Memory Usage Profiling and Optimization
 */

export interface MemorySnapshot {
  timestamp: number;
  component: string;
  action: string;
  heapUsed?: number;
  heapTotal?: number;
  external?: number;
  rss?: number;
  jsHeapSizeLimit?: number;
  totalJSHeapSize?: number;
  usedJSHeapSize?: number;
}

export class MemoryProfiler {
  private snapshots: MemorySnapshot[] = [];
  private isEnabled: boolean = typeof __DEV__ !== 'undefined' ? __DEV__ : process.env.NODE_ENV !== 'production';

  /**
   * Take a memory snapshot
   */
  snapshot(component: string, action: string): MemorySnapshot | null {
    if (!this.isEnabled) return null;

    const timestamp = Date.now();
    let snapshot: MemorySnapshot = {
      timestamp,
      component,
      action
    };

    // Web environment memory API
    if (typeof window !== 'undefined' && 'performance' in window && 'memory' in (window.performance as any)) {
      try {
        const memory = (window.performance as any).memory;
        snapshot = {
          ...snapshot,
          jsHeapSizeLimit: memory.jsHeapSizeLimit || 0,
          totalJSHeapSize: memory.totalJSHeapSize || 0,
          usedJSHeapSize: memory.usedJSHeapSize || 0
        };
      } catch (error) {
        // Memory API not available or failed - continue without web metrics
        // console.warn('Memory API not available:', error);
      }
    }

    // Node.js environment (for testing)
    if (typeof process !== 'undefined' && process.memoryUsage) {
      const memory = process.memoryUsage();
      snapshot = {
        ...snapshot,
        heapUsed: memory.heapUsed,
        heapTotal: memory.heapTotal,
        external: memory.external,
        rss: memory.rss
      };
    }

    this.snapshots.push(snapshot);
    
    // Keep only last 100 snapshots to prevent memory leak
    if (this.snapshots.length > 100) {
      this.snapshots = this.snapshots.slice(-100);
    }

    return snapshot;
  }

  /**
   * Get memory usage analysis
   */
  getAnalysis(): {
    totalSnapshots: number;
    memoryTrend: 'increasing' | 'decreasing' | 'stable';
    avgMemoryUsage: number;
    peakMemoryUsage: number;
    componentBreakdown: Record<string, number>;
    actionBreakdown: Record<string, number>;
  } {
    if (this.snapshots.length === 0) {
      return {
        totalSnapshots: 0,
        memoryTrend: 'stable',
        avgMemoryUsage: 0,
        peakMemoryUsage: 0,
        componentBreakdown: {},
        actionBreakdown: {}
      };
    }

    const memoryValues = this.snapshots.map(s => 
      s.usedJSHeapSize || s.heapUsed || 0
    ).filter(v => v > 0);

    const avgMemoryUsage = memoryValues.length > 0 
      ? memoryValues.reduce((a, b) => a + b, 0) / memoryValues.length 
      : 0;

    const peakMemoryUsage = memoryValues.length > 0 
      ? Math.max(...memoryValues) 
      : 0;

    // Determine trend
    let memoryTrend: 'increasing' | 'decreasing' | 'stable' = 'stable';
    if (memoryValues.length >= 10) {
      const recent = memoryValues.slice(-10);
      const older = memoryValues.slice(-20, -10);
      if (older.length > 0) {
        const recentAvg = recent.reduce((a, b) => a + b, 0) / recent.length;
        const olderAvg = older.reduce((a, b) => a + b, 0) / older.length;
        const change = (recentAvg - olderAvg) / olderAvg;
        if (change > 0.05) memoryTrend = 'increasing';
        else if (change < -0.05) memoryTrend = 'decreasing';
      }
    }

    // Component breakdown
    const componentBreakdown: Record<string, number> = {};
    const actionBreakdown: Record<string, number> = {};

    this.snapshots.forEach(snapshot => {
      const memUsage = snapshot.usedJSHeapSize || snapshot.heapUsed || 0;
      
      if (!componentBreakdown[snapshot.component]) {
        componentBreakdown[snapshot.component] = 0;
      }
      componentBreakdown[snapshot.component] += memUsage;

      if (!actionBreakdown[snapshot.action]) {
        actionBreakdown[snapshot.action] = 0;
      }
      actionBreakdown[snapshot.action] += memUsage;
    });

    return {
      totalSnapshots: this.snapshots.length,
      memoryTrend,
      avgMemoryUsage: Math.round(avgMemoryUsage),
      peakMemoryUsage: Math.round(peakMemoryUsage),
      componentBreakdown,
      actionBreakdown
    };
  }

  /**
   * Generate memory report
   */
  generateReport(): string {
    const analysis = this.getAnalysis();
    
    const formatBytes = (bytes: number): string => {
      if (bytes === 0) return '0 B';
      const k = 1024;
      const sizes = ['B', 'KB', 'MB', 'GB'];
      const i = Math.floor(Math.log(bytes) / Math.log(k));
      return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    };

    let report = `
# Memory Usage Report
Generated: ${new Date().toISOString()}

## Summary
- Total Snapshots: ${analysis.totalSnapshots}
- Memory Trend: ${analysis.memoryTrend}
- Average Memory Usage: ${formatBytes(analysis.avgMemoryUsage)}
- Peak Memory Usage: ${formatBytes(analysis.peakMemoryUsage)}

## Component Breakdown
${Object.entries(analysis.componentBreakdown)
  .sort(([,a], [,b]) => b - a)
  .map(([component, usage]) => `- ${component}: ${formatBytes(usage)}`)
  .join('\n')}

## Action Breakdown
${Object.entries(analysis.actionBreakdown)
  .sort(([,a], [,b]) => b - a)
  .map(([action, usage]) => `- ${action}: ${formatBytes(usage)}`)
  .join('\n')}

## Optimization Recommendations
${analysis.memoryTrend === 'increasing' ? '⚠️ Memory usage is increasing - investigate potential memory leaks' : ''}
${analysis.peakMemoryUsage > 50 * 1024 * 1024 ? '⚠️ Peak memory usage over 50MB - consider optimization' : ''}
${analysis.totalSnapshots > 80 ? '✅ Good profiling data collected' : 'ℹ️ Collect more data for better analysis'}
`;

    return report;
  }

  /**
   * Clear all snapshots
   */
  clear(): void {
    this.snapshots = [];
  }

  /**
   * Enable/disable profiling
   */
  setEnabled(enabled: boolean): void {
    this.isEnabled = enabled;
  }

  /**
   * Get recent snapshots
   */
  getRecentSnapshots(count: number = 10): MemorySnapshot[] {
    return this.snapshots.slice(-count);
  }
}

// Global instance
export const memoryProfiler = new MemoryProfiler();

/**
 * Hook for memory profiling in React components
 */
export const useMemoryProfiler = (componentName: string) => {
  const profile = (action: string) => {
    return memoryProfiler.snapshot(componentName, action);
  };

  return { profile, getAnalysis: () => memoryProfiler.getAnalysis() };
};