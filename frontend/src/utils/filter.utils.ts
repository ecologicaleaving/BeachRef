import type { TournamentFilters, FilterOptions, Tournament } from '@/types/tournament.types';

// Filter option constants
export const TOURNAMENT_TYPES: FilterOptions['types'] = [
  { value: 'World Tour', label: 'World Tour' },
  { value: 'Continental', label: 'Continental' },
  { value: 'National', label: 'National' },
  { value: 'Regional', label: 'Regional' }
];

export const TOURNAMENT_SURFACES: FilterOptions['surfaces'] = [
  { value: 'Sand', label: 'Sand' },
  { value: 'Indoor', label: 'Indoor' }
];

export const TOURNAMENT_GENDERS: FilterOptions['genders'] = [
  { value: 'Men', label: 'Men' },
  { value: 'Women', label: 'Women' },
  { value: 'Mixed', label: 'Mixed' }
];

export const TOURNAMENT_STATUSES: FilterOptions['statuses'] = [
  { value: 'Upcoming', label: 'Upcoming' },
  { value: 'Live', label: 'Live' },
  { value: 'Completed', label: 'Completed' },
  { value: 'Cancelled', label: 'Cancelled' }
];

// Helper functions
export const isFilterActive = (filters: TournamentFilters): boolean => {
  return !!(
    filters.search ||
    filters.location ||
    filters.dateRange?.start ||
    filters.dateRange?.end ||
    filters.locations?.length ||
    filters.types?.length ||
    filters.surface ||
    filters.gender ||
    filters.statuses?.length ||
    filters.referees?.length
  );
};

export const getActiveFilterCount = (filters: TournamentFilters): number => {
  let count = 0;
  if (filters.search) count++;
  if (filters.location) count++;
  if (filters.dateRange?.start || filters.dateRange?.end) count++;
  if (filters.locations?.length) count++;
  if (filters.types?.length) count++;
  if (filters.surface) count++;
  if (filters.gender) count++;
  if (filters.statuses?.length) count++;
  if (filters.referees?.length) count++;
  return count;
};

export const clearAllFilters = (): TournamentFilters => ({
  search: undefined,
  location: undefined,
  dateRange: undefined,
  locations: [],
  types: [],
  surface: undefined,
  gender: undefined,
  statuses: [],
  referees: []
});

export const buildFilterSummary = (filters: TournamentFilters): string[] => {
  const summary: string[] = [];
  
  if (filters.search) summary.push(`Search: "${filters.search}"`);
  if (filters.location) summary.push(`Location: ${filters.location}`);
  if (filters.dateRange?.start) summary.push(`From: ${filters.dateRange.start.toLocaleDateString()}`);
  if (filters.dateRange?.end) summary.push(`To: ${filters.dateRange.end.toLocaleDateString()}`);
  if (filters.locations?.length) summary.push(`Locations: ${filters.locations.join(', ')}`);
  if (filters.types?.length) summary.push(`Types: ${filters.types.join(', ')}`);
  if (filters.surface) summary.push(`Surface: ${filters.surface}`);
  if (filters.gender) summary.push(`Gender: ${filters.gender}`);
  if (filters.statuses?.length) summary.push(`Status: ${filters.statuses.join(', ')}`);
  if (filters.referees?.length) summary.push(`Referees: ${filters.referees.join(', ')}`);
  
  return summary;
};

// Convert filters to API query parameters
export const filtersToQueryParams = (filters: TournamentFilters): Record<string, string> => {
  const params: Record<string, string> = {};
  
  if (filters.search) params.search = filters.search;
  if (filters.location) params.location = filters.location;
  if (filters.dateRange?.start) params.dateFrom = filters.dateRange.start.toISOString().split('T')[0];
  if (filters.dateRange?.end) params.dateTo = filters.dateRange.end.toISOString().split('T')[0];
  if (filters.locations?.length) params.locations = filters.locations.join(',');
  if (filters.types?.length) params.types = filters.types.join(',');
  if (filters.surface) params.surface = filters.surface;
  if (filters.gender) params.gender = filters.gender;
  if (filters.statuses?.length) params.statuses = filters.statuses.join(',');
  if (filters.referees?.length) params.referees = filters.referees.join(',');
  
  return params;
};

// Convert URL search params to filters
export const queryParamsToFilters = (searchParams: URLSearchParams): TournamentFilters => {
  const filters: TournamentFilters = {};
  
  const search = searchParams.get('search');
  if (search) filters.search = search;
  
  const location = searchParams.get('location');
  if (location) filters.location = location;
  
  const dateFrom = searchParams.get('dateFrom');
  const dateTo = searchParams.get('dateTo');
  if (dateFrom || dateTo) {
    filters.dateRange = {};
    if (dateFrom) filters.dateRange.start = new Date(dateFrom);
    if (dateTo) filters.dateRange.end = new Date(dateTo);
  }
  
  const locations = searchParams.get('locations');
  if (locations) filters.locations = locations.split(',');
  
  const types = searchParams.get('types');
  if (types) filters.types = types.split(',') as Tournament['level'][];
  
  const surface = searchParams.get('surface');
  if (surface) filters.surface = surface as Tournament['surface'];
  
  const gender = searchParams.get('gender');
  if (gender) filters.gender = gender as Tournament['gender'];
  
  const statuses = searchParams.get('statuses');
  if (statuses) filters.statuses = statuses.split(',') as Tournament['status'][];
  
  const referees = searchParams.get('referees');
  if (referees) filters.referees = referees.split(',');
  
  return filters;
};

// Debounce utility
export const debounce = <T extends (...args: unknown[]) => unknown>(
  func: T,
  delay: number
): ((...args: Parameters<T>) => void) => {
  let timeoutId: NodeJS.Timeout;
  return (...args: Parameters<T>) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => func(...args), delay);
  };
};