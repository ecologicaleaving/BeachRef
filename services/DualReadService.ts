import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { NetworkMonitor } from './NetworkMonitor';
import { ErrorLogger } from './ErrorLogger';
import { ConnectionCircuitBreaker } from './ConnectionCircuitBreaker';
import { CacheService } from './CacheService';
import { FilterOptions } from '../types/cache';

export type ReadStrategy = 'db_first' | 'api_first' | 'db_only' | 'api_only';

export interface DualReadConfig {
  readStrategy: ReadStrategy;
  fallbackEnabled: boolean;
  dbTimeoutMs: number;
  apiTimeoutMs: number;
  enablePerformanceMonitoring: boolean;
  cacheInvalidationStrategy: 'immediate' | 'scheduled' | 'manual';
  consistencyCheckEnabled: boolean;
}

export interface ReadResult<T> {
  data: T | null;
  source: 'database' | 'api' | 'cache';
  timestamp: number;
  performance: {
    queryTime: number;
    fallbackUsed: boolean;
    consistencyCheck?: boolean;
  };
  error?: string;
}

export interface TournamentDTO {
  id: string;
  visNo: string;
  code: string;
  name: string;
  title?: string;
  gender: 'M' | 'W' | 'MIXED';
  tournamentType: 'FIVB' | 'BPT' | 'CEV' | 'LOCAL';
  dates: {
    startDate: string;
    endDate: string;
    startDateQualification?: string;
    startDateMainDraw?: string;
  };
  status: 'UPCOMING' | 'ACTIVE' | 'COMPLETED' | 'CANCELLED';
  city?: string;
  country?: string;
  countryCode?: string;
  location?: string;
}

export interface RefereeDTO {
  id: string;
  refereeId: string;
  name: string;
  firstName: string;
  lastName: string;
  federationCode: string;
  gender: 'M' | 'W';
  status: 'ACTIVE' | 'INACTIVE' | 'SUSPENDED' | 'RESTRICTED';
  type: 'REFEREE' | 'TECHNICAL' | 'ADMINISTRATIVE';
  role?: 'Referee1' | 'Referee2' | 'ChallengeReferee' | 'TechnicalOfficial' | 'TournamentDirector' | 'MatchCommissioner';
  assignmentStatus?: {
    current: number;
    upcoming: number;
    completed: number;
    online: boolean;
  };
  assignments?: RefereeAssignmentDTO[];
}

export interface RefereeAssignmentDTO {
  id: string;
  matchId: string;
  matchNo: string;
  refereeId: string;
  position: 'R1' | 'R2' | 'CR';
  status: 'ASSIGNED' | 'CONFIRMED' | 'COMPLETED' | 'CANCELLED';
  tournamentCode: string;
  court: string;
  scheduledDateTime: string;
  team1Name: string;
  team2Name: string;
  round: string;
  assignedAt: string;
  updatedAt?: string;
}

export interface MatchDTO {
  id: string;
  visNo: string;
  tournamentCode: string;
  matchCode: string;
  round: string;
  phaseCode?: string;
  status: 'SCHEDULED' | 'RUNNING' | 'FINISHED' | 'INTERRUPTED' | 'CANCELLED' | 'POSTPONED' | 'TBD';
  court: {
    courtNumber: string;
    courtName?: string;
    surface?: string;
    location?: string;
  };
  scheduledDateTime: string;
  actualStartTime?: string;
  actualEndTime?: string;
  team1: {
    teamNumber: 1;
    teamName: string;
    player1Name: string;
    player2Name: string;
    countryCode?: string;
    ranking?: number;
  };
  team2: {
    teamNumber: 2;
    teamName: string;
    player1Name: string;
    player2Name: string;
    countryCode?: string;
    ranking?: number;
  };
  result?: {
    team1Sets: number;
    team2Sets: number;
    setScores: Array<{ a: number; b: number }>;
    duration?: number;
    winner?: 1 | 2;
    forfeit?: boolean;
  };
}

