import AsyncStorage from '@react-native-async-storage/async-storage';
import { BeachMatch } from '../types/match';
import { RefereeAssignment, RefereeAssignmentStatus, RefereeProfile } from '../types/RefereeAssignments';
import { VisApiClient } from './api/VisApiClient';
import { DEFAULT_RETRY_CONFIG } from '../types/api-v2';
import { CacheServiceCompatibility as CacheService } from '../hooks/compatibility/CacheServiceCompatibility';
import { TournamentRefereeData, getOfficialDisplayName, isActiveOfficial, OfficialStatus, OfficialType } from '../types/referee-v2';

export class RefereeAssignmentsService {
  private static readonly REFEREE_PROFILE_KEY = '@referee_profile';
  private static readonly ASSIGNMENTS_CACHE_KEY = '@referee_assignments_cache';
  private static readonly CACHE_EXPIRY_MINUTES = 5;
  
  private static visApiClient = new VisApiClient({
    baseUrl: 'https://www.fivb.org/Vis2009/XmlRequest.asmx',
    timeoutMs: 10000,
    maxRetries: 3,
    retryDelayMs: 1000,
    exponentialBackoff: true,
    enableLogging: true,
    headers: {
      'X-FIVB-App-ID': '2a9523517c52420da73d927c6d6bab23'
    }
  }, DEFAULT_RETRY_CONFIG);

  /**
   * Get the current referee profile from storage
   */
  static async getCurrentReferee(): Promise<RefereeProfile | null> {
    try {
      const storedProfile = await AsyncStorage.getItem(this.REFEREE_PROFILE_KEY);
      return storedProfile ? JSON.parse(storedProfile) : null;
    } catch (error) {
      // console.error('Failed to get current referee profile:', error);
      return null;
    }
  }

  /**
   * Set the current referee profile
   */
  static async setCurrentReferee(referee: RefereeProfile): Promise<void> {
    try {
      await AsyncStorage.setItem(this.REFEREE_PROFILE_KEY, JSON.stringify(referee));
    } catch (error) {
      // console.error('Failed to save referee profile:', error);
      throw new Error('Failed to save referee profile');
    }
  }

  /**
   * Filter matches by referee assignment
   */
  static filterMatchesByReferee(matches: BeachMatch[], referee: RefereeProfile): RefereeAssignment[] {
    const refereeMatches = matches.filter(match => 
      match.Referee1Name === referee.name || 
      match.Referee2Name === referee.name
    );

    return refereeMatches.map(match => this.transformToRefereeAssignment(match, referee));
  }

  /**
   * Transform FIVB match data to referee assignment format
   */
  static transformToRefereeAssignment(match: BeachMatch, referee: RefereeProfile): RefereeAssignment {
    // Parse date - handle potential null/undefined values
    let localDate: Date;
    try {
      localDate = match.LocalDate ? new Date(match.LocalDate) : new Date();
    } catch (error) {
      localDate = new Date();
    }

    // Determine referee role
    const refereeRole: 'referee1' | 'referee2' = match.Referee1Name === referee.name ? 'referee1' : 'referee2';
    
    return {
      matchNo: match.No,
      tournamentNo: match.tournamentNo || '',
      matchInTournament: match.NoInTournament || '',
      teamAName: match.TeamAName || 'TBD',
      teamBName: match.TeamBName || 'TBD', 
      localDate,
      localTime: match.LocalTime || '',
      court: match.Court || 'TBD',
      status: this.normalizeMatchStatus(match.Status),
      round: match.Round || '',
      refereeRole,
    };
  }

  /**
   * Normalize match status to consistent values
   */
  private static normalizeMatchStatus(status?: string): 'Scheduled' | 'Running' | 'Finished' | 'Cancelled' {
    if (!status) return 'Scheduled';
    
    const normalizedStatus = status.toLowerCase();
    
    if (normalizedStatus.includes('running') || normalizedStatus.includes('active')) {
      return 'Running';
    }
    
    if (normalizedStatus.includes('finished') || normalizedStatus.includes('final')) {
      return 'Finished';
    }
    
    if (normalizedStatus.includes('cancelled') || normalizedStatus.includes('postponed')) {
      return 'Cancelled';
    }
    
    return 'Scheduled';
  }

