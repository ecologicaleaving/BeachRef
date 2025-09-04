/**
 * @fileoverview Tests for field selection optimization in VisApiClient
 * Tests slim field selection and context-aware field optimization
 * Part of Story 1.3: Optimize Polling and Field Selection
 */

import { VisApiClient } from '../../../services/api/VisApiClient';
import {
  VisApiClientConfig,
  VisApiEndpoint,
  FieldSelectionMode,
  FieldSelectionStrategy,
  DEFAULT_FIELD_SELECTIONS,
  SLIM_FIELD_SELECTIONS
} from '../../../types/api-v2';

describe('VisApiClient - Field Selection Optimization', () => {
  let client: VisApiClient;
  let mockConfig: VisApiClientConfig;

  beforeEach(() => {
    mockConfig = {
      baseUrl: 'https://api.test.com',
      timeoutMs: 10000,
      maxRetries: 3,
      retryDelayMs: 1000,
      exponentialBackoff: true,
      enableLogging: false
    };

    client = new VisApiClient(mockConfig);
  });

  describe('getOptimizedFields', () => {
    it('should return slim fields for SLIM mode', () => {
      const strategy: FieldSelectionStrategy = {
        mode: FieldSelectionMode.SLIM
      };

      const fields = client.getOptimizedFields(VisApiEndpoint.GET_EVENT_LIST, strategy);
      
      expect(fields).toEqual(SLIM_FIELD_SELECTIONS[VisApiEndpoint.GET_EVENT_LIST]);
      expect(fields).toEqual(['No', 'Name', 'StartDate', 'EndDate', 'Status']);
    });

    it('should return custom fields for CUSTOM mode', () => {
      const customFields = ['No', 'Name', 'City'];
      const strategy: FieldSelectionStrategy = {
        mode: FieldSelectionMode.CUSTOM,
        customFields
      };

      const fields = client.getOptimizedFields(VisApiEndpoint.GET_EVENT_LIST, strategy);
      
      expect(fields).toEqual(customFields);
    });

    it('should return default fields for CUSTOM mode without customFields', () => {
      const strategy: FieldSelectionStrategy = {
        mode: FieldSelectionMode.CUSTOM
      };

      const fields = client.getOptimizedFields(VisApiEndpoint.GET_EVENT_LIST, strategy);
      
      expect(fields).toEqual(DEFAULT_FIELD_SELECTIONS[VisApiEndpoint.GET_EVENT_LIST]);
    });

    it('should return default fields for FULL mode without context hint', () => {
      const strategy: FieldSelectionStrategy = {
        mode: FieldSelectionMode.FULL
      };

      const fields = client.getOptimizedFields(VisApiEndpoint.GET_EVENT_LIST, strategy);
      
      expect(fields).toEqual(DEFAULT_FIELD_SELECTIONS[VisApiEndpoint.GET_EVENT_LIST]);
    });

    it('should return list-optimized fields for FULL mode with list context', () => {
      const strategy: FieldSelectionStrategy = {
        mode: FieldSelectionMode.FULL,
        contextHint: 'list'
      };

      const fields = client.getOptimizedFields(VisApiEndpoint.GET_EVENT_LIST, strategy);
      
      expect(fields).toEqual(['No', 'Name', 'City', 'CountryCode', 'StartDate', 'EndDate', 'Status', 'Gender']);
      expect(fields.length).toBeLessThan(DEFAULT_FIELD_SELECTIONS[VisApiEndpoint.GET_EVENT_LIST].length);
    });

    it('should return detail fields for FULL mode with detail context', () => {
      const strategy: FieldSelectionStrategy = {
        mode: FieldSelectionMode.FULL,
        contextHint: 'detail'
      };

      const fields = client.getOptimizedFields(VisApiEndpoint.GET_EVENT_LIST, strategy);
      
      expect(fields).toEqual(DEFAULT_FIELD_SELECTIONS[VisApiEndpoint.GET_EVENT_LIST]);
    });
  });

  describe('List Optimization', () => {
    it('should optimize GET_EVENT_LIST for list view', () => {
      const strategy: FieldSelectionStrategy = {
        mode: FieldSelectionMode.FULL,
        contextHint: 'list'
      };

      const fields = client.getOptimizedFields(VisApiEndpoint.GET_EVENT_LIST, strategy);
      
      // Should include essential fields for tournament list display
      expect(fields).toContain('No');
      expect(fields).toContain('Name');
      expect(fields).toContain('StartDate');
      expect(fields).toContain('EndDate');
      expect(fields).toContain('Status');
      expect(fields).toContain('CountryCode');
      
      // Should not include detailed fields not needed for list
      expect(fields).not.toContain('Code');
      expect(fields).not.toContain('Country');
      expect(fields).not.toContain('Type');
    });

    it('should optimize GET_BEACH_TOURNAMENT_LIST for list view', () => {
      const strategy: FieldSelectionStrategy = {
        mode: FieldSelectionMode.FULL,
        contextHint: 'list'
      };

      const fields = client.getOptimizedFields(VisApiEndpoint.GET_BEACH_TOURNAMENT_LIST, strategy);
      
      expect(fields).toEqual(['No', 'Name', 'CountryCode', 'City', 'StartDate', 'EndDate', 'Status']);
      expect(fields.length).toBeLessThan(DEFAULT_FIELD_SELECTIONS[VisApiEndpoint.GET_BEACH_TOURNAMENT_LIST].length);
    });

    it('should optimize GET_BEACH_MATCH_LIST for list view', () => {
      const strategy: FieldSelectionStrategy = {
        mode: FieldSelectionMode.FULL,
        contextHint: 'list'
      };

      const fields = client.getOptimizedFields(VisApiEndpoint.GET_BEACH_MATCH_LIST, strategy);
      
      expect(fields).toEqual(['MatchNo', 'DateTime', 'Status', 'Court']);
      expect(fields.length).toBeLessThan(DEFAULT_FIELD_SELECTIONS[VisApiEndpoint.GET_BEACH_MATCH_LIST].length);
    });

    it('should return default fields for endpoints without list optimization', () => {
      const strategy: FieldSelectionStrategy = {
        mode: FieldSelectionMode.FULL,
        contextHint: 'list'
      };

      const fields = client.getOptimizedFields(VisApiEndpoint.GET_BEACH_LIVE, strategy);
      
      expect(fields).toEqual(DEFAULT_FIELD_SELECTIONS[VisApiEndpoint.GET_BEACH_LIVE]);
    });
  });

  describe('Slim Field Selections', () => {
    it('should have slim fields for all endpoints', () => {
      const endpoints = Object.values(VisApiEndpoint);
      
      endpoints.forEach(endpoint => {
        expect(SLIM_FIELD_SELECTIONS[endpoint]).toBeDefined();
        expect(SLIM_FIELD_SELECTIONS[endpoint].length).toBeGreaterThan(0);
        expect(SLIM_FIELD_SELECTIONS[endpoint].length).toBeLessThanOrEqual(DEFAULT_FIELD_SELECTIONS[endpoint].length);
      });
    });

    it('should have minimal essential fields for GET_EVENT_LIST', () => {
      const slimFields = SLIM_FIELD_SELECTIONS[VisApiEndpoint.GET_EVENT_LIST];
      
      expect(slimFields).toContain('No');
      expect(slimFields).toContain('Name');
      expect(slimFields).toContain('Status');
      expect(slimFields.length).toBe(5);
    });

    it('should have minimal essential fields for GET_BEACH_LIVE', () => {
      const slimFields = SLIM_FIELD_SELECTIONS[VisApiEndpoint.GET_BEACH_LIVE];
      
      expect(slimFields).toContain('Version');
      expect(slimFields).toContain('PollDelay');
      expect(slimFields).toContain('Status');
      expect(slimFields.length).toBe(3);
    });

    it('should have minimal essential fields for GET_BEACH_MATCH_LIST', () => {
      const slimFields = SLIM_FIELD_SELECTIONS[VisApiEndpoint.GET_BEACH_MATCH_LIST];
      
      expect(slimFields).toContain('MatchNo');
      expect(slimFields).toContain('Status');
      expect(slimFields).toContain('DateTime');
      expect(slimFields.length).toBe(3);
    });
  });

  describe('Field Selection Performance Benefits', () => {
    it('should reduce field count significantly for slim selections', () => {
      const endpoints = [
        VisApiEndpoint.GET_EVENT_LIST,
        VisApiEndpoint.GET_BEACH_TOURNAMENT_LIST,
        VisApiEndpoint.GET_BEACH_MATCH_LIST,
        VisApiEndpoint.GET_BEACH_LIVE
      ];

      endpoints.forEach(endpoint => {
        const defaultFields = DEFAULT_FIELD_SELECTIONS[endpoint];
        const slimFields = SLIM_FIELD_SELECTIONS[endpoint];
        
        const reduction = (defaultFields.length - slimFields.length) / defaultFields.length;
        
        // Should achieve at least 30% reduction in field count
        expect(reduction).toBeGreaterThanOrEqual(0.3);
      });
    });

    it('should provide moderate optimization for list context', () => {
      const strategy: FieldSelectionStrategy = {
        mode: FieldSelectionMode.FULL,
        contextHint: 'list'
      };

      const defaultFields = DEFAULT_FIELD_SELECTIONS[VisApiEndpoint.GET_EVENT_LIST];
      const optimizedFields = client.getOptimizedFields(VisApiEndpoint.GET_EVENT_LIST, strategy);
      
      const reduction = (defaultFields.length - optimizedFields.length) / defaultFields.length;
      
      // Should achieve some reduction for list optimization
      expect(reduction).toBeGreaterThan(0);
      expect(reduction).toBeLessThan(0.5); // But not as aggressive as slim
    });
  });

  describe('Context-Aware Optimization', () => {
    it('should handle polling context hint appropriately', () => {
      const strategy: FieldSelectionStrategy = {
        mode: FieldSelectionMode.FULL,
        contextHint: 'polling'
      };

      const fields = client.getOptimizedFields(VisApiEndpoint.GET_BEACH_LIVE, strategy);
      
      // For polling context without explicit SLIM mode, should use default
      expect(fields).toEqual(DEFAULT_FIELD_SELECTIONS[VisApiEndpoint.GET_BEACH_LIVE]);
    });

    it('should combine slim mode with context hints effectively', () => {
      const slimStrategy: FieldSelectionStrategy = {
        mode: FieldSelectionMode.SLIM,
        contextHint: 'polling'
      };

      const fullStrategy: FieldSelectionStrategy = {
        mode: FieldSelectionMode.FULL,
        contextHint: 'polling'
      };

      const slimFields = client.getOptimizedFields(VisApiEndpoint.GET_BEACH_LIVE, slimStrategy);
      const fullFields = client.getOptimizedFields(VisApiEndpoint.GET_BEACH_LIVE, fullStrategy);

      expect(slimFields.length).toBeLessThan(fullFields.length);
      expect(slimFields).toEqual(SLIM_FIELD_SELECTIONS[VisApiEndpoint.GET_BEACH_LIVE]);
    });
  });

  describe('Edge Cases', () => {
    it('should handle undefined context hint gracefully', () => {
      const strategy: FieldSelectionStrategy = {
        mode: FieldSelectionMode.FULL,
        contextHint: undefined
      };

      const fields = client.getOptimizedFields(VisApiEndpoint.GET_EVENT_LIST, strategy);
      
      expect(fields).toEqual(DEFAULT_FIELD_SELECTIONS[VisApiEndpoint.GET_EVENT_LIST]);
    });

    it('should handle empty custom fields gracefully', () => {
      const strategy: FieldSelectionStrategy = {
        mode: FieldSelectionMode.CUSTOM,
        customFields: []
      };

      const fields = client.getOptimizedFields(VisApiEndpoint.GET_EVENT_LIST, strategy);
      
      expect(fields).toEqual([]);
    });

    it('should handle invalid enum values gracefully', () => {
      const strategy: FieldSelectionStrategy = {
        mode: 'invalid' as FieldSelectionMode
      };

      const fields = client.getOptimizedFields(VisApiEndpoint.GET_EVENT_LIST, strategy);
      
      expect(fields).toEqual(DEFAULT_FIELD_SELECTIONS[VisApiEndpoint.GET_EVENT_LIST]);
    });
  });

  describe('Integration with Adaptive Polling', () => {
    it('should work with adaptive polling field selection modes', () => {
      // Test the field selection modes used by adaptive polling
      const runningStrategy: FieldSelectionStrategy = {
        mode: FieldSelectionMode.SLIM // Running matches use slim fields
      };

      const scheduledStrategy: FieldSelectionStrategy = {
        mode: FieldSelectionMode.FULL // Scheduled matches use full fields
      };

      const runningFields = client.getOptimizedFields(VisApiEndpoint.GET_BEACH_LIVE, runningStrategy);
      const scheduledFields = client.getOptimizedFields(VisApiEndpoint.GET_BEACH_LIVE, scheduledStrategy);

      expect(runningFields).toEqual(SLIM_FIELD_SELECTIONS[VisApiEndpoint.GET_BEACH_LIVE]);
      expect(scheduledFields).toEqual(DEFAULT_FIELD_SELECTIONS[VisApiEndpoint.GET_BEACH_LIVE]);
      expect(runningFields.length).toBeLessThan(scheduledFields.length);
    });
  });
});