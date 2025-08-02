/**
 * Tab Performance Monitoring
 * 
 * Monitors and tracks tab performance metrics for optimization.
 * Provides analytics on tab switching, loading times, and errors.
 * 
 * Features:
 * - Tab switch time measurement
 * - Content load time tracking
 * - Error count monitoring
 * - Performance analytics
 * - Slow operation detection
 */

interface TabMetrics {
  tabId: string
  loadTime: number
  switchTime: number
  errorCount: number
  timestamp: string
  contentSize?: number
  cacheHit?: boolean
}

interface PerformanceThresholds {
  slowSwitchTime: number // ms
  slowLoadTime: number   // ms
}

export class TabPerformanceMonitor {
  private metrics: TabMetrics[] = []
  private tabSwitchStartTime: number = 0
  private contentLoadStartTime: Record<string, number> = {}
  private developmentIntervalId?: NodeJS.Timeout
  
  private thresholds: PerformanceThresholds = {
    slowSwitchTime: 1000,  // 1 second
    slowLoadTime: 3000     // 3 seconds
  }

  /**
   * Start tracking tab switch performance
   */
  startTabSwitch() {
    this.tabSwitchStartTime = performance.now()
  }

  /**
   * End tab switch tracking and record metrics
   */
  endTabSwitch(tabId: string) {
    const switchTime = performance.now() - this.tabSwitchStartTime
    
    const existingMetric = this.metrics.find(m => m.tabId === tabId)
    if (existingMetric) {
      existingMetric.switchTime = switchTime
      existingMetric.timestamp = new Date().toISOString()
    } else {
      this.metrics.push({
        tabId,
        loadTime: 0,
        switchTime,
        errorCount: 0,
        timestamp: new Date().toISOString()
      })
    }

    // Log performance warnings
    if (switchTime > this.thresholds.slowSwitchTime) {
      console.warn(`🐌 Slow tab switch to ${tabId}: ${switchTime.toFixed(2)}ms`)
      
      // Track in production analytics if available
      if (typeof window !== 'undefined' && window.gtag) {
        window.gtag('event', 'timing_complete', {
          name: 'tab_switch',
          value: Math.round(switchTime),
          custom_map: { tab_id: tabId }
        })
      }
    }

    return switchTime
  }

  /**
   * Start tracking content load performance
   */
  startContentLoad(tabId: string) {
    this.contentLoadStartTime[tabId] = performance.now()
  }

  /**
   * End content load tracking
   */
  endContentLoad(tabId: string, contentSize?: number, cacheHit?: boolean) {
    const startTime = this.contentLoadStartTime[tabId]
    if (!startTime) return 0

    const loadTime = performance.now() - startTime
    delete this.contentLoadStartTime[tabId]

    const metric = this.metrics.find(m => m.tabId === tabId)
    if (metric) {
      metric.loadTime = loadTime
      metric.contentSize = contentSize
      metric.cacheHit = cacheHit
    }

    // Log slow loading
    if (loadTime > this.thresholds.slowLoadTime) {
      console.warn(`🐌 Slow content load for ${tabId}: ${loadTime.toFixed(2)}ms`)
    }

    // Log cache performance
    if (cacheHit !== undefined) {
      console.log(`📊 ${tabId} tab load: ${loadTime.toFixed(2)}ms (${cacheHit ? 'cache hit' : 'cache miss'})`)
    }

    return loadTime
  }

  /**
   * Record an error for a specific tab
   */
  recordError(tabId: string, error?: Error) {
    const metric = this.metrics.find(m => m.tabId === tabId)
    if (metric) {
      metric.errorCount++
    } else {
      this.metrics.push({
        tabId,
        loadTime: 0,
        switchTime: 0,
        errorCount: 1,
        timestamp: new Date().toISOString()
      })
    }

    // Log error with context
    console.error(`❌ Error in ${tabId} tab:`, error || 'Unknown error')
    
    // Track in analytics
    if (typeof window !== 'undefined' && window.gtag) {
      window.gtag('event', 'exception', {
        description: `Tab Error: ${tabId}`,
        fatal: false
      })
    }
  }

