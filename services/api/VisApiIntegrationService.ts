/**
 * @fileoverview VIS API Integration Service
 * Enhanced API integration with gender variant merging and optimizations
 * Part of EPIC-007 Data Architecture Restructuration - Story 7.2 Task 3
 */

import { VisApiClient } from './VisApiClient';
import { 
  GetEventListRequest, 
  GetBeachMatchListRequest,
  GetBeachMatchRequest,
  VisApiResponse,
  VisApiEndpoint 
} from '../../types/api-v2';
import { TournamentCore, GenderType } from '../../types/tournament-v2';
import { BeachMatchCore } from '../../types/match-v2';
import { VisResponseParser } from '../parsing/VisResponseParser';
// DataTransformationService removed - transformations now handled in simplified hooks

/**
 * API request performance metrics
 */
export interface ApiRequestMetrics {
  readonly endpoint: VisApiEndpoint;
  readonly durationMs: number;
  readonly success: boolean;
  readonly cacheHit: boolean;
  readonly dataSize: number;
  readonly genderVariantsMerged: number;
  readonly fieldsRequested: number;
  readonly fieldsReceived: number;
  readonly timestamp: string;
}

/**
 * Field optimization configuration
 */
export interface FieldOptimizationConfig {
  /** Enable field selection optimization */
  readonly enableOptimization: boolean;
  /** Minimal field set for list operations */
  readonly minimalFields: string[];
  /** Essential fields for detail operations */
  readonly essentialFields: string[];
  /** Extended fields for full data */
  readonly extendedFields: string[];
}

/**
 * Gender variant merging configuration
 */
export interface GenderMergingConfig {
  /** Enable automatic gender variant merging */
  readonly enableMerging: boolean;
  /** Maximum tournaments to merge per request */
  readonly maxMergeSize: number;
  /** Cache merged results */
  readonly cacheMergedResults: boolean;
}

/**
 * Enhanced VIS API Integration Service
 * Provides optimized API calls with gender merging and field selection
 */
export class VisApiIntegrationService {
  private readonly apiClient: VisApiClient;
  private readonly fieldOptimization: FieldOptimizationConfig;
  private readonly genderMerging: GenderMergingConfig;
  private readonly requestMetrics: ApiRequestMetrics[] = [];

  constructor(
    apiClient: VisApiClient,
    fieldOptimization: FieldOptimizationConfig = DEFAULT_FIELD_OPTIMIZATION,
    genderMerging: GenderMergingConfig = DEFAULT_GENDER_MERGING
  ) {
    this.apiClient = apiClient;
    this.fieldOptimization = fieldOptimization;
    this.genderMerging = genderMerging;
  }

  /**
   * Get optimized tournament list with gender variant merging
   */
  async getTournamentsWithGenderMerging(
    request: Omit<GetEventListRequest, 'fields'>,
    optimizationLevel: 'minimal' | 'essential' | 'extended' = 'essential'
  ): Promise<{
    tournaments: TournamentCore[];
    metrics: ApiRequestMetrics;
    mergedVariants: number;
  }> {
    const startTime = Date.now();
    
    try {
      // Build optimized request with field selection
      const optimizedRequest: GetEventListRequest = {
        ...request,
        fields: this.getOptimizedFields(optimizationLevel)
      };

      // Execute API request
      const response = await this.apiClient.getEventList(optimizedRequest);
      
      if (!response.success) {
        throw new Error(`API request failed: ${response.error}`);
      }

      // Parse response directly to core domain types
      const coreTournaments = VisResponseParser.parseEventList(response.xmlData);

      // Apply gender variant merging if enabled
      const mergedTournaments = this.genderMerging.enableMerging 
        ? this.mergeGenderVariants(coreTournaments)
        : coreTournaments;

      const mergedVariants = coreTournaments.length - mergedTournaments.length;

      // Create metrics
      const durationMs = Date.now() - startTime;
      const metrics = this.createRequestMetrics(
        VisApiEndpoint.GET_EVENT_LIST,
        durationMs,
        true,
        false,
        response.sizeBytes || 0,
        mergedVariants,
        optimizedRequest.fields?.length || 0,
        coreTournaments.length > 0 ? Object.keys(coreTournaments[0]).length : 0
      );

      this.recordMetrics(metrics);

      return {
        tournaments: mergedTournaments,
        metrics,
        mergedVariants
      };

    } catch (error) {
      const metrics = this.createRequestMetrics(
        VisApiEndpoint.GET_EVENT_LIST,
        Date.now() - startTime,
        false,
        false,
        0,
        0,
        request.maxResults || 0,
        0
      );

      this.recordMetrics(metrics);
      throw error;
    }
  }

