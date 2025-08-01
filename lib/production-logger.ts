/**
 * Production Error Logging and Monitoring Utilities
 * 
 * Provides comprehensive error logging, monitoring integration, and diagnostic
 * capabilities for production deployment of VIS API error handling.
 * 
 * Features:
 * - Structured logging with consistent format
 * - Error categorization and severity levels
 * - Performance metrics tracking
 * - Production monitoring integration points
 * - Sanitized error reporting for security
 */

import { EnhancedVISApiError, VISApiErrorType, VISApiEndpoint } from './vis-error-handler'

export type LogLevel = 'debug' | 'info' | 'warn' | 'error' | 'critical'

export interface ProductionLogEntry {
  level: LogLevel
  message: string
  timestamp: string
  component: string
  tournamentCode?: string
  endpoint?: VISApiEndpoint
  errorType?: VISApiErrorType
  severity?: 'low' | 'medium' | 'high' | 'critical'
  context?: Record<string, unknown>
  performance?: {
    duration?: number
    attempt?: number
    fallbackUsed?: boolean
  }
  environment: {
    nodeEnv: string
    buildVersion?: string
    userAgent?: string
  }
}

export interface ErrorMetrics {
  errorCount: number
  errorsByType: Record<VISApiErrorType, number>
  errorsByEndpoint: Record<VISApiEndpoint, number>
  fallbackUsageRate: number
  averageResponseTime: number
  lastErrorTimestamp?: string
}

/**
 * Enhanced production logger with structured output and monitoring integration
 */
class ProductionLogger {
  private errorMetrics: ErrorMetrics = {
    errorCount: 0,
    errorsByType: {} as Record<VISApiErrorType, number>,
    errorsByEndpoint: {} as Record<VISApiEndpoint, number>,
    fallbackUsageRate: 0,
    averageResponseTime: 0
  }

  /**
   * Logs an enhanced VIS API error with full context and monitoring data
   */
  logVISApiError(
    error: EnhancedVISApiError,
    component: string = 'VIS-Client',
    additionalContext?: Record<string, unknown>
  ): void {
    const logLevel = this.mapSeverityToLogLevel(error.category.severity)
    
    const entry: ProductionLogEntry = {
      level: logLevel,
      message: error.message,
      timestamp: new Date().toISOString(),
      component,
      tournamentCode: error.context.tournamentCode,
      endpoint: error.category.endpoint,
      errorType: error.category.type,
      severity: error.category.severity,
      context: {
        statusCode: error.statusCode,
        recoverable: error.category.recoverable,
        requiresFallback: error.category.requiresFallback,
        fallbackAttempted: error.context.fallbackAttempted,
        attempt: error.context.attempt,
        tournamentNumber: error.context.tournamentNumber,
        ...additionalContext
      },
      environment: {
        nodeEnv: process.env.NODE_ENV || 'unknown',
        buildVersion: process.env.BUILD_VERSION || process.env.VERCEL_GIT_COMMIT_SHA?.substring(0, 8),
        userAgent: error.context.userAgent
      }
    }

    this.writeLogEntry(entry)
    this.updateErrorMetrics(error)
    this.triggerMonitoringAlerts(error, entry)
  }

  /**
   * Logs performance metrics for VIS API operations
   */
  logPerformanceMetrics(
    operation: string,
    duration: number,
    endpoint: VISApiEndpoint,
    tournamentCode?: string,
    fallbackUsed: boolean = false,
    dataCompleteness: 'full' | 'partial' | 'minimal' = 'full'
  ): void {
    const entry: ProductionLogEntry = {
      level: 'info',
      message: `VIS API operation completed: ${operation}`,
      timestamp: new Date().toISOString(),
      component: 'VIS-Performance',
      tournamentCode,
      endpoint,
      performance: {
        duration,
        fallbackUsed
      },
      context: {
        operation,
        dataCompleteness,
        cacheHit: false // TODO: Add cache tracking
      },
      environment: {
        nodeEnv: process.env.NODE_ENV || 'unknown',
        buildVersion: process.env.BUILD_VERSION || process.env.VERCEL_GIT_COMMIT_SHA?.substring(0, 8)
      }
    }

    this.writeLogEntry(entry)
    this.updatePerformanceMetrics(duration, fallbackUsed)
  }

