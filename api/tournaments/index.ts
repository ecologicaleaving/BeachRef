import type { VercelRequest, VercelResponse } from '@vercel/node';

// Self-contained mock data for Vercel deployment
function generateMockTournaments() {
  const now = new Date();
  const currentYear = now.getFullYear();
  
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
    {
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
    },
    {
      id: 'mock-003',
      name: `European Beach Volleyball Championship ${currentYear}`,
      dates: {
        start: daysFromNow(-40),
        end: daysFromNow(-32)
      },
      location: {
        city: 'Vienna',
        country: 'Austria',
        venue: 'Donauinsel Beach Arena'
      },
      level: 'Continental',
      status: 'Completed',
      matchCount: 48,
      surface: 'Sand',
      gender: 'Mixed'
    },
    {
      id: 'mock-004',
      name: `Asian Beach Games ${currentYear}`,
      dates: {
        start: daysFromNow(15),
        end: daysFromNow(22)
      },
      location: {
        city: 'Sanya',
        country: 'China',
        venue: 'Sanya Bay Beach Stadium'
      },
      level: 'Continental',
      status: 'Upcoming',
      matchCount: 40,
      surface: 'Sand',
      gender: 'Mixed'
    },
    {
      id: 'mock-005',
      name: `USA Beach Volleyball National Championship`,
      dates: {
        start: daysFromNow(-60),
        end: daysFromNow(-53)
      },
      location: {
        city: 'Manhattan Beach',
        country: 'USA',
        venue: 'Manhattan Beach Pier'
      },
      level: 'National',
      status: 'Completed',
      matchCount: 56,
      surface: 'Sand',
      gender: 'Mixed'
    },
    {
      id: 'mock-006',
      name: `FIVB Beach Volleyball World Tour - Rome`,
      dates: {
        start: daysFromNow(30),
        end: daysFromNow(34)
      },
      location: {
        city: 'Rome',
        country: 'Italy',
        venue: 'Foro Italico Beach Arena'
      },
      level: 'World Tour',
      status: 'Upcoming',
      matchCount: 24,
      surface: 'Sand',
      gender: 'Mixed'
    }
  ];
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

  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;

    // Generate mock tournaments
    const tournaments = generateMockTournaments();
    
    // Simple pagination
    const startIndex = (page - 1) * limit;
    const paginatedTournaments = tournaments.slice(startIndex, startIndex + limit);
    
    const response = {
      tournaments: paginatedTournaments,
      pagination: {
        page,
        limit,
        total: tournaments.length,
        totalPages: Math.ceil(tournaments.length / limit)
      }
    };

    res.status(200).json(response);
  } catch (error) {
    console.error('Failed to get tournaments:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}