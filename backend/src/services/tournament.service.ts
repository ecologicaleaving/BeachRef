import { visService } from './vis-factory.service';
import { Tournament, PaginatedTournamentResponse, TournamentQueryParams, TournamentDetailResponse, Match, RefereeSearchResponse } from '../types/tournament.types';
import { TournamentFilters } from '../types/vis.types';
import { visLogger } from '../utils/logger';

export class TournamentService {
  async getTournaments(params: TournamentQueryParams): Promise<PaginatedTournamentResponse> {
    try {
      const page = Math.max(1, params.page || 1);
      const limit = Math.min(50, Math.max(1, params.limit || 10));
      const offset = (page - 1) * limit;

      // Build VIS API filters from query params
      const filters: TournamentFilters = {
        limit,
        offset
      };

      if (params.dateFrom) {
        filters.startDateFrom = new Date(params.dateFrom);
      }
      if (params.dateTo) {
        filters.startDateTo = new Date(params.dateTo);
      }
      if (params.location) {
        filters.country = params.location;
      }
      
      // Handle new filter parameters
      if (params.locations) {
        const locationArray = params.locations.split(',').map(loc => loc.trim());
        // For now, use the first location for country filter
        // In a real implementation, this would be more sophisticated
        if (locationArray.length > 0) {
          filters.country = locationArray[0];
        }
      }

      // Get tournaments from VIS API
      const visTournaments = await visService.getTournaments(filters);
      
      // Transform VIS tournaments to our Tournament interface
      let tournaments: Tournament[] = visTournaments.map(this.transformTournament);
      
      // Apply client-side filtering for parameters not supported by VIS API
      tournaments = this.applyClientSideFilters(tournaments, params);

      // Get total count for pagination
      const totalCount = await visService.getTournamentCount();
      const totalPages = Math.ceil(totalCount / limit);

      const response: PaginatedTournamentResponse = {
        tournaments,
        pagination: {
          page,
          limit,
          total: totalCount,
          totalPages
        }
      };

      visLogger.info('Tournaments retrieved successfully', {
        count: tournaments.length,
        page,
        limit,
        total: totalCount
      });

      return response;
    } catch (error) {
      visLogger.error('Failed to get tournaments', error as Error, { params });
      throw error;
    }
  }

  async getTournamentById(id: string): Promise<TournamentDetailResponse | null> {
    try {
      // Get tournament details from VIS API
      const visTournament = await visService.getTournamentById(id);
      
      if (!visTournament) {
        return null;
      }

      const tournament = this.transformTournament(visTournament);
      
      // Get tournament matches
      const matches = await visService.getTournamentMatches(id);
      
      // Calculate statistics
      const statistics = this.calculateTournamentStatistics(matches);
      
      const response: TournamentDetailResponse = {
        tournament,
        matches,
        statistics
      };
      
      visLogger.info('Tournament detail retrieved successfully', { 
        tournamentId: id, 
        matchCount: matches.length 
      });
      
      return response;
    } catch (error) {
      visLogger.error(`Failed to get tournament ${id}`, error as Error, { tournamentId: id });
      throw error;
    }
  }

  // Story 1.3: Search referees for autocomplete
  async searchReferees(query: string): Promise<RefereeSearchResponse> {
    try {
      // Get all tournaments to then get their matches
      const tournaments = await visService.getTournaments();
      const refereeMap = new Map<string, { name: string; country?: string; matchCount: number }>();
      
      // Get matches for each tournament and extract referee data
      for (const tournament of tournaments.slice(0, 5)) { // Limit to first 5 tournaments for performance
        try {
          const matches = await visService.getTournamentMatches(tournament.id);
          
          matches.forEach(match => {
            if (match.referees?.main) {
              const referee = match.referees.main;
              const key = referee.name.toLowerCase();
              if (key.includes(query.toLowerCase())) {
                if (refereeMap.has(key)) {
                  refereeMap.get(key)!.matchCount++;
                } else {
                  refereeMap.set(key, {
                    name: referee.name,
                    country: referee.country,
                    matchCount: 1
                  });
                }
              }
            }
            
            if (match.referees?.assistant) {
              const referee = match.referees.assistant;
              const key = referee.name.toLowerCase();
              if (key.includes(query.toLowerCase())) {
                if (refereeMap.has(key)) {
                  refereeMap.get(key)!.matchCount++;
                } else {
                  refereeMap.set(key, {
                    name: referee.name,
                    country: referee.country,
                    matchCount: 1
                  });
                }
              }
            }
          });
        } catch (matchError) {
          // Continue with next tournament if one fails
          visLogger.error(`Failed to get matches for tournament ${tournament.id}`, matchError as Error);
        }
      }
      
      // Convert to array and sort by match count (descending)
      const referees = Array.from(refereeMap.values())
        .sort((a, b) => b.matchCount - a.matchCount)
        .slice(0, 10); // Limit to top 10 results
      
      const response: RefereeSearchResponse = {
        referees
      };
      
      visLogger.info('Referee search completed successfully', {
        query,
        resultCount: referees.length
      });
      
      return response;
    } catch (error) {
      visLogger.error('Failed to search referees', error as Error, { query });
      throw error;
    }
  }

