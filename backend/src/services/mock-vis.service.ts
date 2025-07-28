import { Tournament, TournamentDetail, TournamentFilters, HealthStatus, TournamentLevel, TournamentStatus } from '../types/vis.types';
import { Match as TournamentMatch } from '../types/tournament.types';

export class MockVISService {
  private mockTournaments: Tournament[] = [
    {
      id: 'mock-001',
      name: 'Beach Volleyball World Championships 2024',
      dates: {
        start: new Date('2024-08-15'),
        end: new Date('2024-08-25')
      },
      location: {
        city: 'Rio de Janeiro',
        country: 'Brazil',
        venue: 'Copacabana Beach Arena'
      },
      level: TournamentLevel.WORLD_CHAMPIONSHIP,
      status: TournamentStatus.COMPLETED,
      matchCount: 64
    },
    {
      id: 'mock-002',
      name: 'FIVB World Tour Finals 2024',
      dates: {
        start: new Date('2024-09-10'),
        end: new Date('2024-09-15')
      },
      location: {
        city: 'Doha',
        country: 'Qatar',
        venue: 'Katara Beach Complex'
      },
      level: TournamentLevel.WORLD_TOUR,
      status: TournamentStatus.ONGOING,
      matchCount: 32
    },
    {
      id: 'mock-003',
      name: 'European Beach Volleyball Championship 2024',
      dates: {
        start: new Date('2024-07-20'),
        end: new Date('2024-07-28')
      },
      location: {
        city: 'Vienna',
        country: 'Austria',
        venue: 'Donauinsel Beach Arena'
      },
      level: TournamentLevel.CONTINENTAL,
      status: TournamentStatus.COMPLETED,
      matchCount: 48
    },
    {
      id: 'mock-004',
      name: 'Asian Beach Games 2024',
      dates: {
        start: new Date('2024-10-05'),
        end: new Date('2024-10-12')
      },
      location: {
        city: 'Sanya',
        country: 'China',
        venue: 'Sanya Bay Beach Stadium'
      },
      level: TournamentLevel.CONTINENTAL,
      status: TournamentStatus.UPCOMING,
      matchCount: 40
    },
    {
      id: 'mock-005',
      name: 'USA Beach Volleyball National Championship',
      dates: {
        start: new Date('2024-06-15'),
        end: new Date('2024-06-22')
      },
      location: {
        city: 'Manhattan Beach',
        country: 'USA',
        venue: 'Manhattan Beach Pier'
      },
      level: TournamentLevel.NATIONAL,
      status: TournamentStatus.COMPLETED,
      matchCount: 56
    },
    {
      id: 'mock-006',
      name: 'FIVB Beach Volleyball World Tour - Rome',
      dates: {
        start: new Date('2024-11-01'),
        end: new Date('2024-11-05')
      },
      location: {
        city: 'Rome',
        country: 'Italy',
        venue: 'Foro Italico Beach Arena'
      },
      level: TournamentLevel.WORLD_TOUR,
      status: TournamentStatus.UPCOMING,
      matchCount: 24
    }
  ];