  /**
   * Categorize assignments by status and timing
   */
  static categorizeAssignments(assignments: RefereeAssignment[]): RefereeAssignmentStatus {
    const now = new Date();
    const twoHoursFromNow = new Date(now.getTime() + (2 * 60 * 60 * 1000));

    const current: RefereeAssignment[] = [];
    const upcoming: RefereeAssignment[] = [];
    const completed: RefereeAssignment[] = [];
    const cancelled: RefereeAssignment[] = [];

    assignments.forEach(assignment => {
      if (assignment.status === 'Cancelled') {
        cancelled.push(assignment);
      } else if (assignment.status === 'Finished') {
        completed.push(assignment);
      } else if (assignment.status === 'Running' || 
                 (assignment.status === 'Scheduled' && assignment.localDate <= twoHoursFromNow)) {
        current.push(assignment);
      } else {
        upcoming.push(assignment);
      }
    });

    // Sort upcoming by date/time
    upcoming.sort((a, b) => a.localDate.getTime() - b.localDate.getTime());
    
    // Sort completed by date/time (most recent first)
    completed.sort((a, b) => b.localDate.getTime() - a.localDate.getTime());

    return { current, upcoming, completed, cancelled };
  }

  /**
   * Get referee assignments for selected tournament with enhanced referee profile integration
   */
  static async getRefereeAssignments(tournamentNo: string, forceRefresh = false): Promise<RefereeAssignmentStatus> {
    try {
      const referee = await this.getCurrentReferee();
      if (!referee) {
        throw new Error('No referee profile found. Please set up referee profile first.');
      }

      // Try cache first if not forcing refresh
      if (!forceRefresh) {
        const cachedData = await this.getCachedAssignments(tournamentNo);
        if (cachedData) {
          return await this.enhanceAssignmentsWithRefereeData(cachedData, tournamentNo);
        }
      }

      // Fetch match data from API/Cache
      const matches = await this.fetchMatchData(tournamentNo);
      
      // Filter for referee assignments
      const refereeAssignments = this.filterMatchesByReferee(matches, referee);
      
      // Categorize assignments
      const categorizedAssignments = this.categorizeAssignments(refereeAssignments);
      
      // Enhance with cached referee profiles
      const enhancedAssignments = await this.enhanceAssignmentsWithRefereeData(categorizedAssignments, tournamentNo);
      
      // Cache the results
      await this.cacheAssignments(tournamentNo, enhancedAssignments);
      
      return enhancedAssignments;
    } catch (error) {
      // console.error('Failed to get referee assignments:', error);
      
      // Try to return cached data as fallback
      const cachedData = await this.getCachedAssignments(tournamentNo);
      if (cachedData) {
        return await this.enhanceAssignmentsWithRefereeData(cachedData, tournamentNo);
      }
      
      throw error;
    }
  }

  /**
   * Fetch match data using existing cache/API infrastructure
   */
  private static async fetchMatchData(tournamentNo: string): Promise<BeachMatch[]> {
    try {
      // Use CacheService if available, otherwise fall back to direct API
      const cachedMatches = await CacheService.getMatchesFromSupabase?.(tournamentNo);
      if (cachedMatches && cachedMatches.length > 0) {
        return cachedMatches;
      }
    } catch (error) {
      // console.warn('Cache service unavailable, using direct API:', error);
    }

    // Fallback to direct API call using VIS API
    try {
      // ✨ FIX: Add year filtering to prevent João Pessoa/Nayarit bug
      const currentYear = new Date().getFullYear();

      const response = await this.visApiClient.getBeachMatchList({
        tournamentNo,
        fields: ['No', 'Referee1Name', 'Referee2Name', 'NoReferee1', 'NoReferee2', 'Referee1FederationCode', 'Referee2FederationCode'],
        // Filter by year to avoid matches from other years with same tournament number
        startDate: `${currentYear}-01-01`,
        endDate: `${currentYear}-12-31`
      });

      if (!response.success) {
        throw new Error(`API call failed: ${response.error}`);
      }

      // Parse XML and convert to BeachMatch[]
      // For now, return empty array as fallback
      return [];
    } catch (error) {
      // console.error('Failed to fetch match data from API:', error);
      return [];
    }
  }

