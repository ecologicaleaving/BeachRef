/**
 * @fileoverview Production Deployment Monitoring System
 * Part of EPIC-007 Task 5: Production Deployment and Monitoring
 */

export interface PerformanceKPI {
  name: string;
  current: number;
  target: number;
  baseline: number;
  unit: string;
  status: 'pass' | 'fail' | 'warning';
}

export interface DeploymentMetrics {
  bundleSize: PerformanceKPI;
  memoryUsage: PerformanceKPI;
  cacheHitRate: PerformanceKPI;
  apiResponseTime: PerformanceKPI;
  startupTime: PerformanceKPI;
}

export class ProductionMonitor {
  private metrics: DeploymentMetrics;
  private isProduction: boolean;

  constructor() {
    this.isProduction = process.env.NODE_ENV === 'production';
    this.metrics = this.initializeMetrics();
  }

  private initializeMetrics(): DeploymentMetrics {
    return {
      bundleSize: {
        name: 'Bundle Size',
        current: 0,
        target: 2.71, // 30% reduction from 3.87MB baseline
        baseline: 3.87,
        unit: 'MB',
        status: 'warning'
      },
      memoryUsage: {
        name: 'Memory Usage',
        current: 0,
        target: 30, // 40% reduction target
        baseline: 50,
        unit: 'MB',
        status: 'warning'
      },
      cacheHitRate: {
        name: 'Cache Hit Rate',
        current: 0,
        target: 90,
        baseline: 30,
        unit: '%',
        status: 'warning'
      },
      apiResponseTime: {
        name: 'API Response Time',
        current: 0,
        target: 500,
        baseline: 2500,
        unit: 'ms',
        status: 'warning'
      },
      startupTime: {
        name: 'App Startup Time',
        current: 0,
        target: 1000, // 25% reduction
        baseline: 1333,
        unit: 'ms',
        status: 'warning'
      }
    };
  }

  /**
   * Update bundle size metric
   */
  updateBundleSize(sizeInBytes: number): void {
    const sizeInMB = sizeInBytes / (1024 * 1024);
    this.metrics.bundleSize.current = Math.round(sizeInMB * 100) / 100;
    this.metrics.bundleSize.status = this.evaluateStatus(
      this.metrics.bundleSize.current,
      this.metrics.bundleSize.target,
      'lower'
    );
  }

  /**
   * Update memory usage metric
   */
  updateMemoryUsage(memoryInBytes: number): void {
    const memoryInMB = memoryInBytes / (1024 * 1024);
    this.metrics.memoryUsage.current = Math.round(memoryInMB * 100) / 100;
    this.metrics.memoryUsage.status = this.evaluateStatus(
      this.metrics.memoryUsage.current,
      this.metrics.memoryUsage.target,
      'lower'
    );
  }

  /**
   * Update cache hit rate metric
   */
  updateCacheHitRate(hitRate: number): void {
    this.metrics.cacheHitRate.current = Math.round(hitRate * 100) / 100;
    this.metrics.cacheHitRate.status = this.evaluateStatus(
      this.metrics.cacheHitRate.current,
      this.metrics.cacheHitRate.target,
      'higher'
    );
  }

  /**
   * Update API response time metric
   */
  updateApiResponseTime(responseTimeMs: number): void {
    this.metrics.apiResponseTime.current = Math.round(responseTimeMs);
    this.metrics.apiResponseTime.status = this.evaluateStatus(
      this.metrics.apiResponseTime.current,
      this.metrics.apiResponseTime.target,
      'lower'
    );
  }

  /**
   * Update startup time metric
   */
  updateStartupTime(startupTimeMs: number): void {
    this.metrics.startupTime.current = Math.round(startupTimeMs);
    this.metrics.startupTime.status = this.evaluateStatus(
      this.metrics.startupTime.current,
      this.metrics.startupTime.target,
      'lower'
    );
  }

  /**
   * Evaluate KPI status
   */
  private evaluateStatus(current: number, target: number, direction: 'higher' | 'lower'): 'pass' | 'fail' | 'warning' {
    if (direction === 'lower') {
      if (current <= target) return 'pass';
      if (current <= target * 1.1) return 'warning';
      return 'fail';
    } else {
      if (current >= target) return 'pass';
      if (current >= target * 0.9) return 'warning';
      return 'fail';
    }
  }

