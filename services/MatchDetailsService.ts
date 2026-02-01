/**
 * @fileoverview Match Details Service implementing step-by-step DTO population
 *
 * Implements the procedural workflow for BeachMatchDTO and BeachMatchLiveDTO:
 * Step 1: Bootstrap with GetBeachMatch (stable metadata)
 * Step 2: Live polling with GetBeachMatchStatus (lightweight live data)
 * Step 3: Optional play-by-play with GetBeachLive (if available)
 * Step 4: Proper lifecycle management (closure and official results)
 *
 * Based on VIS Web Service documentation and fivbvis community patterns
 */

import {
  BeachMatchDTO,
  BeachMatchLiveDTO,
  BeachMatchBootstrapParams,
  _BeachMatchPollingParams,
  _BeachMatchLiveFeedParams,
  BeachMatchPollingConfig,
  BEACH_MATCH_POLLING_INTERVALS,
  getPollingInterval,
  shouldPoll,
  isValidBeachMatchDTO,
  isValidBeachMatchLiveDTO,
  _extractClosedSets,
  mergePollingData
} from '../types/match-details-dto';

import { IVisApiClient, GetBeachMatchRequest, GetBeachMatchStatusRequest, GetBeachLiveRequest, isSuccessResponse } from '../types/api-v2';
import { ConnectionCircuitBreaker } from './ConnectionCircuitBreaker';
import { CacheServiceCompatibility as CacheService } from '../hooks/compatibility/CacheServiceCompatibility';

/**
 * Callback types for different stages of match details updates
 */
export type MatchDetailsBootstrapCallback = (dto: BeachMatchDTO, error?: Error) => void;
export type MatchDetailsLiveCallback = (liveDto: BeachMatchLiveDTO, error?: Error) => void;
export type MatchDetailsPlayByPlayCallback = (events: BeachMatchLiveDTO['liveFeed'], error?: Error) => void;

/**
 * Match Details Service configuration
 */
interface MatchDetailsConfig {
  matchNo: number;
  baseDto?: BeachMatchDTO;
  liveDto?: BeachMatchLiveDTO;

  // Callbacks
  onBootstrap?: MatchDetailsBootstrapCallback;
  onLiveUpdate?: MatchDetailsLiveCallback;
  onPlayByPlay?: MatchDetailsPlayByPlayCallback;

  // Polling state
  isPollingActive: boolean;
  pollingInterval?: NodeJS.Timeout;
  pollingConfig?: BeachMatchPollingConfig;
  lastPollingUpdate?: string;

  // Play-by-play state
  playByPlayEnabled: boolean;
  lastSequenceNumber?: number;
}

/**
 * Service for managing Match Details page data through VIS API integration
 * Implements the complete procedural workflow for BeachMatchDTO and BeachMatchLiveDTO
 */
export class MatchDetailsService {
  private readonly visApiClient: IVisApiClient;
  private readonly circuitBreaker: ConnectionCircuitBreaker;
  private readonly matchConfigs: Map<number, MatchDetailsConfig> = new Map();

  // Performance metrics
  private bootstrapCalls = 0;
  private successfulBootstraps = 0;
  private pollingCalls = 0;
  private successfulPolls = 0;
  private playByPlayCalls = 0;
  private successfulPlayByPlay = 0;

  constructor(
    visApiClient: IVisApiClient,
    circuitBreaker: ConnectionCircuitBreaker
  ) {
    this.visApiClient = visApiClient;
    this.circuitBreaker = circuitBreaker;
  }

