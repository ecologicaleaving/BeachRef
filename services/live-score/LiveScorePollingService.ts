/**
 * @fileoverview LiveScorePollingService for version-based live score polling
 * Implements AC2: Version-Based Polling Service from Story 1.1
 * Part of EPIC-001 Live Score Display - Story 1.1
 */

import { IVisApiClient, GetBeachLiveRequest, isSuccessResponse, MatchPollingStatus, FieldSelectionMode, VisApiEndpoint } from '../../types/api-v2';
import { BeachLive, BeachLiveSet, BeachSetStatus, isValidBeachLive, isNoChangesResponse, extractVersion, extractPollDelay } from '../../types/beach-live';
import { ConnectionCircuitBreaker } from '../ConnectionCircuitBreaker';
import { CacheServiceCompatibility as CacheService } from '../../hooks/compatibility/CacheServiceCompatibility';
import { MatchStatusPollingManager, matchStatusPollingManager } from '../MatchStatusPollingManager';
import { pollingPerformanceMonitor } from '../PollingPerformanceMonitor';
interface ParsedAttributeMap {
  raw: Record<string, string>;
  aliases: Record<string, string>;
}

const ATTRIBUTE_ALIAS_DEFINITIONS: Record<string, string[]> = {
  PointsTeamA: ['PointsTeamA', 'PointsA', 'TeamAPoints', 'ScoreTeamA', 'Team1Points'],
  PointsTeamB: ['PointsTeamB', 'PointsB', 'TeamBPoints', 'ScoreTeamB', 'Team2Points'],
  Status: ['Status', 'SetStatus'],
  No: ['No', 'SetNo', 'Number'],
  Duration: ['Duration', 'DurationSeconds', 'SetDuration', 'DurationSec'],
  BeginTimeOffset: ['BeginTimeOffset', 'StartOffset', 'BeginOffset', 'BeginTime'],
  NbTimeoutTeamA: ['NbTimeoutTeamA', 'TimeoutsTeamA', 'TeamATimeouts'],
  NbTimeoutTeamB: ['NbTimeoutTeamB', 'TimeoutsTeamB', 'TeamBTimeouts'],
  NbChallengeRequestedTeamA: ['NbChallengeRequestedTeamA', 'ChallengesTeamA', 'NbChallengesTeamA', 'ChallengesRequestedTeamA'],
  NbChallengeRequestedTeamB: ['NbChallengeRequestedTeamB', 'ChallengesTeamB', 'NbChallengesTeamB', 'ChallengesRequestedTeamB'],
  NbChallengeUsedTeamA: ['NbChallengeUsedTeamA', 'ChallengesUsedTeamA'],
  NbChallengeUsedTeamB: ['NbChallengeUsedTeamB', 'ChallengesUsedTeamB'],
  PointsRallyTeamA: ['PointsRallyTeamA', 'RallyPointsTeamA', 'PointsTeamARally'],
  PointsRallyTeamB: ['PointsRallyTeamB', 'RallyPointsTeamB', 'PointsTeamBRally'],
  MatchNo: ['MatchNo', 'MatchNumber'],
  MatchStatus: ['MatchStatus', 'Status'],
  DateTime: ['DateTime', 'MatchDateTime'],
  CourtNo: ['CourtNo', 'CourtNumber'],
  CourtName: ['CourtName', 'Court'],
  TeamAName: ['TeamAName', 'Team1Name'],
  TeamBName: ['TeamBName', 'Team2Name'],
  TeamACode: ['TeamACode', 'Team1Code'],
  TeamBCode: ['TeamBCode', 'Team2Code'],
  TournamentNo: ['TournamentNo', 'EventNo'],
  TournamentName: ['TournamentName', 'EventName'],
  MatchPointTeamA: ['MatchPointTeamA', 'MatchPointA'],
  MatchPointTeamB: ['MatchPointTeamB', 'MatchPointB'],
  SetPointTeamA: ['SetPointTeamA', 'SetPointA'],
  SetPointTeamB: ['SetPointTeamB', 'SetPointB'],
  BallInPlay: ['BallInPlay'],
  ServingTeam: ['ServingTeam', 'NoServingTeam'],
  ServingPlayer: ['ServingPlayer', 'NoServingPlayer'],
  TeamATimeouts: ['TeamATimeouts', 'TimeoutsTeamA'],
  TeamBTimeouts: ['TeamBTimeouts', 'TimeoutsTeamB'],
  PollDelay: ['PollDelay', 'PollingDelay'],
  Version: ['Version']
};

const ATTRIBUTE_ALIAS_TO_CANONICAL: Record<string, string> = {};
const ATTRIBUTE_CANONICAL_TO_ALIASES: Record<string, string[]> = {};

Object.entries(ATTRIBUTE_ALIAS_DEFINITIONS).forEach(([canonical, names]) => {
  const canonicalLower = canonical.toLowerCase();
  const uniqueAliases = new Set<string>();
  uniqueAliases.add(canonicalLower);
  names.forEach(name => uniqueAliases.add(name.toLowerCase()));
  ATTRIBUTE_CANONICAL_TO_ALIASES[canonicalLower] = Array.from(uniqueAliases);
  uniqueAliases.forEach(name => {
    ATTRIBUTE_ALIAS_TO_CANONICAL[name] = canonicalLower;
  });
});

