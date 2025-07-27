import {
  isFilterActive,
  getActiveFilterCount,
  filtersToQueryParams,
  queryParamsToFilters,
  clearAllFilters
} from '../filter.utils';
import type { TournamentFilters } from '../../types/tournament.types';

describe('filter.utils', () => {
  describe('isFilterActive', () => {
    it('returns false for empty filters', () => {
      expect(isFilterActive({})).toBe(false);
    });

    it('returns true when search filter is active', () => {
      expect(isFilterActive({ search: 'volleyball' })).toBe(true);
    });

    it('returns true when location filter is active', () => {
      expect(isFilterActive({ locations: ['Italy'] })).toBe(true);
    });

    it('returns true when date range is active', () => {
      expect(isFilterActive({ 
        dateRange: { start: new Date('2024-01-01') } 
      })).toBe(true);
    });

    it('returns false when all filters are empty', () => {
      expect(isFilterActive({ 
        search: '',
        locations: [],
        types: []
      })).toBe(false);
    });
  });

  describe('getActiveFilterCount', () => {
    it('returns 0 for empty filters', () => {
      expect(getActiveFilterCount({})).toBe(0);
    });

    it('counts individual active filters', () => {
      const filters: TournamentFilters = {
        search: 'test',
        locations: ['Italy'],
        types: ['World Tour'],
        surface: 'Sand'
      };
      expect(getActiveFilterCount(filters)).toBe(4);
    });

    it('does not count empty array filters', () => {
      const filters: TournamentFilters = {
        search: 'test',
        locations: [],
        types: []
      };
      expect(getActiveFilterCount(filters)).toBe(1);
    });
  });

  describe('filtersToQueryParams', () => {
    it('converts filters to query parameters', () => {
      const filters: TournamentFilters = {
        search: 'volleyball',
        locations: ['Italy', 'France'],
        types: ['World Tour'],
        surface: 'Sand'
      };

      const params = filtersToQueryParams(filters);

      expect(params.search).toBe('volleyball');
      expect(params.locations).toBe('Italy,France');
      expect(params.types).toBe('World Tour');
      expect(params.surface).toBe('Sand');
    });

    it('handles date range conversion', () => {
      const filters: TournamentFilters = {
        dateRange: {
          start: new Date('2024-01-01'),
          end: new Date('2024-01-31')
        }
      };

      const params = filtersToQueryParams(filters);

      expect(params.dateFrom).toBe('2024-01-01');
      expect(params.dateTo).toBe('2024-01-31');
    });

    it('excludes empty values', () => {
      const filters: TournamentFilters = {
        search: '',
        locations: [],
        types: undefined
      };

      const params = filtersToQueryParams(filters);

      expect(Object.keys(params)).toHaveLength(0);
    });
  });

  describe('queryParamsToFilters', () => {
    it('converts query parameters to filters', () => {
      const searchParams = new URLSearchParams({
        search: 'volleyball',
        locations: 'Italy,France',
        types: 'World Tour,Continental',
        surface: 'Sand'
      });

      const filters = queryParamsToFilters(searchParams);

      expect(filters.search).toBe('volleyball');
      expect(filters.locations).toEqual(['Italy', 'France']);
      expect(filters.types).toEqual(['World Tour', 'Continental']);
      expect(filters.surface).toBe('Sand');
    });

    it('handles date range conversion', () => {
      const searchParams = new URLSearchParams({
        dateFrom: '2024-01-01',
        dateTo: '2024-01-31'
      });

      const filters = queryParamsToFilters(searchParams);

      expect(filters.dateRange?.start).toEqual(new Date('2024-01-01'));
      expect(filters.dateRange?.end).toEqual(new Date('2024-01-31'));
    });
  });

  describe('clearAllFilters', () => {
    it('returns cleared filter object with default values', () => {
      const clearedFilters = clearAllFilters();
      expect(clearedFilters).toEqual({
        search: undefined,
        location: undefined,
        dateRange: undefined,
        locations: [],
        types: [],
        surface: undefined,
        gender: undefined,
        statuses: []
      });
    });
  });
});