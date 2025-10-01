/**
 * Tournament Cache Warming Service
 * Part of Story 1.1: Tournament Cache Optimization - Task 3
 *
 * Implements proactive cache warming with background updates
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { TournamentMatchCache } from './TournamentMatchCache';
import { TournamentStorageService } from '../TournamentStorageService';
import { BeachMatchCore } from '../../types/match-v2';
import { VisApiClient } from '../api/VisApiClient';
import { DEFAULT_RETRY_CONFIG, GetBeachMatchListRequest, GetBeachTournamentRequest } from '../../types/api-v2';
import { VisResponseParser } from '../parsing/VisResponseParser';

interface RecentTournament {
  tournamentNo: string;
  lastViewed: string;
  status?: string;
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
    // Initial warming after a short delay
    setTimeout(() => {
      this.warmFrequentTournaments().catch(error => {
        console.warn('Initial cache warming failed:', error);
      });
    }, 2000);

    // Set up periodic warming for live tournaments
    if (this.warmingInterval) {
      clearInterval(this.warmingInterval);
    }

    this.warmingInterval = setInterval(() => {
      this.warmFrequentTournaments().catch(error => {
        console.warn('Periodic cache warming failed:', error);
      });
    }, this.WARMING_INTERVAL);

    console.log('🔥 Tournament cache warming service started');
  }

  /**
   * Stop background cache warming service
   */
  static stopBackgroundWarming(): void {
    if (this.warmingInterval) {
      clearInterval(this.warmingInterval);
      this.warmingInterval = null;
    }
    console.log('🛑 Tournament cache warming service stopped');
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

      console.log(`🔥 Cache warming ${tournamentsToWarm.length} tournaments`);

      // Warm in parallel but rate-limited
      const promises = tournamentsToWarm
        .slice(0, this.MAX_CONCURRENT_WARMING)
        .map(tournament => this.warmSingleTournament(tournament.tournamentNo));

      await Promise.all(promises);

    } catch (error) {
      console.warn('Cache warming failed:', error);
    }
  }

  /**
   * Warm cache for a single tournament
   * @param tournamentNo - Tournament number to warm
   */
  private static async warmSingleTournament(tournamentNo: string): Promise<void> {
    if (this.warmingInProgress.has(tournamentNo)) {
      return; // Already warming this tournament
    }

    this.warmingInProgress.add(tournamentNo);

    try {
      // Check if already cached and fresh
      const hasFreshCache = await TournamentMatchCache.hasFreshCache(tournamentNo);
      if (hasFreshCache) {
        return;
      }

      console.log(`🔥 Warming tournament ${tournamentNo}`);

      // Fetch and cache tournament data
      const matches = await this.fetchTournamentMatches(tournamentNo);

      if (matches && matches.length > 0) {
        // Determine tournament status from matches
        const status = this.determineTournamentStatus(matches);
        await TournamentMatchCache.cacheMatches(tournamentNo, matches, status);
        console.log(`✅ Successfully warmed cache for tournament ${tournamentNo} (${matches.length} matches)`);
      }

    } catch (error) {
      console.warn(`Failed to warm tournament ${tournamentNo}:`, error);
    } finally {
      this.warmingInProgress.delete(tournamentNo);
    }
  }

  /**
   * Track recently viewed tournament for cache warming
   * @param tournamentNo - Tournament number that was viewed
   */
  static async trackRecentlyViewed(tournamentNo: string): Promise<void> {
    try {
      const recent = await this.getRecentlyViewedTournaments();

      // Remove if already exists and add to front
      const filtered = recent.filter(t => t.tournamentNo !== tournamentNo);
      const updated: RecentTournament[] = [
        { tournamentNo, lastViewed: new Date().toISOString() },
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
   * @returns Array of matches or null if failed
   */
  private static async fetchTournamentMatches(tournamentNo: string): Promise<BeachMatchCore[] | null> {
    try {
      const config = {
        baseUrl: 'https://www.fivb.org/Vis2009/XmlRequest.asmx',
        timeoutMs: 30000,
        maxRetries: 2, // Fewer retries for background warming
        retryDelayMs: 1000,
        exponentialBackoff: false,
        enableLogging: false, // Disable logging for background operations
        headers: {}
      };

      const visApi = new VisApiClient(config, DEFAULT_RETRY_CONFIG);

      const matchRequest: GetBeachMatchListRequest = {
        tournamentNo,
        includeResults: true,
        includeReferees: true
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