export interface EventDTO {
  id: string;
  visEventNo: string;
  eventCode?: string;
  tournamentId: string;
  gender: 'M' | 'W';
  phase?: string;
  name?: string;
  country?: string;
  startDate?: string;
  endDate?: string;
  status?: string;
}

/**
 * Dual-Read Data Access Service
 * Provides seamless access to data from database with API fallback
 * Supports multiple read strategies and performance monitoring
 */
export class DualReadService {
  private static instance: DualReadService | null = null;
  private supabase: SupabaseClient;
  private networkMonitor: NetworkMonitor;
  private errorLogger: ErrorLogger;
  private circuitBreaker: ConnectionCircuitBreaker;
  private cacheService: CacheService;

  private config: DualReadConfig = {
    readStrategy: 'db_first',
    fallbackEnabled: true,
    dbTimeoutMs: 5000,
    apiTimeoutMs: 10000,
    enablePerformanceMonitoring: true,
    cacheInvalidationStrategy: 'immediate',
    consistencyCheckEnabled: false
  };

  private performanceMetrics: Map<string, {
    avgDbTime: number;
    avgApiTime: number;
    dbSuccessRate: number;
    apiSuccessRate: number;
    fallbackRate: number;
    totalRequests: number;
  }> = new Map();

  private constructor() {
    this.supabase = createClient(
      process.env.EXPO_PUBLIC_SUPABASE_URL!,
      process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!
    );
    this.networkMonitor = NetworkMonitor.getInstance();
    this.errorLogger = ErrorLogger.getInstance();
    this.circuitBreaker = ConnectionCircuitBreaker.getInstance();
    this.cacheService = CacheService.getInstance();
  }

  static getInstance(): DualReadService {
    if (!DualReadService.instance) {
      DualReadService.instance = new DualReadService();
    }
    return DualReadService.instance;
  }