  /**
   * Get all metrics
   */
  getMetrics(): DeploymentMetrics {
    return { ...this.metrics };
  }

  /**
   * Check if all KPIs meet targets
   */
  isDeploymentReady(): boolean {
    return Object.values(this.metrics).every(kpi => kpi.status === 'pass');
  }

  /**
   * Get failing KPIs
   */
  getFailingKPIs(): PerformanceKPI[] {
    return Object.values(this.metrics).filter(kpi => kpi.status === 'fail');
  }

  /**
   * Get warning KPIs
   */
  getWarningKPIs(): PerformanceKPI[] {
    return Object.values(this.metrics).filter(kpi => kpi.status === 'warning');
  }

  /**
   * Generate production readiness report
   */
  generateReport(): string {
    const passingKPIs = Object.values(this.metrics).filter(kpi => kpi.status === 'pass');
    const warningKPIs = this.getWarningKPIs();
    const failingKPIs = this.getFailingKPIs();

    const report = `
# Production Deployment Readiness Report
Generated: ${new Date().toISOString()}

## Overall Status: ${this.isDeploymentReady() ? '✅ READY' : '❌ NOT READY'}

## KPI Summary
- **Passing**: ${passingKPIs.length}/${Object.keys(this.metrics).length} KPIs
- **Warnings**: ${warningKPIs.length} KPIs
- **Failures**: ${failingKPIs.length} KPIs

## Detailed Metrics

${Object.values(this.metrics).map(kpi => `
### ${kpi.name}
- **Status**: ${this.getStatusEmoji(kpi.status)} ${kpi.status.toUpperCase()}
- **Current**: ${kpi.current} ${kpi.unit}
- **Target**: ${kpi.target} ${kpi.unit}
- **Baseline**: ${kpi.baseline} ${kpi.unit}
- **Improvement**: ${this.calculateImprovement(kpi)}%
`).join('')}

## Recommendations

${failingKPIs.length > 0 ? `### Critical Issues (Must Fix)
${failingKPIs.map(kpi => `- **${kpi.name}**: ${kpi.current} ${kpi.unit} exceeds target of ${kpi.target} ${kpi.unit}`).join('\n')}` : ''}

${warningKPIs.length > 0 ? `### Warnings (Should Address)
${warningKPIs.map(kpi => `- **${kpi.name}**: ${kpi.current} ${kpi.unit} near target threshold`).join('\n')}` : ''}

${this.isDeploymentReady() ? '✅ All KPIs meet targets - Ready for production deployment!' : '❌ Address failing KPIs before production deployment'}

## Next Steps
${this.getNextSteps()}
`;

    return report;
  }

  private getStatusEmoji(status: string): string {
    switch (status) {
      case 'pass': return '✅';
      case 'warning': return '⚠️';
      case 'fail': return '❌';
      default: return '❓';
    }
  }

  private calculateImprovement(kpi: PerformanceKPI): number {
    if (kpi.baseline === 0) return 0;
    return Math.round(((kpi.baseline - kpi.current) / kpi.baseline) * 100);
  }

  private getNextSteps(): string {
    const failingKPIs = this.getFailingKPIs();
    const warningKPIs = this.getWarningKPIs();

    if (failingKPIs.length === 0 && warningKPIs.length === 0) {
      return '1. Deploy to production with confidence\n2. Monitor metrics in production\n3. Set up automated alerts';
    }

    let steps = [];
    if (failingKPIs.length > 0) {
      steps.push('1. Address critical KPI failures before deployment');
      steps.push('2. Re-run performance validation');
    }
    if (warningKPIs.length > 0) {
      steps.push('3. Consider optimizing warning KPIs');
    }
    steps.push('4. Re-generate this report to verify improvements');

    return steps.join('\n');
  }

  /**
   * Log metrics to console (development only)
   */
  logMetrics(): void {
    if (!this.isProduction) {
      console.group('🚀 Production Monitoring Metrics');
      Object.values(this.metrics).forEach((kpi) => {
        console.log(`${kpi.name}: ${kpi.current}${kpi.unit} (${kpi.status})`);
      });
      console.groupEnd();
    }
  }
}

// Global instance
export const productionMonitor = new ProductionMonitor();

/**
 * Initialize with baseline bundle size
 */
productionMonitor.updateBundleSize(4777888); // Current bundle size from build