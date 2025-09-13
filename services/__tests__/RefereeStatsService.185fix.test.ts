/**
 * Test for the 185 matches bug fix in RefereeStatsService
 * Verifies that invalid referee ID resolution doesn't trigger VIS API queries
 * that return all matches in the database
 */

import { RefereeStatsService } from '../RefereeStatsService';

// Mock fetch globally
global.fetch = jest.fn();

// Mock LocalStorageManager
jest.mock('../LocalStorageManager', () => ({
  LocalStorageManager: jest.fn().mockImplementation(() => ({
    get: jest.fn().mockResolvedValue(null),
    set: jest.fn().mockResolvedValue(undefined),
    delete: jest.fn().mockResolvedValue(undefined)
  }))
}));

// Mock CacheServiceCompatibility
jest.mock('../../hooks/compatibility/CacheServiceCompatibility', () => ({
  CacheServiceCompatibility: {
    getTournaments: jest.fn().mockResolvedValue({
      success: true,
      data: [{ visNo: '123456', name: 'Test Tournament' }]
    })
  }
}));

// Mock console methods to suppress noise during tests
const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();
const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

describe('RefereeStatsService - 185 Matches Bug Fix', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Reset singleton instance
    (RefereeStatsService as any).instance = null;
  });

  afterEach(() => {
    consoleSpy.mockRestore();
    consoleWarnSpy.mockRestore();
    consoleErrorSpy.mockRestore();
  });

  describe('Invalid Referee ID Validation', () => {
    it('should not make VIS API calls with null referee ID', async () => {
      // Mock referee ID resolution to return null (common cause of 185 bug)
      const mockFetch = global.fetch as jest.MockedFunction<typeof fetch>;
      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: () => Promise.resolve('<EventRefereeList />')
      } as Response);

      const result = await RefereeStatsService.getCareerStats('NonExistentReferee');

      // Should return null/empty stats without making career queries
      expect(result).toEqual(expect.objectContaining({
        totalMatches: 0,
        matchesAsFirst: 0,
        matchesAsSecond: 0
      }));

      // Should have made only the referee resolution call, not the career stats calls
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });

    it('should not make VIS API calls with empty referee ID', async () => {
      const mockFetch = global.fetch as jest.MockedFunction<typeof fetch>;
      
      const result = await RefereeStatsService.getCurrentTournamentStats('', '123456');

      expect(result).toBeNull();
      expect(mockFetch).not.toHaveBeenCalled();
    });

    it('should not make VIS API calls with malformed referee ID', async () => {
      const mockFetch = global.fetch as jest.MockedFunction<typeof fetch>;
      
      // Mock referee resolution to return malformed ID
      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: () => Promise.resolve('<EventReferee NoReferee="INVALID123" />')
      } as Response);

      const result = await RefereeStatsService.getCurrentTournamentStats('TestReferee', '123456');

      // Should return null without making additional VIS API calls
      expect(result).toBeNull();
      
      // Should have made only the referee resolution call
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });

    it('should validate 6-digit referee ID format', async () => {
      const mockFetch = global.fetch as jest.MockedFunction<typeof fetch>;
      
      // Test with already valid 6-digit referee ID
      const result = await RefereeStatsService.getCurrentTournamentStats('123456', '789012');

      // Should make VIS API calls for valid referee ID
      expect(mockFetch).toHaveBeenCalled();
    });
  });

  describe('VIS API Query Prevention', () => {
    it('should prevent querying VIS API when referee resolution fails', async () => {
      const mockFetch = global.fetch as jest.MockedFunction<typeof fetch>;
      
      // Mock failed referee resolution
      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: () => Promise.resolve('<EventRefereeList></EventRefereeList>')
      } as Response);

      const result = await RefereeStatsService.getSeasonStats('UnknownReferee', '2024');

      // Should return no-data stats
      expect(result).toEqual(expect.objectContaining({
        season: '2024',
        totalMatches: 0,
        matchesAsFirst: 0,
        matchesAsSecond: 0
      }));

      // Should have made only the referee resolution call
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });

    it('should log warning when invalid referee ID is detected', async () => {
      const mockFetch = global.fetch as jest.MockedFunction<typeof fetch>;
      
      // Test with explicitly invalid referee ID (would cause 185 bug in old version)
      await RefereeStatsService.getCurrentTournamentStats('null', '123456');

      // Should have logged a warning about invalid referee ID
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        expect.stringContaining('Invalid referee ID "null"')
      );
      
      // Should not have made any VIS API calls
      expect(mockFetch).not.toHaveBeenCalled();
    });
  });

  describe('Proper Referee ID Handling', () => {
    it('should process valid referee IDs correctly', async () => {
      const mockFetch = global.fetch as jest.MockedFunction<typeof fetch>;
      
      // Mock successful VIS API responses
      mockFetch
        // First call: career matches as first referee
        .mockResolvedValueOnce({
          ok: true,
          text: () => Promise.resolve(`
            <BeachMatchList>
              <BeachMatch No="1" NoReferee1="123456" NoReferee2="654321" RoundCode="Pool A Men" />
              <BeachMatch No="2" NoReferee1="123456" NoReferee2="654321" RoundCode="Pool B Men" />
            </BeachMatchList>
          `)
        } as Response)
        // Second call: career matches as second referee
        .mockResolvedValueOnce({
          ok: true,
          text: () => Promise.resolve(`
            <BeachMatchList>
              <BeachMatch No="3" NoReferee1="654321" NoReferee2="123456" RoundCode="Pool C Women" />
            </BeachMatchList>
          `)
        } as Response);

      const result = await RefereeStatsService.getCareerStats('123456');

      // Should get proper stats (3 total matches: 2 as first, 1 as second)
      expect(result).toEqual(expect.objectContaining({
        totalMatches: 3,
        matchesAsFirst: 2,
        matchesAsSecond: 1
      }));

      // Should have made 2 VIS API calls (first + second referee queries)
      expect(mockFetch).toHaveBeenCalledTimes(2);
    });

    it('should handle referee name resolution correctly', async () => {
      const mockFetch = global.fetch as jest.MockedFunction<typeof fetch>;
      
      // Mock referee resolution
      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: () => Promise.resolve(`
          <EventRefereeList>
            <EventReferee NoReferee="123456" FirstName="John" LastName="Doe" />
          </EventRefereeList>
        `)
      } as Response);

      // Mock tournament matches (empty for simplicity)
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          text: () => Promise.resolve('<BeachMatchList></BeachMatchList>')
        } as Response)
        .mockResolvedValueOnce({
          ok: true,
          text: () => Promise.resolve('<BeachMatchList></BeachMatchList>')
        } as Response);

      const result = await RefereeStatsService.getCurrentTournamentStats('John Doe', '789012');

      // Should have resolved the referee and made the queries
      expect(mockFetch).toHaveBeenCalledTimes(3); // 1 resolution + 2 match queries
      
      // Should return valid stats object (even if empty)
      expect(result).toEqual(expect.objectContaining({
        totalMatches: 0,
        matchesAsFirst: 0,
        matchesAsSecond: 0
      }));
    });
  });
});