import { FC } from 'react';

interface LoadingSpinnerProps {
  size?: 'small' | 'medium' | 'large';
  className?: string;
  label?: string;
}

export const LoadingSpinner: FC<LoadingSpinnerProps> = ({
  size = 'medium',
  className = '',
  label = 'Loading...'
}) => {
  const sizeClasses = {
    small: 'w-4 h-4',
    medium: 'w-8 h-8',
    large: 'w-12 h-12'
  };

  return (
    <div
      className={`flex items-center justify-center ${className}`}
      role="status"
      aria-live="polite"
      aria-label={label}
    >
      <div
        className={`${sizeClasses[size]} border-4 border-gray-200 border-t-blue-600 rounded-full animate-spin`}
        aria-hidden="true"
      />
      <span className="sr-only">{label}</span>
    </div>
  );
};

interface LoadingSkeletonProps {
  rows?: number;
  className?: string;
}

export const LoadingSkeleton: FC<LoadingSkeletonProps> = ({
  rows = 5,
  className = ''
}) => {
  return (
    <div className={`animate-pulse ${className}`} role="status" aria-label="Loading tournament data">
      {Array.from({ length: rows }).map((_, index) => (
        <div
          key={index}
          className="h-12 bg-gray-200 rounded mb-2 last:mb-0"
          aria-hidden="true"
        />
      ))}
      <span className="sr-only">Loading tournament data</span>
    </div>
  );
};

interface TableLoadingSkeletonProps {
  columns?: number;
  rows?: number;
  className?: string;
}

export const TableLoadingSkeleton: FC<TableLoadingSkeletonProps> = ({
  columns = 6,
  rows = 8,
  className = ''
}) => {
  return (
    <div className={`animate-pulse ${className}`} role="status" aria-label="Loading tournament table">
      {/* Table header skeleton */}
      <div className="grid grid-cols-3 lg:grid-cols-6 gap-4 mb-4 p-4 bg-gray-50 rounded-t-lg">
        {Array.from({ length: columns }).map((_, index) => (
          <div
            key={`header-${index}`}
            className={`h-5 bg-gray-300 rounded ${index >= 3 ? 'hidden lg:block' : ''}`}
            aria-hidden="true"
          />
        ))}
      </div>
      
      {/* Table rows skeleton */}
      {Array.from({ length: rows }).map((_, rowIndex) => (
        <div
          key={`row-${rowIndex}`}
          className="grid grid-cols-3 lg:grid-cols-6 gap-4 p-4 border-b border-gray-200 last:border-b-0"
        >
          {Array.from({ length: columns }).map((_, colIndex) => (
            <div
              key={`cell-${rowIndex}-${colIndex}`}
              className={`h-4 bg-gray-200 rounded ${colIndex >= 3 ? 'hidden lg:block' : ''}`}
              aria-hidden="true"
            />
          ))}
        </div>
      ))}
      
      <span className="sr-only">Loading tournament table</span>
    </div>
  );
};