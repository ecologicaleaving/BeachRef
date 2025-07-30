'use client'

import { FC } from 'react'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'

interface TournamentTableSkeletonProps {
  columns?: number
  rows?: number
  className?: string
  screenSize?: 'mobile' | 'tablet' | 'desktop'
}

export const TournamentTableSkeleton: FC<TournamentTableSkeletonProps> = ({
  columns = 6,
  rows = 8,
  className = '',
  screenSize = 'desktop'
}) => {
  // Responsive column visibility logic matching TournamentRow
  const getVisibleColumns = () => {
    switch (screenSize) {
      case 'mobile':
        return 3 // name, country, startDate
      case 'tablet':
        return 4 // name, country, startDate, gender
      case 'desktop':
        return columns // all columns
      default:
        return columns
    }
  }

  const visibleColumns = getVisibleColumns()

  return (
    <div className={cn('space-y-0', className)} role="status" aria-label="Loading tournament table">
      {/* Table header skeleton */}
      <div className={cn(
        'grid gap-4 mb-4 p-4 bg-muted/30 rounded-t-lg',
        screenSize === 'mobile' ? 'grid-cols-3' : 
        screenSize === 'tablet' ? 'grid-cols-4' : 
        'grid-cols-6'
      )}>
        {Array.from({ length: visibleColumns }).map((_, index) => (
          <Skeleton key={`header-${index}`} className="h-5" />
        ))}
      </div>
      
      {/* Table rows skeleton */}
      {Array.from({ length: rows }).map((_, rowIndex) => (
        <div
          key={`row-${rowIndex}`}
          className={cn(
            'grid gap-4 p-4 border-b border-border last:border-b-0',
            screenSize === 'mobile' ? 'grid-cols-3' : 
            screenSize === 'tablet' ? 'grid-cols-4' : 
            'grid-cols-6'
          )}
        >
          {Array.from({ length: visibleColumns }).map((_, colIndex) => (
            <Skeleton 
              key={`cell-${rowIndex}-${colIndex}`} 
              className={cn(
                'h-4',
                // First column (name) should be wider
                colIndex === 0 && 'h-6',
                // Country column with flag space
                colIndex === 1 && 'h-5'
              )} 
            />
          ))}
        </div>
      ))}
      
      <span className="sr-only">Loading tournament table</span>
    </div>
  )
}

interface TournamentCardSkeletonProps {
  className?: string
  rows?: number
}

export const TournamentCardSkeleton: FC<TournamentCardSkeletonProps> = ({
  className = '',
  rows = 5
}) => {
  return (
    <div className={cn('space-y-5', className)} role="status" aria-label="Loading tournament cards">
      {Array.from({ length: rows }).map((_, index) => (
        <div
          key={`card-${index}`}
          className="p-5 border border-border rounded-lg space-y-4 bg-card"
        >
          {/* Header with name and gender badge */}
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 space-y-2">
              <Skeleton className="h-6 w-3/4" />
              <Skeleton className="h-4 w-1/4" />
            </div>
            <Skeleton className="h-6 w-16 rounded-full" />
          </div>
          
          {/* Country with flag */}
          <div className="flex items-center gap-3">
            <Skeleton className="h-8 w-12 rounded" />
            <div className="flex-1 space-y-1">
              <Skeleton className="h-5 w-32" />
            </div>
            <Skeleton className="h-6 w-8 rounded" />
          </div>

          {/* Dates */}
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Skeleton className="h-4 w-16" />
              <Skeleton className="h-4 w-20" />
            </div>
            <div className="space-y-1">
              <Skeleton className="h-4 w-12" />
              <Skeleton className="h-4 w-20" />
            </div>
          </div>
          
          {/* Tournament type */}
          <div className="pt-3 border-t border-border space-y-1">
            <Skeleton className="h-4 w-12" />
            <Skeleton className="h-4 w-40" />
          </div>
        </div>
      ))}
      
      <span className="sr-only">Loading tournament cards</span>
    </div>
  )
}

interface TournamentProgressiveSkeletonProps {
  steps?: Array<{ label: string; completed: boolean; current: boolean }>
  className?: string
}

export const TournamentProgressiveSkeleton: FC<TournamentProgressiveSkeletonProps> = ({
  steps = [
    { label: 'Connecting to VIS API', completed: false, current: true },
    { label: 'Fetching tournament data', completed: false, current: false },
    { label: 'Processing results', completed: false, current: false },
    { label: 'Loading complete', completed: false, current: false }
  ],
  className = ''
}) => {
  return (
    <div className={cn('space-y-3', className)} role="status" aria-label="Loading progress">
      <div className="text-center mb-4">
        <Skeleton className="h-7 w-48 mx-auto" />
      </div>
      
      {steps.map((step, index) => (
        <div key={index} className="flex items-center">
          <div className="flex-shrink-0">
            {step.completed ? (
              <div className="w-6 h-6 bg-primary rounded-full flex items-center justify-center">
                <svg className="w-4 h-4 text-primary-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
            ) : step.current ? (
              <div className="w-6 h-6 bg-primary rounded-full flex items-center justify-center">
                <div className="w-3 h-3 bg-primary-foreground rounded-full animate-pulse" />
              </div>
            ) : (
              <Skeleton className="w-6 h-6 rounded-full" />
            )}
          </div>
          <div className="ml-3 flex-1">
            <Skeleton className={cn(
              'h-4',
              step.completed || step.current ? 'w-full' : 'w-3/4'
            )} />
          </div>
          {step.current && (
            <div className="ml-auto">
              <Skeleton className="h-4 w-4 rounded-full" />
            </div>
          )}
        </div>
      ))}
    </div>
  )
}