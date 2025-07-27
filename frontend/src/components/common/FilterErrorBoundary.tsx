import { Component, type ErrorInfo, type ReactNode } from 'react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { RefreshCw } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  resetKeys?: Array<string | number>;
}

interface State {
  hasError: boolean;
  error?: Error;
  prevResetKeys?: Array<string | number>;
}

export class FilterErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, prevResetKeys: props.resetKeys };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  static getDerivedStateFromProps(props: Props, state: State): State | null {
    const { prevResetKeys } = state;
    const { resetKeys } = props;
    
    // Reset error state if resetKeys change
    if (prevResetKeys !== resetKeys) {
      if (Array.isArray(resetKeys) && Array.isArray(prevResetKeys)) {
        const hasChanged = resetKeys.length !== prevResetKeys.length || 
                          resetKeys.some((key, idx) => key !== prevResetKeys[idx]);
        if (hasChanged) {
          return {
            hasError: false,
            error: undefined,
            prevResetKeys: resetKeys,
          };
        }
      } else if (resetKeys !== prevResetKeys) {
        return {
          hasError: false,
          error: undefined,
          prevResetKeys: resetKeys,
        };
      }
    }
    
    return { ...state, prevResetKeys: resetKeys };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Filter error boundary caught an error:', error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: undefined });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <Alert variant="destructive" className="m-4">
          <AlertDescription className="flex items-center justify-between">
            <div>
              <strong>Filter Error:</strong> Something went wrong with the filtering system.
              {this.state.error && (
                <details className="mt-2">
                  <summary className="cursor-pointer text-sm">Error Details</summary>
                  <pre className="text-xs mt-1 whitespace-pre-wrap">
                    {this.state.error.message}
                  </pre>
                </details>
              )}
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={this.handleReset}
              className="ml-4"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Reset Filters
            </Button>
          </AlertDescription>
        </Alert>
      );
    }

    return this.props.children;
  }
}