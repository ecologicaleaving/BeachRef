import { Router } from 'express';
import { tournamentController } from '../controllers/tournament.controller';
import { generalRateLimit } from '../middleware/rateLimit.middleware';

const router = Router();

// Apply rate limiting to all tournament routes
router.use(generalRateLimit);

// GET /api/tournaments - Get paginated list of tournaments with filtering
router.get('/', tournamentController.getTournaments.bind(tournamentController));

// GET /api/tournaments/:id - Get specific tournament by ID
router.get('/:id', tournamentController.getTournamentById.bind(tournamentController));

export { router as tournamentRoutes };