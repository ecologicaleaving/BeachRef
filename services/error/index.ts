/**
 * Unified Error Handling System
 * Part of Error Handling Strategy Unification Refactoring
 *
 * This module provides:
 * - Centralized error classification and reporting
 * - React error boundary integration
 * - Consistent error handling patterns
 * - User-friendly error messaging
 * - Error analytics and recovery strategies
 */

// Core error handling
export { ErrorClassifier } from './ErrorClassifier';
export type {
  ErrorDetails,
  ErrorRecoveryStrategy
} from './ErrorClassifier';
export {
  ErrorSeverity,
  ErrorCategory
} from './ErrorClassifier';

// Error reporting service
export { ErrorReportingService, reportError, withErrorReporting } from './ErrorReportingService';
export type {
  ErrorReportingConfig,
  ErrorReport,
  ErrorHandler
} from './ErrorReportingService';

// React components and hooks
export {
  EnhancedErrorBoundary,
  AsyncErrorBoundary,
  useErrorHandler,
  useAsyncErrorHandler,
  withErrorBoundary
} from './ErrorBoundaryComponents';

/**
 * Quick Start Guide:
 *
 * 1. Basic Error Reporting:
 * ```typescript
 * import { reportError } from '../services/error';
 *
 * try {
 *   // risky operation
 * } catch (error) {
 *   await reportError(error, { context: 'user_action' });
 * }
 * ```
 *
 * 2. Function Wrapper with Auto-Reporting:
 * ```typescript
 * import { withErrorReporting } from '../services/error';
 *
 * const safeFunction = withErrorReporting(
 *   originalFunction,
 *   { service: 'api_client' }
 * );
 * ```
 *
 * 3. React Error Boundary:
 * ```tsx
 * import { EnhancedErrorBoundary } from '../services/error';
 *
 * <EnhancedErrorBoundary context={{ screen: 'tournament_list' }}>
 *   <TournamentList />
 * </EnhancedErrorBoundary>
 * ```
 *
 * 4. Hook for Functional Components:
 * ```tsx
 * import { useErrorHandler } from '../services/error';
 *
 * const handleError = useErrorHandler({ component: 'tournament_card' });
 *
 * const fetchData = async () => {
 *   try {
 *     // async operation
 *   } catch (error) {
 *     await handleError(error);
 *   }
 * };
 * ```
 *
 * 5. Error Handler Registration:
 * ```typescript
 * import { ErrorReportingService, ErrorCategory } from '../services/error';
 *
 * const errorService = ErrorReportingService.getInstance();
 *
 * // Handle network errors specifically
 * errorService.addErrorHandler(ErrorCategory.NETWORK, (errorReport) => {
 *   // Enable offline mode, show network error message, etc.
 * });
 * ```
 */

/**
 * Error Handling Best Practices:
 *
 * 1. Always provide context when reporting errors
 * 2. Use appropriate error boundaries for UI components
 * 3. Handle different error categories appropriately
 * 4. Provide user-friendly error messages
 * 5. Enable fallback functionality when possible
 * 6. Log errors appropriately based on severity
 * 7. Use correlation IDs for error tracking
 * 8. Implement retry logic for recoverable errors
 */

/**
 * Migration from Existing Error Handling:
 *
 * OLD (Inconsistent):
 * ```typescript
 * try {
 *   // operation
 * } catch (error) {
 *   console.error('Failed:', error);
 *   throw new Error('Operation failed');
 * }
 * ```
 *
 * NEW (Unified):
 * ```typescript
 * import { reportError } from '../services/error';
 *
 * try {
 *   // operation
 * } catch (error) {
 *   const errorReport = await reportError(error, { operation: 'data_fetch' });
 *
 *   if (errorReport.recoveryStrategy.fallbackAvailable) {
 *     // Use cached data or alternative approach
 *   } else {
 *     throw error; // Re-throw if no recovery possible
 *   }
 * }
 * ```
 */