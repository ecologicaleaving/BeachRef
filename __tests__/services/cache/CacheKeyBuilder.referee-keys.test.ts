/**
 * Unit tests for CacheKeyBuilder referee key generation
 * Tests referee-specific cache key patterns and normalization
 */

import { CacheKeyBuilder } from '../../../services/cache/CacheKeyBuilder';

describe('CacheKeyBuilder - Referee Keys', () => {
  let builder: CacheKeyBuilder;

  beforeEach(() => {
    builder = new CacheKeyBuilder();
  });

  describe('refereeList', () => {
    it('should generate basic referee list cache key', () => {
      const key = builder.refereeList('12345');
      
      expect(key).toBe('referees_tournament_12345_v1');
    });

    it('should include filters in referee list key', () => {
      const filters = {
        type: 'Referee',
        status: 'Active',
        role: 'Referee1',
        federationCode: 'USA'
      };
      
      const key = builder.refereeList('12345', filters);
      
      expect(key).toBe('referees_tournament_12345_type_referee_status_active_role_referee1_federation_usa_v1');
    });

    it('should handle partial filters in referee list key', () => {
      const filters = {
        status: 'Active',
        federationCode: 'BRA'
      };
      
      const key = builder.refereeList('67890', filters);
      
      expect(key).toBe('referees_tournament_67890_status_active_federation_bra_v1');
    });

    it('should normalize tournament ID in referee list key', () => {
      const key = builder.refereeList('TOURNAMENT-123/Special');
      
      expect(key).toBe('referees_tournament_tournament123special_v1');
    });

    it('should handle empty filters gracefully', () => {
      const key = builder.refereeList('12345', {});
      
      expect(key).toBe('referees_tournament_12345_v1');
    });
  });

  describe('refereeDetails', () => {
    it('should generate referee details cache key', () => {
      const key = builder.refereeDetails('REF001');
      
      expect(key).toBe('referee_profile_ref001_v1');
    });

    it('should normalize referee ID in details key', () => {
      const key = builder.refereeDetails('Referee-123/Special');
      
      expect(key).toBe('referee_profile_referee123special_v1');
    });

    it('should handle numeric referee ID', () => {
      const key = builder.refereeDetails('123456');
      
      expect(key).toBe('referee_profile_123456_v1');
    });

    it('should handle null referee ID gracefully', () => {
      const key = builder.refereeDetails(null as any);
      
      expect(key).toBe('referee_profile_null_v1');
    });
  });

  describe('refereeAssignments (existing method)', () => {
    it('should generate referee assignments cache key', () => {
      const key = builder.refereeAssignments('REF001');
      
      expect(key).toBe('referee_assignments_ref_ref001_current_v1');
    });

    it('should include date range in assignments key', () => {
      const dateRange = {
        start: '2025-09-01',
        end: '2025-09-30'
      };
      
      const key = builder.refereeAssignments('REF001', dateRange);
      
      expect(key).toBe('referee_assignments_ref_ref001_dates_20250901_20250930_v1');
    });
  });

  describe('key normalization consistency', () => {
    it('should generate consistent keys for same inputs', () => {
      const key1 = builder.refereeList('12345', { status: 'Active' });
      const key2 = builder.refereeList('12345', { status: 'Active' });
      
      expect(key1).toBe(key2);
    });

    it('should handle special characters consistently', () => {
      const key = builder.refereeList('Tournament-123/Special', { 
        federationCode: 'US-A', 
        status: 'Active!' 
      });
      
      expect(key).toBe('referees_tournament_tournament123special_status_active_federation_usa_v1');
    });

    it('should normalize case consistently', () => {
      const key1 = builder.refereeList('ABC123', { status: 'ACTIVE' });
      const key2 = builder.refereeList('abc123', { status: 'active' });
      
      expect(key1).toBe(key2);
    });

    it('should handle undefined and null values', () => {
      const key = builder.refereeList('12345', {
        status: undefined,
        federationCode: null,
        type: 'Referee'
      });
      
      expect(key).toBe('referees_tournament_12345_type_referee_v1');
    });
  });

  describe('key pattern validation', () => {
    it('should generate keys matching expected pattern', () => {
      const key = builder.refereeList('12345');
      
      // Should match pattern: resource_filters_vN
      expect(key).toMatch(/^[a-z0-9_]+_v\d+$/);
    });

    it('should include version in all referee keys', () => {
      const keys = [
        builder.refereeList('12345'),
        builder.refereeDetails('REF001'),
        builder.refereeAssignments('REF001')
      ];
      
      keys.forEach(key => {
        expect(key).toMatch(/_v\d+$/);
      });
    });

    it('should generate reasonable key lengths', () => {
      const longFilters = {
        type: 'VeryLongRefereeTypeName',
        status: 'VeryLongStatusName',
        role: 'VeryLongRoleName',
        federationCode: 'VeryLongFederationCode'
      };
      
      const key = builder.refereeList('VeryLongTournamentName', longFilters);
      
      // Should be under 200 characters (reasonable limit)
      expect(key.length).toBeLessThan(200);
    });
  });

  describe('filter ordering consistency', () => {
    it('should generate same key regardless of filter order', () => {
      const filters1 = { status: 'Active', type: 'Referee', federationCode: 'USA' };
      const filters2 = { federationCode: 'USA', type: 'Referee', status: 'Active' };
      
      const key1 = builder.refereeList('12345', filters1);
      const key2 = builder.refereeList('12345', filters2);
      
      expect(key1).toBe(key2);
    });
  });
});