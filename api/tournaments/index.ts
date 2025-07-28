import type { VercelRequest, VercelResponse } from '@vercel/node';
import { tournamentService } from '../../backend/src/services/tournament.service';
import { TournamentQueryParams } from '../../backend/src/types/tournament.types';

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
    const params: TournamentQueryParams = {
      page: parseInt(req.query.page as string) || 1,
      limit: parseInt(req.query.limit as string) || 10,
      search: req.query.search as string,
      dateFrom: req.query.dateFrom as string,
      dateTo: req.query.dateTo as string,
      location: req.query.location as string,
      locations: req.query.locations as string,
      types: req.query.types as string,
      surface: req.query.surface as 'Sand' | 'Indoor',
      gender: req.query.gender as 'Men' | 'Women' | 'Mixed',
      statuses: req.query.statuses as string
    };

    const result = await tournamentService.getTournaments(params);
    res.status(200).json(result);
  } catch (error) {
    console.error('Failed to get tournaments:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}