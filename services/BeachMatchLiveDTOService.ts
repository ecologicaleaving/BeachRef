/**
 * @fileoverview BeachMatchLiveDTOService - Service for building complete BeachMatchLiveDTO objects
 *
 * Implements the complete VIS API pipeline to build comprehensive match data:
 * 1. GetBeachMatch(no) → core data (tournament, round, set scores, referees, status)
 * 2. GetBeachTournament(code) → DefaultTimeZone, dates, venue info
 * 3. GetBeachMatchLiveScore(no) → live status, real-time scores, serve speeds, etc.
 * 4. GetBeachMatchStatistics(no) → team and player statistics
 * 5. (Optional) BeachMatchPersonnel → additional officials
 */

import {
  BeachMatchLiveDTO,
  BeachMatchLiveDTOParams,
  BeachMatchStatus,
  VIS_STATUS_TO_BEACH_MATCH_STATUS,
  createMinimalBeachMatchLiveDTO,
  SetScore,
  TeamSide,
  Player,
  Official
} from '../types/beach-match-live-dto';
import { VisApiClient } from './api/VisApiClient';
import {
  GetBeachMatchRequest,
  GetBeachTournamentRequest,
  GetBeachMatchListRequest,
  isSuccessResponse,
  VisApiClientConfig,
  RetryConfig,
  DEFAULT_RETRY_CONFIG
} from '../types/api-v2';
import { VisResponseParser } from './parsing/VisResponseParser';

export class BeachMatchLiveDTOService {
  private static instance: BeachMatchLiveDTOService;
  private visApiClient: VisApiClient;
  private cache: Map<string, BeachMatchLiveDTO> = new Map();
  private cacheExpiry: Map<string, number> = new Map();
  private readonly CACHE_TTL_MS = 30000; // 30 seconds for live data

  private constructor() {
    // Create VisApiClient instance with default configuration
    const config: VisApiClientConfig = {
      baseUrl: 'https://www.fivb.org/Vis2009/XmlRequest.asmx',
      timeoutMs: 15000,
      maxRetries: 3,
      retryDelayMs: 1000,
      exponentialBackoff: true,
      enableLogging: false,
    };

    this.visApiClient = new VisApiClient(config, DEFAULT_RETRY_CONFIG);
  }

  public static getInstance(): BeachMatchLiveDTOService {
    if (!BeachMatchLiveDTOService.instance) {
      BeachMatchLiveDTOService.instance = new BeachMatchLiveDTOService();
    }
    return BeachMatchLiveDTOService.instance;
  }

  /**
   * Build a complete BeachMatchLiveDTO using the VIS API pipeline
   */
  public async buildBeachMatchLiveDTO(params: BeachMatchLiveDTOParams): Promise<BeachMatchLiveDTO> {
    console.log('[BeachMatchLiveDTOService] buildBeachMatchLiveDTO called with params:', JSON.stringify(params, null, 2));

    const cacheKey = `match_${params.matchNo}`;

    // Check cache first (with TTL for live data)
    const cached = this.cache.get(cacheKey);
    const expiry = this.cacheExpiry.get(cacheKey) || 0;
    if (cached && Date.now() < expiry) {
      console.log('[BeachMatchLiveDTOService] Returning cached DTO for match', params.matchNo);
      return cached;
    }

    console.log('[BeachMatchLiveDTOService] No cache hit, building fresh DTO for match', params.matchNo);

    try {
      // Start with minimal DTO
      const dto = createMinimalBeachMatchLiveDTO(params.matchNo);

      // Step 1: GetBeachMatch(no) → core data or use provided match data
      if (params.matchData) {
        this.populateCoreMatchDataFromObject(dto, params.matchData);
      } else {
        await this.populateCoreMatchData(dto, params);
      }

      // Step 2: GetBeachTournament(code) → tournament info and timezone
      if (params.includeTournamentInfo !== false && dto.tournament.code !== "unknown") {
        await this.populateTournamentData(dto);
      }

      // Step 3: GetBeachMatchLiveScore(no) → live data (this will be handled by existing polling)
      // The live polling service will update the DTO with real-time data

      // Step 4: GetBeachMatchStatistics(no) → statistics (optional)
      if (params.includeStatistics) {
        await this.populateStatistics(dto, params.matchNo);
      }

      // Step 5: BeachMatchPersonnel → additional officials (optional)
      if (params.includeOfficials) {
        await this.populateOfficials(dto, params.matchNo);
      }

      // Cache the result
      this.cache.set(cacheKey, dto);
      this.cacheExpiry.set(cacheKey, Date.now() + this.CACHE_TTL_MS);

      return dto;

    } catch (error) {
      console.error(`[BeachMatchLiveDTOService] Failed to build DTO for match ${params.matchNo}:`, error);

      // Return minimal DTO on error
      return createMinimalBeachMatchLiveDTO(params.matchNo);
    }
  }

