import { FC, ReactNode } from 'react';

interface ErrorMessageProps {
  title?: string;
  message: string;
  onRetry?: () => void;
  retryLabel?: string;
  className?: string;
  children?: ReactNode;
  severity?: 'error' | 'warning' | 'info';
}

export const ErrorMessage: FC<ErrorMessageProps> = ({
  title = 'Something went wrong',
  message,
  onRetry,
  retryLabel = 'Try again',
  className = '',
  children,
  severity = 'error'
}) => {
  const severityClasses = {
    error: 'border-red-200 bg-red-50 text-red-800',
    warning: 'border-yellow-200 bg-yellow-50 text-yellow-800',
    info: 'border-blue-200 bg-blue-50 text-blue-800'
  };

  const iconClasses = {
    error: 'text-red-500',
    warning: 'text-yellow-500',
    info: 'text-blue-500'
  };

  const buttonClasses = {
    error: 'bg-red-600 hover:bg-red-700 focus:ring-red-500',
    warning: 'bg-yellow-600 hover:bg-yellow-700 focus:ring-yellow-500',
    info: 'bg-blue-600 hover:bg-blue-700 focus:ring-blue-500'
  };

  return (
    <div
      className={`rounded-lg border p-6 ${severityClasses[severity]} ${className}`}
      role="alert"
      aria-live="assertive"
    >
      <div className="flex items-start">
        {/* Error Icon */}
        <div className={`flex-shrink-0 ${iconClasses[severity]}`}>
          {severity === 'error' && (
            <svg
              className="h-6 w-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"
              />
            </svg>
          )}
          {severity === 'warning' && (
            <svg
              className="h-6 w-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"
              />
            </svg>
          )}
          {severity === 'info' && (
            <svg
              className="h-6 w-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          )}
        </div>

        {/* Error Content */}
        <div className="ml-3 flex-1">
          <h3 className="text-lg font-semibold mb-2">{title}</h3>
          <p className="text-sm mb-4">{message}</p>
          
          {children && <div className="mb-4">{children}</div>}
          
          {onRetry && (
            <button
              onClick={onRetry}
              className={`
                inline-flex items-center px-4 py-2 text-sm font-medium text-white rounded-md
                ${buttonClasses[severity]}
                focus:outline-none focus:ring-2 focus:ring-offset-2
                transition-colors duration-200
                disabled:opacity-50 disabled:cursor-not-allowed
              `}
              type="button"
            >
              <svg
                className="w-4 h-4 mr-2"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                />
              </svg>
              {retryLabel}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

interface TournamentErrorProps {
  error: Error | string;
  onRetry?: () => void;
  className?: string;
}

export const TournamentError: FC<TournamentErrorProps> = ({
  error,
  onRetry,
  className = ''
}) => {
  const errorMessage = typeof error === 'string' ? error : error.message;
  
  // Determine error type and provide user-friendly messages
  const getErrorDetails = (message: string) => {
    if (message.includes('fetch') || message.includes('network')) {
      return {
        title: 'Connection Error',
        message: 'Unable to connect to the tournament service. Please check your internet connection and try again.',
        severity: 'error' as const
      };
    }
    
    if (message.includes('timeout')) {
      return {
        title: 'Request Timeout',
        message: 'The request took too long to complete. Please try again.',
        severity: 'warning' as const
      };
    }
    
    if (message.includes('404') || message.includes('not found')) {
      return {
        title: 'Data Not Available',
        message: 'Tournament data is currently unavailable. Please try again later.',
        severity: 'info' as const
      };
    }
    
    return {
      title: 'Error Loading Tournaments',
      message: 'Tournament data temporarily unavailable. Please try again in a few moments.',
      severity: 'error' as const
    };
  };
  
  const { title, message, severity } = getErrorDetails(errorMessage);
  
  return (
    <ErrorMessage
      title={title}
      message={message}
      severity={severity}
      onRetry={onRetry}
      retryLabel="Reload tournaments"
      className={className}
    >
      <details className="mt-2">
        <summary className="cursor-pointer text-sm font-medium opacity-75 hover:opacity-100">
          Technical details
        </summary>
        <code className="mt-2 block text-xs bg-white bg-opacity-50 p-2 rounded border overflow-x-auto">
          {errorMessage}
        </code>
      </details>
    </ErrorMessage>
  );
};