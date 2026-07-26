/**
 * Tournament Team Service
 *
 * Business logic service for managing tournament team registrations.
 * Handles caching, data normalization, and VIS API integration.
 *
 * Feature: 003-players-entry-list
 */

import { CacheService } from './cache/CacheService';
import { VisApiClient } from './api/VisApiClient';
import {
  TournamentTeam,
  TeamPhase,
  TeamStatus,
  isValidTeam
} from '../types/tournament-team';
import {
  GetTournamentTeamListRequest,
  GetTournamentTeamListResponse,
  VISTeamDTO,
  isSuccessResponse
} from '../types/api-v2';
// TournamentCore lives in types/tournament-v2, not types/tournament.
import { TournamentCore } from '../types/tournament-v2';

/**
 * Required fields for team list API call
 */
const REQUIRED_TEAM_FIELDS = [
  'No',
  'Player1Name',
  'Player2Name',
  'Player1No',
  'Player2No',
  'Seed',
  'PhaseCode',
  'CountryCode',
  'Status',
  'IsWildCard',
  'IsReserve',
  'Gender',
] as const;

/**
 * Service for managing tournament team operations
 */
export class TournamentTeamService {
  private readonly cacheService = CacheService.getInstance();
  private readonly visApi: VisApiClient;

  constructor(visApi: VisApiClient) {
    this.visApi = visApi;
  }

  /**
   * Get team list for a tournament with caching
   *
   * @param tournamentNo - Tournament number
   * @param tournament - Optional tournament object for TTL calculation
   * @returns Promise with array of tournament teams
   */
  async getTeamList(
    tournamentNo: number,
    tournament?: TournamentCore
  ): Promise<TournamentTeam[]> {
    const cacheKey = `team-list-${tournamentNo}`;
    const ttl = tournament ? this.calculateTeamListTTL(tournament) : 24 * 60 * 60 * 1000;

    try {
      const teams = await this.cacheService.get(
        cacheKey,
        async () => {
          // Fetch from VIS API
          const request: GetTournamentTeamListRequest = {
            TournamentNo: tournamentNo,
            Fields: REQUIRED_TEAM_FIELDS as unknown as readonly string[],
          };

          const response = await this.visApi.getTournamentTeamList(request);

          if (!isSuccessResponse(response)) {
            throw new Error(`Failed to fetch team list: ${response.error}`);
          }

          // Parse and normalize response
          return this.parseTeamListResponse(response.xmlData, tournamentNo);
        },
        'tournament-team-list',
        ttl
      );

      // Ensure teams is always an array
      const teamsArray = Array.isArray(teams) ? teams : [];

      // Validate and sort teams
      const validTeams = teamsArray.filter(isValidTeam);
      return this.sortTeamsBySeed(validTeams);

    } catch (error) {
      console.error('[TournamentTeamService] Error fetching team list:', error);

      // Try to return cached data even if expired
      try {
        const cachedTeams = await this.cacheService.get(
          cacheKey,
          async () => [],
          'tournament-team-list',
          Infinity // Accept stale data
        );
        if (cachedTeams.length > 0) {
          console.log('[TournamentTeamService] Returning stale cached data');
          return cachedTeams;
        }
      } catch {
        // Ignore cache fallback errors
      }

      throw error;
    }
  }

