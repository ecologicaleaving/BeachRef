/**
 * @fileoverview Tests for Cache Key Builder v2
 * Part of EPIC-007 Data Architecture Restructuration
 */

import { CacheKeyBuilder } from '../../../services/cache/CacheKeyBuilder';
import { isCacheKey } from '../../../types/cache-v2';

describe('CacheKeyBuilder', () => {
  let builder: CacheKeyBuilder;

  beforeEach(() => {
    builder = new CacheKeyBuilder();
  });

  describe('tournamentList', () => {
    it('should generate stable keys for same filters', () => {
      const filters = { type: 'FIVB', gender: 'M', status: 'active' };
      const key1 = builder.tournamentList(filters);
      const key2 = builder.tournamentList(filters);
      
      expect(key1).toBe(key2);
      expect(isCacheKey(key1)).toBe(true);
    });

    it('should generate different keys for different filters', () => {
      const filters1 = { type: 'FIVB', gender: 'M' };
      const filters2 = { type: 'FIVB', gender: 'W' };
      
      const key1 = builder.tournamentList(filters1);
      const key2 = builder.tournamentList(filters2);
      
      expect(key1).not.toBe(key2);
      expect(key1).toContain('gender_m');
      expect(key2).toContain('gender_w');
    });

    it('should handle empty filters with default values', () => {
      const key = builder.tournamentList({});
      expect(key).toContain('tournaments_current');
      expect(key).toMatch(/_v\d+$/);
    });

    it('should normalize filter values consistently', () => {
      const filters1 = { type: 'FIVB', gender: 'M' };
      const filters2 = { type: 'fivb', gender: 'm' };
      
      const key1 = builder.tournamentList(filters1);
      const key2 = builder.tournamentList(filters2);
      
      expect(key1).toBe(key2);
    });

    it('should include all filter components in correct order', () => {
      const filters = {
        status: 'active',
        type: 'FIVB',
        gender: 'W',
        country: 'USA',
        limit: 10
      };
      
      const key = builder.tournamentList(filters);
      
      expect(key).toContain('status_active');
      expect(key).toContain('type_fivb');
      expect(key).toContain('gender_w');
      expect(key).toContain('country_usa');
      expect(key).toContain('limit_10');
    });

    it('should handle date range filters', () => {
      const filters = {
        dateRange: {
          start: '2024-01-01',
          end: '2024-01-31'
        }
      };
      
      const key = builder.tournamentList(filters);
      expect(key).toContain('dates_20240101_20240131');
    });
  });

  describe('tournamentDetail', () => {
    it('should generate stable keys for same tournament ID', () => {
      const tournamentId = '12345_fivb2024m001_m_fivb';
      const key1 = builder.tournamentDetail(tournamentId);
      const key2 = builder.tournamentDetail(tournamentId);
      
      expect(key1).toBe(key2);
      expect(key1).toContain('tournament_detail');
      expect(key1).toContain('12345fivb2024m001mfivb');
    });

    it('should normalize tournament IDs', () => {
      const id1 = '12345_FIVB-2024/M-001_M_FIVB';
      const id2 = '12345_fivb-2024/m-001_m_fivb';
      
      const key1 = builder.tournamentDetail(id1);
      const key2 = builder.tournamentDetail(id2);
      
      expect(key1).toBe(key2);
    });
  });

  describe('matchList', () => {
    it('should generate keys with tournament ID', () => {
      const tournamentId = '12345_fivb2024m001_m_fivb';
      const key = builder.matchList(tournamentId);
      
      expect(key).toContain('matches');
      expect(key).toContain('tournament_12345fivb2024m001mfivb');
    });

    it('should include match filters', () => {
      const tournamentId = '12345_fivb2024m001_m_fivb';
      const filters = {
        status: 'RUNNING',
        court: '1',
        round: 'Final',
        includeResults: true
      };
      
      const key = builder.matchList(tournamentId, filters);
      
      expect(key).toContain('status_running');
      expect(key).toContain('court_1');
      expect(key).toContain('round_final');
      expect(key).toContain('results_yes');
    });

    it('should handle date filters', () => {
      const tournamentId = '12345_fivb2024m001_m_fivb';
      const filters = { date: '2024-01-01' };
      
      const key = builder.matchList(tournamentId, filters);
      expect(key).toContain('date_20240101');
    });
  });

  describe('refereeAssignments', () => {
    it('should generate keys with referee ID', () => {
      const refereeId = 'ref_12345';
      const key = builder.refereeAssignments(refereeId);
      
      expect(key).toContain('referee_assignments');
      expect(key).toContain('ref_ref12345');
      expect(key).toContain('current');
    });

    it('should include date range', () => {
      const refereeId = 'ref_12345';
      const dateRange = {
        start: '2024-01-01',
        end: '2024-01-31'
      };
      
      const key = builder.refereeAssignments(refereeId, dateRange);
      expect(key).toContain('dates_20240101_20240131');
    });
  });

  describe('withVersion', () => {
    it('should add version to base key', () => {
      const baseKey = 'tournaments_current_type_fivb';
      const versionedKey = builder.withVersion(baseKey, 2);
      
      expect(versionedKey).toBe('tournaments_current_type_fivb_v2');
      expect(isCacheKey(versionedKey)).toBe(true);
    });

    it('should replace existing version', () => {
      const baseKey = 'tournaments_current_type_fivb_v1';
      const versionedKey = builder.withVersion(baseKey, 3);
      
      expect(versionedKey).toBe('tournaments_current_type_fivb_v3');
    });
  });

  describe('apiResponse', () => {
    it('should generate keys for API responses', () => {
      const endpoint = 'GetEventList';
      const params = { type: 'FIVB', gender: 'M' };
      
      const key = builder.apiResponse(endpoint, params);
      
      expect(key).toContain('api');
      expect(key).toContain('geteventlist');
      expect(key).toContain('params_');
    });

    it('should generate same key for same parameters', () => {
      const endpoint = 'GetEventList';
      const params1 = { type: 'FIVB', gender: 'M' };
      const params2 = { gender: 'M', type: 'FIVB' }; // Different order
      
      const key1 = builder.apiResponse(endpoint, params1);
      const key2 = builder.apiResponse(endpoint, params2);
      
      expect(key1).toBe(key2);
    });
  });

  describe('searchResults', () => {
    it('should generate keys for search queries', () => {
      const query = 'Beach Volleyball';
      const filters = { type: 'FIVB', gender: 'W' };
      
      const key = builder.searchResults(query, filters);
      
      expect(key).toContain('search');
      expect(key).toContain('query_beachvolleyball');
      expect(key).toContain('gender_w');
      expect(key).toContain('type_fivb');
    });

    it('should handle special characters in query', () => {
      const query = 'Beach Volleyball 2024!';
      const key = builder.searchResults(query, {});
      
      expect(key).toContain('query_beachvolleyball2024');
    });
  });

  describe('getInvalidationPattern', () => {
    it('should generate regex pattern for cache invalidation', () => {
      const pattern = builder.getInvalidationPattern('tournaments', { type: 'FIVB' });
      
      expect(pattern).toContain('tournaments');
      expect(pattern).toContain('type_fivb');
      expect(pattern).toMatch(/\^.*\$$/); // Should be anchored regex
    });

    it('should generate pattern without filters', () => {
      const pattern = builder.getInvalidationPattern('tournaments');
      
      expect(pattern).toContain('tournaments');
      expect(pattern).toMatch(/\^.*\$$/);
    });
  });

  describe('Key format validation', () => {
    it('should generate keys matching expected format', () => {
      const key = builder.tournamentList({ type: 'FIVB' });
      
      // Format: resource_filters_vN
      expect(key).toMatch(/^[a-z0-9_]+_v\d+$/);
      expect(isCacheKey(key)).toBe(true);
    });

    it('should not generate overly long keys', () => {
      const longFilters = {
        type: 'A'.repeat(100),
        gender: 'B'.repeat(100),
        country: 'C'.repeat(100)
      };
      
      const key = builder.tournamentList(longFilters);
      
      // Should be truncated to reasonable length
      expect(key.length).toBeLessThan(200);
      expect(isCacheKey(key)).toBe(true);
    });
  });

  describe('Edge cases', () => {
    it('should handle null and undefined values', () => {
      const filters = {
        type: null,
        gender: undefined,
        country: 'USA'
      };
      
      const key = builder.tournamentList(filters);
      expect(key).toContain('country_usa');
      expect(isCacheKey(key)).toBe(true);
    });

    it('should handle empty strings', () => {
      const filters = {
        type: '',
        gender: 'M',
        status: ''
      };
      
      const key = builder.tournamentList(filters);
      expect(key).toContain('gender_m');
      expect(isCacheKey(key)).toBe(true);
    });

    it('should handle numeric values', () => {
      const filters = {
        limit: 10,
        offset: 0
      };
      
      const key = builder.tournamentList(filters);
      expect(key).toContain('limit_10');
    });
  });
});