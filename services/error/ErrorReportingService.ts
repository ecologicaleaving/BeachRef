/**
 * Error Reporting and Handling Service
 * Part of Error Handling Strategy Unification Refactoring
 * Provides centralized error reporting, logging, and user notification
 */

import { ErrorClassifier, ErrorDetails, ErrorSeverity, ErrorCategory, ErrorRecoveryStrategy } from './ErrorClassifier';

export interface ErrorReportingConfig {
  enableConsoleLogging: boolean;
  enableUserNotifications: boolean;
  enableAnalytics: boolean;
  enableCrashReporting: boolean;
  logLevel: ErrorSeverity;
}

export interface ErrorReport {
  errorDetails: ErrorDetails;
  recoveryStrategy: ErrorRecoveryStrategy;
  reportedAt: string;
  handled: boolean;
  userNotified: boolean;
}

export type ErrorHandler = (errorReport: ErrorReport) => void | Promise<void>;

/**
 * Centralized error reporting service
 * Handles error classification, reporting, logging, and user notifications
 */
export class ErrorReportingService {
  private static instance: ErrorReportingService | null = null;
  private config: ErrorReportingConfig;
  private errorHandlers = new Map<string, Set<ErrorHandler>>();
  private errorHistory: ErrorReport[] = [];
  private readonly maxHistorySize = 100;

  private constructor(config: Partial<ErrorReportingConfig> = {}) {
    this.config = {
      enableConsoleLogging: true,
      enableUserNotifications: true,
      enableAnalytics: false,
      enableCrashReporting: false,
      logLevel: ErrorSeverity.WARNING,
      ...config
    };
  }

  /**
   * Get singleton instance
   */
  static getInstance(config?: Partial<ErrorReportingConfig>): ErrorReportingService {
    if (!ErrorReportingService.instance) {
      ErrorReportingService.instance = new ErrorReportingService(config);
    }
    return ErrorReportingService.instance;
  }

  /**
   * Report an error with automatic classification and handling
   */
  async reportError(
    error: Error,
    context?: Record<string, any>
  ): Promise<ErrorReport> {
    const errorDetails = ErrorClassifier.classify(error, context);
    const recoveryStrategy = ErrorClassifier.getRecoveryStrategy(errorDetails);

    const errorReport: ErrorReport = {
      errorDetails,
      recoveryStrategy,
      reportedAt: new Date().toISOString(),
      handled: false,
      userNotified: false
    };

    try {
      // Log the error if enabled
      if (this.config.enableConsoleLogging && this.shouldLog(errorDetails.severity)) {
        this.logError(errorReport);
      }

      // Send to analytics if enabled
      if (this.config.enableAnalytics) {
        await this.sendToAnalytics(errorReport);
      }

      // Send to crash reporting if enabled and critical
      if (this.config.enableCrashReporting && errorDetails.severity === ErrorSeverity.CRITICAL) {
        await this.sendToCrashReporting(errorReport);
      }

      // Notify registered handlers
      await this.notifyHandlers(errorReport);

      // Store in history
      this.addToHistory(errorReport);

      errorReport.handled = true;
    } catch (reportingError) {
      console.error('Error in error reporting service:', reportingError);
    }

    return errorReport;
  }

  /**
   * Register an error handler for specific error categories
   */
  addErrorHandler(category: ErrorCategory | 'all', handler: ErrorHandler): () => void {
    const key = category;

    if (!this.errorHandlers.has(key)) {
      this.errorHandlers.set(key, new Set());
    }

    this.errorHandlers.get(key)!.add(handler);

    // Return unsubscribe function
    return () => {
      this.errorHandlers.get(key)?.delete(handler);
    };
  }

  /**
   * Get error statistics
   */
  getErrorStatistics(): {
    totalErrors: number;
    errorsBySeverity: Record<ErrorSeverity, number>;
    errorsByCategory: Record<ErrorCategory, number>;
    recentErrors: ErrorReport[];
    criticalErrors: ErrorReport[];
  } {
    const errorsBySeverity = {} as Record<ErrorSeverity, number>;
    const errorsByCategory = {} as Record<ErrorCategory, number>;

    // Initialize counters
    Object.values(ErrorSeverity).forEach(severity => {
      errorsBySeverity[severity] = 0;
    });
    Object.values(ErrorCategory).forEach(category => {
      errorsByCategory[category] = 0;
    });

    // Count errors
    this.errorHistory.forEach(report => {
      errorsBySeverity[report.errorDetails.severity]++;
      errorsByCategory[report.errorDetails.category]++;
    });

    return {
      totalErrors: this.errorHistory.length,
      errorsBySeverity,
      errorsByCategory,
      recentErrors: this.errorHistory.slice(-10),
      criticalErrors: this.errorHistory.filter(
        report => report.errorDetails.severity === ErrorSeverity.CRITICAL
      )
    };
  }

