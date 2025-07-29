'use client';

import React from 'react';
import { ErrorBoundary } from './ErrorBoundary';

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
    <div className="border border-red-200 bg-red-50 rounded-lg p-6 text-center">
      <div className="mb-4">
        <div className="mx-auto w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mb-3">
          <svg
            className="w-6 h-6 text-red-600"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
        </div>
        <h3 className="text-lg font-medium text-red-900 mb-2">
          Tournament Data Error
        </h3>
        <p className="text-red-700 mb-4">
          Unable to display tournament information. The data may be temporarily unavailable.
        </p>
      </div>

      <div className="space-y-2">
        <p className="text-sm text-red-600">
          <strong>What you can do:</strong>
        </p>
        <ul className="text-sm text-red-600 space-y-1">
          <li>• Check your internet connection</li>
          <li>• Try refreshing the page</li>
          <li>• The tournament data will be restored when the issue is resolved</li>
        </ul>
      </div>

      <div className="mt-4 pt-4 border-t border-red-200">
        <p className="text-xs text-red-500">
          If this problem persists, please contact support
        </p>
      </div>
    </div>
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