/**
 * Callback function type for live score updates
 */
export type LiveScoreCallback = (data: BeachLive, error?: Error) => void;

/**
 * Polling configuration for a match
 */
interface PollingConfig {
  /** Match number being polled */
  matchNo: number;
  /** Current version number for bandwidth optimization */
  version?: number;
  /** Callback function for updates */
  callback: LiveScoreCallback;
  /** Polling interval timer */
  interval?: NodeJS.Timeout;
  /** Current polling delay in milliseconds */
  pollDelayMs: number;
  /** Options for data filtering */
  options?: string[];
  /** Whether polling is currently active */
  isActive: boolean;
  /** Whether adaptive polling is enabled for this match */
  useAdaptivePolling: boolean;
  /** Field selection mode for bandwidth optimization */
  fieldSelectionMode: FieldSelectionMode;
}

/**
 * Live score polling service with version-based bandwidth optimization
 * Implements circuit breaker integration and proper lifecycle management
 */
export class LiveScorePollingService {
  private readonly visApiClient: IVisApiClient;
  private readonly circuitBreaker: ConnectionCircuitBreaker;
  private readonly pollingConfigs: Map<number, PollingConfig> = new Map();
  private readonly statusPollingManager: MatchStatusPollingManager;
  
  // Performance monitoring
  private totalPolls = 0;
  private successfulPolls = 0;
  private bandwidthSaved = 0;
  
  // Default configuration
  private static readonly DEFAULT_POLL_DELAY_MS = 5000; // 5 seconds
  private static readonly MIN_POLL_DELAY_MS = 1000; // 1 second minimum
  private static readonly MAX_POLL_DELAY_MS = 30000; // 30 seconds maximum
  
  constructor(
    visApiClient: IVisApiClient,
    circuitBreaker: ConnectionCircuitBreaker,
    statusPollingManager: MatchStatusPollingManager = matchStatusPollingManager
  ) {
    this.visApiClient = visApiClient;
    this.circuitBreaker = circuitBreaker;
    this.statusPollingManager = statusPollingManager;
    
    // Listen for status changes to adjust polling
    this.statusPollingManager.addStatusChangeListener(this.onMatchStatusChange.bind(this));
  }
  
  /**
   * Start polling for live score updates for a specific match
   * @param matchNo - Match number to poll
   * @param callback - Function to call with updates
   * @param options - Optional data filtering options
   * @param useAdaptivePolling - Enable adaptive polling based on match status
   */
  startPolling(
    matchNo: number, 
    callback: LiveScoreCallback, 
    options?: string[],
    useAdaptivePolling: boolean = false
  ): void {
    // Stop any existing polling for this match
    this.stopPolling(matchNo);
    
    // Determine initial polling configuration
    let initialPollDelayMs = LiveScorePollingService.DEFAULT_POLL_DELAY_MS;
    let fieldSelectionMode = FieldSelectionMode.FULL;
    
    if (useAdaptivePolling) {
      // Get adaptive configuration from status manager
      initialPollDelayMs = this.statusPollingManager.getPollingInterval(matchNo);
      fieldSelectionMode = this.statusPollingManager.getFieldSelectionMode(matchNo);

      // Don't start polling for finished matches
      if (!this.statusPollingManager.shouldPoll(matchNo)) {
        return;
      }
    }
    
    // Create new polling configuration
    const config: PollingConfig = {
      matchNo,
      callback,
      options,
      pollDelayMs: initialPollDelayMs,
      isActive: true,
      useAdaptivePolling,
      fieldSelectionMode
    };
    
    this.pollingConfigs.set(matchNo, config);
    
    // Start immediate first poll
    this.performPoll(config);
  }
  
  /**
   * Stop polling for a specific match
   * @param matchNo - Match number to stop polling
   */
  stopPolling(matchNo: number): void {
    const config = this.pollingConfigs.get(matchNo);
    if (config) {
      config.isActive = false;
      if (config.interval) {
        clearTimeout(config.interval);
      }
      this.pollingConfigs.delete(matchNo);
    }
  }
  
  /**
   * Stop all active polling
   */
  stopAllPolling(): void {
    const matchNumbers = Array.from(this.pollingConfigs.keys());
    matchNumbers.forEach(matchNo => this.stopPolling(matchNo));
  }
  
  /**
   * Update version number for a match to optimize bandwidth usage
   * @param matchNo - Match number
   * @param version - New version number
   */
  updateVersion(matchNo: number, version: number): void {
    const config = this.pollingConfigs.get(matchNo);
    if (config) {
      config.version = version;
    }
  }

  /**
   * Update match status for adaptive polling
   * @param matchNo - Match number
   * @param status - New match status
   */
  updateMatchStatus(matchNo: number, status: MatchPollingStatus): void {
    const config = this.pollingConfigs.get(matchNo);
    if (config && config.useAdaptivePolling) {
      this.statusPollingManager.updateMatchStatus(matchNo, status);
    }
  }

