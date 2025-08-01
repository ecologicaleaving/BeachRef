'use client'

/**
 * Court Venue Info Component
 * 
 * Displays court assignment and venue details for beach volleyball matches.
 * Shows court number, surface type, and venue information.
 * 
 * Features:
 * - Court number and surface type display
 * - Match round and tournament phase information
 * - Match importance indicators (qualification, main draw, finals)
 * - Weather conditions for outdoor courts (if relevant)
 * - Venue assignment details
 * - Responsive layout for mobile and desktop
 */

import React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { MockBeachMatchDetail } from '@/lib/mock-schedule-data'
import { MapPin, Home, Waves, Sun, Trophy } from 'lucide-react'

interface CourtVenueInfoProps {
  match: MockBeachMatchDetail
}

export default function CourtVenueInfo({ match }: CourtVenueInfoProps) {
  const getSurfaceIcon = (surface: string) => {
    switch (surface) {
      case 'sand':
        return <Waves className="h-4 w-4" />
      case 'indoor':
        return <Home className="h-4 w-4" />
      case 'grass':
        return <Sun className="h-4 w-4" />
      default:
        return <MapPin className="h-4 w-4" />
    }
  }

  const getSurfaceColor = (surface: string) => {
    switch (surface) {
      case 'sand':
        return 'bg-yellow-50 text-yellow-700 border-yellow-200'
      case 'indoor':
        return 'bg-blue-50 text-blue-700 border-blue-200'
      case 'grass':
        return 'bg-green-50 text-green-700 border-green-200'
      default:
        return 'bg-gray-50 text-gray-700 border-gray-200'
    }
  }

  const getPhaseInfo = (phase: string) => {
    switch (phase) {
      case 'qualification':
        return {
          label: 'Qualification',
          description: 'Qualifying round for main draw',
          color: 'bg-blue-50 text-blue-700 border-blue-200'
        }
      case 'mainDraw':
        return {
          label: 'Main Draw',
          description: 'Main tournament bracket',
          color: 'bg-purple-50 text-purple-700 border-purple-200'
        }
      case 'finals':
        return {
          label: 'Finals',
          description: 'Championship finals',
          color: 'bg-gold-50 text-gold-700 border-gold-200'
        }
      default:
        return {
          label: phase,
          description: 'Tournament match',
          color: 'bg-gray-50 text-gray-700 border-gray-200'
        }
    }
  }

  const phaseInfo = getPhaseInfo(match.phase)
  const surfaceColor = getSurfaceColor(match.courtSurface)
  const surfaceIcon = getSurfaceIcon(match.courtSurface)

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <MapPin className="h-5 w-5" />
          Court & Venue Details
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Court Information */}
          <div className="space-y-4">
            <div>
              <h4 className="font-semibold text-gray-900 mb-3">Court Assignment</h4>
              <div className="space-y-3">
                {/* Court Number */}
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Court:</span>
                  <Badge variant="outline" className="font-medium">
                    {match.court}
                  </Badge>
                </div>

                {/* Surface Type */}
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Surface:</span>
                  <Badge 
                    variant="outline" 
                    className={`${surfaceColor} flex items-center gap-1 capitalize`}
                  >
                    {surfaceIcon}
                    {match.courtSurface}
                  </Badge>
                </div>

                {/* Court Conditions */}
                {match.courtSurface === 'sand' && (
                  <div className="mt-3 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                    <div className="flex items-center gap-2 text-sm">
                      <Sun className="h-4 w-4 text-yellow-600" />
                      <span className="text-yellow-800">Outdoor Beach Court</span>
                    </div>
                    <p className="text-xs text-yellow-700 mt-1">
                      Weather conditions may affect play
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Tournament Information */}
          <div className="space-y-4">
            <div>
              <h4 className="font-semibold text-gray-900 mb-3">Tournament Details</h4>
              <div className="space-y-3">
                {/* Round Name */}
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Round:</span>
                  <Badge variant="outline" className="font-medium">
                    {match.roundName}
                  </Badge>
                </div>

                {/* Tournament Phase */}
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Phase:</span>
                  <Badge 
                    variant="outline" 
                    className={`${phaseInfo.color} flex items-center gap-1`}
                  >
                    <Trophy className="h-3 w-3" />
                    {phaseInfo.label}
                  </Badge>
                </div>

                {/* Match Importance */}
                <div className="mt-3 p-3 bg-gray-50 border border-gray-200 rounded-lg">
                  <p className="text-sm text-gray-800 font-medium">
                    Match Importance
                  </p>
                  <p className="text-xs text-gray-600 mt-1">
                    {phaseInfo.description}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Additional Venue Information */}
        <div className="mt-6 pt-4 border-t border-gray-100">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center">
              <div className="flex items-center justify-center mb-2">
                <MapPin className="h-4 w-4 text-gray-600" />
              </div>
              <p className="text-sm text-gray-600">Venue</p>
              <p className="font-medium text-sm">Tournament Center</p>
            </div>
            
            <div className="text-center">
              <div className="flex items-center justify-center mb-2">
                <Home className="h-4 w-4 text-gray-600" />
              </div>
              <p className="text-sm text-gray-600">Location</p>
              <p className="font-medium text-sm">Main Complex</p>
            </div>
            
            <div className="text-center">
              <div className="flex items-center justify-center mb-2">
                <Trophy className="h-4 w-4 text-gray-600" />
              </div>
              <p className="text-sm text-gray-600">Category</p>
              <p className="font-medium text-sm capitalize">
                {match.phase.replace(/([A-Z])/g, ' $1').trim()}
              </p>
            </div>
          </div>
        </div>

        {/* Match Scheduling Note */}
        <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <p className="text-sm text-blue-800">
            <strong>Scheduling Note:</strong> Court assignments may change due to weather or tournament scheduling requirements.
          </p>
        </div>
      </CardContent>
    </Card>
  )
}