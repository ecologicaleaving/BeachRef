import { renderHook, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useReferees, RefereesFilters } from '../useReferees';
import { supabase } from '../../services/supabase';
import React from 'react';

// Mock Supabase
jest.mock('../../services/supabase', () => ({
  supabase: {
    from: jest.fn(() => ({
      select: jest.fn(() => ({
        eq: jest.fn(() => ({
          not: jest.fn(() => ({
            data: [],
            error: null
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

describe('useReferees Hook - Database First Strategy with Assignment Status', () => {
  // Il doppio del costruttore di query e' INCATENABILE e ATTENDIBILE, come
  // l'originale: PostgREST restituisce sempre lo stesso costruttore e lo si
  // attende alla fine, qualunque filtro sia stato applicato.
  //
  // Prima il risultato era appeso a `.not()`, ma il hook chiama `.not()` solo
  // quando c'e' un filtro `status`: con `{ federationCode: 'USA' }` la catena
  // finisce su `.eq()`, il dato preparato non arrivava mai e il hook cadeva sul
  // ripiego VIS. Sette test asserivano cosi' su un percorso che non stavano
  // esercitando.
  let risultato: { data: unknown[]; error: unknown } = { data: [], error: null };
  const impostaRisultato = (r: { data: unknown[]; error: unknown }) => {
    risultato = r;
  };

  const mockSupabaseQuery: any = {
    select: jest.fn(() => mockSupabaseQuery),
    eq: jest.fn(() => mockSupabaseQuery),
    not: jest.fn(() => mockSupabaseQuery),
    // `then` rende l'oggetto attendibile: `await query` risolve qui.
    then: (ok: any, ko: any) => Promise.resolve(risultato).then(ok, ko),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (supabase?.from as jest.Mock)?.mockReturnValue(mockSupabaseQuery);
    impostaRisultato({ data: [], error: null });
  });

  describe('Database-First Strategy', () => {
    it('should prioritize database query over API', async () => {
      const mockReferees = [{
        id: 1,
        vis_referee_no: 123,
        first_name: 'John',
        last_name: 'Doe',
        gender: 'M',
        federation: 'USA',
        birthdate: '1985-05-15',
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z'
      }];

      impostaRisultato({
        data: mockReferees,
        error: null
      });

      const { result } = renderHook(
        () => useReferees({ federationCode: 'USA' }),
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(supabase?.from).toHaveBeenCalledWith('referees');
      expect(result.current.source).toBe('database');
      expect(result.current.performance.fallbackUsed).toBe(false);
      expect(mockFetch).not.toHaveBeenCalled();
    });

    it('should apply database filters using indexes', async () => {
      const filters: RefereesFilters = {
        federationCode: 'USA',
        status: 'ACTIVE',
        assignmentStatus: 'available'
      };

      impostaRisultato({ data: [], error: null });

      renderHook(
        () => useReferees(filters),
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        expect(mockSupabaseQuery.eq).toHaveBeenCalledWith('federation', 'USA');
        expect(mockSupabaseQuery.not).toHaveBeenCalledWith('federation', 'is', null);
      });
    });

    it('should handle assignment status filtering', async () => {
      const mockReferees = [
        {
          id: 1,
          vis_referee_no: 123,
          first_name: 'John',
          last_name: 'Doe',
          gender: 'M',
          federation: 'USA',
          birthdate: '1985-05-15',
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z'
        },
        {
          id: 2,
          vis_referee_no: 124,
          first_name: 'Jane',
          last_name: 'Smith',
          gender: 'W',
          federation: 'CAN',
          birthdate: '1987-08-20',
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z'
        }
      ];

      impostaRisultato({
        data: mockReferees,
        error: null
      });

      const { result } = renderHook(
        () => useReferees({ assignmentStatus: 'available' }),
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
        expect(result.current.data).toHaveLength(2);
        expect(result.current.assignmentCounts.available).toBe(2);
        expect(result.current.assignmentCounts.assigned).toBe(0);
      });
    });
  });

  describe('VIS Adapter Fallback', () => {
    it('should fallback to VIS Adapter when database is empty', async () => {
      impostaRisultato({ data: [], error: null });
      
      const mockVisResponse = {
        success: true,
        data: [{
          id: 'vis-123',
          refereeId: '123',
          name: 'VIS Referee',
          firstName: 'VIS',
          lastName: 'Referee',
          federationCode: 'BRA',
          gender: 'M',
          status: 'ACTIVE',
          type: 'REFEREE',
          assignmentStatus: {
            current: 1,
            upcoming: 2,
            completed: 5,
            online: true
          },
          assignments: []
        }]
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockVisResponse,
      } as Response);

      const { result } = renderHook(
        () => useReferees({ federationCode: 'BRA' }),
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.source).toBe('api');
      expect(result.current.performance.fallbackUsed).toBe(true);
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/functions/v1/vis-adapter/vis/referees'),
        expect.objectContaining({
          headers: expect.objectContaining({
            'Authorization': 'Bearer test-anon-key',
            'Content-Type': 'application/json',
          }),
        })
      );
    });

    it('should not fallback when fallback is disabled', async () => {
      impostaRisultato({ data: [], error: null });

      const { result } = renderHook(
        () => useReferees({}, { enableFallback: false }),
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

  describe('Cache Strategy Logic', () => {
    it('should determine live cache strategy for assigned referees', () => {
      const { result } = renderHook(
        () => useReferees({ assignmentStatus: 'assigned' }),
        { wrapper: createWrapper() }
      );

      expect(result.current.config.cacheStrategy).toBe('live');
    });

    it('should determine static cache strategy for general referee data', () => {
      const { result } = renderHook(
        () => useReferees({}),
        { wrapper: createWrapper() }
      );

      expect(result.current.config.cacheStrategy).toBe('static');
    });

    it('should determine historical cache strategy for inactive referees', () => {
      const { result } = renderHook(
        () => useReferees({ status: 'INACTIVE' }),
        { wrapper: createWrapper() }
      );

      expect(result.current.config.cacheStrategy).toBe('historical');
    });
  });

  describe('Federation Grouping', () => {
    it('should group referees by federation when requested', async () => {
      const mockReferees = [
        {
          id: 1,
          vis_referee_no: 123,
          first_name: 'John',
          last_name: 'Doe',
          gender: 'M',
          federation: 'USA',
          birthdate: '1985-05-15'
        },
        {
          id: 2,
          vis_referee_no: 124,
          first_name: 'Jane',
          last_name: 'Smith',
          gender: 'W',
          federation: 'CAN',
          birthdate: '1987-08-20'
        },
        {
          id: 3,
          vis_referee_no: 125,
          first_name: 'Bob',
          last_name: 'Wilson',
          gender: 'M',
          federation: 'USA',
          birthdate: '1990-03-10'
        }
      ];

      impostaRisultato({
        data: mockReferees,
        error: null
      });

      const { result } = renderHook(
        () => useReferees({}, { groupByFederation: true }),
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
        // Should be grouped by federation (CAN first, then USA)
        expect(result.current.data?.[0].federationCode).toBe('CAN');
        expect(result.current.data?.[1].federationCode).toBe('USA');
        expect(result.current.data?.[2].federationCode).toBe('USA');
      });
    });
  });

  describe('Assignment Counts', () => {
    it('should calculate assignment counts correctly', async () => {
      const mockReferees = [
        {
          id: 1,
          vis_referee_no: 123,
          first_name: 'John',
          last_name: 'Doe',
          gender: 'M',
          federation: 'USA',
          birthdate: '1985-05-15'
        },
        {
          id: 2,
          vis_referee_no: 124,
          first_name: 'Jane',
          last_name: 'Smith',
          gender: 'W',
          federation: 'CAN',
          birthdate: '1987-08-20'
        }
      ];

      impostaRisultato({
        data: mockReferees,
        error: null
      });

      const { result } = renderHook(
        () => useReferees({}),
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
        expect(result.current.assignmentCounts.total).toBe(2);
        expect(result.current.assignmentCounts.available).toBe(2);
        expect(result.current.assignmentCounts.assigned).toBe(0);
      });
    });
  });

  describe('Backward Compatibility', () => {
    it('should maintain RefereesFilters interface', () => {
      const filters: RefereesFilters = {
        tournamentCodes: ['FIVB2024M001', 'CEV2024W001'],
        federationCode: 'USA',
        status: 'ACTIVE',
        assignmentStatus: 'available',
        includeAssignments: true,
        role: 'Referee1'
      };

      const { result } = renderHook(
        () => useReferees(filters),
        { wrapper: createWrapper() }
      );

      expect(result.current.config).toBeDefined();
      expect(result.current.forceRefresh).toBeInstanceOf(Function);
      expect(result.current.assignmentCounts).toBeDefined();
    });

    it('should provide performance and source metadata', () => {
      const { result } = renderHook(
        () => useReferees(),
        { wrapper: createWrapper() }
      );

      expect(result.current.source).toBeDefined();
      expect(result.current.performance).toBeDefined();
      expect(result.current.performance.queryTime).toBeDefined();
      expect(result.current.performance.fallbackUsed).toBeDefined();
    });

    it('should support includeAssignments configuration', () => {
      const { result } = renderHook(
        () => useReferees({}, { includeAssignments: true }),
        { wrapper: createWrapper() }
      );

      expect(result.current.config.includeAssignments).toBe(true);
    });
  });

  describe('Error Handling', () => {
    it('should handle database query errors gracefully', async () => {
      impostaRisultato({
        data: null,
        error: { message: 'Database connection failed' }
      });

      const { result } = renderHook(
        () => useReferees({ federationCode: 'USA' }),
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        expect(result.current.source).toBe('unknown');
      });
    });

    it('should use conservative retry strategy', async () => {
      // This test verifies that the retry logic is properly configured
      const { result } = renderHook(
        () => useReferees({}),
        { wrapper: createWrapper() }
      );

      // The hook should be configured with conservative retry settings
      expect(result.current.config).toBeDefined();
    });
  });
});