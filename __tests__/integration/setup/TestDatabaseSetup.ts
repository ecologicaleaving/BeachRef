/**
 * Test database setup and cleanup utilities for integration tests
 * Story 3.5: Integration Testing & Performance Validation
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';

export interface TestDatabaseContext {
  supabase: SupabaseClient;
  testId: string;
  cleanup: () => Promise<void>;
}

/**
 * Setup test database with clean state management
 * Creates isolated test environment for each test suite
 */
export async function setupTestDatabase(): Promise<TestDatabaseContext> {
  const testId = `test_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  
  // Use test environment variables or fallback to mock
  const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || 'https://mock-supabase-url.supabase.co';
  const supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || 'mock-supabase-anon-key';
  
  const supabase = createClient(supabaseUrl, supabaseKey);

  // Clean up any existing test data
  await cleanupTestData(supabase, testId);

  return {
    supabase,
    testId,
    cleanup: () => cleanupTestData(supabase, testId),
  };
}

/**
 * Clean up test data from database
 * Ensures no test pollution between test runs
 */
async function cleanupTestData(supabase: SupabaseClient, testId: string): Promise<void> {
  try {
    // Clean up in reverse dependency order
    await supabase.from('match_referees').delete().ilike('created_at', `%${testId}%`);
    await supabase.from('matches').delete().ilike('tournament_code', `%test%`);
    await supabase.from('events').delete().ilike('name', `%test%`);
    await supabase.from('referees').delete().ilike('referee_id', `%test%`);
    await supabase.from('tournaments').delete().ilike('tournament_code', `%test%`);
    
    // Clean up sync logs
    await supabase.from('sync_error_log').delete().ilike('entity_type', `%test%`);
  } catch (error) {
    // In tests, database errors during cleanup are acceptable
    console.warn('Test cleanup warning:', error);
  }
}

/**
 * Reset test database to clean state
 * Used between test cases within the same suite
 */
export async function resetTestDatabase(context: TestDatabaseContext): Promise<void> {
  await cleanupTestData(context.supabase, context.testId);
}

/**
 * Verify database connectivity for integration tests
 */
export async function verifyDatabaseConnection(supabase: SupabaseClient): Promise<boolean> {
  try {
    const { data: _data, error } = await supabase.from('tournaments').select('id').limit(1);
    return !error;
  } catch {
    return false;
  }
}