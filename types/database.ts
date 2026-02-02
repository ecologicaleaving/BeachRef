/**
 * Supabase Database Types
 *
 * Type definitions matching the Supabase schema from migrations:
 * - 007_create_new_tournament_schema.sql
 * - 008_create_match_schema.sql
 * - 009_create_analytics_schema.sql
 */

/**
 * Tournament table schema
 */
export interface DbTournament {
  id: number;
  vis_no: string;
  code?: string;
  name: string;
  gender?: 'M' | 'W';
  type?: string;
  start_date: string; // ISO date
  end_date: string;   // ISO date
  city?: string;
  country?: string;
  country_code?: string;
  status?: string;
  created_at: string;
  updated_at: string;
}

/**
 * Event table schema (sub-tournaments by gender)
 */
export interface DbEvent {
  id: number;
  vis_event_no: number;
  event_code?: string;
  tournament_id: number;
  gender?: 'M' | 'W';
  phase?: string; // Qualification, Main Draw, Finals
  name?: string;
  country?: string;
  start_date?: string;
  end_date?: string;
  status?: string;
  created_at: string;
  updated_at: string;
}

/**
 * Match table schema
 */
export interface DbMatch {
  id: number;
  vis_match_no: number;
  tournament_code: string;
  event_id: number;
  round_code?: string;
  round_name?: string;
  round_phase?: string;
  utc_datetime?: string;  // timestamptz
  local_datetime?: string; // timestamptz
  court?: string;
  team_a_name?: string;
  team_b_name?: string;
  team_a_fed?: string;
  team_b_fed?: string;
  team_a_players?: number[]; // bigint[]
  team_b_players?: number[];
  sets?: MatchSet[];         // jsonb
  result?: MatchResult;      // jsonb
  status?: string;
  are_court_and_time_published?: boolean;
  nb_live_score_upload?: number;
  created_at: string;
  updated_at: string;
}

/**
 * Match set data (stored as JSONB)
 */
export interface MatchSet {
  a: number; // Team A score
  b: number; // Team B score
}

/**
 * Match result data (stored as JSONB)
 */
export interface MatchResult {
  resultType?: string;
  winnerRank?: string;
  duration?: number;
  [key: string]: any;
}

/**
 * Referee table schema
 */
export interface DbReferee {
  id: number;
  vis_referee_no?: string;
  first_name?: string;
  last_name?: string;
  federation_code?: string;
  level?: string;
  gender?: 'M' | 'F';
  experience_years?: number;
  status?: 'ACTIVE' | 'INACTIVE' | 'SUSPENDED';
  created_at: string;
  updated_at: string;
}

/**
 * Match-Referee junction table schema
 */
export interface DbMatchReferee {
  match_id: number;
  referee_id: number;
  role: 'FIRST' | 'SECOND' | 'CHALLENGE';
}

/**
 * Referee analytics table schema (aggregated metrics)
 */
export interface DbRefereeAnalytics {
  id: number;
  referee_id: number;
  date: string; // date
  total_assignments: number;
  first_referee_count: number;
  second_referee_count: number;
  challenge_referee_count: number;
  tournaments_worked?: string[];
  performance_score?: number;
  created_at: string;
}

/**
 * Analytics events table schema (tracking)
 */
export interface DbAnalyticsEvent {
  id: number;
  event_type: string; // 'referee_view', 'assignment_action', 'match_monitor'
  user_context?: Record<string, any>; // jsonb
  event_data?: Record<string, any>;   // jsonb
  timestamp: string;
}

/**
 * Database schema type (for Supabase client type safety)
 */
export interface Database {
  public: {
    Tables: {
      tournaments: {
        Row: DbTournament;
        Insert: Omit<DbTournament, 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Omit<DbTournament, 'id' | 'created_at' | 'updated_at'>>;
      };
      events: {
        Row: DbEvent;
        Insert: Omit<DbEvent, 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Omit<DbEvent, 'id' | 'created_at' | 'updated_at'>>;
      };
      matches: {
        Row: DbMatch;
        Insert: Omit<DbMatch, 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Omit<DbMatch, 'id' | 'created_at' | 'updated_at'>>;
      };
      referees: {
        Row: DbReferee;
        Insert: Omit<DbReferee, 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Omit<DbReferee, 'id' | 'created_at' | 'updated_at'>>;
      };
      match_referees: {
        Row: DbMatchReferee;
        Insert: DbMatchReferee;
        Update: Partial<DbMatchReferee>;
      };
      referee_analytics: {
        Row: DbRefereeAnalytics;
        Insert: Omit<DbRefereeAnalytics, 'id' | 'created_at'>;
        Update: Partial<Omit<DbRefereeAnalytics, 'id' | 'created_at'>>;
      };
      analytics_events: {
        Row: DbAnalyticsEvent;
        Insert: Omit<DbAnalyticsEvent, 'id' | 'timestamp'>;
        Update: Partial<Omit<DbAnalyticsEvent, 'id' | 'timestamp'>>;
      };
    };
    Functions: {
      get_match_statistics_by_tournament: {
        Args: { tournament_code_param: string };
        Returns: {
          total_matches: number;
          completed_matches: number;
          active_matches: number;
          upcoming_matches: number;
          completion_rate: number;
        };
      };
      get_referee_assignment_counts: {
        Args: { referee_id_param: number };
        Returns: {
          total_assignments: number;
          first_referee_count: number;
          second_referee_count: number;
          challenge_referee_count: number;
        };
      };
    };
  };
}

/**
 * Upsert options for conflict resolution
 */
export interface UpsertOptions {
  /** Column(s) to check for conflicts */
  onConflict?: string;
  /** Whether to ignore duplicates (don't update on conflict) */
  ignoreDuplicates?: boolean;
}

/**
 * Query filters for matches
 */
export interface MatchQueryFilters {
  tournamentCode?: string;
  year?: number;
  status?: string;
  startDate?: string;
  endDate?: string;
}

/**
 * Query result with metadata
 */
export interface QueryResult<T> {
  data: T | null;
  error: Error | null;
  count?: number;
}
