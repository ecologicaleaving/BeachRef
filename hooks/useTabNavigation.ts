'use client'

/**
 * Tab Navigation Hook
 * 
 * Provides deep linking and URL management for tournament tabs.
 * Handles browser navigation, URL parameters, and page metadata.
 * 
 * Features:
 * - Deep linking support with URL parameters (?tab=schedule)
 * - Browser back/forward navigation
 * - Automatic page title updates
 * - Clean URL handling (removes default tab parameter)
 */

import { useRouter, useSearchParams, usePathname } from 'next/navigation'
import { useCallback, useEffect } from 'react'

type ValidTabId = 'overview' | 'schedule' | 'results'

const isValidTabId = (tabId: string): tabId is ValidTabId => {
  return ['overview', 'schedule', 'results'].includes(tabId)
}

export function useTabNavigation(tournamentCode: string, defaultTab: ValidTabId = 'overview') {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  
  // Validate tab parameter from URL
  const tabParam = searchParams?.get('tab')
  const currentTab = (tabParam && isValidTabId(tabParam)) ? tabParam : defaultTab

  const navigateToTab = useCallback((tabId: string) => {
    // Validate tab ID before navigation
    if (!isValidTabId(tabId)) {
      console.warn(`Invalid tab ID: ${tabId}. Defaulting to ${defaultTab}`)
      tabId = defaultTab
    }
    
    const newSearchParams = new URLSearchParams(searchParams?.toString())
    
    if (tabId === defaultTab) {
      // Remove tab parameter for default tab to keep URLs clean
      newSearchParams.delete('tab')
    } else {
      newSearchParams.set('tab', tabId)
    }
    
    const newUrl = newSearchParams.toString() 
      ? `${pathname}?${newSearchParams.toString()}`
      : pathname
    
    router.push(newUrl, { scroll: false })
  }, [router, pathname, searchParams, defaultTab])

  // Update page metadata based on active tab
  useEffect(() => {
    const titles: Record<ValidTabId, string> = {
      overview: `Tournament ${tournamentCode} - Overview`,
      schedule: `Tournament ${tournamentCode} - Schedule`,
      results: `Tournament ${tournamentCode} - Results`
    }
    
    const descriptions: Record<ValidTabId, string> = {
      overview: `Tournament overview and details for ${tournamentCode}`,
      schedule: `Match schedule and fixtures for tournament ${tournamentCode}`, 
      results: `Tournament results and rankings for ${tournamentCode}`
    }
    
    // Type-safe access to titles and descriptions
    document.title = titles[currentTab] || titles.overview
    
    // Update meta description if element exists
    const metaDescription = document.querySelector('meta[name="description"]')
    if (metaDescription) {
      metaDescription.setAttribute('content', descriptions[currentTab] || descriptions.overview)
    }
  }, [currentTab, tournamentCode])

  return { currentTab, navigateToTab }
}