import { useState, useCallback, useEffect, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import type { TournamentFilters } from '@/types/tournament.types';
import { 
  clearAllFilters, 
  isFilterActive, 
  getActiveFilterCount, 
  filtersToQueryParams, 
  queryParamsToFilters,
  debounce 
} from '@/utils/filter.utils';

const FILTER_STORAGE_KEY = 'tournament-filters';
const DEBOUNCE_DELAY = 300;

export function useFilters() {
  const [searchParams, setSearchParams] = useSearchParams();
  
  // Initialize filters from URL params or localStorage
  const [filters, setFilters] = useState<TournamentFilters>(() => {
    // Try URL params first
    const urlFilters = queryParamsToFilters(searchParams);
    if (isFilterActive(urlFilters)) {
      return urlFilters;
    }
    
    // Fallback to localStorage
    try {
      const saved = localStorage.getItem(FILTER_STORAGE_KEY);
      if (saved) {
        const parsedFilters = JSON.parse(saved);
        // Convert date strings back to Date objects
        if (parsedFilters.dateRange?.start) {
          parsedFilters.dateRange.start = new Date(parsedFilters.dateRange.start);
        }
        if (parsedFilters.dateRange?.end) {
          parsedFilters.dateRange.end = new Date(parsedFilters.dateRange.end);
        }
        return parsedFilters;
      }
    } catch (error) {
      console.warn('Failed to load saved filters:', error);
    }
    
    return clearAllFilters();
  });

  // Create debounced update function
  const updateUrl = useCallback((newFilters: TournamentFilters) => {
    const params = filtersToQueryParams(newFilters);
    const newSearchParams = new URLSearchParams();
    
    // Preserve existing non-filter params (like page)
    const currentPage = searchParams.get('page');
    if (currentPage) newSearchParams.set('page', '1'); // Reset to page 1 on filter change
    
    const currentLimit = searchParams.get('limit');
    if (currentLimit) newSearchParams.set('limit', currentLimit);
    
    // Add filter params
    Object.entries(params).forEach(([key, value]) => {
      if (value) newSearchParams.set(key, value);
    });
    
    setSearchParams(newSearchParams);
  }, [searchParams, setSearchParams]);

  const debouncedUpdateUrl = useMemo(
    () => debounce(updateUrl as (...args: unknown[]) => unknown, DEBOUNCE_DELAY),
    [updateUrl]
  );

  // Update filters and persist to URL and localStorage
  const updateFilters = useCallback((newFilters: TournamentFilters | ((prev: TournamentFilters) => TournamentFilters)) => {
    setFilters(prevFilters => {
      const updatedFilters = typeof newFilters === 'function' ? newFilters(prevFilters) : newFilters;
      
      // Save to localStorage
      try {
        localStorage.setItem(FILTER_STORAGE_KEY, JSON.stringify(updatedFilters));
      } catch (error) {
        console.warn('Failed to save filters to localStorage:', error);
      }
      
      // Update URL (debounced)
      debouncedUpdateUrl(updatedFilters);
      
      return updatedFilters;
    });
  }, [debouncedUpdateUrl]);

  // Individual filter update functions
  const updateSearch = useCallback((search: string) => {
    updateFilters(prev => ({ ...prev, search: search || undefined }));
  }, [updateFilters]);

  const updateLocation = useCallback((location: string) => {
    updateFilters(prev => ({ ...prev, location: location || undefined }));
  }, [updateFilters]);

  const updateDateRange = useCallback((dateRange: { start?: Date; end?: Date }) => {
    updateFilters(prev => ({ 
      ...prev, 
      dateRange: (dateRange.start || dateRange.end) ? dateRange : undefined 
    }));
  }, [updateFilters]);

  const updateLocations = useCallback((locations: string[]) => {
    updateFilters(prev => ({ ...prev, locations }));
  }, [updateFilters]);

  const updateTypes = useCallback((types: TournamentFilters['types']) => {
    updateFilters(prev => ({ ...prev, types }));
  }, [updateFilters]);

  const updateSurface = useCallback((surface: TournamentFilters['surface']) => {
    updateFilters(prev => ({ ...prev, surface }));
  }, [updateFilters]);

  const updateGender = useCallback((gender: TournamentFilters['gender']) => {
    updateFilters(prev => ({ ...prev, gender }));
  }, [updateFilters]);

  const updateStatuses = useCallback((statuses: TournamentFilters['statuses']) => {
    updateFilters(prev => ({ ...prev, statuses }));
  }, [updateFilters]);

  // Clear all filters
  const clearFilters = useCallback(() => {
    const clearedFilters = clearAllFilters();
    updateFilters(clearedFilters);
  }, [updateFilters]);

  // Sync with URL changes (e.g., back/forward navigation)
  useEffect(() => {
    const urlFilters = queryParamsToFilters(searchParams);
    if (JSON.stringify(urlFilters) !== JSON.stringify(filters)) {
      setFilters(urlFilters);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]); // Only depend on searchParams, not filters to avoid infinite loop

  const hasActiveFilters = isFilterActive(filters);
  const activeFilterCount = getActiveFilterCount(filters);

  return {
    filters,
    updateFilters,
    updateSearch,
    updateLocation,
    updateDateRange,
    updateLocations,
    updateTypes,
    updateSurface,
    updateGender,
    updateStatuses,
    clearFilters,
    hasActiveFilters,
    activeFilterCount
  };
}