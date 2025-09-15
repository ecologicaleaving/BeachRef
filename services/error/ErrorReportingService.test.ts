/**
 * ErrorReportingService Unit Tests
 * Tests for centralized error reporting and handler management
 */

import { ErrorReportingService, ErrorReportingConfig, ErrorReport, reportError, withErrorReporting } from './ErrorReportingService';
import { ErrorSeverity, ErrorCategory } from './ErrorClassifier';

// Mock console methods to avoid test noise
const mockConsoleError = jest.fn();
const mockConsoleWarn = jest.fn();
const mockConsoleInfo = jest.fn();

jest.spyOn(console, 'error').mockImplementation(mockConsoleError);
jest.spyOn(console, 'warn').mockImplementation(mockConsoleWarn);
jest.spyOn(console, 'info').mockImplementation(mockConsoleInfo);

describe('ErrorReportingService', () => {
  let errorService: ErrorReportingService;

  beforeEach(() => {
    // Reset singleton instance for each test
    (ErrorReportingService as any).instance = null;

    // Clear mock calls
    mockConsoleError.mockClear();
    mockConsoleWarn.mockClear();
    mockConsoleInfo.mockClear();
  });

  afterEach(() => {
    if (errorService) {
      errorService.clearHistory();
    }
  });

  describe('getInstance', () => {
    it('should return singleton instance', () => {
      const instance1 = ErrorReportingService.getInstance();
      const instance2 = ErrorReportingService.getInstance();

      expect(instance1).toBe(instance2);
    });

    it('should initialize with custom config', async () => {
      const customConfig: Partial<ErrorReportingConfig> = {
        enableConsoleLogging: false,
        logLevel: ErrorSeverity.ERROR
      };

      const instance = ErrorReportingService.getInstance(customConfig);

      // Test by checking if console logging is disabled
      const testError = new Error('Test error');
      await instance.reportError(testError);

      expect(mockConsoleError).not.toHaveBeenCalled();
      expect(mockConsoleWarn).not.toHaveBeenCalled();
      expect(mockConsoleInfo).not.toHaveBeenCalled();
    });
  });

  describe('reportError', () => {
    beforeEach(() => {
      errorService = ErrorReportingService.getInstance();
    });

    it('should report and classify error correctly', async () => {
      const testError = new Error('Network timeout');
      testError.name = 'NetworkError';

      const result = await errorService.reportError(testError);

      expect(result.errorDetails.category).toBe(ErrorCategory.NETWORK);
      expect(result.errorDetails.severity).toBe(ErrorSeverity.WARNING);
      expect(result.handled).toBe(true);
      expect(result.reportedAt).toBeDefined();
    });

    it('should log error to console when enabled', async () => {
      const testError = new Error('Test error');

      await errorService.reportError(testError);

      expect(mockConsoleError).toHaveBeenCalledWith(
        expect.stringContaining('[ERROR] System Error:'),
        expect.objectContaining({
          message: expect.any(String),
          category: ErrorCategory.SYSTEM
        })
      );
    });

    it('should respect log level configuration', async () => {
      // Set log level to ERROR, so WARNING should not be logged
      errorService.updateConfig({ logLevel: ErrorSeverity.ERROR });

      const warningError = new Error('Network timeout');
      warningError.name = 'NetworkError'; // This classifies as WARNING

      await errorService.reportError(warningError);

      expect(mockConsoleWarn).not.toHaveBeenCalled();
    });

    it('should include context in error report', async () => {
      const testError = new Error('Test error');
      const context = { component: 'TestComponent', userId: '123' };

      const result = await errorService.reportError(testError, context);

      expect(result.errorDetails.context).toEqual(context);
    });

    it('should handle reporting errors gracefully', async () => {
      // Create an error that would cause issues during reporting
      const problematicError = new Error('Test error');

      // Mock console.error to throw to simulate reporting failure
      mockConsoleError.mockImplementationOnce(() => {
        throw new Error('Console error failed');
      });

      // Should not throw even if console.error fails
      const result = await errorService.reportError(problematicError);

      // Should still return a result even if reporting partially fails
      expect(result.errorDetails).toBeDefined();
      // Note: handled may be false if logging fails, but error classification still works
      expect(result.handled).toBeDefined();
    });
  });

  describe('addErrorHandler', () => {
    beforeEach(() => {
      errorService = ErrorReportingService.getInstance();
    });

    it('should register and call error handlers', async () => {
      const handler = jest.fn();

      const unsubscribe = errorService.addErrorHandler(ErrorCategory.NETWORK, handler);

      const networkError = new Error('Network error');
      networkError.name = 'NetworkError';

      await errorService.reportError(networkError);

      expect(handler).toHaveBeenCalledWith(
        expect.objectContaining({
          errorDetails: expect.objectContaining({
            category: ErrorCategory.NETWORK
          })
        })
      );

      // Test unsubscribe
      unsubscribe();
      handler.mockClear();

      await errorService.reportError(networkError);
      expect(handler).not.toHaveBeenCalled();
    });

    it('should call handlers registered for all categories', async () => {
      const allHandler = jest.fn();

      errorService.addErrorHandler('all', allHandler);

      const testError = new Error('Test error');
      await errorService.reportError(testError);

      expect(allHandler).toHaveBeenCalled();
    });

    it('should handle handler errors gracefully', async () => {
      const faultyHandler = jest.fn(() => {
        throw new Error('Handler error');
      });

      errorService.addErrorHandler(ErrorCategory.SYSTEM, faultyHandler);

      const testError = new Error('Test error');

      // Should not throw even if handler fails
      await expect(errorService.reportError(testError)).resolves.toBeDefined();

      expect(mockConsoleError).toHaveBeenCalledWith(
        'Error in error handler:',
        expect.any(Error)
      );
    });
  });

  describe('getErrorStatistics', () => {
    beforeEach(() => {
      errorService = ErrorReportingService.getInstance();
    });

    it('should return correct error statistics', async () => {
      // Report different types of errors
      const networkError = new Error('Network error');
      networkError.name = 'NetworkError';

      const authError = new Error('Unauthorized');

      await errorService.reportError(networkError);
      await errorService.reportError(authError);

      const stats = errorService.getErrorStatistics();

      expect(stats.totalErrors).toBe(2);
      expect(stats.errorsBySeverity[ErrorSeverity.WARNING]).toBe(1); // Network error
      expect(stats.errorsBySeverity[ErrorSeverity.ERROR]).toBe(1);   // Auth error
      expect(stats.errorsByCategory[ErrorCategory.NETWORK]).toBe(1);
      expect(stats.errorsByCategory[ErrorCategory.AUTHENTICATION]).toBe(1);
      expect(stats.recentErrors).toHaveLength(2);
      expect(stats.criticalErrors).toHaveLength(0);
    });

    it('should track critical errors separately', async () => {
      const criticalError = new Error('Internal server error');
      criticalError.name = 'SystemError';

      await errorService.reportError(criticalError);

      const stats = errorService.getErrorStatistics();

      expect(stats.criticalErrors).toHaveLength(1);
      expect(stats.criticalErrors[0].errorDetails.severity).toBe(ErrorSeverity.CRITICAL);
    });
  });

  describe('createScopedReporter', () => {
    beforeEach(() => {
      errorService = ErrorReportingService.getInstance();
    });

    it('should create scoped reporter with context', async () => {
      const scopeContext = { component: 'TestComponent' };
      const scopedReporter = errorService.createScopedReporter(scopeContext);

      const testError = new Error('Scoped error');
      const additionalContext = { action: 'button_click' };

      const result = await scopedReporter.report(testError, additionalContext);

      expect(result.errorDetails.context).toEqual({
        ...scopeContext,
        ...additionalContext
      });
    });
  });

  describe('clearHistory', () => {
    beforeEach(() => {
      errorService = ErrorReportingService.getInstance();
    });

    it('should clear error history', async () => {
      const testError = new Error('Test error');
      await errorService.reportError(testError);

      expect(errorService.getErrorStatistics().totalErrors).toBe(1);

      errorService.clearHistory();

      expect(errorService.getErrorStatistics().totalErrors).toBe(0);
    });
  });
});

