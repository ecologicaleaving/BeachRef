import type { VercelRequest, VercelResponse } from '@vercel/node';
import { tournamentService } from '../../backend/src/services/tournament.service';

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
    const result = await tournamentService.getTournamentById(id);
    
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