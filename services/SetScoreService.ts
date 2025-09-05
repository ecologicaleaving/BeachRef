/**
 * @fileoverview Set Score Service
 * Retrieves individual set scores for completed matches using GetBeachLive API
 * Enhances match data with detailed set-by-set scores for display
 */

import { BeachMatchCore, MatchResult } from '../types/match-v2';
import { BeachLive, BeachLiveSet, isValidBeachLive } from '../types/beach-live';
import { IVisApiClient, GetBeachLiveRequest } from '../types/api-v2';
import { VisApiClient, DEFAULT_RETRY_CONFIG } from './api/VisApiClient';

/**
 * Enhanced match result with individual set scores and duration data
 */
export interface EnhancedMatchResult extends MatchResult {
  /** Individual set scores populated from GetBeachLive */
  readonly setScores: readonly number[];
  /** Total match duration in seconds */
  readonly totalDurationSeconds?: number;
  /** Individual set durations in seconds */
  readonly setDurations?: readonly number[];
}

/**
 * Enhanced set data with duration and detailed info
 */
export interface EnhancedSetData {
  readonly no: number;
  readonly pointsTeamA: number;
  readonly pointsTeamB: number;
  /** Set duration in seconds */
  readonly durationSeconds: number;
  /** Set duration formatted (e.g., "17m 52s") */
  readonly durationFormatted: string;
  readonly beginTimeOffset?: number;
  readonly nbTimeoutTeamA?: number;
  readonly nbTimeoutTeamB?: number;
  readonly nbChallengeRequestedTeamA?: number;
  readonly nbChallengeRequestedTeamB?: number;
}

/**
 * Enhanced team data from XML
 */
export interface EnhancedTeamData {
  readonly no: string;
  readonly name: string;
  readonly federationCode: string;
  readonly noPlayer1?: string;
  readonly noPlayer2?: string;
  readonly noShirt1?: string;
  readonly noShirt2?: string;
  /** Player names extracted from team name (if available) */
  readonly player1Name?: string;
  readonly player2Name?: string;
}

/**
 * Service for retrieving and managing individual set scores
 * Uses GetBeachLive API to fetch detailed scoring information
 */
export class SetScoreService {
  private visApiClient: IVisApiClient;
  private setScoreCache = new Map<string, number[]>();
  private xmlSourceCache = new Map<string, string>(); // Cache XML source for debugging

  constructor(visApiClient?: IVisApiClient) {
    this.visApiClient = visApiClient || new VisApiClient({
      baseUrl: 'https://www.fivb.org/Vis2009/XmlRequest.asmx',
      timeoutMs: 10000,
      maxRetries: 3,
      retryDelayMs: 1000,
      exponentialBackoff: true,
      enableLogging: true
    }, DEFAULT_RETRY_CONFIG);
  }