  /**
   * Handle match status changes for adaptive polling
   * @param matchNo - Match number
   * @param oldStatus - Previous status
   * @param newStatus - New status
   */
  private onMatchStatusChange(matchNo: number, oldStatus: MatchPollingStatus, newStatus: MatchPollingStatus): void {
    const config = this.pollingConfigs.get(matchNo);
    if (!config || !config.useAdaptivePolling) {
      return;
    }

    // Get new polling configuration
    const newConfig = this.statusPollingManager.getPollingConfig(newStatus);
    
    // Record interval change for performance monitoring
    pollingPerformanceMonitor.recordIntervalChange(
      matchNo,
      config.pollDelayMs,
      newConfig.intervalMs,
      newStatus
    );
    
    // If match is now finished, stop polling
    if (!newConfig.shouldPoll) {
      this.stopPolling(matchNo);
      return;
    }
    
    // Update polling interval and field selection
    config.pollDelayMs = newConfig.intervalMs;
    config.fieldSelectionMode = newConfig.fieldSelectionMode;
    
    // Restart polling with new interval if currently active
    if (config.isActive && config.interval) {
      clearTimeout(config.interval);
      config.interval = setTimeout(
        () => this.performPoll(config),
        config.pollDelayMs
      );
    }
  }
  
  /**
   * Check if currently polling a specific match
   * @param matchNo - Match number to check
   * @returns True if actively polling
   */
  isPolling(matchNo: number): boolean {
    const config = this.pollingConfigs.get(matchNo);
    return config ? config.isActive : false;
  }
  
  /**
   * Get cached live score data for a match
   * @param matchNo - Match number
   * @returns Cached live score data or null
   */
  getCachedLiveScore(matchNo: number): BeachLive | null {
    return CacheService.getLiveScore(matchNo);
  }
  
  /**
   * Get current polling statistics
   * @returns Polling performance metrics
   */
  getStatistics() {
    return {
      totalPolls: this.totalPolls,
      successfulPolls: this.successfulPolls,
      failureRate: this.totalPolls > 0 ? 1 - (this.successfulPolls / this.totalPolls) : 0,
      bandwidthSavedPercent: this.totalPolls > 0 ? (this.bandwidthSaved / this.totalPolls) * 100 : 0,
      activePolls: this.pollingConfigs.size,
      circuitBreakerState: this.circuitBreaker.getState()
    };
  }
  
  /**
   * Get comprehensive adaptive polling performance metrics
   * @param timeRangeMs - Time range for metrics (default: 1 hour)
   * @returns Comprehensive performance metrics
   */
  getAdaptivePollingMetrics(timeRangeMs: number = 60 * 60 * 1000) {
    return pollingPerformanceMonitor.getMetrics(timeRangeMs);
  }
  
  /**
   * Get performance summary for quick overview
   * @param timeRangeMs - Time range for summary (default: 1 hour)
   * @returns Performance summary
   */
  getPerformanceSummary(timeRangeMs: number = 60 * 60 * 1000) {
    return pollingPerformanceMonitor.getPerformanceSummary(timeRangeMs);
  }
  
