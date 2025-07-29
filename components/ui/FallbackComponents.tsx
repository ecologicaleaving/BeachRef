'use client';

import React from 'react';
import { Tournament } from '@/lib/types';
import { CountryFlag } from './CountryFlag';

interface TournamentFallbackProps {
  onRetry?: () => void;
  className?: string;
}

export function TournamentDataFallback({ onRetry, className = '' }: TournamentFallbackProps) {
  // Mock fallback data for demonstration
  const fallbackTournaments: Tournament[] = [
    {
      code: 'FALLBACK-001',
      name: 'Beach Volleyball World Championships',
      countryCode: 'BR',
      startDate: '2025-08-01',
      endDate: '2025-08-15',
      gender: 'Mixed',
      type: 'World Championship'
    },
    {
      code: 'FALLBACK-002',
      name: 'Olympic Beach Volleyball Tournament',
      countryCode: 'FR',
      startDate: '2025-07-25',
      endDate: '2025-08-05',
      gender: 'Men',
      type: 'Olympic Games'
    }
  ];

  return (
    <div className={`border border-blue-200 bg-blue-50 rounded-lg p-6 ${className}`}>
      <div className="mb-4">
        <div className="flex items-center mb-3">
          <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center mr-3">
            <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-blue-900">
            Showing Sample Tournament Data
          </h3>
        </div>
        <p className="text-blue-800 mb-4">
          Live tournament data is temporarily unavailable. Here&apos;s a preview of recent tournaments:
        </p>
      </div>

      {/* Fallback tournament table */}
      <div className="bg-white rounded-lg border border-blue-200 overflow-hidden mb-4">
        <div className="grid grid-cols-3 lg:grid-cols-6 gap-4 p-4 bg-blue-100 font-medium text-blue-900">
          <div>Tournament</div>
          <div>Country</div>
          <div>Date</div>
          <div className="hidden lg:block">Type</div>
          <div className="hidden lg:block">Gender</div>
          <div className="hidden lg:block">Code</div>
        </div>
        
        {fallbackTournaments.map((tournament, index) => (
          <div key={tournament.code} className={`grid grid-cols-3 lg:grid-cols-6 gap-4 p-4 ${index % 2 === 0 ? 'bg-white' : 'bg-blue-25'} border-b border-blue-100 last:border-b-0`}>
            <div className="font-medium text-blue-900">{tournament.name}</div>
            <div className="flex items-center">
              <CountryFlag countryCode={tournament.countryCode} size="sm" className="mr-2" />
              <span className="text-blue-800">{tournament.countryCode}</span>
            </div>
            <div className="text-blue-700">{new Date(tournament.startDate).toLocaleDateString()}</div>
            <div className="hidden lg:block text-blue-700">{tournament.type}</div>
            <div className="hidden lg:block text-blue-700">{tournament.gender}</div>
            <div className="hidden lg:block text-blue-600 font-mono text-sm">{tournament.code}</div>
          </div>
        ))}
      </div>

      <div className="flex items-center justify-between">
        <div className="text-sm text-blue-600">
          <p className="font-medium">Data Status:</p>
          <ul className="mt-1 space-y-1 text-xs">
            <li>• Sample data shown for demonstration</li>
            <li>• Live data will be restored automatically</li>
            <li>• Refresh to check for updates</li>
          </ul>
        </div>
        
        {onRetry && (
          <button
            onClick={onRetry}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors"
          >
            Retry Live Data
          </button>
        )}
      </div>
    </div>
  );
}

interface OfflineDetectorProps {
  children: React.ReactNode;
}

export function OfflineDetector({ children }: OfflineDetectorProps) {
  const [isOnline, setIsOnline] = React.useState(true);

  React.useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    // Set initial state
    setIsOnline(navigator.onLine);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  if (!isOnline) {
    return (
      <div className="border border-orange-200 bg-orange-50 rounded-lg p-6 text-center">
        <div className="mb-4">
          <div className="mx-auto w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center mb-3">
            <svg className="w-6 h-6 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 5.636l-3.536 3.536m0 5.656l3.536 3.536M9.172 9.172L5.636 5.636m3.536 9.192L5.636 18.364M12 2.25a9.75 9.75 0 11-9.75 9.75 9.75 9.75 0 019.75-9.75z" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-orange-900 mb-2">
            You&apos;re Offline
          </h3>
          <p className="text-orange-700 mb-4">
            No internet connection detected. Tournament data may not be current.
          </p>
        </div>

        <div className="space-y-2">
          <p className="text-sm text-orange-600">
            <strong>What you can do:</strong>
          </p>
          <ul className="text-sm text-orange-600 space-y-1">
            <li>• Check your internet connection</li>
            <li>• View cached tournament data below</li>
            <li>• The app will update automatically when you&apos;re back online</li>
          </ul>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}

interface FallbackCountryFlagProps {
  countryCode: string;
  size?: 'small' | 'medium' | 'large';
  className?: string;
}

export function FallbackCountryFlag({ countryCode, size = 'medium', className = '' }: FallbackCountryFlagProps) {
  const sizeClasses = {
    small: 'w-4 h-3',
    medium: 'w-6 h-4',
    large: 'w-8 h-6'
  };

  return (
    <div
      className={`${sizeClasses[size]} bg-gray-200 border border-gray-300 rounded flex items-center justify-center ${className}`}
      title={`Flag for ${countryCode}`}
      role="img"
      aria-label={`Country flag for ${countryCode}`}
    >
      <span className="text-xs font-mono text-gray-600" style={{ fontSize: size === 'small' ? '8px' : size === 'medium' ? '10px' : '12px' }}>
        {countryCode}
      </span>
    </div>
  );
}

interface CachedDataDisplayProps {
  data: Tournament[];
  lastUpdated?: string;
  onRefresh?: () => void;
  className?: string;
}

export function CachedDataDisplay({ data, lastUpdated, onRefresh, className = '' }: CachedDataDisplayProps) {
  const formatLastUpdated = (dateString?: string) => {
    if (!dateString) return 'Unknown';
    
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffHours / 24);

    if (diffDays > 0) {
      return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
    } else if (diffHours > 0) {
      return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    } else {
      return 'Less than an hour ago';
    }
  };

  return (
    <div className={`border border-gray-200 bg-gray-50 rounded-lg p-4 ${className}`}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center">
          <div className="w-6 h-6 bg-gray-400 rounded-full flex items-center justify-center mr-2">
            <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div>
            <h4 className="text-sm font-medium text-gray-900">Cached Tournament Data</h4>
            <p className="text-xs text-gray-600">Last updated: {formatLastUpdated(lastUpdated)}</p>
          </div>
        </div>
        
        {onRefresh && (
          <button
            onClick={onRefresh}
            className="px-3 py-1 text-xs bg-gray-600 text-white rounded hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
          >
            Refresh
          </button>
        )}
      </div>

      <p className="text-sm text-gray-700 mb-3">
        Showing {data.length} tournaments from cache. Data may not reflect the latest updates.
      </p>
      
      <div className="text-xs text-gray-500 bg-white rounded border p-2">
        <strong>Note:</strong> This data was cached during your last successful connection. 
        Tournament schedules may have changed since then.
      </div>
    </div>
  );
}