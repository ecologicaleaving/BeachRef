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
 * Enhanced match result with individual set scores
 */
export interface EnhancedMatchResult extends MatchResult {
  /** Individual set scores populated from GetBeachLive */
  readonly setScores: readonly number[];
}

/**
 * Service for retrieving and managing individual set scores
 * Uses GetBeachLive API to fetch detailed scoring information
 */
export class SetScoreService {
  private visApiClient: IVisApiClient;
  private setScoreCache = new Map<string, number[]>();

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
            enhancedMatches[matchIndex] = {
              ...enhancedMatches[matchIndex],
              result: {
                ...enhancedMatches[matchIndex].result!,
                setScores
              }
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

      // Parse BeachLive response
      const beachLive = this.parseBeachLiveResponse(response.xmlData);
      if (!beachLive) {
        console.warn(`Invalid BeachLive response for match ${match.id}`);
        return [];
      }

      // Extract set scores
      const setScores = this.extractSetScores(beachLive.sets);
      
      // Cache the result
      this.setScoreCache.set(match.id, setScores);
      
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
   * Clear the set score cache
   * Useful for testing or when data needs to be refreshed
   */
  clearCache(): void {
    this.setScoreCache.clear();
  }

  /**
   * Get cache size for monitoring
   */
  getCacheSize(): number {
    return this.setScoreCache.size;
  }
}