/**
 * @fileoverview BeachMatchService - Service for loading stable beach match data
 *
 * Provides methods to fetch BeachMatchDTO data from VIS API with caching support.
 * Used by MatchDetailScreen for initial data loading.
 */

import { BeachMatchDTO, BeachMatchBootstrapParams, isValidBeachMatchDTO } from '../types/match-details-dto';
import { VisApiClient } from './api/VisApiClient';
import { CacheService } from './CacheService';

export class BeachMatchService {
  private static instance: BeachMatchService;
  private visApiClient: VisApiClient;
  private cacheService: CacheService;

  private constructor() {
    this.visApiClient = VisApiClient.getInstance();
    this.cacheService = CacheService.getInstance();
  }

  public static getInstance(): BeachMatchService {
    if (!BeachMatchService.instance) {
      BeachMatchService.instance = new BeachMatchService();
    }
    return BeachMatchService.instance;
  }

  /**
   * Get stable match data for a specific match
   * @param matchNo - Match number/ID
   * @param params - Additional bootstrap parameters
   * @returns Promise<BeachMatchDTO>
   */
  public async getMatch(
    matchNo: number,
    params?: Partial<BeachMatchBootstrapParams>
  ): Promise<BeachMatchDTO> {
    const cacheKey = `beach_match_${matchNo}`;

    try {
      // Try cache first
      const cachedMatch = await this.cacheService.get<BeachMatchDTO>(cacheKey);
      if (cachedMatch && isValidBeachMatchDTO(cachedMatch)) {
        return cachedMatch;
      }

      // Fetch from API
      const apiResponse = await this.visApiClient.getBeachMatch({
        No: matchNo,
        ...params
      });

      // Transform API response to BeachMatchDTO
      const beachMatchDTO = this.transformApiResponseToDTO(apiResponse);

      // Validate transformed data
      if (!isValidBeachMatchDTO(beachMatchDTO)) {
        throw new Error(`Invalid match data received for match ${matchNo}`);
      }

      // Cache the result
      await this.cacheService.set(cacheKey, beachMatchDTO);

      return beachMatchDTO;
    } catch (error) {
      console.error(`Failed to load match ${matchNo}:`, error);
      throw new Error(`Failed to load match details: ${error.message}`);
    }
  }

  /**
   * Transform VIS API response to BeachMatchDTO
   * @param apiResponse - Raw API response from GetBeachMatch
   * @returns BeachMatchDTO
   */
  private transformApiResponseToDTO(apiResponse: any): BeachMatchDTO {
    return {
      // Match & round identification
      no: apiResponse.No,
      tournamentNo: apiResponse.NoTournament,
      roundCode: apiResponse.RoundCode,
      roundName: apiResponse.RoundName,
      roundPhase: apiResponse.RoundPhase,
      bracket: apiResponse.RoundBracket,
      status: this.mapMatchStatus(apiResponse.Status),
      resultType: apiResponse.ResultType,

      // Timing & timezone
      beginDateTimeUtc: apiResponse.BeginDateTimeUtc,
      endDateTimeUtc: apiResponse.EndDateTimeUtc,
      localDate: apiResponse.LocalDate,
      localTime: apiResponse.LocalTime,
      localTimeOffset: apiResponse.LocalTimeOffset,
      timeZone: apiResponse.TimeZone,

      // Venue / court
      court: apiResponse.Court,
      venue: apiResponse.Venue,
      city: apiResponse.City,

      // Teams
      teamA: {
        no: apiResponse.NoTeamA,
        name: apiResponse.TeamAName,
        federation: apiResponse.TeamAFederationCode,
        players: {
          a1: apiResponse.NoPlayerA1,
          a2: apiResponse.NoPlayerA2
        }
      },
      teamB: {
        no: apiResponse.NoTeamB,
        name: apiResponse.TeamBName,
        federation: apiResponse.TeamBFederationCode,
        players: {
          b1: apiResponse.NoPlayerB1,
          b2: apiResponse.NoPlayerB2
        }
      },

      // Referees (if present)
      referees: this.extractReferees(apiResponse),

      // Closed set scores + summary
      sets: this.extractSets(apiResponse),
      setsResultsText: apiResponse.SetsResultsText,

      // Other metadata
      format: apiResponse.Format,
      liveStreamUri: apiResponse.LiveStreamUri,
      acquisitionMethod: apiResponse.AcquisitionMethod,
      tournamentType: apiResponse.TournamentType,
      tournamentGender: apiResponse.TournamentGender,
      version: apiResponse.Version || Date.now()
    };
  }

