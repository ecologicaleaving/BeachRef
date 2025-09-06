import { RefereeAssignmentsService } from '../../services/RefereeAssignmentsService';
import { CacheService } from '../../services/CacheService';
import { BeachMatch } from '../../types/match';
import { RefereeAssignmentStatus } from '../../types/RefereeAssignments';

// Mock dependencies
jest.mock('../../services/CacheService');
jest.mock('../../services/ConnectionCircuitBreaker');
jest.mock('@react-native-async-storage/async-storage');

const mockCacheService = CacheService as jest.Mocked<typeof CacheService>;

describe('RefereeAssignmentsService - Fallback Scenarios', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Cache → Match data → Empty structure fallback hierarchy', () => {
    it('should use cache data when available (primary)', async () => {
      const mockTournamentRefereeData = {
        officials: [],
        referees: [
          {
            federationCode: 'BRA',
            firstName: 'Maria',
            lastName: 'Silva',
            gender: 'W' as const,
            noReferee: 'REF001',
            status: 'Active' as const,
            type: 'Referee' as const
          }
        ],
        eventNo: 'T001',
        timestamp: '2025-01-01T00:00:00Z',
        expiresAt: '2025-01-02T00:00:00Z'
      };

      jest.spyOn(RefereeAssignmentsService, 'getRefereeDataFromCache').mockResolvedValue(mockTournamentRefereeData);

      const result = await RefereeAssignmentsService.getAllRefereesForTournament('T001');

      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('Maria Silva');
      expect(result[0].id).toBe('REF001');
      expect(result[0].federationCode).toBe('BRA');
    });

    it('should fallback to match data extraction when cache fails (secondary)', async () => {
      // Cache fails
      jest.spyOn(RefereeAssignmentsService, 'getRefereeDataFromCache').mockResolvedValue(null);
      
      // Match data available
      const mockMatches: BeachMatch[] = [
        {
          No: 'M001',
          Referee1Name: 'John Doe',
          NoReferee1: 'REF001',
          Referee1FederationCode: 'USA'
        } as BeachMatch
      ];

      jest.spyOn(RefereeAssignmentsService as any, 'fetchMatchData').mockResolvedValue(mockMatches);

      const result = await RefereeAssignmentsService.getAllRefereesForTournament('T001');

      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('John Doe');
      expect(result[0].id).toBe('REF001');
      expect(result[0].federationCode).toBe('USA');
    });

    it('should return empty structure when both cache and match data fail (tertiary)', async () => {
      // Cache fails
      jest.spyOn(RefereeAssignmentsService, 'getRefereeDataFromCache').mockResolvedValue(null);
      
      // Match data fails
      jest.spyOn(RefereeAssignmentsService as any, 'fetchMatchData').mockRejectedValue(new Error('Match data failed'));

      const result = await RefereeAssignmentsService.getAllRefereesForTournament('T001');

      expect(result).toEqual([]);
    });

    it('should gracefully handle exceptions and still provide fallback', async () => {
      // Primary method throws
      jest.spyOn(RefereeAssignmentsService, 'getRefereeDataFromCache').mockRejectedValue(new Error('Cache error'));
      
      // Fallback succeeds
      const mockMatches: BeachMatch[] = [
        {
          No: 'M001',
          Referee1Name: 'Fallback Referee',
          NoReferee1: 'REF999',
          Referee1FederationCode: 'FALLBACK'
        } as BeachMatch
      ];

      jest.spyOn(RefereeAssignmentsService as any, 'fetchMatchData').mockResolvedValue(mockMatches);

      const result = await RefereeAssignmentsService.getAllRefereesForTournament('T001');

      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('Fallback Referee');
    });
  });

  describe('Enhanced assignment tracking with fallback', () => {
    it('should enhance assignments with referee data when available', async () => {
      const mockCurrentReferee = {
        name: 'Current Referee',
        id: 'CURRENT001',
        federationCode: 'USA'
      };

      const mockAssignmentStatus: RefereeAssignmentStatus = {
        current: [],
        upcoming: [],
        completed: [],
        cancelled: []
      };

      const mockTournamentRefereeData = {
        officials: [],
        referees: [
          {
            federationCode: 'USA',
            firstName: 'Current',
            lastName: 'Referee',
            gender: 'M' as const,
            noReferee: 'CURRENT001',
            status: 'Active' as const,
            type: 'Referee' as const
          }
        ],
        eventNo: 'T001',
        timestamp: '2025-01-01T00:00:00Z',
        expiresAt: '2025-01-02T00:00:00Z'
      };

      jest.spyOn(RefereeAssignmentsService, 'getCurrentReferee').mockResolvedValue(mockCurrentReferee);
      jest.spyOn(RefereeAssignmentsService as any, 'getCachedAssignments').mockResolvedValue(mockAssignmentStatus);
      jest.spyOn(RefereeAssignmentsService, 'getRefereeDataFromCache').mockResolvedValue(mockTournamentRefereeData);

      const result = await RefereeAssignmentsService.getRefereeAssignments('T001');

      expect(result).toBeDefined();
      expect(result.current).toEqual([]);
      expect(result.upcoming).toEqual([]);
      expect(result.completed).toEqual([]);
      expect(result.cancelled).toEqual([]);
    });

    it('should handle assignment tracking without referee data enhancement', async () => {
      const mockCurrentReferee = {
        name: 'Current Referee',
        id: 'CURRENT001',
        federationCode: 'USA'
      };

      const mockAssignmentStatus: RefereeAssignmentStatus = {
        current: [],
        upcoming: [],
        completed: [],
        cancelled: []
      };

      jest.spyOn(RefereeAssignmentsService, 'getCurrentReferee').mockResolvedValue(mockCurrentReferee);
      jest.spyOn(RefereeAssignmentsService as any, 'getCachedAssignments').mockResolvedValue(mockAssignmentStatus);
      jest.spyOn(RefereeAssignmentsService, 'getRefereeDataFromCache').mockResolvedValue(null);

      const result = await RefereeAssignmentsService.getRefereeAssignments('T001');

      expect(result).toBeDefined();
      // Should still return valid assignment status even without referee enhancement
      expect(result.current).toEqual([]);
      expect(result.upcoming).toEqual([]);
      expect(result.completed).toEqual([]);
      expect(result.cancelled).toEqual([]);
    });
  });

  describe('Error handling and graceful degradation', () => {
    it('should handle network errors gracefully', async () => {
      // Simulate network error
      jest.spyOn(RefereeAssignmentsService, 'getRefereeDataFromCache').mockRejectedValue(new Error('Network error'));
      jest.spyOn(RefereeAssignmentsService as any, 'fetchMatchData').mockRejectedValue(new Error('Network error'));

      const result = await RefereeAssignmentsService.getAllRefereesForTournament('T001');

      expect(result).toEqual([]);
    });

    it('should handle malformed data gracefully', async () => {
      // Malformed cache data
      jest.spyOn(RefereeAssignmentsService, 'getRefereeDataFromCache').mockResolvedValue(null);
      
      // Malformed match data
      const malformedMatches = [
        {} as BeachMatch, // Empty match object
        { 
          No: 'M001', 
          Referee1Name: null, // Null referee name
          NoReferee1: undefined 
        } as unknown as BeachMatch
      ];

      jest.spyOn(RefereeAssignmentsService as any, 'fetchMatchData').mockResolvedValue(malformedMatches);

      const result = await RefereeAssignmentsService.getAllRefereesForTournament('T001');

      expect(result).toEqual([]);
    });

    it('should handle partial referee data gracefully', async () => {
      jest.spyOn(RefereeAssignmentsService, 'getRefereeDataFromCache').mockResolvedValue(null);
      
      const partialMatches: BeachMatch[] = [
        {
          No: 'M001',
          Referee1Name: 'John Doe',
          // Missing NoReferee1 and Referee1FederationCode
        } as BeachMatch,
        {
          No: 'M002',
          Referee2Name: 'Maria Silva',
          Referee2FederationCode: 'BRA'
          // Missing NoReferee2
        } as BeachMatch
      ];

      jest.spyOn(RefereeAssignmentsService as any, 'fetchMatchData').mockResolvedValue(partialMatches);

      const result = await RefereeAssignmentsService.getAllRefereesForTournament('T001');

      expect(result).toHaveLength(2);
      
      const johnDoe = result.find(r => r.name === 'John Doe');
      expect(johnDoe).toBeDefined();
      expect(johnDoe?.id).toBe('referee1_John_Doe');
      expect(johnDoe?.federationCode).toBe('UNKNOWN');

      const mariaSilva = result.find(r => r.name === 'Maria Silva');
      expect(mariaSilva).toBeDefined();
      expect(mariaSilva?.id).toBe('referee2_Maria_Silva');
      expect(mariaSilva?.federationCode).toBe('BRA');
    });
  });

  describe('Performance and edge cases', () => {
    it('should handle large referee datasets efficiently', async () => {
      const largeTournamentData = {
        officials: Array.from({ length: 100 }, (_, i) => ({
          federationCode: `COUNTRY${i}`,
          firstName: `Official${i}`,
          lastName: `Name${i}`,
          gender: i % 2 === 0 ? 'M' as const : 'W' as const,
          noOfficial: `OFF${i.toString().padStart(3, '0')}`,
          role: 'Referee1' as any,
          status: 'Active' as const,
          type: 'Referee' as const
        })),
        referees: Array.from({ length: 200 }, (_, i) => ({
          federationCode: `COUNTRY${i}`,
          firstName: `Referee${i}`,
          lastName: `Name${i}`,
          gender: i % 2 === 0 ? 'M' as const : 'W' as const,
          noReferee: `REF${i.toString().padStart(3, '0')}`,
          status: 'Active' as const,
          type: 'Referee' as const
        })),
        eventNo: 'T001',
        timestamp: '2025-01-01T00:00:00Z',
        expiresAt: '2025-01-02T00:00:00Z'
      };

      jest.spyOn(RefereeAssignmentsService, 'getRefereeDataFromCache').mockResolvedValue(largeTournamentData);

      const startTime = Date.now();
      const result = await RefereeAssignmentsService.getAllRefereesForTournament('T001');
      const endTime = Date.now();

      expect(result).toHaveLength(300); // 100 officials + 200 referees
      expect(endTime - startTime).toBeLessThan(1000); // Should complete within 1 second
    });

    it('should deduplicate referees correctly', async () => {
      jest.spyOn(RefereeAssignmentsService, 'getRefereeDataFromCache').mockResolvedValue(null);
      
      // Same referee appears in multiple matches
      const duplicateMatches: BeachMatch[] = [
        {
          No: 'M001',
          Referee1Name: 'John Doe',
          NoReferee1: 'REF001',
          Referee1FederationCode: 'USA'
        } as BeachMatch,
        {
          No: 'M002',
          Referee1Name: 'John Doe', // Same referee
          NoReferee1: 'REF001',    // Same ID
          Referee1FederationCode: 'USA'
        } as BeachMatch,
        {
          No: 'M003',
          Referee2Name: 'John Doe', // Same referee as referee2
          NoReferee2: 'REF001',    // Same ID
          Referee2FederationCode: 'USA'
        } as BeachMatch
      ];

      jest.spyOn(RefereeAssignmentsService as any, 'fetchMatchData').mockResolvedValue(duplicateMatches);

      const result = await RefereeAssignmentsService.getAllRefereesForTournament('T001');

      expect(result).toHaveLength(1); // Should deduplicate to only one John Doe
      expect(result[0].name).toBe('John Doe');
      expect(result[0].id).toBe('REF001');
    });
  });
});