  /**
   * Perform a single poll for a match configuration
   * @param config - Polling configuration
   */
  private async performPoll(config: PollingConfig): Promise<void> {
    if (!config.isActive) {
      return;
    }
    
    this.totalPolls++;
    
    try {
      // Check circuit breaker before making request
      if (!this.circuitBreaker.canExecute()) {
        throw new Error('Circuit breaker is open - API calls suspended');
      }
      
      // Build request with version for bandwidth optimization
      const request: GetBeachLiveRequest = {
        matchNo: config.matchNo,
        version: config.version,
        options: config.options
      };
      
      // Record request for performance monitoring
      const requestStartTime = Date.now();
      
      // Make API request
      const response = await this.visApiClient.getBeachLive(request);
      
      const requestDuration = Date.now() - requestStartTime;
      
      if (isSuccessResponse(response)) {
        // Parse XML response to JSON
        const liveData = this.parseBeachLiveResponse(response.xmlData, config.version);
        
        if (isNoChangesResponse(liveData)) {
          // No changes since last version - bandwidth saved!
          this.bandwidthSaved++;
          this.successfulPolls++;
          
          // Record request saved for performance monitoring
          pollingPerformanceMonitor.recordRequest({
            matchNo: config.matchNo,
            endpoint: VisApiEndpoint.GET_BEACH_LIVE,
            status: this.statusPollingManager.getMatchStatus(config.matchNo),
            fieldSelectionMode: config.fieldSelectionMode,
            intervalMs: config.pollDelayMs,
            responseSizeBytes: response.xmlData?.length || 0,
            requestSaved: true
          });
          
          // Update poll delay from server if provided (only if NOT using adaptive polling)
          const pollDelay = extractPollDelay(liveData);
          const clampedDelay = this.clampPollDelay(pollDelay);

          if (!config.useAdaptivePolling) {
            config.pollDelayMs = clampedDelay;
          }
          // If using adaptive polling, keep the status-based interval
          
        } else if (isValidBeachLive(liveData)) {
          // Valid new data received
          this.successfulPolls++;
          
          // Record successful request for performance monitoring
          pollingPerformanceMonitor.recordRequest({
            matchNo: config.matchNo,
            endpoint: VisApiEndpoint.GET_BEACH_LIVE,
            status: this.statusPollingManager.getMatchStatus(config.matchNo),
            fieldSelectionMode: config.fieldSelectionMode,
            intervalMs: config.pollDelayMs,
            responseSizeBytes: response.xmlData?.length || 0,
            requestSaved: false
          });
          
          // Update version for next poll
          const newVersion = extractVersion(liveData);
          if (newVersion !== undefined) {
            config.version = newVersion;
          }
          
          // Update poll delay from server (only if NOT using adaptive polling)
          const serverPollDelay = liveData.pollDelay;
          const clampedDelay = this.clampPollDelay(serverPollDelay);

          // IMPORTANT: Only use server poll delay if NOT using adaptive polling
          if (!config.useAdaptivePolling) {
            config.pollDelayMs = clampedDelay;
          }
          // If using adaptive polling, keep the status-based interval
          
          // Update match status if adaptive polling enabled
          if (config.useAdaptivePolling && liveData.match) {
            // Check for numeric rawStatus first (VIS API standard), then string status
            const matchData = liveData.match as any;
            const rawStatus = matchData.rawStatus;
            const status = matchData.status;

            if (rawStatus !== undefined || status) {
              this.updateMatchStatusFromResponse(config.matchNo, status, rawStatus);
            }
          }
          
          // Cache the live score data with shorter TTL
          CacheService.setLiveScore(config.matchNo, liveData);
          
          // Call callback with new data
          config.callback(liveData);
          
        } else {
          throw new Error('Invalid BeachLive response format');
        }
        
        // Record successful call in circuit breaker
        this.circuitBreaker.onSuccess();
        
      } else {
        // API returned error response
        throw new Error(`API Error: ${response.error} (${response.errorCode})`);
      }
      
    } catch (error) {
      // Record failure in circuit breaker
      this.circuitBreaker.onFailure();
      
      // Call callback with error
      const errorObj = error instanceof Error ? error : new Error(String(error));
      config.callback(null as any, errorObj);
      
      // Increase poll delay on error (exponential backoff)
      config.pollDelayMs = Math.min(
        config.pollDelayMs * 1.5,
        LiveScorePollingService.MAX_POLL_DELAY_MS
      );
    }
    
    // Schedule next poll if still active
    if (config.isActive) {
      config.interval = setTimeout(
        () => this.performPoll(config),
        config.pollDelayMs
      );
    }
  }
  