  /**
   * Map VIS status codes to readable status strings
   */
  private mapMatchStatus(status: string | number): string {
    if (typeof status === 'number') {
      const statusMap: { [key: number]: string } = {
        1: 'Scheduled',
        2: 'Ready',
        3: 'InSet1',
        4: 'Set1Done',
        5: 'InSet2',
        6: 'Set2Done',
        7: 'InSet3',
        8: 'Set3Done',
        9: 'Finished',
        10: 'OfficialResult'
      };
      return statusMap[status] || `Status${status}`;
    }
    return status;
  }

  /**
   * Extract referee information from API response
   */
  private extractReferees(apiResponse: any) {
    const referees: any = {};

    if (apiResponse.Referee1Name) {
      referees.first = {
        no: apiResponse.NoReferee1,
        name: apiResponse.Referee1Name,
        federation: apiResponse.Referee1FederationCode
      };
    }

    if (apiResponse.Referee2Name) {
      referees.second = {
        no: apiResponse.NoReferee2,
        name: apiResponse.Referee2Name,
        federation: apiResponse.Referee2FederationCode
      };
    }

    if (apiResponse.ChallengeRefereeName) {
      referees.challenge = {
        no: apiResponse.NoChallengeReferee,
        name: apiResponse.ChallengeRefereeName,
        federation: apiResponse.ChallengeRefereeFederationCode
      };
    }

    return Object.keys(referees).length > 0 ? referees : undefined;
  }

  /**
   * Extract set scores from API response
   */
  private extractSets(apiResponse: any): Array<{ set: number; a: number; b: number; durationSec?: number }> {
    const sets: Array<{ set: number; a: number; b: number; durationSec?: number }> = [];

    // Extract set 1
    if (apiResponse.PointsTeamASet1 !== undefined && apiResponse.PointsTeamBSet1 !== undefined) {
      sets.push({
        set: 1,
        a: parseInt(apiResponse.PointsTeamASet1) || 0,
        b: parseInt(apiResponse.PointsTeamBSet1) || 0,
        durationSec: apiResponse.DurationSet1 ? parseInt(apiResponse.DurationSet1) : undefined
      });
    }

    // Extract set 2
    if (apiResponse.PointsTeamASet2 !== undefined && apiResponse.PointsTeamBSet2 !== undefined) {
      sets.push({
        set: 2,
        a: parseInt(apiResponse.PointsTeamASet2) || 0,
        b: parseInt(apiResponse.PointsTeamBSet2) || 0,
        durationSec: apiResponse.DurationSet2 ? parseInt(apiResponse.DurationSet2) : undefined
      });
    }

    // Extract set 3
    if (apiResponse.PointsTeamASet3 !== undefined && apiResponse.PointsTeamBSet3 !== undefined) {
      sets.push({
        set: 3,
        a: parseInt(apiResponse.PointsTeamASet3) || 0,
        b: parseInt(apiResponse.PointsTeamBSet3) || 0,
        durationSec: apiResponse.DurationSet3 ? parseInt(apiResponse.DurationSet3) : undefined
      });
    }

    return sets;
  }

  /**
   * Check if cached match data exists
   * @param matchNo - Match number
   * @returns Promise<boolean>
   */
  public async hasCachedMatch(matchNo: number): Promise<boolean> {
    const cacheKey = `beach_match_${matchNo}`;
    const cachedMatch = await this.cacheService.get<BeachMatchDTO>(cacheKey);
    return cachedMatch !== null && isValidBeachMatchDTO(cachedMatch);
  }

  /**
   * Clear cached match data
   * @param matchNo - Match number
   */
  public async clearCachedMatch(matchNo: number): Promise<void> {
    const cacheKey = `beach_match_${matchNo}`;
    await this.cacheService.delete(cacheKey);
  }
}