  /**
   * Get optimized match list with field selection
   */
  async getMatchesOptimized(
    request: Omit<GetBeachMatchListRequest, 'includeResults' | 'includeReferees'>,
    includeRefereeData: boolean = false
  ): Promise<{
    matches: BeachMatchCore[];
    metrics: ApiRequestMetrics;
  }> {
    const startTime = Date.now();
    
    try {
      // Build optimized request
      const optimizedRequest: GetBeachMatchListRequest = {
        ...request,
        includeResults: true, // Always include results for core functionality
        includeReferees: includeRefereeData
      };

      // First fetch tournament location data for proper timezone handling
      let tournamentLocation: any = undefined;
      try {
        const tournamentResponse = await this.apiClient.getBeachTournament({ tournamentNo: request.tournamentNo });
        if (tournamentResponse.success) {
          tournamentLocation = VisResponseParser.parseBeachTournament(tournamentResponse.xmlData);
        }
      } catch (error) {
        console.warn('Failed to fetch tournament location data, timezone detection may be inaccurate:', error);
      }

      // Execute API request
      const response = await this.apiClient.getBeachMatchList(optimizedRequest);

      if (!response.success) {
        throw new Error(`API request failed: ${response.error}`);
      }

      // Parse matches directly to core domain types with tournament location for timezone detection
      const coreMatches = VisResponseParser.parseBeachMatches(
        response.xmlData,
        request.tournamentNo,
        undefined, // tournamentTimezone - keep undefined to use location-based detection
        undefined, // tournamentGender
        undefined, // tournamentGenderText
        tournamentLocation // Pass tournament location for timezone detection
      );

      // Create metrics
      const metrics = this.createRequestMetrics(
        VisApiEndpoint.GET_BEACH_MATCH_LIST,
        Date.now() - startTime,
        true,
        false,
        response.sizeBytes || 0,
        0, // No gender merging for matches
        includeRefereeData ? 2 : 1, // Field count approximation
        coreMatches.length > 0 ? Object.keys(coreMatches[0]).length : 0
      );

      this.recordMetrics(metrics);

      return {
        matches: coreMatches,
        metrics
      };

    } catch (error) {
      const metrics = this.createRequestMetrics(
        VisApiEndpoint.GET_BEACH_MATCH_LIST,
        Date.now() - startTime,
        false,
        false,
        0,
        0,
        0,
        0
      );

      this.recordMetrics(metrics);
      throw error;
    }
  }