  /**
   * Parse BeachLive XML response to JSON object
   * @param xmlData - Raw XML response
   * @param currentVersion - Current version to preserve for NoChanges responses
   * @returns Parsed BeachLive object
   */
  private parseBeachLiveResponse(xmlData: string, currentVersion?: number): any {
    try {
      if (xmlData.includes('<NoChanges>true</NoChanges>') || xmlData.includes('NoChanges=""true""') || xmlData.includes('<NoChanges />')) {
        return { noChanges: true, version: currentVersion };
      }

      const globalAttributes = this.extractXmlAttributes(xmlData);
      const attr = (name: string) => this.getAttributeValue(globalAttributes, name);

      const versionValue = this.extractXmlValue(xmlData, 'Version') || attr('Version');
      const pollDelayValue = this.extractXmlValue(xmlData, 'PollDelay') || attr('PollDelay');
      const versionNumber = this.parseOptionalInt(versionValue) ?? 1;

      // VIS API sends PollDelay in SECONDS, convert to milliseconds
      const pollDelaySeconds = this.parseOptionalInt(pollDelayValue);
      const pollDelayMs = pollDelaySeconds ? pollDelaySeconds * 1000 : LiveScorePollingService.DEFAULT_POLL_DELAY_MS;


      const matchNoValue = this.extractXmlValue(xmlData, 'MatchNo') || attr('MatchNo');
      const matchNo = this.parseOptionalInt(matchNoValue) ?? 0;
      const matchStatusValue = this.extractXmlValue(xmlData, 'MatchStatus') || attr('MatchStatus') || attr('Status');
      const matchStatus = matchStatusValue || 'InProgress';

      // Extract numeric status code for accurate status detection (VIS API codes: 1=Scheduled, 3-8=RUNNING, 9+=FINISHED)
      const rawStatusValue = this.extractXmlValue(xmlData, 'Status') || attr('Status');
      const rawStatus = this.parseOptionalInt(rawStatusValue);

      const matchDateTime = this.extractXmlValue(xmlData, 'DateTime') || attr('DateTime');

      const courtNoValue = this.extractXmlValue(xmlData, 'CourtNo') || attr('CourtNo');
      const courtNo = this.parseOptionalInt(courtNoValue) ?? 1;
      const courtNameValue = this.extractXmlValue(xmlData, 'CourtName') || attr('CourtName');
      const courtName = courtNameValue || `Court ${courtNo}`;

      const isBallInPlay = this.parseXmlBoolean(this.extractXmlValue(xmlData, 'BallInPlay') || attr('BallInPlay'));
      const noServingTeam = this.parseOptionalInt(this.extractXmlValue(xmlData, 'ServingTeam') || attr('ServingTeam')) ?? 0;
      const noServingPlayer = this.parseOptionalInt(this.extractXmlValue(xmlData, 'ServingPlayer') || attr('ServingPlayer')) ?? 0;

      const teamAName = this.extractXmlValue(xmlData, 'TeamAName') || attr('TeamAName');
      const teamBName = this.extractXmlValue(xmlData, 'TeamBName') || attr('TeamBName');
      const teamACode = this.extractXmlValue(xmlData, 'TeamACode') || attr('TeamACode');
      const teamBCode = this.extractXmlValue(xmlData, 'TeamBCode') || attr('TeamBCode');

      const setMatches = xmlData.match(/<Set\b[^>]*?(?:\/>|>[\s\S]*?<\/Set>)/gi);
      const sets: BeachLiveSet[] = [];
      const rawSetAttributes: Record<number, Record<string, string>> = {};

      if (setMatches) {
        setMatches.forEach((setXml, index) => {
          const attributeMap = this.parseTagAttributes(setXml);
          const setNo = this.parseOptionalInt(this.getAttributeValue(attributeMap, 'No')) ?? index + 1;
          const pointsTeamA = this.parseOptionalInt(
            this.getAttributeValue(attributeMap, 'PointsTeamA') ||
            this.getAttributeValue(attributeMap, 'PointsA')
          ) ?? 0;
          const pointsTeamB = this.parseOptionalInt(
            this.getAttributeValue(attributeMap, 'PointsTeamB') ||
            this.getAttributeValue(attributeMap, 'PointsB')
          ) ?? 0;
          const setStatusValue = this.getAttributeValue(attributeMap, 'Status');
          // If no explicit status, infer from scores (beach volleyball rules)
          const setStatus = this.normalizeSetStatus(setStatusValue, pointsTeamA, pointsTeamB);

          const durationSeconds = this.parseOptionalInt(this.getAttributeValue(attributeMap, 'Duration'));
          const beginTimeOffsetSeconds = this.parseOptionalInt(this.getAttributeValue(attributeMap, 'BeginTimeOffset'));
          const nbTimeoutTeamA = this.parseOptionalInt(this.getAttributeValue(attributeMap, 'NbTimeoutTeamA'));
          const nbTimeoutTeamB = this.parseOptionalInt(this.getAttributeValue(attributeMap, 'NbTimeoutTeamB'));
          const nbChallengeRequestedTeamA = this.parseOptionalInt(this.getAttributeValue(attributeMap, 'NbChallengeRequestedTeamA'));
          const nbChallengeRequestedTeamB = this.parseOptionalInt(this.getAttributeValue(attributeMap, 'NbChallengeRequestedTeamB'));
          const nbChallengeUsedTeamA = this.parseOptionalInt(
            this.getAttributeValue(attributeMap, 'NbChallengeUsedTeamA') ||
            this.getAttributeValue(attributeMap, 'ChallengesTeamAUsed')
          );
          const nbChallengeUsedTeamB = this.parseOptionalInt(
            this.getAttributeValue(attributeMap, 'NbChallengeUsedTeamB') ||
            this.getAttributeValue(attributeMap, 'ChallengesTeamBUsed')
          );
          const pointsRallyTeamA = this.parseOptionalInt(this.getAttributeValue(attributeMap, 'PointsRallyTeamA'));
          const pointsRallyTeamB = this.parseOptionalInt(this.getAttributeValue(attributeMap, 'PointsRallyTeamB'));
          const durationMinutes = durationSeconds !== undefined ? Math.floor(durationSeconds / 60) : undefined;

          const setData: BeachLiveSet = {
            no: setNo,
            pointsTeamA,
            pointsTeamB,
            status: setStatus,
            durationMinutes,
            durationSeconds,
            beginTimeOffsetSeconds,
            nbTimeoutTeamA,
            nbTimeoutTeamB,
            nbChallengeRequestedTeamA,
            nbChallengeRequestedTeamB,
            nbChallengeUsedTeamA,
            nbChallengeUsedTeamB,
            pointsRallyTeamA,
            pointsRallyTeamB,
            rawAttributes: attributeMap.raw
          };

          sets.push(setData);
          rawSetAttributes[setNo] = attributeMap.raw;
        });
      }

      const tournamentNoValue = this.extractXmlValue(xmlData, 'TournamentNo') || attr('TournamentNo');
      const tournamentNo = this.parseOptionalInt(tournamentNoValue) ?? 1;
      const tournamentNameValue = this.extractXmlValue(xmlData, 'TournamentName') || attr('TournamentName');
      const tournamentName = tournamentNameValue || 'Live Tournament';

      const teamATimeouts = this.parseOptionalInt(this.extractXmlValue(xmlData, 'TeamATimeouts') || attr('TeamATimeouts')) ?? 1;
      const teamBTimeouts = this.parseOptionalInt(this.extractXmlValue(xmlData, 'TeamBTimeouts') || attr('TeamBTimeouts')) ?? 1;

      if (sets.length === 0) {
        const fallbackSets: BeachLiveSet[] = [];
        for (let setIndex = 1; setIndex <= 5; setIndex++) {
          const pointsAKey = `PointsTeamASet${setIndex}`;
          const pointsBKey = `PointsTeamBSet${setIndex}`;
          const statusKey = `SetStatus${setIndex}`;

          const pointsAValue = this.extractXmlValue(xmlData, pointsAKey) || attr(pointsAKey);
          const pointsBValue = this.extractXmlValue(xmlData, pointsBKey) || attr(pointsBKey);
          const pointsA = this.parseOptionalInt(pointsAValue);
          const pointsB = this.parseOptionalInt(pointsBValue);

          if (pointsA !== undefined || pointsB !== undefined) {
            const fallbackSet: BeachLiveSet = {
              no: setIndex,
              pointsTeamA: pointsA ?? 0,
              pointsTeamB: pointsB ?? 0,
              status: this.normalizeSetStatus(attr(statusKey))
            };

            fallbackSets.push(fallbackSet);
            rawSetAttributes[setIndex] = {
              ...(rawSetAttributes[setIndex] || {}),
              [pointsAKey]: pointsAValue ?? '',
              [pointsBKey]: pointsBValue ?? ''
            };
          }
        }

        if (fallbackSets.length > 0) {
          fallbackSets.forEach(fallbackSet => sets.push(fallbackSet));
        }
      }

      const matchPoints = this.computeMatchPoints(sets);

      const telemetry = Object.keys(rawSetAttributes).length > 0 ? { rawSetAttributes } : undefined;

      return {
        version: versionNumber,
        pollDelay: pollDelayMs,
        isBallInPlay,
        isMatchPointTeamA: this.parseXmlBoolean(this.extractXmlValue(xmlData, 'MatchPointA') || attr('MatchPointTeamA')),
        isMatchPointTeamB: this.parseXmlBoolean(this.extractXmlValue(xmlData, 'MatchPointB') || attr('MatchPointTeamB')),
        isSetPointTeamA: this.parseXmlBoolean(this.extractXmlValue(xmlData, 'SetPointA') || attr('SetPointTeamA')),
        isSetPointTeamB: this.parseXmlBoolean(this.extractXmlValue(xmlData, 'SetPointB') || attr('SetPointTeamB')),
        noServingTeam,
        noServingPlayer,
        noTeamAtLeft: 1,
        noTeamAtRight: 2,
        match: {
          no: matchNo,
          noInTournament: 1,
          status: matchStatus,
          rawStatus: rawStatus, // Numeric VIS API status code for accurate state detection
          dateTime: matchDateTime || new Date().toISOString(),
          court: {
            no: courtNo,
            name: courtName,
            surface: 'Sand'
          },
          round: {
            no: 1,
            name: this.extractXmlValue(xmlData, 'RoundName') || 'Pool',
            phase: this.extractXmlValue(xmlData, 'Phase') || 'Pool',
            type: 'Pool'
          }
        },
        sets,
        teamA: {
          no: 1,
          name: teamAName || 'Team A',
          federationCode: teamACode || '',
          players: [],
          matchPoints: matchPoints.teamA,
          isServing: noServingTeam === 1,
          timeoutsRemaining: teamATimeouts
        },
        teamB: {
          no: 2,
          name: teamBName || 'Team B',
          federationCode: teamBCode || '',
          players: [],
          matchPoints: matchPoints.teamB,
          isServing: noServingTeam === 2,
          timeoutsRemaining: teamBTimeouts
        },
        tournament: {
          no: tournamentNo,
          name: tournamentName,
          code: this.extractXmlValue(xmlData, 'TournamentCode') || '',
          city: this.extractXmlValue(xmlData, 'City') || '',
          country: this.extractXmlValue(xmlData, 'Country') || '',
          federation: this.extractXmlValue(xmlData, 'Federation') || 'FIVB'
        },
        telemetry
      };
    } catch (error) {
      throw new Error(`Failed to parse BeachLive XML response: ${error}`);
    }
  }

