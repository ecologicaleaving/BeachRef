import { renderHook, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useTournaments, TournamentsFilters } from '../useTournaments';
import { supabase } from '../../services/supabase';
import React from 'react';

// Mock Supabase
jest.mock('../../services/supabase', () => ({
  supabase: {
    from: jest.fn(() => ({
      select: jest.fn(() => ({
        eq: jest.fn(() => ({
          data: [],
          error: null
        }))
      }))
    }))
  }
}));

// Mock fetch for VIS Adapter fallback
global.fetch = jest.fn();
const mockFetch = fetch as jest.MockedFunction<typeof fetch>;

// Mock environment variables
process.env.EXPO_PUBLIC_SUPABASE_URL = 'https://test.supabase.co/rest/v1';
process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY = 'test-anon-key';

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false, // Disable retries for tests
      },
    },
  });
  
  return ({ children }: { children: React.ReactNode }) => 
    React.createElement(QueryClientProvider, { client: queryClient }, children);
};

describe('useTournaments Hook - Database First Strategy', () => {
  const mockSupabaseQuery = {
    select: jest.fn(() => mockSupabaseQuery),
    eq: jest.fn(() => mockSupabaseQuery),
    data: [],
    error: null
  };
  beforeEach(() => {
    jest.clearAllMocks();
    (supabase?.from as jest.Mock)?.mockReturnValue(mockSupabaseQuery);
    mockSupabaseQuery.eq.mockReturnValue({ data: [], error: null });
  });

  describe('Database-First Strategy', () => {
    it('should prioritize database query over API', async () => {
      const mockTournaments = [{
        id: 1,
        vis_tournament_no: 123,
        tournament_code: 'TEST2024',
        name: 'Test Tournament',
        gender: 'M',
        type: 'FIVB',
        season: 2024,
        status: 'ACTIVE',
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z'
      }];

      mockSupabaseQuery.eq.mockResolvedValue({
        data: mockTournaments,
        error: null
      });

      const { result } = renderHook(
        () => useTournaments({ season: 2024 }),
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(supabase?.from).toHaveBeenCalledWith('tournaments');
      expect(result.current.source).toBe('database');
      expect(result.current.performance.fallbackUsed).toBe(false);
      expect(mockFetch).not.toHaveBeenCalled();
    });

    it('should apply database filters using indexes', async () => {
      const filters: TournamentsFilters = {
        season: 2024,
        gender: 'W',
        country: 'USA',
        status: 'ACTIVE'
      };

      mockSupabaseQuery.eq.mockResolvedValue({ data: [], error: null });

      renderHook(
        () => useTournaments(filters),
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        expect(mockSupabaseQuery.eq).toHaveBeenCalledWith('season', 2024);
        expect(mockSupabaseQuery.eq).toHaveBeenCalledWith('gender', 'W');
        expect(mockSupabaseQuery.eq).toHaveBeenCalledWith('country', 'USA');
        expect(mockSupabaseQuery.eq).toHaveBeenCalledWith('status', 'ACTIVE');
      });
    });
  });

  describe('VIS Adapter Fallback', () => {
    it('should fallback to VIS Adapter when database is empty', async () => {
      mockSupabaseQuery.eq.mockResolvedValue({ data: [], error: null });
      
      const mockVisResponse = {
        success: true,
        data: [{
          id: 'vis-123',
          visNo: '123',
          code: 'VIS2024',
          name: 'VIS Tournament',
          gender: 'W',
          tournamentType: 'BPT',
          dates: {
            startDate: '2024-08-01T00:00:00Z',
            endDate: '2024-08-07T00:00:00Z',
          },
          status: 'UPCOMING'
        }]
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockVisResponse,
      } as Response);

      const { result } = renderHook(
        () => useTournaments({ season: 2024 }),
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.source).toBe('api');
      expect(result.current.performance.fallbackUsed).toBe(true);
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/functions/v1/vis-adapter/vis/tournaments'),
        expect.objectContaining({
          headers: expect.objectContaining({
            'Authorization': 'Bearer test-anon-key',
            'Content-Type': 'application/json',
          }),
        })
      );
    });

    it('should not fallback when fallback is disabled', async () => {
      mockSupabaseQuery.eq.mockResolvedValue({ data: [], error: null });

      const { result } = renderHook(
        () => useTournaments({}, { enableFallback: false }),
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toEqual([]);
      expect(result.current.source).toBe('unknown');
      expect(mockFetch).not.toHaveBeenCalled();
    });
  });

  describe('Backward Compatibility', () => {
    it('should maintain TournamentsFilters interface', () => {
      const filters: TournamentsFilters = {
        season: 2024,
        gender: 'M',
        country: 'USA',
        status: 'ACTIVE'
      };

      const { result } = renderHook(
        () => useTournaments(filters),
        { wrapper: createWrapper() }
      );

      expect(result.current.config).toBeDefined();
      expect(result.current.forceRefresh).toBeInstanceOf(Function);
    });

    it('should provide performance and source metadata', () => {
      const { result } = renderHook(
        () => useTournaments(),
        { wrapper: createWrapper() }
      );

      expect(result.current.source).toBeDefined();
      expect(result.current.performance).toBeDefined();
      expect(result.current.performance.queryTime).toBeDefined();
      expect(result.current.performance.fallbackUsed).toBeDefined();
    });
  });
});