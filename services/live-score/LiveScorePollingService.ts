/**
 * @fileoverview LiveScorePollingService for version-based live score polling
 * Implements AC2: Version-Based Polling Service from Story 1.1
 * Part of EPIC-001 Live Score Display - Story 1.1
 */

import { IVisApiClient, GetBeachLiveRequest, isSuccessResponse } from '../../types/api-v2';
import { BeachLive, isValidBeachLive, isNoChangesResponse, extractVersion, extractPollDelay } from '../../types/beach-live';
import { ConnectionCircuitBreaker } from '../ConnectionCircuitBreaker';
import { CacheService } from '../CacheService';

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
}

/**
 * Live score polling service with version-based bandwidth optimization
 * Implements circuit breaker integration and proper lifecycle management
 */
export class LiveScorePollingService {
  private readonly visApiClient: IVisApiClient;
  private readonly circuitBreaker: ConnectionCircuitBreaker;
  private readonly pollingConfigs: Map<number, PollingConfig> = new Map();
  
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
    circuitBreaker: ConnectionCircuitBreaker
  ) {
    this.visApiClient = visApiClient;
    this.circuitBreaker = circuitBreaker;
  }
  
  /**
   * Start polling for live score updates for a specific match
   * @param matchNo - Match number to poll
   * @param callback - Function to call with updates
   * @param options - Optional data filtering options
   */
  startPolling(
    matchNo: number, 
    callback: LiveScoreCallback, 
    options?: string[]
  ): void {
    // Stop any existing polling for this match
    this.stopPolling(matchNo);
    
    // Create new polling configuration
    const config: PollingConfig = {
      matchNo,
      callback,
      options,
      pollDelayMs: LiveScorePollingService.DEFAULT_POLL_DELAY_MS,
      isActive: true
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
      
      // Make API request
      const response = await this.visApiClient.getBeachLive(request);
      
      if (isSuccessResponse(response)) {
        // Parse XML response to JSON
        const liveData = this.parseBeachLiveResponse(response.xmlData);
        
        if (isNoChangesResponse(liveData)) {
          // No changes since last version - bandwidth saved!
          this.bandwidthSaved++;
          this.successfulPolls++;
          
          // Update poll delay from server if provided
          const pollDelay = extractPollDelay(liveData);
          config.pollDelayMs = this.clampPollDelay(pollDelay);
          
        } else if (isValidBeachLive(liveData)) {
          // Valid new data received
          this.successfulPolls++;
          
          // Update version for next poll
          const newVersion = extractVersion(liveData);
          if (newVersion !== undefined) {
            config.version = newVersion;
          }
          
          // Update poll delay from server
          config.pollDelayMs = this.clampPollDelay(liveData.pollDelay);
          
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
   * @returns Parsed BeachLive object
   */
  private parseBeachLiveResponse(xmlData: string): any {
    try {
      // Check for NoChanges response first
      if (xmlData.includes('<NoChanges>true</NoChanges>') || xmlData.includes('NoChanges="true"')) {
        return { noChanges: true };
      }

      // Extract main BeachLive data using regex patterns similar to VisResponseParser
      const version = this.extractXmlValue(xmlData, 'Version');
      const pollDelay = this.extractXmlValue(xmlData, 'PollDelay');
      
      // Extract match information
      const matchNo = this.extractXmlValue(xmlData, 'MatchNo') || this.extractXmlAttribute(xmlData, 'MatchNo');
      const matchStatus = this.extractXmlValue(xmlData, 'MatchStatus') || this.extractXmlAttribute(xmlData, 'Status');
      const matchDateTime = this.extractXmlValue(xmlData, 'DateTime') || this.extractXmlAttribute(xmlData, 'DateTime');
      
      // Extract court information
      const courtNo = this.extractXmlValue(xmlData, 'CourtNo') || this.extractXmlAttribute(xmlData, 'CourtNo');
      const courtName = this.extractXmlValue(xmlData, 'CourtName') || this.extractXmlAttribute(xmlData, 'CourtName');
      
      // Extract game state
      const isBallInPlay = this.extractXmlValue(xmlData, 'BallInPlay') === 'true';
      const noServingTeam = parseInt(this.extractXmlValue(xmlData, 'ServingTeam') || '0') || undefined;
      const noServingPlayer = parseInt(this.extractXmlValue(xmlData, 'ServingPlayer') || '0') || undefined;
      
      // Extract team information
      const teamAName = this.extractXmlValue(xmlData, 'TeamAName') || this.extractXmlAttribute(xmlData, 'TeamAName');
      const teamBName = this.extractXmlValue(xmlData, 'TeamBName') || this.extractXmlAttribute(xmlData, 'TeamBName');
      const teamACode = this.extractXmlValue(xmlData, 'TeamACode') || this.extractXmlAttribute(xmlData, 'TeamACode');
      const teamBCode = this.extractXmlValue(xmlData, 'TeamBCode') || this.extractXmlAttribute(xmlData, 'TeamBCode');
      
      // Extract set scores - look for Set elements
      const sets: any[] = [];
      const setMatches = xmlData.match(/<Set[^>]*>[\s\S]*?<\/Set>/g);
      if (setMatches) {
        setMatches.forEach((setXml, index) => {
          const setNo = parseInt(this.extractXmlAttribute(setXml, 'No') || (index + 1).toString());
          const pointsA = parseInt(this.extractXmlAttribute(setXml, 'PointsA') || '0');
          const pointsB = parseInt(this.extractXmlAttribute(setXml, 'PointsB') || '0');
          const setStatus = this.extractXmlAttribute(setXml, 'Status') || 'NotStarted';
          
          sets.push({
            no: setNo,
            pointsTeamA: pointsA,
            pointsTeamB: pointsB,
            status: setStatus
          });
        });
      }
      
      // Extract tournament information
      const tournamentNo = this.extractXmlValue(xmlData, 'TournamentNo') || this.extractXmlAttribute(xmlData, 'TournamentNo');
      const tournamentName = this.extractXmlValue(xmlData, 'TournamentName') || this.extractXmlAttribute(xmlData, 'TournamentName');
      
      // Build BeachLive object structure
      return {
        version: parseInt(version || '1'),
        pollDelay: parseInt(pollDelay || '5000'),
        isBallInPlay,
        isMatchPointTeamA: this.extractXmlValue(xmlData, 'MatchPointA') === 'true',
        isMatchPointTeamB: this.extractXmlValue(xmlData, 'MatchPointB') === 'true',
        isSetPointTeamA: this.extractXmlValue(xmlData, 'SetPointA') === 'true',
        isSetPointTeamB: this.extractXmlValue(xmlData, 'SetPointB') === 'true',
        noServingTeam,
        noServingPlayer,
        noTeamAtLeft: 1, // Default positioning
        noTeamAtRight: 2,
        match: {
          no: parseInt(matchNo || '0'),
          noInTournament: 1,
          status: matchStatus || 'InProgress',
          dateTime: matchDateTime || new Date().toISOString(),
          court: {
            no: parseInt(courtNo || '1'),
            name: courtName || `Court ${courtNo || '1'}`,
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
          players: [], // Would be populated from player data if available
          matchPoints: 0,
          isServing: noServingTeam === 1,
          timeoutsRemaining: parseInt(this.extractXmlValue(xmlData, 'TeamATimeouts') || '1')
        },
        teamB: {
          no: 2,
          name: teamBName || 'Team B',
          federationCode: teamBCode || '',
          players: [], // Would be populated from player data if available
          matchPoints: 0,
          isServing: noServingTeam === 2,
          timeoutsRemaining: parseInt(this.extractXmlValue(xmlData, 'TeamBTimeouts') || '1')
        },
        tournament: {
          no: parseInt(tournamentNo || '1'),
          name: tournamentName || 'Live Tournament',
          code: this.extractXmlValue(xmlData, 'TournamentCode') || '',
          city: this.extractXmlValue(xmlData, 'City') || '',
          country: this.extractXmlValue(xmlData, 'Country') || '',
          federation: this.extractXmlValue(xmlData, 'Federation') || 'FIVB'
        }
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
    return match ? match[1].trim() : undefined;
  }

  /**
   * Extract XML attribute value from tag attributes (following VisResponseParser pattern)
   */
  private extractXmlAttribute(xml: string, attributeName: string): string | undefined {
    const regex = new RegExp(`${attributeName}\\s*=\\s*"([^"]*)"`, 'i');
    const match = xml.match(regex);
    return match ? match[1].trim() : undefined;
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
   * Clean up all resources on service destruction
   */
  destroy(): void {
    this.stopAllPolling();
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