  /**
   * Step 1: Bootstrap match metadata (one-time or rare updates)
   * Source: GetBeachMatch(No=<matchId>)
   * Populates BeachMatchDTO with stable data: teams, venue, format, closed sets
   */
  async bootstrapMatch(
    params: BeachMatchBootstrapParams,
    callback?: MatchDetailsBootstrapCallback
  ): Promise<BeachMatchDTO | null> {
    this.bootstrapCalls++;

    try {
      // Check circuit breaker
      if (!this.circuitBreaker.canExecute()) {
        throw new Error('Circuit breaker is open - API calls suspended');
      }

      // Check cache first (usando i metodi esistenti del cache service)
      const cachedData = CacheService.getMatches(params.matchNo.toString());
      if (cachedData?.data) {
        // Se abbiamo dati cached, non facciamo nulla qui - procediamo con l'API call
      }

      // Build GetBeachMatch request
      const request: GetBeachMatchRequest = {
        matchNo: params.matchNo,
        includeTournamentContext: params.includeTournamentTimezone || false
      };

      // Make API call
      const response = await this.visApiClient.getBeachMatch(request);

      if (isSuccessResponse(response)) {
        // Parse response to BeachMatchDTO
        const dto = this.parseGetBeachMatchResponse(response.xmlData || '');

        if (isValidBeachMatchDTO(dto)) {
          this.successfulBootstraps++;

          // Cache using existing service methods
          // CacheService non ha setMatchDetails, usiamo una cache temporanea

          // Update or create match configuration
          let config = this.matchConfigs.get(params.matchNo);
          if (!config) {
            config = {
              matchNo: params.matchNo,
              isPollingActive: false,
              playByPlayEnabled: false
            };
            this.matchConfigs.set(params.matchNo, config);
          }
          config.baseDto = dto;

          if (callback) callback(dto);
          this.circuitBreaker.onSuccess();
          return dto;
        } else {
          throw new Error('Invalid BeachMatchDTO response format');
        }
      } else {
        throw new Error(`API Error: ${response.error} (${response.errorCode})`);
      }

    } catch (error) {
      this.circuitBreaker.onFailure();
      const errorObj = error instanceof Error ? error : new Error(String(error));
      if (callback) callback(null as any, errorObj);
      return null;
    }
  }

  /**
   * Step 2: Start live polling loop (lightweight live data)
   * Source: GetBeachMatchStatus(No=<matchId>)
   * Updates BeachMatchLiveDTO with status, current set score, timeouts
   */
  startLivePolling(
    matchNo: number,
    callback: MatchDetailsLiveCallback,
    enablePlayByPlay: boolean = false
  ): void {
    // Stop any existing polling
    this.stopLivePolling(matchNo);

    let config = this.matchConfigs.get(matchNo);
    if (!config) {
      // If no base DTO, bootstrap first
      this.bootstrapMatch({ matchNo }, (dto, error) => {
        if (!error && dto) {
          this.startLivePolling(matchNo, callback, enablePlayByPlay);
        } else {
          callback(null as any, error);
        }
      });
      return;
    }

    // Don't start polling if match shouldn't be polled
    if (!shouldPoll(config.baseDto?.status || '')) {
      return;
    }

    // Configure polling parameters
    config.isPollingActive = true;
    config.onLiveUpdate = callback;
    config.playByPlayEnabled = enablePlayByPlay;

    // Determine initial polling interval based on status
    const currentStatus = config.baseDto?.status || '';
    const pollingInterval = getPollingInterval(currentStatus);
    config.pollingConfig = {
      interval: pollingInterval,
      maxRetries: 3,
      backoffMultiplier: 1.5
    };

    // Start immediate first poll
    this.performLivePoll(config);
  }

  /**
   * Stop live polling for a specific match
   */
  stopLivePolling(matchNo: number): void {
    const config = this.matchConfigs.get(matchNo);
    if (config) {
      config.isPollingActive = false;
      if (config.pollingInterval) {
        clearTimeout(config.pollingInterval);
        config.pollingInterval = undefined;
      }
    }
  }

  /**
   * Step 3: Enable/disable play-by-play updates (optional)
   * Source: BeachLive element from "Beach Live_xsd" schema
   * Updates BeachMatchLiveDTO.liveFeed with event timeline
   */
  setPlayByPlayEnabled(matchNo: number, enabled: boolean): void {
    const config = this.matchConfigs.get(matchNo);
    if (config) {
      config.playByPlayEnabled = enabled;
      config.lastSequenceNumber = undefined; // Reset sequence tracking
    }
  }

