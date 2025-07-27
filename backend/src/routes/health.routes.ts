import { Router } from 'express';
import { healthController } from '../controllers/health.controller';
import { healthRateLimit, adminRateLimit, visRateLimit } from '../middleware/rateLimit.middleware';

const router = Router();

/**
 * @route   GET /api/health
 * @desc    Basic application health check
 * @access  Public
 */
router.get('/', healthRateLimit, healthController.getHealth);

/**
 * @route   GET /api/health/vis
 * @desc    Detailed VIS API connectivity health check
 * @access  Public
 */
router.get('/vis', visRateLimit, healthController.getVISHealth);

/**
 * @route   GET /api/health/monitoring
 * @desc    Detailed monitoring dashboard data
 * @access  Public
 */
router.get('/monitoring', healthRateLimit, healthController.getMonitoring);

/**
 * @route   DELETE /api/health/cache
 * @desc    Clear cache (with optional pattern)
 * @access  Admin (for now public, should be protected in production)
 */
router.delete('/cache', adminRateLimit, healthController.clearCache);

export default router;