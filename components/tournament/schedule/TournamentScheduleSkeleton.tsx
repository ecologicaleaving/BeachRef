'use client'

/**
 * Tournament Schedule Skeleton Component
 * 
 * Loading state component for tournament schedule display.
 * Provides placeholder content while schedule data is being fetched.
 * 
 * Features:
 * - Skeleton structure matching actual schedule layout
 * - Multiple day sections with accordion-like structure
 * - Match card skeletons with proper dimensions
 * - Smooth loading animations
 * - Responsive design for mobile and desktop
 */

import React from 'react'
import { Skeleton } from '@/components/ui/skeleton'
import { Card, CardContent } from '@/components/ui/card'

interface TournamentScheduleSkeletonProps {
  dayCount?: number
  matchesPerDay?: number
  className?: string
}

export default function TournamentScheduleSkeleton({ 
  dayCount = 3, 
  matchesPerDay = 4,
  className = '' 
}: TournamentScheduleSkeletonProps) {
  return (
    <div className={`space-y-4 ${className}`} aria-label="Loading tournament schedule">
      {/* Skeleton for each day section */}
      {Array.from({ length: dayCount }).map((_, dayIndex) => (
        <div key={dayIndex} className="border border-gray-200 rounded-lg">
          {/* Day Header Skeleton */}
          <div className="p-4 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <Skeleton className="h-6 w-40" />
              <Skeleton className="h-5 w-16 rounded-full" />
            </div>
          </div>

          {/* Match Cards Skeleton */}
          <div className="p-4 space-y-3">
            {Array.from({ length: matchesPerDay }).map((_, matchIndex) => (
              <Card key={matchIndex} className="opacity-75">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-4">
                    {/* Match Details Skeleton */}
                    <div className="flex-1 min-w-0">
                      {/* Time and Court Info Skeleton */}
                      <div className="flex items-center gap-4 mb-3">
                        <Skeleton className="h-4 w-12" />
                        <Skeleton className="h-4 w-16" />
                        <Skeleton className="h-3 w-8" />
                      </div>

                      {/* Team Names Skeleton */}
                      <div className="space-y-2">
                        <Skeleton className="h-5 w-32" />
                        <div className="flex justify-center">
                          <Skeleton className="h-4 w-6" />
                        </div>
                        <Skeleton className="h-5 w-36" />
                      </div>
                    </div>

                    {/* Status Badge Skeleton */}
                    <div className="flex-shrink-0">
                      <Skeleton className="h-6 w-20 rounded-full" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      ))}

      {/* Additional loading indicator */}
      <div className="flex justify-center py-4">
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <div className="animate-spin h-4 w-4 border-2 border-gray-300 border-t-gray-600 rounded-full"></div>
          <span>Loading schedule...</span>
        </div>
      </div>
    </div>
  )
}