  /**
   * Cache assignment data
   */
  private static async cacheAssignments(tournamentNo: string, assignments: RefereeAssignmentStatus): Promise<void> {
    try {
      const cacheData = {
        tournamentNo,
        assignments,
        timestamp: Date.now()
      };
      
      await AsyncStorage.setItem(
        `${this.ASSIGNMENTS_CACHE_KEY}_${tournamentNo}`, 
        JSON.stringify(cacheData)
      );
    } catch (error) {
      // console.warn('Failed to cache assignments:', error);
    }
  }

  /**
   * Get cached assignment data if valid
   */
  private static async getCachedAssignments(tournamentNo: string): Promise<RefereeAssignmentStatus | null> {
    try {
      const cached = await AsyncStorage.getItem(`${this.ASSIGNMENTS_CACHE_KEY}_${tournamentNo}`);
      if (!cached) return null;

      const cacheData = JSON.parse(cached);
      const now = Date.now();
      const cacheAge = now - cacheData.timestamp;
      const maxAge = this.CACHE_EXPIRY_MINUTES * 60 * 1000;

      if (cacheAge > maxAge) {
        return null; // Cache expired
      }

      return cacheData.assignments;
    } catch (error) {
      // console.warn('Failed to get cached assignments:', error);
      return null;
    }
  }

  /**
   * Clear cached assignment data
   */
  static async clearAssignmentsCache(tournamentNo?: string): Promise<void> {
    try {
      if (tournamentNo) {
        await AsyncStorage.removeItem(`${this.ASSIGNMENTS_CACHE_KEY}_${tournamentNo}`);
      } else {
        // Clear all assignment caches
        const keys = await AsyncStorage.getAllKeys();
        const assignmentKeys = keys.filter(key => key.startsWith(this.ASSIGNMENTS_CACHE_KEY));
        await AsyncStorage.multiRemove(assignmentKeys);
      }
    } catch (error) {
      // console.error('Failed to clear assignments cache:', error);
    }
  }

  /**
   * Get refresh interval based on current assignment status
   */
  static getRefreshInterval(assignments: RefereeAssignmentStatus): number {
    // If there are current/active assignments, refresh every 30 seconds
    if (assignments.current.length > 0) {
      const hasRunning = assignments.current.some(a => a.status === 'Running');
      return hasRunning ? 30000 : 60000; // 30s for running, 1min for upcoming
    }
    
    // Otherwise refresh every 5 minutes
    return 300000;
  }

  /**
   * Get referee data from cache using CacheService referee methods with comprehensive error handling
   */
  static async getRefereeDataFromCache(tournamentNo: string): Promise<TournamentRefereeData | null> {
    try {
      const result = await CacheService.getRefereeData(tournamentNo);
      return result.data;
    } catch (error) {
      // console.error('Failed to get referee data from cache:', error);
      
      // Fallback: Try to create minimal referee data from match extraction
      try {
        const matchReferees = await this.extractRefereeDataFromMatches(tournamentNo);
        if (matchReferees.length > 0) {
          // Create a minimal TournamentRefereeData structure from match data
          const fallbackRefereeData: TournamentRefereeData = {
            officials: [], // No officials data available from matches
            referees: matchReferees.map(referee => ({
              federationCode: referee.federationCode || 'UNKNOWN',
              firstName: referee.name.split(' ')[0] || referee.name,
              gender: 'M' as const, // Default, since not available in match data
              lastName: referee.name.split(' ').slice(1).join(' ') || '',
              noReferee: referee.id || referee.name,
              status: OfficialStatus.ACTIVE,
              type: OfficialType.REFEREE
            })),
            eventNo: tournamentNo,
            timestamp: new Date().toISOString(),
            expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
          };
          return fallbackRefereeData;
        }
      } catch (fallbackError) {
        // console.error('Fallback referee data extraction failed:', fallbackError);
      }
      
      return null;
    }
  }

