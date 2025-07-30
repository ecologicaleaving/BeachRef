export interface Tournament {
  code: string;              // Unique tournament identifier
  name: string;              // Tournament name
  countryCode: string;       // ISO country code
  startDate: string;         // ISO date string
  endDate: string;           // ISO date string
  gender: 'Men' | 'Women' | 'Mixed';
  type: string;              // Tournament type/level
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