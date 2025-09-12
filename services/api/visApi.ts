/**
 * Simplified VIS API Interface
 * Minimal direct API interface for edge cases only
 * Used as fallback when database is unavailable
 * 
 * This replaces complex caching, transformation, and warmup logic
 * with simple, direct API calls for fallback scenarios.
 */

// Environment configuration
const EDGE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL ? 
  `${process.env.EXPO_PUBLIC_SUPABASE_URL}/functions/v1` : 
  'http://localhost:54321/functions/v1';

/**
 * Simple tournament parameters for API calls
 */
interface TournamentParams {
  season?: number;
  gender?: 'M' | 'W';
  [key: string]: any;
}

/**
 * Simple match parameters for API calls  
 */
interface MatchParams {
  tournamentCode?: string;
  [key: string]: any;
}

/**
 * Simple referee parameters for API calls
 */
interface RefereeParams {
  tournamentCodes?: string[];
  federationCode?: string;
  [key: string]: any;
}

/**
 * Minimal VIS API for edge cases only
 * 
 * IMPORTANT: This should only be used as fallback when database is unavailable.
 * Primary data access should go through the simplified hooks:
 * - useTournaments() for tournament data
 * - useMatches() for match data  
 * - useReferees() for referee data
 * - useOfflineSync() for sync management
 */
export const visApi = {
  /**
   * Get tournaments - fallback when database unavailable
   */
  getTournaments: async (params: TournamentParams = {}) => {
    const qs = new URLSearchParams(
      Object.entries(params).filter(([, v]) => v != null) as string[][]
    );
    
    const response = await fetch(`${EDGE_URL}/vis-adapter/tournaments?${qs}`);
    if (!response.ok) {
      throw new Error(`API request failed: ${response.status} ${response.statusText}`);
    }
    
    return await response.json();
  },

  /**
   * Get matches - fallback when database unavailable
   */
  getMatches: async (params: MatchParams = {}) => {
    const qs = new URLSearchParams(
      Object.entries(params).filter(([, v]) => v != null) as string[][]
    );
    
    const response = await fetch(`${EDGE_URL}/vis-adapter/matches?${qs}`);
    if (!response.ok) {
      throw new Error(`API request failed: ${response.status} ${response.statusText}`);
    }
    
    return await response.json();
  },

  /**
   * Get referees - fallback when database unavailable
   */
  getReferees: async (params: RefereeParams = {}) => {
    const qs = new URLSearchParams();
    
    // Handle array parameters properly
    if (params.tournamentCodes) {
      params.tournamentCodes.forEach(code => qs.append('tournamentCode', code));
    }
    
    // Add other parameters
    Object.entries(params).forEach(([key, value]) => {
      if (key !== 'tournamentCodes' && value != null) {
        qs.append(key, String(value));
      }
    });
    
    const response = await fetch(`${EDGE_URL}/vis-adapter/referees?${qs}`);
    if (!response.ok) {
      throw new Error(`API request failed: ${response.status} ${response.statusText}`);
    }
    
    return await response.json();
  }
};

/**
 * Legacy compatibility exports
 * Maintains compatibility with existing code that might import these
 */
export default visApi;

/**
 * Documentation: When to use this API vs hooks
 * 
 * USE SIMPLIFIED HOOKS (PREFERRED):
 * - useTournaments() - Database-first with intelligent caching
 * - useMatches() - Real-time data with performance optimization  
 * - useReferees() - Assignment status with filtering
 * - useOfflineSync() - Offline queue management
 * 
 * USE THIS API (FALLBACK ONLY):
 * - When database is completely unavailable
 * - Emergency fallback scenarios in hook implementations
 * - Development/testing when database is not set up
 * 
 * REMOVED COMPLEXITY:
 * - Complex caching logic (handled by TanStack Query in hooks)
 * - Cache key builders (replaced by hook query keys)
 * - Performance monitoring (integrated into hooks)  
 * - Retry logic with exponential backoff (TanStack Query handles this)
 * - Memory management (TanStack Query garbage collection)
 * - Cache warmup services (replaced by database-first strategy)
 */