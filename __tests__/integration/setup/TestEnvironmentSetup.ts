/**
 * Integration test environment configuration
 * Story 3.5: Integration Testing & Performance Validation
 */

import { QueryClient } from '@tanstack/react-query';
import { TestDatabaseContext, setupTestDatabase } from './TestDatabaseSetup';
import { VisAdapterMock } from './VisAdapterMock';
import { createCompleteTestDataset } from './TestDataFixtures';

export interface IntegrationTestEnvironment {
  database: TestDatabaseContext;
  visAdapterMock: VisAdapterMock;
  queryClient: QueryClient;
  testData: ReturnType<typeof createCompleteTestDataset>;
  cleanup: () => Promise<void>;
}

/**
 * Setup complete integration test environment
 * Includes database, mocks, and test data
 */
export async function setupIntegrationTestEnvironment(): Promise<IntegrationTestEnvironment> {
  const testId = `int_test_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  
  // Setup test database
  const database = await setupTestDatabase();
  
  // Setup VIS Adapter mock
  const visAdapterMock = new VisAdapterMock(testId);
  visAdapterMock.setupFetchMock();
  
  // Setup React Query client for testing
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false, // Disable retries in tests
        gcTime: 0, // Disable garbage collection
        staleTime: 0, // Always consider data stale in tests
      },
      mutations: {
        retry: false,
      },
    },
  });

  // Create test data
  const testData = createCompleteTestDataset(testId);

  // Populate test database with initial data if needed
  await populateTestDatabase(database, testData, testId);

  return {
    database,
    visAdapterMock,
    queryClient,
    testData,
    cleanup: async () => {
      await database.cleanup();
      visAdapterMock.resetFetchMock();
      queryClient.clear();
    },
  };
}

/**
 * Populate test database with initial data
 * Only for tests that require pre-existing database data
 */
async function populateTestDatabase(
  database: TestDatabaseContext,
  testData: ReturnType<typeof createCompleteTestDataset>,
  _testId: string
): Promise<void> {
  // Transform DTOs to database format for insertion
  const dbTournaments = testData.tournaments.map(tournament => ({
    vis_tournament_no: parseInt(tournament.visNo),
    tournament_code: tournament.tournamentCode,
    name: tournament.name,
    country: tournament.countryCode,
    city: tournament.city,
    season: new Date(tournament.dates.startDate).getFullYear(),
    gender: tournament.gender,
    type: tournament.tournamentType,
    start_qualification: tournament.dates.startDateQualification || null,
    start_main_draw: tournament.dates.startDateMainDraw || tournament.dates.startDate,
    end_date: tournament.dates.endDate,
    status: tournament.status,
    location: tournament.location,
    participant_count: null,
    completion_rate: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }));

  const dbEvents = testData.events.map(event => ({
    vis_event_no: event.visEventNo,
    tournament_code: event.tournamentCode,
    gender: event.gender,
    phase: event.phase,
    name: event.name,
    country: event.country,
    start_date: event.startDate,
    end_date: event.endDate,
    status: event.status,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }));

  const dbReferees = testData.referees.map(referee => ({
    referee_id: referee.id,
    vis_referee_no: parseInt(referee.visRefereeNo),
    first_name: referee.firstName || '',
    last_name: referee.lastName || '',
    gender: referee.gender === 'F' ? 'W' : referee.gender || 'M',
    federation_code: referee.federation || 'UNK',
    birthdate: referee.birthdate ? new Date(referee.birthdate).toISOString().split('T')[0] : null,
    status: 'ACTIVE',
    type: 'REFEREE',
    role: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }));

  try {
    // Insert in dependency order
    if (dbTournaments.length > 0) {
      const { error: tournamentError } = await database.supabase
        .from('tournaments')
        .insert(dbTournaments);
      
      if (tournamentError && !tournamentError.message.includes('duplicate')) {
        console.warn('Tournament insertion warning:', tournamentError);
      }
    }

    if (dbEvents.length > 0) {
      const { error: eventError } = await database.supabase
        .from('events')
        .insert(dbEvents);
      
      if (eventError && !eventError.message.includes('duplicate')) {
        console.warn('Event insertion warning:', eventError);
      }
    }

    if (dbReferees.length > 0) {
      const { error: refereeError } = await database.supabase
        .from('referees')
        .insert(dbReferees);
      
      if (refereeError && !refereeError.message.includes('duplicate')) {
        console.warn('Referee insertion warning:', refereeError);
      }
    }

    // Note: Matches would require event_id resolution, so we'll handle that in specific tests
    
  } catch (error) {
    // In test environment, database errors during setup may be acceptable
    console.warn('Test database population warning:', error);
  }
}

/**
 * Setup minimal test environment for unit-style integration tests
 * Skips database population for faster test execution
 */
export async function setupMinimalIntegrationTestEnvironment(): Promise<IntegrationTestEnvironment> {
  const testId = `min_test_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  
  const database = await setupTestDatabase();
  const visAdapterMock = new VisAdapterMock(testId);
  visAdapterMock.setupFetchMock();
  
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0, staleTime: 0 },
      mutations: { retry: false },
    },
  });

  const testData = createCompleteTestDataset(testId);

  return {
    database,
    visAdapterMock,
    queryClient,
    testData,
    cleanup: async () => {
      await database.cleanup();
      visAdapterMock.resetFetchMock();
      queryClient.clear();
    },
  };
}

/**
 * Performance testing environment with timing utilities
 */
export interface PerformanceTestEnvironment extends IntegrationTestEnvironment {
  performanceTimers: Map<string, number>;
  startTimer: (label: string) => void;
  endTimer: (label: string) => number;
  getTimings: () => Record<string, number>;
}

export async function setupPerformanceTestEnvironment(): Promise<PerformanceTestEnvironment> {
  const baseEnv = await setupIntegrationTestEnvironment();
  const performanceTimers = new Map<string, number>();

  const startTimer = (label: string) => {
    performanceTimers.set(label, performance.now());
  };

  const endTimer = (label: string): number => {
    const startTime = performanceTimers.get(label);
    if (!startTime) {
      throw new Error(`Timer '${label}' was not started`);
    }
    const duration = performance.now() - startTime;
    performanceTimers.set(`${label}_duration`, duration);
    return duration;
  };

  const getTimings = (): Record<string, number> => {
    const timings: Record<string, number> = {};
    for (const [key, value] of performanceTimers.entries()) {
      if (key.endsWith('_duration')) {
        timings[key.replace('_duration', '')] = value;
      }
    }
    return timings;
  };

  return {
    ...baseEnv,
    performanceTimers,
    startTimer,
    endTimer,
    getTimings,
  };
}