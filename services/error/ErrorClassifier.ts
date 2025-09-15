/**
 * Error Classification and Handling System
 * Part of Error Handling Strategy Unification Refactoring
 * Provides centralized error classification, reporting, and recovery strategies
 */

export enum ErrorSeverity {
  INFO = 'info',
  WARNING = 'warning',
  ERROR = 'error',
  CRITICAL = 'critical'
}

export enum ErrorCategory {
  NETWORK = 'network',
  VALIDATION = 'validation',
  AUTHENTICATION = 'authentication',
  AUTHORIZATION = 'authorization',
  BUSINESS_LOGIC = 'business_logic',
  SYSTEM = 'system',
  USER_INPUT = 'user_input',
  EXTERNAL_SERVICE = 'external_service'
}

export interface ErrorDetails {
  severity: ErrorSeverity;
  category: ErrorCategory;
  recoverable: boolean;
  userMessage: string;
  technicalMessage: string;
  context?: Record<string, any>;
  timestamp: string;
  correlationId?: string;
}

export interface ErrorRecoveryStrategy {
  canRecover: boolean;
  retryable: boolean;
  fallbackAvailable: boolean;
  recommendedAction: string;
}

/**
 * Centralized error classification service
 * Analyzes errors and provides consistent classification across the application
 */
export class ErrorClassifier {
  /**
   * Classify an error and provide detailed information
   */
  static classify(error: Error, context?: Record<string, any>): ErrorDetails {
    const errorMessage = error.message.toLowerCase();
    const errorName = error.name.toLowerCase();

    // Network-related errors
    if (this.isNetworkError(error, errorMessage)) {
      return this.createErrorDetails(
        ErrorSeverity.WARNING,
        ErrorCategory.NETWORK,
        true,
        'Connection issue. Please check your internet connection.',
        error.message,
        context
      );
    }

    // Authentication errors
    if (this.isAuthenticationError(errorMessage, errorName)) {
      return this.createErrorDetails(
        ErrorSeverity.ERROR,
        ErrorCategory.AUTHENTICATION,
        true,
        'Authentication required. Please log in again.',
        error.message,
        context
      );
    }

    // Authorization errors
    if (this.isAuthorizationError(errorMessage, errorName)) {
      return this.createErrorDetails(
        ErrorSeverity.ERROR,
        ErrorCategory.AUTHORIZATION,
        false,
        'You do not have permission to access this resource.',
        error.message,
        context
      );
    }

    // Validation errors
    if (this.isValidationError(errorMessage, errorName)) {
      return this.createErrorDetails(
        ErrorSeverity.WARNING,
        ErrorCategory.VALIDATION,
        true,
        'Please check your input and try again.',
        error.message,
        context
      );
    }

    // External service errors
    if (this.isExternalServiceError(errorMessage, context)) {
      return this.createErrorDetails(
        ErrorSeverity.WARNING,
        ErrorCategory.EXTERNAL_SERVICE,
        true,
        'Service temporarily unavailable. Please try again.',
        error.message,
        context
      );
    }

    // System errors
    if (this.isSystemError(errorMessage, errorName)) {
      return this.createErrorDetails(
        ErrorSeverity.CRITICAL,
        ErrorCategory.SYSTEM,
        false,
        'An unexpected error occurred. Please contact support.',
        error.message,
        context
      );
    }

    // Default classification for unknown errors
    return this.createErrorDetails(
      ErrorSeverity.ERROR,
      ErrorCategory.SYSTEM,
      false,
      'An unexpected error occurred.',
      error.message,
      context
    );
  }