  /**
   * Get current combined match data (base DTO + live DTO)
   */
  getCurrentMatchData(matchNo: number): (BeachMatchDTO & { live?: BeachMatchLiveDTO }) | null {
    const config = this.matchConfigs.get(matchNo);
    if (!config || !config.baseDto) return null;

    if (config.liveDto) {
      return mergePollingData(config.baseDto, config.liveDto);
    } else {
      return config.baseDto;
    }
  }

  /**
   * Step 4: Handle match closure and official results
   * Transitions to reduced polling frequency and final data updates
   */
  handleMatchClosure(matchNo: number): void {
    const config = this.matchConfigs.get(matchNo);
    if (!config) return;

    const currentStatus = config.liveDto?.status || config.baseDto?.status || '';

    if (currentStatus.toLowerCase().includes('finished')) {
      // Reduce polling frequency for finished matches
      if (config.pollingConfig) {
        config.pollingConfig.interval = BEACH_MATCH_POLLING_INTERVALS.FINISHED;
      }
    } else if (currentStatus.toLowerCase().includes('official')) {
      // Minimal polling for official results
      if (config.pollingConfig) {
        config.pollingConfig.interval = BEACH_MATCH_POLLING_INTERVALS.OFFICIAL_RESULT;
      }

      // Update base DTO with final official data
      this.bootstrapMatch({ matchNo });
    }
  }

  /**
   * Clean up resources for a specific match
   */
  cleanupMatch(matchNo: number): void {
    this.stopLivePolling(matchNo);
    this.matchConfigs.delete(matchNo);
  }

  /**
   * Clean up all resources
   */
  cleanup(): void {
    const matchNumbers = Array.from(this.matchConfigs.keys());
    matchNumbers.forEach(matchNo => this.cleanupMatch(matchNo));
  }

  /**
   * Get service performance metrics
   */
  getPerformanceMetrics() {
    return {
      bootstrap: {
        total: this.bootstrapCalls,
        successful: this.successfulBootstraps,
        successRate: this.bootstrapCalls > 0 ? this.successfulBootstraps / this.bootstrapCalls : 0
      },
      polling: {
        total: this.pollingCalls,
        successful: this.successfulPolls,
        successRate: this.pollingCalls > 0 ? this.successfulPolls / this.pollingCalls : 0
      },
      playByPlay: {
        total: this.playByPlayCalls,
        successful: this.successfulPlayByPlay,
        successRate: this.playByPlayCalls > 0 ? this.successfulPlayByPlay / this.playByPlayCalls : 0
      },
      activeMatches: this.matchConfigs.size,
      circuitBreakerState: this.circuitBreaker.getState()
    };
  }

  /**
   * Perform a single live polling request
   */
  private async performLivePoll(config: MatchDetailsConfig): Promise<void> {
    if (!config.isPollingActive) return;

    this.pollingCalls++;

    try {
      // Check circuit breaker
      if (!this.circuitBreaker.canExecute()) {
        throw new Error('Circuit breaker is open - API calls suspended');
      }

      // Build polling request
      const request: GetBeachMatchStatusRequest = {
        matchNo: config.matchNo,
        lastVersion: config.baseDto?.version
      };

      // Make API call
      const response = await this.visApiClient.getBeachMatchStatus(request);

      if (isSuccessResponse(response)) {
        // Parse response to BeachMatchLiveDTO
        const liveDto = this.parseGetBeachMatchStatusResponse(response.xmlData || '');

        if (isValidBeachMatchLiveDTO(liveDto)) {
          this.successfulPolls++;

          // Check if data actually changed
          const hasChanged = this.hasLiveDataChanged(config.liveDto, liveDto);
          if (hasChanged) {
            config.liveDto = liveDto;
            config.lastPollingUpdate = new Date().toISOString();

            // Cache usando il servizio esistente per live score
            CacheService.setLiveScore(config.matchNo, liveDto as any);

            // Call update callback
            if (config.onLiveUpdate) {
              config.onLiveUpdate(liveDto);
            }

            // Handle play-by-play if enabled
            if (config.playByPlayEnabled) {
              this.handlePlayByPlayUpdate(config);
            }

            // Check if match status changed for lifecycle management
            this.handleMatchClosure(config.matchNo);
          }

          this.circuitBreaker.onSuccess();
        } else {
          throw new Error('Invalid BeachMatchLiveDTO response format');
        }
      } else {
        throw new Error(`API Error: ${response.error} (${response.errorCode})`);
      }

    } catch (error) {
      this.circuitBreaker.onFailure();

      // Call callback with error
      if (config.onLiveUpdate) {
        const errorObj = error instanceof Error ? error : new Error(String(error));
        config.onLiveUpdate(null as any, errorObj);
      }

      // Apply exponential backoff
      if (config.pollingConfig) {
        config.pollingConfig.interval = Math.min(
          config.pollingConfig.interval * config.pollingConfig.backoffMultiplier,
          BEACH_MATCH_POLLING_INTERVALS.OFFICIAL_RESULT
        );
      }
    }

    // Schedule next poll if still active
    if (config.isPollingActive && config.pollingConfig) {
      config.pollingInterval = setTimeout(
        () => this.performLivePoll(config),
        config.pollingConfig.interval
      );
    }
  }

