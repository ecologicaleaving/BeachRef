import { renderHook, act } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { useFilters } from '../useFilters';
import React from 'react';

// Mock localStorage
const mockLocalStorage = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  clear: jest.fn(),
};
Object.defineProperty(window, 'localStorage', { value: mockLocalStorage });

// Mock router
const wrapper = ({ children }: { children: React.ReactNode }) => (
  <BrowserRouter>{children}</BrowserRouter>
);

describe('useFilters - Referee Functionality (Story 1.3)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockLocalStorage.getItem.mockReturnValue(null);
    // Mock URLSearchParams
    Object.defineProperty(window, 'location', {
      value: { search: '' },
      writable: true,
    });
  });

  describe('Referee filter state management', () => {
    it('should initialize with empty referee filter', () => {
      const { result } = renderHook(() => useFilters(), { wrapper });
      
      expect(result.current.filters.referees).toEqual([]);
    });

    it('should update referee filter when updateReferees is called', () => {
      const { result } = renderHook(() => useFilters(), { wrapper });
      
      act(() => {
        result.current.updateReferees(['John Smith', 'Maria Garcia']);
      });
      
      expect(result.current.filters.referees).toEqual(['John Smith', 'Maria Garcia']);
    });

    it('should clear referee filter when empty array is passed', () => {
      const { result } = renderHook(() => useFilters(), { wrapper });
      
      // First add some referees
      act(() => {
        result.current.updateReferees(['John Smith', 'Maria Garcia']);
      });
      
      // Then clear them
      act(() => {
        result.current.updateReferees([]);
      });
      
      expect(result.current.filters.referees).toEqual([]);
    });

    it('should replace existing referees when updateReferees is called', () => {
      const { result } = renderHook(() => useFilters(), { wrapper });
      
      // Set initial referees
      act(() => {
        result.current.updateReferees(['John Smith']);
      });
      
      // Replace with different referees
      act(() => {
        result.current.updateReferees(['Maria Garcia', 'Hans Mueller']);
      });
      
      expect(result.current.filters.referees).toEqual(['Maria Garcia', 'Hans Mueller']);
    });
  });

  describe('Filter activity detection', () => {
    it('should detect active filters when referees are selected', () => {
      const { result } = renderHook(() => useFilters(), { wrapper });
      
      act(() => {
        result.current.updateReferees(['John Smith']);
      });
      
      expect(result.current.hasActiveFilters).toBe(true);
      expect(result.current.activeFilterCount).toBe(1);
    });

    it('should not detect active filters when referee array is empty', () => {
      const { result } = renderHook(() => useFilters(), { wrapper });
      
      act(() => {
        result.current.updateReferees([]);
      });
      
      expect(result.current.hasActiveFilters).toBe(false);
      expect(result.current.activeFilterCount).toBe(0);
    });

    it('should count referee filter with other filters', () => {
      const { result } = renderHook(() => useFilters(), { wrapper });
      
      act(() => {
        result.current.updateReferees(['John Smith']);
        result.current.updateSearch('test tournament');
        result.current.updateLocations(['Brazil']);
      });
      
      expect(result.current.hasActiveFilters).toBe(true);
      expect(result.current.activeFilterCount).toBe(3);
    });
  });

  describe('Filter clearing', () => {
    it('should clear referee filter when clearFilters is called', () => {
      const { result } = renderHook(() => useFilters(), { wrapper });
      
      // Set some filters including referees
      act(() => {
        result.current.updateReferees(['John Smith', 'Maria Garcia']);
        result.current.updateSearch('test');
        result.current.updateLocations(['Brazil']);
      });
      
      // Clear all filters
      act(() => {
        result.current.clearFilters();
      });
      
      expect(result.current.filters.referees).toEqual([]);
      expect(result.current.filters.search).toBeUndefined();
      expect(result.current.filters.locations).toEqual([]);
    });

    it('should clear only referee filter while preserving others', () => {
      const { result } = renderHook(() => useFilters(), { wrapper });
      
      // Set multiple filters
      act(() => {
        result.current.updateReferees(['John Smith']);
        result.current.updateSearch('test tournament');
      });
      
      // Clear only referees
      act(() => {
        result.current.updateReferees([]);
      });
      
      expect(result.current.filters.referees).toEqual([]);
      expect(result.current.filters.search).toBe('test tournament');
    });
  });

  describe('LocalStorage persistence', () => {
    it('should save referee filter to localStorage', () => {
      const { result } = renderHook(() => useFilters(), { wrapper });
      
      act(() => {
        result.current.updateReferees(['John Smith', 'Maria Garcia']);
      });
      
      expect(mockLocalStorage.setItem).toHaveBeenCalledWith(
        'tournament-filters',
        expect.stringContaining('"referees":["John Smith","Maria Garcia"]')
      );
    });

    it('should load referee filter from localStorage on initialization', () => {
      const savedFilters = {
        referees: ['John Smith', 'Hans Mueller'],
        search: 'test'
      };
      
      mockLocalStorage.getItem.mockReturnValue(JSON.stringify(savedFilters));
      
      const { result } = renderHook(() => useFilters(), { wrapper });
      
      expect(result.current.filters.referees).toEqual(['John Smith', 'Hans Mueller']);
      expect(result.current.filters.search).toBe('test');
    });

    it('should handle corrupted localStorage data gracefully', () => {
      mockLocalStorage.getItem.mockReturnValue('invalid json');
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();
      
      const { result } = renderHook(() => useFilters(), { wrapper });
      
      expect(result.current.filters.referees).toEqual([]);
      expect(consoleSpy).toHaveBeenCalledWith('Failed to load saved filters:', expect.any(Error));
      
      consoleSpy.mockRestore();
    });
  });

  describe('URL parameter synchronization', () => {
    it('should update URL with referee filter parameters', async () => {
      const mockSetSearchParams = jest.fn();
      
      // Mock useSearchParams
      jest.doMock('react-router-dom', () => ({
        ...jest.requireActual('react-router-dom'),
        useSearchParams: () => [new URLSearchParams(), mockSetSearchParams]
      }));
      
      const { result } = renderHook(() => useFilters(), { wrapper });
      
      act(() => {
        result.current.updateReferees(['John Smith', 'Maria Garcia']);
      });
      
      // Wait for debounced URL update
      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 350));
      });
      
      expect(mockSetSearchParams).toHaveBeenCalled();
    });

    it('should parse referee filter from URL parameters', () => {
      // Mock URLSearchParams with referee parameter
      const mockSearchParams = new URLSearchParams();
      mockSearchParams.set('referees', 'John Smith,Maria Garcia');
      
      jest.doMock('react-router-dom', () => ({
        ...jest.requireActual('react-router-dom'),
        useSearchParams: () => [mockSearchParams, jest.fn()]
      }));
      
      const { result } = renderHook(() => useFilters(), { wrapper });
      
      expect(result.current.filters.referees).toEqual(['John Smith', 'Maria Garcia']);
    });

    it('should handle comma-separated referee names in URL', () => {
      const mockSearchParams = new URLSearchParams();
      mockSearchParams.set('referees', 'John Smith,Maria Garcia,Hans Mueller');
      
      jest.doMock('react-router-dom', () => ({
        ...jest.requireActual('react-router-dom'),
        useSearchParams: () => [mockSearchParams, jest.fn()]
      }));
      
      const { result } = renderHook(() => useFilters(), { wrapper });
      
      expect(result.current.filters.referees).toEqual(['John Smith', 'Maria Garcia', 'Hans Mueller']);
    });
  });

  describe('Integration with other filters', () => {
    it('should work alongside location filters', () => {
      const { result } = renderHook(() => useFilters(), { wrapper });
      
      act(() => {
        result.current.updateReferees(['John Smith']);
        result.current.updateLocations(['Brazil', 'USA']);
      });
      
      expect(result.current.filters.referees).toEqual(['John Smith']);
      expect(result.current.filters.locations).toEqual(['Brazil', 'USA']);
      expect(result.current.activeFilterCount).toBe(2);
    });

    it('should work alongside type filters', () => {
      const { result } = renderHook(() => useFilters(), { wrapper });
      
      act(() => {
        result.current.updateReferees(['Maria Garcia', 'Hans Mueller']);
        result.current.updateTypes(['World Tour', 'Continental']);
      });
      
      expect(result.current.filters.referees).toEqual(['Maria Garcia', 'Hans Mueller']);
      expect(result.current.filters.types).toEqual(['World Tour', 'Continental']);
      expect(result.current.activeFilterCount).toBe(2);
    });

    it('should work alongside search filter', () => {
      const { result } = renderHook(() => useFilters(), { wrapper });
      
      act(() => {
        result.current.updateReferees(['John Smith']);
        result.current.updateSearch('beach volleyball');
      });
      
      expect(result.current.filters.referees).toEqual(['John Smith']);
      expect(result.current.filters.search).toBe('beach volleyball');
      expect(result.current.activeFilterCount).toBe(2);
    });
  });

  describe('Performance considerations', () => {
    it('should not create new filter objects on every render when referees unchanged', () => {
      const { result, rerender } = renderHook(() => useFilters(), { wrapper });
      
      act(() => {
        result.current.updateReferees(['John Smith']);
      });
      
      const firstFilters = result.current.filters;
      rerender();
      const secondFilters = result.current.filters;
      
      expect(firstFilters.referees).toBe(secondFilters.referees);
    });

    it('should maintain referees array reference when other filters change', () => {
      const { result } = renderHook(() => useFilters(), { wrapper });
      
      act(() => {
        result.current.updateReferees(['John Smith', 'Maria Garcia']);
      });
      
      const initialReferees = result.current.filters.referees;
      
      act(() => {
        result.current.updateSearch('test');
      });
      
      expect(result.current.filters.referees).toBe(initialReferees);
    });
  });
});