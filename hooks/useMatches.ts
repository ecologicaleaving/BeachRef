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
 * Modern matches hook with VIS API-first strategy following documented architecture
 * Provides complete match data with set scores directly from VIS API
 * Uses database as fallback cache for offline/error scenarios
 */
// SetScoreService enhancement removed - VIS API now provides complete data with set scores directly

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

  // Real-time subscription setup for live matches (VIS API-first approach)
  useEffect(() => {
    // Note: Real-time updates will be handled by TanStack Query refetch intervals
    // when cacheStrategy === 'live', fetching fresh data from VIS API
  }, [cacheStrategy, filters?.tournamentCode]);

  // VIS API-first query function following documented architecture
  const queryFn = async (): Promise<MatchDTO[]> => {
    const startTime = Date.now();
    let fallbackUsed = false;
    
    try {
      // Priority 1: VIS API via VIS Adapter (as per documentation)
      // This ensures we get complete match data with set scores directly from VIS API
      if (currentConfig.enableFallback !== false) { // VIS API is now primary, not fallback
        try {
          // Build query parameters for VIS Adapter (following documented architecture)
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
              
              // Update metadata - VIS API is now primary source
              setReadMetadata({
                source: 'api',
                performance: { queryTime: endTime - startTime, fallbackUsed: false }
              });

              let matches = visResult.data;
              
              // VIS API already provides complete data with set scores - no SetScoreService needed
                
              // Apply referee grouping if requested
              if (currentConfig.groupByReferee) {
                matches = groupMatchesByReferee(matches);
              }

              return matches;
            }
          }
        } catch (error) {
          // VIS Adapter request failed, continue to database fallback
        }
      }

      // Priority 2: Database fallback (for cached/offline scenarios)
      if (supabase) {
        fallbackUsed = true;
        
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
            actual_start_time,
            actual_end_time,
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

        // Apply filters
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
          const matches: MatchDTO[] = dbData.map(row => {
            // Extract referee data
            const referees = row.match_referees || [];
            const referee1 = referees.find(mr => mr.role === 'R1')?.referees;
            const referee2 = referees.find(mr => mr.role === 'R2')?.referees;
            const challengeReferee = referees.find(mr => mr.role === 'CHALLENGE')?.referees;

            const referee1Name = referee1 ? `${referee1.first_name} ${referee1.last_name}`.trim() : '';
            const referee2Name = referee2 ? `${referee2.first_name} ${referee2.last_name}`.trim() : '';
            const challengeRefereeName = challengeReferee ? `${challengeReferee.first_name} ${challengeReferee.last_name}`.trim() : '';

            // Parse cached set scores if available
            let setScores: Array<{ a: number; b: number }> = [];
            if (row.sets && Array.isArray(row.sets)) {
              // Convert from number[] to { a, b }[] format
              const flatScores = row.sets;
              for (let i = 0; i < flatScores.length; i += 2) {
                if (i + 1 < flatScores.length) {
                  setScores.push({ a: flatScores[i], b: flatScores[i + 1] });
                }
              }
            }

            return {
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
              result: setScores.length > 0 ? {
                team1Sets: 0,
                team2Sets: 0,
                setScores: setScores,
                winner: row.result?.winner,
                forfeit: row.result?.forfeit,
                duration: row.result?.duration,
              } : undefined,
              // Legacy compatibility fields
              Referee1Name: referee1Name,
              Referee2Name: referee2Name,
              ChallengeRefereeName: challengeRefereeName,
            } as MatchDTO & any;
          });

          const endTime = Date.now();
          
          // Update metadata
          setReadMetadata({
            source: 'database',
            performance: { queryTime: endTime - startTime, fallbackUsed }
          });


          if (currentConfig.groupByReferee) {
            return groupMatchesByReferee(matches);
          }

          return matches;
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