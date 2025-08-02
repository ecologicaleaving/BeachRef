'use client'

/**
 * Empty Results Component
 * 
 * Empty state component for tournaments without completed results.
 * Displays helpful messaging and retry functionality.
 * 
 * Features:
 * - Empty state messaging for different scenarios
 * - Retry functionality for data loading
 * - Tournament-specific messaging
 * - Responsive design with proper spacing
 * - Accessibility support
 */

import React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Trophy, Calendar, RefreshCw } from 'lucide-react'

interface EmptyResultsProps {
  tournamentName?: string
  onRetry?: () => void
  className?: string
}

export default function EmptyResults({ 
  tournamentName, 
  onRetry,
  className = '' 
}: EmptyResultsProps) {
  
  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Trophy className="h-5 w-5" />
          Tournament Results
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-center py-12 space-y-6">
          {/* Empty State Icon */}
          <div className="flex justify-center">
            <div className="relative">
              <Trophy className="h-24 w-24 text-gray-300" />
              <div className="absolute -bottom-2 -right-2 bg-blue-100 rounded-full p-2">
                <Calendar className="h-6 w-6 text-blue-600" />
              </div>
            </div>
          </div>
          
          {/* Empty State Message */}
          <div className="space-y-2">
            <h3 className="text-xl font-semibold text-gray-900">
              Results Not Available Yet
            </h3>
            <p className="text-gray-600 max-w-md mx-auto">
              {tournamentName 
                ? `Results for ${tournamentName} will be available as matches are completed and the tournament concludes.`
                : 'Tournament results will be available as matches are completed and the tournament concludes.'
              }
            </p>
          </div>
          
          {/* Status Information */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 max-w-md mx-auto">
            <div className="flex items-center gap-2 text-blue-800 mb-2">
              <Calendar className="h-4 w-4" />
              <span className="font-medium text-sm">Tournament Status</span>
            </div>
            <p className="text-blue-700 text-sm">
              Check back during and after the tournament for live updates and final rankings.
            </p>
          </div>
          
          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            {onRetry && (
              <Button 
                variant="outline" 
                onClick={onRetry}
                className="min-h-[48px] flex items-center gap-2"
              >
                <RefreshCw className="h-4 w-4" />
                Check for Updates
              </Button>
            )}
            
            <Button 
              variant="ghost" 
              onClick={() => window.location.reload()}
              className="min-h-[48px] text-gray-600"
            >
              Refresh Page
            </Button>
          </div>
          
          {/* Help Text */}
          <div className="pt-4 border-t border-gray-100">
            <p className="text-xs text-gray-500">
              Results are typically available within minutes of tournament completion.
              {tournamentName && ` ${tournamentName} results will appear here automatically.`}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}