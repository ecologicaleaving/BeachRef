/**
 * ErrorClassifier Unit Tests
 * Tests for error classification and recovery strategy logic
 */

import { ErrorClassifier, ErrorSeverity, ErrorCategory, ErrorDetails, ErrorRecoveryStrategy } from './ErrorClassifier';

describe('ErrorClassifier', () => {
  describe('classify', () => {
    it('should classify network errors correctly', () => {
      const networkError = new Error('Network request failed');
      networkError.name = 'NetworkError';

      const result = ErrorClassifier.classify(networkError);

      expect(result.severity).toBe(ErrorSeverity.WARNING);
      expect(result.category).toBe(ErrorCategory.NETWORK);
      expect(result.recoverable).toBe(true);
      expect(result.userMessage).toBe('Connection issue. Please check your internet connection.');
      expect(result.correlationId).toMatch(/^err_\d+_[a-z0-9]+$/);
    });

    it('should classify authentication errors correctly', () => {
      const authError = new Error('Unauthorized access');

      const result = ErrorClassifier.classify(authError);

      expect(result.severity).toBe(ErrorSeverity.ERROR);
      expect(result.category).toBe(ErrorCategory.AUTHENTICATION);
      expect(result.recoverable).toBe(true);
      expect(result.userMessage).toBe('Authentication required. Please log in again.');
    });

    it('should classify authorization errors correctly', () => {
      const forbiddenError = new Error('403 Forbidden');

      const result = ErrorClassifier.classify(forbiddenError);

      expect(result.severity).toBe(ErrorSeverity.ERROR);
      expect(result.category).toBe(ErrorCategory.AUTHORIZATION);
      expect(result.recoverable).toBe(false);
      expect(result.userMessage).toBe('You do not have permission to access this resource.');
    });

    it('should classify validation errors correctly', () => {
      const validationError = new Error('Invalid input format');
      validationError.name = 'ValidationError';

      const result = ErrorClassifier.classify(validationError);

      expect(result.severity).toBe(ErrorSeverity.WARNING);
      expect(result.category).toBe(ErrorCategory.VALIDATION);
      expect(result.recoverable).toBe(true);
      expect(result.userMessage).toBe('Please check your input and try again.');
    });

    it('should classify external service errors correctly', () => {
      const serviceError = new Error('Service unavailable');
      const context = { service: 'vis_api' };

      const result = ErrorClassifier.classify(serviceError, context);

      expect(result.severity).toBe(ErrorSeverity.WARNING);
      expect(result.category).toBe(ErrorCategory.EXTERNAL_SERVICE);
      expect(result.recoverable).toBe(true);
      expect(result.userMessage).toBe('Service temporarily unavailable. Please try again.');
    });

    it('should classify system errors correctly', () => {
      const systemError = new Error('Internal server error');
      systemError.name = 'SystemError';

      const result = ErrorClassifier.classify(systemError);

      expect(result.severity).toBe(ErrorSeverity.CRITICAL);
      expect(result.category).toBe(ErrorCategory.SYSTEM);
      expect(result.recoverable).toBe(false);
      expect(result.userMessage).toBe('An unexpected error occurred. Please contact support.');
    });

    it('should handle unknown errors with default classification', () => {
      const unknownError = new Error('Some unknown error');

      const result = ErrorClassifier.classify(unknownError);

      expect(result.severity).toBe(ErrorSeverity.ERROR);
      expect(result.category).toBe(ErrorCategory.SYSTEM);
      expect(result.recoverable).toBe(false);
      expect(result.userMessage).toBe('An unexpected error occurred.');
    });

    it('should include context in error details', () => {
      const error = new Error('Test error');
      const context = { component: 'test', userId: '123' };

      const result = ErrorClassifier.classify(error, context);

      expect(result.context).toEqual(context);
      expect(result.timestamp).toBeDefined();
    });

    it('should use provided correlation ID from context', () => {
      const error = new Error('Test error');
      const context = { correlationId: 'custom-id-123' };

      const result = ErrorClassifier.classify(error, context);

      expect(result.correlationId).toBe('custom-id-123');
    });
  });

  describe('getRecoveryStrategy', () => {
    it('should provide correct recovery strategy for network errors', () => {
      const errorDetails: ErrorDetails = {
        severity: ErrorSeverity.WARNING,
        category: ErrorCategory.NETWORK,
        recoverable: true,
        userMessage: 'Network error',
        technicalMessage: 'Connection failed',
        timestamp: new Date().toISOString()
      };

      const strategy = ErrorClassifier.getRecoveryStrategy(errorDetails);

      expect(strategy.canRecover).toBe(true);
      expect(strategy.retryable).toBe(true);
      expect(strategy.fallbackAvailable).toBe(true);
      expect(strategy.recommendedAction).toBe('Retry with exponential backoff, enable offline mode if available');
    });

    it('should provide correct recovery strategy for authentication errors', () => {
      const errorDetails: ErrorDetails = {
        severity: ErrorSeverity.ERROR,
        category: ErrorCategory.AUTHENTICATION,
        recoverable: true,
        userMessage: 'Auth required',
        technicalMessage: 'Token expired',
        timestamp: new Date().toISOString()
      };

      const strategy = ErrorClassifier.getRecoveryStrategy(errorDetails);

      expect(strategy.canRecover).toBe(true);
      expect(strategy.retryable).toBe(false);
      expect(strategy.fallbackAvailable).toBe(false);
      expect(strategy.recommendedAction).toBe('Redirect to login screen, clear authentication tokens');
    });

    it('should provide correct recovery strategy for critical system errors', () => {
      const errorDetails: ErrorDetails = {
        severity: ErrorSeverity.CRITICAL,
        category: ErrorCategory.SYSTEM,
        recoverable: false,
        userMessage: 'System error',
        technicalMessage: 'Critical failure',
        timestamp: new Date().toISOString()
      };

      const strategy = ErrorClassifier.getRecoveryStrategy(errorDetails);

      expect(strategy.canRecover).toBe(false);
      expect(strategy.retryable).toBe(false);
      expect(strategy.fallbackAvailable).toBe(true);
      expect(strategy.recommendedAction).toBe('Log error, show generic error message, enable fallback features');
    });
  });

  describe('shouldTriggerCircuitBreaker', () => {
    it('should trigger circuit breaker for network errors', () => {
      const errorDetails: ErrorDetails = {
        severity: ErrorSeverity.WARNING,
        category: ErrorCategory.NETWORK,
        recoverable: true,
        userMessage: 'Network error',
        technicalMessage: 'Connection failed',
        timestamp: new Date().toISOString()
      };

      expect(ErrorClassifier.shouldTriggerCircuitBreaker(errorDetails)).toBe(true);
    });

    it('should trigger circuit breaker for external service errors', () => {
      const errorDetails: ErrorDetails = {
        severity: ErrorSeverity.WARNING,
        category: ErrorCategory.EXTERNAL_SERVICE,
        recoverable: true,
        userMessage: 'Service error',
        technicalMessage: 'API unavailable',
        timestamp: new Date().toISOString()
      };

      expect(ErrorClassifier.shouldTriggerCircuitBreaker(errorDetails)).toBe(true);
    });

    it('should trigger circuit breaker for critical system errors', () => {
      const errorDetails: ErrorDetails = {
        severity: ErrorSeverity.CRITICAL,
        category: ErrorCategory.SYSTEM,
        recoverable: false,
        userMessage: 'System error',
        technicalMessage: 'Critical failure',
        timestamp: new Date().toISOString()
      };

      expect(ErrorClassifier.shouldTriggerCircuitBreaker(errorDetails)).toBe(true);
    });

    it('should not trigger circuit breaker for validation errors', () => {
      const errorDetails: ErrorDetails = {
        severity: ErrorSeverity.WARNING,
        category: ErrorCategory.VALIDATION,
        recoverable: true,
        userMessage: 'Validation error',
        technicalMessage: 'Invalid input',
        timestamp: new Date().toISOString()
      };

      expect(ErrorClassifier.shouldTriggerCircuitBreaker(errorDetails)).toBe(false);
    });
  });

  describe('getErrorTitle', () => {
    it('should return correct titles for all error categories', () => {
      expect(ErrorClassifier.getErrorTitle(ErrorCategory.NETWORK)).toBe('Connection Issue');
      expect(ErrorClassifier.getErrorTitle(ErrorCategory.AUTHENTICATION)).toBe('Authentication Required');
      expect(ErrorClassifier.getErrorTitle(ErrorCategory.AUTHORIZATION)).toBe('Access Denied');
      expect(ErrorClassifier.getErrorTitle(ErrorCategory.VALIDATION)).toBe('Invalid Input');
      expect(ErrorClassifier.getErrorTitle(ErrorCategory.EXTERNAL_SERVICE)).toBe('Service Unavailable');
      expect(ErrorClassifier.getErrorTitle(ErrorCategory.BUSINESS_LOGIC)).toBe('Operation Not Allowed');
      expect(ErrorClassifier.getErrorTitle(ErrorCategory.USER_INPUT)).toBe('Input Error');
      expect(ErrorClassifier.getErrorTitle(ErrorCategory.SYSTEM)).toBe('System Error');
    });
  });
});