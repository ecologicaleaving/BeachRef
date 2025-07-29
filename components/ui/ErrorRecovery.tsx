'use client';

import React, { useState } from 'react';
import { LoadingSpinner } from './LoadingSpinner';
import { RecoveryState } from '@/hooks/useErrorRecovery';

interface ManualRetryButtonProps {
  onRetry: () => Promise<void>;
  disabled?: boolean;
  label?: string;
  className?: string;
}

export function ManualRetryButton({ 
  onRetry, 
  disabled = false, 
  label = 'Try Again',
  className = '' 
}: ManualRetryButtonProps) {
  const [isRetrying, setIsRetrying] = useState(false);

  const handleRetry = async () => {
    if (disabled || isRetrying) return;
    
    setIsRetrying(true);
    try {
      await onRetry();
    } catch (error) {
      // Error handling is managed by parent component
      console.error('Manual retry failed:', error);
    } finally {
      setIsRetrying(false);
    }
  };

  return (
    <button
      onClick={handleRetry}
      disabled={disabled || isRetrying}
      className={`
        inline-flex items-center px-4 py-2 text-sm font-medium text-white
        bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400
        rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2
        transition-colors duration-200 disabled:cursor-not-allowed
        ${className}
      `}
    >
      {isRetrying ? (
        <>
          <LoadingSpinner size="small" variant="inline" label="" />
          <span className="ml-2">Retrying...</span>
        </>
      ) : (
        <>
          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          {label}
        </>
      )}
    </button>
  );
}

interface AutomaticRetryDisplayProps {
  recoveryState: RecoveryState;
  className?: string;
}

export function AutomaticRetryDisplay({ recoveryState, className = '' }: AutomaticRetryDisplayProps) {
  if (!recoveryState.isRetrying) return null;

  return (
    <div className={`flex items-center justify-center p-4 bg-yellow-50 border border-yellow-200 rounded-lg ${className}`}>
      <LoadingSpinner size="small" variant="retry" label={`Attempt ${recoveryState.retryCount + 1} - Retrying...`} />
      {recoveryState.nextRetryIn && (
        <div className="ml-4 text-sm text-yellow-800">
          <p>Automatic retry in progress</p>
          <p className="text-xs opacity-75">
            Next attempt in {Math.ceil(recoveryState.nextRetryIn / 1000)}s
          </p>
        </div>
      )}
    </div>
  );
}

interface ReportIssueButtonProps {
  error?: Error | string;
  context?: Record<string, any>;
  className?: string;
}

export function ReportIssueButton({ error, context, className = '' }: ReportIssueButtonProps) {
  const [isReporting, setIsReporting] = useState(false);
  const [reported, setReported] = useState(false);

  const handleReport = async () => {
    setIsReporting(true);
    
    try {
      // Create error report
      const errorReport = {
        timestamp: new Date().toISOString(),
        error: {
          message: typeof error === 'string' ? error : error?.message || 'Unknown error',
          stack: error instanceof Error ? error.stack : undefined
        },
        context: {
          url: window.location.href,
          userAgent: navigator.userAgent,
          timestamp: Date.now(),
          ...context
        }
      };

      // In a real app, this would send to an error reporting service
      console.error('Error Report:', errorReport);
      
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      setReported(true);
      
      // Reset after 3 seconds
      setTimeout(() => setReported(false), 3000);
      
    } catch (reportError) {
      console.error('Failed to report issue:', reportError);
    } finally {
      setIsReporting(false);
    }
  };

  if (reported) {
    return (
      <div className={`inline-flex items-center px-4 py-2 text-sm text-green-800 bg-green-100 rounded-md ${className}`}>
        <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
        </svg>
        Issue Reported
      </div>
    );
  }

  return (
    <button
      onClick={handleReport}
      disabled={isReporting}
      className={`
        inline-flex items-center px-4 py-2 text-sm font-medium text-gray-700
        bg-white border border-gray-300 hover:bg-gray-50 disabled:bg-gray-100
        rounded-md focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2
        transition-colors duration-200 disabled:cursor-not-allowed
        ${className}
      `}
    >
      {isReporting ? (
        <>
          <LoadingSpinner size="small" variant="inline" label="" />
          <span className="ml-2">Reporting...</span>
        </>
      ) : (
        <>
          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
          </svg>
          Report Issue
        </>
      )}
    </button>
  );
}

interface UserGuidanceProps {
  errorType: 'network' | 'server' | 'client' | 'timeout' | 'unknown';
  className?: string;
}

export function UserGuidance({ errorType, className = '' }: UserGuidanceProps) {
  const guidanceContent = {
    network: {
      title: 'Connection Issues',
      steps: [
        'Check your internet connection',
        'Ensure you&apos;re not behind a restrictive firewall', 
        'Try disabling VPN if active',
        'Refresh the page and try again'
      ],
      icon: (
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.111 16.404a5.5 5.5 0 017.778 0M12 20h.01m-7.08-7.071c3.904-3.905 10.236-3.905 14.141 0M1.394 9.393c5.857-5.857 15.355-5.857 21.213 0" />
      )
    },
    server: {
      title: 'Server Issues',
      steps: [
        'The tournament service is experiencing issues',
        'This is usually temporary and resolves quickly',
        'Try again in a few minutes',
        'Check our status page for updates'
      ],
      icon: (
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2m-2-4h.01M17 16h.01" />
      )
    },
    client: {
      title: 'Application Error',
      steps: [
        'Try refreshing the page',
        'Clear your browser cache and cookies',
        'Update your browser to the latest version',
        'Contact support if the issue persists'
      ],
      icon: (
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
      )
    },
    timeout: {
      title: 'Request Timeout',
      steps: [
        'The request took longer than expected',
        'This might be due to slow internet or server load',
        'Try again with a faster connection',
        'Contact support if timeouts persist'
      ],
      icon: (
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
      )
    },
    unknown: {
      title: 'Unexpected Error',
      steps: [
        'An unexpected error occurred',
        'Try refreshing the page',
        'Clear your browser cache',
        'Report this issue to help us improve'
      ],
      icon: (
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
      )
    }
  };

  const guidance = guidanceContent[errorType];

  return (
    <div className={`bg-blue-50 border border-blue-200 rounded-lg p-4 ${className}`}>
      <div className="flex items-start">
        <div className="flex-shrink-0">
          <div className="w-6 h-6 text-blue-600">
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
              {guidance.icon}
            </svg>
          </div>
        </div>
        <div className="ml-3">
          <h4 className="text-sm font-medium text-blue-900 mb-2">
            {guidance.title}
          </h4>
          <div className="text-sm text-blue-800">
            <p className="mb-2">Here&apos;s what you can try:</p>
            <ol className="list-decimal list-inside space-y-1">
              {guidance.steps.map((step, index) => (
                <li key={index}>{step}</li>
              ))}
            </ol>
          </div>
        </div>
      </div>
    </div>
  );
}