import type { VercelRequest, VercelResponse } from '@vercel/node';

// Self-contained mock data for tournament details
function getMockTournamentById(id: string) {
  const now = new Date();
  const currentYear = now.getFullYear();
  
  const daysFromNow = (days: number, hours: number = 0) => {
    const date = new Date(now);
    date.setDate(date.getDate() + days);
    date.setHours(date.getHours() + hours);
    return date;
  };

  const tournaments: any = {
    'mock-001': {
      id: 'mock-001',
      name: `Beach Volleyball World Championships ${currentYear}`,
      dates: {
        start: daysFromNow(-20),
        end: daysFromNow(-10)
      },
      location: {
        city: 'Rio de Janeiro',
        country: 'Brazil',
        venue: 'Copacabana Beach Arena'
      },
      level: 'World Tour',
      status: 'Completed',
      matchCount: 64,
      surface: 'Sand',
      gender: 'Mixed'
    },
    'mock-002': {
      id: 'mock-002',
      name: `FIVB World Tour Finals ${currentYear}`,
      dates: {
        start: daysFromNow(-3),
        end: daysFromNow(2)
      },
      location: {
        city: 'Doha',
        country: 'Qatar',
        venue: 'Katara Beach Complex'
      },
      level: 'World Tour',
      status: 'Live',
      matchCount: 32,
      surface: 'Sand',
      gender: 'Mixed'
    }
  };

  const mockMatches: any = {
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
        scheduledTime: daysFromNow(-10, 18),
        actualStartTime: daysFromNow(-10, 18),
        duration: 45,
        round: 'Gold Medal Match',
        court: 'Center Court',
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
        scheduledTime: daysFromNow(0, -2),
        actualStartTime: daysFromNow(0, -2),
        round: 'Semi-Final',
        court: 'Center Court'
      }
    ]
  };

  const tournament = tournaments[id];
  if (!tournament) return null;

  return {
    tournament,
    matches: mockMatches[id] || [],
    statistics: {
      totalMatches: mockMatches[id]?.length || 0,
      completedMatches: mockMatches[id]?.filter((m: any) => m.status === 'Completed').length || 0,
      liveMatches: mockMatches[id]?.filter((m: any) => m.status === 'Live').length || 0,
      upcomingMatches: mockMatches[id]?.filter((m: any) => m.status === 'Scheduled').length || 0
    }
  };
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { id } = req.query;

  if (!id || typeof id !== 'string') {
    return res.status(400).json({ error: 'Tournament ID is required' });
  }

  try {
    const result = getMockTournamentById(id);
    
    if (!result) {
      return res.status(404).json({ error: 'Tournament not found' });
    }

    res.status(200).json(result);
  } catch (error) {
    console.error(`Failed to get tournament ${id}:`, error);
    res.status(500).json({ 
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}