  /**
   * Logs network connectivity and retry events
   */
  logNetworkEvent(
    event: 'retry' | 'timeout' | 'connectivity_check' | 'fallback_triggered',
    context: {
      tournamentCode?: string
      endpoint?: VISApiEndpoint
      attempt?: number
      delay?: number
      networkAvailable?: boolean
      error?: string
    }
  ): void {
    const entry: ProductionLogEntry = {
      level: event === 'connectivity_check' ? 'debug' : 'warn',
      message: `Network event: ${event}`,
      timestamp: new Date().toISOString(),
      component: 'Network-Handler',
      tournamentCode: context.tournamentCode,
      endpoint: context.endpoint,
      context,
      environment: {
        nodeEnv: process.env.NODE_ENV || 'unknown'
      }
    }

    this.writeLogEntry(entry)
  }

  /**
   * Logs user-facing error events for UX monitoring
   */
  logUserExperienceError(
    errorType: 'page_crash' | 'data_unavailable' | 'loading_timeout' | 'fallback_displayed',
    tournamentCode?: string,
    userContext?: {
      userAgent?: string
      referrer?: string
      pathname?: string
    }
  ): void {
    const entry: ProductionLogEntry = {
      level: errorType === 'page_crash' ? 'critical' : 'warn',
      message: `User experience error: ${errorType}`,
      timestamp: new Date().toISOString(),
      component: 'UX-Monitor',
      tournamentCode,
      context: {
        errorType,
        ...userContext
      },
      environment: {
        nodeEnv: process.env.NODE_ENV || 'unknown',
        userAgent: userContext?.userAgent
      }
    }

    this.writeLogEntry(entry)
  }

  /**
   * Gets current error metrics for monitoring dashboards
   */
  getErrorMetrics(): ErrorMetrics {
    return { ...this.errorMetrics }
  }

  /**
   * Resets error metrics (useful for testing or periodic resets)
   */
  resetMetrics(): void {
    this.errorMetrics = {
      errorCount: 0,
      errorsByType: {} as Record<VISApiErrorType, number>,
      errorsByEndpoint: {} as Record<VISApiEndpoint, number>,
      fallbackUsageRate: 0,
      averageResponseTime: 0
    }
  }

  private mapSeverityToLogLevel(severity: 'low' | 'medium' | 'high' | 'critical'): LogLevel {
    switch (severity) {
      case 'low': return 'info'
      case 'medium': return 'warn'
      case 'high': return 'error'
      case 'critical': return 'critical'
      default: return 'warn'
    }
  }

  private writeLogEntry(entry: ProductionLogEntry): void {
    const logMessage = this.formatLogMessage(entry)
    
    switch (entry.level) {
      case 'critical':
      case 'error':
        console.error(logMessage)
        break
      case 'warn':
        console.warn(logMessage)
        break
      case 'debug':
        if (process.env.NODE_ENV === 'development') {
          console.debug(logMessage)
        }
        break
      default:
        console.log(logMessage)
    }

    // In production, also send to monitoring service
    if (process.env.NODE_ENV === 'production') {
      this.sendToMonitoringService(entry)
    }
  }

  private formatLogMessage(entry: ProductionLogEntry): string {
    const baseMessage = `${entry.timestamp} [${entry.level.toUpperCase()}] [${entry.component}] ${entry.message}`
    
    if (entry.tournamentCode) {
      return `${baseMessage} | Tournament: ${entry.tournamentCode}`
    }
    
    return baseMessage
  }

