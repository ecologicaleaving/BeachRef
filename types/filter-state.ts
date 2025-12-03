/**
 * Filter State Management
 * Tournament filter state managed by FilterPanel component
 * Persisted to LocalStorage across app sessions
 */

/**
 * Tournament filter state managed by FilterPanel component.
 * Persisted to LocalStorage across app sessions.
 */
export interface FilterState {
  gender: 'all' | 'men' | 'women' | null;
  level: string | null;           // Tournament level filter
  dateRange: {
    start: string | null;         // ISO 8601 date
    end: string | null;           // ISO 8601 date
  };
  country: string | null;         // Country code (ISO 3166-1 alpha-2)
  searchQuery: string | null;     // Free-text search
  lastModified: number;           // Timestamp of last filter change
}

/**
 * Default empty filter state (show all tournaments).
 */
export const DEFAULT_FILTER_STATE: FilterState = {
  gender: 'all',
  level: null,
  dateRange: { start: null, end: null },
  country: null,
  searchQuery: null,
  lastModified: Date.now()
};

/**
 * Check if any filters are active (non-default).
 */
export const hasActiveFilters = (state: FilterState): boolean => {
  return (
    state.gender !== 'all' ||
    state.level !== null ||
    state.dateRange.start !== null ||
    state.dateRange.end !== null ||
    state.country !== null ||
    (state.searchQuery !== null && state.searchQuery.trim().length > 0)
  );
};

/**
 * Reset filter state to defaults (used by Reset button).
 */
export const resetFilterState = (): FilterState => ({
  ...DEFAULT_FILTER_STATE,
  lastModified: Date.now()
});