  /**
   * Enhance matches with individual set scores
   * Only fetches for matches that have results but are missing set scores
   * 
   * @param matches - Array of matches to enhance
   * @returns Promise resolving to matches with set scores populated
   */
  async enhanceMatchesWithSetScores(matches: BeachMatchCore[]): Promise<BeachMatchCore[]> {
    const enhancedMatches = [...matches];
    const fetchPromises: Promise<void>[] = [];

    // Identify matches that need set scores
    
    const matchesToEnhance = matches.filter(match => {
      // Enhanced condition: fetch for any match with sets OR live matches
      const hasAnySets = match.result && (match.result.team1Sets > 0 || match.result.team2Sets > 0);
      const isLiveMatch = match.status === 'RUNNING' || match.status === 'INTERRUPTED';
      const needsSetScores = !match.result?.setScores || match.result.setScores.length === 0;
      const notCached = !this.setScoreCache.has(match.id);
      
      return (hasAnySets || isLiveMatch) && needsSetScores && notCached;
    });


    // Process ALL completed matches that need enhancement
    const matchesToProcess = matchesToEnhance;
    for (const match of matchesToProcess) {
      const promise = this.fetchAndCacheSetScores(match).then(setScores => {
        if (setScores.length > 0) {
          const matchIndex = enhancedMatches.findIndex(m => m.id === match.id);
          if (matchIndex !== -1 && enhancedMatches[matchIndex].result) {
            // Get enhanced duration and team data
            const xmlSource = this.getXmlSourceForMatch(match.id);
            const enhancedSetData = xmlSource ? this.extractEnhancedSetDataFromXml(xmlSource) : [];
            const enhancedTeamData = xmlSource ? this.extractEnhancedTeamDataFromXml(xmlSource) : [];
            
            // Calculate total duration
            const totalDurationSeconds = enhancedSetData.reduce((total, set) => total + set.durationSeconds, 0);
            const setDurations = enhancedSetData.map(set => set.durationSeconds);
            
            // Create enhanced match with ALL duration AND team fields
            enhancedMatches[matchIndex] = {
              ...enhancedMatches[matchIndex],
              result: {
                ...enhancedMatches[matchIndex].result!,
                setScores,
                totalDurationSeconds,
                setDurations
              },
              // Duration fields (for easy access in UI)
              Duration: totalDurationSeconds.toString(),
              DurationSet1: enhancedSetData[0]?.durationSeconds.toString() || undefined,
              DurationSet2: enhancedSetData[1]?.durationSeconds.toString() || undefined,
              DurationSet3: enhancedSetData[2]?.durationSeconds.toString() || undefined,
              DurationFormatted: this.formatDurationSeconds(totalDurationSeconds),
              DurationSet1Formatted: enhancedSetData[0]?.durationFormatted || undefined,
              DurationSet2Formatted: enhancedSetData[1]?.durationFormatted || undefined,
              DurationSet3Formatted: enhancedSetData[2]?.durationFormatted || undefined,
              // Team data fields (enhanced from XML)
              TeamAFederationCode: enhancedTeamData[0]?.federationCode || undefined,
              TeamBFederationCode: enhancedTeamData[1]?.federationCode || undefined,
              TeamAPlayer1Name: enhancedTeamData[0]?.player1Name || undefined,
              TeamAPlayer2Name: enhancedTeamData[0]?.player2Name || undefined,
              TeamBPlayer1Name: enhancedTeamData[1]?.player1Name || undefined,
              TeamBPlayer2Name: enhancedTeamData[1]?.player2Name || undefined,
              TeamANoPlayer1: enhancedTeamData[0]?.noPlayer1 || undefined,
              TeamANoPlayer2: enhancedTeamData[0]?.noPlayer2 || undefined,
              TeamBNoPlayer1: enhancedTeamData[1]?.noPlayer1 || undefined,
              TeamBNoPlayer2: enhancedTeamData[1]?.noPlayer2 || undefined,
              TeamAShirt1: enhancedTeamData[0]?.noShirt1 || undefined,
              TeamAShirt2: enhancedTeamData[0]?.noShirt2 || undefined,
              TeamBShirt1: enhancedTeamData[1]?.noShirt1 || undefined,
              TeamBShirt2: enhancedTeamData[1]?.noShirt2 || undefined,
              // Enhanced data for advanced use
              __enhancedSets: enhancedSetData,
              __enhancedTeams: enhancedTeamData,
              // Add source XML for debugging (if available)
              ...(xmlSource && { __sourceXml: xmlSource })
            };
          }
        }
      }).catch(error => {
        console.warn(`Failed to fetch set scores for match ${match.id}:`, error);
      });

      fetchPromises.push(promise);
    }

    // Wait for all set score fetches to complete
    await Promise.allSettled(fetchPromises);

    return enhancedMatches;
  }

