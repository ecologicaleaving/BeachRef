"use client"

import * as React from "react"
import { useState, useEffect, useCallback } from "react"
import { TournamentPagination } from "./TournamentPagination"
import { YearSelector } from "./YearSelector"
import { TournamentTable } from "./TournamentTable"
import { TournamentTableSkeleton } from "../ui/TournamentSkeleton"
import { useTournamentPagination } from "@/hooks/useTournamentPagination"
import { useResponsiveDesign } from "@/hooks/useResponsiveDesign"
import { Tournament, PaginatedTournamentResponse } from "@/lib/types"
import { fetchCachedTournaments, prefetchAdjacentPages } from "@/lib/tournament-api"
import { cn } from "@/lib/utils"

interface TournamentTableWithPaginationProps {
  className?: string
  initialData?: PaginatedTournamentResponse | null
  initialYear?: number
  initialPage?: number
}

// Mock data for available years - in real implementation, this would come from API
const AVAILABLE_YEARS = [
  { year: 2023, count: 125 },
  { year: 2024, count: 178 },
  { year: 2025, count: 89 }
]

export const TournamentTableWithPagination: React.FC<TournamentTableWithPaginationProps> = ({
  className,
  initialData = null,
  initialYear = 2025,
  initialPage = 1
}) => {
  const { currentState, updateYear, updatePage } = useTournamentPagination()
  const { screenSize } = useResponsiveDesign()
  
  const [tournaments, setTournaments] = useState<Tournament[]>(initialData?.tournaments || [])
  const [paginationData, setPaginationData] = useState<PaginatedTournamentResponse['pagination'] | null>(initialData?.pagination || null)
  const [isLoading, setIsLoading] = useState(initialData === null)
  const [error, setError] = useState<string | null>(null)
  
  // Fetch tournaments data using enhanced API client with caching
  const fetchTournaments = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    
    try {
      // Use the cached API client for improved performance
      const data = await fetchCachedTournaments({
        year: currentState.year,
        page: currentState.page,
        limit: currentState.limit
      })
      
      setTournaments(data.tournaments)
      setPaginationData(data.pagination)
      
      // Prefetch adjacent pages for better navigation performance
      if (data.pagination && data.pagination.totalPages > 1) {
        prefetchAdjacentPages(
          currentState.year,
          currentState.page,
          data.pagination.totalPages,
          currentState.limit
        ).catch((error) => {
          // Silently handle prefetch errors - they shouldn't affect the main functionality
          console.warn('Prefetch failed:', error);
        });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch tournaments')
      setTournaments([])
      setPaginationData(null)
    } finally {
      setIsLoading(false)
    }
  }, [currentState.year, currentState.page, currentState.limit])
  
  // Fetch data when pagination state changes, but only if we don't have initial data
  useEffect(() => {
    if (initialData === null) {
      fetchTournaments()
    }
  }, [fetchTournaments, initialData])
  
  // Fetch new data when pagination state changes after initial load
  useEffect(() => {
    if (initialData !== null) {
      fetchTournaments()
    }
  }, [currentState.year, currentState.page, currentState.limit, initialData])
  
  const handleYearChange = (year: number) => {
    updateYear(year)
  }
  
  const handlePageChange = (page: number) => {
    updatePage(page)
  }
  
  // Handle error display
  if (error && !isLoading) {
    return (
      <div className={cn("space-y-4", className)}>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 py-4">
          <YearSelector
            currentYear={currentState.year}
            availableYears={AVAILABLE_YEARS}
            onYearChange={handleYearChange}
            isLoading={isLoading}
          />
        </div>
        
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-6 text-center">
          <div className="text-destructive font-medium mb-2">
            Failed to load tournaments
          </div>
          <div className="text-sm text-muted-foreground mb-4">
            {error}
          </div>
          <button
            onClick={fetchTournaments}
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >
            Try Again
          </button>
        </div>
      </div>
    )
  }
  
  return (
    <div className={cn("space-y-4", className)}>
      {/* Header Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 py-4">
        <YearSelector
          currentYear={currentState.year}
          availableYears={AVAILABLE_YEARS}
          onYearChange={handleYearChange}
          isLoading={isLoading}
        />
        
        {paginationData && (
          <div className="text-sm text-muted-foreground">
            {isLoading ? (
              "Loading tournaments..."
            ) : (
              `Showing ${tournaments?.length || 0} of ${paginationData?.totalTournaments || 0} tournaments`
            )}
          </div>
        )}
      </div>
      
      {/* Tournament Table */}
      {isLoading ? (
        <TournamentTableSkeleton screenSize={screenSize} />
      ) : (
        <TournamentTable 
          initialData={tournaments}
          paginatedData={{ tournaments, pagination: paginationData! }}
          currentYear={currentState.year}
          currentPage={currentState.page}
          className="border rounded-lg"
        />
      )}
      
      {/* Pagination Controls */}
      {paginationData && paginationData.totalPages > 1 && (
        <TournamentPagination
          currentPage={paginationData.currentPage}
          totalPages={paginationData.totalPages}
          onPageChange={handlePageChange}
          isLoading={isLoading}
        />
      )}
      
      {/* No Results Message */}
      {!isLoading && (tournaments?.length || 0) === 0 && !error && (
        <div className="text-center py-12">
          <div className="text-muted-foreground text-lg mb-2">
            No tournaments found for {currentState.year}
          </div>
          <div className="text-sm text-muted-foreground">
            Try selecting a different year or check back later.
          </div>
        </div>
      )}
    </div>
  )
}