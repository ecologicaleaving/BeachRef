import { isFilterActive, getActiveFilterCount } from '../../utils/filter.utils';

describe('useFilters', () => {
  describe('filter utilities', () => {
    it('identifies active filters correctly', () => {
      expect(isFilterActive({})).toBe(false);
      expect(isFilterActive({ search: 'test' })).toBe(true);
      expect(isFilterActive({ types: ['World Tour'] })).toBe(true);
      expect(isFilterActive({ dateRange: { start: new Date() } })).toBe(true);
    });

    it('counts active filters correctly', () => {
      expect(getActiveFilterCount({})).toBe(0);
      expect(getActiveFilterCount({ 
        search: 'test', 
        locations: ['Italy'] 
      })).toBe(2);
      expect(getActiveFilterCount({ 
        search: 'volleyball',
        types: ['World Tour', 'Continental'],
        surface: 'Sand',
        locations: ['Brazil', 'USA']
      })).toBe(4);
    });

    it('handles complex filter combinations', () => {
      const complexFilters = {
        search: 'beach volleyball',
        dateRange: { start: new Date('2024-01-01'), end: new Date('2024-12-31') },
        locations: ['Brazil', 'USA', 'Italy'],
        types: ['World Tour' as const],
        surface: 'Sand' as const,
        gender: 'Men' as const,
        statuses: ['Live' as const, 'Upcoming' as const]
      };

      expect(isFilterActive(complexFilters)).toBe(true);
      expect(getActiveFilterCount(complexFilters)).toBe(7);
    });

    it('ignores empty arrays and undefined values', () => {
      const emptyFilters = {
        search: '',
        types: [],
        locations: [],
        statuses: [],
        surface: undefined,
        gender: undefined,
        dateRange: {}
      };

      expect(isFilterActive(emptyFilters)).toBe(false);
      expect(getActiveFilterCount(emptyFilters)).toBe(0);
    });

    it('handles partial date ranges', () => {
      expect(isFilterActive({ dateRange: { start: new Date() } })).toBe(true);
      expect(isFilterActive({ dateRange: { end: new Date() } })).toBe(true);
      expect(getActiveFilterCount({ dateRange: { start: new Date() } })).toBe(1);
    });
  });

  describe('filter state management', () => {
    it('maintains filter state consistency', () => {
      // Test that filter operations maintain valid state
      const initialFilters = {
        search: 'test',
        types: ['World Tour' as const],
        locations: ['Brazil']
      };

      expect(isFilterActive(initialFilters)).toBe(true);
      expect(getActiveFilterCount(initialFilters)).toBe(3);

      // Simulate clearing search
      const afterClearSearch = {
        ...initialFilters,
        search: ''
      };

      expect(getActiveFilterCount(afterClearSearch)).toBe(2);
    });

    it('validates filter type consistency', () => {
      // Test that filter utilities handle different data types correctly
      const mixedFilters = {
        search: 'beach',
        types: ['World Tour' as const],
        surface: 'Sand' as const,
        locations: ['Brazil', 'USA'],
        dateRange: { start: new Date('2024-01-01') }
      };

      expect(typeof getActiveFilterCount(mixedFilters)).toBe('number');
      expect(typeof isFilterActive(mixedFilters)).toBe('boolean');
    });
  });
});