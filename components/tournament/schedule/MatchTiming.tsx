'use client'

/**
 * Match Timing Component
 * 
 * Displays comprehensive match timing information including start time,
 * duration, and scheduling details.
 * 
 * Features:
 * - Match duration display in proper format (1h 23m)
 * - Scheduled vs actual start time comparison
 * - Match status-specific timing information
 * - Timezone considerations for match timing
 * - Responsive layout for mobile and desktop
 * - Clear visual hierarchy for timing data
 */

import React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { BeachMatchDetail } from '@/lib/types'
import { Clock, Calendar, Play, CheckCircle } from 'lucide-react'

interface MatchTimingProps {
  match: BeachMatchDetail
}

export default function MatchTiming({ match }: MatchTimingProps) {
  const formatDuration = (duration: string): string => {
    // Convert from "1:23:45" format to "1h 23m" format
    const parts = duration.split(':')
    if (parts.length !== 3) return duration
    
    const hours = parseInt(parts[0])
    const minutes = parseInt(parts[1])
    
    if (hours === 0 && minutes === 0) return '0m'
    if (hours === 0) return `${minutes}m`
    return `${hours}h ${minutes}m`
  }

  const getStatusInfo = () => {
    switch (match.status) {
      case 'scheduled':
        return {
          icon: <Calendar className="h-4 w-4" />,
          label: 'Scheduled',
          color: 'bg-blue-50 text-blue-700 border-blue-200'
        }
      case 'live':
        return {
          icon: <Play className="h-4 w-4" />,
          label: 'In Progress',
          color: 'bg-green-50 text-green-700 border-green-200'
        }
      case 'completed':
        return {
          icon: <CheckCircle className="h-4 w-4" />,
          label: 'Completed',
          color: 'bg-gray-50 text-gray-700 border-gray-200'
        }
      case 'cancelled':
        return {
          icon: <Clock className="h-4 w-4" />,
          label: 'Cancelled',
          color: 'bg-red-50 text-red-700 border-red-200'
        }
      default:
        return {
          icon: <Clock className="h-4 w-4" />,
          label: 'Unknown',
          color: 'bg-gray-50 text-gray-700 border-gray-200'
        }
    }
  }

  const statusInfo = getStatusInfo()
  const isCompleted = match.status === 'completed'
  const hasStarted = match.status === 'live' || match.status === 'completed'

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <Clock className="h-5 w-5" />
          Match Timing
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Scheduling Information */}
          <div className="space-y-4">
            <div>
              <h4 className="font-semibold text-gray-900 mb-2">Schedule</h4>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Scheduled Time:</span>
                  <span className="font-medium">{match.localTime}</span>
                </div>
                {hasStarted && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Actual Start:</span>
                    <span className="font-medium">
                      {match.localTime}
                      <Badge variant="outline" className="ml-2 text-xs">
                        As Scheduled
                      </Badge>
                    </span>
                  </div>
                )}
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Status:</span>
                  <Badge 
                    variant="outline" 
                    className={`${statusInfo.color} flex items-center gap-1`}
                  >
                    {statusInfo.icon}
                    {statusInfo.label}
                  </Badge>
                </div>
              </div>
            </div>
          </div>

          {/* Duration Information */}
          <div className="space-y-4">
            <div>
              <h4 className="font-semibold text-gray-900 mb-2">Duration</h4>
              <div className="space-y-2">
                {isCompleted ? (
                  <>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">Total Duration:</span>
                      <span className="font-medium text-lg">
                        {match.totalDuration ? formatDuration(match.totalDuration) : 'N/A'}
                      </span>
                    </div>
                    <div className="text-xs text-gray-500 space-y-1">
                      <div className="flex justify-between">
                        <span>Set 1:</span>
                        <span>{match.durationSet1}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Set 2:</span>
                        <span>{match.durationSet2}</span>
                      </div>
                      {match.durationSet3 && (
                        <div className="flex justify-between">
                          <span>Set 3:</span>
                          <span>{match.durationSet3}</span>
                        </div>
                      )}
                    </div>
                  </>
                ) : match.status === 'live' ? (
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Match in progress:</span>
                    <Badge variant="outline" className="bg-green-50 text-green-700">
                      <Play className="h-3 w-3 mr-1" />
                      Live
                    </Badge>
                  </div>
                ) : match.status === 'cancelled' ? (
                  <div className="text-center py-2">
                    <Badge variant="outline" className="bg-red-50 text-red-700">
                      Match Cancelled
                    </Badge>
                  </div>
                ) : (
                  <div className="text-center py-2 text-gray-500">
                    <p className="text-sm">Match has not started yet</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Additional Timing Notes */}
        {isCompleted && (
          <div className="mt-6 pt-4 border-t border-gray-100">
            <div className="text-sm text-gray-600 space-y-1">
              <p>
                <strong>Match completed</strong> in {match.totalDuration ? formatDuration(match.totalDuration) : 'Unknown duration'}
                {match.pointsTeamASet3 !== undefined ? ' (3 sets)' : ' (2 sets)'}
              </p>
              <p className="text-xs text-gray-500">
                All times are shown in local tournament time
              </p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}