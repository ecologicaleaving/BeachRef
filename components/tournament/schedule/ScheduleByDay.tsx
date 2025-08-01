'use client'

/**
 * Schedule By Day Component
 * 
 * Organizes matches by day using accordion component with collapsible sections.
 * Each day shows match count badge and contains match cards.
 * 
 * Features:
 * - Day-by-day accordion organization using shadcn Accordion
 * - Match count badges for each day
 * - Collapsible functionality for day sections
 * - Responsive design with 48px touch targets
 * - Keyboard navigation support
 * - Automatic sorting of matches by time within each day
 */

import React from 'react'
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion'
import { Badge } from '@/components/ui/badge'
import { BeachMatch } from '@/lib/types'
import MatchCard from './MatchCard'

// Utility functions for match organization
function groupMatchesByDay(matches: BeachMatch[]): Record<string, BeachMatch[]> {
  return matches.reduce((groups, match) => {
    const date = match.localDate
    if (!groups[date]) {
      groups[date] = []
    }
    groups[date].push(match)
    return groups
  }, {} as Record<string, BeachMatch[]>)
}

function formatDisplayDate(dateString: string): string {
  const date = new Date(dateString)
  return date.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long', 
    day: 'numeric'
  })
}

function sortMatchesByTime(matches: BeachMatch[]): BeachMatch[] {
  return [...matches].sort((a, b) => {
    // Sort by time first, then by court
    const timeComparison = a.localTime.localeCompare(b.localTime)
    if (timeComparison !== 0) return timeComparison
    return a.court.localeCompare(b.court)
  })
}

interface ScheduleByDayProps {
  matches: BeachMatch[]
  className?: string
  defaultOpenDays?: string[]
  onMatchClick?: (match: BeachMatch) => void
}

export default function ScheduleByDay({ 
  matches, 
  className = '',
  defaultOpenDays = [],
  onMatchClick
}: ScheduleByDayProps) {
  const groupedMatches = groupMatchesByDay(matches)
  const sortedDates = Object.keys(groupedMatches).sort()
  
  // Default to opening the first day if no defaults specified
  const defaultValue = defaultOpenDays.length > 0 ? defaultOpenDays : [sortedDates[0]]

  if (sortedDates.length === 0) {
    return null
  }

  return (
    <div className={className}>
      <Accordion 
        type="multiple" 
        className="space-y-2"
        defaultValue={defaultValue}
      >
        {sortedDates.map((date) => {
          const dayMatches = sortMatchesByTime(groupedMatches[date])
          const displayDate = formatDisplayDate(date)
          
          return (
            <AccordionItem 
              key={date} 
              value={date}
              className="border border-gray-200 rounded-lg overflow-hidden"
            >
              <AccordionTrigger 
                className="hover:no-underline px-4 py-4 min-h-[48px] data-[state=open]:border-b border-gray-200"
                aria-label={`Toggle schedule for ${displayDate}`}
              >
                <div className="flex items-center justify-between w-full pr-2">
                  <div className="flex items-center gap-3">
                    <h3 className="text-lg font-semibold text-gray-900 text-left">
                      {displayDate}
                    </h3>
                    <Badge 
                      variant="secondary" 
                      className="bg-blue-50 text-blue-700 border-blue-200"
                    >
                      {dayMatches.length} {dayMatches.length === 1 ? 'match' : 'matches'}
                    </Badge>
                  </div>
                </div>
              </AccordionTrigger>
              
              <AccordionContent className="px-4 pb-4 pt-2">
                <div className="space-y-3">
                  {dayMatches.map((match) => (
                    <MatchCard 
                      key={match.noInTournament} 
                      match={match}
                      onMatchClick={onMatchClick}
                    />
                  ))}
                </div>
              </AccordionContent>
            </AccordionItem>
          )
        })}
      </Accordion>
    </div>
  )
}