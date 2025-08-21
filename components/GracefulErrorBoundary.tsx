import React, { Component, ReactNode } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { MissingDataPlaceholder } from './PartialDataIndicator';

interface Props {
  children: ReactNode;
  fallbackData?: any;
  onRetry?: () => void;
  fallbackMessage?: string;
  showFallbackData?: boolean;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: any;
}

/**
 * Error boundary that gracefully handles component failures
 * Shows fallback UI while preserving any available data
 */
export class GracefulErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { 
      hasError: false, 
      error: null,
      errorInfo: null 
    };
  }

  static getDerivedStateFromError(error: Error): State {
    return { 
      hasError: true, 
      error,
      errorInfo: null 
    };
  }

  componentDidCatch(error: Error, errorInfo: any) {
    // console.error('GracefulErrorBoundary caught an error:', error, errorInfo);
    this.setState({
      error,
      errorInfo
    });
  }

  handleRetry = () => {
    this.setState({ 
      hasError: false, 
      error: null,
      errorInfo: null 
    });
    
    if (this.props.onRetry) {
      this.props.onRetry();
    }
  };

  render() {
    if (this.state.hasError) {
      const { 
        fallbackData, 
        fallbackMessage = "Something went wrong, but we've preserved your data", 
        showFallbackData = true 
      } = this.props;

      // If we have fallback data, show it with an error indicator
      if (showFallbackData && fallbackData) {
        return (
          <View style={styles.container}>
            <View style={styles.errorBanner}>
              <Text style={styles.errorIcon}>⚠️</Text>
              <View style={styles.errorTextContainer}>
                <Text style={styles.errorTitle}>Partial Functionality</Text>
                <Text style={styles.errorMessage}>
                  Some features may not work, but your cached data is still available
                </Text>
              </View>
              <TouchableOpacity 
                style={styles.retryButton}
                onPress={this.handleRetry}
              >
                <Text style={styles.retryText}>Retry</Text>
              </TouchableOpacity>
            </View>
            
            {/* Render fallback data */}
            <View style={styles.fallbackDataContainer}>
              {fallbackData}
            </View>
          </View>
        );
      }

      // No fallback data available
      return (
        <MissingDataPlaceholder
          message={fallbackMessage}
          icon="💥"
          onRetry={this.props.onRetry ? this.handleRetry : undefined}
          style={styles.placeholderStyle}
        />
      );
    }

    return this.props.children;
  }
}

/**
 * Hook-based graceful error handler for functional components
 */
export function GracefulErrorHandler({
  error,
  fallbackData,
  onRetry,
  children,
  fallbackMessage = "Unable to load fresh data"
}: {
  error: Error | null;
  fallbackData?: ReactNode;
  onRetry?: () => void;
  children: ReactNode;
  fallbackMessage?: string;
}) {
  if (error) {
    if (fallbackData) {
      return (
        <View style={styles.container}>
          <View style={styles.errorBanner}>
            <Text style={styles.errorIcon}>⚠️</Text>
            <View style={styles.errorTextContainer}>
              <Text style={styles.errorTitle}>Using Cached Data</Text>
              <Text style={styles.errorMessage}>
                {fallbackMessage}, showing cached version
              </Text>
            </View>
            {onRetry && (
              <TouchableOpacity 
                style={styles.retryButton}
                onPress={onRetry}
              >
                <Text style={styles.retryText}>Refresh</Text>
              </TouchableOpacity>
            )}
          </View>
          
          <View style={styles.fallbackDataContainer}>
            {fallbackData}
          </View>
        </View>
      );
    }

    return (
      <MissingDataPlaceholder
        message={fallbackMessage}
        icon="📭"
        onRetry={onRetry}
        style={styles.placeholderStyle}
      />
    );
  }

  return <>{children}</>;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF3E0',
    borderColor: '#FF9800',
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    margin: 8,
  },
  errorIcon: {
    fontSize: 20,
    marginRight: 12,
  },
  errorTextContainer: {
    flex: 1,
  },
  errorTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#E65100',
    marginBottom: 2,
  },
  errorMessage: {
    fontSize: 12,
    color: '#BF360C',
    lineHeight: 16,
  },
  retryButton: {
    backgroundColor: '#FF9800',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 4,
  },
  retryText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  fallbackDataContainer: {
    flex: 1,
  },
  placeholderStyle: {
    margin: 16,
  },
});