  /**
   * Extract XML value by tag name (following VisResponseParser pattern)
   */
  private extractXmlValue(xml: string, tagName: string): string | undefined {
    const regex = new RegExp(`<${tagName}[^>]*>([^<]*)<\/${tagName}>`, 'i');
    const match = xml.match(regex);
    return match ? match[1]?.trim() : undefined;
  }

  /**
   * Extract all attributes from XML string for flexible lookup.
   */
  private extractXmlAttributes(xml: string): ParsedAttributeMap {
    const raw: Record<string, string> = {};
    const aliases: Record<string, string> = {};
    const tagRegex = /<[^>]+>/g;
    let match: RegExpExecArray | null;

    while ((match = tagRegex.exec(xml)) !== null) {
      this.populateAttributeMaps(match[0], raw, aliases);
    }

    return { raw, aliases };
  }

  /**
   * Parse attributes from a single XML tag fragment.
   */
  private parseTagAttributes(xmlFragment: string): ParsedAttributeMap {
    const raw: Record<string, string> = {};
    const aliases: Record<string, string> = {};
    const tagMatch = xmlFragment.match(/<[^>]+>/);

    if (tagMatch) {
      this.populateAttributeMaps(tagMatch[0], raw, aliases);
    }

    return { raw, aliases };
  }