  /**
   * Configure dual read behavior
   */
  configure(config: Partial<DualReadConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Get tournaments with dual-read strategy
   */
  async getTournaments(filters?: {
    season?: number;
    gender?: 'M' | 'W';
    country?: string;
    status?: string;
  }): Promise<ReadResult<TournamentDTO[]>> {
    const startTime = Date.now();
    let fallbackUsed = false;

    try {
      // Try database first if strategy allows
      if (this.shouldTryDatabase()) {
        try {
          const dbResult = await this.getTournamentsFromDB(filters);
          if (dbResult && dbResult.length > 0) {
            const performance = {
              queryTime: Date.now() - startTime,
              fallbackUsed: false
            };
            
            this.updatePerformanceMetrics('tournaments', 'db', performance.queryTime, true);
            
            return {
              data: dbResult,
              source: 'database',
              timestamp: Date.now(),
              performance
            };
          }
        } catch (dbError) {
          await this.errorLogger.logError(dbError as Error, {
            context: 'DualReadService.getTournaments.database',
            severity: 'medium'
          });
          
          this.updatePerformanceMetrics('tournaments', 'db', Date.now() - startTime, false);

          // Fall through to API if fallback enabled
          if (!this.config.fallbackEnabled) {
            return {
              data: null,
              source: 'database',
              timestamp: Date.now(),
              performance: {
                queryTime: Date.now() - startTime,
                fallbackUsed: false
              },
              error: (dbError as Error).message
            };
          }
        }
      }

      // Try API (either as primary or fallback)
      if (this.shouldTryAPI()) {
        try {
          const apiResult = await this.getTournamentsFromAPI(filters);
          fallbackUsed = this.config.readStrategy === 'db_first';
          
          const performance = {
            queryTime: Date.now() - startTime,
            fallbackUsed
          };

          this.updatePerformanceMetrics('tournaments', 'api', performance.queryTime, true);
          
          return {
            data: apiResult,
            source: 'api',
            timestamp: Date.now(),
            performance
          };
        } catch (apiError) {
          await this.errorLogger.logError(apiError as Error, {
            context: 'DualReadService.getTournaments.api',
            severity: 'high'
          });
          
          this.updatePerformanceMetrics('tournaments', 'api', Date.now() - startTime, false);

          return {
            data: null,
            source: 'api',
            timestamp: Date.now(),
            performance: {
              queryTime: Date.now() - startTime,
              fallbackUsed
            },
            error: (apiError as Error).message
          };
        }
      }

      // No valid strategy found
      return {
        data: null,
        source: 'database',
        timestamp: Date.now(),
        performance: {
          queryTime: Date.now() - startTime,
          fallbackUsed: false
        },
        error: 'No valid read strategy available'
      };

    } catch (error) {
      await this.errorLogger.logError(error as Error, {
        context: 'DualReadService.getTournaments',
        severity: 'high'
      });

      return {
        data: null,
        source: 'database',
        timestamp: Date.now(),
        performance: {
          queryTime: Date.now() - startTime,
          fallbackUsed
        },
        error: (error as Error).message
      };
    }
  }

  /**
   * Get matches with dual-read strategy
   */
  async getMatches(filters?: {
    tournamentCode?: string;
    round?: string;
    eventNo?: number;
    status?: string;
    date?: string;
  }): Promise<ReadResult<MatchDTO[]>> {
    const startTime = Date.now();
    let fallbackUsed = false;

    try {
      // Try database first if strategy allows
      if (this.shouldTryDatabase()) {
        try {
          const dbResult = await this.getMatchesFromDB(filters);
          if (dbResult && dbResult.length > 0) {
            const performance = {
              queryTime: Date.now() - startTime,
              fallbackUsed: false
            };
            
            this.updatePerformanceMetrics('matches', 'db', performance.queryTime, true);
            
            return {
              data: dbResult,
              source: 'database',
              timestamp: Date.now(),
              performance
            };
          }
        } catch (dbError) {
          await this.errorLogger.logError(dbError as Error, {
            context: 'DualReadService.getMatches.database',
            severity: 'medium'
          });
          
          this.updatePerformanceMetrics('matches', 'db', Date.now() - startTime, false);

          if (!this.config.fallbackEnabled) {
            return {
              data: null,
              source: 'database',
              timestamp: Date.now(),
              performance: {
                queryTime: Date.now() - startTime,
                fallbackUsed: false
              },
              error: (dbError as Error).message
            };
          }
        }
      }

      // Try API (either as primary or fallback)
      if (this.shouldTryAPI()) {
        try {
          const apiResult = await this.getMatchesFromAPI(filters);
          fallbackUsed = this.config.readStrategy === 'db_first';
          
          const performance = {
            queryTime: Date.now() - startTime,
            fallbackUsed
          };

          this.updatePerformanceMetrics('matches', 'api', performance.queryTime, true);
          
          return {
            data: apiResult,
            source: 'api',
            timestamp: Date.now(),
            performance
          };
        } catch (apiError) {
          await this.errorLogger.logError(apiError as Error, {
            context: 'DualReadService.getMatches.api',
            severity: 'high'
          });
          
          this.updatePerformanceMetrics('matches', 'api', Date.now() - startTime, false);

          return {
            data: null,
            source: 'api',
            timestamp: Date.now(),
            performance: {
              queryTime: Date.now() - startTime,
              fallbackUsed
            },
            error: (apiError as Error).message
          };
        }
      }

      return {
        data: null,
        source: 'database',
        timestamp: Date.now(),
        performance: {
          queryTime: Date.now() - startTime,
          fallbackUsed: false
        },
        error: 'No valid read strategy available'
      };

    } catch (error) {
      await this.errorLogger.logError(error as Error, {
        context: 'DualReadService.getMatches',
        severity: 'high'
      });

      return {
        data: null,
        source: 'database',
        timestamp: Date.now(),
        performance: {
          queryTime: Date.now() - startTime,
          fallbackUsed
        },
        error: (error as Error).message
      };
    }
  }

  /**
   * Get referees with dual-read strategy
   */
  async getReferees(filters?: {
    tournamentCodes?: string[];
    federationCode?: string;
    status?: 'ACTIVE' | 'INACTIVE' | 'SUSPENDED' | 'RESTRICTED';
    assignmentStatus?: 'assigned' | 'available' | 'all';
    includeAssignments?: boolean;
  }): Promise<ReadResult<RefereeDTO[]>> {
    const startTime = Date.now();
    let fallbackUsed = false;

    try {
      // Try database first if strategy allows
      if (this.shouldTryDatabase()) {
        try {
          const dbResult = await this.getRefereesFromDB(filters);
          if (dbResult && dbResult.length > 0) {
            const performance = {
              queryTime: Date.now() - startTime,
              fallbackUsed: false
            };
            
            this.updatePerformanceMetrics('referees', 'db', performance.queryTime, true);
            
            return {
              data: dbResult,
              source: 'database',
              timestamp: Date.now(),
              performance
            };
          }
        } catch (dbError) {
          await this.errorLogger.logError(dbError as Error, {
            context: 'DualReadService.getReferees.database',
            severity: 'medium'
          });
          
          this.updatePerformanceMetrics('referees', 'db', Date.now() - startTime, false);

          if (!this.config.fallbackEnabled) {
            return {
              data: null,
              source: 'database',
              timestamp: Date.now(),
              performance: {
                queryTime: Date.now() - startTime,
                fallbackUsed: false
              },
              error: (dbError as Error).message
            };
          }
        }
      }

      // Try API (either as primary or fallback)
      if (this.shouldTryAPI()) {
        try {
          const apiResult = await this.getRefereesFromAPI(filters);
          fallbackUsed = this.config.readStrategy === 'db_first';
          
          const performance = {
            queryTime: Date.now() - startTime,
            fallbackUsed
          };

          this.updatePerformanceMetrics('referees', 'api', performance.queryTime, true);
          
          return {
            data: apiResult,
            source: 'api',
            timestamp: Date.now(),
            performance
          };
        } catch (apiError) {
          await this.errorLogger.logError(apiError as Error, {
            context: 'DualReadService.getReferees.api',
            severity: 'high'
          });

          return {
            data: null,
            source: 'api',
            timestamp: Date.now(),
            performance: {
              queryTime: Date.now() - startTime,
              fallbackUsed
            },
            error: (apiError as Error).message
          };
        }
      }

      return {
        data: null,
        source: 'database',
        timestamp: Date.now(),
        performance: {
          queryTime: Date.now() - startTime,
          fallbackUsed: false
        },
        error: 'No valid read strategy available'
      };

    } catch (error) {
      await this.errorLogger.logError(error as Error, {
        context: 'DualReadService.getReferees',
        severity: 'high'
      });

      return {
        data: null,
        source: 'database',
        timestamp: Date.now(),
        performance: {
          queryTime: Date.now() - startTime,
          fallbackUsed
        },
        error: (error as Error).message
      };
    }
  }

  /**
   * Get events with dual-read strategy
   */
  async getEvents(filters?: {
    tournamentCode?: string;
    from?: string;
    to?: string;
  }): Promise<ReadResult<EventDTO[]>> {
    const startTime = Date.now();
    let fallbackUsed = false;

    try {
      if (this.shouldTryDatabase()) {
        try {
          const dbResult = await this.getEventsFromDB(filters);
          if (dbResult && dbResult.length > 0) {
            const performance = {
              queryTime: Date.now() - startTime,
              fallbackUsed: false
            };
            
            this.updatePerformanceMetrics('events', 'db', performance.queryTime, true);
            
            return {
              data: dbResult,
              source: 'database',
              timestamp: Date.now(),
              performance
            };
          }
        } catch (dbError) {
          await this.errorLogger.logError(dbError as Error, {
            context: 'DualReadService.getEvents.database',
            severity: 'medium'
          });
          
          this.updatePerformanceMetrics('events', 'db', Date.now() - startTime, false);

          if (!this.config.fallbackEnabled) {
            return {
              data: null,
              source: 'database',
              timestamp: Date.now(),
              performance: {
                queryTime: Date.now() - startTime,
                fallbackUsed: false
              },
              error: (dbError as Error).message
            };
          }
        }
      }

      if (this.shouldTryAPI()) {
        try {
          const apiResult = await this.getEventsFromAPI(filters);
          fallbackUsed = this.config.readStrategy === 'db_first';
          
          const performance = {
            queryTime: Date.now() - startTime,
            fallbackUsed
          };

          this.updatePerformanceMetrics('events', 'api', performance.queryTime, true);
          
          return {
            data: apiResult,
            source: 'api',
            timestamp: Date.now(),
            performance
          };
        } catch (apiError) {
          await this.errorLogger.logError(apiError as Error, {
            context: 'DualReadService.getEvents.api',
            severity: 'high'
          });

          return {
            data: null,
            source: 'api',
            timestamp: Date.now(),
            performance: {
              queryTime: Date.now() - startTime,
              fallbackUsed
            },
            error: (apiError as Error).message
          };
        }
      }

      return {
        data: null,
        source: 'database',
        timestamp: Date.now(),
        performance: {
          queryTime: Date.now() - startTime,
          fallbackUsed: false
        },
        error: 'No valid read strategy available'
      };

    } catch (error) {
      await this.errorLogger.logError(error as Error, {
        context: 'DualReadService.getEvents',
        severity: 'high'
      });

      return {
        data: null,
        source: 'database',
        timestamp: Date.now(),
        performance: {
          queryTime: Date.now() - startTime,
          fallbackUsed
        },
        error: (error as Error).message
      };
    }
  }

  /**
   * Get tournaments from database
   */
  private async getTournamentsFromDB(filters?: any): Promise<TournamentDTO[]> {
    let query = this.supabase.from('tournaments').select('*');

    if (filters?.season) {
      query = query.eq('season', filters.season);
    }
    if (filters?.gender) {
      query = query.eq('gender', filters.gender);
    }
    if (filters?.country) {
      query = query.eq('country', filters.country);
    }
    if (filters?.status) {
      query = query.eq('status', filters.status);
    }

    const { data, error } = await query;

    if (error) {
      throw new Error(`Database query failed: ${error.message}`);
    }

    return data ? data.map(this.transformTournamentFromDB) : [];
  }

  /**
   * Get tournaments from API
   */
  private async getTournamentsFromAPI(filters?: any): Promise<TournamentDTO[]> {
    const edgeUrl = process.env.EXPO_PUBLIC_EDGE_URL;
    if (!edgeUrl) {
      throw new Error('EXPO_PUBLIC_EDGE_URL not configured');
    }

    const params = new URLSearchParams();
    if (filters?.season) params.append('season', filters.season.toString());
    if (filters?.gender) params.append('gender', filters.gender);
    if (filters?.country) params.append('country', filters.country);

    const response = await fetch(`${edgeUrl}/vis/tournaments?${params}`, {
      headers: {
        'Authorization': `Bearer ${process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY}`,
      },
      signal: AbortSignal.timeout(this.config.apiTimeoutMs)
    });

    if (!response.ok) {
      throw new Error(`API request failed: ${response.status} ${response.statusText}`);
    }

    const tournaments = await response.json();
    return Array.isArray(tournaments) ? tournaments : [];
  }

  /**
   * Get matches from database
   */
  private async getMatchesFromDB(filters?: any): Promise<MatchDTO[]> {
    let query = this.supabase.from('matches').select(`
      *,
      events!inner(tournament_code, vis_event_no)
    `);

    if (filters?.tournamentCode) {
      query = query.eq('tournament_code', filters.tournamentCode);
    }
    if (filters?.eventNo) {
      query = query.eq('events.vis_event_no', filters.eventNo);
    }
    if (filters?.status) {
      query = query.eq('status', filters.status);
    }
    if (filters?.date) {
      query = query.gte('utc_datetime', `${filters.date}T00:00:00Z`)
                  .lt('utc_datetime', `${filters.date}T23:59:59Z`);
    }

    const { data, error } = await query;

    if (error) {
      throw new Error(`Database query failed: ${error.message}`);
    }

    return data ? data.map(this.transformMatchFromDB) : [];
  }

  /**
   * Get matches from API
   */
  private async getMatchesFromAPI(filters?: any): Promise<MatchDTO[]> {
    const edgeUrl = process.env.EXPO_PUBLIC_EDGE_URL;
    if (!edgeUrl) {
      throw new Error('EXPO_PUBLIC_EDGE_URL not configured');
    }

    const params = new URLSearchParams();
    if (filters?.tournamentCode) params.append('tournamentCode', filters.tournamentCode);
    if (filters?.round) params.append('round', filters.round);
    if (filters?.eventNo) params.append('eventNo', filters.eventNo.toString());

    const response = await fetch(`${edgeUrl}/vis/matches?${params}`, {
      headers: {
        'Authorization': `Bearer ${process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY}`,
      },
      signal: AbortSignal.timeout(this.config.apiTimeoutMs)
    });

    if (!response.ok) {
      throw new Error(`API request failed: ${response.status} ${response.statusText}`);
    }

    const matches = await response.json();
    return Array.isArray(matches) ? matches : [];
  }

  /**
   * Get events from database
   */
  private async getEventsFromDB(filters?: any): Promise<EventDTO[]> {
    let query = this.supabase.from('events').select(`
      *,
      tournaments!inner(tournament_code)
    `);

    if (filters?.tournamentCode) {
      query = query.eq('tournaments.tournament_code', filters.tournamentCode);
    }

    const { data, error } = await query;

    if (error) {
      throw new Error(`Database query failed: ${error.message}`);
    }

    return data ? data.map(this.transformEventFromDB) : [];
  }

  /**
   * Get referees from database
   */
  private async getRefereesFromDB(filters?: any): Promise<RefereeDTO[]> {
    let query = this.supabase.from('referees').select(`
      *,
      referee_assignments!left(
        id,
        match_id,
        position,
        status,
        tournament_code,
        assigned_at,
        updated_at,
        matches!inner(
          match_no,
          court,
          utc_datetime,
          team_a_name,
          team_b_name,
          round_code
        )
      )
    `);

    if (filters?.federationCode) {
      query = query.eq('federation_code', filters.federationCode);
    }
    if (filters?.status) {
      query = query.eq('status', filters.status);
    }
    if (filters?.tournamentCodes && filters.tournamentCodes.length > 0) {
      query = query.in('referee_assignments.tournament_code', filters.tournamentCodes);
    }

    const { data, error } = await query;

    if (error) {
      throw new Error(`Database query failed: ${error.message}`);
    }

    return data ? data.map(this.transformRefereeFromDB) : [];
  }

  /**
   * Get referees from API
   */
  private async getRefereesFromAPI(filters?: any): Promise<RefereeDTO[]> {
    const edgeUrl = process.env.EXPO_PUBLIC_EDGE_URL;
    if (!edgeUrl) {
      throw new Error('EXPO_PUBLIC_EDGE_URL not configured');
    }

    const params = new URLSearchParams();
    if (filters?.tournamentCodes && filters.tournamentCodes.length > 0) {
      filters.tournamentCodes.forEach((code: string) => {
        params.append('tournamentCode', code);
      });
    }
    if (filters?.federationCode) params.append('federationCode', filters.federationCode);
    if (filters?.status) params.append('status', filters.status);
    if (filters?.includeAssignments) params.append('includeAssignments', 'true');

    const response = await fetch(`${edgeUrl}/vis/referees?${params}`, {
      headers: {
        'Authorization': `Bearer ${process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY}`,
      },
      signal: AbortSignal.timeout(this.config.apiTimeoutMs)
    });

    if (!response.ok) {
      throw new Error(`API request failed: ${response.status} ${response.statusText}`);
    }

    const referees = await response.json();
    return Array.isArray(referees) ? referees : [];
  }

  /**
   * Get events from API
   */
  private async getEventsFromAPI(filters?: any): Promise<EventDTO[]> {
    const edgeUrl = process.env.EXPO_PUBLIC_EDGE_URL;
    if (!edgeUrl) {
      throw new Error('EXPO_PUBLIC_EDGE_URL not configured');
    }

    const params = new URLSearchParams();
    if (filters?.tournamentCode) params.append('tournamentCode', filters.tournamentCode);
    if (filters?.from) params.append('from', filters.from);
    if (filters?.to) params.append('to', filters.to);

    const response = await fetch(`${edgeUrl}/vis/events?${params}`, {
      headers: {
        'Authorization': `Bearer ${process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY}`,
      },
      signal: AbortSignal.timeout(this.config.apiTimeoutMs)
    });

    if (!response.ok) {
      throw new Error(`API request failed: ${response.status} ${response.statusText}`);
    }

    const events = await response.json();
    return Array.isArray(events) ? events : [];
  }

  /**
   * Transform tournament data from database format to DTO
   */
  private transformTournamentFromDB(dbTournament: any): TournamentDTO {
    return {
      id: dbTournament.id.toString(),
      visNo: dbTournament.vis_tournament_no.toString(),
      code: dbTournament.tournament_code,
      name: dbTournament.name,
      gender: dbTournament.gender,
      tournamentType: dbTournament.type || 'FIVB',
      dates: {
        startDate: dbTournament.start_qualification || dbTournament.start_main_draw,
        endDate: dbTournament.start_main_draw,
        startDateQualification: dbTournament.start_qualification,
        startDateMainDraw: dbTournament.start_main_draw
      },
      status: (dbTournament.status || 'UPCOMING').toUpperCase(),
      city: dbTournament.city,
      country: dbTournament.country,
      countryCode: dbTournament.country
    };
  }

  /**
   * Transform match data from database format to DTO
   */
  private transformMatchFromDB(dbMatch: any): MatchDTO {
    const sets = dbMatch.sets ? JSON.parse(dbMatch.sets) : [];
    const result = dbMatch.result ? JSON.parse(dbMatch.result) : null;

    return {
      id: dbMatch.id.toString(),
      visNo: dbMatch.vis_match_no.toString(),
      tournamentCode: dbMatch.tournament_code,
      matchCode: `M${dbMatch.vis_match_no}`,
      round: dbMatch.round_code || 'R1',
      phaseCode: dbMatch.round_phase,
      status: (dbMatch.status || 'SCHEDULED').toUpperCase(),
      court: {
        courtNumber: dbMatch.court || '1',
        courtName: dbMatch.court
      },
      scheduledDateTime: dbMatch.utc_datetime,
      actualStartTime: dbMatch.local_datetime,
      team1: {
        teamNumber: 1,
        teamName: dbMatch.team_a_name || 'Team A',
        player1Name: 'Player 1',
        player2Name: 'Player 2',
        countryCode: dbMatch.team_a_fed
      },
      team2: {
        teamNumber: 2,
        teamName: dbMatch.team_b_name || 'Team B',
        player1Name: 'Player 1',
        player2Name: 'Player 2',
        countryCode: dbMatch.team_b_fed
      },
      result: result ? {
        team1Sets: sets.filter((s: any) => s.a > s.b).length,
        team2Sets: sets.filter((s: any) => s.b > s.a).length,
        setScores: sets,
        winner: result.winnerRank,
        forfeit: result.forfeit || false
      } : undefined
    };
  }

  /**
   * Transform referee data from database format to DTO
   */
  private transformRefereeFromDB(dbReferee: any): RefereeDTO {
    const assignments = dbReferee.referee_assignments || [];
    
    // Calculate assignment status counts
    const assignmentStatus = {
      current: assignments.filter((a: any) => a.status === 'ASSIGNED' || a.status === 'CONFIRMED').length,
      upcoming: assignments.filter((a: any) => 
        a.status === 'ASSIGNED' && 
        new Date(a.matches?.utc_datetime) > new Date()
      ).length,
      completed: assignments.filter((a: any) => a.status === 'COMPLETED').length,
      online: true // This would need to be determined by real-time service
    };

    const transformedAssignments: RefereeAssignmentDTO[] = assignments.map((assignment: any) => ({
      id: assignment.id.toString(),
      matchId: assignment.match_id.toString(),
      matchNo: assignment.matches?.match_no || '',
      refereeId: dbReferee.referee_id || dbReferee.id.toString(),
      position: assignment.position,
      status: assignment.status,
      tournamentCode: assignment.tournament_code,
      court: assignment.matches?.court || '',
      scheduledDateTime: assignment.matches?.utc_datetime || '',
      team1Name: assignment.matches?.team_a_name || '',
      team2Name: assignment.matches?.team_b_name || '',
      round: assignment.matches?.round_code || '',
      assignedAt: assignment.assigned_at,
      updatedAt: assignment.updated_at
    }));

    return {
      id: dbReferee.id.toString(),
      refereeId: dbReferee.referee_id || dbReferee.id.toString(),
      name: `${dbReferee.first_name} ${dbReferee.last_name}`,
      firstName: dbReferee.first_name,
      lastName: dbReferee.last_name,
      federationCode: dbReferee.federation_code,
      gender: dbReferee.gender,
      status: (dbReferee.status || 'ACTIVE').toUpperCase(),
      type: (dbReferee.type || 'REFEREE').toUpperCase(),
      role: dbReferee.role,
      assignmentStatus,
      assignments: transformedAssignments
    };
  }

  /**
   * Transform event data from database format to DTO
   */
  private transformEventFromDB(dbEvent: any): EventDTO {
    return {
      id: dbEvent.id.toString(),
      visEventNo: dbEvent.vis_event_no.toString(),
      eventCode: dbEvent.event_code,
      tournamentId: dbEvent.tournament_id.toString(),
      gender: dbEvent.gender,
      phase: dbEvent.phase,
      name: dbEvent.name,
      country: dbEvent.country,
      startDate: dbEvent.start_date,
      endDate: dbEvent.end_date,
      status: dbEvent.status
    };
  }

  /**
   * Determine if database should be tried based on read strategy
   */
  private shouldTryDatabase(): boolean {
    return this.config.readStrategy === 'db_first' || 
           this.config.readStrategy === 'db_only';
  }

  /**
   * Determine if API should be tried based on read strategy and network status
   */
  private shouldTryAPI(): boolean {
    if (!this.networkMonitor.isConnected()) {
      return false;
    }

    return this.config.readStrategy === 'api_first' || 
           this.config.readStrategy === 'api_only' ||
           (this.config.readStrategy === 'db_first' && this.config.fallbackEnabled);
  }

  /**
   * Update performance metrics
   */
  private updatePerformanceMetrics(
    operation: string,
    source: 'db' | 'api',
    duration: number,
    success: boolean
  ): void {
    if (!this.config.enablePerformanceMonitoring) return;

    const key = operation;
    const current = this.performanceMetrics.get(key) || {
      avgDbTime: 0,
      avgApiTime: 0,
      dbSuccessRate: 0,
      apiSuccessRate: 0,
      fallbackRate: 0,
      totalRequests: 0
    };

    current.totalRequests++;

    if (source === 'db') {
      current.avgDbTime = (current.avgDbTime + duration) / 2;
      current.dbSuccessRate = (current.dbSuccessRate + (success ? 1 : 0)) / 2;
    } else {
      current.avgApiTime = (current.avgApiTime + duration) / 2;
      current.apiSuccessRate = (current.apiSuccessRate + (success ? 1 : 0)) / 2;
    }

    this.performanceMetrics.set(key, current);
  }

  /**
   * Get current performance metrics
   */
  getPerformanceMetrics(): Map<string, any> {
    return new Map(this.performanceMetrics);
  }

  /**
   * Clear performance metrics
   */
  clearPerformanceMetrics(): void {
    this.performanceMetrics.clear();
  }

  /**
   * Invalidate cache for specific data type
   */
  async invalidateCache(type: 'tournaments' | 'matches' | 'events' | 'referees', filters?: any): Promise<void> {
    if (this.config.cacheInvalidationStrategy === 'immediate') {
      // Implement cache invalidation logic based on your cache service
      await this.cacheService.clearCache([type]);
    }
  }

  /**
   * Get current configuration
   */
  getConfig(): DualReadConfig {
    return { ...this.config };
  }
}

export default DualReadService;