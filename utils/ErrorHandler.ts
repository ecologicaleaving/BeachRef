import { Alert } from 'react-native';

export interface AppError {
  code: string;
  message: string;
  details?: Record<string, any>;
  timestamp: Date;
  source: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
}

export class ErrorHandler {
  private static logError(error: AppError): void {
    // console.error(`[${error.severity.toUpperCase()}] ${error.code}: ${error.message}`, {
    //   source: error.source,
    //   details: error.details,
    //   timestamp: error.timestamp,
    // });
  }

  private static shouldShowAlert(severity: AppError['severity']): boolean {
    return ['medium', 'high', 'critical'].includes(severity);
  }

  private static getErrorMessage(error: AppError): string {
    const messages: Record<string, string> = {
      'NETWORK_ERROR': 'Connection problem. Please check your internet connection.',
      'API_ERROR': 'Server error. Please try again later.',
      'VALIDATION_ERROR': 'Invalid data provided.',
      'NOT_FOUND': 'Requested data was not found.',
      'PERMISSION_DENIED': 'You do not have permission to perform this action.',
      'TOURNAMENT_NOT_SELECTED': 'Please select a tournament first.',
      'NO_REFEREES_FOUND': 'No referees found for this tournament.',
      'NO_COURTS_FOUND': 'No courts found for this tournament.',
      'NO_MATCHES_FOUND': 'No matches found.',
      'LOAD_FAILED': 'Failed to load data. Please try again.',
      'CACHE_ERROR': 'Cache error occurred.',
      'DATE_INVALID': 'Invalid date provided.',
    };

    return messages[error.code] || error.message || 'An unexpected error occurred.';
  }

  static handle(error: Partial<AppError> & { code: string; source: string }): void {
    const appError: AppError = {
      message: 'An error occurred',
      details: {},
      timestamp: new Date(),
      severity: 'medium',
      ...error,
    };

    this.logError(appError);

    if (this.shouldShowAlert(appError.severity)) {
      const userMessage = this.getErrorMessage(appError);
      const title = appError.severity === 'critical' ? 'Critical Error' : 'Error';
      
      Alert.alert(title, userMessage);
    }
  }

  static handleNetworkError(url: string, status?: number, details?: any): void {
    this.handle({
      code: 'NETWORK_ERROR',
      message: `Network request failed: ${url}`,
      source: 'api',
      severity: 'high',
      details: { url, status, ...details },
    });
  }

  static handleApiError(endpoint: string, error: any): void {
    this.handle({
      code: 'API_ERROR',
      message: `API request failed: ${endpoint}`,
      source: 'api',
      severity: 'high',
      details: { endpoint, error: error.message || error },
    });
  }

  static handleValidationError(field: string, value: any, rule: string): void {
    this.handle({
      code: 'VALIDATION_ERROR',
      message: `Validation failed for ${field}`,
      source: 'validation',
      severity: 'medium',
      details: { field, value, rule },
    });
  }

  static handleNotFound(resource: string, identifier?: string): void {
    this.handle({
      code: 'NOT_FOUND',
      message: `${resource} not found${identifier ? `: ${identifier}` : ''}`,
      source: 'data',
      severity: 'medium',
      details: { resource, identifier },
    });
  }

  static handleLoadingError(operation: string, error: any): void {
    this.handle({
      code: 'LOAD_FAILED',
      message: `Failed to ${operation}`,
      source: 'operation',
      severity: 'high',
      details: { operation, error: error.message || error },
    });
  }

  static handleCacheError(key: string, operation: 'read' | 'write' | 'delete', error: any): void {
    this.handle({
      code: 'CACHE_ERROR',
      message: `Cache ${operation} failed for key: ${key}`,
      source: 'cache',
      severity: 'low',
      details: { key, operation, error: error.message || error },
    });
  }

  static handleTournamentError(tournamentNo?: string): void {
    this.handle({
      code: 'TOURNAMENT_NOT_SELECTED',
      message: 'No tournament selected',
      source: 'tournament',
      severity: 'medium',
      details: { tournamentNo },
    });
  }

  static handleDateError(date: string, operation: string): void {
    this.handle({
      code: 'DATE_INVALID',
      message: `Invalid date for ${operation}`,
      source: 'date',
      severity: 'medium',
      details: { date, operation },
    });
  }

  // Async error handler for promises
  static async handleAsync<T>(
    operation: () => Promise<T>,
    errorContext: { source: string; operation: string }
  ): Promise<T | null> {
    try {
      return await operation();
    } catch (error) {
      this.handleLoadingError(errorContext.operation, error);
      return null;
    }
  }

  // Wrapper for React components to handle errors gracefully
  static wrapComponent<T extends (...args: any[]) => any>(
    fn: T,
    errorContext: { source: string; operation: string }
  ): T {
    return ((...args: any[]) => {
      try {
        return fn(...args);
      } catch (error) {
        this.handle({
          code: 'COMPONENT_ERROR',
          message: `Component error in ${errorContext.operation}`,
          source: errorContext.source,
          severity: 'high',
          details: { error: error.message || error, args },
        });
        return null;
      }
    }) as T;
  }
}