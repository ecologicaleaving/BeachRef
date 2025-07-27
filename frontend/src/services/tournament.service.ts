import type { PaginatedTournamentResponse, TournamentQueryParams, TournamentDetailResponse } from '@/types/tournament.types';

const API_BASE_URL = process.env.VITE_API_URL || 'http://localhost:3001';

export class TournamentService {
  private async fetchWithTimeout(url: string, options: RequestInit = {}, timeout = 10000): Promise<Response> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
        headers: {
          'Content-Type': 'application/json',
          ...options.headers,
        },
      });

      clearTimeout(timeoutId);
      return response;
    } catch (error) {
      clearTimeout(timeoutId);
      throw error;
    }
  }

  async getTournaments(params: TournamentQueryParams = {}): Promise<PaginatedTournamentResponse> {
    try {
      const searchParams = new URLSearchParams();
      
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          // Handle array parameters by joining with commas
          if (Array.isArray(value)) {
            if (value.length > 0) {
              searchParams.append(key, value.join(','));
            }
          } else {
            searchParams.append(key, String(value));
          }
        }
      });

      const url = `${API_BASE_URL}/api/tournaments${searchParams.toString() ? `?${searchParams.toString()}` : ''}`;
      
      const response = await this.fetchWithTimeout(url);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      
      // Transform dates from ISO strings to Date objects
      const tournaments = data.tournaments.map((tournament: Record<string, unknown>) => ({
        ...tournament,
        dates: {
          start: new Date((tournament.dates as Record<string, string>).start),
          end: new Date((tournament.dates as Record<string, string>).end)
        }
      }));

      return {
        tournaments,
        pagination: data.pagination
      };
    } catch (error) {
      console.error('Failed to fetch tournaments:', error);
      throw error;
    }
  }

  async getTournamentById(id: string): Promise<TournamentDetailResponse> {
    try {
      const response = await this.fetchWithTimeout(`${API_BASE_URL}/api/tournaments/${id}`);

      if (!response.ok) {
        if (response.status === 404) {
          throw new Error('Tournament not found');
        }
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      
      // Transform tournament dates from ISO strings to Date objects
      const tournament = {
        ...data.tournament,
        dates: {
          start: new Date(data.tournament.dates.start),
          end: new Date(data.tournament.dates.end)
        }
      };

      // Transform match dates from ISO strings to Date objects
      const matches = data.matches.map((match: Record<string, unknown>) => ({
        ...match,
        scheduledTime: new Date(match.scheduledTime as string),
        actualStartTime: match.actualStartTime ? new Date(match.actualStartTime as string) : undefined
      }));

      return {
        tournament,
        matches,
        statistics: data.statistics
      };
    } catch (error) {
      console.error(`Failed to fetch tournament ${id}:`, error);
      throw error;
    }
  }
}

export const tournamentService = new TournamentService();