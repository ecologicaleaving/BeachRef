import { errorLogger, logError, trackAction, logComponentError } from '../../lib/error-logger';

// Mock console methods
const originalError = console.error;
const originalWarn = console.warn;
const originalGroup = console.group;
const originalGroupEnd = console.groupEnd;

// Mock fetch
global.fetch = jest.fn();
Object.defineProperty(navigator, 'sendBeacon', {
  writable: true,
  value: jest.fn()
});

beforeEach(() => {
  console.error = jest.fn();
  console.warn = jest.fn();
  console.group = jest.fn();
  console.groupEnd = jest.fn();
  
  (fetch as jest.Mock).mockClear();
  (navigator.sendBeacon as jest.Mock).mockClear();
  
  // Clear action sequence
  errorLogger.clearActionSequence();
});

afterEach(() => {
  console.error = originalError;
  console.warn = originalWarn;
  console.group = originalGroup;
  console.groupEnd = originalGroupEnd;
});

describe('ErrorLogger', () => {
  describe('trackAction', () => {
    it('should track user actions', () => {
      trackAction('clicked tournament table');
      trackAction('filtered by country');
      
      const report = errorLogger.createErrorReport('test');
      expect(report.actionSequence).toHaveLength(2);
      expect(report.actionSequence[0]).toContain('clicked tournament table');
      expect(report.actionSequence[1]).toContain('filtered by country');
    });

    it('should limit action sequence to 20 items', () => {
      // Add 25 actions
      for (let i = 0; i < 25; i++) {
        trackAction(`action ${i}`);
      }
      
      const report = errorLogger.createErrorReport('test');
      expect(report.actionSequence).toHaveLength(20);
      // Should contain the last 20 actions
      expect(report.actionSequence[0]).toContain('action 5');
      expect(report.actionSequence[19]).toContain('action 24');
    });
  });

  describe('logError', () => {
    it('should generate unique error IDs', () => {
      const error1 = new Error('Error 1');
      const error2 = new Error('Error 2');
      
      const id1 = logError(error1);
      const id2 = logError(error2);
      
      expect(id1).not.toBe(id2);
      expect(id1).toMatch(/^error_\d+_[a-z0-9]+$/);
      expect(id2).toMatch(/^error_\d+_[a-z0-9]+$/);
    });

    it('should sanitize sensitive data', () => {
      const error = new Error('Test error');
      const sensitiveData = {
        username: 'john',
        password: 'secret123',
        apiKey: 'abc123',
        email: 'john@example.com',
        safeData: 'this is fine'
      };
      
      logError(error, sensitiveData);
      
      // In development mode, sensitive data should be sanitized in context
      expect(console.error).toHaveBeenCalledWith(
        'Context:',
        expect.objectContaining({
          additionalData: expect.objectContaining({
            password: '[REDACTED]',
            apiKey: '[REDACTED]',
            email: '[REDACTED]',
            username: 'john',
            safeData: 'this is fine'
          })
        })
      );
    });

    it('should include context information', () => {
      const error = new Error('Test error');
      
      logError(error);
      
      expect(console.error).toHaveBeenCalledWith(
        'Context:',
        expect.objectContaining({
          timestamp: expect.any(String),
          sessionId: expect.any(String),
          url: expect.any(String)
        })
      );
    });

    it('should log to development console by default', () => {
      const error = new Error('Dev error');
      logError(error);
      
      expect(console.group).toHaveBeenCalledWith('🚨 ERROR: Dev error');
      expect(console.error).toHaveBeenCalledWith('Error ID:', expect.any(String));
      expect(console.groupEnd).toHaveBeenCalled();
    });

    it('should log detailed info in development', () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';
      
      const error = new Error('Dev error');
      logError(error);
      
      expect(console.group).toHaveBeenCalledWith('🚨 ERROR: Dev error');
      expect(console.error).toHaveBeenCalledWith('Error ID:', expect.any(String));
      expect(console.groupEnd).toHaveBeenCalled();
      
      process.env.NODE_ENV = originalEnv;
    });
  });

  describe('logComponentError', () => {
    it('should log component-specific error information', () => {
      const error = new Error('Component error');
      const componentStack = 'at TournamentTable\n  at ErrorBoundary';
      const errorBoundary = 'TournamentErrorBoundary';
      
      const errorId = logComponentError(error, componentStack, errorBoundary);
      
      expect(errorId).toMatch(/^error_\d+_[a-z0-9]+$/);
      expect(console.group).toHaveBeenCalledWith('🚨 ERROR: Component error');
      expect(console.error).toHaveBeenCalledWith('Error ID:', errorId);
    });
  });

  describe('error reporting to service', () => {
    it('should handle error reporting setup', () => {
      // Test basic functionality without mocking internals
      const error = new Error('Service error');
      const errorId = logError(error);
      
      expect(errorId).toMatch(/^error_\d+_[a-z0-9]+$/);
      expect(console.group).toHaveBeenCalledWith('🚨 ERROR: Service error');
    });
  });

  describe('createErrorReport', () => {
    it('should create error report with current context', () => {
      trackAction('user action 1');
      trackAction('user action 2');
      
      const report = errorLogger.createErrorReport('Test summary');
      
      expect(report).toEqual({
        sessionId: expect.any(String),
        actionSequence: expect.arrayContaining([
          expect.stringContaining('user action 1'),
          expect.stringContaining('user action 2')
        ]),
        timestamp: expect.any(String),
        url: 'http://localhost/' // jsdom default URL
      });
    });
  });
});