  /**
   * Get enhanced match list with full individual match data
   * For each match in BeachMatchList, calls GetBeachMatch to populate all data without overcomplicated mapping
   */
  async getMatchesWithEnhancedData(
    request: Omit<GetBeachMatchListRequest, 'includeResults' | 'includeReferees'>,
    options: {
      includeRefereeData?: boolean;
      includeSetScores?: boolean;
      includeStatistics?: boolean;
      parallel?: boolean;
    } = {}
  ): Promise<{
    matches: any[]; // Full raw match objects without complex mapping
    metrics: {
      listCall: ApiRequestMetrics;
      individualCalls: ApiRequestMetrics[];
      totalDuration: number;
      enhancedMatches: number;
    };
  }> {
    const startTime = Date.now();
    
    try {
      // First fetch tournament location data for proper timezone handling
      let tournamentLocation: any = undefined;
      try {
        const tournamentResponse = await this.apiClient.getBeachTournament({ tournamentNo: request.tournamentNo });
        if (tournamentResponse.success) {
          tournamentLocation = VisResponseParser.parseBeachTournament(tournamentResponse.xmlData);
        }
      } catch (error) {
        console.warn('Failed to fetch tournament location data, timezone detection may be inaccurate:', error);
      }

      // Step 1: Get the match list
      const matchListRequest: GetBeachMatchListRequest = {
        ...request,
        includeResults: true,
        includeReferees: options.includeRefereeData || false
      };

      const listResponse = await this.apiClient.getBeachMatchList(matchListRequest);

      if (!listResponse.success) {
        throw new Error(`BeachMatchList API request failed: ${listResponse.error}`);
      }

      // Parse initial match list to get match numbers with tournament location for timezone detection
      const initialMatches = VisResponseParser.parseBeachMatches(
        listResponse.xmlData,
        request.tournamentNo,
        undefined, // tournamentTimezone - keep undefined to use location-based detection
        undefined, // tournamentGender
        undefined, // tournamentGenderText
        tournamentLocation // Pass tournament location for timezone detection
      );
      
      const listMetrics = this.createRequestMetrics(
        VisApiEndpoint.GET_BEACH_MATCH_LIST,
        Date.now() - startTime,
        true,
        false,
        listResponse.sizeBytes || 0,
        0,
        0,
        initialMatches.length
      );

      // Step 2: For each match, call GetBeachMatch to get full data
      const individualCallMetrics: ApiRequestMetrics[] = [];
      const enhancedMatches: any[] = [];
      
      if (options.parallel) {
        // Call GetBeachMatch for all matches in parallel
        const enhancePromises = initialMatches.map(async (match, index) => {
          const individualStartTime = Date.now();
          
          try {
            const enhancedRequest: GetBeachMatchRequest = {
              matchNo: match.id, // Use the VIS entity ID which is the match number
              tournamentNo: request.tournamentNo,
              includeResults: true,
              includeReferees: options.includeRefereeData,
              includeTeamDetails: true,
              includeSetScores: options.includeSetScores,
              includeStatistics: options.includeStatistics
            };

            const enhancedResponse = await this.apiClient.getBeachMatch(enhancedRequest);
            
            if (enhancedResponse.success) {
              // Parse the full match data without complex mapping - return raw parsed data
              const fullMatchData = this.parseRawMatchData(enhancedResponse.xmlData);
              
              const metrics = this.createRequestMetrics(
                VisApiEndpoint.GET_BEACH_MATCH,
                Date.now() - individualStartTime,
                true,
                false,
                enhancedResponse.sizeBytes || 0,
                0,
                0,
                Object.keys(fullMatchData).length
              );
              
              return { match: fullMatchData, metrics, index };
            } else {
              // Fallback to original match data if individual call fails
              const metrics = this.createRequestMetrics(
                VisApiEndpoint.GET_BEACH_MATCH,
                Date.now() - individualStartTime,
                false,
                false,
                0,
                0,
                0,
                0
              );
              
              return { match, metrics, index };
            }
          } catch (error) {
            // Fallback to original match data on error
            const metrics = this.createRequestMetrics(
              VisApiEndpoint.GET_BEACH_MATCH,
              Date.now() - individualStartTime,
              false,
              false,
              0,
              0,
              0,
              0
            );
            
            return { match, metrics, index };
          }
        });
        
        const results = await Promise.all(enhancePromises);
        
        // Sort results back to original order and extract data
        results
          .sort((a, b) => a.index - b.index)
          .forEach(result => {
            enhancedMatches.push(result.match);
            individualCallMetrics.push(result.metrics);
          });
        
      } else {
        // Call GetBeachMatch for each match sequentially
        for (const match of initialMatches) {
          const individualStartTime = Date.now();
          
          try {
            const enhancedRequest: GetBeachMatchRequest = {
              matchNo: match.id, // Use the VIS entity ID which is the match number
              tournamentNo: request.tournamentNo,
              includeResults: true,
              includeReferees: options.includeRefereeData,
              includeTeamDetails: true,
              includeSetScores: options.includeSetScores,
              includeStatistics: options.includeStatistics
            };

            const enhancedResponse = await this.apiClient.getBeachMatch(enhancedRequest);
            
            if (enhancedResponse.success) {
              // Parse the full match data without complex mapping - return raw parsed data
              const fullMatchData = this.parseRawMatchData(enhancedResponse.xmlData);
              enhancedMatches.push(fullMatchData);
              
              const metrics = this.createRequestMetrics(
                VisApiEndpoint.GET_BEACH_MATCH,
                Date.now() - individualStartTime,
                true,
                false,
                enhancedResponse.sizeBytes || 0,
                0,
                0,
                Object.keys(fullMatchData).length
              );
              
              individualCallMetrics.push(metrics);
            } else {
              // Fallback to original match data if individual call fails
              enhancedMatches.push(match);
              
              const metrics = this.createRequestMetrics(
                VisApiEndpoint.GET_BEACH_MATCH,
                Date.now() - individualStartTime,
                false,
                false,
                0,
                0,
                0,
                0
              );
              
              individualCallMetrics.push(metrics);
            }
          } catch (error) {
            // Fallback to original match data on error
            enhancedMatches.push(match);
            
            const metrics = this.createRequestMetrics(
              VisApiEndpoint.GET_BEACH_MATCH,
              Date.now() - individualStartTime,
              false,
              false,
              0,
              0,
              0,
              0
            );
            
            individualCallMetrics.push(metrics);
          }
        }
      }

      // Record all metrics
      this.recordMetrics(listMetrics);
      individualCallMetrics.forEach(metrics => this.recordMetrics(metrics));

      const totalDuration = Date.now() - startTime;

      return {
        matches: enhancedMatches,
        metrics: {
          listCall: listMetrics,
          individualCalls: individualCallMetrics,
          totalDuration,
          enhancedMatches: individualCallMetrics.filter(m => m.success).length
        }
      };

    } catch (error) {
      const metrics = this.createRequestMetrics(
        VisApiEndpoint.GET_BEACH_MATCH_LIST,
        Date.now() - startTime,
        false,
        false,
        0,
        0,
        0,
        0
      );

      this.recordMetrics(metrics);
      throw error;
    }
  }

