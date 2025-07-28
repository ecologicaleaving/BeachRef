import { Router } from 'express';
import { tournamentController } from '../controllers/tournament.controller';
import { generalRateLimit } from '../middleware/rateLimit.middleware';

const router = Router();

// Apply rate limiting to all referee routes
router.use(generalRateLimit);

// Story 1.3: GET /api/referees/search - Search referees for autocomplete
router.get('/search', tournamentController.searchReferees.bind(tournamentController));

export { router as refereeRoutes };