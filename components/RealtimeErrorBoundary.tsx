import React, { Component, ReactNode } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { RealtimeSubscriptionService } from '../services/RealtimeSubscriptionService';
import { RealtimeFallbackService } from '../services/RealtimeFallbackService';

interface Props {
  children: ReactNode;
  tournamentNo?: string;
  onError?: (error: Error, errorInfo: any) => void;
  fallbackComponent?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: any;
  retryCount: number;
  fallbackActive: boolean;
}

/**
 * Error boundary specifically for real-time components
 * Handles real-time subscription failures and provides fallback mechanisms
 */
export class RealtimeErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      retryCount: 0,
      fallbackActive: false,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: any) {
    // console.error('RealtimeErrorBoundary caught an error:', error, errorInfo);
    
    this.setState({
      error,
      errorInfo,
      retryCount: this.state.retryCount + 1,
    });

    // Call custom error handler if provided
    this.props.onError?.(error, errorInfo);

    // Try to activate fallback if we have a tournament number
    if (this.props.tournamentNo) {
      this.activateFallback();
    }
  }

  private activateFallback = async () => {
    const { tournamentNo } = this.props;
    if (!tournamentNo) return;

    try {
      // console.log(`Activating fallback for tournament ${tournamentNo} due to error boundary`);
      
      const success = await RealtimeFallbackService.startPollingFallback(
        tournamentNo,
        () => {
          // Fallback is working, potentially retry the component
          this.setState({ fallbackActive: true });
        },
        true // Assume live matches for error recovery
      );

      if (success) {
        this.setState({ fallbackActive: true });
      }
    } catch (fallbackError) {
      // console.error('Failed to activate fallback in error boundary:', fallbackError);
    }
  };

  private handleRetry = () => {
    // console.log(`Retrying real-time component (attempt ${this.state.retryCount + 1})`);
    
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      retryCount: this.state.retryCount + 1,
    });

    // If we have a tournament, try to restart the subscription
    if (this.props.tournamentNo) {
      RealtimeSubscriptionService.subscribeTournament(this.props.tournamentNo, true);
    }
  };

  private handleForceFallback = () => {
    const { tournamentNo } = this.props;
    if (!tournamentNo) return;

    // console.log(`Forcing fallback mode for tournament ${tournamentNo}`);
    this.activateFallback();
  };

  render() {
    if (this.state.hasError) {
      // Custom fallback component if provided
      if (this.props.fallbackComponent) {
        return this.props.fallbackComponent;
      }

      // Default error UI with recovery options
      return (
        <View style={styles.errorContainer}>
          <View style={styles.errorContent}>
            <Text style={styles.errorIcon}>⚠️</Text>
            <Text style={styles.errorTitle}>Real-Time Connection Error</Text>
            
            <Text style={styles.errorMessage}>
              {this.state.error?.message || 'Something went wrong with the real-time updates'}
            </Text>

            {this.state.fallbackActive && (
              <View style={styles.fallbackIndicator}>
                <Text style={styles.fallbackText}>📡 Using fallback updates</Text>
              </View>
            )}

            <View style={styles.errorActions}>
              <TouchableOpacity 
                style={styles.retryButton} 
                onPress={this.handleRetry}
              >
                <Text style={styles.retryButtonText}>
                  Retry Connection ({this.state.retryCount}/3)
                </Text>
              </TouchableOpacity>

              {this.props.tournamentNo && !this.state.fallbackActive && (
                <TouchableOpacity 
                  style={styles.fallbackButton} 
                  onPress={this.handleForceFallback}
                >
                  <Text style={styles.fallbackButtonText}>
                    Use Polling Updates
                  </Text>
                </TouchableOpacity>
              )}
            </View>

            {__DEV__ && this.state.errorInfo && (
              <View style={styles.debugInfo}>
                <Text style={styles.debugTitle}>Debug Info:</Text>
                <Text style={styles.debugText}>
                  {this.state.error?.stack}
                </Text>
                <Text style={styles.debugText}>
                  Component Stack: {this.state.errorInfo.componentStack}
                </Text>
              </View>
            )}
          </View>
        </View>
      );
    }

    return this.props.children;
  }
}

/**
 * HOC for wrapping components with real-time error boundary
 */
export function withRealtimeErrorBoundary<P extends object>(
  WrappedComponent: React.ComponentType<P>,
  tournamentNo?: string
) {
  return function RealtimeErrorBoundaryWrapper(props: P) {
    return (
      <RealtimeErrorBoundary tournamentNo={tournamentNo}>
        <WrappedComponent {...props} />
      </RealtimeErrorBoundary>
    );
  };
}

/**
 * Hook for handling real-time errors in functional components
 */
export function useRealtimeErrorHandler(tournamentNo?: string) {
  const [error, setError] = React.useState<Error | null>(null);
  const [retryCount, setRetryCount] = React.useState(0);

  const handleError = React.useCallback((error: Error) => {
    // console.error('Real-time error in functional component:', error);
    setError(error);
    setRetryCount(prev => prev + 1);

    // Try fallback if tournament is provided
    if (tournamentNo) {
      RealtimeFallbackService.startPollingFallback(
        tournamentNo,
        () => {
          // Clear error on successful fallback
          setError(null);
        },
        true
      );
    }
  }, [tournamentNo]);

  const retry = React.useCallback(() => {
    setError(null);
    if (tournamentNo) {
      RealtimeSubscriptionService.subscribeTournament(tournamentNo, true);
    }
  }, [tournamentNo]);

  return {
    error,
    retryCount,
    handleError,
    retry,
  };
}

const styles = StyleSheet.create({
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#f5f5f5',
  },
  errorContent: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 24,
    maxWidth: 400,
    width: '100%',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  errorIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  errorTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
    textAlign: 'center',
  },
  errorMessage: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 20,
  },
  fallbackIndicator: {
    backgroundColor: '#E3F2FD',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginBottom: 20,
  },
  fallbackText: {
    fontSize: 12,
    color: '#1976D2',
    fontWeight: '600',
  },
  errorActions: {
    width: '100%',
    gap: 12,
  },
  retryButton: {
    backgroundColor: '#2196F3',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  retryButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
  fallbackButton: {
    backgroundColor: '#FF9800',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  fallbackButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
  debugInfo: {
    marginTop: 20,
    padding: 12,
    backgroundColor: '#f8f8f8',
    borderRadius: 4,
    width: '100%',
  },
  debugTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#333',
  },
  debugText: {
    fontSize: 10,
    color: '#666',
    fontFamily: 'monospace',
    marginBottom: 4,
  },
});

export default RealtimeErrorBoundary;