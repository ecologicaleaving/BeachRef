'use client'

/**
 * Empty Schedule Component
 * 
 * Handles empty states for tournaments without scheduled matches.
 * Provides appropriate messaging and guidance for different scenarios.
 * 
 * Features:
 * - Different empty state types (no matches, loading error, etc.)
 * - Helpful messaging and guidance for users
 * - Consistent design with tournament detail theme
 * - Accessibility support with proper ARIA labels
 * - Action buttons where appropriate
 */

import React from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Calendar, AlertCircle, RefreshCw } from 'lucide-react'

type EmptyStateType = 'no-matches' | 'loading-error' | 'upcoming-tournament'

interface EmptyScheduleProps {
  type?: EmptyStateType
  tournamentName?: string
  onRetry?: () => void
  className?: string
}

const emptyStateConfig = {
  'no-matches': {
    icon: Calendar,
    title: 'No Matches Scheduled',
    description: 'This tournament does not have any matches scheduled at this time.',
    showRetry: false
  },
  'loading-error': {
    icon: AlertCircle,
    title: 'Unable to Load Schedule',
    description: 'We encountered an issue loading the tournament schedule. Please try again.',
    showRetry: true
  },
  'upcoming-tournament': {
    icon: Calendar,
    title: 'Schedule Not Available Yet',
    description: 'Match schedule will be published closer to the tournament start date.',
    showRetry: false
  }
}

export default function EmptySchedule({ 
  type = 'no-matches',
  tournamentName,
  onRetry,
  className = '' 
}: EmptyScheduleProps) {
  const config = emptyStateConfig[type]
  const IconComponent = config.icon

  return (
    <div className={`flex justify-center py-12 ${className}`}>
      <Card className="w-full max-w-md">
        <CardContent className="p-8 text-center">
          <div className="flex justify-center mb-4">
            <div className="p-3 bg-gray-100 rounded-full">
              <IconComponent 
                className="h-8 w-8 text-gray-600" 
                aria-hidden="true"
              />
            </div>
          </div>

          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            {config.title}
          </h3>

          <p className="text-gray-600 mb-6 leading-relaxed">
            {config.description}
            {tournamentName && (
              <span className="block mt-2 font-medium">
                Tournament: {tournamentName}
              </span>
            )}
          </p>

          {config.showRetry && onRetry && (
            <Button 
              onClick={onRetry}
              variant="outline"
              className="min-h-[44px] px-6"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Try Again
            </Button>
          )}

          {type === 'no-matches' && (
            <div className="mt-4 text-sm text-gray-500">
              <p>Check back later for updates to the match schedule.</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}