  /**
   * Clear error history
   */
  clearHistory(): void {
    this.errorHistory = [];
  }

  /**
   * Update configuration
   */
  updateConfig(configUpdate: Partial<ErrorReportingConfig>): void {
    this.config = { ...this.config, ...configUpdate };
  }

  /**
   * Create a scoped error reporter for a specific context
   */
  createScopedReporter(scopeContext: Record<string, any>) {
    return {
      report: (error: Error, additionalContext?: Record<string, any>) => {
        return this.reportError(error, { ...scopeContext, ...additionalContext });
      }
    };
  }

  // Private methods

  private shouldLog(severity: ErrorSeverity): boolean {
    const severityLevels = {
      [ErrorSeverity.INFO]: 0,
      [ErrorSeverity.WARNING]: 1,
      [ErrorSeverity.ERROR]: 2,
      [ErrorSeverity.CRITICAL]: 3
    };

    return severityLevels[severity] >= severityLevels[this.config.logLevel];
  }

  private logError(errorReport: ErrorReport): void {
    const { errorDetails } = errorReport;
    const logMethod = this.getLogMethod(errorDetails.severity);

    logMethod(
      `[${errorDetails.severity.toUpperCase()}] ${ErrorClassifier.getErrorTitle(errorDetails.category)}:`,
      {
        message: errorDetails.userMessage,
        technical: errorDetails.technicalMessage,
        category: errorDetails.category,
        recoverable: errorDetails.recoverable,
        context: errorDetails.context,
        correlationId: errorDetails.correlationId,
        timestamp: errorDetails.timestamp
      }
    );
  }

  private getLogMethod(severity: ErrorSeverity): typeof console.log {
    switch (severity) {
      case ErrorSeverity.INFO:
        return console.info;
      case ErrorSeverity.WARNING:
        return console.warn;
      case ErrorSeverity.ERROR:
      case ErrorSeverity.CRITICAL:
        return console.error;
      default:
        return console.log;
    }
  }

  private async sendToAnalytics(errorReport: ErrorReport): Promise<void> {
    // Implementation would depend on your analytics service (e.g., Firebase, Mixpanel)
    // For now, this is a placeholder
    try {
      // Analytics.track('error_occurred', {
      //   severity: errorReport.errorDetails.severity,
      //   category: errorReport.errorDetails.category,
      //   correlationId: errorReport.errorDetails.correlationId
      // });
    } catch (error) {
      console.warn('Failed to send error to analytics:', error);
    }
  }

  private async sendToCrashReporting(errorReport: ErrorReport): Promise<void> {
    // Implementation would depend on your crash reporting service (e.g., Crashlytics, Sentry)
    // For now, this is a placeholder
    try {
      // Crashlytics.recordError(errorReport.errorDetails.technicalMessage);
    } catch (error) {
      console.warn('Failed to send error to crash reporting:', error);
    }
  }

  private async notifyHandlers(errorReport: ErrorReport): Promise<void> {
    const handlersToNotify = new Set<ErrorHandler>();

    // Add handlers for specific category
    const categoryHandlers = this.errorHandlers.get(errorReport.errorDetails.category);
    if (categoryHandlers) {
      categoryHandlers.forEach(handler => handlersToNotify.add(handler));
    }

    // Add handlers for all categories
    const allHandlers = this.errorHandlers.get('all');
    if (allHandlers) {
      allHandlers.forEach(handler => handlersToNotify.add(handler));
    }

    // Notify all handlers
    const notifications = Array.from(handlersToNotify).map(async handler => {
      try {
        await handler(errorReport);
      } catch (handlerError) {
        console.error('Error in error handler:', handlerError);
      }
    });

    await Promise.allSettled(notifications);
  }

  private addToHistory(errorReport: ErrorReport): void {
    this.errorHistory.push(errorReport);

    // Trim history if it exceeds max size
    if (this.errorHistory.length > this.maxHistorySize) {
      this.errorHistory = this.errorHistory.slice(-this.maxHistorySize);
    }
  }
}

/**
 * Convenience function for quick error reporting
 */
export const reportError = (error: Error, context?: Record<string, any>) => {
  return ErrorReportingService.getInstance().reportError(error, context);
};

/**
 * Convenience function for creating a try-catch wrapper with automatic error reporting
 */
export const withErrorReporting = <T extends (...args: any[]) => any>(
  fn: T,
  context?: Record<string, any>
): T => {
  return ((...args: any[]) => {
    try {
      const result = fn(...args);

      // Handle promises
      if (result && typeof result.catch === 'function') {
        return result.catch((error: Error) => {
          reportError(error, { ...context, function: fn.name, args });
          throw error;
        });
      }

      return result;
    } catch (error) {
      reportError(error as Error, { ...context, function: fn.name, args });
      throw error;
    }
  }) as T;
};