  /**
   * Fetch set scores for a single match
   * 
   * @param match - Match to fetch set scores for
   * @returns Promise resolving to array of set scores
   */
  private async fetchAndCacheSetScores(match: BeachMatchCore): Promise<number[]> {
    try {
      // Check cache first
      const cached = this.setScoreCache.get(match.id);
      if (cached) {
        return cached;
      }

      // Extract match number from BeachMatch
      const matchNo = this.extractMatchNumber(match);
      if (!matchNo) {
        console.warn(`Cannot determine match number for match ${match.id}`);
        return [];
      }

      // Call GetBeachLive API (using default fields which include 'Sets')
      const request: GetBeachLiveRequest = {
        matchNo
      };


      const response = await this.visApiClient.getBeachLive(request);


      if (!response.success || !response.xmlData) {
        console.warn(`Failed to fetch live data for match ${match.id}: ${response.error || 'No XML data'}`);
        return [];
      }

      // LOG XML RESPONSE FOR DEBUGGING
      console.log(`=== XML RESPONSE FOR MATCH ${match.id} ===`);
      console.log('Raw XML Data:', response.xmlData);
      
      // Try to format XML nicely for debugging
      try {
        const parser = new DOMParser();
        const xmlDoc = parser.parseFromString(response.xmlData, 'text/xml');
        console.log('=== FORMATTED XML STRUCTURE ===');
        
        // Log all XML elements and their attributes
        const allElements = xmlDoc.getElementsByTagName('*');
        for (let i = 0; i < allElements.length; i++) {
          const element = allElements[i];
          const attributes = {};
          for (let j = 0; j < element.attributes.length; j++) {
            const attr = element.attributes[j];
            attributes[attr.name] = attr.value;
          }
          console.log(`${element.tagName}:`, {
            attributes,
            textContent: element.textContent?.trim() || '',
            childElementCount: element.children.length
          });
        }
      } catch (xmlParseError) {
        console.log('XML parsing error:', xmlParseError);
      }
      console.log('=== END XML DEBUG ===');

      // Parse BeachLive response
      const beachLive = this.parseBeachLiveResponse(response.xmlData);
      if (!beachLive) {
        console.warn(`Invalid BeachLive response for match ${match.id}`);
        return [];
      }

      // Extract set scores, duration data, AND team data
      const setScores = this.extractSetScores(beachLive.sets);
      const enhancedSetData = this.extractEnhancedSetDataFromXml(response.xmlData);
      const enhancedTeamData = this.extractEnhancedTeamDataFromXml(response.xmlData);
      
      // LOG ALL EXTRACTED DATA
      console.log(`=== ENHANCED DATA FOR MATCH ${match.id} ===`);
      console.log('Set Scores:', setScores);
      console.log('Enhanced Set Data:', enhancedSetData);
      console.log('Enhanced Team Data:', enhancedTeamData);
      console.log('Total Duration:', enhancedSetData.reduce((total, set) => total + set.durationSeconds, 0), 'seconds');
      console.log('=== END ENHANCED DATA ===');
      
      // Cache the result AND XML source for debugging
      this.setScoreCache.set(match.id, setScores);
      this.xmlSourceCache.set(match.id, response.xmlData);
      
      // TODO: We should also cache and return the enhanced set data
      // For now, just return setScores to maintain compatibility
      return setScores;

    } catch (error) {
      console.error(`Error fetching set scores for match ${match.id}:`, error);
      return [];
    }
  }

  /**
   * Extract match number from BeachMatch
   * Uses various fields to determine the VIS match number
   */
  private extractMatchNumber(match: BeachMatchCore): number | null {
    // Try VIS number first
    if (match.visNo && !isNaN(parseInt(match.visNo))) {
      return parseInt(match.visNo);
    }

    // Try explicit access to any available number field
    const matchAny = match as any;
    if (matchAny.No && !isNaN(parseInt(matchAny.No.toString()))) {
      return parseInt(matchAny.No.toString());
    }

    // Try matchCode as fallback
    if (match.matchCode && !isNaN(parseInt(match.matchCode))) {
      return parseInt(match.matchCode);
    }

    return null;
  }

  /**
   * ARCHITECT: Production-Grade VIS XML Parser
   * Handles multiple VIS API XML structures and formats
   */
  private parseBeachLiveResponse(xmlData: string): BeachLive | null {
    try {
      
      // PRODUCTION: Use robust set score extraction
      const setScores = this.extractSetScoresFromXml(xmlData);
      
      if (setScores.length === 0) {
        return null;
      }

      // Convert flat array to BeachLiveSet structures
      const sets: BeachLiveSet[] = [];
      for (let i = 0; i < setScores.length; i += 2) {
        if (i + 1 < setScores.length) {
          sets.push({
            no: Math.floor(i / 2) + 1,
            pointsTeamA: setScores[i],
            pointsTeamB: setScores[i + 1],
            status: 'Finished' as any
          });
        }
      }

      // Return minimal BeachLive structure with just sets
      return {
        version: 1,
        pollDelay: 0,
        isBallInPlay: false,
        isMatchPointTeamA: false,
        isMatchPointTeamB: false,
        isSetPointTeamA: false,
        isSetPointTeamB: false,
        noServingTeam: 1,
        noServingPlayer: 1,
        noTeamAtLeft: 1,
        noTeamAtRight: 2,
        sets,
        match: {} as any,
        teamA: {} as any,
        teamB: {} as any,
        tournament: {} as any
      };

    } catch (error) {
      console.error('Error parsing BeachLive response:', error);
      return null;
    }
  }

