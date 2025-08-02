'use client'

/**
 * Tournament Results Skeleton Component
 * 
 * Loading skeleton for tournament results while data is being fetched.
 * Provides visual feedback during loading states.
 * 
 * Features:
 * - Animated loading skeletons
 * - Proper spacing matching actual components
 * - Progress indicator skeleton
 * - Rankings list skeleton
 * - Responsive design
 */

import React from 'react'
import { Card, CardContent, CardHeader } from '@/components/ui/card'

const SkeletonLine = ({ 
  width = 'w-full', 
  height = 'h-4' 
}: { 
  width?: string
  height?: string 
}) => (
  <div className={`bg-gray-200 rounded animate-pulse ${width} ${height}`} />
)

const SkeletonCard = ({ children }: { children: React.ReactNode }) => (
  <Card>
    <CardHeader>
      <div className="flex items-center gap-2">
        <SkeletonLine width="w-5" height="h-5" />
        <SkeletonLine width="w-48" />
      </div>
    </CardHeader>
    <CardContent>
      {children}
    </CardContent>
  </Card>
)

const TeamRankingSkeleton = () => (
  <Card className="mb-3">
    <CardContent className="p-4">
      <div className="flex items-center justify-between gap-4">
        {/* Rank Badge */}
        <div className="flex-shrink-0">
          <SkeletonLine width="w-12" height="h-8" />
        </div>

        {/* Team Information */}
        <div className="flex-1 space-y-2">
          <SkeletonLine width="w-3/4" height="h-5" />
          <SkeletonLine width="w-1/2" height="h-4" />
          <div className="flex gap-4">
            <SkeletonLine width="w-16" height="h-5" />
            <SkeletonLine width="w-20" height="h-5" />
          </div>
        </div>

        {/* Prize Money */}
        <div className="flex-shrink-0 text-right space-y-1">
          <SkeletonLine width="w-16" height="h-4" />
          <SkeletonLine width="w-20" height="h-5" />
        </div>
      </div>
    </CardContent>
  </Card>
)

export default function TournamentResultsSkeleton() {
  return (
    <div className="space-y-6">
      {/* Tournament Progress Skeleton */}
      <SkeletonCard>
        <div className="space-y-6">
          {/* Progress Bar */}
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <SkeletonLine width="w-40" height="h-4" />
              <SkeletonLine width="w-12" height="h-4" />
            </div>
            <SkeletonLine width="w-full" height="h-3" />
            <div className="flex justify-between">
              <SkeletonLine width="w-16" height="h-3" />
              <SkeletonLine width="w-20" height="h-3" />
            </div>
          </div>

          {/* Statistics Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="text-center space-y-2">
                <SkeletonLine width="w-12 mx-auto" height="h-8" />
                <SkeletonLine width="w-16 mx-auto" height="h-4" />
              </div>
            ))}
          </div>

          {/* Phase Information */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <SkeletonLine width="w-4" height="h-4" />
              <SkeletonLine width="w-32" height="h-5" />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {[...Array(2)].map((_, i) => (
                <div key={i} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-2">
                    <SkeletonLine width="w-4" height="h-4" />
                    <SkeletonLine width="w-24" height="h-4" />
                  </div>
                  <SkeletonLine width="w-16" height="h-6" />
                </div>
              ))}
            </div>
          </div>

          {/* Status */}
          <div className="pt-4 border-t border-gray-100">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <SkeletonLine width="w-4" height="h-4" />
                <SkeletonLine width="w-16" height="h-4" />
              </div>
              <SkeletonLine width="w-24" height="h-6" />
            </div>
          </div>
        </div>
      </SkeletonCard>

      {/* Tournament Rankings Skeleton */}
      <SkeletonCard>
        <div className="space-y-4">
          {/* Section Header */}
          <div className="flex items-center gap-2 pb-2 border-b border-gray-200">
            <SkeletonLine width="w-5" height="h-5" />
            <SkeletonLine width="w-40" height="h-6" />
            <SkeletonLine width="w-20" height="h-4" />
          </div>

          {/* Team Rankings */}
          <div className="space-y-3">
            {[...Array(6)].map((_, i) => (
              <TeamRankingSkeleton key={i} />
            ))}
          </div>

          {/* Show More Button */}
          <div className="pt-4 border-t border-gray-100">
            <SkeletonLine width="w-full" height="h-12" />
          </div>

          {/* Summary Statistics */}
          <div className="pt-4 border-t border-gray-100">
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-center">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="space-y-1">
                  <SkeletonLine width="w-8 mx-auto" height="h-5" />
                  <SkeletonLine width="w-20 mx-auto" height="h-4" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </SkeletonCard>
    </div>
  )
}