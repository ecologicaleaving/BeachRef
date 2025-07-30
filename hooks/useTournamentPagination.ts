"use client"

import { useSearchParams, useRouter } from 'next/navigation'
import { useCallback, useMemo } from 'react'

interface PaginationState {
  year: number
  page: number
  limit: number
}

interface UseTournamentPaginationReturn {
  currentState: PaginationState
  updateState: (updates: Partial<PaginationState>) => void
  updateYear: (year: number) => void
  updatePage: (page: number) => void
  updateLimit: (limit: number) => void
  resetToFirstPage: () => void
}

/**
 * Hook for managing tournament pagination state with URL synchronization
 * Handles year, page, and limit parameters with browser navigation support
 */
export function useTournamentPagination(): UseTournamentPaginationReturn {
  const searchParams = useSearchParams()
  const router = useRouter()
  
  // Parse current state from URL parameters
  const currentState = useMemo((): PaginationState => ({
    year: parseInt(searchParams.get('year') || '2025'),
    page: parseInt(searchParams.get('page') || '1'),
    limit: parseInt(searchParams.get('limit') || '20'),
  }), [searchParams])
  
  // Update URL with new parameters
  const updateState = useCallback((updates: Partial<PaginationState>) => {
    const newParams = new URLSearchParams(searchParams)
    const newState = { ...currentState, ...updates }
    
    // Handle each parameter with default value logic
    Object.entries(newState).forEach(([key, value]) => {
      if (key === 'year' && value === 2025) {
        // Remove default year from URL for cleaner URLs
        newParams.delete('year')
      } else if (key === 'page' && value === 1) {
        // Remove default page from URL for cleaner URLs
        newParams.delete('page')
      } else if (key === 'limit' && value === 20) {
        // Remove default limit from URL for cleaner URLs
        newParams.delete('limit')
      } else {
        // Set non-default values
        newParams.set(key, value.toString())
      }
    })
    
    // Build new URL
    const queryString = newParams.toString()
    const newUrl = queryString ? `?${queryString}` : window.location.pathname
    
    // Update URL without page reload
    router.push(newUrl)
  }, [currentState, searchParams, router])
  
  // Convenience methods for common operations
  const updateYear = useCallback((year: number) => {
    // When changing year, reset to page 1
    updateState({ year, page: 1 })
  }, [updateState])
  
  const updatePage = useCallback((page: number) => {
    updateState({ page })
  }, [updateState])
  
  const updateLimit = useCallback((limit: number) => {
    // When changing limit, reset to page 1
    updateState({ limit, page: 1 })
  }, [updateState])
  
  const resetToFirstPage = useCallback(() => {
    updateState({ page: 1 })
  }, [updateState])
  
  return {
    currentState,
    updateState,
    updateYear,
    updatePage,
    updateLimit,
    resetToFirstPage,
  }
}