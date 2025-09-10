import { useQuery } from '@tanstack/react-query';
import { useState, useCallback, useEffect } from 'react';
import { supabase } from '../services/supabase';
import { queryKeys, cacheStrategies, createQueryOptions } from '../lib/queryClient';
import { MatchDTO } from '../services/DualReadService';

export interface MatchesFilters {
  tournamentCode?: string;
  eventId?: number;
  round?: string;
  status?: 'SCHEDULED' | 'RUNNING' | 'COMPLETED' | 'CANCELLED';
  date?: string;
  dateRange?: {
    startDate: string;
    endDate: string;
  };
}

export interface MatchesConfig {
  enableFallback?: boolean;
  enablePerformanceMonitoring?: boolean;
  cacheStrategy?: 'live' | 'historical' | 'static';
  groupByReferee?: boolean;
  includeCourt?: boolean;
}

export interface MatchesQueryResult {
  // Base query result properties
  data: MatchDTO[] | undefined;
  error: Error | null;
  isLoading: boolean;
  isError: boolean;
  isSuccess: boolean;
  refetch: () => Promise<any>;
  
  // Custom properties
  source: 'database' | 'api' | 'unknown';
  performance: {
    queryTime: number;
    fallbackUsed: boolean;
  };
  config: MatchesConfig;
  forceRefresh: () => Promise<void>;
}

/**
 * Simplified matches hook with database-first strategy and intelligent cache strategies
 * Provides real-time updates for live matches and historical caching for completed matches
 */
