/**
 * Tournament Cache Warming Service
 * Part of Story 1.1: Tournament Cache Optimization - Task 3
 *
 * Implements proactive cache warming with background updates
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { TournamentMatchCache } from './TournamentMatchCache';
import { BeachMatchCore } from '../../types/match-v2';
import { VisApiClient } from '../api/VisApiClient';
import { DEFAULT_RETRY_CONFIG, GetBeachMatchListRequest } from '../../types/api-v2';
import { VisResponseParser } from '../parsing/VisResponseParser';
import { getVisApiBaseUrl } from '../../utils/visApiConfig';
import { cacheMmkvStorage } from './MmkvStorage';

interface RecentTournament {
  tournamentNo: string;
  lastViewed: string;
  status?: string;
  year?: number; // Tournament year for date-scoped API calls
}

export class TournamentCacheWarmingService {
  private static readonly RECENT_TOURNAMENTS_KEY = '@recent_tournaments_cache_warming';
  private static readonly MAX_RECENT_TOURNAMENTS = 5;
  private static readonly MAX_CONCURRENT_WARMING = 3;
  private static readonly WARMING_INTERVAL = 10 * 60 * 1000; // 10 minutes

  private static warmingInProgress = new Set<string>();
  private static warmingInterval: NodeJS.Timeout | null = null;

  /**
   * Start background cache warming service
   */
  static startBackgroundWarming(): void {
    // Initial warming immediately (no delay for faster startup)
    setTimeout(() => {
      this.warmFrequentTournaments().catch(error => {
        console.warn('Initial cache warming failed:', error);
      });
    }, 0); // Changed from 2000ms to 0ms for immediate execution

    // Set up periodic warming for live tournaments
    if (this.warmingInterval) {
      clearInterval(this.warmingInterval);
    }

    this.warmingInterval = setInterval(() => {
      this.warmFrequentTournaments().catch(error => {
        console.warn('Periodic cache warming failed:', error);
      });
    }, this.WARMING_INTERVAL);
  }

  /**
   * Stop background cache warming service
   */
  static stopBackgroundWarming(): void {
    if (this.warmingInterval) {
      clearInterval(this.warmingInterval);
      this.warmingInterval = null;
    }
  }

  /**
   * Warm cache for frequently accessed tournaments
   */
  static async warmFrequentTournaments(): Promise<void> {
    try {
      // Get recently viewed tournaments
      const recentTournaments = await this.getRecentlyViewedTournaments();

      // Get currently live tournaments (high priority)
      const liveTournaments = await this.getLiveTournaments();

      // Combine and deduplicate
      const allTournaments = [...recentTournaments, ...liveTournaments];
      const uniqueTournaments = Array.from(
        new Map(allTournaments.map(t => [t.tournamentNo, t])).values()
      );

      const tournamentsToWarm = uniqueTournaments.slice(0, this.MAX_RECENT_TOURNAMENTS);

      if (tournamentsToWarm.length === 0) {
        return;
      }

      // Warm in parallel but rate-limited
      const promises = tournamentsToWarm
        .slice(0, this.MAX_CONCURRENT_WARMING)
        .map(tournament => this.warmSingleTournament(tournament.tournamentNo, tournament.year));

      await Promise.all(promises);

    } catch (error) {
      console.warn('Cache warming failed:', error);
    }
  }

  /**
   * Warm cache for a single tournament
   * @param tournamentNo - Tournament number to warm
   * @param year - Tournament year for date-scoped API calls
   */
  private static async warmSingleTournament(tournamentNo: string, year?: number): Promise<void> {
    if (this.warmingInProgress.has(tournamentNo)) {
      return; // Already warming this tournament
    }

    this.warmingInProgress.add(tournamentNo);

    // Use provided year or default to current year
    const targetYear = year || new Date().getFullYear();

    try {
      // Check if already cached and fresh (with year)
      const hasFreshCache = await TournamentMatchCache.hasFreshCache(tournamentNo, targetYear);
      if (hasFreshCache) {
        return;
      }

      console.log(`🔥 Warming tournament ${tournamentNo} year ${targetYear}`);

      // Fetch with year filtering to avoid cross-year contamination
      const matches = await this.fetchTournamentMatches(tournamentNo, targetYear);

      if (matches && matches.length > 0) {
        // FIX #29: Filter matches to only include the target year
        // The VIS API may return matches from other years if tournamentNo is reused across seasons
        const filteredMatches = matches.filter(m => {
          const d = (m as any).scheduledDateTime || (m as any).LocalDate || (m as any).Date || (m as any).MatchDate;
          if (!d) return false; // REJECT matches without any date
          const matchYear = new Date(d).getFullYear();
          if (isNaN(matchYear)) return false;
          return matchYear === targetYear;
        });

        if (filteredMatches.length === 0) {
          console.warn(`⚠️ Warming ${tournamentNo}: all ${matches.length} matches filtered out (none from ${targetYear})`);
          return;
        }

        if (filteredMatches.length !== matches.length) {
          console.warn(`⚠️ Warming ${tournamentNo}: filtered ${matches.length - filteredMatches.length} wrong-year matches, keeping ${filteredMatches.length}`);
        }

        // Determine tournament status from filtered matches
        const status = this.determineTournamentStatus(filteredMatches);

        await TournamentMatchCache.cacheMatches(tournamentNo, filteredMatches, status, targetYear);
        console.log(`✅ Warmed cache for tournament ${tournamentNo} year ${targetYear} (${filteredMatches.length} matches)`);

        // Non-blocking AuxiliaryPersons fetch for match officials (specs/006-match-officials-display - T015)
        // Fire-and-forget: Don't block tournament display on official data
        this.warmAuxiliaryPersonsForTournament(tournamentNo).catch(error => {
          // Silent degradation - tournament data still works without officials
          console.debug(`[TournamentCacheWarming] AuxiliaryPersons warming failed for ${tournamentNo}:`, error);
        });
      }

    } catch (error) {
      console.warn(`Failed to warm tournament ${tournamentNo}:`, error);
    } finally {
      this.warmingInProgress.delete(tournamentNo);
    }
  }

  /**
   * Warm AuxiliaryPersons cache for a tournament (non-blocking)
   *
   * Fetches official data from GetEvent in background.
   * Failures are silent - tournament display continues without official names.
   *
   * @param eventNo Event number (tournament identifier)
   */
  private static async warmAuxiliaryPersonsForTournament(eventNo: string): Promise<void> {
    try {
      // Check if already cached
      const cached = await cacheMmkvStorage.getCachedAuxiliaryPersons(eventNo);
      if (cached) {
        return; // Already cached, skip fetch
      }

      const config = {
        baseUrl: getVisApiBaseUrl(),
        timeoutMs: 10000, // Shorter timeout for background fetch
        maxRetries: 1,
        retryDelayMs: 500,
        exponentialBackoff: false,
        enableLogging: false,
        headers: {}
      };

      const visApi = new VisApiClient(config, DEFAULT_RETRY_CONFIG);

      const response = await visApi.getEvent({
        eventNo,
        fields: ['AuxiliaryPersons']
      });

      if (response?.AuxiliaryPersons) {
        const auxiliaryPersons = visApi.parseAuxiliaryPersons(response.AuxiliaryPersons);
        await cacheMmkvStorage.cacheAuxiliaryPersons(eventNo, auxiliaryPersons, 120);
        console.debug(`[TournamentCacheWarming] Warmed AuxiliaryPersons for event ${eventNo} (${auxiliaryPersons.length} officials)`);
      }
    } catch (error) {
      // Silent failure - don't log errors, just debug info
      console.debug(`[TournamentCacheWarming] AuxiliaryPersons warming skipped for ${eventNo}`);
    }
  }

  /**
   * Track recently viewed tournament for cache warming
   * @param tournamentNo - Tournament number that was viewed
   * @param year - Tournament year (for date-scoped warming)
   */
  static async trackRecentlyViewed(tournamentNo: string, year?: number): Promise<void> {
    try {
      const recent = await this.getRecentlyViewedTournaments();

      // Remove if already exists and add to front
      const filtered = recent.filter(t => t.tournamentNo !== tournamentNo);
      const updated: RecentTournament[] = [
        { tournamentNo, lastViewed: new Date().toISOString(), year: year || new Date().getFullYear() },
        ...filtered
      ].slice(0, this.MAX_RECENT_TOURNAMENTS);

      await AsyncStorage.setItem(this.RECENT_TOURNAMENTS_KEY, JSON.stringify(updated));
    } catch (error) {
      console.warn('Failed to track recently viewed tournament:', error);
    }
  }

  /**
   * Get recently viewed tournaments
   */
  private static async getRecentlyViewedTournaments(): Promise<RecentTournament[]> {
    try {
      const stored = await AsyncStorage.getItem(this.RECENT_TOURNAMENTS_KEY);
      if (!stored) {
        return [];
      }

      const recent: RecentTournament[] = JSON.parse(stored);

      // Filter to tournaments viewed in last 7 days
      const sevenDaysAgo = Date.now() - (7 * 24 * 60 * 60 * 1000);
      return recent.filter(t => {
        const viewedTime = new Date(t.lastViewed).getTime();
        return viewedTime > sevenDaysAgo;
      });

    } catch (error) {
      console.warn('Failed to get recently viewed tournaments:', error);
      return [];
    }
  }

  /**
   * Get currently live tournaments (mock implementation - would integrate with tournament API)
   */
  private static async getLiveTournaments(): Promise<RecentTournament[]> {
    // TODO: Implement actual live tournament detection
    // For now, return empty array as this would require tournament list API integration
    return [];
  }

  /**
   * Fetch tournament matches from API
   * @param tournamentNo - Tournament number
   * @param year - Optional year to filter matches (defaults to current year)
   * @returns Array of matches or null if failed
   */
  private static async fetchTournamentMatches(tournamentNo: string, year?: number): Promise<BeachMatchCore[] | null> {
    try {
      const config = {
        baseUrl: getVisApiBaseUrl(), // Platform-aware: proxy for web, direct for native
        timeoutMs: 30000,
        maxRetries: 2, // Fewer retries for background warming
        retryDelayMs: 1000,
        exponentialBackoff: false,
        enableLogging: false, // Disable logging for background operations
        headers: {}
      };

      const visApi = new VisApiClient(config, DEFAULT_RETRY_CONFIG);

      // Only add year filtering if explicitly provided
      // This prevents filtering out matches from old tournaments
      const matchRequest: GetBeachMatchListRequest = {
        tournamentNo,
        includeResults: true,
        includeReferees: true,
        // Only filter by year if we know the tournament year
        ...(year && {
          startDate: `${year}-01-01`,
          endDate: `${year}-12-31`
        })
      };

      const matchResponse = await visApi.getBeachMatchList(matchRequest);

      if (matchResponse.success && matchResponse.xmlData) {
        const matches = VisResponseParser.parseBeachMatches(
          matchResponse.xmlData,
          undefined, // No timezone context for warming
          'M' as const, // Default gender - use const assertion
          undefined, // No tournament location
          tournamentNo
        );

        return matches;
      }

      return null;
    } catch (error) {
      console.warn(`Failed to fetch matches for tournament ${tournamentNo}:`, error);
      return null;
    }
  }

  /**
   * Determine tournament status from match data
   * @param matches - Array of matches
   * @returns Tournament status string
   */
  private static determineTournamentStatus(matches: BeachMatchCore[]): string {
    if (!matches || matches.length === 0) {
      return 'SCHEDULED';
    }

    // Check if any matches are live
    const hasLiveMatches = matches.some(match =>
      match.status === 'RUNNING' ||
      (typeof match.rawStatus === 'number' && match.rawStatus >= 3 && match.rawStatus <= 8)
    );

    if (hasLiveMatches) {
      return 'LIVE';
    }

    // Check if all matches are finished
    const allFinished = matches.every(match =>
      match.status === 'FINISHED' ||
      (typeof match.rawStatus === 'number' && match.rawStatus >= 9)
    );

    if (allFinished) {
      return 'COMPLETED';
    }

    return 'SCHEDULED';
  }

  /**
   * Get warming service stats for debugging
   */
  static getWarmingStats(): {
    currentlyWarming: string[];
    intervalActive: boolean;
    maxConcurrent: number;
  } {
    return {
      currentlyWarming: Array.from(this.warmingInProgress),
      intervalActive: this.warmingInterval !== null,
      maxConcurrent: this.MAX_CONCURRENT_WARMING
    };
  }
}