  /**
   * Populate raw and alias maps with attributes from a tag string.
   */
  private populateAttributeMaps(tag: string, raw: Record<string, string>, aliases: Record<string, string>): void {
    const attributeSection = tag.replace(/^<[^ \t\r\n>]+/, '').replace(/\/?>$/, '');
    const attributePattern = /([A-Za-z_][\w:.-]*)(?:\s*=\s*("([^"]*)"|'([^']*)'|([^\s"'>]+)))?/g;

    let attributeMatch: RegExpExecArray | null;

    while ((attributeMatch = attributePattern.exec(attributeSection)) !== null) {
      const name = attributeMatch[1];
      const value = (attributeMatch[3] ?? attributeMatch[4] ?? attributeMatch[5] ?? '').trim();
      const lowerName = (name ?? '').toLowerCase();
      const canonical = ATTRIBUTE_ALIAS_TO_CANONICAL[lowerName] || lowerName;
      const aliasNames = ATTRIBUTE_CANONICAL_TO_ALIASES[canonical] || [canonical];

      if (!(name in raw)) {
        raw[name] = value;
      }

      aliasNames.forEach(aliasName => {
        if (!(aliasName in aliases)) {
          aliases[aliasName] = value;
        }
      });
    }
  }

  /**
   * Retrieve an attribute value using literal or aliased names.
   */
  private getAttributeValue(attributes: ParsedAttributeMap, attributeName: string): string | undefined {
    if (!attributeName) {
      return undefined;
    }

    const lowerName = attributeName.toLowerCase();

    if (attributes.raw[attributeName] !== undefined) {
      return attributes.raw[attributeName];
    }

    if (attributes.aliases[lowerName] !== undefined) {
      return attributes.aliases[lowerName];
    }

    const canonical = ATTRIBUTE_ALIAS_TO_CANONICAL[lowerName];
    if (canonical && attributes.aliases[canonical] !== undefined) {
      return attributes.aliases[canonical];
    }

    return undefined;
  }

  /**
   * Parse optional integer values safely.
   */
  private parseOptionalInt(value?: string | null): number | undefined {
    if (value === undefined || value === null || value === '') {
      return undefined;
    }

    const parsed = parseInt(value, 10);
    return Number.isNaN(parsed) ? undefined : parsed;
  }

  /**
   * Parse VIS boolean strings.
   */
  private parseXmlBoolean(value?: string | null): boolean {
    if (!value) {
      return false;
    }

    return value.trim().toLowerCase() === 'true';
  }

  /**
   * Normalise VIS set status values into BeachSetStatus enum.
   * If status is not provided, infers from scores using beach volleyball rules
   */
  private normalizeSetStatus(value?: string | null, pointsTeamA?: number, pointsTeamB?: number): BeachSetStatus {
    // First try to parse explicit status value if provided
    if (value && value.trim()) {
      const normalized = value.trim().toLowerCase();

      // Handle numeric status codes from VIS API
      if (/^\d+$/.test(normalized)) {
        const statusCode = parseInt(normalized, 10);

        // VIS status codes mapping based on observed behavior:
        // 0 = Not Started
        // 1-4 = In Progress (different states within a set)
        // 5 = Finished (set is complete)
        // 6+ = Other states (treat as finished for safety)

        if (statusCode === 0) {
          return BeachSetStatus.NOT_STARTED;
        } else if (statusCode >= 1 && statusCode <= 4) {
          return BeachSetStatus.IN_PROGRESS;
        } else if (statusCode >= 5) {
          return BeachSetStatus.FINISHED;
        }
      }

      // Handle string status values
      if (['inprogress', 'running', 'live', 'playing'].includes(normalized)) {
        return BeachSetStatus.IN_PROGRESS;
      }

      if (['finished', 'complete', 'completed', 'ended', 'closed'].includes(normalized)) {
        return BeachSetStatus.FINISHED;
      }
    }

    // If no explicit status provided, infer from scores using beach volleyball rules
    if (pointsTeamA !== undefined && pointsTeamB !== undefined) {
      const maxScore = Math.max(pointsTeamA, pointsTeamB);
      const minScore = Math.min(pointsTeamA, pointsTeamB);

      // No scores = not started
      if (maxScore === 0 && minScore === 0) {
        return BeachSetStatus.NOT_STARTED;
      }

      // Beach volleyball set winning conditions:
      // - First to 21 points with at least 2-point lead (sets 1-2)
      // - First to 15 points with at least 2-point lead (set 3/deciding set)
      // For simplicity, check 21-point rule first since we don't know set number here

      // Set is finished if someone reached 21+ with 2+ point lead
      if (maxScore >= 21 && (maxScore - minScore) >= 2) {
        return BeachSetStatus.FINISHED;
      }

      // Set is finished if score is very high (e.g., 30-28 in deuce situation)
      if (maxScore >= 25) {
        return BeachSetStatus.FINISHED;
      }

      // If we have scores but set isn't finished, it's in progress
      if (maxScore > 0) {
        return BeachSetStatus.IN_PROGRESS;
      }
    }

    // Fallback to NOT_STARTED
    return BeachSetStatus.NOT_STARTED;
  }