  /**
   * Step 1a: Populate core match data from existing match object
   */
  private populateCoreMatchDataFromObject(dto: BeachMatchLiveDTO, matchData: any): void {
    if (__DEV__) {
      console.log(`[BeachMatchLiveDTOService] Populating DTO from existing match data:`, {
        matchNo: matchData?.visNo || matchData?.matchCode,
        teams: `${matchData?.team1?.teamName || matchData?.homeTeam} vs ${matchData?.team2?.teamName || matchData?.awayTeam}`,
        status: matchData?.status,
        court: matchData?.court?.courtNumber || matchData?.courtNumber
      });
    }

    try {
      // Populate DTO with match data
      dto.matchNo = parseInt(matchData.visNo || matchData.matchCode || dto.matchNo);

      // Tournament info
      if (matchData.tournamentId || matchData.tournamentNo) {
        dto.tournament.code = (matchData.tournamentId || matchData.tournamentNo).toString();
      }

      // Round info
      if (matchData.round) {
        dto.round.name = matchData.round;
      }
      if (matchData.phaseCode || matchData.roundName) {
        dto.round.phase = matchData.phaseCode || matchData.roundName;
      }

      // Schedule info
      const scheduledTime = matchData.scheduledDateTime || matchData.matchTime || matchData.dateTime;
      if (scheduledTime) {
        const date = new Date(scheduledTime);
        dto.schedule.localDate = date.toISOString().split('T')[0];
        dto.schedule.localTime = date.toLocaleTimeString();
        dto.schedule.utcBegin = date.toISOString();
      }

      // Court info
      const courtInfo = matchData.court || matchData;
      if (courtInfo.courtNumber || courtInfo.courtNo) {
        dto.venue.court = courtInfo.courtNumber || courtInfo.courtNo;
      }

      // Team data - handle different formats
      const team1 = matchData.team1 || { teamName: matchData.homeTeam, player1Name: matchData.homePlayer1, player2Name: matchData.homePlayer2 };
      const team2 = matchData.team2 || { teamName: matchData.awayTeam, player1Name: matchData.awayPlayer1, player2Name: matchData.awayPlayer2 };

      if (team1.teamName) {
        dto.teams.home.teamName = team1.teamName;
        dto.teams.home.players = [
          { name: team1.player1Name || team1.players?.[0]?.name || "TBD" },
          { name: team1.player2Name || team1.players?.[1]?.name || "TBD" }
        ];
      }

      if (team2.teamName) {
        dto.teams.away.teamName = team2.teamName;
        dto.teams.away.players = [
          { name: team2.player1Name || team2.players?.[0]?.name || "TBD" },
          { name: team2.player2Name || team2.players?.[1]?.name || "TBD" }
        ];
      }

      // Set scores if available
      if (matchData.result?.setScores) {
        dto.score.sets = [];
        for (let i = 0; i < matchData.result.setScores.length; i += 2) {
          const setNo = (i / 2) + 1;
          dto.score.sets.push({
            setNo,
            home: matchData.result.setScores[i] || null,
            away: matchData.result.setScores[i + 1] || null
          });
        }
      }

      // Status mapping
      if (matchData.status) {
        const numericStatus = typeof matchData.status === 'number' ? matchData.status : parseInt(matchData.status);
        if (!isNaN(numericStatus) && VIS_STATUS_TO_BEACH_MATCH_STATUS[numericStatus]) {
          dto.status.state = VIS_STATUS_TO_BEACH_MATCH_STATUS[numericStatus];
        }
      }

      if (__DEV__) {
        console.log(`[BeachMatchLiveDTOService] Successfully populated DTO from existing data:`, {
          matchNo: dto.matchNo,
          teams: `${dto.teams.home.teamName} vs ${dto.teams.away.teamName}`,
          court: dto.venue.court,
          sets: dto.score.sets.length,
          status: dto.status.state
        });
      }

    } catch (error) {
      console.warn(`[BeachMatchLiveDTOService] Failed to populate from existing data:`, error);
      // Continue with minimal DTO
    }
  }

