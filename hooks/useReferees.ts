import { useQuery } from '@tanstack/react-query';
import { useState, useCallback } from 'react';
import { supabase } from '../services/supabase';
import { queryKeys, cacheStrategies } from '../lib/queryClient';
import { RefereeDTO } from '../services/DualReadService';

export interface RefereesFilters {
  tournamentCodes?: string[];
  federationCode?: string;
  status?: 'ACTIVE' | 'INACTIVE' | 'SUSPENDED' | 'RESTRICTED';
  assignmentStatus?: 'assigned' | 'available' | 'all';
  includeAssignments?: boolean;
  role?: 'Referee1' | 'Referee2' | 'ChallengeReferee' | 'TechnicalOfficial' | 'TournamentDirector' | 'MatchCommissioner';
}

export interface RefereesConfig {
  enableFallback?: boolean;
  enablePerformanceMonitoring?: boolean;
  cacheStrategy?: 'live' | 'historical' | 'static';
  includeAssignments?: boolean;
  groupByFederation?: boolean;
}

export interface RefereesQueryResult {
  // Base query result properties
  data: RefereeDTO[] | undefined;
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
  config: RefereesConfig;
  forceRefresh: () => Promise<void>;
  assignmentCounts: {
    total: number;
    assigned: number;
    available: number;
  };
}

/**
 * Simplified referees hook with database-first strategy and assignment status support
 * Delivers improved performance over API-only approach with federation filtering
 */