  /**
   * Get performance analytics for API usage
   */
  getPerformanceAnalytics(): {
    totalRequests: number;
    averageResponseTime: number;
    successRate: number;
    bandwidthSaved: number;
    genderVariantsMerged: number;
    endpointUsage: Record<VisApiEndpoint, number>;
  } {
    const totalRequests = this.requestMetrics.length;
    const successfulRequests = this.requestMetrics.filter(m => m.success).length;
    const averageResponseTime = totalRequests > 0 
      ? this.requestMetrics.reduce((sum, m) => sum + m.durationMs, 0) / totalRequests 
      : 0;
    
    const bandwidthSaved = this.requestMetrics.reduce((sum, m) => {
      // Estimate bandwidth saved by field optimization
      const maxPossibleFields = 50; // Typical max fields in API response
      const savedFields = maxPossibleFields - m.fieldsRequested;
      return sum + (savedFields * 100); // Rough estimate: 100 bytes per saved field
    }, 0);

    const genderVariantsMerged = this.requestMetrics.reduce(
      (sum, m) => sum + m.genderVariantsMerged, 0
    );

    const endpointUsage = this.requestMetrics.reduce((acc, m) => {
      acc[m.endpoint] = (acc[m.endpoint] || 0) + 1;
      return acc;
    }, {} as Record<VisApiEndpoint, number>);

    return {
      totalRequests,
      averageResponseTime,
      successRate: totalRequests > 0 ? successfulRequests / totalRequests : 0,
      bandwidthSaved,
      genderVariantsMerged,
      endpointUsage
    };
  }

  /**
   * Clear performance metrics (for testing or reset)
   */
  clearMetrics(): void {
    this.requestMetrics.length = 0;
  }