  /**
   * ARCHITECT: Production-Grade Set Score Extractor
   * Based on Official VIS Schema: Set elements with PointsTeamA/PointsTeamB attributes
   */
  private extractSetScoresFromXml(xmlData: string): number[] {
    
    // Pattern 1: Official VIS Schema - Set elements with PointsTeamA/PointsTeamB attributes
    // <Set No="1" PointsTeamA="21" PointsTeamB="19" Status="Finished" />
    const setRegex = /<Set[^>]*PointsTeamA\s*=\s*"(\d+)"[^>]*PointsTeamB\s*=\s*"(\d+)"[^>]*>/gi;
    const scores: number[] = [];
    let match;
    
    while ((match = setRegex.exec(xmlData)) !== null) {
      const teamAPoints = parseInt(match[1]);
      const teamBPoints = parseInt(match[2]);
      scores.push(teamAPoints, teamBPoints);
    }
    
    if (scores.length > 0) {
      return scores;
    }
    
    // Pattern 2: Alternative order - PointsTeamB first
    const setRegex2 = /<Set[^>]*PointsTeamB\s*=\s*"(\d+)"[^>]*PointsTeamA\s*=\s*"(\d+)"[^>]*>/gi;
    while ((match = setRegex2.exec(xmlData)) !== null) {
      const teamBPoints = parseInt(match[1]);
      const teamAPoints = parseInt(match[2]);
      scores.push(teamAPoints, teamBPoints); // Keep TeamA first in our array
    }
    
    if (scores.length > 0) {
      return scores;
    }
    
    // Pattern 3: Look for any Set elements and extract all point attributes
    const setElements = xmlData.match(/<Set[^>]*>/gi);
    if (setElements) {
      for (const setElement of setElements) {
        
        // Try to extract any point-related attributes
        const pointsA = setElement.match(/PointsTeamA\s*=\s*"(\d+)"/i);
        const pointsB = setElement.match(/PointsTeamB\s*=\s*"(\d+)"/i);
        
        if (pointsA && pointsB) {
          scores.push(parseInt(pointsA[1]), parseInt(pointsB[1]));
        }
      }
    }
    
    if (scores.length > 0) {
      return scores;
    }
    
    // Pattern 4: Fallback - Look for any numerical values in Set context
    
    return [];
  }

  /**
   * Extract XML attribute value
   */
  private extractXmlAttribute(xml: string, attributeName: string): string | undefined {
    const pattern = new RegExp(`${attributeName}="([^"]*)"`, 'i');
    const match = xml.match(pattern);
    return match ? match[1] : undefined;
  }

  /**
   * Convert BeachLive sets to setScores array format
   * Format: [set1_team1, set1_team2, set2_team1, set2_team2, ...]
   */
  private extractSetScores(sets: readonly BeachLiveSet[]): number[] {
    const setScores: number[] = [];
    
    // Sort sets by number to ensure correct order
    const sortedSets = [...sets].sort((a, b) => a.no - b.no);
    
    for (const set of sortedSets) {
      setScores.push(set.pointsTeamA, set.pointsTeamB);
    }
    
    return setScores;
  }

  /**
   * Extract enhanced set data with duration information from XML
   * @param xmlData - Raw XML response from GetBeachLive
   * @returns Array of enhanced set data with duration information
   */
  private extractEnhancedSetDataFromXml(xmlData: string): EnhancedSetData[] {
    const sets: EnhancedSetData[] = [];
    
    try {
      const parser = new DOMParser();
      const xmlDoc = parser.parseFromString(xmlData, 'text/xml');
      const setElements = xmlDoc.getElementsByTagName('Set');
      
      for (let i = 0; i < setElements.length; i++) {
        const setElement = setElements[i];
        
        // Extract all attributes
        const no = parseInt(setElement.getAttribute('No') || '0');
        const pointsTeamA = parseInt(setElement.getAttribute('PointsTeamA') || '0');
        const pointsTeamB = parseInt(setElement.getAttribute('PointsTeamB') || '0');
        const durationSeconds = parseInt(setElement.getAttribute('Duration') || '0');
        const beginTimeOffset = parseInt(setElement.getAttribute('BeginTimeOffset') || '0');
        
        // Optional attributes
        const nbTimeoutTeamA = this.parseOptionalInt(setElement.getAttribute('NbTimeoutTeamA'));
        const nbTimeoutTeamB = this.parseOptionalInt(setElement.getAttribute('NbTimeoutTeamB'));
        const nbChallengeRequestedTeamA = this.parseOptionalInt(setElement.getAttribute('NbChallengeRequestedTeamA'));
        const nbChallengeRequestedTeamB = this.parseOptionalInt(setElement.getAttribute('NbChallengeRequestedTeamB'));
        
        // Format duration
        const durationFormatted = this.formatDurationSeconds(durationSeconds);
        
        sets.push({
          no,
          pointsTeamA,
          pointsTeamB,
          durationSeconds,
          durationFormatted,
          beginTimeOffset,
          nbTimeoutTeamA,
          nbTimeoutTeamB,
          nbChallengeRequestedTeamA,
          nbChallengeRequestedTeamB
        });
      }
      
    } catch (error) {
      console.error('Error parsing enhanced set data from XML:', error);
    }
    
    return sets;
  }

