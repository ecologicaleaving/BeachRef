/**
 * Test for the 185 matches bug fix in AnalyticsService
 * Verifies that referee analytics are properly filtered by specific referee IDs
 */

import { AnalyticsService } from '../AnalyticsService';

// Mock Supabase client
const mockSupabaseClient = {
  from: jest.fn().mockReturnThis(),
  select: jest.fn().mockReturnThis(),
  gte: jest.fn().mockReturnThis(),
  lte: jest.fn().mockReturnThis(),
  in: jest.fn().mockReturnThis(),
};

// Mock createClient
jest.mock('@supabase/supabase-js', () => ({
  createClient: jest.fn(() => mockSupabaseClient)
}));

// Mock ErrorLogger
jest.mock('../ErrorLogger', () => ({
  ErrorLogger: {
    getInstance: jest.fn(() => ({
      logError: jest.fn()
    }))
  }
}));

// Mock performance.now for consistent testing
global.performance = {
  now: jest.fn(() => 1000)
} as any;

describe('AnalyticsService - 185 Matches Bug Fix', () => {
  let analyticsService: AnalyticsService;
  let consoleSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Reset singleton instance
    (AnalyticsService as any).instance = null;
    
    // Spy on console methods
    consoleSpy = jest.spyOn(console, 'log').mockImplementation();
    jest.spyOn(console, 'warn').mockImplementation();
    
    analyticsService = AnalyticsService.getInstance();
  });

  afterEach(() => {
    consoleSpy.mockRestore();
  });

  it('should properly filter by referee IDs when provided', async () => {
    const mockAssignmentData = [
      {
        referee_id: 'referee-123',
        role: 'FIRST',
        matches: {
          id: 'match1',
          tournament_code: 'TOURNAMENT1',
          utc_datetime: '2024-01-01T10:00:00Z'
        }
      },
      {
        referee_id: 'referee-123',
        role: 'SECOND',
        matches: {
          id: 'match2',
          tournament_code: 'TOURNAMENT1',
          utc_datetime: '2024-01-01T14:00:00Z'
        }
      }
    ];

    // Mock the chain of query methods
    const mockInMethod = jest.fn().mockResolvedValue({
      data: mockAssignmentData,
      error: null
    });

    mockSupabaseClient.from.mockReturnValue({
      select: jest.fn().mockReturnValue({
        gte: jest.fn().mockReturnValue({
          lte: jest.fn().mockReturnValue({
            in: mockInMethod
          })
        })
      })
    });

    const result = await analyticsService.aggregateRefereeAnalytics(
      '2024-01-01',
      '2024-01-01',
      ['referee-123'] // Specific referee ID
    );

    // Verify that the query was properly filtered
    expect(mockInMethod).toHaveBeenCalledWith('referee_id', ['referee-123']);
    
    // Verify aggregation results
    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({
      referee_id: 'referee-123',
      total_assignments: 2,
      first_referee_count: 1,
      second_referee_count: 1,
      challenge_referee_count: 0
    });
  });

  it('should not apply IN filter when no referee IDs are provided', async () => {
    const mockResolvedValue = jest.fn().mockResolvedValue({
      data: [],
      error: null
    });

    mockSupabaseClient.from.mockReturnValue({
      select: jest.fn().mockReturnValue({
        gte: jest.fn().mockReturnValue({
          lte: mockResolvedValue
        })
      })
    });

    await analyticsService.aggregateRefereeAnalytics('2024-01-01', '2024-01-01');

    // Verify that IN filter was not applied
    expect(mockSupabaseClient.in).not.toHaveBeenCalled();
    expect(mockResolvedValue).toHaveBeenCalled();
  });


  it('should return proper aggregation with sample data that could cause 185 issue', async () => {
    // Simulate the scenario that was causing 185 matches for everyone
    const mockAssignmentData = Array.from({ length: 185 }, (_, i) => ({
      referee_id: `referee-${Math.floor(i / 15) + 1}`, // Different referees
      role: ['FIRST', 'SECOND', 'CHALLENGE'][i % 3],
      matches: {
        id: `match${i + 1}`,
        tournament_code: 'TOURNAMENT1',
        utc_datetime: '2024-01-01T10:00:00Z'
      }
    }));

    const mockInMethod = jest.fn().mockResolvedValue({
      data: mockAssignmentData.filter(d => d.referee_id === 'referee-1'), // Only referee-1's data
      error: null
    });

    mockSupabaseClient.from.mockReturnValue({
      select: jest.fn().mockReturnValue({
        gte: jest.fn().mockReturnValue({
          lte: jest.fn().mockReturnValue({
            in: mockInMethod
          })
        })
      })
    });

    const result = await analyticsService.aggregateRefereeAnalytics(
      '2024-01-01',
      '2024-01-01',
      ['referee-1']
    );

    // Should only get referee-1's matches, not all 185
    expect(result).toHaveLength(1);
    expect(result[0].referee_id).toBe('referee-1');
    expect(result[0].total_assignments).toBeLessThan(185); // Should be much less
    expect(result[0].total_assignments).toBeGreaterThan(0);
    
    // Verify the filtering was applied correctly
    expect(mockInMethod).toHaveBeenCalledWith('referee_id', ['referee-1']);
  });

  it('should handle empty results gracefully', async () => {
    const mockInMethod = jest.fn().mockResolvedValue({
      data: [],
      error: null
    });

    mockSupabaseClient.from.mockReturnValue({
      select: jest.fn().mockReturnValue({
        gte: jest.fn().mockReturnValue({
          lte: jest.fn().mockReturnValue({
            in: mockInMethod
          })
        })
      })
    });

    const result = await analyticsService.aggregateRefereeAnalytics(
      '2024-01-01',
      '2024-01-01',
      ['nonexistent-referee']
    );

    expect(result).toEqual([]);
  });
});