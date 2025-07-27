import { useMemo } from 'react';
import { useTournaments } from './useTournaments';
import { useFilters } from './useFilters';
import { filtersToQueryParams } from '@/utils/filter.utils';
import type { TournamentQueryParams } from '@/types/tournament.types';

export function useFilteredTournaments(additionalParams: Partial<TournamentQueryParams> = {}) {
  const { filters } = useFilters();
  
  // Convert filters to API query parameters
  const filterParams = useMemo(() => {
    const baseParams = filtersToQueryParams(filters);
    
    // Convert filter format to API format
    const apiParams: TournamentQueryParams = {
      ...additionalParams,
      search: baseParams.search,
      dateFrom: baseParams.dateFrom,
      dateTo: baseParams.dateTo,
      location: baseParams.location,
    };

    // Convert array filters to comma-separated strings
    if (baseParams.locations) {
      apiParams.locations = baseParams.locations;
    }
    
    if (baseParams.types) {
      apiParams.types = baseParams.types;
    }
    
    if (baseParams.surface) {
      apiParams.surface = baseParams.surface as 'Sand' | 'Indoor';
    }
    
    if (baseParams.gender) {
      apiParams.gender = baseParams.gender as 'Men' | 'Women' | 'Mixed';
    }
    
    if (baseParams.statuses) {
      apiParams.statuses = baseParams.statuses;
    }

    return apiParams;
  }, [filters, additionalParams]);

  // Use the tournaments query with the filter parameters
  const tournamentQuery = useTournaments(filterParams);

  return {
    ...tournamentQuery,
    filters,
    hasActiveFilters: Object.keys(filtersToQueryParams(filters)).length > 0
  };
}