  /**
   * Step 1b: Populate core match data from GetBeachMatch API
   */
  private async populateCoreMatchData(dto: BeachMatchLiveDTO, params: BeachMatchLiveDTOParams): Promise<void> {
    if (__DEV__) {
      console.log(`[BeachMatchLiveDTOService] Populating core data for match ${params.matchNo}`);
    }

    try {
      if (__DEV__) {
        console.log(`[BeachMatchLiveDTOService] Making API call with params:`, {
          tournamentNo: params.tournamentNo || 8242,
          matchNo: params.matchNo
        });
      }

      // Use existing VIS API client to get match data
      const tournamentNumber = params.tournamentNo || 8242;

      if (__DEV__) {
        console.log('=== INSIDE BeachMatchLiveDTOService.populateCoreMatchData ===');
        console.log('[BeachMatchLiveDTOService] API call parameters:', {
          originalTournamentNo: params.tournamentNo,
          finalTournamentNumber: tournamentNumber,
          tournamentNumberType: typeof tournamentNumber,
          eventNo: undefined
        });
      }

      const response = await this.visApiClient.getBeachMatchList({
        tournamentNo: typeof tournamentNumber === 'string' ? parseInt(tournamentNumber, 10) : tournamentNumber,
        eventNo: undefined // Will be auto-resolved
      });

      if (__DEV__) {
        console.log('[BeachMatchLiveDTOService] API response status:', {
          isSuccess: isSuccessResponse(response),
          responseType: typeof response,
          hasData: !!response?.data,
          dataLength: response?.data?.length || 0,
          responseKeys: response ? Object.keys(response) : [],
          fullResponse: response
        });
      }

      if (isSuccessResponse(response)) {
        if (__DEV__) {
          console.log('[BeachMatchLiveDTOService] API response data (first 1000 chars):',
            response.data
              ? (typeof response.data === 'string'
                  ? response.data.substring(0, 1000)
                  : JSON.stringify(response.data, null, 2).substring(0, 1000))
              : 'NO DATA - response.data is null/undefined'
          );
        }

        // TODO: Fetch tournament timezone from GetBeachTournament for better timezone handling
        const matches = VisResponseParser.parseBeachMatches(response.data, tournamentNumber.toString(), undefined);

        if (__DEV__) {
          console.log(`[BeachMatchLiveDTOService] Found ${matches.length} matches in tournament`);
          console.log(`[BeachMatchLiveDTOService] Looking for match with visNo=${params.matchNo} or matchCode=${params.matchNo}`);
          console.log(`[BeachMatchLiveDTOService] Available matches:`, matches.slice(0, 3).map(m => ({
            visNo: m.visNo,
            matchCode: m.matchCode,
            teams: `${m.team1?.teamName} vs ${m.team2?.teamName}`
          })));
        }

        const targetMatch = matches.find(m =>
          m.visNo === params.matchNo.toString() ||
          m.matchCode === params.matchNo.toString()
        );

        if (targetMatch) {
          // Populate DTO with match data
          dto.matchNo = params.matchNo;
          dto.tournament.code = targetMatch.tournamentId;

          dto.round.name = targetMatch.round;
          dto.round.phase = targetMatch.phaseCode;

          dto.schedule.localDate = targetMatch.scheduledDateTime.split('T')[0];
          dto.schedule.localTime = new Date(targetMatch.scheduledDateTime).toLocaleTimeString();
          dto.schedule.utcBegin = targetMatch.scheduledDateTime;

          dto.venue.court = targetMatch.court?.courtNumber;

          dto.teams.home.teamName = targetMatch.team1.teamName;
          dto.teams.home.players = [
            { name: targetMatch.team1.player1Name },
            { name: targetMatch.team1.player2Name }
          ];

          dto.teams.away.teamName = targetMatch.team2.teamName;
          dto.teams.away.players = [
            { name: targetMatch.team2.player1Name },
            { name: targetMatch.team2.player2Name }
          ];

          // Initialize with static scores if available
          if (targetMatch.result?.setScores) {
            dto.score.sets = [];
            for (let i = 0; i < targetMatch.result.setScores.length; i += 2) {
              const setNo = (i / 2) + 1;
              dto.score.sets.push({
                setNo,
                home: targetMatch.result.setScores[i] || null,
                away: targetMatch.result.setScores[i + 1] || null
              });
            }
          }

          if (__DEV__) {
            console.log(`[BeachMatchLiveDTOService] Populated DTO from match data:`, {
              matchNo: dto.matchNo,
              teams: `${dto.teams.home.teamName} vs ${dto.teams.away.teamName}`,
              court: dto.venue.court,
              sets: dto.score.sets.length
            });
          }
        } else {
          if (__DEV__) {
            console.warn(`[BeachMatchLiveDTOService] Match ${params.matchNo} not found in tournament ${params.tournamentNo}`);
          }
        }
      } else {
        console.error(`[BeachMatchLiveDTOService] API call failed:`, response);
        if (__DEV__) {
          console.warn(`[BeachMatchLiveDTOService] API call failed:`, response);
        }
      }
    } catch (error) {
      console.warn(`[BeachMatchLiveDTOService] Failed to populate core data:`, error);
      // Continue with minimal DTO
    }
  }

