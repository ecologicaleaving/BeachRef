import { Tournament, TournamentDetail, TournamentFilters, HealthStatus, TournamentLevel, TournamentStatus } from '../types/vis.types';
import { Match as TournamentMatch } from '../types/tournament.types';

export class MockVISService {
  private mockTournaments: Tournament[] = this.generateMockTournaments();

  private generateMockTournaments(): Tournament[] {
    const now = new Date();
    const currentYear = now.getFullYear();
    
    // Helper to create date relative to today
    const daysFromNow = (days: number) => {
      const date = new Date(now);
      date.setDate(date.getDate() + days);
      return date;
    };

    return [
      {
        id: 'mock-001',
        name: `Beach Volleyball World Championships ${currentYear}`,
        dates: {
          start: daysFromNow(-20), // Started 20 days ago
          end: daysFromNow(-10)    // Ended 10 days ago
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
        name: `FIVB World Tour Finals ${currentYear}`,
        dates: {
          start: daysFromNow(-3),  // Started 3 days ago
          end: daysFromNow(2)      // Ends in 2 days
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
        name: `European Beach Volleyball Championship ${currentYear}`,
        dates: {
          start: daysFromNow(-40), // Started 40 days ago
          end: daysFromNow(-32)    // Ended 32 days ago
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
        name: `Asian Beach Games ${currentYear}`,
        dates: {
          start: daysFromNow(15),  // Starts in 15 days
          end: daysFromNow(22)     // Ends in 22 days
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
        name: `USA Beach Volleyball National Championship`,
        dates: {
          start: daysFromNow(-60), // Started 60 days ago
          end: daysFromNow(-53)    // Ended 53 days ago
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
        name: `FIVB Beach Volleyball World Tour - Rome`,
        dates: {
          start: daysFromNow(30),  // Starts in 30 days
          end: daysFromNow(34)     // Ends in 34 days
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
  }

  private mockMatches: { [tournamentId: string]: TournamentMatch[] } = this.generateMockMatches();

  private generateMockMatches(): { [tournamentId: string]: TournamentMatch[] } {
    const now = new Date();
    
    // Helper to create date relative to today
    const daysFromNow = (days: number, hours: number = 0) => {
      const date = new Date(now);
      date.setDate(date.getDate() + days);
      date.setHours(date.getHours() + hours);
      return date;
    };

    return {
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
        scheduledTime: daysFromNow(-10, 18),  // 10 days ago at 18:00
        actualStartTime: daysFromNow(-10, 18),
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
        scheduledTime: daysFromNow(-10, 15),  // 10 days ago at 15:30
        actualStartTime: daysFromNow(-10, 15),
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
        scheduledTime: daysFromNow(0, -2),  // Today, 2 hours ago
        actualStartTime: daysFromNow(0, -2),
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
        scheduledTime: daysFromNow(1, 10),  // Tomorrow at 10:00
        round: 'Semi-Final',
        court: 'Court 1'
      }
    ]
    };
  }

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