import { useQuery } from '@tanstack/react-query';
import { useState, useCallback, useEffect } from 'react';
import { queryKeys, cacheStrategies } from '../lib/queryClient';
import { MatchDTO } from '../services/DualReadService';
/**
 * `supabase` era USATO in questo file e non importato da nessuna parte.
 * `if (supabase)` su un identificatore inesistente solleva un
 * ReferenceError, che il try/catch intorno cattura e traduce in "database
 * vuoto": il ramo che legge dal DB non e' mai stato eseguito, e il difetto
 * si presentava come un ripiego sul VIS perfettamente normale. Terza
 * occorrenza dopo useOfflineSync e le altre due sorelle di questo hook.
 *
 * L'import arriva con la sua barriera: senza `isDbReadEnabled` questa
 * correzione riaprirebbe le letture dal database appena qualcuno
 * configurasse le variabili su Netlify — che e' esattamente cio' che la
 * issue #54 fase 2 ha chiuso. La bandiera e' spenta per definizione.
 */
import { supabase } from '../services/supabase';
import { isDbReadEnabled } from '../services/flags/DbReadFlags';

export interface MatchesFilters {
  tournamentCode?: string;
  eventId?: number;
  // FIX #27: year is now an explicit filter to scope cache keys per season.
  // Callers should always pass the year of the tournament being viewed.
  // Defaults to current year when omitted, so old callers are not broken.
  year?: number;
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
    // Nessun predefinito per `cacheStrategy`, di proposito: averlo rendeva
    // irraggiungibile tutta la determinazione automatica sotto (stesso difetto
    // di useReferees). Ogni partita, anche conclusa nel 2011, veniva servita
    // con cache `live` e ricaricata ogni 30 secondi.
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
    // La scelta ESPLICITA di chi chiama vince; il predefinito non conta come
    // scelta, altrimenti le regole qui sotto non vengono mai valutate.
    if (config.cacheStrategy) return config.cacheStrategy;
    
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

  // FIX #27: Always include year in the cache key to prevent cross-season contamination.
  // If the caller does not supply a year, derive it from the date filter or fall back to
  // the current calendar year.  This ensures that two tournaments that share the same
  // tournamentCode in different seasons NEVER resolve to the same TanStack Query entry.
  const resolvedYear =
    filters?.year ??
    (filters?.date ? new Date(filters.date).getFullYear() : undefined) ??
    (filters?.dateRange?.startDate ? new Date(filters.dateRange.startDate).getFullYear() : undefined) ??
    new Date().getFullYear();

  // Create query key using TanStack Query key factory — year is always part of the key.
  const queryKey = queryKeys.matches.list({ ...filters, year: resolvedYear });

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
      //
      // L'ORDINE lo decide la bandiera. `isDbReadEnabled('matches')` significa
      // "leggi dal database": finche' e' spenta — cioe' sempre, in produzione,
      // per definizione (#54 fase 2) — il VIS resta la sorgente primaria e qui
      // non cambia nulla. Quando la si accende per un dominio, il ramo
      // database deve venire PRIMA, altrimenti accenderla non ha alcun effetto
      // osservabile e la fase 3 non potrebbe mai essere verificata.
      // Il VIS diventa una FUNZIONE, non un blocco in una posizione fissa,
      // perche' l'ordine delle due sorgenti dipende dalla bandiera e serve
      // poterlo interpellare sia prima sia dopo il database. Gating il blocco
      // dov'era lo avrebbe tolto di mezzo invece di spostarlo, e con la
      // bandiera accesa una lettura a vuoto dal DB non avrebbe piu' avuto
      // alcun ripiego.
      const leggiDalVis = async (): Promise<MatchDTO[] | null> => {
        if (currentConfig.enableFallback === false) return null;
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
                // La variabile, non la costante `false`: se si arriva qui dopo
                // una lettura a vuoto dal database, il ripiego C'E' STATO.
                performance: { queryTime: endTime - startTime, fallbackUsed }
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
        return null;
      };

      // Bandiera SPENTA (il caso di produzione, oggi): il VIS e' primario.
      if (!isDbReadEnabled('matches')) {
        const daVis = await leggiDalVis();
        if (daVis) return daVis;
      }

      // Priority 2: Database fallback (for cached/offline scenarios)
      // Guard: never run an unfiltered query — it would return matches from all tournaments.
      if (!filters?.tournamentCode && !filters?.eventId) {
        return [];
      }

      if (supabase && isDbReadEnabled('matches')) {
        // `fallbackUsed` dice se si e' RIPIEGATO su una seconda sorgente, non
        // quale sorgente ha risposto (per quello c'e' `source`). Con la
        // bandiera accesa il database e' la sorgente PRIMARIA e il VIS non
        // viene nemmeno interpellato: marcarlo come ripiego riportava una
        // degradazione che non e' avvenuta.
        fallbackUsed = !isDbReadEnabled('matches');

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
        } else if (filters?.dateRange) {
          query = query.gte('utc_datetime', `${filters.dateRange.startDate}T00:00:00Z`)
                      .lt('utc_datetime', `${filters.dateRange.endDate}T23:59:59Z`);
        } else {
          // FIX #27: When no date filter is specified, always scope by year to prevent
          // the DB returning historical matches (e.g. 2013) for a tournament that has
          // the same tournament_code reused across seasons.
          const yearStart = `${resolvedYear}-01-01T00:00:00Z`;
          const yearEnd   = `${resolvedYear}-12-31T23:59:59Z`;
          query = query.gte('utc_datetime', yearStart).lte('utc_datetime', yearEnd);
        }

        const { data: dbData, error: dbError } = await query;
        
        if (!dbError && dbData && dbData.length > 0) {
          // Transform database data to MatchDTO format
          const matches: MatchDTO[] = dbData.map(row => {
            // Extract referee data
            const referees = row.match_referees || [];
            // `?.referees` puo' arrivare come oggetto o come array: PostgREST
            // restituisce un oggetto per una relazione molti-a-uno, ma
            // supabase-js con un client non tipizzato deduce un array dalla
            // stringa di `select`. Normalizzare regge entrambe le forme, il che
            // e' corretto comunque vada — e senza questo il codice leggeva
            // `first_name` su un array, ottenendo `undefined` in silenzio.
            const arbitro = (v: unknown): { first_name?: string; last_name?: string } | undefined =>
              Array.isArray(v) ? v[0] : (v as { first_name?: string; last_name?: string } | undefined);

            const referee1 = arbitro(referees.find(mr => mr.role === 'R1')?.referees);
            const referee2 = arbitro(referees.find(mr => mr.role === 'R2')?.referees);
            const challengeReferee = arbitro(referees.find(mr => mr.role === 'CHALLENGE')?.referees);

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

      // Bandiera ACCESA: il database ha risposto a vuoto, ora tocca al VIS.
      // Questo e' il ripiego vero, e qui `fallbackUsed` e' legittimo.
      if (isDbReadEnabled('matches')) {
        fallbackUsed = true;
        const daVis = await leggiDalVis();
        if (daVis) return daVis;
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
    enabled: Boolean(filters),
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
    // La configurazione esposta porta la strategia RISOLTA.
    config: { ...currentConfig, cacheStrategy },
    forceRefresh
  };
}

export default useMatches;
