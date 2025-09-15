/**
 * Error Boundary Components
 * Part of Error Handling Strategy Unification Refactoring
 * Provides React error boundary integration with centralized error reporting
 */

import React, { Component, ReactNode } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { ErrorReportingService, ErrorReport } from './ErrorReportingService';
import { ErrorSeverity, ErrorCategory } from './ErrorClassifier';

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (errorReport: ErrorReport) => void;
  enableReporting?: boolean;
  context?: Record<string, any>;
}

interface ErrorBoundaryState {
  hasError: boolean;
  errorReport: ErrorReport | null;
  retryCount: number;
}

/**
 * Enhanced Error Boundary with centralized error reporting
 */
export class EnhancedErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  private errorReportingService: ErrorReportingService;

  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      errorReport: null,
      retryCount: 0
    };

    this.errorReportingService = ErrorReportingService.getInstance();
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return {
      hasError: true
    };
  }

  async componentDidCatch(error: Error, errorInfo: any) {
    try {
      const context = {
        ...this.props.context,
        componentStack: errorInfo.componentStack,
        errorBoundary: true,
        retryCount: this.state.retryCount
      };

      const errorReport = await this.errorReportingService.reportError(error, context);

      this.setState({ errorReport });

      // Call custom error handler if provided
      if (this.props.onError) {
        this.props.onError(errorReport);
      }
    } catch (reportingError) {
      console.error('Failed to report error in boundary:', reportingError);
    }
  }

  handleRetry = () => {
    this.setState(prevState => ({
      hasError: false,
      errorReport: null,
      retryCount: prevState.retryCount + 1
    }));
  };

  render() {
    if (this.state.hasError) {
      // Custom fallback UI
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Default error UI
      return (
        <ErrorFallbackUI
          errorReport={this.state.errorReport}
          onRetry={this.handleRetry}
          retryCount={this.state.retryCount}
        />
      );
    }

    return this.props.children;
  }
}

/**
 * Error Fallback UI Component
 */
interface ErrorFallbackUIProps {
  errorReport: ErrorReport | null;
  onRetry: () => void;
  retryCount: number;
  maxRetries?: number;
}

const ErrorFallbackUI: React.FC<ErrorFallbackUIProps> = ({
  errorReport,
  onRetry,
  retryCount,
  maxRetries = 3
}) => {
  const showRetryButton = retryCount < maxRetries && errorReport?.recoveryStrategy.retryable;

  const getErrorIcon = () => {
    if (!errorReport) return '⚠️';

    switch (errorReport.errorDetails.severity) {
      case ErrorSeverity.CRITICAL:
        return '🚨';
      case ErrorSeverity.ERROR:
        return '❌';
      case ErrorSeverity.WARNING:
        return '⚠️';
      case ErrorSeverity.INFO:
        return 'ℹ️';
      default:
        return '⚠️';
    }
  };

  const getErrorTitle = () => {
    if (!errorReport) return 'Something went wrong';

    switch (errorReport.errorDetails.category) {
      case ErrorCategory.NETWORK:
        return 'Connection Issue';
      case ErrorCategory.AUTHENTICATION:
        return 'Authentication Required';
      case ErrorCategory.AUTHORIZATION:
        return 'Access Denied';
      case ErrorCategory.VALIDATION:
        return 'Invalid Data';
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
  };

  return (
    <View style={styles.container}>
      <View style={styles.errorCard}>
        <Text style={styles.errorIcon}>{getErrorIcon()}</Text>

        <Text style={styles.errorTitle}>{getErrorTitle()}</Text>

        <Text style={styles.errorMessage}>
          {errorReport?.errorDetails.userMessage || 'An unexpected error occurred.'}
        </Text>

        {errorReport?.errorDetails.correlationId && (
          <Text style={styles.correlationId}>
            Error ID: {errorReport.errorDetails.correlationId}
          </Text>
        )}

        <View style={styles.buttonContainer}>
          {showRetryButton && (
            <TouchableOpacity style={styles.retryButton} onPress={onRetry}>
              <Text style={styles.retryButtonText}>Try Again</Text>
            </TouchableOpacity>
          )}
        </View>

        {retryCount > 0 && (
          <Text style={styles.retryCount}>
            Attempt {retryCount + 1} of {maxRetries + 1}
          </Text>
        )}
      </View>
    </View>
  );
};

/**
 * Hook-based error handler for functional components
 */
export const useErrorHandler = (context?: Record<string, any>) => {
  const errorReportingService = ErrorReportingService.getInstance();

  return React.useCallback(
    async (error: Error, additionalContext?: Record<string, any>) => {
      return await errorReportingService.reportError(error, {
        ...context,
        ...additionalContext
      });
    },
    [errorReportingService, context]
  );
};

/**
 * HOC for wrapping components with error boundary
 */
export const withErrorBoundary = <P extends object>(
  Component: React.ComponentType<P>,
  errorBoundaryProps?: Omit<ErrorBoundaryProps, 'children'>
) => {
  const WrappedComponent = (props: P) => (
    <EnhancedErrorBoundary {...errorBoundaryProps}>
      <Component {...props} />
    </EnhancedErrorBoundary>
  );

  WrappedComponent.displayName = `withErrorBoundary(${Component.displayName || Component.name})`;

  return WrappedComponent;
};

/**
 * Error boundary specifically for async operations
 */
export const AsyncErrorBoundary: React.FC<{
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error) => void;
}> = ({ children, fallback, onError }) => {
  const [error, setError] = React.useState<Error | null>(null);
  const handleError = useErrorHandler({ boundary: 'async' });

  React.useEffect(() => {
    if (error) {
      handleError(error);
      if (onError) {
        onError(error);
      }
    }
  }, [error, handleError, onError]);

  // Reset error on children change
  React.useEffect(() => {
    setError(null);
  }, [children]);

  if (error) {
    return fallback ? <>{fallback}</> : <ErrorFallbackUI errorReport={null} onRetry={() => setError(null)} retryCount={0} />;
  }

  return (
    <ErrorProvider onError={setError}>
      {children}
    </ErrorProvider>
  );
};

/**
 * Context for propagating async errors
 */
const ErrorContext = React.createContext<{
  reportError: (error: Error) => void;
} | null>(null);

const ErrorProvider: React.FC<{
  children: ReactNode;
  onError: (error: Error) => void;
}> = ({ children, onError }) => {
  const reportError = React.useCallback((error: Error) => {
    onError(error);
  }, [onError]);

  return (
    <ErrorContext.Provider value={{ reportError }}>
      {children}
    </ErrorContext.Provider>
  );
};

export const useAsyncErrorHandler = () => {
  const context = React.useContext(ErrorContext);
  return context?.reportError || (() => {});
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#f8f9fa',
  },
  errorCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 24,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
    maxWidth: 400,
    width: '100%',
  },
  errorIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 8,
    textAlign: 'center',
  },
  errorMessage: {
    fontSize: 16,
    color: '#6b7280',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 16,
  },
  correlationId: {
    fontSize: 12,
    color: '#9ca3af',
    fontFamily: 'monospace',
    marginBottom: 16,
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  retryButton: {
    backgroundColor: '#3b82f6',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  retryCount: {
    fontSize: 12,
    color: '#9ca3af',
    marginTop: 8,
  },
});