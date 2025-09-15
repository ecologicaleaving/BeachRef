/**
 * API Migration Adapter
 * Part of API Client Response Types Optimization Refactoring
 * Provides backward compatibility while transitioning to optimized API types
 */

import { OptimizedApiClient } from './OptimizedApiClient';
import {
  ApiResponse,
  TournamentResponseDTO,
  MatchResponseDTO,
  RefereeResponseDTO
} from '../../types/api-responses';

/**
 * Legacy API response interfaces for backward compatibility
 */
export interface LegacyTournamentResponse {
  No: string | number;
  Name: string;
  Code?: string;
  City?: string;
  Country?: string;
  CountryCode?: string;
  StartDate?: string;
  EndDate?: string;
  Type?: string;
  Gender?: 'M' | 'W' | 'X';
  Status?: string;
  visNo?: string;
  [key: string]: any;
}

export interface LegacyMatchResponse {
  MatchNo: string | number;
  EventNo: string | number;
  CourtNo?: string | number;
  Status?: string;
  TeamA?: any;
  TeamB?: any;
  ScheduledTime?: string;
  ActualTime?: string;
  Round?: string;
  Phase?: string;
  Referees?: any[];
  [key: string]: any;
}

export interface LegacyRefereeResponse {
  RefereeId: string | number;
  Name?: string;
  FirstName?: string;
  LastName?: string;
  Federation?: string;
  Country?: string;
  Level?: string;
  [key: string]: any;
}

/**
 * Migration adapter that wraps the OptimizedApiClient
 * and provides legacy-compatible interfaces
 */
export class ApiMigrationAdapter {
  private optimizedClient: OptimizedApiClient;

  constructor(optimizedClient?: OptimizedApiClient) {
    this.optimizedClient = optimizedClient || new OptimizedApiClient();
  }

  /**
   * Legacy tournament fetching - returns data in old format
   */
  async getTournamentsLegacy(): Promise<LegacyTournamentResponse[]> {
    try {
      const response = await this.optimizedClient.getTournaments();

      if (!response.success) {
        // For backward compatibility, throw errors instead of returning error responses
        throw new Error(response.error?.message || 'Failed to fetch tournaments');
      }

      // Transform new format back to legacy format
      return response.data.tournaments.map(this.transformTournamentToLegacy);
    } catch (error) {
      console.error('Legacy tournament fetch failed:', error);
      throw error;
    }
  }

  /**
   * Legacy match fetching - returns data in old format
   */
  async getMatchesLegacy(tournamentId: string | number): Promise<LegacyMatchResponse[]> {
    try {
      const response = await this.optimizedClient.getMatches(tournamentId);

      if (!response.success) {
        throw new Error(response.error?.message || 'Failed to fetch matches');
      }

      // Transform new format back to legacy format
      return response.data.matches.map(this.transformMatchToLegacy);
    } catch (error) {
      console.error('Legacy match fetch failed:', error);
      throw error;
    }
  }

  /**
   * Legacy referee fetching - returns data in old format
   */
  async getRefereesLegacy(): Promise<LegacyRefereeResponse[]> {
    try {
      const response = await this.optimizedClient.getReferees();

      if (!response.success) {
        throw new Error(response.error?.message || 'Failed to fetch referees');
      }

      // Transform new format back to legacy format
      return response.data.referees.map(this.transformRefereeToLegacy);
    } catch (error) {
      console.error('Legacy referee fetch failed:', error);
      throw error;
    }
  }

  /**
   * Hybrid method - returns optimized response but with legacy data format
   */
  async getTournamentsHybrid(): Promise<ApiResponse<LegacyTournamentResponse[]>> {
    const response = await this.optimizedClient.getTournaments();

    if (!response.success) {
      return response as ApiResponse<LegacyTournamentResponse[]>;
    }

    return {
      ...response,
      data: response.data.tournaments.map(this.transformTournamentToLegacy)
    };
  }

  /**
   * Hybrid method - returns optimized response but with legacy data format
   */
  async getMatchesHybrid(tournamentId: string | number): Promise<ApiResponse<LegacyMatchResponse[]>> {
    const response = await this.optimizedClient.getMatches(tournamentId);

    if (!response.success) {
      return response as ApiResponse<LegacyMatchResponse[]>;
    }

    return {
      ...response,
      data: response.data.matches.map(this.transformMatchToLegacy)
    };
  }

  /**
   * Hybrid method - returns optimized response but with legacy data format
   */
  async getRefereesHybrid(): Promise<ApiResponse<LegacyRefereeResponse[]>> {
    const response = await this.optimizedClient.getReferees();

    if (!response.success) {
      return response as ApiResponse<LegacyRefereeResponse[]>;
    }

    return {
      ...response,
      data: response.data.referees.map(this.transformRefereeToLegacy)
    };
  }

