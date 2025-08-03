'use client'

/**
 * Enhanced Tournament Detail Tabs Component
 * 
 * Complete tab integration with progressive loading, deep linking, 
 * error isolation, and comprehensive navigation support.
 * 
 * Features:
 * - Deep linking support with URL parameters (?tab=schedule)
 * - Progressive tab loading with lazy content loading
 * - Cross-tab data consistency with shared context
 * - Independent error boundaries for each tab
 * - Performance monitoring and optimization
 * - Mobile-responsive design with 48px touch targets
 * - Keyboard navigation and accessibility support
 */

import React, { useState, useEffect, useRef, Suspense, useMemo } from 'react'
import dynamic from 'next/dynamic'
import { TournamentDetail } from '@/lib/types'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Trophy, Clock, Info } from 'lucide-react'
import { useTabNavigation } from '@/hooks/useTabNavigation'
import { TabErrorBoundary } from './TabErrorBoundary'
import { tabPerformanceMonitor } from '@/utils/tabPerformanceMonitoring'
import { analyzeTournamentContext, TournamentContextAnalysis, TabId, isValidTabId } from '@/utils/tournament-context-analysis'
import { useUserTabPreferences } from '@/hooks/useUserTabPreferences'

// Static import for Overview (always loaded)
import TournamentOverviewTab from './TournamentOverviewTab'

// Dynamic imports for progressive loading
const TournamentScheduleTab = dynamic(
  () => import('./TournamentScheduleTab'),
  {
    loading: () => <TournamentScheduleSkeleton />,
    ssr: false
  }
)

const TournamentResultsTab = dynamic(
  () => import('./TournamentResultsTab'),
  {
    loading: () => <TournamentResultsSkeleton />,
    ssr: false
  }
)

// Skeleton components for loading states
const TournamentScheduleSkeleton = () => (
  <div className="space-y-4">
    <div className="h-8 bg-gray-200 rounded animate-pulse" />
    <div className="space-y-3">
      {[...Array(3)].map((_, i) => (
        <div key={i} className="h-24 bg-gray-100 rounded animate-pulse" />
      ))}
    </div>
  </div>
)

const TournamentResultsSkeleton = () => (
  <div className="space-y-4">
    <div className="h-8 bg-gray-200 rounded animate-pulse" />
    <div className="space-y-3">
      {[...Array(4)].map((_, i) => (
        <div key={i} className="h-20 bg-gray-100 rounded animate-pulse" />
      ))}
    </div>
  </div>
)

interface TournamentDetailTabsProps {
  tournament: TournamentDetail
}

const AVAILABLE_TABS = [
  { 
    id: 'overview' as const, 
    label: 'Overview', 
    icon: Info,
    description: 'Tournament overview and details'
  },
  { 
    id: 'schedule' as const, 
    label: 'Schedule', 
    icon: Clock,
    description: 'Match schedule and fixtures'
  },
  { 
    id: 'results' as const, 
    label: 'Results', 
    icon: Trophy,
    description: 'Tournament results and rankings'
  }
] as const

// Type guard for tab validation - using the one from tournament-context-analysis
// const isValidTabId = (tabId: string): tabId is TabId => {
//   return AVAILABLE_TABS.some(tab => tab.id === tabId)
// }

