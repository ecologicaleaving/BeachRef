/**
 * Production Logger Service
 * Handles logging in production environment with proper controls
 */

type LogLevel = 'error' | 'warn' | 'info' | 'debug';

interface LogEntry {
  level: LogLevel;
  message: string;
  timestamp: string;
  context?: Record<string, unknown>;
  error?: Error;
}

class ProductionLogger {
  private static instance: ProductionLogger;
  private isDevelopment: boolean;
  private logBuffer: LogEntry[] = [];
  private maxBufferSize = 100;

  private constructor() {
    this.isDevelopment = process.env.NODE_ENV === 'development';
  }

  public static getInstance(): ProductionLogger {
    if (!ProductionLogger.instance) {
      ProductionLogger.instance = new ProductionLogger();
    }
    return ProductionLogger.instance;
  }

  /**
   * Error logging - Always enabled
   */
  error(message: string, error?: Error, context?: Record<string, unknown>): void {
    const entry: LogEntry = {
      level: 'error',
      message,
      timestamp: new Date().toISOString(),
      context,
      error
    };

    this.addToBuffer(entry);

    // Always log errors to console
    console.error(`[ERROR] ${message}`, error?.stack || error, context);

    // In production, send to monitoring service
    if (!this.isDevelopment) {
      this.sendToMonitoring(entry);
    }
  }

  /**
   * Warning logging - Production enabled
   */
  warn(message: string, context?: Record<string, unknown>): void {
    const entry: LogEntry = {
      level: 'warn',
      message,
      timestamp: new Date().toISOString(),
      context
    };

    this.addToBuffer(entry);
    console.warn(`[WARN] ${message}`, context);
  }

  /**
   * Info logging - Development only
   */
  info(message: string, context?: Record<string, unknown>): void {
    if (!this.isDevelopment) return;

    const entry: LogEntry = {
      level: 'info',
      message,
      timestamp: new Date().toISOString(),
      context
    };

    this.addToBuffer(entry);
    console.info(`[INFO] ${message}`, context);
  }

  /**
   * Debug logging - Development only
   */
  debug(message: string, context?: Record<string, unknown>): void {
    if (!this.isDevelopment) return;

    const entry: LogEntry = {
      level: 'debug',
      message,
      timestamp: new Date().toISOString(),
      context
    };

    this.addToBuffer(entry);
    console.debug(`[DEBUG] ${message}`, context);
  }

  /**
   * Performance logging for monitoring
   */
  performance(operation: string, duration: number, context?: Record<string, unknown>): void {
    const message = `Performance: ${operation} took ${duration}ms`;
    
    if (duration > 1000) {
      this.warn(message, { operation, duration, ...context });
    } else if (this.isDevelopment) {
      this.info(message, { operation, duration, ...context });
    }
  }

  /**
   * API request logging with sensitive data filtering
   */
  apiCall(endpoint: string, method: string, statusCode?: number, duration?: number): void {
    const context = {
      endpoint: this.sanitizeUrl(endpoint),
      method,
      statusCode,
      duration
    };

    if (statusCode && statusCode >= 400) {
      this.error(`API Error: ${method} ${endpoint} returned ${statusCode}`, undefined, context);
    } else if (this.isDevelopment) {
      this.debug(`API Call: ${method} ${endpoint}`, context);
    }
  }

  /**
   * Get recent logs for debugging
   */
  getRecentLogs(level?: LogLevel): LogEntry[] {
    if (!this.isDevelopment) return [];
    
    return level 
      ? this.logBuffer.filter(log => log.level === level)
      : this.logBuffer;
  }

  /**
   * Clear log buffer
   */
  clearLogs(): void {
    this.logBuffer = [];
  }

  private addToBuffer(entry: LogEntry): void {
    this.logBuffer.push(entry);
    
    // Keep buffer size manageable
    if (this.logBuffer.length > this.maxBufferSize) {
      this.logBuffer = this.logBuffer.slice(-this.maxBufferSize);
    }
  }

  private sanitizeUrl(url: string): string {
    // Remove sensitive query parameters
    return url.replace(/([?&])(key|token|password|secret)=[^&]*/gi, '$1$2=***');
  }

  private sendToMonitoring(entry: LogEntry): void {
    // In a real production app, this would send to a monitoring service
    // like Sentry, LogRocket, or a custom logging endpoint
    // For now, we'll just ensure errors are captured
    
    if (entry.level === 'error' && entry.error) {
      // Could integrate with Sentry or similar service here
    }
  }
}

// Export singleton instance
export const logger = ProductionLogger.getInstance();

// Convenience exports for common patterns
export const logError = (message: string, error?: Error, context?: Record<string, unknown>) => 
  logger.error(message, error, context);

export const logWarning = (message: string, context?: Record<string, unknown>) => 
  logger.warn(message, context);

export const logInfo = (message: string, context?: Record<string, unknown>) => 
  logger.info(message, context);

export const logDebug = (message: string, context?: Record<string, unknown>) => 
  logger.debug(message, context);

export const logPerformance = (operation: string, startTime: number, context?: Record<string, unknown>) => {
  const duration = Date.now() - startTime;
  logger.performance(operation, duration, context);
};

export const logApiCall = (endpoint: string, method: string, statusCode?: number, duration?: number) =>
  logger.apiCall(endpoint, method, statusCode, duration);