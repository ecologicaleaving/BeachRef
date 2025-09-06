import { TournamentOperationsService } from '../../services/TournamentOperationsService';
import { RefereeAssignmentsService } from '../../services/RefereeAssignmentsService';
import { TournamentRefereeData } from '../../types/referee-v2';
import { RefereeProfile } from '../../types/RefereeAssignments';

// Mock dependencies for integration test
jest.mock('../../services/RefereeAssignmentsService');
jest.mock('../../services/ConnectionCircuitBreaker');

const mockRefereeAssignmentsService = RefereeAssignmentsService as jest.Mocked<typeof RefereeAssignmentsService>;

describe('Referee Tournament Integration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('TournamentOperationsService integration with referee data', () => {
    const mockTournamentRefereeData: TournamentRefereeData = {
      officials: [
        {
          federationCode: 'USA',
          firstName: 'John',
          lastName: 'Official',
          gender: 'M',
          noOfficial: 'OFF001',
          role: 'TechnicalOfficial' as any,
          status: 'Active' as any,
          type: 'Technical' as any
        }
      ],
      referees: [
        {
          federationCode: 'BRA',
          firstName: 'Maria',
          lastName: 'Referee',
          gender: 'W',
          noReferee: 'REF001',
          status: 'Active' as any,
          type: 'Referee' as any
        }
      ],
      eventNo: 'T001',
      timestamp: '2025-01-01T00:00:00Z',
      expiresAt: '2025-01-02T00:00:00Z'
    };

    const mockRefereeProfiles: RefereeProfile[] = [
      {
        name: 'John Official',
        id: 'OFF001',
        federationCode: 'USA'
      },
      {
        name: 'Maria Referee',
        id: 'REF001',
        federationCode: 'BRA'
      }
    ];

    it('should successfully get tournament referee data', async () => {
      mockRefereeAssignmentsService.getRefereeDataFromCache.mockResolvedValue(mockTournamentRefereeData);

      const result = await TournamentOperationsService.getTournamentRefereeData('T001');

      expect(result).toEqual(mockTournamentRefereeData);
      expect(mockRefereeAssignmentsService.getRefereeDataFromCache).toHaveBeenCalledWith('T001');
    });

    it('should successfully get all tournament referees', async () => {
      mockRefereeAssignmentsService.getAllRefereesForTournament.mockResolvedValue(mockRefereeProfiles);

      const result = await TournamentOperationsService.getTournamentReferees('T001');

      expect(result).toEqual(mockRefereeProfiles);
      expect(mockRefereeAssignmentsService.getAllRefereesForTournament).toHaveBeenCalledWith('T001');
    });

    it('should successfully get specific referee for tournament', async () => {
      mockRefereeAssignmentsService.getRefereeProfile.mockResolvedValue(mockRefereeProfiles[0]);

      const result = await TournamentOperationsService.getRefereeForTournament('OFF001', 'T001');

      expect(result).toEqual(mockRefereeProfiles[0]);
      expect(mockRefereeAssignmentsService.getRefereeProfile).toHaveBeenCalledWith('OFF001', 'T001');
    });

    it('should correctly identify tournaments with referee data', async () => {
      mockRefereeAssignmentsService.getRefereeDataFromCache.mockResolvedValue(mockTournamentRefereeData);

      const result = await TournamentOperationsService.hasTournamentRefereeData('T001');

      expect(result).toBe(true);
    });

    it('should correctly identify tournaments without referee data', async () => {
      const emptyRefereeData: TournamentRefereeData = {
        officials: [],
        referees: [],
        eventNo: 'T001',
        timestamp: '2025-01-01T00:00:00Z',
        expiresAt: '2025-01-02T00:00:00Z'
      };

      mockRefereeAssignmentsService.getRefereeDataFromCache.mockResolvedValue(emptyRefereeData);

      const result = await TournamentOperationsService.hasTournamentRefereeData('T001');

      expect(result).toBe(false);
    });

    it('should handle errors gracefully', async () => {
      mockRefereeAssignmentsService.getRefereeDataFromCache.mockRejectedValue(new Error('Service error'));
      mockRefereeAssignmentsService.getAllRefereesForTournament.mockRejectedValue(new Error('Service error'));
      mockRefereeAssignmentsService.getRefereeProfile.mockRejectedValue(new Error('Service error'));

      const refereeDataResult = await TournamentOperationsService.getTournamentRefereeData('T001');
      const refereesResult = await TournamentOperationsService.getTournamentReferees('T001');
      const refereeProfileResult = await TournamentOperationsService.getRefereeForTournament('REF001', 'T001');
      const hasDataResult = await TournamentOperationsService.hasTournamentRefereeData('T001');

      expect(refereeDataResult).toBeNull();
      expect(refereesResult).toEqual([]);
      expect(refereeProfileResult).toBeNull();
      expect(hasDataResult).toBe(false);
    });
  });

  describe('End-to-end referee data flow', () => {
    it('should handle complete referee workflow from tournament perspective', async () => {
      // Setup mock data for complete workflow
      const tournamentNo = 'T001';

      mockRefereeAssignmentsService.getRefereeDataFromCache.mockResolvedValue({
        officials: [],
        referees: [
          {
            federationCode: 'BRA',
            firstName: 'Maria',
            lastName: 'Silva',
            gender: 'W',
            noReferee: 'REF001',
            status: 'Active' as any,
            type: 'Referee' as any
          }
        ],
        eventNo: tournamentNo,
        timestamp: '2025-01-01T00:00:00Z',
        expiresAt: '2025-01-02T00:00:00Z'
      });

      mockRefereeAssignmentsService.getAllRefereesForTournament.mockResolvedValue([
        {
          name: 'Maria Silva',
          id: 'REF001',
          federationCode: 'BRA'
        }
      ]);

      mockRefereeAssignmentsService.getRefereeProfile.mockResolvedValue({
        name: 'Maria Silva',
        id: 'REF001',
        federationCode: 'BRA'
      });

      // Step 1: Check if tournament has referee data
      const hasData = await TournamentOperationsService.hasTournamentRefereeData(tournamentNo);
      expect(hasData).toBe(true);

      // Step 2: Get all referees for tournament detail view
      const allReferees = await TournamentOperationsService.getTournamentReferees(tournamentNo);
      expect(allReferees).toHaveLength(1);
      expect(allReferees[0].name).toBe('Maria Silva');

      // Step 3: Get specific referee profile
      const refereeProfile = await TournamentOperationsService.getRefereeForTournament('REF001', tournamentNo);
      expect(refereeProfile).toBeDefined();
      expect(refereeProfile?.name).toBe('Maria Silva');

      // Step 4: Get complete tournament referee data
      const completeData = await TournamentOperationsService.getTournamentRefereeData(tournamentNo);
      expect(completeData).toBeDefined();
      expect(completeData?.referees).toHaveLength(1);
    });

    it('should handle fallback scenarios in tournament workflow', async () => {
      const tournamentNo = 'T002';

      // Simulate cache failure, fallback to match data
      mockRefereeAssignmentsService.getRefereeDataFromCache.mockResolvedValue(null);
      mockRefereeAssignmentsService.getAllRefereesForTournament.mockResolvedValue([
        {
          name: 'Fallback Referee',
          id: 'referee1_Fallback_Referee',
          federationCode: 'UNKNOWN'
        }
      ]);

      const hasData = await TournamentOperationsService.hasTournamentRefereeData(tournamentNo);
      expect(hasData).toBe(false); // No cache data available

      const allReferees = await TournamentOperationsService.getTournamentReferees(tournamentNo);
      expect(allReferees).toHaveLength(1);
      expect(allReferees[0].name).toBe('Fallback Referee');
      expect(allReferees[0].federationCode).toBe('UNKNOWN');
    });

    it('should handle performance requirements for large tournaments', async () => {
      const largeTournamentNo = 'T999';
      const startTime = Date.now();

      // Simulate large dataset
      const largeRefereeList = Array.from({ length: 500 }, (_, i) => ({
        name: `Referee ${i}`,
        id: `REF${i.toString().padStart(3, '0')}`,
        federationCode: `COUNTRY${i % 50}`
      }));

      mockRefereeAssignmentsService.getAllRefereesForTournament.mockResolvedValue(largeRefereeList);
      mockRefereeAssignmentsService.hasTournamentRefereeData?.mockResolvedValue(true);

      const result = await TournamentOperationsService.getTournamentReferees(largeTournamentNo);
      const endTime = Date.now();

      expect(result).toHaveLength(500);
      expect(endTime - startTime).toBeLessThan(100); // Should complete within 100ms
    });
  });

  describe('Service layer integration patterns', () => {
    it('should maintain consistent error handling across services', async () => {
      const tournamentNo = 'T001';

      // All services should handle errors consistently
      mockRefereeAssignmentsService.getRefereeDataFromCache.mockRejectedValue(new Error('Network error'));
      mockRefereeAssignmentsService.getAllRefereesForTournament.mockRejectedValue(new Error('Network error'));
      mockRefereeAssignmentsService.getRefereeProfile.mockRejectedValue(new Error('Network error'));

      const dataResult = await TournamentOperationsService.getTournamentRefereeData(tournamentNo);
      const refereesResult = await TournamentOperationsService.getTournamentReferees(tournamentNo);
      const profileResult = await TournamentOperationsService.getRefereeForTournament('REF001', tournamentNo);

      // All should return safe defaults rather than throwing
      expect(dataResult).toBeNull();
      expect(refereesResult).toEqual([]);
      expect(profileResult).toBeNull();
    });

    it('should maintain service layer abstraction', async () => {
      // TournamentOperationsService should not directly access cache internals
      // It should only use RefereeAssignmentsService public methods
      
      const tournamentNo = 'T001';
      
      // Mock the service layer methods
      mockRefereeAssignmentsService.getRefereeDataFromCache.mockResolvedValue({
        officials: [],
        referees: [],
        eventNo: tournamentNo,
        timestamp: '2025-01-01T00:00:00Z',
        expiresAt: '2025-01-02T00:00:00Z'
      });

      await TournamentOperationsService.getTournamentRefereeData(tournamentNo);

      // Verify that only the public service method was called
      expect(mockRefereeAssignmentsService.getRefereeDataFromCache).toHaveBeenCalledWith(tournamentNo);
    });
  });
});