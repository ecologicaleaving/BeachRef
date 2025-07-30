import { FC, ReactNode } from 'react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { AlertTriangle, AlertCircle, Info, RefreshCw } from 'lucide-react';

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
  const getAlertVariant = (severity: 'error' | 'warning' | 'info') => {
    switch (severity) {
      case 'error':
        return 'destructive';
      case 'warning':
        return 'warning';
      case 'info':
        return 'default';
      default:
        return 'default';
    }
  };

  const getIcon = (severity: 'error' | 'warning' | 'info') => {
    switch (severity) {
      case 'error':
        return <AlertTriangle className="h-4 w-4" />;
      case 'warning':
        return <AlertCircle className="h-4 w-4" />;
      case 'info':
        return <Info className="h-4 w-4" />;
      default:
        return <AlertTriangle className="h-4 w-4" />;
    }
  };

  return (
    <Alert variant={getAlertVariant(severity)} className={className}>
      {getIcon(severity)}
      <AlertTitle>{title}</AlertTitle>
      <AlertDescription>
        {message}
        
        {children && <div className="mt-3">{children}</div>}
        
        {onRetry && (
          <Button 
            variant="outline" 
            size="sm" 
            onClick={onRetry}
            className="mt-3 min-h-[44px]"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            {retryLabel}
          </Button>
        )}
      </AlertDescription>
    </Alert>
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
  
  // Determine error type and provide user-friendly messages with guidance
  const getErrorDetails = (message: string) => {
    if (message.includes('fetch') || message.includes('network') || message.includes('Network error')) {
      return {
        title: 'Connection Error',
        message: 'Unable to connect to the tournament service. Please check your internet connection and try again.',
        severity: 'error' as const,
        guidance: [
          'Check your internet connection',
          'Try refreshing the page',
          'Disable VPN if active',
          'Contact support if the problem persists'
        ]
      };
    }
    
    if (message.includes('timeout') || message.includes('AbortError')) {
      return {
        title: 'Request Timeout',
        message: 'The request took too long to complete. The server may be experiencing high load.',
        severity: 'warning' as const,
        guidance: [
          'Try again in a few moments',
          'Check your internet speed',
          'The service will automatically retry'
        ]
      };
    }
    
    if (message.includes('404') || message.includes('not found')) {
      return {
        title: 'Data Not Available',
        message: 'Tournament data is currently unavailable. This may be temporary.',
        severity: 'info' as const,
        guidance: [
          'Tournament schedules may be updated',
          'Try again in a few minutes',
          'Check the official FIVB website for updates'
        ]
      };
    }
    
    if (message.includes('500') || message.includes('502') || message.includes('503')) {
      return {
        title: 'Service Temporarily Unavailable',
        message: 'The tournament service is experiencing technical difficulties.',
        severity: 'warning' as const,
        guidance: [
          'This is usually temporary',
          'Try again in a few minutes',
          'The system will recover automatically'
        ]
      };
    }
    
    return {
      title: 'Error Loading Tournaments',
      message: 'Tournament data temporarily unavailable. Please try again in a few moments.',
      severity: 'error' as const,
      guidance: [
        'Try refreshing the page',
        'Check your internet connection',
        'Contact support if the issue continues'
      ]
    };
  };
  
  const { title, message, severity, guidance } = getErrorDetails(errorMessage);
  
  return (
    <ErrorMessage
      title={title}
      message={message}
      severity={severity}
      onRetry={onRetry}
      retryLabel="Reload tournaments"
      className={className}
    >
      {guidance && (
        <div className="mt-3 p-3 bg-background/30 rounded border">
          <h4 className="text-sm font-medium mb-2">What you can do:</h4>
          <ul className="text-sm space-y-1">
            {guidance.map((item, index) => (
              <li key={index} className="flex items-start">
                <span className="inline-block w-1 h-1 bg-current rounded-full mt-2 mr-2 flex-shrink-0"></span>
                {item}
              </li>
            ))}
          </ul>
        </div>
      )}
      
      <details className="mt-3">
        <summary className="cursor-pointer text-sm font-medium opacity-75 hover:opacity-100">
          Technical details
        </summary>
        <code className="mt-2 block text-xs bg-background/50 p-2 rounded border overflow-x-auto">
          {errorMessage}
        </code>
      </details>
    </ErrorMessage>
  );
};