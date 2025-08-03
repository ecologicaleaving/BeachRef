/**
 * Tournament Context Analysis Utility
 * 
 * Provides intelligent analysis of tournament state to determine optimal
 * default tab selection based on available data and tournament status.
 * 
 * Features:
 * - Match availability detection for schedule tab preference
 * - Tournament completion status analysis for results tab
 * - User preference override support
 * - Confidence scoring for smart defaults
 */

import { TournamentDetail } from '@/lib/types'

export type TabId = 'overview' | 'schedule' | 'results'

export interface TournamentContextAnalysis {
  recommendedTab: TabId
  reason: 'has_matches' | 'no_matches' | 'tournament_complete' | 'user_preference' | 'loading' | 'unknown'
  confidence: 'high' | 'medium' | 'low'
  hasMatches: boolean
  isCompleted: boolean
  matchCount?: number
  completionPercentage?: number
}

/**
 * Type guard to validate tab IDs
 */
export function isValidTabId(tabId: string): tabId is TabId {
  return ['overview', 'schedule', 'results'].includes(tabId)
}

/**
 * Analyzes tournament data to determine match availability
 * Supports multiple data formats for flexible integration
 */
function analyzeMatchAvailability(tournament: TournamentDetail): {
  hasMatches: boolean
  matchCount: number
} {
  let matchCount = 0
  let hasMatches = false

  if (!tournament || typeof tournament !== 'object') {
    return { hasMatches: false, matchCount: 0 }
  }

  // Cast to any for flexible property access - safe since we check types
  const tournamentAny = tournament as any
  
  // Define match property patterns to check
  const matchProperties = ['matches', 'scheduleData', 'matchSchedule']
  
  for (const prop of matchProperties) {
    if (tournamentAny[prop] && Array.isArray(tournamentAny[prop])) {
      matchCount = tournamentAny[prop].length
      hasMatches = matchCount > 0
      break // Use first match property found
    }
  }

  return { hasMatches, matchCount }
}

/**
 * Determines tournament completion status
 */
function analyzeTournamentCompletion(tournament: TournamentDetail): {
  isCompleted: boolean
  completionPercentage: number
} {
  let isCompleted = false
  let completionPercentage = 0

  // Check status field
  if (tournament.status === 'completed') {
    isCompleted = true
    completionPercentage = 100
  } else if (tournament.status === 'live') {
    // Tournament is in progress
    completionPercentage = 50 // Rough estimate for live tournaments
  } else if (tournament.status === 'upcoming') {
    completionPercentage = 0
  }

  // Check dates for additional completion hints
  if (!isCompleted && tournament.endDate) {
    const endDate = new Date(tournament.endDate)
    const now = new Date()
    
    // Only consider tournaments completed if they are significantly past the end date
    // to avoid timezone and same-day issues
    const dayAfterEnd = new Date(endDate)
    dayAfterEnd.setDate(dayAfterEnd.getDate() + 1)
    
    if (now > dayAfterEnd) {
      // Tournament end date has passed by at least a day
      isCompleted = true
      completionPercentage = 100
    }
  }

  return { isCompleted, completionPercentage }
}

/**
 * Main function to analyze tournament context and recommend optimal tab
 */
export function analyzeTournamentContext(
  tournament: TournamentDetail | null,
  userPreference?: string
): TournamentContextAnalysis {
  // Handle loading/null state
  if (!tournament) {
    return {
      recommendedTab: 'overview',
      reason: 'loading',
      confidence: 'low',
      hasMatches: false,
      isCompleted: false
    }
  }

  // Priority 1: User preference override (highest priority)
  if (userPreference && isValidTabId(userPreference)) {
    const { hasMatches, matchCount } = analyzeMatchAvailability(tournament)
    const { isCompleted, completionPercentage } = analyzeTournamentCompletion(tournament)
    
    return {
      recommendedTab: userPreference,
      reason: 'user_preference',
      confidence: 'high',
      hasMatches,
      isCompleted,
      matchCount,
      completionPercentage
    }
  }

  // Analyze tournament state
  const { hasMatches, matchCount } = analyzeMatchAvailability(tournament)
  const { isCompleted, completionPercentage } = analyzeTournamentCompletion(tournament)

  // Priority 2: Tournament completion status (show results for completed tournaments)
  if (isCompleted && completionPercentage === 100) {
    return {
      recommendedTab: 'results',
      reason: 'tournament_complete',
      confidence: 'high',
      hasMatches,
      isCompleted: true,
      matchCount,
      completionPercentage
    }
  }

  // Priority 3: Match availability (show schedule for tournaments with matches)
  if (hasMatches && matchCount > 0) {
    return {
      recommendedTab: 'schedule',
      reason: 'has_matches',
      confidence: 'high',
      hasMatches: true,
      isCompleted,
      matchCount,
      completionPercentage
    }
  }

  // Default: Overview tab for tournaments without matches or unclear state
  return {
    recommendedTab: 'overview',
    reason: 'no_matches',
    confidence: 'medium',
    hasMatches: false,
    isCompleted,
    matchCount: 0,
    completionPercentage
  }
}

/**
 * Utility function to get a human-readable explanation of the context analysis
 */
export function getContextAnalysisExplanation(analysis: TournamentContextAnalysis): string {
  switch (analysis.reason) {
    case 'user_preference':
      return 'Using your preferred default tab'
    case 'tournament_complete':
      return 'Tournament completed - showing results'
    case 'has_matches':
      return `Tournament has ${analysis.matchCount} matches - showing schedule`
    case 'no_matches':
      return 'No matches scheduled - showing overview'
    case 'loading':
      return 'Loading tournament data...'
    default:
      return 'Showing overview tab'
  }
}

/**
 * Utility function to determine if context analysis suggests a specific tab should be highlighted
 */
export function shouldHighlightTab(tabId: TabId, analysis: TournamentContextAnalysis): boolean {
  return analysis.recommendedTab === tabId && analysis.confidence === 'high'
}