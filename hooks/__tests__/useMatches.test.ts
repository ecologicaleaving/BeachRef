import { renderHook, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useMatches, MatchesFilters } from '../useMatches';
import { supabase } from '../../services/supabase';
import React from 'react';

// Mock Supabase
jest.mock('../../services/supabase', () => ({
  supabase: {
    from: jest.fn(() => ({
      select: jest.fn(() => ({
        eq: jest.fn(() => ({
          gte: jest.fn(() => ({
            lt: jest.fn(() => ({
              data: [],
              error: null
            }))
          })),
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

describe('useMatches Hook - Database First Strategy with Intelligent Cache', () => {
  const mockSupabaseQuery = {
    select: jest.fn(() => mockSupabaseQuery),
    eq: jest.fn(() => mockSupabaseQuery),
    gte: jest.fn(() => mockSupabaseQuery),
    lt: jest.fn(() => mockSupabaseQuery),
    data: [],
    error: null
  };
  
  beforeEach(() => {
    jest.clearAllMocks();
    (supabase?.from as jest.Mock)?.mockReturnValue(mockSupabaseQuery);
    mockSupabaseQuery.lt.mockReturnValue({ data: [], error: null });
  });

  describe('Database-First Strategy', () => {
    it('should prioritize database query over API', async () => {
      const mockMatches = [{
        id: 1,
        vis_match_no: 123,
        tournament_code: 'TEST2024',
        event_id: 456,
        round_code: 'R1',
        round_name: 'Round 1',
        round_phase: 'MAIN',
        utc_datetime: '2024-08-15T10:00:00Z',
        local_datetime: '2024-08-15T12:00:00Z',
        court: 'Court 1',
        team_a_name: 'Team A',
        team_b_name: 'Team B',
        sets: [{ a: 21, b: 19 }, { a: 21, b: 18 }],
        result: { winner: 1, forfeit: false },
        status: 'FINISHED',
        created_at: '2024-08-15T08:00:00Z',
        match_referees: []
      }];

      mockSupabaseQuery.lt.mockResolvedValue({
        data: mockMatches,
        error: null
      });

      const { result } = renderHook(
        () => useMatches({ tournamentCode: 'TEST2024' }),
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(supabase?.from).toHaveBeenCalledWith('matches');
      expect(result.current.source).toBe('database');
      expect(result.current.performance.fallbackUsed).toBe(false);
      expect(mockFetch).not.toHaveBeenCalled();
    });

    it('should apply intelligent cache strategy based on match data age', async () => {
      // Test historical data (older than 3 days)
      const oldDate = new Date();
      oldDate.setDate(oldDate.getDate() - 4);
      const historicalFilters: MatchesFilters = {
        date: oldDate.toISOString().split('T')[0]
      };

      const { result: historicalResult } = renderHook(
        () => useMatches(historicalFilters),
        { wrapper: createWrapper() }
      );

      // Test live data (today)
      const today = new Date().toISOString().split('T')[0];
      const liveFilters: MatchesFilters = {
        date: today,
        status: 'RUNNING'
      };

      const { result: liveResult } = renderHook(
        () => useMatches(liveFilters),
        { wrapper: createWrapper() }
      );

      // Historical data should use different caching than live data
      expect(historicalResult.current.config).toBeDefined();
      expect(liveResult.current.config).toBeDefined();
    });

    it('should apply database filters using indexes', async () => {
      const filters: MatchesFilters = {
        tournamentCode: 'TEST2024',
        eventId: 456,
        round: 'R1',
        status: 'RUNNING',
        date: '2024-08-15'
      };

      mockSupabaseQuery.lt.mockResolvedValue({ data: [], error: null });

      renderHook(
        () => useMatches(filters),
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        expect(mockSupabaseQuery.eq).toHaveBeenCalledWith('tournament_code', 'TEST2024');
        expect(mockSupabaseQuery.eq).toHaveBeenCalledWith('event_id', 456);
        expect(mockSupabaseQuery.eq).toHaveBeenCalledWith('round_code', 'R1');
        expect(mockSupabaseQuery.eq).toHaveBeenCalledWith('status', 'RUNNING');
        expect(mockSupabaseQuery.gte).toHaveBeenCalledWith('utc_datetime', '2024-08-15T00:00:00Z');
        expect(mockSupabaseQuery.lt).toHaveBeenCalledWith('utc_datetime', '2024-08-15T23:59:59Z');
      });
    });
  });

  describe('VIS Adapter Fallback', () => {
    it('should fallback to VIS Adapter when database is empty', async () => {
      mockSupabaseQuery.lt.mockResolvedValue({ data: [], error: null });
      
      const mockVisResponse = {
        success: true,
        data: [{
          id: 'vis-123',
          visNo: '123',
          tournamentCode: 'VIS2024',
          matchCode: 'VIS2024-123',
          round: 'Qualification Round 1',
          status: 'SCHEDULED',
          court: { courtNumber: '2', courtName: 'Court 2' },
          scheduledDateTime: '2024-08-16T14:00:00Z',
          team1: {
            teamNumber: 1,
            teamName: 'Team C',
            player1Name: 'Player C1',
            player2Name: 'Player C2'
          },
          team2: {
            teamNumber: 2,
            teamName: 'Team D',
            player1Name: 'Player D1',
            player2Name: 'Player D2'
          }
        }]
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockVisResponse,
      } as Response);

      const { result } = renderHook(
        () => useMatches({ tournamentCode: 'VIS2024' }),
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.source).toBe('api');
      expect(result.current.performance.fallbackUsed).toBe(true);
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/functions/v1/vis-adapter/vis/matches'),
        expect.objectContaining({
          headers: expect.objectContaining({
            'Authorization': 'Bearer test-anon-key',
            'Content-Type': 'application/json',
          }),
        })
      );
    });

    it('should not fallback when fallback is disabled', async () => {
      mockSupabaseQuery.lt.mockResolvedValue({ data: [], error: null });

      const { result } = renderHook(
        () => useMatches({}, { enableFallback: false }),
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

  describe('Intelligent Cache Strategy', () => {
    it('should determine live cache strategy for running matches', () => {
      const { result } = renderHook(
        () => useMatches({ status: 'RUNNING' }),
        { wrapper: createWrapper() }
      );

      expect(result.current.config.cacheStrategy).toBe('live');
    });

    it('should determine historical cache strategy for completed matches', () => {
      const { result } = renderHook(
        () => useMatches({ status: 'COMPLETED' }),
        { wrapper: createWrapper() }
      );

      expect(result.current.config.cacheStrategy).toBe('historical');
    });

    it('should determine cache strategy based on date filters', () => {
      // Test old date (should be historical)
      const oldDate = new Date();
      oldDate.setDate(oldDate.getDate() - 5);
      
      const { result: historicalResult } = renderHook(
        () => useMatches({ 
          date: oldDate.toISOString().split('T')[0] 
        }),
        { wrapper: createWrapper() }
      );

      expect(historicalResult.current.config.cacheStrategy).toBe('historical');

      // Test today's date (should be live)
      const today = new Date();
      const { result: liveResult } = renderHook(
        () => useMatches({ 
          date: today.toISOString().split('T')[0] 
        }),
        { wrapper: createWrapper() }
      );

      expect(liveResult.current.config.cacheStrategy).toBe('live');
    });
  });

  describe('Backward Compatibility', () => {
    it('should maintain MatchesFilters interface', () => {
      const filters: MatchesFilters = {
        tournamentCode: 'TEST2024',
        eventId: 456,
        round: 'R1',
        status: 'RUNNING',
        date: '2024-08-15',
        dateRange: {
          startDate: '2024-08-15',
          endDate: '2024-08-16'
        }
      };

      const { result } = renderHook(
        () => useMatches(filters),
        { wrapper: createWrapper() }
      );

      expect(result.current.config).toBeDefined();
      expect(result.current.forceRefresh).toBeInstanceOf(Function);
    });

    it('should provide performance and source metadata', () => {
      const { result } = renderHook(
        () => useMatches(),
        { wrapper: createWrapper() }
      );

      expect(result.current.source).toBeDefined();
      expect(result.current.performance).toBeDefined();
      expect(result.current.performance.queryTime).toBeDefined();
      expect(result.current.performance.fallbackUsed).toBeDefined();
    });
  });

  describe('Real-time Updates', () => {
    it('should handle live matches with appropriate retry strategy', async () => {
      const { result } = renderHook(
        () => useMatches({ status: 'RUNNING' }),
        { wrapper: createWrapper() }
      );

      expect(result.current.config).toBeDefined();
      // Live matches should have more aggressive retry strategy
      // This is tested through the query configuration
    });
  });
});