export default function TournamentDetailTabs({ tournament }: TournamentDetailTabsProps) {
  const { userPreference, isLoaded } = useUserTabPreferences()
  const [smartDefaultTab, setSmartDefaultTab] = useState<TabId>('overview')
  
  // Memoized context analysis for performance
  const contextAnalysis = useMemo(() => {
    if (!tournament || !isLoaded) return null
    
    try {
      return analyzeTournamentContext(tournament, userPreference)
    } catch (error) {
      console.warn('Failed to analyze tournament context:', error)
      // Fallback to default overview tab
      return {
        recommendedTab: 'overview' as TabId,
        reason: 'unknown' as const,
        confidence: 'low' as const,
        hasMatches: false,
        isCompleted: false
      }
    }
  }, [tournament, userPreference, isLoaded])

  // Update smart default tab when analysis changes
  useEffect(() => {
    if (contextAnalysis) {
      setSmartDefaultTab(contextAnalysis.recommendedTab)
    }
  }, [contextAnalysis])
  
  const { currentTab, navigateToTab } = useTabNavigation(tournament?.code || 'unknown', smartDefaultTab)
  const [loadedTabs, setLoadedTabs] = useState<Set<string>>(new Set(['overview']))
  const tabsRef = useRef<HTMLDivElement>(null)

  // Handle browser back/forward navigation
  useEffect(() => {
    const handlePopState = () => {
      // Tab change will be handled by useTabNavigation hook
      // Just ensure tab content is loaded
      if (!loadedTabs.has(currentTab)) {
        setLoadedTabs(prev => new Set(Array.from(prev).concat([currentTab])))
      }
    }

    window.addEventListener('popstate', handlePopState)
    return () => window.removeEventListener('popstate', handlePopState)
  }, [currentTab, loadedTabs])

  // Ensure current tab is loaded
  useEffect(() => {
    if (!loadedTabs.has(currentTab)) {
      setLoadedTabs(prev => new Set(Array.from(prev).concat([currentTab])))
    }
  }, [currentTab, loadedTabs])

  const handleTabChange = (tabId: string) => {
    // Start performance monitoring
    tabPerformanceMonitor.startTabSwitch()
    
    try {
      // Navigate to tab
      navigateToTab(tabId)
      
      // Mark tab as loaded
      setLoadedTabs(prev => new Set(Array.from(prev).concat([tabId])))
      
      // End performance monitoring with context information
      tabPerformanceMonitor.endTabSwitch(tabId)
      
      // Track tab selection with context analysis for analytics
      if (contextAnalysis) {
        tabPerformanceMonitor.trackTabSwitch(tabId, contextAnalysis.reason)
      }
      
      // Start content load monitoring if not already loaded
      if (!loadedTabs.has(tabId)) {
        tabPerformanceMonitor.startContentLoad(tabId)
      }
      
    } catch (error) {
      tabPerformanceMonitor.recordError(tabId, error as Error)
      console.error('Error during tab change:', error)
    }
  }

  // Keyboard navigation support
  const handleKeyDown = (event: React.KeyboardEvent, tabId: string) => {
    if (!isValidTabId(tabId)) return
    
    const tabs = AVAILABLE_TABS.map(t => t.id)
    const currentIndex = tabs.indexOf(tabId)

    switch (event.key) {
      case 'ArrowLeft':
        event.preventDefault()
        const prevTab = tabs[currentIndex - 1] || tabs[tabs.length - 1]
        handleTabChange(prevTab)
        break
      case 'ArrowRight':
        event.preventDefault()
        const nextTab = tabs[currentIndex + 1] || tabs[0]
        handleTabChange(nextTab)
        break
      case 'Home':
        event.preventDefault()
        handleTabChange(tabs[0])
        break
      case 'End':
        event.preventDefault()
        handleTabChange(tabs[tabs.length - 1])
        break
    }
  }

  // Handle null tournament after all hooks
  if (!tournament) {
    return (
      <div className="w-full space-y-4">
        <div className="text-center p-8">
          <div className="animate-pulse">Loading tournament details...</div>
        </div>
      </div>
    )
  }

  return (
    <div className="w-full space-y-4">
      {/* Screen reader announcement for smart tab selection */}
      {contextAnalysis && contextAnalysis.reason !== 'user_preference' && (
        <div 
          className="sr-only" 
          aria-live="polite" 
          aria-atomic="true"
        >
          {contextAnalysis.reason === 'has_matches' && 'Schedule tab recommended due to available matches'}
          {contextAnalysis.reason === 'tournament_complete' && 'Results tab recommended as tournament is completed'}
          {contextAnalysis.reason === 'no_matches' && 'Overview tab shown as no matches are scheduled'}
        </div>
      )}
      
      {/* Context indicator for development/debugging */}
      {process.env.NODE_ENV === 'development' && (
        <div className="text-xs text-muted-foreground p-2 bg-gray-50 rounded border">
          {contextAnalysis ? (
            <>
              Smart default: {contextAnalysis.recommendedTab} ({contextAnalysis.reason})
              {contextAnalysis.matchCount !== undefined && ` - ${contextAnalysis.matchCount} matches`}
              {contextAnalysis.completionPercentage !== undefined && ` - ${contextAnalysis.completionPercentage}% complete`}
            </>
          ) : (
            <span className="animate-pulse">Analyzing tournament context...</span>
          )}
        </div>
      )}
      
      <Tabs 
        value={currentTab} 
        onValueChange={handleTabChange} 
        className="w-full space-y-4"
        ref={tabsRef}
        aria-label="Tournament detail navigation"
      >
      <TabsList 
        className="grid w-full grid-cols-3"
        role="tablist"
        aria-orientation="horizontal"
      >
        {AVAILABLE_TABS.map((tab) => {
          const IconComponent = tab.icon
          return (
            <TabsTrigger
              key={tab.id}
              value={tab.id}
              className="flex items-center gap-2 min-h-[48px]"
              role="tab"
              aria-selected={currentTab === tab.id}
              aria-controls={`${tab.id}-content`}
              aria-label={`${tab.label} tab - ${tab.description}${contextAnalysis?.recommendedTab === tab.id ? ' (recommended)' : ''}`}
              tabIndex={currentTab === tab.id ? 0 : -1}
              onKeyDown={(e) => handleKeyDown(e, tab.id)}
            >
              <IconComponent className="h-4 w-4" />
              <span className="hidden sm:inline">{tab.label}</span>
            </TabsTrigger>
          )
        })}
      </TabsList>

      {/* Overview Tab - Always loaded */}
      <TabsContent
        value="overview"
        id="overview-content"
        role="tabpanel"
        aria-labelledby="overview-tab"
        className="space-y-4"
      >
        <TabErrorBoundary tabName="Overview">
          <TournamentOverviewTab tournament={tournament} />
        </TabErrorBoundary>
      </TabsContent>

      {/* Schedule Tab - Lazy loaded */}
      <TabsContent
        value="schedule"
        id="schedule-content"
        role="tabpanel"
        aria-labelledby="schedule-tab"
        className="space-y-4"
      >
        <TabErrorBoundary tabName="Schedule">
          <Suspense fallback={<TournamentScheduleSkeleton />}>
            {loadedTabs.has('schedule') ? (
              <TournamentScheduleTab tournament={tournament} />
            ) : (
              <TournamentScheduleSkeleton />
            )}
          </Suspense>
        </TabErrorBoundary>
      </TabsContent>

      {/* Results Tab - Lazy loaded */}
      <TabsContent
        value="results"
        id="results-content"
        role="tabpanel"
        aria-labelledby="results-tab"
        className="space-y-4"
      >
        <TabErrorBoundary tabName="Results">
          <Suspense fallback={<TournamentResultsSkeleton />}>
            {loadedTabs.has('results') ? (
              <TournamentResultsTab tournament={tournament} />
            ) : (
              <TournamentResultsSkeleton />
            )}
          </Suspense>
        </TabErrorBoundary>
      </TabsContent>
    </Tabs>
    </div>
  )
}