  /**
   * Get optimized field list based on optimization level
   */
  private getOptimizedFields(level: 'minimal' | 'essential' | 'extended'): string[] {
    if (!this.fieldOptimization.enableOptimization) {
      return this.fieldOptimization.extendedFields;
    }

    switch (level) {
      case 'minimal':
        return this.fieldOptimization.minimalFields;
      case 'essential':
        return this.fieldOptimization.essentialFields;
      case 'extended':
        return this.fieldOptimization.extendedFields;
      default:
        return this.fieldOptimization.essentialFields;
    }
  }

  /**
   * Merge gender variants of the same tournament
   */
  private mergeGenderVariants(tournaments: TournamentCore[]): TournamentCore[] {
    if (!this.genderMerging.enableMerging) {
      return tournaments;
    }

    const mergedMap = new Map<string, TournamentCore>();
    
    for (const tournament of tournaments) {
      // Extract base tournament identifier (without gender)
      const baseKey = this.extractBaseTournamentKey(tournament);
      
      if (mergedMap.has(baseKey)) {
        // Tournament with same base already exists, merge gender variants
        const existing = mergedMap.get(baseKey)!;
        
        // Keep the mixed or combined gender tournament
        if (tournament.gender === GenderType.MIXED || 
            (existing.gender !== GenderType.MIXED && this.shouldPreferTournament(tournament, existing))) {
          mergedMap.set(baseKey, tournament);
        }
      } else {
        mergedMap.set(baseKey, tournament);
      }
    }

    return Array.from(mergedMap.values());
  }

  /**
   * Extract base tournament key for gender merging
   */
  private extractBaseTournamentKey(tournament: TournamentCore): string {
    // Extract base code by removing gender indicators
    let baseCode = tournament.code;
    
    // Remove gender prefixes (M, W, MIXED) and normalize
    baseCode = baseCode.replace(/^(M|W|MIXED)/i, '');
    
    // If the same event is held for multiple genders, use same base identifier
    // Based on tournament name, dates, and location
    return `${tournament.name}_${tournament.dates.startDate}_${tournament.city}`;
  }

  /**
   * Determine which tournament to prefer when merging variants
   */
  private shouldPreferTournament(candidate: TournamentCore, existing: TournamentCore): boolean {
    // Prefer tournaments with more complete data
    const candidateScore = this.calculateCompletenessScore(candidate);
    const existingScore = this.calculateCompletenessScore(existing);
    
    return candidateScore > existingScore;
  }

  /**
   * Calculate completeness score for tournament data
   */
  private calculateCompletenessScore(tournament: TournamentCore): number {
    let score = 0;
    
    if (tournament.city) score += 1;
    if (tournament.country) score += 1;
    if (tournament.location) score += 1;
    if (tournament.prizeMoney) score += 1;
    if (tournament.website) score += 1;
    if (tournament.courts) score += 1;
    
    return score;
  }

