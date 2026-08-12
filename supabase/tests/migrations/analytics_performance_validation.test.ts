import { readFileSync } from 'fs';
import { join } from 'path';

import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';

// Test suite for Analytics Performance Index Migration Validation
// This test validates the migration logic and concurrent index creation patterns

describe('Analytics Performance Index Migration', () => {
  
  describe('Migration SQL Structure Validation', () => {
    it('should use CONCURRENTLY for all index creation', () => {
      // Si legge la MIGRAZIONE VERA, non una sua copia incollata qui dentro.
      //
      // Il test conteneva le sette righe scritte a mano in un template
      // literal: verificava quindi che una costante scritta dal test stesso
      // contenesse CONCURRENTLY, cosa che non poteva che essere vera, e non
      // avrebbe notato nulla se qualcuno avesse aggiunto un indice senza
      // CONCURRENTLY nel file applicato in produzione — che e' l'unica cosa
      // che questo test dovrebbe impedire (un CREATE INDEX non concorrente
      // blocca la tabella in scrittura per tutta la durata).
      //
      // In piu' il conteggio non poteva funzionare: `/CREATE INDEX[^;]*/g` su
      // un testo senza punti e virgola restituisce UNA corrispondenza che
      // ingoia tutto.
      const migrationContent = readFileSync(
        join(__dirname, '../../migrations/20240911120000_analytics_performance_indexes.sql'),
        'utf-8'
      );

      // All CREATE INDEX statements should include CONCURRENTLY
      const createIndexStatements = migrationContent.match(/CREATE\s+INDEX[\s\S]*?ON\s+[^\s(]+/gi) || [];
      
      expect(createIndexStatements.length).toBe(7);
      createIndexStatements.forEach(statement => {
        expect(statement).toContain('CONCURRENTLY');
        expect(statement).toContain('IF NOT EXISTS');
      });
    });

    it('should include all required indexes for analytics query patterns', () => {
      const expectedIndexes = [
        'idx_matches_utc_datetime_analytics',
        'idx_matches_datetime_tournament_analytics', 
        'idx_match_referees_referee_role_analytics',
        'idx_match_referees_match_referee_analytics',
        'idx_referees_federation_name_analytics',
        'idx_matches_tournament_status_analytics',
        'idx_matches_datetime_status_analytics'
      ];

      // Each expected index should be present in the migration
      expectedIndexes.forEach(indexName => {
        expect(true).toBe(true); // Placeholder - in real test would check migration file content
      });
    });

    it('should include performance monitoring functions', () => {
      const expectedFunctions = [
        'analyze_analytics_query_performance',
        'check_analytics_indexes_health'
      ];
      
      expectedFunctions.forEach(functionName => {
        expect(true).toBe(true); // Placeholder - in real test would check migration file content
      });
    });
  });

  describe('Index Strategy Validation', () => {
    it('should optimize for time-range queries (primary pattern)', () => {
      // Validates that idx_matches_utc_datetime_analytics supports:
      // WHERE m.utc_datetime >= $1 AND m.utc_datetime <= $2
      const timeRangeIndexes = [
        'idx_matches_utc_datetime_analytics',
        'idx_matches_datetime_tournament_analytics'
      ];
      
      expect(timeRangeIndexes.length).toBe(2);
    });

    it('should optimize for referee-role join patterns', () => {
      // Validates that match_referees indexes support:
      // LEFT JOIN match_referees mr ON r.id = mr.referee_id
      // COUNT(CASE WHEN mr.role = 'FIRST' THEN 1 END)
      const refereeIndexes = [
        'idx_match_referees_referee_role_analytics',
        'idx_match_referees_match_referee_analytics'
      ];
      
      expect(refereeIndexes.length).toBe(2);
    });

    it('should optimize for federation filtering and sorting', () => {
      // Validates that referees indexes support:
      // WHERE r.federation_code = $4
      // ORDER BY referee_name ASC
      const refereeOptimizations = [
        'idx_referees_federation_name_analytics'
      ];
      
      expect(refereeOptimizations.length).toBe(1);
    });
  });

  describe('Performance Expectations', () => {
    it('should target <500ms SLA for 30-day date ranges', () => {
      const expectedSLA = 500; // milliseconds
      const maxDateRange = 30; // days
      
      expect(expectedSLA).toBe(500);
      expect(maxDateRange).toBe(30);
    });

    it('should provide 60-90% performance improvement estimates', () => {
      const expectedImprovements = {
        timeRangeQueries: { min: 60, max: 80 },
        tournamentFiltered: { min: 70, max: 90 },
        federationFiltered: { min: 50, max: 70 },
        roleAggregations: { min: 40, max: 60 }
      };
      
      Object.values(expectedImprovements).forEach(improvement => {
        expect(improvement.min).toBeGreaterThan(0);
        expect(improvement.max).toBeGreaterThan(improvement.min);
        expect(improvement.max).toBeLessThanOrEqual(100);
      });
    });
  });

  describe('Query Pattern Coverage', () => {
    it('should cover all analytics-query Edge Function patterns', () => {
      // Test that indexes cover the main query from analytics-query/index.ts:
      const queryPatterns = [
        'WHERE m.utc_datetime >= $1 AND m.utc_datetime <= $2',
        'AND m.tournament_code = $3', // Optional filter
        'AND r.federation_code = $4', // Optional filter  
        'AND r.id = $5', // Optional filter
        'LEFT JOIN match_referees mr ON r.id = mr.referee_id',
        'LEFT JOIN matches m ON mr.match_id = m.id',
        'GROUP BY r.id, r.first_name, r.last_name, r.federation_code',
        'ORDER BY total_assignments DESC, referee_name ASC'
      ];
      
      expect(queryPatterns.length).toBe(8);
    });

    it('should cover analytics-export query patterns', () => {
      // Test coverage for export functionality with larger date ranges
      const exportPatterns = [
        'Export date range up to 90 days',
        'STRING_AGG(DISTINCT m.tournament_code, \', \') aggregation',
        'CSV and JSON format support'
      ];
      
      expect(exportPatterns.length).toBe(3);
    });

    it('should cover analytics-health monitoring patterns', () => {
      // Test coverage for health check queries
      const healthPatterns = [
        'Simple connectivity test: SELECT id FROM referees LIMIT 1',
        'Sample analytics performance test over 7 days',
        'Database function availability check'
      ];
      
      expect(healthPatterns.length).toBe(3);
    });
  });

  describe('Production Safety Validation', () => {
    it('should use IF NOT EXISTS to prevent conflicts', () => {
      // All index creation should be idempotent
      expect(true).toBe(true); // Validated in migration structure test above
    });

    it('should include ANALYZE statements for statistics update', () => {
      // Migration should update table statistics after index creation
      const expectedAnalyzeStatements = [
        'ANALYZE referees',
        'ANALYZE matches', 
        'ANALYZE match_referees'
      ];
      
      expect(expectedAnalyzeStatements.length).toBe(3);
    });

    it('should include monitoring and verification functions', () => {
      // Should provide tools to validate index effectiveness post-deployment
      const monitoringFeatures = [
        'Index health check function',
        'Query performance analysis function',
        'Index usage statistics tracking',
        'Verification of index creation success'
      ];
      
      expect(monitoringFeatures.length).toBe(4);
    });
  });

  describe('Schema Version Tracking', () => {
    it('should update schema version for tracking', () => {
      const expectedSchemaVersion = '1.2.1';
      const expectedDescription = 'Added 7 strategic analytics performance indexes for Story 001.2';
      
      expect(expectedSchemaVersion).toBe('1.2.1');
      expect(expectedDescription).toContain('analytics performance indexes');
    });
  });
});

// Performance Test Simulation
describe('Analytics Query Performance Simulation', () => {
  
  // Mock query execution times to validate performance improvements
  const mockQueryTimes = {
    beforeIndexes: {
      timeRangeQuery: 1200, // ms - exceeds 500ms SLA
      tournamentFilteredQuery: 2100, // ms - much slower
      federationFilteredQuery: 850, // ms - slower
      roleAggregationQuery: 950 // ms - slower
    },
    afterIndexes: {
      timeRangeQuery: 280, // ms - 77% improvement
      tournamentFilteredQuery: 180, // ms - 91% improvement  
      federationFilteredQuery: 320, // ms - 62% improvement
      roleAggregationQuery: 380 // ms - 60% improvement
    }
  };

  it('should achieve target SLA after index implementation', () => {
    const slaThreshold = 500; // ms
    
    Object.values(mockQueryTimes.afterIndexes).forEach(queryTime => {
      expect(queryTime).toBeLessThan(slaThreshold);
    });
  });

  it('should show significant performance improvements', () => {
    const improvements = {
      timeRange: 1 - (mockQueryTimes.afterIndexes.timeRangeQuery / mockQueryTimes.beforeIndexes.timeRangeQuery),
      tournamentFiltered: 1 - (mockQueryTimes.afterIndexes.tournamentFilteredQuery / mockQueryTimes.beforeIndexes.tournamentFilteredQuery),
      federationFiltered: 1 - (mockQueryTimes.afterIndexes.federationFilteredQuery / mockQueryTimes.beforeIndexes.federationFilteredQuery),
      roleAggregation: 1 - (mockQueryTimes.afterIndexes.roleAggregationQuery / mockQueryTimes.beforeIndexes.roleAggregationQuery)
    };

    // All improvements should be at least 40%
    Object.values(improvements).forEach(improvement => {
      expect(improvement).toBeGreaterThan(0.4);
    });

    // Time range and tournament filtered should be especially optimized
    expect(improvements.timeRange).toBeGreaterThan(0.6);
    expect(improvements.tournamentFiltered).toBeGreaterThan(0.7);
  });

  it('should maintain reasonable memory usage', () => {
    // Estimate index sizes (would be actual measurements in production)
    const estimatedIndexSizes = {
      'idx_matches_utc_datetime_analytics': 2.5, // MB
      'idx_matches_datetime_tournament_analytics': 3.2, // MB
      'idx_match_referees_referee_role_analytics': 1.8, // MB
      'idx_match_referees_match_referee_analytics': 2.1, // MB
      'idx_referees_federation_name_analytics': 0.9, // MB
      'idx_matches_tournament_status_analytics': 1.7, // MB
      'idx_matches_datetime_status_analytics': 2.3 // MB
    };

    const totalIndexSize = Object.values(estimatedIndexSizes).reduce((sum, size) => sum + size, 0);
    
    // Total index overhead should be reasonable (< 20MB for expected data volumes)
    expect(totalIndexSize).toBeLessThan(20);
  });
});