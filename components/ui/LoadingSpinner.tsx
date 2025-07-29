import { FC } from 'react';

interface LoadingSpinnerProps {
  size?: 'small' | 'medium' | 'large';
  className?: string;
  label?: string;
  variant?: 'default' | 'retry' | 'inline';
}

export const LoadingSpinner: FC<LoadingSpinnerProps> = ({
  size = 'medium',
  className = '',
  label = 'Loading...',
  variant = 'default'
}) => {
  const sizeClasses = {
    small: 'w-4 h-4',
    medium: 'w-8 h-8',
    large: 'w-12 h-12'
  };

  const variantClasses = {
    default: 'border-gray-200 border-t-blue-600',
    retry: 'border-yellow-200 border-t-yellow-600',
    inline: 'border-gray-300 border-t-gray-600'
  };

  const containerClasses = {
    default: 'flex items-center justify-center',
    retry: 'flex items-center justify-center bg-yellow-50 rounded-lg p-4',
    inline: 'inline-flex items-center'
  };

  return (
    <div
      className={`${containerClasses[variant]} ${className}`}
      role="status"
      aria-live="polite"
      aria-label={label}
    >
      <div
        className={`${sizeClasses[size]} border-4 ${variantClasses[variant]} rounded-full animate-spin`}
        aria-hidden="true"
      />
      {variant === 'retry' && (
        <span className="ml-3 text-sm text-yellow-800 font-medium">{label}</span>
      )}
      {variant === 'inline' && (
        <span className="ml-2 text-sm text-gray-600">{label}</span>
      )}
      {variant === 'default' && (
        <span className="sr-only">{label}</span>
      )}
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

interface ProgressiveLoadingProps {
  steps: Array<{
    label: string;
    completed: boolean;
    current: boolean;
  }>;
  className?: string;
}

export const ProgressiveLoading: FC<ProgressiveLoadingProps> = ({
  steps,
  className = ''
}) => {
  return (
    <div className={`space-y-3 ${className}`} role="status" aria-label="Loading progress">
      <div className="text-center">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Loading Tournament Data</h3>
      </div>
      
      {steps.map((step, index) => (
        <div key={index} className="flex items-center">
          <div className="flex-shrink-0">
            {step.completed ? (
              <div className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center">
                <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
            ) : step.current ? (
              <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center">
                <div className="w-3 h-3 bg-white rounded-full animate-pulse" />
              </div>
            ) : (
              <div className="w-6 h-6 bg-gray-300 rounded-full" />
            )}
          </div>
          <div className="ml-3">
            <p className={`text-sm font-medium ${
              step.completed ? 'text-green-700' : 
              step.current ? 'text-blue-700' : 
              'text-gray-500'
            }`}>
              {step.label}
            </p>
          </div>
          {step.current && (
            <div className="ml-auto">
              <LoadingSpinner size="small" variant="inline" label="" />
            </div>
          )}
        </div>
      ))}
    </div>
  );
};