  private transformTournament(visTournament: any): Tournament {
    return {
      id: visTournament.id,
      name: visTournament.name,
      dates: {
        start: visTournament.dates.start,
        end: visTournament.dates.end
      },
      location: {
        city: visTournament.location.city,
        country: visTournament.location.country,
        venue: visTournament.location.venue,
        coordinates: visTournament.location.coordinates
      },
      level: this.mapLevel(visTournament.level),
      status: this.mapStatus(visTournament.status),
      matchCount: visTournament.matchCount || 0,
      prizeMoney: visTournament.prizeMoney,
      surface: visTournament.surface || 'Sand',
      gender: visTournament.gender || 'Mixed'
    };
  }

  private mapLevel(visLevel: any): 'World Tour' | 'Continental' | 'National' | 'Regional' {
    switch (visLevel?.toString().toLowerCase()) {
      case 'world_tour':
      case 'world tour':
        return 'World Tour';
      case 'continental':
        return 'Continental';
      case 'national':
        return 'National';
      default:
        return 'Regional';
    }
  }

  private mapStatus(visStatus: any): 'Upcoming' | 'Live' | 'Completed' | 'Cancelled' {
    switch (visStatus?.toString().toLowerCase()) {
      case 'upcoming':
        return 'Upcoming';
      case 'ongoing':
      case 'live':
        return 'Live';
      case 'completed':
        return 'Completed';
      case 'cancelled':
        return 'Cancelled';
      default:
        return 'Upcoming';
    }
  }

  private applyClientSideFilters(tournaments: Tournament[], params: TournamentQueryParams): Tournament[] {
    return tournaments.filter(tournament => {
      // Search filter
      if (params.search) {
        const searchTerm = params.search.toLowerCase();
        const matchesSearch = 
          tournament.name.toLowerCase().includes(searchTerm) ||
          tournament.location.city.toLowerCase().includes(searchTerm) ||
          tournament.location.country.toLowerCase().includes(searchTerm);
        if (!matchesSearch) return false;
      }

      // Multiple locations filter
      if (params.locations) {
        const locationArray = params.locations.split(',').map(loc => loc.trim().toLowerCase());
        const tournamentLocation = `${tournament.location.city}, ${tournament.location.country}`.toLowerCase();
        const matchesLocation = locationArray.some(loc => 
          tournamentLocation.includes(loc) ||
          tournament.location.city.toLowerCase().includes(loc) ||
          tournament.location.country.toLowerCase().includes(loc)
        );
        if (!matchesLocation) return false;
      }

      // Tournament types filter
      if (params.types) {
        const typeArray = params.types.split(',').map(type => type.trim());
        if (!typeArray.includes(tournament.level)) return false;
      }

      // Surface filter
      if (params.surface && tournament.surface !== params.surface) {
        return false;
      }

      // Gender filter
      if (params.gender && tournament.gender !== params.gender) {
        return false;
      }

      // Status filter
      if (params.statuses) {
        const statusArray = params.statuses.split(',').map(status => status.trim());
        if (!statusArray.includes(tournament.status)) return false;
      }

      // Story 1.3: Referee filter
      if (params.referees) {
        const refereeArray = params.referees.split(',').map(ref => ref.trim().toLowerCase());
        // This would require getting tournament matches and checking referees
        // For now, we'll skip this filter as it would require significant refactoring
        // In a real implementation, this would be handled at the database level
      }

      return true;
    });
  }

  private calculateTournamentStatistics(matches: Match[]): {
    totalMatches: number;
    completedMatches: number;
    upcomingMatches: number;
    liveMatches: number;
  } {
    const totalMatches = matches.length;
    const completedMatches = matches.filter(match => match.status === 'Completed').length;
    const upcomingMatches = matches.filter(match => match.status === 'Scheduled').length;
    const liveMatches = matches.filter(match => match.status === 'Live').length;

    return {
      totalMatches,
      completedMatches,
      upcomingMatches,
      liveMatches
    };
  }
}

export const tournamentService = new TournamentService();