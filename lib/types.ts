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