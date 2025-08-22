export interface MatchResult {
  no: string;                    // Match.No - unique identifier
  tournamentNo: string;          // Foreign key to tournaments
  teamAName: string;             // Team names from FIVB API
  teamBName: string;
  teamACountryCode?: string;     // Team country codes
  teamBCountryCode?: string;
  status: 'Scheduled' | 'Running' | 'Finished' | 'Cancelled';
  
  // Set-by-set scoring
  matchPointsA: number;          // Overall match points (sets won)
  matchPointsB: number;
  pointsTeamASet1: number;       // Individual set scores
  pointsTeamBSet1: number;
  pointsTeamASet2: number;
  pointsTeamBSet2: number;
  pointsTeamASet3: number;       // Third set (if played)
  pointsTeamBSet3: number;
  
  // Referee information
  referee1No?: string;           // NoReferee1
  referee1Name?: string;         // Referee1Name
  referee1FederationCode?: string; // Referee1FederationCode
  referee2No?: string;           // NoReferee2
  referee2Name?: string;         // Referee2Name
  referee2FederationCode?: string; // Referee2FederationCode
  
  // Match metadata
  durationSet1: string;          // Set durations for detailed view
  durationSet2: string;
  durationSet3: string;
  localDate: Date;
  localTime: string;
  court: string;
  round: string;
}

export interface MatchResultsStatus {
  live: MatchResult[];
  completed: MatchResult[];
  scheduled: MatchResult[];
}

export interface MatchResultsCache {
  data: MatchResultsStatus;
  timestamp: number;
  tournamentNo: string;
}

/**
 * Extended Match Result Types for Story 2.2
 * Match Result Card Optimization - Component Types
 */

export type MatchType = 'beach' | 'indoor' | 'quick';

export type ResultStatus = 'draft' | 'submitted' | 'confirmed' | 'synced' | 'error';

export type SpecialResult = 'forfeit' | 'timeout' | 'injury' | 'weather' | 'other';

export interface SetScore {
  homeScore: number;
  awayScore: number;
  completed: boolean;
}

export interface EnhancedMatchResult extends MatchResult {
  matchType: MatchType;
  resultStatus: ResultStatus;
  specialResult?: SpecialResult;
  specialResultNotes?: string;
  weatherConditions?: string;
  temperature?: number;
  windSpeed?: number;
  notes?: string;
  submittedAt?: Date;
  submittedBy?: string;
  lastModified: Date;
  isOffline?: boolean;
  syncPending?: boolean;
}

export interface MatchResultCardProps {
  matchResult: EnhancedMatchResult;
  variant?: MatchType;
  isEditable?: boolean;
  showQuickActions?: boolean;
  onScoreUpdate?: (matchResult: EnhancedMatchResult) => void;
  onSubmit?: (matchResult: EnhancedMatchResult) => void;
  onSpecialResult?: (type: SpecialResult, notes?: string) => void;
  onPress?: (matchResult: EnhancedMatchResult) => void;
}

export interface ScoreEntryProps {
  homeScore: number;
  awayScore: number;
  setNumber: number;
  isCompleted: boolean;
  isEditable: boolean;
  onScoreChange: (homeScore: number, awayScore: number) => void;
  onSetComplete: () => void;
}

export interface QuickActionProps {
  type: SpecialResult;
  label: string;
  onPress: () => void;
  disabled?: boolean;
}

export interface ResultValidationError {
  field: string;
  message: string;
  severity: 'error' | 'warning';
}

export interface OfflineCacheEntry {
  id: string;
  matchResult: EnhancedMatchResult;
  timestamp: Date;
  attempts: number;
  lastError?: string;
}