  private mockMatches: { [tournamentId: string]: TournamentMatch[] } = {
    'mock-001': [
      {
        id: 'match-001-01',
        tournamentId: 'mock-001',
        teams: {
          team1: {
            player1: 'Ana Patricia Silva Ramos',
            player2: 'Duda Lisboa',
            country: 'BRA'
          },
          team2: {
            player1: 'Melissa Humana-Paredes',
            player2: 'Brandie Wilkerson',
            country: 'CAN'
          }
        },
        score: {
          set1: { team1: 21, team2: 18 },
          set2: { team1: 21, team2: 16 }
        },
        status: 'Completed',
        scheduledTime: new Date('2024-08-25T18:00:00Z'),
        actualStartTime: new Date('2024-08-25T18:05:00Z'),
        duration: 45,
        round: 'Gold Medal Match',
        court: 'Center Court',
        winner: 'team1'
      },
      {
        id: 'match-001-02',
        tournamentId: 'mock-001',
        teams: {
          team1: {
            player1: 'Tanja Hüberli',
            player2: 'Nina Betschart',
            country: 'SUI'
          },
          team2: {
            player1: 'Barbora Hermannová',
            player2: 'Marie-Sara Štochlová',
            country: 'CZE'
          }
        },
        score: {
          set1: { team1: 21, team2: 19 },
          set2: { team1: 19, team2: 21 },
          set3: { team1: 15, team2: 13 }
        },
        status: 'Completed',
        scheduledTime: new Date('2024-08-25T15:30:00Z'),
        actualStartTime: new Date('2024-08-25T15:35:00Z'),
        duration: 62,
        round: 'Bronze Medal Match',
        court: 'Court 1',
        winner: 'team1'
      }
    ],
    'mock-002': [
      {
        id: 'match-002-01',
        tournamentId: 'mock-002',
        teams: {
          team1: {
            player1: 'Anders Mol',
            player2: 'Christian Sørum',
            country: 'NOR'
          },
          team2: {
            player1: 'David Åhman',
            player2: 'Jonatan Hellvig',
            country: 'SWE'
          }
        },
        score: {
          set1: { team1: 19, team2: 21 },
          set2: { team1: 21, team2: 15 }
        },
        status: 'Live',
        scheduledTime: new Date('2024-09-15T16:00:00Z'),
        actualStartTime: new Date('2024-09-15T16:05:00Z'),
        round: 'Semi-Final',
        court: 'Center Court'
      },
      {
        id: 'match-002-02',
        tournamentId: 'mock-002',
        teams: {
          team1: {
            player1: 'Evandro Gonçalves',
            player2: 'Arthur Lanci',
            country: 'BRA'
          },
          team2: {
            player1: 'Sam Pedlow',
            player2: 'Ben Saxton',
            country: 'ENG'
          }
        },
        score: {},
        status: 'Scheduled',
        scheduledTime: new Date('2024-09-15T19:00:00Z'),
        round: 'Semi-Final',
        court: 'Court 1'
      }
    ]
  };

  async healthCheck(): Promise<HealthStatus> {
    return {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      responseTime: 50
    };
  }

  async getTournamentCount(): Promise<number> {
    return this.mockTournaments.length;
  }

  async getTournaments(filters: TournamentFilters = {}): Promise<Tournament[]> {
    let tournaments = [...this.mockTournaments];

    // Apply filters
    if (filters.country) {
      tournaments = tournaments.filter(t => 
        t.location.country.toLowerCase().includes(filters.country!.toLowerCase())
      );
    }

    if (filters.startDateFrom) {
      tournaments = tournaments.filter(t => t.dates.start >= filters.startDateFrom!);
    }

    if (filters.startDateTo) {
      tournaments = tournaments.filter(t => t.dates.start <= filters.startDateTo!);
    }

    if (filters.limit) {
      tournaments = tournaments.slice(0, filters.limit);
    }

    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 200));

    return tournaments;
  }

  async getTournamentById(id: string): Promise<TournamentDetail | null> {
    const tournament = this.mockTournaments.find(t => t.id === id);
    
    if (!tournament) {
      return null;
    }

    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 150));

    return {
      ...tournament,
      matches: [],
      description: `Mock description for ${tournament.name}. This is a demonstration tournament with fake data for UI testing purposes.`
    };
  }

  async getTournamentMatches(tournamentId: string): Promise<TournamentMatch[]> {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 100));

    return this.mockMatches[tournamentId] || [];
  }

  clearCache(): void {
    // Mock implementation - nothing to clear
  }

  getCacheStats(): { keys: number; hits: number; misses: number } {
    return { keys: 0, hits: 0, misses: 0 };
  }
}

export const mockVISService = new MockVISService();