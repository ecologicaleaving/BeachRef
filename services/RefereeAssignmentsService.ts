import AsyncStorage from '@react-native-async-storage/async-storage';
import { BeachMatch } from '../types/match';
import { RefereeAssignment, RefereeAssignmentStatus, RefereeProfile } from '../types/RefereeAssignments';
import { VisApiClient, DEFAULT_RETRY_CONFIG } from './api/VisApiClient';
import { CacheService } from './CacheService';

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
    enableLogging: true
  }, DEFAULT_RETRY_CONFIG);

  /**
   * Get the current referee profile from storage
   */
  static async getCurrentReferee(): Promise<RefereeProfile | null> {
    try {
      const storedProfile = await AsyncStorage.getItem(this.REFEREE_PROFILE_KEY);
      return storedProfile ? JSON.parse(storedProfile) : null;
    } catch (error) {
      console.error('Failed to get current referee profile:', error);
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
      console.error('Failed to save referee profile:', error);
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
   * Get referee assignments for selected tournament
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
          return cachedData;
        }
      }

      // Fetch match data from API/Cache
      const matches = await this.fetchMatchData(tournamentNo);
      
      // Filter for referee assignments
      const refereeAssignments = this.filterMatchesByReferee(matches, referee);
      
      // Categorize assignments
      const categorizedAssignments = this.categorizeAssignments(refereeAssignments);
      
      // Cache the results
      await this.cacheAssignments(tournamentNo, categorizedAssignments);
      
      return categorizedAssignments;
    } catch (error) {
      console.error('Failed to get referee assignments:', error);
      
      // Try to return cached data as fallback
      const cachedData = await this.getCachedAssignments(tournamentNo);
      if (cachedData) {
        return cachedData;
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
      console.warn('Cache service unavailable, using direct API:', error);
    }

    // Fallback to direct API call
    return await this.visApiClient.fetchMatchesForTournament(tournamentNo);
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
      console.warn('Failed to cache assignments:', error);
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
      console.warn('Failed to get cached assignments:', error);
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
      console.error('Failed to clear assignments cache:', error);
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
}