  /**
   * Determine if a set should count toward match points.
   */
  private isSetComplete(set: Pick<BeachLiveSet, 'no' | 'pointsTeamA' | 'pointsTeamB' | 'status'>): boolean {
    if (set.status === BeachSetStatus.FINISHED) {
      return true;
    }

    const maxPoints = Math.max(set.pointsTeamA, set.pointsTeamB);
    const minPoints = Math.min(set.pointsTeamA, set.pointsTeamB);

    if (maxPoints === 0 && minPoints === 0) {
      return false;
    }

    const threshold = set.no >= 3 ? 15 : 21;

    if (maxPoints < threshold) {
      return false;
    }

    return maxPoints - minPoints >= 2;
  }

  /**
   * Compute match points for each team based on completed sets.
   */
  private computeMatchPoints(sets: BeachLiveSet[]): { teamA: number; teamB: number } {
    let teamA = 0;
    let teamB = 0;

    sets.forEach(set => {
      if (!this.isSetComplete(set)) {
        return;
      }

      if (set.pointsTeamA > set.pointsTeamB) {
        teamA++;
      } else if (set.pointsTeamB > set.pointsTeamA) {
        teamB++;
      }
    });

    return { teamA, teamB };
  }
  
  /**
   * Clamp poll delay within acceptable bounds
   * @param delay - Suggested delay in milliseconds
   * @returns Clamped delay value
   */
  private clampPollDelay(delay: number): number {
    return Math.max(
      LiveScorePollingService.MIN_POLL_DELAY_MS,
      Math.min(delay, LiveScorePollingService.MAX_POLL_DELAY_MS)
    );
  }
  
  /**
   * Update match status from API response
   * @param matchNo - Match number
   * @param responseStatus - Status from API response (string or number)
   * @param rawStatus - Optional numeric status code (VIS API codes: 1=Scheduled, 3-8=RUNNING, 9+=FINISHED)
   */
  private updateMatchStatusFromResponse(matchNo: number, responseStatus: string | number, rawStatus?: number): void {
    let pollingStatus: MatchPollingStatus;

    // First check numeric rawStatus if provided (VIS API standard)
    if (typeof rawStatus === 'number') {
      if (rawStatus >= 9) {
        pollingStatus = MatchPollingStatus.FINISHED;
      } else if (rawStatus >= 3 && rawStatus <= 8) {
        pollingStatus = MatchPollingStatus.RUNNING;
      } else if (rawStatus >= 1 && rawStatus <= 2) {
        pollingStatus = MatchPollingStatus.SCHEDULED;
      } else {
        pollingStatus = MatchPollingStatus.SCHEDULED; // Default fallback
      }

      this.statusPollingManager.updateMatchStatus(matchNo, pollingStatus);
      return;
    }

    // Fallback: check if responseStatus is numeric
    if (typeof responseStatus === 'number') {
      if (responseStatus >= 9) {
        pollingStatus = MatchPollingStatus.FINISHED;
      } else if (responseStatus >= 3 && responseStatus <= 8) {
        pollingStatus = MatchPollingStatus.RUNNING;
      } else {
        pollingStatus = MatchPollingStatus.SCHEDULED;
      }

      this.statusPollingManager.updateMatchStatus(matchNo, pollingStatus);
      return;
    }

    // Fallback: Map string status to polling status
    switch (responseStatus.toLowerCase()) {
      case 'inprogress':
      case 'running':
      case 'live':
        pollingStatus = MatchPollingStatus.RUNNING;
        break;
      case 'scheduled':
      case 'upcoming':
      case 'notstarted':
        pollingStatus = MatchPollingStatus.SCHEDULED;
        break;
      case 'finished':
      case 'completed':
      case 'ended':
      case 'closed':
        pollingStatus = MatchPollingStatus.FINISHED;
        break;
      default:
        pollingStatus = MatchPollingStatus.SCHEDULED; // Default fallback
    }

    this.statusPollingManager.updateMatchStatus(matchNo, pollingStatus);
  }

  /**
   * Clean up all resources on service destruction
   */
  destroy(): void {
    this.stopAllPolling();
    this.statusPollingManager.removeStatusChangeListener(this.onMatchStatusChange.bind(this));
  }
}

/**
 * Factory function to create LiveScorePollingService instance
 * @param visApiClient - VIS API client instance
 * @param circuitBreaker - Circuit breaker for resilience
 * @returns Configured polling service
 */
export function createLiveScorePollingService(
  visApiClient: IVisApiClient,
  circuitBreaker: ConnectionCircuitBreaker
): LiveScorePollingService {
  return new LiveScorePollingService(visApiClient, circuitBreaker);
}

/**
 * Default export for service
 */
export default LiveScorePollingService;