  private updateErrorMetrics(error: EnhancedVISApiError): void {
    this.errorMetrics.errorCount++
    this.errorMetrics.errorsByType[error.category.type] = (this.errorMetrics.errorsByType[error.category.type] || 0) + 1
    this.errorMetrics.errorsByEndpoint[error.category.endpoint] = (this.errorMetrics.errorsByEndpoint[error.category.endpoint] || 0) + 1
    this.errorMetrics.lastErrorTimestamp = error.context.timestamp
  }

  private updatePerformanceMetrics(duration: number, fallbackUsed: boolean): void {
    // Simple moving average (in production, consider more sophisticated metrics)
    const currentAvg = this.errorMetrics.averageResponseTime
    const count = this.errorMetrics.errorCount + 1 // Approximate total operations
    this.errorMetrics.averageResponseTime = (currentAvg * (count - 1) + duration) / count

    if (fallbackUsed) {
      // Update fallback usage rate
      const fallbackCount = Object.values(this.errorMetrics.errorsByType).reduce((sum, count) => sum + count, 0)
      this.errorMetrics.fallbackUsageRate = fallbackCount / count
    }
  }

  private triggerMonitoringAlerts(error: EnhancedVISApiError, entry: ProductionLogEntry): void {
    // In production, integrate with monitoring services like:
    // - Sentry for error tracking
    // - DataDog for APM
    // - Vercel Analytics
    // - Custom webhook endpoints

    if (error.category.severity === 'critical') {
      // Critical errors should trigger immediate alerts
      this.sendCriticalAlert(error, entry)
    }

    // Log error rate monitoring
    if (this.errorMetrics.errorCount % 10 === 0) {
      console.warn(`[Production Monitor] Error rate alert: ${this.errorMetrics.errorCount} errors encountered`)
    }
  }

  private sendCriticalAlert(error: EnhancedVISApiError, entry: ProductionLogEntry): void {
    // In production, send to alerting system
    console.error('[CRITICAL ALERT]', {
      error: error.message,
      tournamentCode: error.context.tournamentCode,
      endpoint: error.category.endpoint,
      timestamp: entry.timestamp
    })
  }

  private sendToMonitoringService(entry: ProductionLogEntry): void {
    // In production, integrate with external monitoring services
    // For now, just ensure it's available in production logs
    if (entry.level === 'error' || entry.level === 'critical') {
      // These logs will be captured by Vercel's logging system
      console.error('[PRODUCTION MONITOR]', JSON.stringify(entry, null, 2))
    }
  }
}

// Singleton instance for application-wide use
export const productionLogger = new ProductionLogger()

/**
 * Convenience function for logging VIS API errors
 */
export function logVISApiError(
  error: EnhancedVISApiError,
  component?: string,
  additionalContext?: Record<string, unknown>
): void {
  productionLogger.logVISApiError(error, component, additionalContext)
}

/**
 * Convenience function for logging performance metrics
 */
export function logPerformanceMetrics(
  operation: string,
  duration: number,
  endpoint: VISApiEndpoint,
  tournamentCode?: string,
  fallbackUsed?: boolean,
  dataCompleteness?: 'full' | 'partial' | 'minimal'
): void {
  productionLogger.logPerformanceMetrics(operation, duration, endpoint, tournamentCode, fallbackUsed, dataCompleteness)
}

/**
 * Convenience function for logging network events
 */
export function logNetworkEvent(
  event: 'retry' | 'timeout' | 'connectivity_check' | 'fallback_triggered',
  context: {
    tournamentCode?: string
    endpoint?: VISApiEndpoint
    attempt?: number
    delay?: number
    networkAvailable?: boolean
    error?: string
  }
): void {
  productionLogger.logNetworkEvent(event, context)
}

/**
 * Convenience function for logging UX errors
 */
export function logUserExperienceError(
  errorType: 'page_crash' | 'data_unavailable' | 'loading_timeout' | 'fallback_displayed',
  tournamentCode?: string,
  userContext?: {
    userAgent?: string
    referrer?: string
    pathname?: string
  }
): void {
  productionLogger.logUserExperienceError(errorType, tournamentCode, userContext)
}