  /**
   * Create request metrics object
   */
  private createRequestMetrics(
    endpoint: VisApiEndpoint,
    durationMs: number,
    success: boolean,
    cacheHit: boolean,
    dataSize: number,
    genderVariantsMerged: number,
    fieldsRequested: number,
    fieldsReceived: number
  ): ApiRequestMetrics {
    return {
      endpoint,
      durationMs,
      success,
      cacheHit,
      dataSize,
      genderVariantsMerged,
      fieldsRequested,
      fieldsReceived,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Record metrics for analytics
   */
  private recordMetrics(metrics: ApiRequestMetrics): void {
    this.requestMetrics.push(metrics);
    
    // Keep only last 1000 metrics to prevent memory issues
    if (this.requestMetrics.length > 1000) {
      this.requestMetrics.splice(0, this.requestMetrics.length - 1000);
    }
  }

  /**
   * Parse raw match data without complex mapping
   * Returns the match object as-is from the VIS API response
   */
  private parseRawMatchData(xmlData: string): any {
    try {
      // For now, use the existing VisResponseParser but return raw structure
      // This method provides access to all VIS API fields without transformation
      
      // Simple XML parsing to extract match data as raw object
      // In a production environment, you'd use fast-xml-parser for better performance
      const matchDataRegex = /<Match[^>]*>([\s\S]*?)<\/Match>/gi;
      const matches = Array.from(xmlData.matchAll(matchDataRegex));
      
      if (matches.length > 0) {
        const matchXml = matches[0][0];
        
        // Extract all attributes and child elements as raw object
        const rawMatch: any = {};
        
        // Extract attributes from the Match element
        const attributeRegex = /(\w+)="([^"]*)"/g;
        let attrMatch;
        while ((attrMatch = attributeRegex.exec(matchXml)) !== null) {
          rawMatch[attrMatch[1]] = attrMatch[2];
        }
        
        // Extract child elements
        const childElementRegex = /<(\w+)(?:[^>]*)>([^<]*)<\/\1>/g;
        let childMatch;
        while ((childMatch = childElementRegex.exec(matchXml)) !== null) {
          const elementName = childMatch[1];
          const elementValue = childMatch[2];
          
          // Don't overwrite attributes with child elements of same name
          if (!rawMatch[elementName]) {
            rawMatch[elementName] = elementValue;
          }
        }
        
        // Also extract complex nested structures (like Sets, Teams, etc.)
        const setsRegex = /<Sets>([\s\S]*?)<\/Sets>/i;
        const setsMatch = setsRegex.exec(matchXml);
        if (setsMatch) {
          rawMatch.Sets = this.parseNestedXmlStructure(setsMatch[1]);
        }
        
        const teamsRegex = /<Teams>([\s\S]*?)<\/Teams>/i;
        const teamsMatch = teamsRegex.exec(matchXml);
        if (teamsMatch) {
          rawMatch.Teams = this.parseNestedXmlStructure(teamsMatch[1]);
        }
        
        const refereesRegex = /<Referees>([\s\S]*?)<\/Referees>/i;
        const refereesMatch = refereesRegex.exec(matchXml);
        if (refereesMatch) {
          rawMatch.Referees = this.parseNestedXmlStructure(refereesMatch[1]);
        }
        
        return rawMatch;
      }
      
      // Fallback: return empty object if no match found
      return {};
      
    } catch (error) {
      console.warn('Error parsing raw match data:', error);
      return {};
    }
  }

  /**
   * Parse nested XML structures into raw objects
   */
  private parseNestedXmlStructure(xmlContent: string): any {
    const result: any = {};
    
    // Extract child elements
    const elementRegex = /<(\w+)(?:[^>]*?)>([^<]*)<\/\1>/g;
    let match;
    while ((match = elementRegex.exec(xmlContent)) !== null) {
      const elementName = match[1];
      const elementValue = match[2];
      
      // Handle arrays of similar elements (like multiple sets)
      if (result[elementName]) {
        if (!Array.isArray(result[elementName])) {
          result[elementName] = [result[elementName]];
        }
        result[elementName].push(elementValue);
      } else {
        result[elementName] = elementValue;
      }
    }
    
    return result;
  }
}

/**
 * Default field optimization configuration
 */
export const DEFAULT_FIELD_OPTIMIZATION: FieldOptimizationConfig = {
  enableOptimization: true,
  minimalFields: ['No', 'Name', 'Code', 'Status', 'StartDate', 'EndDate'],
  essentialFields: [
    'No', 'Name', 'Code', 'Status', 'StartDate', 'EndDate', 
    'City', 'Country', 'Type', 'Gender', 'Prize'
  ],
  extendedFields: [
    'No', 'Name', 'Code', 'Status', 'StartDate', 'EndDate',
    'City', 'Country', 'Type', 'Gender', 'Prize', 'Currency',
    'Location', 'Website', 'Courts', 'Series', 'Category'
  ]
};

/**
 * Default gender merging configuration
 */
export const DEFAULT_GENDER_MERGING: GenderMergingConfig = {
  enableMerging: true,
  maxMergeSize: 50,
  cacheMergedResults: true
};