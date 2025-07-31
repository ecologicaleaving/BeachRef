export interface Tournament {
  code: string;              // Unique tournament identifier
  name: string;              // Tournament name
  countryCode: string;       // ISO country code
  startDate: string;         // ISO date string
  endDate: string;           // ISO date string
  gender: 'Men' | 'Women' | 'Mixed';
  type: string;              // Tournament type/level
  tournamentNo?: string;     // Internal tournament number (4-5 digits)
}

export interface TournamentDetail extends Tournament {
  venue?: string;
  description?: string;
  status?: 'upcoming' | 'live' | 'completed';
  city?: string;
  prize?: string;
  categories?: string[];
  // Enhanced GetBeachTournament fields
  title?: string;                    // Full tournament title
  countryName?: string;              // Full country name
  season?: string;                   // Tournament season
  tournamentNumber?: string;         // Internal tournament number
  competitionStructure?: {
    nbTeamsMainDraw?: number;        // Number of teams in main draw
    nbTeamsQualification?: number;   // Number of teams in qualification
    nbTeamsFromQualification?: number; // Teams advancing from qualification
    nbWildCards?: number;            // Number of wild card spots
    matchFormat?: string;            // Match format identifier
    matchPointsMethod?: string;      // Points calculation method
  };
  dates?: {
    startDate?: string;              // Tournament start date
    endDateMainDraw?: string;        // Main draw end date
    endDateQualification?: string;   // Qualification end date
    preliminaryInquiryMainDraw?: string; // Preliminary inquiry date
    deadline?: string;               // Entry deadline
  };
  pointsSystem?: {
    entryPointsTemplateNo?: string;  // Entry points template
    seedPointsTemplateNo?: string;   // Seeding points template
    earnedPointsTemplateNo?: string; // Earned points template
    entryPointsDayOffset?: string;   // Entry points calculation offset
  };
  administration?: {
    version?: string;                // Data version
    isVisManaged?: boolean;          // VIS managed tournament
    isFreeEntrance?: boolean;        // Free entrance flag
    webSite?: string;                // Tournament website
    buyTicketsUrl?: string;          // Ticket purchase URL
    federationCode?: string;         // Federation organizing (moved from root)
    organizerCode?: string;          // Organizer code (moved from root)
  };
}

export interface VISApiResponse {
  tournaments: Tournament[];
  totalCount: number;
  lastUpdated: string;
}

export interface PaginatedTournamentResponse {
  tournaments: Tournament[];
  pagination: {
    currentPage: number;
    totalPages: number;
    totalTournaments: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
    limit: number;
    year: number;
  };
}

export class VISApiError extends Error {
  public statusCode?: number
  public originalError?: unknown
  
  constructor(
    message: string,
    statusCode?: number,
    originalError?: unknown
  ) {
    super(message)
    this.name = 'VISApiError'
    this.statusCode = statusCode
    this.originalError = originalError
  }
}

// Tournament Table Component Types
export interface TournamentTableProps {
  initialData?: Tournament[] | null;
  className?: string;
  // New pagination props for enhanced integration
  paginatedData?: PaginatedTournamentResponse | null;
  currentYear?: number;
  currentPage?: number;
  onPaginationChange?: (year: number, page: number) => void;
}

export interface TournamentTableState {
  tournaments: Tournament[];
  loading: boolean;
  error: string | null;
  sortColumn: string | null;
  sortDirection: 'asc' | 'desc';
}

export type SortColumn = 'name' | 'countryCode' | 'startDate' | 'endDate' | 'gender' | 'type';

export interface SortConfig {
  column: SortColumn;
  direction: 'asc' | 'desc';
}

// Utility types for data formatting
export interface FormattedTournament extends Tournament {
  formattedStartDate: string;
  formattedEndDate: string;
  formattedGender: string;
  countryName?: string;
}