export function useMatches(
  filters?: MatchesFilters,
  config: MatchesConfig = {}
): MatchesQueryResult {
  const [currentConfig] = useState<MatchesConfig>({
    enableFallback: true,
    enablePerformanceMonitoring: true,
    cacheStrategy: 'live',
    groupByReferee: false,
    includeCourt: true,
    ...config
  });

  const [readMetadata, setReadMetadata] = useState<{
    source: 'database' | 'api' | 'unknown';
    performance: { queryTime: number; fallbackUsed: boolean };
  }>({
    source: 'unknown',
    performance: { queryTime: 0, fallbackUsed: false }
  });

  // Intelligent cache strategy: determine if data is live or historical
  const determineCacheStrategy = (): 'live' | 'historical' | 'static' => {
    if (currentConfig.cacheStrategy) return currentConfig.cacheStrategy;
    
    // Auto-determine based on filters and dates
    if (filters?.status === 'RUNNING' || filters?.status === 'SCHEDULED') return 'live';
    if (filters?.status === 'COMPLETED' || filters?.status === 'CANCELLED') return 'historical';
    
    // Check if data is historical (older than 3 days)
    if (filters?.date) {
      const today = new Date();
      const filterDate = new Date(filters.date);
      const threeDaysAgo = new Date(today.getTime() - (3 * 24 * 60 * 60 * 1000));
      
      if (filterDate < threeDaysAgo) return 'historical';
      if (filterDate.toDateString() === today.toDateString()) return 'live';
    }
    
    if (filters?.dateRange) {
      const today = new Date();
      const endDate = new Date(filters.dateRange.endDate);
      const threeDaysAgo = new Date(today.getTime() - (3 * 24 * 60 * 60 * 1000));
      
      if (endDate < threeDaysAgo) return 'historical';
    }
    
    // Default to live for recent/current data
    return 'live';
  };

  const cacheStrategy = determineCacheStrategy();
  
  // Create query key using TanStack Query key factory
  const queryKey = queryKeys.matches.list(filters);

  // Real-time subscription setup for live matches (simplified for database-first approach)
  useEffect(() => {
    // Note: Real-time updates will be handled by TanStack Query refetch intervals
    // when cacheStrategy === 'live'
  }, [cacheStrategy, filters?.tournamentCode]);

  // Database-first query function with VIS Adapter fallback
  const queryFn = async (): Promise<MatchDTO[]> => {
    const startTime = Date.now();
    let fallbackUsed = false;
    
    try {
      // Priority 1: Direct Supabase database query
      if (supabase) {
        let query = supabase
          .from('matches')
          .select(`
            id,
            vis_match_no,
            tournament_code,
            event_id,
            round_code,
            round_name,
            round_phase,
            utc_datetime,
            local_datetime,
            court,
            team_a_name,
            team_b_name,
            sets,
            result,
            status,
            created_at,
            match_referees (
              role,
              referees (
                id,
                vis_referee_no,
                first_name,
                last_name,
                federation
              )
            )
          `);

        // Apply filters using database indexes for optimal performance
        if (filters?.tournamentCode) {
          query = query.eq('tournament_code', filters.tournamentCode);
        }
        if (filters?.eventId) {
          query = query.eq('event_id', filters.eventId);
        }
        if (filters?.round) {
          query = query.eq('round_code', filters.round);
        }
        if (filters?.status) {
          query = query.eq('status', filters.status);
        }
        if (filters?.date) {
          query = query.gte('utc_datetime', `${filters.date}T00:00:00Z`)
                      .lt('utc_datetime', `${filters.date}T23:59:59Z`);
        }
        if (filters?.dateRange) {
          query = query.gte('utc_datetime', `${filters.dateRange.startDate}T00:00:00Z`)
                      .lt('utc_datetime', `${filters.dateRange.endDate}T23:59:59Z`);
        }

        const { data: dbData, error: dbError } = await query;
        
        if (!dbError && dbData && dbData.length > 0) {
          // Transform database data to MatchDTO format
          const matches: MatchDTO[] = dbData.map(row => ({
            id: row.id.toString(),
            visNo: row.vis_match_no?.toString() || '',
            tournamentCode: row.tournament_code,
            matchCode: `${row.tournament_code}-${row.vis_match_no}`,
            round: row.round_name || row.round_code || '',
            phaseCode: row.round_phase,
            status: (row.status as 'SCHEDULED' | 'RUNNING' | 'FINISHED' | 'INTERRUPTED' | 'CANCELLED' | 'POSTPONED' | 'TBD') || 'SCHEDULED',
            court: {
              courtNumber: row.court || '',
              courtName: row.court,
            },
            scheduledDateTime: row.utc_datetime || row.local_datetime || '',
            actualStartTime: row.status === 'RUNNING' ? row.utc_datetime : undefined,
            team1: {
              teamNumber: 1,
              teamName: row.team_a_name || '',
              player1Name: '',
              player2Name: '',
            },
            team2: {
              teamNumber: 2,
              teamName: row.team_b_name || '',
              player1Name: '',
              player2Name: '',
            },
            result: row.result ? {
              team1Sets: 0,
              team2Sets: 0,
              setScores: row.sets || [],
              winner: row.result.winner,
              forfeit: row.result.forfeit,
            } : undefined,
          }));

          const endTime = Date.now();
          
          // Update metadata
          setReadMetadata({
            source: 'database',
            performance: { queryTime: endTime - startTime, fallbackUsed }
          });

          // Apply referee grouping if requested
          if (currentConfig.groupByReferee) {
            return groupMatchesByReferee(matches);
          }

          return matches;
        }
      }

      // Priority 2: VIS Adapter fallback (if enabled and database failed/empty)
      if (currentConfig.enableFallback) {
        fallbackUsed = true;
        
        // Build query parameters for VIS Adapter
        const queryParams = new URLSearchParams();
        if (filters?.tournamentCode) queryParams.append('tournamentCode', filters.tournamentCode);
        if (filters?.eventId) queryParams.append('eventId', filters.eventId.toString());
        if (filters?.round) queryParams.append('round', filters.round);
        if (filters?.status) queryParams.append('status', filters.status);
        if (filters?.date) queryParams.append('date', filters.date);
        if (filters?.dateRange) {
          queryParams.append('startDate', filters.dateRange.startDate);
          queryParams.append('endDate', filters.dateRange.endDate);
        }
        queryParams.append('mode', 'upsert');
        
        const visUrl = process.env.EXPO_PUBLIC_SUPABASE_URL?.replace('/rest/v1', '') + 
                      `/functions/v1/vis-adapter/vis/matches?${queryParams}`;
        
        const response = await fetch(visUrl, {
          headers: {
            'Authorization': `Bearer ${process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY}`,
            'Content-Type': 'application/json',
          },
        });

        if (response.ok) {
          const visResult = await response.json();
          if (visResult.success && visResult.data) {
            const endTime = Date.now();
            
            // Update metadata
            setReadMetadata({
              source: 'api',
              performance: { queryTime: endTime - startTime, fallbackUsed }
            });

            let matches = visResult.data;
            
            // Apply referee grouping if requested
            if (currentConfig.groupByReferee) {
              matches = groupMatchesByReferee(matches);
            }

            return matches;
          }
        }
      }

      // No data found from database or fallback
      const endTime = Date.now();
      setReadMetadata({
        source: 'unknown',
        performance: { queryTime: endTime - startTime, fallbackUsed }
      });

      return [];
    } catch (error) {
      const endTime = Date.now();
      
      // Update metadata with error state
      setReadMetadata({
        source: 'unknown',
        performance: { queryTime: endTime - startTime, fallbackUsed }
      });
      
      console.error('Match query error:', error);
      throw error;
    }
  };

  // Helper function to group matches by referee (simplified for database-first approach)
  const groupMatchesByReferee = (matches: MatchDTO[]): MatchDTO[] => {
    // Simple sort by match code for consistent ordering
    // Note: Referee assignment grouping will be enhanced in future iterations
    return matches.sort((a, b) => a.matchCode.localeCompare(b.matchCode));
  };

  // Determine if we have live matches for cache strategy adjustment
  const hasLiveMatches = filters?.status === 'RUNNING' || 
                        filters?.status === 'SCHEDULED' ||
                        !filters?.status; // If no status filter, assume we might have live matches

  // Apply intelligent cache strategy based on match data type
  const cacheOptions = cacheStrategies[cacheStrategy];

  const query = useQuery({
    queryKey,
    queryFn,
    ...cacheOptions,
    retry: (failureCount, error) => {
      // More aggressive retries for live matches
      const maxRetries = hasLiveMatches ? 5 : 3;
      if (failureCount >= maxRetries) return false;
      
      // Don't retry if it's a configuration error
      if (error.message.includes('not configured')) return false;
      
      return true;
    },
    retryDelay: (attemptIndex) => {
      // Faster retry for live matches
      const baseDelay = hasLiveMatches ? 500 : 1000;
      return Math.min(baseDelay * 2 ** attemptIndex, 30000);
    },
    // Network mode: always try to fetch, even when offline (database might still work)
    networkMode: 'always'
  });

  // Force refresh function
  const forceRefresh = useCallback(async () => {
    await query.refetch();
  }, [query]);

  return {
    ...query,
    source: readMetadata.source,
    performance: readMetadata.performance,
    config: currentConfig,
    forceRefresh
  };
}

export default useMatches;