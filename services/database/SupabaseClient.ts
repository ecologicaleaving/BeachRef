/**
 * Supabase Client Singleton
 *
 * Provides a type-safe Supabase client for database operations.
 * Uses environment variables for configuration.
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { Database } from '../../types/database';

/**
 * Supabase client configuration
 */
interface SupabaseConfig {
  url: string;
  anonKey: string;
  serviceRoleKey?: string;
}

/**
 * Get Supabase configuration from environment variables
 */
function getSupabaseConfig(): SupabaseConfig | null {
  const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !anonKey) {
    console.warn('[SupabaseClient] Missing Supabase configuration');
    return null;
  }

  return {
    url,
    anonKey,
    serviceRoleKey,
  };
}

/**
 * Supabase Client Manager
 *
 * Singleton pattern to ensure only one Supabase client instance
 */
class SupabaseClientManager {
  private static instance: SupabaseClient<Database> | null = null;
  private static isConfigured = false;

  /**
   * Get or create Supabase client instance
   */
  static getInstance(): SupabaseClient<Database> | null {
    if (this.instance) {
      return this.instance;
    }

    const config = getSupabaseConfig();
    if (!config) {
      console.warn('[SupabaseClient] Cannot initialize without configuration');
      return null;
    }

    try {
      // Create client with type safety
      this.instance = createClient<Database>(config.url, config.anonKey, {
        auth: {
          persistSession: false, // We don't use auth in this app
          autoRefreshToken: false,
        },
        db: {
          schema: 'public',
        },
        global: {
          headers: {
            'x-application': 'BeachRef',
          },
        },
      });

      this.isConfigured = true;
      console.log('[SupabaseClient] Initialized successfully');

      return this.instance;
    } catch (error) {
      console.error('[SupabaseClient] Failed to initialize:', error);
      return null;
    }
  }

  /**
   * Check if Supabase is configured and available
   */
  static isAvailable(): boolean {
    return this.isConfigured && this.instance !== null;
  }

  /**
   * Reset instance (useful for testing)
   */
  static reset(): void {
    this.instance = null;
    this.isConfigured = false;
  }
}

/**
 * Get the Supabase client instance
 *
 * @returns Supabase client or null if not configured
 *
 * @example
 * ```typescript
 * const supabase = getSupabaseClient();
 * if (!supabase) {
 *   console.log('Supabase not available, using cache/API only');
 *   return;
 * }
 *
 * const { data, error } = await supabase
 *   .from('matches')
 *   .select('*')
 *   .eq('tournament_code', 'ABC123');
 * ```
 */
export function getSupabaseClient(): SupabaseClient<Database> | null {
  return SupabaseClientManager.getInstance();
}

/**
 * Check if Supabase database is available
 *
 * Use this to gracefully degrade when Supabase is not configured
 *
 * @example
 * ```typescript
 * if (isSupabaseAvailable()) {
 *   await saveToDatabase(data);
 * } else {
 *   console.log('Database not available, using cache only');
 * }
 * ```
 */
export function isSupabaseAvailable(): boolean {
  return SupabaseClientManager.isAvailable();
}

/**
 * Test database connectivity
 *
 * Useful for health checks and debugging
 */
export async function testSupabaseConnection(): Promise<boolean> {
  const supabase = getSupabaseClient();
  if (!supabase) {
    return false;
  }

  try {
    // Simple query to test connection
    const { error } = await supabase
      .from('tournaments')
      .select('id')
      .limit(1);

    if (error) {
      console.error('[SupabaseClient] Connection test failed:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('[SupabaseClient] Connection test error:', error);
    return false;
  }
}

// Export for testing
export { SupabaseClientManager };
