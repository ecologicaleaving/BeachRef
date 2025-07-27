import { Router } from 'express';
import { visController } from '../controllers/vis.controller';
import { visRateLimit } from '../middleware/rateLimit.middleware';

const router = Router();

/**
 * @route   GET /api/vis/test
 * @desc    Test VIS API connectivity and data access
 * @access  Public
 */
router.get('/test', visRateLimit, visController.testConnectivity);

/**
 * @route   GET /api/vis/tournaments/count
 * @desc    Get total tournament count (basic connectivity test)
 * @access  Public
 */
router.get('/tournaments/count', visRateLimit, visController.getTournamentCount);

/**
 * @route   GET /api/vis/tournaments
 * @desc    Get tournaments with optional filtering
 * @query   level, status, country, startDateFrom, startDateTo, limit, offset
 * @access  Public
 */
router.get('/tournaments', visRateLimit, visController.getTournaments);

/**
 * @route   GET /api/vis/tournaments/:id
 * @desc    Get tournament by ID
 * @access  Public
 */
router.get('/tournaments/:id', visRateLimit, visController.getTournamentById);

/**
 * @route   GET /api/vis/cache/stats
 * @desc    Get cache statistics
 * @access  Public
 */
router.get('/cache/stats', visController.getCacheStats);

export default router;