  /**
   * Extract enhanced team data from XML
   * @param xmlData - Raw XML response from GetBeachLive
   * @returns Array of enhanced team data
   */
  private extractEnhancedTeamDataFromXml(xmlData: string): EnhancedTeamData[] {
    const teams: EnhancedTeamData[] = [];
    
    try {
      const parser = new DOMParser();
      const xmlDoc = parser.parseFromString(xmlData, 'text/xml');
      const teamElements = xmlDoc.getElementsByTagName('Team');
      
      for (let i = 0; i < teamElements.length; i++) {
        const teamElement = teamElements[i];
        
        const no = teamElement.getAttribute('No') || '';
        const name = teamElement.getAttribute('Name') || '';
        const federationCode = teamElement.getAttribute('FederationCode') || '';
        const noPlayer1 = teamElement.getAttribute('NoPlayer1') || undefined;
        const noPlayer2 = teamElement.getAttribute('NoPlayer2') || undefined;
        const noShirt1 = teamElement.getAttribute('NoShirt1') || undefined;
        const noShirt2 = teamElement.getAttribute('NoShirt2') || undefined;
        
        // Try to extract individual player names from team name
        const { player1Name, player2Name } = this.extractPlayerNames(name);
        
        teams.push({
          no,
          name,
          federationCode,
          noPlayer1,
          noPlayer2,
          noShirt1,
          noShirt2,
          player1Name,
          player2Name
        });
      }
      
    } catch (error) {
      console.error('Error parsing enhanced team data from XML:', error);
    }
    
    return teams;
  }

  /**
   * Extract individual player names from team name
   * Handles common formats like "Player1/Player2" or "Player1, Player2"
   */
  private extractPlayerNames(teamName: string): { player1Name?: string; player2Name?: string } {
    if (!teamName) return {};
    
    // Common separators: / , - |
    const separators = ['/', ',', '-', '|'];
    
    for (const separator of separators) {
      if (teamName.includes(separator)) {
        const parts = teamName.split(separator).map(p => p.trim());
        if (parts.length >= 2) {
          return {
            player1Name: parts[0] || undefined,
            player2Name: parts[1] || undefined
          };
        }
      }
    }
    
    // If no separator found, return team name as single player
    return { player1Name: teamName };
  }

  /**
   * Parse optional integer attribute
   */
  private parseOptionalInt(value: string | null): number | undefined {
    return value ? parseInt(value) : undefined;
  }

  /**
   * Format duration from seconds to human readable format
   * @param seconds - Duration in seconds
   * @returns Formatted duration string (e.g., "17m 52s" or "1h 5m 30s")
   */
  private formatDurationSeconds(seconds: number): string {
    if (seconds <= 0) return '0s';
    
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const remainingSeconds = seconds % 60;
    
    if (hours > 0) {
      return `${hours}h ${minutes}m ${remainingSeconds}s`;
    } else if (minutes > 0) {
      return `${minutes}m ${remainingSeconds}s`;
    } else {
      return `${seconds}s`;
    }
  }

  /**
   * Get cached XML source for a match (for debugging purposes)
   * @param matchId - Match ID to get XML source for
   * @returns XML source string if available
   */
  private getXmlSourceForMatch(matchId: string): string | undefined {
    return this.xmlSourceCache.get(matchId);
  }

  /**
   * Clear the set score cache
   * Useful for testing or when data needs to be refreshed
   */
  clearCache(): void {
    this.setScoreCache.clear();
    this.xmlSourceCache.clear();
  }

  /**
   * Get cache size for monitoring
   */
  getCacheSize(): number {
    return this.setScoreCache.size;
  }
}