export function useReferees(
  filters?: RefereesFilters,
  config: RefereesConfig = {}
): RefereesQueryResult {
  const [currentConfig] = useState<RefereesConfig>({
    enableFallback: true,
    enablePerformanceMonitoring: true,
    cacheStrategy: 'static',
    includeAssignments: false,
    groupByFederation: false,
    ...config
  });

  const [readMetadata, setReadMetadata] = useState<{
    source: 'database' | 'api' | 'unknown';
    performance: { queryTime: number; fallbackUsed: boolean };
  }>({
    source: 'unknown',
    performance: { queryTime: 0, fallbackUsed: false }
  });

  const [assignmentCounts, setAssignmentCounts] = useState({
    total: 0,
    assigned: 0,
    available: 0
  });

  // Determine cache strategy based on filters and configuration
  const determineCacheStrategy = (): 'live' | 'historical' | 'static' => {
    if (currentConfig.cacheStrategy) return currentConfig.cacheStrategy;
    
    // Auto-determine based on assignment status
    if (filters?.assignmentStatus === 'assigned') return 'live';
    if (filters?.status === 'ACTIVE') return 'live';
    if (filters?.status === 'INACTIVE' || filters?.status === 'SUSPENDED') return 'historical';
    
    // Default to static for referee reference data
    return 'static';
  };

  const cacheStrategy = determineCacheStrategy();
  
  // Create query key using TanStack Query key factory
  const queryKey = queryKeys.referees.list(filters);

  // Database-first query function with VIS Adapter fallback
  const queryFn = async (): Promise<RefereeDTO[]> => {
    const startTime = Date.now();
    let fallbackUsed = false;
    
    try {
      // Priority 1: Direct Supabase database query
      if (supabase) {
        let query = supabase
          .from('referees')
          .select(`
            id,
            vis_referee_no,
            first_name,
            last_name,
            gender,
            federation,
            birthdate,
            created_at,
            updated_at
          `);

        // Apply filters using database indexes for optimal performance
        if (filters?.federationCode) {
          query = query.eq('federation', filters.federationCode);
        }
        if (filters?.status) {
          // Map status to database fields - for now, assume all are ACTIVE
          // This would need to be enhanced with actual status field in database
          query = query.not('federation', 'is', null);
        }

        const { data: dbData, error: dbError } = await query;
        
        if (!dbError && dbData && dbData.length > 0) {
          // Transform database data to RefereeDTO format
          let referees: RefereeDTO[] = dbData.map(row => ({
            id: row.id.toString(),
            refereeId: row.vis_referee_no?.toString() || row.id.toString(),
            name: `${row.first_name || ''} ${row.last_name || ''}`.trim(),
            firstName: row.first_name || '',
            lastName: row.last_name || '',
            federationCode: row.federation || '',
            gender: row.gender as 'M' | 'W',
            status: 'ACTIVE' as const, // Default status
            type: 'REFEREE' as const,
            assignmentStatus: {
              current: 0,
              upcoming: 0,
              completed: 0,
              online: false
            },
            assignments: []
          }));

          // Apply assignment status filtering if requested
          if (filters?.assignmentStatus && filters.assignmentStatus !== 'all') {
            // For database-first approach, we'll need to enhance this with actual assignment queries
            // For now, show all referees for 'available' status
            if (filters.assignmentStatus === 'assigned') {
              referees = referees.filter(ref => (ref.assignmentStatus?.current || 0) > 0);
            }
          }

          // Apply federation grouping if requested
          if (currentConfig.groupByFederation) {
            referees = groupRefereesByFederation(referees);
          }

          // Calculate assignment counts
          const counts = calculateAssignmentCounts(referees);
          setAssignmentCounts(counts);

          const endTime = Date.now();
          
          // Update metadata
          setReadMetadata({
            source: 'database',
            performance: { queryTime: endTime - startTime, fallbackUsed }
          });

          return referees;
        }
      }

      // Priority 2: VIS Adapter fallback (if enabled and database failed/empty)
      if (currentConfig.enableFallback) {
        fallbackUsed = true;
        
        // Build query parameters for VIS Adapter
        const queryParams = new URLSearchParams();
        if (filters?.federationCode) queryParams.append('federationCode', filters.federationCode);
        if (filters?.status) queryParams.append('status', filters.status);
        if (filters?.assignmentStatus) queryParams.append('assignmentStatus', filters.assignmentStatus);
        if (filters?.tournamentCodes?.length) {
          filters.tournamentCodes.forEach(code => queryParams.append('tournamentCode', code));
        }
        queryParams.append('mode', 'upsert');
        
        const visUrl = process.env.EXPO_PUBLIC_SUPABASE_URL?.replace('/rest/v1', '') + 
                      `/functions/v1/vis-adapter/vis/referees?${queryParams}`;
        
        const response = await fetch(visUrl, {
          headers: {
            'Authorization': `Bearer ${process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY}`,
            'Content-Type': 'application/json',
          },
        });

        if (response.ok) {
          const visResult = await response.json();
          if (visResult.success && visResult.data) {
            let referees = visResult.data;
            
            // Apply federation grouping if requested
            if (currentConfig.groupByFederation) {
              referees = groupRefereesByFederation(referees);
            }

            // Calculate assignment counts
            const counts = calculateAssignmentCounts(referees);
            setAssignmentCounts(counts);

            const endTime = Date.now();
            
            // Update metadata
            setReadMetadata({
              source: 'api',
              performance: { queryTime: endTime - startTime, fallbackUsed }
            });

            return referees;
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
      
      console.error('Referee query error:', error);
      throw error;
    }
  };

  // Helper function to calculate assignment counts
  const calculateAssignmentCounts = (referees: RefereeDTO[]) => {
    return referees.reduce((counts, referee) => {
      counts.total++;
      
      const hasActiveAssignments = (referee.assignmentStatus?.current || 0) > 0;
      if (hasActiveAssignments) {
        counts.assigned++;
      } else {
        counts.available++;
      }
      
      return counts;
    }, {
      total: 0,
      assigned: 0,
      available: 0
    });
  };

  // Helper function to group referees by federation
  const groupRefereesByFederation = (referees: RefereeDTO[]): RefereeDTO[] => {
    // Sort referees by federation code for better grouping
    return referees.sort((a, b) => {
      const fedA = a.federationCode || '';
      const fedB = b.federationCode || '';
      
      // Primary sort by federation
      if (fedA !== fedB) {
        return fedA.localeCompare(fedB);
      }
      
      // Secondary sort by name within federation
      return a.name.localeCompare(b.name);
    });
  };

  // Apply intelligent cache strategy based on referee data type
  const cacheOptions = cacheStrategies[cacheStrategy];

  const query = useQuery({
    queryKey,
    queryFn,
    ...cacheOptions,
    retry: (failureCount, error) => {
      // Conservative retries for referee data
      const maxRetries = 3;
      if (failureCount >= maxRetries) return false;
      
      // Don't retry if it's a configuration error
      if (error.message.includes('not configured')) return false;
      
      return true;
    },
    retryDelay: (attemptIndex) => {
      // Standard retry delay for referee queries
      const baseDelay = 1000;
      return Math.min(baseDelay * 2 ** attemptIndex, 20000);
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
    forceRefresh,
    assignmentCounts
  };
}

export default useReferees;