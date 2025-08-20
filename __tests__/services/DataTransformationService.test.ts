/**
 * @fileoverview Data Transformation Service Unit Tests
 * Tests for bi-directional transformation between legacy and new domain types
 * Part of EPIC-007 Data Architecture Restructuration - Story 7.2
 */

import { DataTransformationService, TransformationError } from '../../services/DataTransformationService';
import { TournamentCore, GenderType, TournamentType, TournamentStatus } from '../../types/tournament-v2';
import { Tournament } from '../../types/tournament';

describe('DataTransformationService', () => {
  let service: DataTransformationService;

  beforeEach(() => {
    service = new DataTransformationService();
  });

  describe('tournamentLegacyToCore', () => {
    const mockLegacyTournament: Tournament = {
      No: '12345',
      Name: 'Test Tournament',
      Code: 'FIVB2024M001',
      Status: 'Active',
      StartDate: '2024-01-01T00:00:00Z',
      EndDate: '2024-01-03T00:00:00Z',
      City: 'Rio de Janeiro',
      Country: 'Brazil',
      Type: 'FIVB',
      PrizeMoney: '100000',
      Currency: 'USD'
    };

    it('should transform legacy tournament to core format', () => {
      // Act
      const result = service.tournamentLegacyToCore(mockLegacyTournament);

      // Assert
      expect(result.id).toBe('12345_fivb2024m001_m_fivb');
      expect(result.visNo).toBe('12345');
      expect(result.name).toBe('Test Tournament');
      expect(result.code).toBe('FIVB2024M001');
      expect(result.gender).toBe(GenderType.M);
      expect(result.tournamentType).toBe(TournamentType.FIVB);
      expect(result.status).toBe(TournamentStatus.ACTIVE);
      expect(result.dates.startDate).toBe('2024-01-01T00:00:00Z');
      expect(result.dates.endDate).toBe('2024-01-03T00:00:00Z');
      expect(result.city).toBe('Rio de Janeiro');
      expect(result.country).toBe('Brazil');
      expect(result.prizeMoney).toBe('100000');
      expect(result.currency).toBe('USD');
      expect(result.version).toBe(1);
    });

    it('should handle women tournaments correctly', () => {
      // Arrange
      const womenTournament = {
        ...mockLegacyTournament,
        Code: 'WFIVB2024001',
        No: '12346'
      };

      // Act
      const result = service.tournamentLegacyToCore(womenTournament);

      // Assert
      expect(result.gender).toBe(GenderType.W);
      expect(result.id).toBe('12346_wfivb2024001_w_fivb');
    });

    it('should handle different tournament types', () => {
      // Arrange - BPT Tournament
      const bptTournament = {
        ...mockLegacyTournament,
        Type: 'Beach Pro Tour',
        Series: 'BPT'
      };

      // Act
      const result = service.tournamentLegacyToCore(bptTournament);

      // Assert
      expect(result.tournamentType).toBe(TournamentType.BPT);
    });

    it('should handle missing optional fields gracefully', () => {
      // Arrange - Minimal tournament
      const minimalTournament: Tournament = {
        No: '12345',
        Name: 'Minimal Tournament'
      };

      // Act
      const result = service.tournamentLegacyToCore(minimalTournament);

      // Assert
      expect(result.visNo).toBe('12345');
      expect(result.name).toBe('Minimal Tournament');
      expect(result.gender).toBe(GenderType.M); // Default
      expect(result.tournamentType).toBe(TournamentType.LOCAL); // Default
      expect(result.status).toBe(TournamentStatus.UPCOMING); // Default
    });

    it('should throw error for missing required fields', () => {
      // Arrange
      const invalidTournament = {
        Name: 'Tournament without No'
      } as Tournament;

      // Act & Assert
      expect(() => service.tournamentLegacyToCore(invalidTournament))
        .toThrow(TransformationError);
      expect(() => service.tournamentLegacyToCore(invalidTournament))
        .toThrow('Failed to transform legacy tournament to core');
    });
  });

  describe('tournamentCoreToLegacy', () => {
    const mockCoreTournament: TournamentCore = {
      id: '12345_fivb2024m001_m_fivb',
      visNo: '12345',
      version: 1,
      lastUpdated: '2024-01-01T10:00:00Z',
      code: 'FIVB2024M001',
      name: 'Test Tournament',
      gender: GenderType.M,
      tournamentType: TournamentType.FIVB,
      status: TournamentStatus.ACTIVE,
      dates: {
        startDate: '2024-01-01T00:00:00Z',
        endDate: '2024-01-03T00:00:00Z'
      },
      city: 'Rio de Janeiro',
      country: 'Brazil',
      prizeMoney: '100000',
      currency: 'USD',
      website: 'https://example.com'
    };

    it('should transform core tournament to legacy format', () => {
      // Act
      const result = service.tournamentCoreToLegacy(mockCoreTournament);

      // Assert
      expect(result.No).toBe('12345');
      expect(result.NoTournament).toBe('12345');
      expect(result.Name).toBe('Test Tournament');
      expect(result.Code).toBe('FIVB2024M001');
      expect(result.Status).toBe('Active');
      expect(result.StartDate).toBe('2024-01-01T00:00:00Z');
      expect(result.EndDate).toBe('2024-01-03T00:00:00Z');
      expect(result.City).toBe('Rio de Janeiro');
      expect(result.Country).toBe('Brazil');
      expect(result.CountryName).toBe('Brazil');
      expect(result.Type).toBe('FIVB');
      expect(result.Gender).toBe('M');
      expect(result.PrizeMoney).toBe('100000');
      expect(result.Currency).toBe('USD');
      expect(result.Website).toBe('https://example.com');
      expect(result.Version).toBe('1');
      expect(result.Created).toBe('2024-01-01T10:00:00Z');
      expect(result.Modified).toBe('2024-01-01T10:00:00Z');
    });

    it('should handle all tournament statuses correctly', () => {
      const statuses = [
        { core: TournamentStatus.UPCOMING, legacy: 'Upcoming' },
        { core: TournamentStatus.ACTIVE, legacy: 'Active' },
        { core: TournamentStatus.COMPLETED, legacy: 'Completed' },
        { core: TournamentStatus.CANCELLED, legacy: 'Cancelled' }
      ];

      statuses.forEach(({ core, legacy }) => {
        // Arrange
        const tournament = { ...mockCoreTournament, status: core };

        // Act
        const result = service.tournamentCoreToLegacy(tournament);

        // Assert
        expect(result.Status).toBe(legacy);
      });
    });

    it('should handle all gender types correctly', () => {
      const genders = [
        { core: GenderType.M, legacy: 'M' },
        { core: GenderType.W, legacy: 'W' },
        { core: GenderType.MIXED, legacy: 'MIXED' }
      ];

      genders.forEach(({ core, legacy }) => {
        // Arrange
        const tournament = { ...mockCoreTournament, gender: core };

        // Act
        const result = service.tournamentCoreToLegacy(tournament);

        // Assert
        expect(result.Gender).toBe(legacy);
      });
    });

    it('should format date ranges correctly', () => {
      // Act
      const result = service.tournamentCoreToLegacy(mockCoreTournament);

      // Assert
      expect(result.Dates).toBe('01/01/2024 - 03/01/2024');
    });

    it('should handle single day tournaments', () => {
      // Arrange
      const singleDayTournament = {
        ...mockCoreTournament,
        dates: {
          startDate: '2024-01-01T00:00:00Z',
          endDate: '2024-01-01T00:00:00Z'
        }
      };

      // Act
      const result = service.tournamentCoreToLegacy(singleDayTournament);

      // Assert
      expect(result.Dates).toBe('01/01/2024');
    });
  });

  describe('validateTransformation', () => {
    const originalTournament = {
      No: '12345',
      Name: 'Test Tournament',
      Code: 'FIVB2024M001',
      Status: 'Active'
    };

    const transformedTournament = {
      id: '12345_fivb2024m001_m_fivb',
      visNo: '12345',
      name: 'Test Tournament',
      code: 'FIVB2024M001'
    };

    it('should validate successful transformation', () => {
      // Act
      const result = service.validateTransformation(
        originalTournament,
        transformedTournament,
        ['No', 'Name', 'Code']
      );

      // Assert
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.missingFields).toHaveLength(0);
    });

    it('should detect missing required fields', () => {
      // Arrange
      const incompleteOriginal = {
        Name: 'Test Tournament'
        // Missing No and Code
      };

      // Act
      const result = service.validateTransformation(
        incompleteOriginal,
        transformedTournament,
        ['No', 'Name', 'Code']
      );

      // Assert
      expect(result.isValid).toBe(false);
      expect(result.missingFields).toContain('No');
      expect(result.missingFields).toContain('Code');
    });

    it('should warn about potential data loss', () => {
      // Arrange
      const detailedOriginal = {
        ...originalTournament,
        ExtraField: 'Extra data',
        AnotherField: 'More data'
      };

      // Act
      const result = service.validateTransformation(
        detailedOriginal,
        transformedTournament,
        ['No', 'Name']
      );

      // Assert
      expect(result.warnings.length).toBeGreaterThan(0);
      expect(result.warnings.some(w => w.includes('ExtraField'))).toBe(true);
    });
  });

  describe('Error Handling', () => {
    it('should wrap transformation errors with context', () => {
      // Arrange - Tournament with invalid data that causes transformation to fail
      const invalidTournament = {
        No: null, // This will cause an error
        Name: 'Invalid Tournament'
      } as any;

      // Act & Assert
      expect(() => service.tournamentLegacyToCore(invalidTournament))
        .toThrow(TransformationError);
      
      try {
        service.tournamentLegacyToCore(invalidTournament);
      } catch (error) {
        expect(error).toBeInstanceOf(TransformationError);
        expect((error as TransformationError).context).toBeDefined();
        expect((error as TransformationError).context.legacy).toBe(invalidTournament);
      }
    });
  });

  describe('Gender Parsing', () => {
    const testCases = [
      { input: 'MFIVB2024001', expected: GenderType.M },
      { input: 'WFIVB2024001', expected: GenderType.W },
      { input: 'FIVB2024MIXED001', expected: GenderType.MIXED },
      { input: 'FIVB2024001', expected: GenderType.M }, // Default
      { input: undefined, expected: GenderType.M } // Default
    ];

    testCases.forEach(({ input, expected }) => {
      it(`should parse gender correctly from code: ${input}`, () => {
        // Arrange
        const tournament = {
          No: '12345',
          Name: 'Test Tournament',
          Code: input
        };

        // Act
        const result = service.tournamentLegacyToCore(tournament);

        // Assert
        expect(result.gender).toBe(expected);
      });
    });
  });

  describe('Tournament Type Parsing', () => {
    const testCases = [
      { type: 'FIVB', series: undefined, category: undefined, expected: TournamentType.FIVB },
      { type: undefined, series: 'Beach Pro Tour', category: undefined, expected: TournamentType.BPT },
      { type: undefined, series: undefined, category: 'CEV', expected: TournamentType.CEV },
      { type: 'Local Event', series: undefined, category: undefined, expected: TournamentType.LOCAL },
      { type: undefined, series: undefined, category: undefined, expected: TournamentType.LOCAL } // Default
    ];

    testCases.forEach(({ type, series, category, expected }) => {
      it(`should parse tournament type: ${type || series || category || 'default'}`, () => {
        // Arrange
        const tournament = {
          No: '12345',
          Name: 'Test Tournament',
          Type: type,
          Series: series,
          Category: category
        };

        // Act
        const result = service.tournamentLegacyToCore(tournament);

        // Assert
        expect(result.tournamentType).toBe(expected);
      });
    });
  });

  describe('Status Parsing', () => {
    const testCases = [
      { input: 'Active', expected: TournamentStatus.ACTIVE },
      { input: 'RUNNING', expected: TournamentStatus.ACTIVE },
      { input: 'Completed', expected: TournamentStatus.COMPLETED },
      { input: 'FINISHED', expected: TournamentStatus.COMPLETED },
      { input: 'Cancelled', expected: TournamentStatus.CANCELLED },
      { input: 'CANCELED', expected: TournamentStatus.CANCELLED },
      { input: 'Unknown Status', expected: TournamentStatus.UPCOMING },
      { input: undefined, expected: TournamentStatus.UPCOMING } // Default
    ];

    testCases.forEach(({ input, expected }) => {
      it(`should parse status correctly: ${input || 'undefined'}`, () => {
        // Arrange
        const tournament = {
          No: '12345',
          Name: 'Test Tournament',
          Status: input
        };

        // Act
        const result = service.tournamentLegacyToCore(tournament);

        // Assert
        expect(result.status).toBe(expected);
      });
    });
  });
});