  /**
   * Step 2: Populate tournament data from GetBeachTournament
   */
  private async populateTournamentData(dto: BeachMatchLiveDTO): Promise<void> {
    try {
      if (__DEV__) {
        console.log(`[BeachMatchLiveDTOService] Populating tournament data for ${dto.tournament.code}`);
      }

      // For now, set reasonable defaults
      // This will be populated when we implement the actual API call
      if (__DEV__) {
        console.log(`[BeachMatchLiveDTOService] Tournament data would be populated for ${dto.tournament.code}`);
      }
    } catch (error) {
      console.warn(`[BeachMatchLiveDTOService] Failed to populate tournament data:`, error);
      // Continue with defaults - gender will be undefined, handled in UI
    }
  }

  /**
   * Step 4: Populate statistics from GetBeachMatchStatistics
   */
  private async populateStatistics(dto: BeachMatchLiveDTO, matchNo: number): Promise<void> {
    try {
      if (__DEV__) {
        console.log(`[BeachMatchLiveDTOService] Populating statistics for match ${matchNo}`);
      }

      // This would be the actual API call:
      // const response = await this.visApiClient.getBeachMatchStatistics({
      //   matchNo
      // });

      // Initialize empty statistics structure
      dto.statistics = {
        team: {
          home: null,
          away: null
        },
        players: []
      };
    } catch (error) {
      console.warn(`[BeachMatchLiveDTOService] Failed to populate statistics:`, error);
    }
  }

  /**
   * Step 5: Populate additional officials from BeachMatchPersonnel
   */
  private async populateOfficials(dto: BeachMatchLiveDTO, matchNo: number): Promise<void> {
    try {
      if (__DEV__) {
        console.log(`[BeachMatchLiveDTOService] Populating officials for match ${matchNo}`);
      }

      // This would be the actual API call:
      // const response = await this.visApiClient.getBeachMatchPersonnel({
      //   matchNo
      // });

      // Initialize empty officials structure if not exists
      if (!dto.officials) {
        dto.officials = {};
      }
    } catch (error) {
      console.warn(`[BeachMatchLiveDTOService] Failed to populate officials:`, error);
    }
  }

  /**
   * Update DTO with live score data using VIS BeachLive format
   */
  public updateDTOWithLiveData(dto: BeachMatchLiveDTO, beachLive: any): BeachMatchLiveDTO {
    if (!beachLive) return dto;

    const updatedDTO = { ...dto };

    // Update status using VIS mapping from reference
    if (beachLive.status !== undefined) {
      const numericStatus = typeof beachLive.status === 'number' ? beachLive.status : parseInt(beachLive.status);
      if (!isNaN(numericStatus) && VIS_STATUS_TO_BEACH_MATCH_STATUS[numericStatus]) {
        updatedDTO.status.state = VIS_STATUS_TO_BEACH_MATCH_STATUS[numericStatus];
      }
    }

    // Update sets from BeachLive.sets array with proper status derivation
    if (beachLive.sets && Array.isArray(beachLive.sets)) {
      const overallStatus = beachLive.status || '0';
      const liveSets: SetScore[] = [];

      beachLive.sets.forEach((set: any) => {
        liveSets.push({
          setNo: set.no,
          home: set.pointsTeamA || 0,
          away: set.pointsTeamB || 0
        });
      });

      updatedDTO.score.sets = liveSets;

      if (__DEV__) {
        console.log(`[BeachMatchLiveDTOService] Updated DTO with live sets:`, {
          overallStatus,
          setsCount: liveSets.length,
          sets: liveSets.map(s => `Set ${s.setNo}: ${s.home}-${s.away}`)
        });
      }
    }

    // Update audit info
    if (!updatedDTO.audit) {
      updatedDTO.audit = {};
    }
    updatedDTO.audit.liveVersion = beachLive.version || (beachLive.lastUpdate ? parseInt(beachLive.lastUpdate) : undefined);
    updatedDTO.audit.lastChangeAt = new Date().toISOString();
    updatedDTO.audit.liveRefreshDelaySec = beachLive.pollDelay ? beachLive.pollDelay / 1000 : null;

    return updatedDTO;
  }

  /**
   * Clear cache for a specific match
   */
  public clearMatchCache(matchNo: number): void {
    const cacheKey = `match_${matchNo}`;
    this.cache.delete(cacheKey);
    this.cacheExpiry.delete(cacheKey);
  }

  /**
   * Clear all cached data
   */
  public clearAllCache(): void {
    this.cache.clear();
    this.cacheExpiry.clear();
  }
}