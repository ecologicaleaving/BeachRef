'use client';

import React from 'react';
import { ErrorBoundary } from './ErrorBoundary';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertTriangle } from 'lucide-react';

interface TournamentErrorBoundaryProps {
  children: React.ReactNode;
}

export function TournamentErrorBoundary({ children }: TournamentErrorBoundaryProps) {
  const handleError = (error: Error, _errorInfo: React.ErrorInfo) => {
    // Log tournament-specific error context
    console.error('Tournament component error:', {
      error: error.message,
      context: 'tournament-table',
      timestamp: new Date().toISOString()
    });
  };

  const fallbackUI = (
    <Alert variant="destructive">
      <AlertTriangle className="h-4 w-4" />
      <AlertTitle>Tournament Data Error</AlertTitle>
      <AlertDescription>
        Unable to display tournament information. The data may be temporarily unavailable.
        
        <div className="mt-3 p-3 bg-background/30 rounded border">
          <h4 className="text-sm font-medium mb-2">What you can do:</h4>
          <ul className="text-sm space-y-1">
            <li className="flex items-start">
              <span className="inline-block w-1 h-1 bg-current rounded-full mt-2 mr-2 flex-shrink-0"></span>
              Check your internet connection
            </li>
            <li className="flex items-start">
              <span className="inline-block w-1 h-1 bg-current rounded-full mt-2 mr-2 flex-shrink-0"></span>
              Try refreshing the page
            </li>
            <li className="flex items-start">
              <span className="inline-block w-1 h-1 bg-current rounded-full mt-2 mr-2 flex-shrink-0"></span>
              The tournament data will be restored when the issue is resolved
            </li>
          </ul>
        </div>

        <div className="mt-3 pt-3 border-t border-current/20">
          <p className="text-xs opacity-75">
            If this problem persists, please contact support
          </p>
        </div>
      </AlertDescription>
    </Alert>
  );

  return (
    <ErrorBoundary
      fallback={fallbackUI}
      onError={handleError}
      title="Tournament Data Error"
      showReloadButton={true}
    >
      {children}
    </ErrorBoundary>
  );
}