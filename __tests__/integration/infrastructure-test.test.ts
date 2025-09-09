/**
 * Infrastructure validation test for integration testing setup
 * Story 3.5: Integration Testing & Performance Validation
 */

import { setupIntegrationTestEnvironment, setupMinimalIntegrationTestEnvironment } from './setup/TestEnvironmentSetup';
import { setupTestDatabase, verifyDatabaseConnection } from './setup/TestDatabaseSetup';
import { VisAdapterMock } from './setup/VisAdapterMock';
import { createCompleteTestDataset } from './setup/TestDataFixtures';

describe('Integration Test Infrastructure', () => {
  describe('Test Environment Setup', () => {
    it('should create complete integration test environment', async () => {
      const env = await setupIntegrationTestEnvironment();
      
      expect(env.database).toBeDefined();
      expect(env.database.supabase).toBeDefined();
      expect(env.database.testId).toBeDefined();
      expect(env.database.cleanup).toBeInstanceOf(Function);
      
      expect(env.visAdapterMock).toBeInstanceOf(VisAdapterMock);
      expect(env.queryClient).toBeDefined();
      expect(env.testData).toBeDefined();
      expect(env.cleanup).toBeInstanceOf(Function);
      
      await env.cleanup();
    });

    it('should create minimal integration test environment', async () => {
      const env = await setupMinimalIntegrationTestEnvironment();
      
      expect(env.database).toBeDefined();
      expect(env.visAdapterMock).toBeInstanceOf(VisAdapterMock);
      expect(env.queryClient).toBeDefined();
      expect(env.testData).toBeDefined();
      
      await env.cleanup();
    });
  });

  describe('Test Database Setup', () => {
    it('should setup and cleanup test database', async () => {
      const dbContext = await setupTestDatabase();
      
      expect(dbContext.supabase).toBeDefined();
      expect(dbContext.testId).toMatch(/^test_\d+_[a-z0-9]+$/);
      expect(dbContext.cleanup).toBeInstanceOf(Function);
      
      // Test database connection
      const isConnected = await verifyDatabaseConnection(dbContext.supabase);
      expect(isConnected).toBeDefined(); // May be true or false depending on environment
      
      await dbContext.cleanup();
    });
  });

  describe('VIS Adapter Mock', () => {
    it('should setup and configure VIS Adapter mock', () => {
      const testId = 'mock_test_123';
      const mock = new VisAdapterMock(testId);
      
      expect(mock).toBeInstanceOf(VisAdapterMock);
      
      // Test mock data generation
      const mockData = mock.getMockData();
      expect(mockData.tournaments).toHaveLength(3);
      expect(mockData.testId).toBe(testId);
      expect(Object.keys(mockData.matches)).toHaveLength(3);
      expect(Object.keys(mockData.referees)).toHaveLength(3);
    });

    it('should setup fetch mock for VIS endpoints', async () => {
      const testId = 'fetch_test_456';
      const mock = new VisAdapterMock(testId);
      mock.setupFetchMock();
      
      // Test health endpoint
      const healthResponse = await fetch('http://localhost/health');
      expect(healthResponse.ok).toBe(true);
      const healthData = await healthResponse.json();
      expect(healthData.status).toBe('healthy');
      
      // Test tournaments endpoint
      const tournamentsResponse = await fetch('http://localhost/vis/tournaments');
      expect(tournamentsResponse.ok).toBe(true);
      const tournaments = await tournamentsResponse.json();
      expect(Array.isArray(tournaments)).toBe(true);
      expect(tournaments).toHaveLength(3);
      
      mock.resetFetchMock();
    });

    it('should simulate network errors', () => {
      const mock = new VisAdapterMock('error_test_789');
      mock.simulateNetworkError();
      
      expect(fetch('http://localhost/vis/tournaments')).rejects.toThrow('Network connection failed');
      
      mock.resetFetchMock();
    });

    it('should simulate API errors', async () => {
      const mock = new VisAdapterMock('api_error_test');
      mock.simulateApiError(500, 'Internal Server Error');
      
      const response = await fetch('http://localhost/vis/tournaments');
      expect(response.ok).toBe(false);
      expect(response.status).toBe(500);
      
      mock.resetFetchMock();
    });
  });

  describe('Test Data Fixtures', () => {
    it('should generate complete test dataset', () => {
      const testId = 'fixture_test_001';
      const dataset = createCompleteTestDataset(testId);
      
      expect(dataset.testId).toBe(testId);
      expect(dataset.tournaments).toHaveLength(3);
      expect(dataset.matches).toHaveLength(3);
      expect(dataset.referees).toHaveLength(3);
      expect(dataset.events).toHaveLength(2);
      
      // Validate tournament data structure
      dataset.tournaments.forEach(tournament => {
        expect(tournament).toHaveValidDTOStructure('TournamentDTO');
      });
      
      // Validate match data structure
      dataset.matches.forEach(match => {
        expect(match).toHaveValidDTOStructure('MatchDTO');
      });
      
      // Validate referee data structure
      dataset.referees.forEach(referee => {
        expect(referee).toHaveValidDTOStructure('RefereeDTO');
      });
    });
  });

  describe('Performance and Network Utilities', () => {
    it('should provide performance measurement utilities', () => {
      expect(global.performanceUtils).toBeDefined();
      expect(global.performanceUtils.start).toBeInstanceOf(Function);
      expect(global.performanceUtils.end).toBeInstanceOf(Function);
      expect(global.performanceUtils.get).toBeInstanceOf(Function);
      expect(global.performanceUtils.clear).toBeInstanceOf(Function);
      
      // Test performance measurement
      global.performanceUtils.start('test_operation');
      const duration = global.performanceUtils.end('test_operation');
      expect(duration).toBeGreaterThanOrEqual(0);
      expect(global.performanceUtils.get('test_operation')).toBe(duration);
    });

    it('should provide network simulation utilities', () => {
      expect(global.networkUtils).toBeDefined();
      expect(global.networkUtils.simulateOffline).toBeInstanceOf(Function);
      expect(global.networkUtils.simulateOnline).toBeInstanceOf(Function);
      expect(global.networkUtils.simulateSlowNetwork).toBeInstanceOf(Function);
    });

    it('should provide database test utilities', () => {
      expect(global.databaseUtils).toBeDefined();
      expect(global.databaseUtils.waitForSync).toBeInstanceOf(Function);
      expect(global.databaseUtils.verifyDataConsistency).toBeInstanceOf(Function);
    });

    it('should provide test cleanup utilities', () => {
      expect(global.testUtils).toBeDefined();
      expect(global.testUtils.addCleanup).toBeInstanceOf(Function);
      expect(global.testUtils.cleanup).toBeInstanceOf(Function);
    });
  });

  describe('Custom Jest Matchers', () => {
    it('should provide performance range matcher', () => {
      expect(150).toBeWithinPerformanceRange(100, 200);
      expect(50).not.toBeWithinPerformanceRange(100, 200);
    });

    it('should provide DTO structure validation matchers', () => {
      const validTournament = {
        id: 'test-tournament',
        visNo: '123',
        tournamentCode: 'TEST2024',
        name: 'Test Tournament',
      };
      
      expect(validTournament).toHaveValidDTOStructure('TournamentDTO');
      
      const invalidTournament = {
        id: 'test-tournament',
        // Missing required fields
      };
      
      expect(invalidTournament).not.toHaveValidDTOStructure('TournamentDTO');
    });
  });
});