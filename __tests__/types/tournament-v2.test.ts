/**
 * @fileoverview Tests for Tournament v2 domain model
 * Part of EPIC-007 Data Architecture Restructuration
 */

import {
  TournamentCore,
  TournamentType,
  GenderType,
  TournamentStatus,
  TournamentDates,
  generateTournamentId,
  isTournamentCore,
  mapVisTournamentType,
  mapVisTournamentStatus
} from '../../types/tournament-v2';

describe('Tournament v2 Types', () => {
  describe('generateTournamentId', () => {
    it('should generate stable ID from VIS data', () => {
      const id1 = generateTournamentId('12345', 'FIVB2024M001', GenderType.M, TournamentType.FIVB);
      const id2 = generateTournamentId('12345', 'FIVB2024M001', GenderType.M, TournamentType.FIVB);
      
      expect(id1).toBe(id2);
      expect(id1).toBe('12345_fivb2024m001_m_fivb');
    });

    it('should handle special characters in code', () => {
      const id = generateTournamentId('12345', 'FIVB-2024/M-001', GenderType.M, TournamentType.FIVB);
      expect(id).toBe('12345_fivb2024m001_m_fivb');
    });

    it('should generate different IDs for different genders', () => {
      const idM = generateTournamentId('12345', 'FIVB2024001', GenderType.M, TournamentType.FIVB);
      const idW = generateTournamentId('12345', 'FIVB2024001', GenderType.W, TournamentType.FIVB);
      
      expect(idM).not.toBe(idW);
      expect(idM).toBe('12345_fivb2024001_m_fivb');
      expect(idW).toBe('12345_fivb2024001_w_fivb');
    });
  });

  describe('isTournamentCore', () => {
    const validTournament: TournamentCore = {
      id: '12345_fivb2024m001_m_fivb',
      visNo: '12345',
      version: 1,
      lastUpdated: '2024-01-01T00:00:00Z',
      code: 'FIVB2024M001',
      name: 'Test Tournament',
      gender: GenderType.M,
      tournamentType: TournamentType.FIVB,
      status: TournamentStatus.UPCOMING,
      dates: {
        startDate: '2024-01-01T00:00:00Z',
        endDate: '2024-01-03T00:00:00Z'
      }
    };

    it('should validate correct TournamentCore object', () => {
      expect(isTournamentCore(validTournament)).toBe(true);
    });

    it('should reject invalid objects', () => {
      expect(isTournamentCore(null)).toBe(false);
      expect(isTournamentCore({})).toBe(false);
      expect(isTournamentCore({ id: '123' })).toBe(false);
    });

    it('should reject objects with invalid gender', () => {
      const invalid = { ...validTournament, gender: 'INVALID' };
      expect(isTournamentCore(invalid)).toBe(false);
    });

    it('should reject objects with missing required fields', () => {
      // Test missing id
      const withoutId = {
        visNo: '12345',
        version: 1,
        lastUpdated: '2024-01-01T00:00:00Z',
        code: 'FIVB2024M001',
        name: 'Test Tournament',
        gender: GenderType.M,
        tournamentType: TournamentType.FIVB,
        status: TournamentStatus.UPCOMING,
        dates: {
          startDate: '2024-01-01T00:00:00Z',
          endDate: '2024-01-03T00:00:00Z'
        }
      };
      expect(isTournamentCore(withoutId)).toBe(false);
      
      // Test missing dates
      const withoutDates = {
        id: '12345_fivb2024m001_m_fivb',
        visNo: '12345',
        version: 1,
        lastUpdated: '2024-01-01T00:00:00Z',
        code: 'FIVB2024M001',
        name: 'Test Tournament',
        gender: GenderType.M,
        tournamentType: TournamentType.FIVB,
        status: TournamentStatus.UPCOMING
      };
      expect(isTournamentCore(withoutDates)).toBe(false);
    });
  });

  describe('mapVisTournamentType', () => {
    it('should map FIVB types correctly', () => {
      expect(mapVisTournamentType('FIVB')).toBe(TournamentType.FIVB);
      expect(mapVisTournamentType('FIVB World Championship')).toBe(TournamentType.FIVB);
      expect(mapVisTournamentType('fivb')).toBe(TournamentType.FIVB);
    });

    it('should map BPT types correctly', () => {
      expect(mapVisTournamentType('BPT')).toBe(TournamentType.BPT);
      expect(mapVisTournamentType('Beach Pro Tour')).toBe(TournamentType.BPT);
      expect(mapVisTournamentType('bpt')).toBe(TournamentType.BPT);
    });

    it('should map CEV types correctly', () => {
      expect(mapVisTournamentType('CEV')).toBe(TournamentType.CEV);
      expect(mapVisTournamentType('cev')).toBe(TournamentType.CEV);
    });

    it('should default to LOCAL for unknown types', () => {
      expect(mapVisTournamentType('Unknown')).toBe(TournamentType.LOCAL);
      expect(mapVisTournamentType('')).toBe(TournamentType.LOCAL);
      expect(mapVisTournamentType(undefined)).toBe(TournamentType.LOCAL);
    });
  });

  describe('mapVisTournamentStatus', () => {
    it('should map active statuses correctly', () => {
      expect(mapVisTournamentStatus('active')).toBe(TournamentStatus.ACTIVE);
      expect(mapVisTournamentStatus('running')).toBe(TournamentStatus.ACTIVE);
      expect(mapVisTournamentStatus('RUNNING')).toBe(TournamentStatus.ACTIVE);
    });

    it('should map completed statuses correctly', () => {
      expect(mapVisTournamentStatus('completed')).toBe(TournamentStatus.COMPLETED);
      expect(mapVisTournamentStatus('finished')).toBe(TournamentStatus.COMPLETED);
      expect(mapVisTournamentStatus('FINISHED')).toBe(TournamentStatus.COMPLETED);
    });

    it('should map cancelled statuses correctly', () => {
      expect(mapVisTournamentStatus('cancelled')).toBe(TournamentStatus.CANCELLED);
      expect(mapVisTournamentStatus('canceled')).toBe(TournamentStatus.CANCELLED);
      expect(mapVisTournamentStatus('CANCELLED')).toBe(TournamentStatus.CANCELLED);
    });

    it('should default to UPCOMING for unknown statuses', () => {
      expect(mapVisTournamentStatus('unknown')).toBe(TournamentStatus.UPCOMING);
      expect(mapVisTournamentStatus('')).toBe(TournamentStatus.UPCOMING);
      expect(mapVisTournamentStatus(undefined)).toBe(TournamentStatus.UPCOMING);
    });
  });

  describe('TournamentDates', () => {
    it('should handle basic date structure', () => {
      const dates: TournamentDates = {
        startDate: '2024-01-01T00:00:00Z',
        endDate: '2024-01-03T00:00:00Z'
      };

      expect(dates.startDate).toBe('2024-01-01T00:00:00Z');
      expect(dates.endDate).toBe('2024-01-03T00:00:00Z');
    });

    it('should handle extended date structure', () => {
      const dates: TournamentDates = {
        startDate: '2024-01-01T00:00:00Z',
        endDate: '2024-01-05T00:00:00Z',
        startDateQualification: '2024-01-01T00:00:00Z',
        endDateQualification: '2024-01-02T00:00:00Z',
        startDateMainDraw: '2024-01-03T00:00:00Z',
        endDateMainDraw: '2024-01-05T00:00:00Z'
      };

      expect(dates.startDateQualification).toBe('2024-01-01T00:00:00Z');
      expect(dates.endDateMainDraw).toBe('2024-01-05T00:00:00Z');
    });
  });

  describe('Enum values', () => {
    it('should have correct TournamentType values', () => {
      expect(TournamentType.FIVB).toBe('FIVB');
      expect(TournamentType.BPT).toBe('BPT');
      expect(TournamentType.CEV).toBe('CEV');
      expect(TournamentType.LOCAL).toBe('LOCAL');
    });

    it('should have correct GenderType values', () => {
      expect(GenderType.M).toBe('M');
      expect(GenderType.W).toBe('W');
      expect(GenderType.MIXED).toBe('MIXED');
    });

    it('should have correct TournamentStatus values', () => {
      expect(TournamentStatus.UPCOMING).toBe('UPCOMING');
      expect(TournamentStatus.ACTIVE).toBe('ACTIVE');
      expect(TournamentStatus.COMPLETED).toBe('COMPLETED');
      expect(TournamentStatus.CANCELLED).toBe('CANCELLED');
    });
  });
});