  /**
   * Get the underlying optimized client for direct access
   */
  getOptimizedClient(): OptimizedApiClient {
    return this.optimizedClient;
  }

  // Private transformation methods

  private transformTournamentToLegacy(tournament: TournamentResponseDTO): LegacyTournamentResponse {
    return {
      No: tournament.id,
      Name: tournament.name,
      Code: tournament.code,
      City: tournament.location?.city,
      Country: tournament.location?.country,
      CountryCode: tournament.location?.countryCode,
      StartDate: tournament.dates?.start,
      EndDate: tournament.dates?.end,
      Type: tournament.type,
      Gender: tournament.gender,
      Status: tournament.status,
      visNo: tournament.visNo,
      // Preserve any additional properties for full backward compatibility
      ...tournament
    };
  }

  private transformMatchToLegacy(match: MatchResponseDTO): LegacyMatchResponse {
    return {
      MatchNo: match.matchNo || match.id,
      EventNo: match.eventNo,
      CourtNo: match.courtNo,
      Status: match.status,
      TeamA: match.teams?.teamA || {},
      TeamB: match.teams?.teamB || {},
      ScheduledTime: match.timing?.scheduled,
      ActualTime: match.timing?.actual,
      Round: match.metadata?.round,
      Phase: match.metadata?.phase,
      Referees: match.referees || [],
      // Preserve original properties
      id: match.id,
      ...match
    };
  }

  private transformRefereeToLegacy(referee: RefereeResponseDTO): LegacyRefereeResponse {
    return {
      RefereeId: referee.id,
      Name: referee.name,
      FirstName: referee.firstName,
      LastName: referee.lastName,
      Federation: referee.federation,
      Country: referee.country,
      Level: referee.level,
      // Preserve original properties
      ...referee
    };
  }
}

/**
 * Default migration adapter instance
 */
export const defaultMigrationAdapter = new ApiMigrationAdapter();

/**
 * Backward compatible function exports for existing code
 */

/**
 * @deprecated Use OptimizedApiClient.getTournaments() instead
 */
export async function fetchTournaments(): Promise<LegacyTournamentResponse[]> {
  return defaultMigrationAdapter.getTournamentsLegacy();
}

/**
 * @deprecated Use OptimizedApiClient.getMatches() instead
 */
export async function fetchMatches(tournamentId: string | number): Promise<LegacyMatchResponse[]> {
  return defaultMigrationAdapter.getMatchesLegacy(tournamentId);
}

/**
 * @deprecated Use OptimizedApiClient.getReferees() instead
 */
export async function fetchReferees(): Promise<LegacyRefereeResponse[]> {
  return defaultMigrationAdapter.getRefereesLegacy();
}

/**
 * Utility function to help migrate existing API calls
 */
export function createMigrationHelper() {
  return {
    /**
     * Wrap existing API calls to use optimized client
     */
    wrapLegacyCall: async <T>(
      legacyCall: () => Promise<T>,
      optimizedCall: () => Promise<ApiResponse<T>>
    ): Promise<T> => {
      try {
        const response = await optimizedCall();
        if (response.success) {
          return response.data;
        }
        throw new Error(response.error?.message || 'API call failed');
      } catch (error) {
        console.warn('Optimized call failed, falling back to legacy:', error);
        return legacyCall();
      }
    },

    /**
     * Transform legacy response to optimized format
     */
    transformLegacyResponse: <T>(
      legacyData: T,
      timestamp: string = new Date().toISOString()
    ): ApiResponse<T> => {
      return {
        success: true,
        data: legacyData,
        timestamp
      };
    },

    /**
     * Check if response is in new format
     */
    isOptimizedResponse: (response: any): response is ApiResponse<any> => {
      return (
        typeof response === 'object' &&
        response !== null &&
        'success' in response &&
        'timestamp' in response &&
        typeof response.success === 'boolean'
      );
    }
  };
}

/**
 * Migration guide for existing code
 */
export const MigrationGuide = {
  /**
   * Examples of how to migrate existing API calls
   */
  examples: {
    // OLD (Legacy):
    // const tournaments = await fetchTournaments();

    // NEW (Optimized):
    // const response = await optimizedApiClient.getTournaments();
    // if (response.success) {
    //   const tournaments = response.data.tournaments;
    // }

    // HYBRID (During migration):
    // const response = await migrationAdapter.getTournamentsHybrid();
    // if (response.success) {
    //   const tournaments = response.data; // Still in legacy format
    // }
  },

  /**
   * Migration steps
   */
  steps: [
    '1. Update imports to use OptimizedApiClient or ApiMigrationAdapter',
    '2. Change API calls to return ApiResponse<T> instead of T',
    '3. Add proper error handling for success/error responses',
    '4. Update data access patterns to use response.data',
    '5. Remove legacy function calls once migration is complete',
    '6. Update tests to use new response format',
    '7. Add performance monitoring and caching configuration'
  ]
};