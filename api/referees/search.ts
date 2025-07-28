import type { VercelRequest, VercelResponse } from '@vercel/node';

// Self-contained mock referee data for Vercel deployment
function generateMockReferees() {
  return [
    { name: 'John Smith', country: 'USA', matchCount: 15 },
    { name: 'Maria Garcia', country: 'ESP', matchCount: 12 },
    { name: 'Hans Mueller', country: 'GER', matchCount: 8 },
    { name: 'Yuki Tanaka', country: 'JPN', matchCount: 5 },
    { name: 'Pierre Dubois', country: 'FRA', matchCount: 18 },
    { name: 'Ana Santos', country: 'BRA', matchCount: 22 },
    { name: 'Marco Rossi', country: 'ITA', matchCount: 14 },
    { name: 'Emma Johnson', country: 'AUS', matchCount: 9 },
    { name: 'Carlos Rodriguez', country: 'ARG', matchCount: 11 },
    { name: 'Lisa Anderson', country: 'SWE', matchCount: 7 },
    { name: 'Ahmed Hassan', country: 'EGY', matchCount: 6 },
    { name: 'Sofia Popovic', country: 'SRB', matchCount: 13 },
    { name: 'David Lee', country: 'KOR', matchCount: 10 },
    { name: 'Isabella Costa', country: 'POR', matchCount: 8 },
    { name: 'Robert Wilson', country: 'CAN', matchCount: 16 }
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
    const query = req.query.q as string;

    if (!query || typeof query !== 'string' || query.trim().length < 2) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Query parameter "q" is required and must be at least 2 characters',
        statusCode: 400,
        timestamp: new Date().toISOString()
      });
    }

    // Filter referees based on query
    const allReferees = generateMockReferees();
    const searchQuery = query.trim().toLowerCase();
    
    const filteredReferees = allReferees
      .filter(referee => 
        referee.name.toLowerCase().includes(searchQuery) ||
        (referee.country && referee.country.toLowerCase().includes(searchQuery))
      )
      .sort((a, b) => b.matchCount - a.matchCount) // Sort by match count descending
      .slice(0, 10); // Limit to top 10 results

    const response = {
      referees: filteredReferees
    };

    res.status(200).json(response);
  } catch (error) {
    console.error('Referee search failed:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to search referees',
      statusCode: 500,
      timestamp: new Date().toISOString()
    });
  }
}