  /**
   * Calculate adaptive TTL based on tournament lifecycle
   *
   * - More than 7 days away: 7 days TTL (teams may still register)
   * - Final week before start: 24 hours TTL (last-minute changes possible)
   * - Tournament started or finished: Infinite TTL (registrations locked)
   *
   * @param tournament - Tournament core data
   * @returns TTL in milliseconds
   */
  private calculateTeamListTTL(tournament: TournamentCore): number {
    const now = new Date();
    const startDate = new Date(tournament.startDate);
    const daysUntilStart = Math.floor(
      (startDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
    );

    if (daysUntilStart > 7) {
      // More than 1 week away: teams may still be registering
      return 7 * 24 * 60 * 60 * 1000; // 7 days
    } else if (daysUntilStart > 0) {
      // Final week: last-minute changes possible
      return 24 * 60 * 60 * 1000; // 24 hours
    } else {
      // Tournament started or finished: registrations locked
      return Infinity; // Never expire
    }
  }

  /**
   * Parse VIS API XML response and normalize to domain entities
   *
   * @param xmlData - Raw XML response from VIS API
   * @param tournamentNo - Tournament number for entity construction
   * @returns Array of normalized tournament teams
   */
  private parseTeamListResponse(xmlData: string, tournamentNo: number): TournamentTeam[] {
    try {
      // Parse XML to JSON
      const parser = new (require('fast-xml-parser').XMLParser)({
        ignoreAttributes: false,
        attributeNamePrefix: '@_',
        textNodeName: '#text',
        parseTagValue: true,
        parseAttributeValue: true,
      });

      const result = parser.parse(xmlData) as GetTournamentTeamListResponse;

      // Handle VIS API response structure variations
      let teams: VISTeamDTO[] = [];

      if (result?.BeachTeams?.BeachTeam) {
        // VIS API may return single object or array
        teams = Array.isArray(result.BeachTeams.BeachTeam)
          ? result.BeachTeams.BeachTeam
          : [result.BeachTeams.BeachTeam];
      }

      // Normalize each team
      return teams.map(dto => this.parseVISTeam(dto, tournamentNo));

    } catch (error) {
      console.error('[TournamentTeamService] Error parsing team list response:', error);
      return [];
    }
  }

  /**
   * Normalize VIS Team DTO to domain entity
   *
   * @param dto - VIS team DTO from API
   * @param tournamentNo - Tournament number
   * @returns Normalized TournamentTeam entity
   */
  private parseVISTeam(dto: VISTeamDTO, tournamentNo: number): TournamentTeam {
    return {
      teamNo: dto.no,
      tournamentNo,
      player1: {
        playerNo: dto.player1No,
        fullName: dto.player1Name,
        countryCode: dto.countryCode,
      },
      player2: {
        playerNo: dto.player2No,
        fullName: dto.player2Name,
        countryCode: dto.countryCode,
      },
      seed: dto.seed,
      phaseCode: this.normalizePhaseCode(dto.phaseCode),
      gender: dto.gender,
      status: this.normalizeTeamStatus(dto.status),
      isWildCard: dto.isWildCard ?? false,
      isReserve: dto.isReserve ?? false,
      countryCode: dto.countryCode,
    };
  }

  /**
   * Normalize VIS phase code to domain enum
   *
   * VIS API may return:
   * - "1" or "MD" or "MainDraw" → 'MainDraw'
   * - "2" or "Q" or "Qualification" → 'Qualification'
   *
   * @param code - VIS phase code
   * @returns Normalized TeamPhase
   */
  private normalizePhaseCode(code: string): TeamPhase {
    const normalized = code.toUpperCase().trim();

    if (normalized === '1' || normalized === 'MD' || normalized === 'MAINDRAW') {
      return 'MainDraw';
    }

    if (normalized === '2' || normalized === 'Q' || normalized === 'QUALIFICATION') {
      return 'Qualification';
    }

    // Default to MainDraw if unknown
    console.warn(`[TournamentTeamService] Unknown phase code: ${code}, defaulting to MainDraw`);
    return 'MainDraw';
  }

  /**
   * Normalize VIS team status to domain enum
   *
   * @param status - VIS status string (optional)
   * @returns Normalized TeamStatus
   */
  private normalizeTeamStatus(status?: string): TeamStatus {
    if (!status) return 'Confirmed';

    const normalized = status.toUpperCase().trim();

    if (normalized.includes('WITHDRAW')) return 'Withdrawn';
    if (normalized.includes('RESERVE')) return 'Reserve';

    return 'Confirmed';
  }

  /**
   * Sort teams by seed number
   * - Seeded teams first (1, 2, 3, ...)
   * - Unseeded teams last (no seed)
   *
   * @param teams - Array of teams to sort
   * @returns Sorted array
   */
  private sortTeamsBySeed(teams: TournamentTeam[]): TournamentTeam[] {
    return [...teams].sort((a, b) => {
      // Seeded teams before unseeded
      if (a.seed !== null && b.seed === null) return -1;
      if (a.seed === null && b.seed !== null) return 1;

      // Both seeded: sort by seed number
      if (a.seed !== null && b.seed !== null) {
        return a.seed - b.seed;
      }

      // Both unseeded: sort by team number
      return a.teamNo - b.teamNo;
    });
  }

  /**
   * Refresh team list in cache
   * Forces API call even if cached data is fresh
   *
   * @param tournamentNo - Tournament number
   * @param tournament - Optional tournament object for TTL calculation
   * @returns Promise with refreshed team list
   */
  async refreshTeamList(
    tournamentNo: number,
    tournament?: TournamentCore
  ): Promise<TournamentTeam[]> {
    const cacheKey = `team-list-${tournamentNo}`;

    // Invalidate existing cache
    await this.cacheService.invalidate(cacheKey);

    // Fetch fresh data
    return this.getTeamList(tournamentNo, tournament);
  }
}
