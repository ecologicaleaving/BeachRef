/**
 * @fileoverview Integration tests for data transformation hooks
 * Tests core transformation functionality without React dependencies
 */

import { DataTransformationService } from '../../services/DataTransformationService';

describe('Data Transformation Integration', () => {
  let transformationService: DataTransformationService;

  beforeEach(() => {
    transformationService = new DataTransformationService();
  });

  describe('Tournament transformations', () => {
    it('should transform TournamentCore to Tournament', () => {
      const tournamentCore = {
        id: '1',
        visNo: 'T001',
        version: 1,
        lastUpdated: '2024-01-01T00:00:00Z',
        code: 'FIVB2024M001',
        name: 'Test Tournament',
        gender: 'M' as const,
        tournamentType: 'FIVB' as const,
        dates: {
          startDate: '2024-01-01',
          endDate: '2024-01-03'
        },
        status: 'ACTIVE' as const
      };

      const result = transformationService.tournamentCoreToLegacy(tournamentCore);

      expect(result).toBeDefined();
      expect(result.No).toBe('T001');
      expect(result.Name).toBe('Test Tournament');
    });

    it('should transform Tournament to TournamentCore', () => {
      const tournament = {
        No: 'T001',
        Name: 'Test Tournament',
        Gender: 'M',
        TournamentType: 'FIVB'
      };

      const result = transformationService.tournamentLegacyToCore(tournament);

      expect(result).toBeDefined();
      expect(result.visNo).toBe('T001');
      expect(result.name).toBe('Test Tournament');
      expect(result.gender).toBe('M');
    });
  });

  describe('Match transformations', () => {
    it.skip('should transform BeachMatchCore to BeachMatch', () => {
      // TODO: Fix match data structure to match BeachMatchCore interface
      const matchCore = {
        matchId: '1',
        tournamentId: 'T001',
        matchNo: 'M001',
        court: 'Court 1',
        status: 'scheduled' as const
      };

      const result = transformationService.matchCoreToLegacy(matchCore);

      expect(result).toBeDefined();
      expect(result.MatchNo).toBe('M001');
      // Note: TournamentNo may not be in transformation result as it's provided separately
    });

    it.skip('should transform BeachMatch to BeachMatchCore', () => {
      // TODO: Fix match data structure to match BeachMatch interface
      const match = {
        MatchNo: 'M001',
        TournamentNo: 'T001',
        Court: 'Court 1'
      };

      const result = transformationService.matchLegacyToCore(match, 'T001');

      expect(result).toBeDefined();
      expect(result.matchNo).toBe('M001');
      expect(result.tournamentId).toBe('T001');
    });
  });

  describe('Array transformations', () => {
    it('should transform arrays of tournaments', () => {
      const tournamentCores = [
        {
          id: '1',
          visNo: 'T001',
          version: 1,
          lastUpdated: '2024-01-01T00:00:00Z',
          code: 'FIVB2024M001',
          name: 'Tournament 1',
          gender: 'M' as const,
          tournamentType: 'FIVB' as const,
          dates: { startDate: '2024-01-01', endDate: '2024-01-03' },
          status: 'ACTIVE' as const
        },
        {
          id: '2',
          visNo: 'T002',
          version: 1,
          lastUpdated: '2024-02-01T00:00:00Z',
          code: 'BPT2024W001',
          name: 'Tournament 2',
          gender: 'W' as const,
          tournamentType: 'BPT' as const,
          dates: { startDate: '2024-02-01', endDate: '2024-02-03' },
          status: 'ACTIVE' as const
        }
      ];

      const results = tournamentCores.map(t => 
        transformationService.tournamentCoreToLegacy(t)
      );

      expect(results).toHaveLength(2);
      expect(results[0].No).toBe('T001');
      expect(results[1].No).toBe('T002');
    });
  });

  describe('Error handling', () => {
    it('should handle invalid tournament data', () => {
      const invalidTournament = {};

      expect(() => {
        transformationService.tournamentLegacyToCore(invalidTournament as any);
      }).toThrow(); // Should throw due to missing required fields
    });

    it('should handle null data gracefully', () => {
      expect(() => {
        transformationService.tournamentCoreToLegacy(null as any);
      }).toThrow(); // Should throw due to null input
    });
  });

  describe('Performance characteristics', () => {
    it('should handle large arrays efficiently', () => {
      const largeTournamentArray = Array.from({ length: 100 }, (_, i) => ({
        id: `${i + 1}`,
        visNo: `T${(i + 1).toString().padStart(3, '0')}`,
        version: 1,
        lastUpdated: '2024-01-01T00:00:00Z',
        code: `FIVB2024${i % 2 === 0 ? 'M' : 'W'}${(i + 1).toString().padStart(3, '0')}`,
        name: `Tournament ${i + 1}`,
        gender: i % 2 === 0 ? 'M' as const : 'W' as const,
        tournamentType: 'FIVB' as const,
        dates: { startDate: '2024-01-01', endDate: '2024-01-03' },
        status: 'ACTIVE' as const
      }));

      const startTime = Date.now();
      const results = largeTournamentArray.map(t => 
        transformationService.tournamentCoreToLegacy(t)
      );
      const endTime = Date.now();

      expect(results).toHaveLength(100);
      expect(endTime - startTime).toBeLessThan(100); // Should complete in under 100ms
    });
  });
});