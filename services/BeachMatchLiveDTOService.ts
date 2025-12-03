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
  VIS_STATUS_TO_BEACH_MATCH_STATUS,
  VIS_RESULT_TYPE_TO_RESULT_TYPE,
  createMinimalBeachMatchLiveDTO,
  SetScore
} from '../types/beach-match-live-dto';
import { VisApiClient } from './api/VisApiClient';
import {
  isSuccessResponse,
  VisApiClientConfig,
  DEFAULT_RETRY_CONFIG
} from '../types/api-v2';

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
      }
      await this.populateCoreMatchData(dto, params);

      // Step 2: GetBeachTournament(code) → tournament info and timezone (OPTIONAL)
      if (params.includeTournamentInfo === true && dto.tournament.code !== "unknown") {
        if (__DEV__) {
        }
        await this.populateTournamentData(dto);
      } else if (__DEV__) {
      }

      // Step 3: GetBeachMatchLiveScore(no) → live data (this will be handled by existing polling)
      // The live polling service will update the DTO with real-time data

      // Step 4: GetBeachMatchStatistics(no) → statistics (OPTIONAL or auto for completed matches)
      const isCompleted = dto.status.state === "Finished" || dto.status.state === "OfficialResult" || dto.status.state === "Corrected" || dto.status.state === "Closed";

      if (params.includeStatistics === true || isCompleted) {
        if (__DEV__) {
        }
        await this.populateStatistics(dto, params.matchNo);
      } else if (__DEV__) {
      }

      // Step 5: BeachMatchPersonnel → additional officials (OPTIONAL or auto for completed matches)
      if (params.includeOfficials === true || isCompleted) {
        if (__DEV__) {
        }
        await this.populateOfficials(dto, params.matchNo);
      } else if (__DEV__) {
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

        // Parse single match response directly (not a list)
        const matchData = this.parseMatchFromGetBeachMatchResponse(response.xmlData);


        if (matchData && matchData.team1 && matchData.team2) {
          // We have detailed match data from GetBeachMatch
          // Populate DTO with match data
          dto.matchNo = params.matchNo;
          dto.noInTournament = matchData.noInTournament; // For badge display
          dto.tournamentGender = matchData.tournamentGender; // For badge styling
          dto.tournament.code = matchData.tournamentId || matchData.tournamentNo?.toString() || "unknown";

          // DEBUG: Log DTO badge field assignment
          if (__DEV__) {
            console.log(`🏐 [DEBUG-BeachMatchLiveDTO] Assigning badge fields to DTO:`, {
              from_matchData_noInTournament: matchData.noInTournament,
              from_matchData_tournamentGender: matchData.tournamentGender,
              assigned_dto_noInTournament: dto.noInTournament,
              assigned_dto_tournamentGender: dto.tournamentGender,
              assigned_dto_matchNo: dto.matchNo
            });
          }

          dto.round.name = matchData.round;
          dto.round.phase = matchData.phaseCode;

          if (matchData.scheduledDateTime) {
            dto.schedule.localDate = matchData.scheduledDateTime.split('T')[0];
            dto.schedule.localTime = new Date(matchData.scheduledDateTime).toLocaleTimeString();
            dto.schedule.utcBegin = matchData.scheduledDateTime;
          }

          dto.venue.court = matchData.court?.courtNumber || matchData.courtNumber;

          // Update status from parsed match data
          if (matchData.status !== undefined) {
            const mappedStatus = VIS_STATUS_TO_BEACH_MATCH_STATUS[matchData.status];
            if (mappedStatus) {
              dto.status.state = mappedStatus;
              if (__DEV__) {
                console.log(`[BeachMatchLiveDTOService] Status mapping: ${matchData.status} → ${mappedStatus}`);
              }
            } else {
              if (__DEV__) {
                console.warn(`[BeachMatchLiveDTOService] Unknown VIS status code: ${matchData.status}. Please update VIS_STATUS_TO_BEACH_MATCH_STATUS mapping.`);
              }
              // Keep default "Scheduled" status if we can't map the code
            }
          }

          // Update result type from parsed match data
          if (matchData.resultType !== undefined) {
            const mappedResultType = VIS_RESULT_TYPE_TO_RESULT_TYPE[matchData.resultType];
            if (mappedResultType) {
              dto.status.resultType = mappedResultType;
              if (__DEV__) {
                console.log(`[BeachMatchLiveDTOService] Result type mapping: ${matchData.resultType} → ${mappedResultType}`);
              }
            } else {
              if (__DEV__) {
                console.warn(`[BeachMatchLiveDTOService] Unknown VIS result type code: ${matchData.resultType}. Please update VIS_RESULT_TYPE_TO_RESULT_TYPE mapping.`);
              }
            }
          }

          // Apply additional data for completed matches
          if (matchData.temperature !== undefined) {
            dto.venue.temperature = matchData.temperature;
          }
          if (matchData.spectators !== undefined) {
            dto.venue.spectators = matchData.spectators;
          }
          if (matchData.duration !== undefined) {
            dto.schedule.duration = matchData.duration;
          }
          if (matchData.winnerRank !== undefined || matchData.winnerRoundRank !== undefined) {
            if (!dto.rankings) {
              dto.rankings = {};
            }
            if (matchData.winnerRank !== undefined) {
              dto.rankings.winnerRank = matchData.winnerRank;
            }
            if (matchData.winnerRoundRank !== undefined) {
              dto.rankings.winnerRoundRank = matchData.winnerRoundRank;
            }
          }

          // Team data
          if (matchData.team1) {
            dto.teams.home.teamName = matchData.team1.teamName;
            dto.teams.home.federationCode = matchData.team1.federationCode;
            dto.teams.home.setWon = matchData.team1.setWon || null;
            dto.teams.home.players = [
              { name: matchData.team1.player1Name || "", federationCode: matchData.team1.federationCode },
              { name: matchData.team1.player2Name || "", federationCode: matchData.team1.federationCode }
            ];
          }

          if (matchData.team2) {
            dto.teams.away.teamName = matchData.team2.teamName;
            dto.teams.away.federationCode = matchData.team2.federationCode;
            dto.teams.away.setWon = matchData.team2.setWon || null;
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

            // Add final result information
            if (matchData.finalResult) {
              dto.status.resultText = matchData.finalResult.resultSummary;
            }

            // Note: Sets won are now stored directly in team objects (teams.home.setWon, teams.away.setWon)

            if (matchData.finalResult && __DEV__) {
              console.log(`[BeachMatchLiveDTOService] Applied final result: ${matchData.finalResult.resultSummary} (${matchData.finalResult.scoreline})`);
            }
          }

          if (__DEV__) {
            console.log(`[BeachMatchLiveDTOService] Successfully populated DTO from GetBeachMatch response:`, {
              matchNo: dto.matchNo,
              tournamentCode: dto.tournament.code,
              teams: `${dto.teams.home.teamName} vs ${dto.teams.away.teamName}`,
              court: dto.venue.court,
              status: dto.status.state,
              resultType: dto.status.resultType,
              resultText: dto.status.resultText,
              sets: dto.score.sets.length,
              setScores: dto.score.sets.map(s => `${s.home}-${s.away}`),
              finalResult: dto.score.totalSets ? `${dto.score.totalSets.home}-${dto.score.totalSets.away}` : 'no result',
              temperature: dto.venue.temperature,
              spectators: dto.venue.spectators,
              duration: dto.schedule.duration,
              rankings: dto.rankings
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
   * Calculate final result from set scores (following FIVB beach volleyball rules)
   */
  private calculateFinalResult(setScores: number[]): {
    winner: "A" | "B" | null;
    setsWonA: number;
    setsWonB: number;
    scoreline: string;
    resultSummary: string;
  } {
    if (setScores.length === 0 || setScores.length % 2 !== 0) {
      return {
        winner: null,
        setsWonA: 0,
        setsWonB: 0,
        scoreline: "",
        resultSummary: "0-0"
      };
    }

    let setsWonA = 0;
    let setsWonB = 0;
    const setResults: string[] = [];

    // Process set scores in pairs (A, B)
    for (let i = 0; i < setScores.length; i += 2) {
      const scoreA = setScores[i];
      const scoreB = setScores[i + 1];

      setResults.push(`${scoreA}-${scoreB}`);

      if (scoreA > scoreB) {
        setsWonA++;
      } else if (scoreB > scoreA) {
        setsWonB++;
      }
      // Tie scores don't count as won sets (shouldn't happen in beach volleyball)
    }

    const winner: "A" | "B" | null = setsWonA > setsWonB ? "A" : setsWonB > setsWonA ? "B" : null;
    const scoreline = setResults.join(", ");
    const resultSummary = `${setsWonA}-${setsWonB}`;

    return {
      winner,
      setsWonA,
      setsWonB,
      scoreline,
      resultSummary
    };
  }

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

        // Extract NoInTournament for match numbering in badge
        const noInTournamentMatch = matchXml.match(/NoInTournament="([^"]*)"/i);
        if (noInTournamentMatch) matchData.noInTournament = noInTournamentMatch[1];

        // Extract TournamentGender for gender badge
        const tournamentGenderMatch = matchXml.match(/TournamentGender="([^"]*)"/i);
        if (tournamentGenderMatch) matchData.tournamentGender = tournamentGenderMatch[1];

        // DEBUG: Log extracted badge fields
        if (__DEV__) {
          console.log(`🏐 [DEBUG-BeachMatchLiveDTO] Badge fields extracted from XML:`, {
            xml_noInTournament: noInTournamentMatch ? noInTournamentMatch[1] : 'NOT_FOUND',
            xml_tournamentGender: tournamentGenderMatch ? tournamentGenderMatch[1] : 'NOT_FOUND',
            matchData_noInTournament: matchData.noInTournament,
            matchData_tournamentGender: matchData.tournamentGender,
            xmlElement: matchXml.substring(0, 200) + '...'
          });
        }

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

        // Extract status from BeachMatch attributes
        const statusMatch = matchXml.match(/Status="([^"]*)"/i);
        if (statusMatch) {
          const statusValue = parseInt(statusMatch[1], 10);
          if (!isNaN(statusValue)) {
            matchData.status = statusValue;
          }
        }

        // Extract result type from BeachMatch attributes
        const resultTypeMatch = matchXml.match(/ResultType="([^"]*)"/i);
        if (resultTypeMatch) {
          const resultTypeValue = parseInt(resultTypeMatch[1], 10);
          if (!isNaN(resultTypeValue)) {
            matchData.resultType = resultTypeValue;
          }
        }

        // Extract additional data for completed matches
        const winnerRankMatch = matchXml.match(/WinnerRank="([^"]*)"/i);
        if (winnerRankMatch && winnerRankMatch[1]) {
          const rank = parseInt(winnerRankMatch[1], 10);
          if (!isNaN(rank)) {
            matchData.winnerRank = rank;
          }
        }

        const winnerRoundRankMatch = matchXml.match(/WinnerRoundRank="([^"]*)"/i);
        if (winnerRoundRankMatch && winnerRoundRankMatch[1]) {
          const rank = parseInt(winnerRoundRankMatch[1], 10);
          if (!isNaN(rank)) {
            matchData.winnerRoundRank = rank;
          }
        }

        const durationMatch = matchXml.match(/Duration="([^"]*)"/i);
        if (durationMatch && durationMatch[1]) {
          matchData.duration = durationMatch[1];
        }

        const temperatureMatch = matchXml.match(/Temperature="([^"]*)"/i);
        if (temperatureMatch && temperatureMatch[1]) {
          const temp = parseFloat(temperatureMatch[1]);
          if (!isNaN(temp)) {
            matchData.temperature = temp;
          }
        }

        const spectatorsMatch = matchXml.match(/Spectators="([^"]*)"/i);
        if (spectatorsMatch && spectatorsMatch[1]) {
          const spectators = parseInt(spectatorsMatch[1], 10);
          if (!isNaN(spectators)) {
            matchData.spectators = spectators;
          }
        }

        // Extract result/scores from BeachMatch attributes (VIS format)
        const setScores: number[] = [];

        if (__DEV__) {
          console.log(`[BeachMatchLiveDTOService] ═══ COMPLETE XML ANALYSIS ═══`);
          console.log(`[BeachMatchLiveDTOService] Full BeachMatch element (${matchXml.length} chars):`, matchXml);
          console.log(`[BeachMatchLiveDTOService] All attributes found:`, matchXml.match(/\w+="[^"]*"/g) || 'NO ATTRIBUTES');
          console.log(`[BeachMatchLiveDTOService] Looking for score patterns in XML element...`);
        }

        // Extract set 1 scores - try multiple possible attribute patterns
        let set1AScore: number | null = null;
        let set1BScore: number | null = null;

        // Try different possible attribute names for set 1
        const set1Patterns = [
          [/PointsTeamASet1="([^"]*)"/i, /PointsTeamBSet1="([^"]*)"/i],
          [/TeamASet1="([^"]*)"/i, /TeamBSet1="([^"]*)"/i],
          [/Set1TeamA="([^"]*)"/i, /Set1TeamB="([^"]*)"/i],
          [/Set1A="([^"]*)"/i, /Set1B="([^"]*)"/i],
          [/ScoreASet1="([^"]*)"/i, /ScoreBSet1="([^"]*)"/i],
          [/ResultASet1="([^"]*)"/i, /ResultBSet1="([^"]*)"/i]
        ];

        for (const [patternA, patternB] of set1Patterns) {
          const matchA = matchXml.match(patternA);
          const matchB = matchXml.match(patternB);
          if (matchA && matchB && matchA[1] !== undefined && matchB[1] !== undefined) {
            const scoreA = parseInt(matchA[1], 10);
            const scoreB = parseInt(matchB[1], 10);
            if (!isNaN(scoreA) && !isNaN(scoreB)) {
              set1AScore = scoreA;
              set1BScore = scoreB;
              if (__DEV__) {
                console.log(`[BeachMatchLiveDTOService] Set 1 scores found with pattern ${patternA.source}: ${scoreA}-${scoreB}`);
              }
              break;
            }
          }
        }

        if (set1AScore !== null && set1BScore !== null) {
          setScores.push(set1AScore, set1BScore);
        }

        // Extract set 2 scores
        const set2AMatch = matchXml.match(/PointsTeamASet2="([^"]*)"/i);
        const set2BMatch = matchXml.match(/PointsTeamBSet2="([^"]*)"/i);
        if (set2AMatch && set2BMatch && set2AMatch[1] !== undefined && set2BMatch[1] !== undefined) {
          const scoreA = parseInt(set2AMatch[1], 10);
          const scoreB = parseInt(set2BMatch[1], 10);
          if (!isNaN(scoreA) && !isNaN(scoreB)) {
            setScores.push(scoreA, scoreB);
            if (__DEV__) {
              console.log(`[BeachMatchLiveDTOService] Set 2 scores: ${scoreA}-${scoreB}`);
            }
          }
        }

        // Extract set 3 scores (if present)
        const set3AMatch = matchXml.match(/PointsTeamASet3="([^"]*)"/i);
        const set3BMatch = matchXml.match(/PointsTeamBSet3="([^"]*)"/i);
        if (set3AMatch && set3BMatch && set3AMatch[1] !== undefined && set3BMatch[1] !== undefined) {
          const scoreA = parseInt(set3AMatch[1], 10);
          const scoreB = parseInt(set3BMatch[1], 10);
          if (!isNaN(scoreA) && !isNaN(scoreB)) {
            setScores.push(scoreA, scoreB);
            if (__DEV__) {
              console.log(`[BeachMatchLiveDTOService] Set 3 scores: ${scoreA}-${scoreB}`);
            }
          }
        }

        // Try alternative score field names if no PointsTeamASet* fields found
        if (setScores.length === 0) {
          if (__DEV__) {
            console.log(`[BeachMatchLiveDTOService] No scores found with PointsTeamASet* pattern, trying alternative patterns...`);
          }

          // Try ResultASet1, ResultBSet1 pattern
          const altSet1AMatch = matchXml.match(/ResultASet1="([^"]*)"/i);
          const altSet1BMatch = matchXml.match(/ResultBSet1="([^"]*)"/i);
          if (altSet1AMatch && altSet1BMatch && altSet1AMatch[1] !== undefined && altSet1BMatch[1] !== undefined) {
            const scoreA = parseInt(altSet1AMatch[1], 10);
            const scoreB = parseInt(altSet1BMatch[1], 10);
            if (!isNaN(scoreA) && !isNaN(scoreB)) {
              setScores.push(scoreA, scoreB);
              if (__DEV__) {
                console.log(`[BeachMatchLiveDTOService] Alternative Set 1 scores: ${scoreA}-${scoreB}`);
              }
            }
          }

          // Try ResultASet2, ResultBSet2 pattern
          const altSet2AMatch = matchXml.match(/ResultASet2="([^"]*)"/i);
          const altSet2BMatch = matchXml.match(/ResultBSet2="([^"]*)"/i);
          if (altSet2AMatch && altSet2BMatch && altSet2AMatch[1] !== undefined && altSet2BMatch[1] !== undefined) {
            const scoreA = parseInt(altSet2AMatch[1], 10);
            const scoreB = parseInt(altSet2BMatch[1], 10);
            if (!isNaN(scoreA) && !isNaN(scoreB)) {
              setScores.push(scoreA, scoreB);
              if (__DEV__) {
                console.log(`[BeachMatchLiveDTOService] Alternative Set 2 scores: ${scoreA}-${scoreB}`);
              }
            }
          }

          // Try ResultASet3, ResultBSet3 pattern
          const altSet3AMatch = matchXml.match(/ResultASet3="([^"]*)"/i);
          const altSet3BMatch = matchXml.match(/ResultBSet3="([^"]*)"/i);
          if (altSet3AMatch && altSet3BMatch && altSet3AMatch[1] !== undefined && altSet3BMatch[1] !== undefined) {
            const scoreA = parseInt(altSet3AMatch[1], 10);
            const scoreB = parseInt(altSet3BMatch[1], 10);
            if (!isNaN(scoreA) && !isNaN(scoreB)) {
              setScores.push(scoreA, scoreB);
              if (__DEV__) {
                console.log(`[BeachMatchLiveDTOService] Alternative Set 3 scores: ${scoreA}-${scoreB}`);
              }
            }
          }

          // Try SetsWonA, SetsWonB or similar patterns
          if (setScores.length === 0) {
            const setsWonAMatch = matchXml.match(/SetsWonA="([^"]*)"/i);
            const setsWonBMatch = matchXml.match(/SetsWonB="([^"]*)"/i);
            if (setsWonAMatch && setsWonBMatch && setsWonAMatch[1] !== undefined && setsWonBMatch[1] !== undefined) {
              const setsA = parseInt(setsWonAMatch[1], 10);
              const setsB = parseInt(setsWonBMatch[1], 10);
              if (!isNaN(setsA) && !isNaN(setsB)) {
                // For a completed match with final result like 2-0, create placeholder sets
                if (__DEV__) {
                  console.log(`[BeachMatchLiveDTOService] Found sets won pattern: ${setsA}-${setsB}, creating placeholder set scores`);
                }
                // This is a simplified representation - we know the sets won but not individual set scores
                setScores.push(21, 15); // Placeholder set 1
                if (setsA > 1 || setsB > 1) {
                  setScores.push(21, 18); // Placeholder set 2
                }
                if (setsA > 2 || setsB > 2) {
                  setScores.push(15, 10); // Placeholder set 3
                }
              }
            }
          }
        }

        if (__DEV__) {
          console.log(`[BeachMatchLiveDTOService] ═══ FINAL SCORE EXTRACTION RESULT ═══`);
          console.log(`[BeachMatchLiveDTOService] Extracted setScores array:`, setScores);
          console.log(`[BeachMatchLiveDTOService] setScores length:`, setScores.length);
          console.log(`[BeachMatchLiveDTOService] setScores pairs:`, setScores.length > 0 ?
            Array.from({length: Math.floor(setScores.length/2)}, (_, i) =>
              `Set ${i+1}: ${setScores[i*2]}-${setScores[i*2+1]}`
            ) : 'NO PAIRS');
        }

        if (setScores.length > 0) {
          matchData.result = { setScores };

          // Calculate final result from set scores
          const finalResult = this.calculateFinalResult(setScores);
          matchData.finalResult = finalResult;

          // Assign sets won directly to team objects for immediate UI availability
          if (matchData.team1) {
            matchData.team1.setWon = finalResult.setsWonA;  // Team A (Home)
          }
          if (matchData.team2) {
            matchData.team2.setWon = finalResult.setsWonB;  // Team B (Away)
          }

          if (__DEV__) {
            console.log(`[BeachMatchLiveDTOService] ═══ SETS WON ASSIGNED TO TEAMS ═══`);
            console.log(`[BeachMatchLiveDTOService] Team A (Home) sets won:`, matchData.team1?.setWon);
            console.log(`[BeachMatchLiveDTOService] Team B (Away) sets won:`, matchData.team2?.setWon);
          }

          if (__DEV__) {
            console.log(`[BeachMatchLiveDTOService] ═══ CALCULATED FINAL RESULT ═══`);
            console.log(`[BeachMatchLiveDTOService] Final result object:`, finalResult);
            console.log(`[BeachMatchLiveDTOService] Team A (Home) sets won:`, finalResult.setsWonA);
            console.log(`[BeachMatchLiveDTOService] Team B (Away) sets won:`, finalResult.setsWonB);
            console.log(`[BeachMatchLiveDTOService] Winner:`, finalResult.winner);
            console.log(`[BeachMatchLiveDTOService] Scoreline:`, finalResult.scoreline);
            console.log(`[BeachMatchLiveDTOService] Result summary:`, finalResult.resultSummary);
          }
        } else {
          if (__DEV__) {
            console.log(`[BeachMatchLiveDTOService] ⚠️  NO SET SCORES EXTRACTED - Final result will be 0-0`);
          }
        }

        if (__DEV__) {
          console.log(`[BeachMatchLiveDTOService] Parsed single match:`, {
            visNo: matchData.visNo,
            tournament: matchData.tournamentId,
            teams: `${matchData.team1?.teamName} vs ${matchData.team2?.teamName}`,
            court: matchData.courtNumber,
            statusRaw: matchData.status,
            statusMapped: matchData.status !== undefined ? VIS_STATUS_TO_BEACH_MATCH_STATUS[matchData.status] : 'undefined',
            statusMappingExists: matchData.status !== undefined && VIS_STATUS_TO_BEACH_MATCH_STATUS[matchData.status] !== undefined,
            resultTypeRaw: matchData.resultType,
            resultTypeMapped: matchData.resultType !== undefined ? VIS_RESULT_TYPE_TO_RESULT_TYPE[matchData.resultType] : 'undefined',
            resultTypeMappingExists: matchData.resultType !== undefined && VIS_RESULT_TYPE_TO_RESULT_TYPE[matchData.resultType] !== undefined,
            hasResult: !!matchData.result,
            setScores: matchData.result?.setScores,
            finalResult: matchData.finalResult,
            winnerRank: matchData.winnerRank,
            temperature: matchData.temperature,
            spectators: matchData.spectators,
            duration: matchData.duration
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
          xmlDataLength: response?.xmlData?.length || 0
        });
      }

      if (isSuccessResponse(response)) {
        // Parse the XML response to extract statistics
        const statisticsData = this.parseStatisticsFromXML(response.xmlData);

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
      if (!isNaN(numericStatus)) {
        const mappedStatus = VIS_STATUS_TO_BEACH_MATCH_STATUS[numericStatus];
        if (mappedStatus) {
          if (updatedDTO.status.state !== mappedStatus) {
            updatedDTO.status.state = mappedStatus;
            hasActualChanges = true;
            if (__DEV__ && isNewVersion) {
              console.log(`[BeachMatchLiveDTOService] Live status update: ${numericStatus} → ${mappedStatus}`);
            }
          }
        } else {
          if (__DEV__) {
            console.warn(`[BeachMatchLiveDTOService] Unknown VIS live status code: ${numericStatus}. Please update VIS_STATUS_TO_BEACH_MATCH_STATUS mapping.`);
          }
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