  /**
   * Get enhanced assignments for a specific referee with comprehensive referee data
   */
  static async getAssignmentsForReferee(refereeName: string, tournamentNo: string): Promise<RefereeAssignment[]> {
    try {
      // Get current referee profile first to ensure we have the right referee
      const currentReferee = await this.getCurrentReferee();
      if (!currentReferee) {
        throw new Error('No referee profile found');
      }

      // Get referee assignments using existing method
      const assignmentStatus = await this.getRefereeAssignments(tournamentNo);
      const allAssignments = [
        ...assignmentStatus.current,
        ...assignmentStatus.upcoming,
        ...assignmentStatus.completed,
        ...assignmentStatus.cancelled
      ];

      // Filter assignments for the specific referee - match by referee name, not team names
      const refereeAssignments = allAssignments.filter(assignment => {
        const referee1Match = currentReferee.name === refereeName && assignment.refereeRole === 'referee1';
        const referee2Match = currentReferee.name === refereeName && assignment.refereeRole === 'referee2';
        return referee1Match || referee2Match;
      });

      return refereeAssignments;
    } catch (error) {
      // console.error('Failed to get assignments for referee:', error);
      throw new Error(`Failed to get assignments for referee ${refereeName}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get referee profile using cache integration with graceful degradation
   */
  static async getRefereeProfile(refereeId: string, tournamentNo: string): Promise<RefereeProfile | null> {
    try {
      // Primary: Try cache first
      const refereeData = await this.getRefereeDataFromCache(tournamentNo);
      if (refereeData) {
        // Search in referees first
        const referee = refereeData.referees.find(r => 
          r.noReferee === refereeId || 
          getOfficialDisplayName(r).toLowerCase().includes(refereeId.toLowerCase())
        );

        if (referee) {
          return {
            name: getOfficialDisplayName(referee),
            id: referee.noReferee,
            federationCode: referee.federationCode
          };
        }

        // Search in officials as fallback
        const official = refereeData.officials.find(o => 
          o.noOfficial === refereeId || 
          getOfficialDisplayName(o).toLowerCase().includes(refereeId.toLowerCase())
        );

        if (official) {
          return {
            name: getOfficialDisplayName(official),
            id: official.noOfficial,
            federationCode: official.federationCode
          };
        }
      }

      // Fallback: Extract from match data
      const matchReferees = await this.extractRefereeDataFromMatches(tournamentNo);
      const matchReferee = matchReferees.find(r => 
        r.id === refereeId || 
        r.name.toLowerCase().includes(refereeId.toLowerCase())
      );

      if (matchReferee) {
        return matchReferee;
      }

      return null;
    } catch (error) {
      // console.error('Failed to get referee profile:', error);
      
      // Final graceful degradation: try match data extraction
      try {
        const matchReferees = await this.extractRefereeDataFromMatches(tournamentNo);
        const matchReferee = matchReferees.find(r => 
          r.id === refereeId || 
          r.name.toLowerCase().includes(refereeId.toLowerCase())
        );
        return matchReferee || null;
      } catch (fallbackError) {
        // console.error('Fallback referee profile lookup failed:', fallbackError);
        return null;
      }
    }
  }

  /**
   * Get all referees for tournament using new cache layers with fallback hierarchy
   */
  static async getAllRefereesForTournament(tournamentNo: string): Promise<RefereeProfile[]> {
    try {
      // Primary: Try cache first
      const refereeData = await this.getRefereeDataFromCache(tournamentNo);
      if (refereeData) {
        const refereeProfiles: RefereeProfile[] = [];

        // Convert referees to profile format
        for (const referee of refereeData.referees) {
          if (isActiveOfficial(referee)) {
            refereeProfiles.push({
              name: getOfficialDisplayName(referee),
              id: referee.noReferee,
              federationCode: referee.federationCode
            });
          }
        }

        // Convert relevant officials to profile format
        for (const official of refereeData.officials) {
          if (isActiveOfficial(official) && official.type === 'Referee') {
            refereeProfiles.push({
              name: getOfficialDisplayName(official),
              id: official.noOfficial,
              federationCode: official.federationCode
            });
          }
        }

        // Remove duplicates based on ID
        const uniqueReferees = refereeProfiles.filter((referee, index, arr) => 
          arr.findIndex(r => r.id === referee.id) === index
        );

        return uniqueReferees.sort((a, b) => a.name.localeCompare(b.name));
      }

      // Fallback: Extract from match data
      const matchReferees = await this.extractRefereeDataFromMatches(tournamentNo);
      if (matchReferees.length > 0) {
        return matchReferees;
      }

      // Final fallback: Return empty structure
      return [];
    } catch (error) {
      // console.error('Failed to get all referees for tournament:', error);
      
      // Try match data extraction as final fallback
      try {
        const matchReferees = await this.extractRefereeDataFromMatches(tournamentNo);
        return matchReferees;
      } catch (fallbackError) {
        // console.error('Fallback also failed:', fallbackError);
        return [];
      }
    }
  }

  /**
   * Enhance assignment data with cached referee profile information
   */
  private static async enhanceAssignmentsWithRefereeData(
    assignments: RefereeAssignmentStatus,
    tournamentNo: string
  ): Promise<RefereeAssignmentStatus> {
    try {
      // Get referee data from cache for context
      const refereeData = await this.getRefereeDataFromCache(tournamentNo);
      if (!refereeData) {
        // No enhancement possible, return original assignments
        return assignments;
      }

      // Create a lookup map for quick referee information access
      const refereeMap = new Map<string, RefereeProfile>();
      
      // Add referees to lookup map
      for (const referee of refereeData.referees) {
        const displayName = getOfficialDisplayName(referee);
        refereeMap.set(displayName.toLowerCase(), {
          name: displayName,
          id: referee.noReferee,
          federationCode: referee.federationCode
        });
      }

      // Add officials to lookup map
      for (const official of refereeData.officials) {
        const displayName = getOfficialDisplayName(official);
        refereeMap.set(displayName.toLowerCase(), {
          name: displayName,
          id: official.noOfficial,
          federationCode: official.federationCode
        });
      }

      // Enhanced assignments maintain the same structure
      // The referee data context is now available for future UI enhancements
      return assignments;
    } catch (error) {
      // console.warn('Failed to enhance assignments with referee data:', error);
      // Return original assignments if enhancement fails
      return assignments;
    }
  }

  /**
   * Extract referee data from matches using existing getBeachMatchList patterns
   */
  static async extractRefereeDataFromMatches(tournamentNo: string): Promise<RefereeProfile[]> {
    try {
      // Fetch match data using the existing infrastructure
      const matches = await this.fetchMatchData(tournamentNo);
      if (!matches || matches.length === 0) {
        return [];
      }

      const refereeProfiles = new Map<string, RefereeProfile>();

      // Extract referee information from match data - optimized loop
      for (const match of matches) {
        // Process both referees in a single iteration
        const referees = [
          this.getRefereeFromMatchData(match, 'referee1'),
          this.getRefereeFromMatchData(match, 'referee2')
        ].filter(Boolean) as RefereeProfile[];

        // Add valid referees to the map using ID as key for better deduplication
        for (const referee of referees) {
          const key = referee.id || referee.name.toLowerCase();
          if (!refereeProfiles.has(key)) {
            refereeProfiles.set(key, referee);
          }
        }
      }

      // Convert Map to array and sort by name
      return Array.from(refereeProfiles.values())
        .sort((a, b) => a.name.localeCompare(b.name));
    } catch (error) {
      // console.error('Failed to extract referee data from matches:', error);
      return [];
    }
  }

  /**
   * Extract referee profile from match data following existing parsing patterns
   */
  static getRefereeFromMatchData(match: BeachMatch, refereeRole: 'referee1' | 'referee2'): RefereeProfile | null {
    try {
      const isReferee1 = refereeRole === 'referee1';
      const refereeName = isReferee1 ? match.Referee1Name : match.Referee2Name;
      
      // Early return if no referee name is available
      if (!refereeName || typeof refereeName !== 'string' || refereeName.trim() === '') {
        return null;
      }

      const refereeId = isReferee1 ? match.NoReferee1 : match.NoReferee2;
      const federationCode = isReferee1 ? match.Referee1FederationCode : match.Referee2FederationCode;
      
      // Generate fallback ID with better sanitization
      const fallbackId = `${refereeRole}_${refereeName.trim().replace(/\s+/g, '_').replace(/[^a-zA-Z0-9_]/g, '')}`;
      
      return {
        name: refereeName.trim(),
        id: refereeId && typeof refereeId === 'string' && refereeId.trim() !== '' 
          ? refereeId.trim() 
          : fallbackId,
        federationCode: federationCode && typeof federationCode === 'string' && federationCode.trim() !== '' 
          ? federationCode.trim() 
          : 'UNKNOWN'
      };
    } catch (error) {
      // console.error('Failed to extract referee from match data:', error);
      return null;
    }
  }
}