  /**
   * Get recovery strategy for an error
   */
  static getRecoveryStrategy(errorDetails: ErrorDetails): ErrorRecoveryStrategy {
    switch (errorDetails.category) {
      case ErrorCategory.NETWORK:
        return {
          canRecover: true,
          retryable: true,
          fallbackAvailable: true,
          recommendedAction: 'Retry with exponential backoff, enable offline mode if available'
        };

      case ErrorCategory.AUTHENTICATION:
        return {
          canRecover: true,
          retryable: false,
          fallbackAvailable: false,
          recommendedAction: 'Redirect to login screen, clear authentication tokens'
        };

      case ErrorCategory.AUTHORIZATION:
        return {
          canRecover: false,
          retryable: false,
          fallbackAvailable: true,
          recommendedAction: 'Show access denied message, redirect to appropriate screen'
        };

      case ErrorCategory.VALIDATION:
        return {
          canRecover: true,
          retryable: false,
          fallbackAvailable: false,
          recommendedAction: 'Show validation errors, focus on invalid fields'
        };

      case ErrorCategory.EXTERNAL_SERVICE:
        return {
          canRecover: true,
          retryable: true,
          fallbackAvailable: true,
          recommendedAction: 'Retry with circuit breaker, use cached data if available'
        };

      case ErrorCategory.BUSINESS_LOGIC:
        return {
          canRecover: true,
          retryable: false,
          fallbackAvailable: false,
          recommendedAction: 'Show business rule violation message, guide user correction'
        };

      case ErrorCategory.USER_INPUT:
        return {
          canRecover: true,
          retryable: false,
          fallbackAvailable: false,
          recommendedAction: 'Highlight invalid input, provide helpful guidance'
        };

      case ErrorCategory.SYSTEM:
      default:
        return {
          canRecover: errorDetails.severity !== ErrorSeverity.CRITICAL,
          retryable: errorDetails.severity === ErrorSeverity.WARNING,
          fallbackAvailable: true,
          recommendedAction: 'Log error, show generic error message, enable fallback features'
        };
    }
  }

  // Private helper methods for error type detection

  private static isNetworkError(error: Error, message: string): boolean {
    return (
      error.name === 'NetworkError' ||
      error.name === 'TimeoutError' ||
      message.includes('network') ||
      message.includes('timeout') ||
      message.includes('connection') ||
      message.includes('fetch') ||
      message.includes('offline') ||
      message.includes('unreachable')
    );
  }

  private static isAuthenticationError(message: string, name: string): boolean {
    return (
      name.includes('auth') ||
      message.includes('unauthorized') ||
      message.includes('401') ||
      message.includes('authentication') ||
      message.includes('login') ||
      message.includes('token')
    );
  }

  private static isAuthorizationError(message: string, name: string): boolean {
    return (
      message.includes('forbidden') ||
      message.includes('403') ||
      message.includes('permission') ||
      message.includes('access denied') ||
      message.includes('not allowed')
    );
  }

  private static isValidationError(message: string, name: string): boolean {
    return (
      name.includes('validation') ||
      message.includes('invalid') ||
      message.includes('required') ||
      message.includes('format') ||
      message.includes('400') ||
      message.includes('bad request')
    );
  }

  private static isExternalServiceError(message: string, context?: Record<string, any>): boolean {
    return (
      message.includes('service unavailable') ||
      message.includes('502') ||
      message.includes('503') ||
      message.includes('504') ||
      context?.source === 'external_api' ||
      context?.service === 'vis_api'
    );
  }

  private static isSystemError(message: string, name: string): boolean {
    return (
      name.includes('system') ||
      name.includes('internal') ||
      message.includes('500') ||
      message.includes('internal server') ||
      message.includes('unexpected')
    );
  }

  private static createErrorDetails(
    severity: ErrorSeverity,
    category: ErrorCategory,
    recoverable: boolean,
    userMessage: string,
    technicalMessage: string,
    context?: Record<string, any>
  ): ErrorDetails {
    return {
      severity,
      category,
      recoverable,
      userMessage,
      technicalMessage,
      context,
      timestamp: new Date().toISOString(),
      correlationId: context?.correlationId || this.generateCorrelationId()
    };
  }

  private static generateCorrelationId(): string {
    return `err_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Check if an error should trigger a circuit breaker
   */
  static shouldTriggerCircuitBreaker(errorDetails: ErrorDetails): boolean {
    return (
      errorDetails.category === ErrorCategory.NETWORK ||
      errorDetails.category === ErrorCategory.EXTERNAL_SERVICE ||
      (errorDetails.category === ErrorCategory.SYSTEM && errorDetails.severity === ErrorSeverity.CRITICAL)
    );
  }

  /**
   * Get user-friendly error title based on category
   */
  static getErrorTitle(category: ErrorCategory): string {
    switch (category) {
      case ErrorCategory.NETWORK:
        return 'Connection Issue';
      case ErrorCategory.AUTHENTICATION:
        return 'Authentication Required';
      case ErrorCategory.AUTHORIZATION:
        return 'Access Denied';
      case ErrorCategory.VALIDATION:
        return 'Invalid Input';
      case ErrorCategory.EXTERNAL_SERVICE:
        return 'Service Unavailable';
      case ErrorCategory.BUSINESS_LOGIC:
        return 'Operation Not Allowed';
      case ErrorCategory.USER_INPUT:
        return 'Input Error';
      case ErrorCategory.SYSTEM:
      default:
        return 'System Error';
    }
  }
}