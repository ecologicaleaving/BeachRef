export interface ErrorContext {
  timestamp: string;
  url: string;
  userAgent: string;
  userId?: string;
  sessionId?: string;
  actionSequence?: string[];
  additionalData?: Record<string, any>;
}

export interface ErrorReport {
  id: string;
  level: 'error' | 'warning' | 'info';
  message: string;
  stack?: string;
  context: ErrorContext;
  componentStack?: string;
  errorBoundary?: string;
  retryCount?: number;
  resolved?: boolean;
}

class ErrorLogger {
  private actionSequence: string[] = [];
  private sessionId: string;
  private isProduction: boolean;

  constructor() {
    this.sessionId = this.generateSessionId();
    this.isProduction = process.env.NODE_ENV === 'production';
    
    // Initialize error listeners in browser environment
    if (typeof window !== 'undefined') {
      this.initializeGlobalErrorHandlers();
    }
  }

  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private initializeGlobalErrorHandlers(): void {
    // Handle unhandled promise rejections
    window.addEventListener('unhandledrejection', (event) => {
      this.logError(new Error(event.reason), {
        type: 'unhandled_promise_rejection',
        reason: event.reason
      });
    });

    // Handle global JavaScript errors
    window.addEventListener('error', (event) => {
      this.logError(new Error(event.message), {
        type: 'global_error',
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno
      });
    });
  }

  private sanitizeData(data: any): any {
    if (typeof data !== 'object' || data === null) {
      return data;
    }

    const sensitiveKeys = [
      'password', 'token', 'key', 'secret', 'auth', 'credential',
      'email', 'phone', 'ssn', 'credit', 'card', 'cvv'
    ];

    const sanitized = { ...data };

    Object.keys(sanitized).forEach(key => {
      const lowerKey = key.toLowerCase();
      const isSensitive = sensitiveKeys.some(sensitive => lowerKey.includes(sensitive));
      
      if (isSensitive) {
        sanitized[key] = '[REDACTED]';
      } else if (typeof sanitized[key] === 'object') {
        sanitized[key] = this.sanitizeData(sanitized[key]);
      }
    });

    return sanitized;
  }

  private createContext(additionalData?: Record<string, any>): ErrorContext {
    const context: ErrorContext = {
      timestamp: new Date().toISOString(),
      url: typeof window !== 'undefined' ? window.location.href : 'unknown',
      userAgent: typeof window !== 'undefined' ? window.navigator.userAgent : 'unknown',
      sessionId: this.sessionId,
      actionSequence: [...this.actionSequence],
    };

    if (additionalData) {
      context.additionalData = this.sanitizeData(additionalData);
    }

    return context;
  }

  public trackAction(action: string): void {
    this.actionSequence.push(`${new Date().toISOString()}: ${action}`);
    
    // Keep only last 20 actions to prevent memory issues
    if (this.actionSequence.length > 20) {
      this.actionSequence = this.actionSequence.slice(-20);
    }
  }

  public logError(
    error: Error, 
    additionalData?: Record<string, any>,
    level: 'error' | 'warning' | 'info' = 'error'
  ): string {
    const errorId = `error_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const errorReport: ErrorReport = {
      id: errorId,
      level,
      message: error.message,
      stack: error.stack,
      context: this.createContext(additionalData)
    };

    if (this.isProduction) {
      this.logToConsole(errorReport);
      this.sendToService(errorReport);
    } else {
      this.logToDevelopment(errorReport);
    }

    return errorId;
  }

  public logComponentError(
    error: Error,
    componentStack: string,
    errorBoundary: string,
    additionalData?: Record<string, any>
  ): string {
    const errorId = this.logError(error, {
      ...additionalData,
      type: 'component_error',
      errorBoundary
    });

    // Update the logged error with component information
    const context = this.createContext(additionalData);

    if (this.isProduction) {
      console.error('React Component Error:', {
        errorId,
        component: errorBoundary,
        message: error.message,
        stack: error.stack,
        componentStack
      });
    }

    return errorId;
  }

  public logRetryAttempt(
    operation: string,
    attempt: number,
    error: Error,
    willRetry: boolean
  ): void {
    this.logError(error, {
      type: 'retry_attempt',
      operation,
      attempt,
      willRetry
    }, willRetry ? 'warning' : 'error');
  }

  private logToConsole(errorReport: ErrorReport): void {
    const logData = {
      id: errorReport.id,
      level: errorReport.level,
      message: errorReport.message,
      timestamp: errorReport.context.timestamp,
      url: errorReport.context.url,
      sessionId: errorReport.context.sessionId,
      ...(errorReport.context.additionalData || {})
    };

    console.error('Production Error:', logData);
  }

  private logToDevelopment(errorReport: ErrorReport): void {
    console.group(`🚨 ${errorReport.level.toUpperCase()}: ${errorReport.message}`);
    console.error('Error ID:', errorReport.id);
    console.error('Stack:', errorReport.stack);
    
    if (errorReport.componentStack) {
      console.error('Component Stack:', errorReport.componentStack);
    }
    
    console.error('Context:', errorReport.context);
    console.groupEnd();
  }

  private async sendToService(errorReport: ErrorReport): Promise<void> {
    try {
      // In a real application, this would send to an error reporting service
      // like Sentry, LogRocket, Bugsnag, etc.
      
      // For now, we'll simulate the API call
      if (typeof window !== 'undefined' && 'sendBeacon' in navigator) {
        // Use sendBeacon for reliable error reporting
        const data = JSON.stringify({
          service: 'beachref-error-logger',
          error: errorReport
        });
        
        navigator.sendBeacon('/api/errors', data);
      } else {
        // Fallback to fetch
        fetch('/api/errors', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(errorReport)
        }).catch(() => {
          // Silently fail - we don't want error logging to cause more errors
        });
      }
    } catch (logError) {
      // Silently fail error logging to prevent infinite loops
      console.warn('Failed to send error report:', logError);
    }
  }

  public createErrorReport(_summary: string): {
    sessionId: string;
    actionSequence: string[];
    timestamp: string;
    url: string;
  } {
    return {
      sessionId: this.sessionId,
      actionSequence: [...this.actionSequence],
      timestamp: new Date().toISOString(),
      url: typeof window !== 'undefined' ? window.location.href : 'unknown'
    };
  }

  public clearActionSequence(): void {
    this.actionSequence = [];
  }
}

// Export singleton instance
export const errorLogger = new ErrorLogger();

// Convenience functions
export const logError = (error: Error, additionalData?: Record<string, any>) => 
  errorLogger.logError(error, additionalData);

export const logComponentError = (
  error: Error, 
  componentStack: string, 
  errorBoundary: string,
  additionalData?: Record<string, any>
) => errorLogger.logComponentError(error, componentStack, errorBoundary, additionalData);

export const trackAction = (action: string) => errorLogger.trackAction(action);

export const logRetryAttempt = (
  operation: string,
  attempt: number,
  error: Error,
  willRetry: boolean
) => errorLogger.logRetryAttempt(operation, attempt, error, willRetry);