  /**
   * Handle play-by-play updates for a match
   */
  private async handlePlayByPlayUpdate(config: MatchDetailsConfig): Promise<void> {
    if (!config.playByPlayEnabled || !config.onPlayByPlay) return;

    this.playByPlayCalls++;

    try {
      const request: GetBeachLiveRequest = {
        matchNo: config.matchNo,
        version: config.lastSequenceNumber
      };

      const response = await this.visApiClient.getBeachLive(request);

      if (isSuccessResponse(response)) {
        const playByPlayData = this.parsePlayByPlayResponse(response.xmlData || '');

        if (playByPlayData && playByPlayData.available) {
          this.successfulPlayByPlay++;

          // Update live DTO with play-by-play data
          if (config.liveDto) {
            config.liveDto.liveFeed = playByPlayData;
          }

          // Update last sequence number
          if (playByPlayData.events && playByPlayData.events.length > 0) {
            const lastEvent = playByPlayData.events[playByPlayData.events.length - 1];
            config?.lastSequenceNumber = lastEvent.rally;
          }

          // Call play-by-play callback
          config.onPlayByPlay(playByPlayData);
        }
      }

    } catch (error) {
      // Play-by-play failures are non-critical - don't stop main polling
      if (config.onPlayByPlay) {
        const errorObj = error instanceof Error ? error : new Error(String(error));
        config.onPlayByPlay(null as any, errorObj);
      }
    }
  }

  /**
   * Check if live data has actually changed
   */
  private hasLiveDataChanged(oldDto: BeachMatchLiveDTO | undefined, newDto: BeachMatchLiveDTO): boolean {
    if (!oldDto) return true;

    return (
      oldDto.status !== newDto.status ||
      oldDto.currentSet !== newDto.currentSet ||
      oldDto.points.a !== newDto.points.a ||
      oldDto.points.b !== newDto.points.b ||
      oldDto.teamServing !== newDto.teamServing ||
      oldDto.lastUpdate !== newDto.lastUpdate
    );
  }

