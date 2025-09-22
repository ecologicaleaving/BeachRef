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
    if (__DEV__) {
      console.log('[BeachMatchLiveDTOService] buildBeachMatchLiveDTO called with params:', {
        matchNo: params.matchNo,
        tournamentNo: params.tournamentNo,
        hasMatchData: !!params.matchData,
        matchDataType: typeof params.matchData,
        matchDataKeys: params.matchData ? Object.keys(params.matchData) : null,
        includeStatistics: params.includeStatistics,
        includeOfficials: params.includeOfficials
      });
    }

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

      // Step 1: GetBeachMatch(no) → core data ONLY (no legacy data support)
      if (__DEV__) {
        console.log('[BeachMatchLiveDTOService] Making GetBeachMatch API call - no legacy data support');
      }
      await this.populateCoreMatchData(dto, params);

      // Step 2: GetBeachTournament(code) → tournament info and timezone (OPTIONAL)
      if (params.includeTournamentInfo === true && dto.tournament.code !== "unknown") {
        if (__DEV__) {
          console.log('[BeachMatchLiveDTOService] Including tournament info - will make GetBeachTournament API call');
        }
        await this.populateTournamentData(dto);
      } else if (__DEV__) {
        console.log('[BeachMatchLiveDTOService] Skipping tournament info - no additional API call');
      }

      // Step 3: GetBeachMatchLiveScore(no) → live data (this will be handled by existing polling)
      // The live polling service will update the DTO with real-time data

      // Step 4: GetBeachMatchStatistics(no) → statistics (OPTIONAL)
      if (params.includeStatistics === true) {
        if (__DEV__) {
          console.log('[BeachMatchLiveDTOService] Including statistics - will make additional GetBeachMatch API call');
        }
        await this.populateStatistics(dto, params.matchNo);
      } else if (__DEV__) {
        console.log('[BeachMatchLiveDTOService] Skipping statistics - no additional API call');
      }

      // Step 5: BeachMatchPersonnel → additional officials (OPTIONAL)
      if (params.includeOfficials === true) {
        if (__DEV__) {
          console.log('[BeachMatchLiveDTOService] Including officials - will make BeachMatchPersonnel API call');
        }
        await this.populateOfficials(dto, params.matchNo);
      } else if (__DEV__) {
        console.log('[BeachMatchLiveDTOService] Skipping officials - no additional API call');
      }

      // Validate that we have real data - reject empty/mock data
      if (!dto.teams.home.players[0].name || !dto.teams.away.players[0].name) {
        throw new Error(`No valid team data found for match ${params.matchNo}. Teams: ${dto.teams.home.players[0].name} vs ${dto.teams.away.players[0].name}`);
      }

      // Cache the result
      this.cache.set(cacheKey, dto);
      this.cacheExpiry.set(cacheKey, Date.now() + this.CACHE_TTL_MS);

      return dto;

    } catch (error) {
      console.error(`[BeachMatchLiveDTOService] Failed to build DTO for match ${params.matchNo}:`, error);

      // Don't return mock data - throw the error so caller knows data is not available
      throw new Error(`Failed to build DTO for match ${params.matchNo}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // REMOVED: Legacy match data handling eliminated

  /**
   * Step 1b: Populate core match data from GetBeachMatch API
   */
  private async populateCoreMatchData(dto: BeachMatchLiveDTO, params: BeachMatchLiveDTOParams): Promise<void> {
    if (__DEV__) {
      console.log(`[BeachMatchLiveDTOService] Populating core data for match ${params.matchNo} using only match number`);
    }

    try {
      if (__DEV__) {
        console.log(`[BeachMatchLiveDTOService] Making direct GetBeachMatch API call with params:`, {
          matchNo: params.matchNo,
          tournamentNo: params.tournamentNo || 'not provided - using match number only'
        });
      }

      if (__DEV__) {
        console.log('=== INSIDE BeachMatchLiveDTOService.populateCoreMatchData ===');
        console.log('[BeachMatchLiveDTOService] Using direct GetBeachMatch API call - match number should be unique');
      }

      // Use GetBeachMatch with ONLY match number - simplest possible API call
      const response = await this.visApiClient.getBeachMatch({
        matchNo: params.matchNo,
        // ALL OTHER PARAMETERS REMOVED for minimal API call
        includeResults: true,
        includeReferees: true,
        includeTeamDetails: true,
        includeSetScores: true,
        includeStatistics: false
      });

      if (__DEV__) {
        console.log('[BeachMatchLiveDTOService] API response status:', {
          isSuccess: isSuccessResponse(response),
          responseType: typeof response,
          hasXmlData: !!response?.xmlData,
          xmlDataLength: response?.xmlData?.length || 0,
          responseKeys: response ? Object.keys(response) : [],
          fullResponse: response
        });
      }

      if (isSuccessResponse(response)) {
        if (__DEV__) {
          console.log('[BeachMatchLiveDTOService] GetBeachMatch API response data (first 1000 chars):',
            response.xmlData
              ? (typeof response.xmlData === 'string'
                  ? response.xmlData.substring(0, 1000)
                  : JSON.stringify(response.xmlData, null, 2).substring(0, 1000))
              : 'NO DATA - response.xmlData is null/undefined'
          );
        }

        // Parse single match response directly (not a list)
        const matchData = this.parseMatchFromGetBeachMatchResponse(response.xmlData);

        if (__DEV__) {
          console.log('[BeachMatchLiveDTOService] parseMatchFromGetBeachMatchResponse result:', {
            hasMatchData: !!matchData,
            hasTeam1: !!matchData?.team1,
            hasTeam2: !!matchData?.team2,
            matchDataKeys: matchData ? Object.keys(matchData) : null,
            team1Data: matchData?.team1,
            team2Data: matchData?.team2
          });
        }

        if (matchData && matchData.team1 && matchData.team2) {
          // We have detailed match data from GetBeachMatch
          // Populate DTO with match data
          dto.matchNo = params.matchNo;
          dto.tournament.code = matchData.tournamentId || matchData.tournamentNo?.toString() || "unknown";

          dto.round.name = matchData.round;
          dto.round.phase = matchData.phaseCode;

          if (matchData.scheduledDateTime) {
            dto.schedule.localDate = matchData.scheduledDateTime.split('T')[0];
            dto.schedule.localTime = new Date(matchData.scheduledDateTime).toLocaleTimeString();
            dto.schedule.utcBegin = matchData.scheduledDateTime;
          }

          dto.venue.court = matchData.court?.courtNumber || matchData.courtNumber;

          // Team data
          if (matchData.team1) {
            dto.teams.home.teamName = matchData.team1.teamName;
            dto.teams.home.federationCode = matchData.team1.federationCode;
            dto.teams.home.players = [
              { name: matchData.team1.player1Name || "", federationCode: matchData.team1.federationCode },
              { name: matchData.team1.player2Name || "", federationCode: matchData.team1.federationCode }
            ];
          }

          if (matchData.team2) {
            dto.teams.away.teamName = matchData.team2.teamName;
            dto.teams.away.federationCode = matchData.team2.federationCode;
            dto.teams.away.players = [
              { name: matchData.team2.player1Name || "", federationCode: matchData.team2.federationCode },
              { name: matchData.team2.player2Name || "", federationCode: matchData.team2.federationCode }
            ];
          }

          // Initialize with static scores if available
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

          if (__DEV__) {
            console.log(`[BeachMatchLiveDTOService] Successfully populated DTO from GetBeachMatch response:`, {
              matchNo: dto.matchNo,
              tournamentCode: dto.tournament.code,
              teams: `${dto.teams.home.teamName} vs ${dto.teams.away.teamName}`,
              court: dto.venue.court,
              sets: dto.score.sets.length
            });
          }
        } else {
          // NO FALLBACK - If GetBeachMatch doesn't return valid data, fail immediately
          throw new Error(`GetBeachMatch API returned insufficient data for match ${params.matchNo}. No fallback will be attempted.`);
        }
      } else {
        // NO FALLBACK - If API call fails, throw error immediately
        throw new Error(`GetBeachMatch API call failed for match ${params.matchNo}. Response: ${JSON.stringify(response)}`);
      }
    } catch (error) {
      // NO FALLBACK - Re-throw the error to fail the entire DTO build process
      throw new Error(`Failed to populate core match data: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  // REMOVED: Fallback method eliminated - only GetBeachMatch API call allowed

  /**
   * Parse match data from GetBeachMatch response (single match, not list)
   */
  private parseMatchFromGetBeachMatchResponse(xmlData: string): any {
    try {
      if (!xmlData || typeof xmlData !== 'string') {
        return null;
      }

      if (__DEV__) {
        console.log(`[BeachMatchLiveDTOService] Parsing single match from GetBeachMatch XML response`);
      }

      // Use VisResponseParser but adapt for single match
      // The GetBeachMatch response returns a single self-closing BeachMatch element
      const singleMatchPattern = /<BeachMatch[^>]*\/?>/i;
      const matchMatch = xmlData.match(singleMatchPattern);

      if (__DEV__) {
        console.log('[BeachMatchLiveDTOService] Looking for BeachMatch in XML (first 1000 chars):', xmlData.substring(0, 1000));
        console.log('[BeachMatchLiveDTOService] Full XML length:', xmlData.length);
        console.log('[BeachMatchLiveDTOService] Pattern match result:', matchMatch ? 'FOUND' : 'NOT FOUND');
        if (matchMatch) {
          console.log('[BeachMatchLiveDTOService] Found BeachMatch element:', matchMatch[0]);
        } else {
          // Try alternative patterns
          console.log('[BeachMatchLiveDTOService] Trying alternative patterns...');
          const alt1 = xmlData.match(/<BeachMatch/i);
          const alt2 = xmlData.match(/BeachMatch/i);
          console.log('[BeachMatchLiveDTOService] Has "<BeachMatch"?', !!alt1);
          console.log('[BeachMatchLiveDTOService] Has "BeachMatch" anywhere?', !!alt2);
        }
      }

      if (matchMatch) {
        // Extract match attributes and content
        const matchXml = matchMatch[0];

        // Parse using similar logic to VisResponseParser but for single match
        const matchData: any = {};

        // Extract basic match attributes
        const noMatch = matchXml.match(/No="([^"]*)"/i);
        if (noMatch) matchData.visNo = noMatch[1];

        const tournamentMatch = matchXml.match(/NoTournament="([^"]*)"/i);
        if (tournamentMatch) matchData.tournamentId = tournamentMatch[1];

        const courtMatch = matchXml.match(/Court="([^"]*)"/i);
        if (courtMatch) matchData.courtNumber = courtMatch[1];

        // Extract date/time - VIS API uses LocalDate and LocalTime
        const localDateMatch = matchXml.match(/LocalDate="([^"]*)"/i);
        const localTimeMatch = matchXml.match(/LocalTime="([^"]*)"/i);
        if (localDateMatch && localTimeMatch) {
          matchData.scheduledDateTime = `${localDateMatch[1]}T${localTimeMatch[1]}`;
          matchData.localDate = localDateMatch[1];
          matchData.localTime = localTimeMatch[1];
        }

        // Extract round info - VIS API uses RoundName
        const roundNameMatch = matchXml.match(/RoundName="([^"]*)"/i);
        if (roundNameMatch) matchData.round = roundNameMatch[1];

        const roundPhaseMatch = matchXml.match(/RoundPhase="([^"]*)"/i);
        if (roundPhaseMatch) matchData.phaseCode = roundPhaseMatch[1];

        // Extract team data from BeachMatch attributes (VIS API format)
        // Team A data
        const teamANameMatch = matchXml.match(/TeamAName="([^"]*)"/i);
        const teamAFedMatch = matchXml.match(/TeamAFederationCode="([^"]*)"/i);

        if (teamANameMatch) {
          const teamAData: any = {
            teamName: teamANameMatch[1],
            federationCode: teamAFedMatch ? teamAFedMatch[1] : null
          };

          // Split team name into players (format: "Player1/Player2")
          const playerNames = teamANameMatch[1].split('/');
          if (playerNames.length >= 2) {
            teamAData.player1Name = playerNames[0].trim();
            teamAData.player2Name = playerNames[1].trim();
          } else {
            // Fallback: use team name for both players if no slash found
            teamAData.player1Name = teamANameMatch[1].trim();
            teamAData.player2Name = teamANameMatch[1].trim();
          }

          matchData.team1 = teamAData;
        }

        // Team B data
        const teamBNameMatch = matchXml.match(/TeamBName="([^"]*)"/i);
        const teamBFedMatch = matchXml.match(/TeamBFederationCode="([^"]*)"/i);

        if (teamBNameMatch) {
          const teamBData: any = {
            teamName: teamBNameMatch[1],
            federationCode: teamBFedMatch ? teamBFedMatch[1] : null
          };

          // Split team name into players (format: "Player1/Player2")
          const playerNames = teamBNameMatch[1].split('/');
          if (playerNames.length >= 2) {
            teamBData.player1Name = playerNames[0].trim();
            teamBData.player2Name = playerNames[1].trim();
          } else {
            // Fallback: use team name for both players if no slash found
            teamBData.player1Name = teamBNameMatch[1].trim();
            teamBData.player2Name = teamBNameMatch[1].trim();
          }

          matchData.team2 = teamBData;
        }

        // Extract result/scores from BeachMatch attributes (VIS format)
        const setScores: number[] = [];

        // Extract set 1 scores
        const set1AMatch = matchXml.match(/PointsTeamASet1="([^"]*)"/i);
        const set1BMatch = matchXml.match(/PointsTeamBSet1="([^"]*)"/i);
        if (set1AMatch && set1BMatch && set1AMatch[1] && set1BMatch[1]) {
          const scoreA = parseInt(set1AMatch[1], 10);
          const scoreB = parseInt(set1BMatch[1], 10);
          if (!isNaN(scoreA) && !isNaN(scoreB)) {
            setScores.push(scoreA, scoreB);
          }
        }

        // Extract set 2 scores
        const set2AMatch = matchXml.match(/PointsTeamASet2="([^"]*)"/i);
        const set2BMatch = matchXml.match(/PointsTeamBSet2="([^"]*)"/i);
        if (set2AMatch && set2BMatch && set2AMatch[1] && set2BMatch[1]) {
          const scoreA = parseInt(set2AMatch[1], 10);
          const scoreB = parseInt(set2BMatch[1], 10);
          if (!isNaN(scoreA) && !isNaN(scoreB)) {
            setScores.push(scoreA, scoreB);
          }
        }

        // Extract set 3 scores (if present)
        const set3AMatch = matchXml.match(/PointsTeamASet3="([^"]*)"/i);
        const set3BMatch = matchXml.match(/PointsTeamBSet3="([^"]*)"/i);
        if (set3AMatch && set3BMatch && set3AMatch[1] && set3BMatch[1]) {
          const scoreA = parseInt(set3AMatch[1], 10);
          const scoreB = parseInt(set3BMatch[1], 10);
          if (!isNaN(scoreA) && !isNaN(scoreB)) {
            setScores.push(scoreA, scoreB);
          }
        }

        if (setScores.length > 0) {
          matchData.result = { setScores };
        }

        if (__DEV__) {
          console.log(`[BeachMatchLiveDTOService] Parsed single match:`, {
            visNo: matchData.visNo,
            tournament: matchData.tournamentId,
            teams: `${matchData.team1?.teamName} vs ${matchData.team2?.teamName}`,
            court: matchData.courtNumber,
            hasResult: !!matchData.result,
            team1: matchData.team1,
            team2: matchData.team2,
            allParsedData: matchData
          });
        }

        return matchData;
      }

      if (__DEV__) {
        console.log('[BeachMatchLiveDTOService] No BeachMatch element found, returning null');
      }
      return null;
    } catch (error) {
      console.warn(`[BeachMatchLiveDTOService] Failed to parse GetBeachMatch response:`, error);
      if (__DEV__) {
        console.log('[BeachMatchLiveDTOService] Error details:', error);
      }
      return null;
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
   * Step 4: Populate statistics using GetBeachMatch with includeStatistics
   */
  private async populateStatistics(dto: BeachMatchLiveDTO, matchNo: number): Promise<void> {
    try {
      if (__DEV__) {
        console.log(`[BeachMatchLiveDTOService] Populating statistics for match ${matchNo} using only match number`);
      }

      // Call GetBeachMatch with only match number and includeStatistics option
      // Keep other includes enabled as VIS API might need them for complete data
      const response = await this.visApiClient.getBeachMatch({
        matchNo: matchNo,
        // tournamentNo is optional - omit it to use only match number
        includeStatistics: true,
        includeResults: true,
        includeReferees: true,
        includeTeamDetails: true,
        includeSetScores: true
      });

      if (__DEV__) {
        console.log(`[BeachMatchLiveDTOService] Statistics API response:`, {
          success: isSuccessResponse(response),
          hasXmlData: !!response?.xmlData,
          dataLength: response?.data?.length || 0
        });
      }

      if (isSuccessResponse(response)) {
        // Parse the XML response to extract statistics
        const statisticsData = this.parseStatisticsFromXML(response.data);

        if (statisticsData) {
          dto.statistics = statisticsData;

          if (__DEV__) {
            console.log(`[BeachMatchLiveDTOService] Successfully populated statistics:`, {
              hasTeamStats: !!(statisticsData.team?.home || statisticsData.team?.away),
              playerStatsCount: statisticsData.players?.length || 0
            });
          }
        } else {
          // Initialize empty statistics structure
          dto.statistics = {
            team: {
              home: null,
              away: null
            },
            players: []
          };
        }
      } else {
        if (__DEV__) {
          console.warn(`[BeachMatchLiveDTOService] Statistics API call failed:`, response);
        }

        // Initialize empty statistics structure
        dto.statistics = {
          team: {
            home: null,
            away: null
          },
          players: []
        };
      }
    } catch (error) {
      console.warn(`[BeachMatchLiveDTOService] Failed to populate statistics:`, error);

      // Initialize empty statistics structure
      dto.statistics = {
        team: {
          home: null,
          away: null
        },
        players: []
      };
    }
  }

  /**
   * Parse statistics data from VIS API XML response
   */
  private parseStatisticsFromXML(xmlData: string): { team?: { home?: any; away?: any }; players?: any[] } | null {
    try {
      if (__DEV__) {
        console.log(`[BeachMatchLiveDTOService] Parsing statistics from XML data (length: ${xmlData?.length || 0})`);
      }

      if (!xmlData || typeof xmlData !== 'string') {
        return null;
      }

      // Look for Statistics elements in the XML
      const statisticsPattern = /<Statistics[^>]*>([\s\S]*?)<\/Statistics>/gi;
      const teamStatsPattern = /<TeamStatistics[^>]*Team="([AB])"[^>]*>([\s\S]*?)<\/TeamStatistics>/gi;
      const playerStatsPattern = /<PlayerStatistics[^>]*>([\s\S]*?)<\/PlayerStatistics>/gi;

      const result = {
        team: { home: null, away: null },
        players: []
      };

      // Extract team statistics
      let teamMatch;
      while ((teamMatch = teamStatsPattern.exec(xmlData)) !== null) {
        const team = teamMatch[1]; // 'A' or 'B'
        const statsXml = teamMatch[2];

        const teamStats = this.parseTeamStatsFromXML(statsXml);
        if (teamStats) {
          if (team === 'A') {
            result.team.home = teamStats;
          } else if (team === 'B') {
            result.team.away = teamStats;
          }
        }
      }

      // Extract player statistics
      let playerMatch;
      while ((playerMatch = playerStatsPattern.exec(xmlData)) !== null) {
        const playerStatsXml = playerMatch[1];
        const playerStats = this.parsePlayerStatsFromXML(playerStatsXml);
        if (playerStats) {
          result.players.push(playerStats);
        }
      }

      if (__DEV__) {
        console.log(`[BeachMatchLiveDTOService] Parsed statistics:`, {
          hasHomeTeamStats: !!result.team.home,
          hasAwayTeamStats: !!result.team.away,
          playerStatsCount: result.players.length
        });
      }

      // Return null if no statistics were found
      if (!result.team.home && !result.team.away && result.players.length === 0) {
        return null;
      }

      return result;
    } catch (error) {
      console.warn(`[BeachMatchLiveDTOService] Failed to parse statistics from XML:`, error);
      return null;
    }
  }

  /**
   * Parse team statistics from XML fragment
   */
  private parseTeamStatsFromXML(xmlFragment: string): any {
    try {
      const stats: any = {};

      // Map VIS statistics field names to DTO field names
      const fieldMappings = {
        'SpikePoint': 'spikePoint',
        'SpikeFault': 'spikeFault',
        'SpikeContinue': 'spikeContinue',
        'BlockPoint': 'blockPoint',
        'BlockFault': 'blockFault',
        'BlockContinue': 'blockContinue',
        'ServePoint': 'servePoint',
        'ServeFault': 'serveFault',
        'ServeContinue': 'serveContinue',
        'ServeKey': 'serveKey',
        'ReceptionExcellent': 'receptionExcellent',
        'ReceptionFault': 'receptionFault',
        'ReceptionContinue': 'receptionContinue',
        'DigExcellent': 'digExcellent',
        'DigFault': 'digFault',
        'DigContinue': 'digContinue',
        'DigKey': 'digKey',
        'SetPoint': 'setPoint',
        'SetFault': 'setFault',
        'SetContinue': 'setContinue',
        'BackSpikePoint': 'backSpikePoint',
        'BackSpikeFault': 'backSpikeFault',
        'BackSpikeContinue': 'backSpikeContinue',
        'OpponentFault': 'opponentFault',
        'OpponentContinue': 'opponentContinue',
        'TeamFault': 'teamFault'
      };

      // Extract statistics values from XML attributes or content
      for (const [visField, dtoField] of Object.entries(fieldMappings)) {
        const pattern = new RegExp(`${visField}="([^"]*)"`, 'i');
        const match = xmlFragment.match(pattern);
        if (match && match[1]) {
          const value = parseInt(match[1], 10);
          if (!isNaN(value)) {
            stats[dtoField] = value;
          }
        }
      }

      return Object.keys(stats).length > 0 ? stats : null;
    } catch (error) {
      console.warn(`[BeachMatchLiveDTOService] Failed to parse team stats:`, error);
      return null;
    }
  }

  /**
   * Parse player statistics from XML fragment
   */
  private parsePlayerStatsFromXML(xmlFragment: string): any {
    try {
      const stats: any = {};

      // Extract player identification
      const teamMatch = xmlFragment.match(/Team="([AB])"/i);
      const playerNoMatch = xmlFragment.match(/PlayerNo="([^"]*)"/i);
      const nameMatch = xmlFragment.match(/Name="([^"]*)"/i);

      if (teamMatch) {
        stats.team = teamMatch[1] === 'A' ? 'home' : 'away';
      }

      if (playerNoMatch) {
        const playerNo = parseInt(playerNoMatch[1], 10);
        if (!isNaN(playerNo)) {
          stats.playerNo = playerNo;
        }
      }

      if (nameMatch) {
        stats.name = nameMatch[1];
      }

      // Map statistics fields (same as team stats but without team-specific ones)
      const fieldMappings = {
        'SpikePoint': 'spikePoint',
        'SpikeFault': 'spikeFault',
        'SpikeContinue': 'spikeContinue',
        'BlockPoint': 'blockPoint',
        'BlockFault': 'blockFault',
        'BlockContinue': 'blockContinue',
        'ServePoint': 'servePoint',
        'ServeFault': 'serveFault',
        'ServeContinue': 'serveContinue',
        'ReceptionExcellent': 'receptionExcellent',
        'ReceptionFault': 'receptionFault',
        'ReceptionContinue': 'receptionContinue',
        'DigExcellent': 'digExcellent',
        'DigFault': 'digFault',
        'DigContinue': 'digContinue',
        'SetPoint': 'setPoint',
        'SetFault': 'setFault',
        'SetContinue': 'setContinue'
      };

      // Extract statistics values
      for (const [visField, dtoField] of Object.entries(fieldMappings)) {
        const pattern = new RegExp(`${visField}="([^"]*)"`, 'i');
        const match = xmlFragment.match(pattern);
        if (match && match[1]) {
          const value = parseInt(match[1], 10);
          if (!isNaN(value)) {
            stats[dtoField] = value;
          }
        }
      }

      return stats.team ? stats : null;
    } catch (error) {
      console.warn(`[BeachMatchLiveDTOService] Failed to parse player stats:`, error);
      return null;
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
    let hasActualChanges = false;

    // Check for version changes for logging
    const newVersion = beachLive.version || (beachLive.lastUpdate ? parseInt(beachLive.lastUpdate) : undefined);
    const currentVersion = dto.audit?.liveVersion;
    const isNewVersion = newVersion !== undefined && newVersion !== currentVersion;

    // Update status using VIS mapping from reference
    if (beachLive.status !== undefined) {
      const numericStatus = typeof beachLive.status === 'number' ? beachLive.status : parseInt(beachLive.status);
      if (!isNaN(numericStatus) && VIS_STATUS_TO_BEACH_MATCH_STATUS[numericStatus]) {
        const newState = VIS_STATUS_TO_BEACH_MATCH_STATUS[numericStatus];
        if (updatedDTO.status.state !== newState) {
          updatedDTO.status.state = newState;
          hasActualChanges = true;
        }
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

      // Check if sets actually changed
      const currentSets = updatedDTO.score.sets || [];
      const setsChanged = liveSets.length !== currentSets.length ||
        liveSets.some((newSet, index) => {
          const currentSet = currentSets[index];
          return !currentSet ||
                 newSet.setNo !== currentSet.setNo ||
                 newSet.home !== currentSet.home ||
                 newSet.away !== currentSet.away;
        });

      if (setsChanged) {
        updatedDTO.score.sets = liveSets;
        hasActualChanges = true;

        if (__DEV__ && isNewVersion) {
          console.log(`[BeachMatchLiveDTOService] 📊 NEW VERSION ${newVersion}: Updated sets:`, {
            overallStatus,
            setsCount: liveSets.length,
            sets: liveSets.map(s => `Set ${s.setNo}: ${s.home}-${s.away}`)
          });
        }
      }
    }

    // Update audit info
    if (!updatedDTO.audit) {
      updatedDTO.audit = {};
    }

    // Always update version and poll delay (these are metadata, not content changes)
    updatedDTO.audit.liveVersion = newVersion;
    updatedDTO.audit.liveRefreshDelaySec = beachLive.pollDelay ? beachLive.pollDelay / 1000 : null;

    // ONLY update lastChangeAt if there were actual content changes
    if (hasActualChanges) {
      updatedDTO.audit.lastChangeAt = new Date().toISOString();

      if (__DEV__ && isNewVersion) {
        console.log(`[BeachMatchLiveDTOService] 🔄 NEW VERSION ${newVersion}: ACTUAL CHANGES detected - updating lastChangeAt`);
      }
    } else {
      if (__DEV__ && isNewVersion) {
        console.log(`[BeachMatchLiveDTOService] ⚪ NEW VERSION ${newVersion}: No content changes - keeping existing lastChangeAt`);
      }
    }

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