  /**
   * Get performance metrics for a specific tab
   */
  getTabMetrics(tabId: string): TabMetrics | undefined {
    return this.metrics.find(m => m.tabId === tabId)
  }

  /**
   * Get all performance metrics
   */
  getAllMetrics(): TabMetrics[] {
    return [...this.metrics]
  }

  /**
   * Get performance summary
   */
  getPerformanceSummary() {
    const summary = {
      totalTabs: this.metrics.length,
      averageSwitchTime: 0,
      averageLoadTime: 0,
      totalErrors: 0,
      slowTabs: [] as string[],
      fastestTab: '',
      slowestTab: ''
    }

    if (this.metrics.length === 0) return summary

    const switchTimes = this.metrics.filter(m => m.switchTime > 0)
    const loadTimes = this.metrics.filter(m => m.loadTime > 0)

    // Calculate averages
    if (switchTimes.length > 0) {
      summary.averageSwitchTime = switchTimes.reduce((sum, m) => sum + m.switchTime, 0) / switchTimes.length
    }

    if (loadTimes.length > 0) {
      summary.averageLoadTime = loadTimes.reduce((sum, m) => sum + m.loadTime, 0) / loadTimes.length
    }

    // Count errors
    summary.totalErrors = this.metrics.reduce((sum, m) => sum + m.errorCount, 0)

    // Find slow tabs
    summary.slowTabs = this.metrics
      .filter(m => m.switchTime > this.thresholds.slowSwitchTime || m.loadTime > this.thresholds.slowLoadTime)
      .map(m => m.tabId)

    // Find fastest and slowest
    if (switchTimes.length > 0) {
      const sortedBySwitchTime = [...switchTimes].sort((a, b) => a.switchTime - b.switchTime)
      summary.fastestTab = sortedBySwitchTime[0].tabId
      summary.slowestTab = sortedBySwitchTime[sortedBySwitchTime.length - 1].tabId
    }

    return summary
  }

  /**
   * Clear all metrics
   */
  clearMetrics() {
    this.metrics = []
    this.contentLoadStartTime = {}
  }

  /**
   * Start development logging interval
   */
  startDevelopmentLogging() {
    if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
      this.developmentIntervalId = setInterval(() => {
        const summary = this.getPerformanceSummary()
        if (summary.totalTabs > 0) {
          this.logSummary()
        }
      }, 30000)
    }
  }

  /**
   * Clean up resources
   */
  cleanup() {
    if (this.developmentIntervalId) {
      clearInterval(this.developmentIntervalId)
      this.developmentIntervalId = undefined
    }
  }

  /**
   * Log performance summary to console
   */
  logSummary() {
    const summary = this.getPerformanceSummary()
    
    console.group('📊 Tab Performance Summary')
    console.log('Total tabs:', summary.totalTabs)
    console.log('Average switch time:', `${summary.averageSwitchTime.toFixed(2)}ms`)
    console.log('Average load time:', `${summary.averageLoadTime.toFixed(2)}ms`)
    console.log('Total errors:', summary.totalErrors)
    
    if (summary.slowTabs.length > 0) {
      console.warn('Slow tabs:', summary.slowTabs)
    }
    
    if (summary.fastestTab) {
      console.log('Fastest tab:', summary.fastestTab)
    }
    
    if (summary.slowestTab) {
      console.log('Slowest tab:', summary.slowestTab)
    }
    
    console.groupEnd()
  }
}

// Global instance for easy access
export const tabPerformanceMonitor = new TabPerformanceMonitor()

// Start development logging if in development environment
if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
  tabPerformanceMonitor.startDevelopmentLogging()
  
  // Cleanup on page unload
  window.addEventListener('beforeunload', () => {
    tabPerformanceMonitor.cleanup()
  })
}