  /**
   * Parse GetBeachMatch response to BeachMatchDTO
   */
  private parseGetBeachMatchResponse(data: any): BeachMatchDTO {
    // Implementation would parse VIS API response to BeachMatchDTO format
    // Following the mapping specified in the DTO comments

    return {
      no: data.No || 0,
      tournamentNo: data.NoTournament,
      roundCode: data.RoundCode,
      roundName: data.RoundName,
      roundPhase: data.RoundPhase,
      bracket: data.RoundBracket,
      status: data.Status || '',
      resultType: data.ResultType,

      beginDateTimeUtc: data.BeginDateTimeUtc,
      endDateTimeUtc: data.EndDateTimeUtc,
      localDate: data.LocalDate,
      localTime: data.LocalTime,
      localTimeOffset: data.LocalTimeOffset,
      timeZone: data.TimeZone,

      court: data.Court,
      venue: data.Venue,
      city: data.City,

      teamA: {
        no: data.NoTeamA,
        name: data.TeamAName,
        federation: data.TeamAFederationCode,
        players: {
          a1: data.NoPlayerA1,
          a2: data.NoPlayerA2
        }
      },
      teamB: {
        no: data.NoTeamB,
        name: data.TeamBName,
        federation: data.TeamBFederationCode,
        players: {
          b1: data.NoPlayerB1,
          b2: data.NoPlayerB2
        }
      },

      referees: data.referees ? {
        first: { no: data.NoReferee1, name: data.Referee1Name, federation: data.Referee1FederationCode },
        second: { no: data.NoReferee2, name: data.Referee2Name, federation: data.Referee2FederationCode },
        challenge: data.ChallengeReferee ? { no: data.NoChallengeReferee, name: data.ChallengeRefereeName } : null
      } : undefined,

      sets: this.parseSetsFromMatchData(data),
      setsResultsText: data.SetsResultsText,

      format: data.Format,
      liveStreamUri: data.LiveStreamUri,
      acquisitionMethod: data.AcquisitionMethod,
      tournamentType: data.TournamentType,
      tournamentGender: data.TournamentGender,
      version: data.Version || 1
    };
  }

  /**
   * Parse GetBeachMatchStatus response to BeachMatchLiveDTO
   */
  private parseGetBeachMatchStatusResponse(data: any): BeachMatchLiveDTO {
    return {
      status: data.Status || '',
      currentSet: data.CurrentSet,
      points: {
        a: data.PointsA !== undefined ? data.PointsA : null,
        b: data.PointsB !== undefined ? data.PointsB : null
      },
      teamServing: data.ServingTeam === 'A' ? 'A' : data.ServingTeam === 'B' ? 'B' : null,
      timeouts: {
        a: data.TimeoutsA || 0,
        b: data.TimeoutsB || 0,
        technical: data.TechnicalTimeout || false
      },
      lastUpdate: data.LastUpdate || new Date().toISOString(),
      closedSets: this.parseClosedSetsFromStatusData(data)
    };
  }

  /**
   * Parse play-by-play response
   */
  private parsePlayByPlayResponse(data: any): BeachMatchLiveDTO['liveFeed'] | null {
    if (!data || !data.events) {
      return { available: false };
    }

    return {
      available: true,
      events: data.events.map((event: any) => ({
        set: event.SetNumber || 1,
        rally: event.RallyNumber,
        ts: event.Timestamp,
        servingTeam: event.ServingTeam === 'A' ? 'A' : event.ServingTeam === 'B' ? 'B' : null,
        action: event.Action,
        detail: event.Detail,
        scoreAfter: {
          a: event.PointsA || 0,
          b: event.PointsB || 0
        }
      }))
    };
  }

  /**
   * Parse sets data from match response
   */
  private parseSetsFromMatchData(data: any): { set: number; a: number; b: number; durationSec?: number }[] {
    const sets: { set: number; a: number; b: number; durationSec?: number }[] = [];

    for (let i = 1; i <= 3; i++) {
      const pointsA = data[`PointsTeamASet${i}`];
      const pointsB = data[`PointsTeamBSet${i}`];
      const duration = data[`DurationSet${i}`];

      if (pointsA !== undefined || pointsB !== undefined) {
        sets.push({
          set: i,
          a: parseInt(pointsA || '0', 10),
          b: parseInt(pointsB || '0', 10),
          durationSec: duration ? parseInt(duration, 10) : undefined
        });
      }
    }

    return sets;
  }

  /**
   * Parse closed sets from status data
   */
  private parseClosedSetsFromStatusData(data: any): { set: number; a: number; b: number }[] {
    return this.parseSetsFromMatchData(data).map(set => ({ set: set.set, a: set.a, b: set.b }));
  }
}

/**
 * Factory function to create MatchDetailsService instance
 */
export function createMatchDetailsService(
  visApiClient: IVisApiClient,
  circuitBreaker: ConnectionCircuitBreaker
): MatchDetailsService {
  return new MatchDetailsService(visApiClient, circuitBreaker);
}

/**
 * Default export
 */
export default MatchDetailsService;