describe('reportError convenience function', () => {
  it('should use singleton instance', async () => {
    const testError = new Error('Test error');
    const context = { source: 'convenience_function' };

    const result = await reportError(testError, context);

    expect(result.errorDetails.context).toEqual(context);
  });
});

describe('withErrorReporting wrapper', () => {
  it('should wrap synchronous functions', () => {
    const originalFn = jest.fn(() => 'success');
    const wrappedFn = withErrorReporting(originalFn, { source: 'test' });

    const result = wrappedFn('arg1', 'arg2');

    expect(result).toBe('success');
    expect(originalFn).toHaveBeenCalledWith('arg1', 'arg2');
  });

  it('should report synchronous errors', () => {
    const errorToThrow = new Error('Sync error');
    const originalFn = jest.fn(() => {
      throw errorToThrow;
    });

    const wrappedFn = withErrorReporting(originalFn, { source: 'test' });

    expect(() => wrappedFn()).toThrow(errorToThrow);

    // Error reporting happens synchronously for sync errors, so we can check immediately
    const stats = ErrorReportingService.getInstance().getErrorStatistics();
    expect(stats.totalErrors).toBeGreaterThan(0);
  });

  it('should handle promise rejections', async () => {
    const errorToThrow = new Error('Async error');
    const originalFn = jest.fn(() => Promise.reject(errorToThrow));

    const wrappedFn = withErrorReporting(originalFn, { source: 'async_test' });

    await expect(wrappedFn()).rejects.toThrow(errorToThrow);

    const stats = ErrorReportingService.getInstance().getErrorStatistics();
    expect(stats.totalErrors).toBeGreaterThan(0);
  });

  it('should handle successful promises', async () => {
    const originalFn = jest.fn(() => Promise.resolve('async success'));
    const wrappedFn = withErrorReporting(originalFn);

    const result = await wrappedFn();

    expect(result).toBe('async success');
  });
});