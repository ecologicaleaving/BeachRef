import express from 'express';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import { config } from './config/environment';
import healthRoutes from './routes/health.routes';
import visRoutes from './routes/vis.routes';
import { tournamentRoutes } from './routes/tournament.routes';
import { refereeRoutes } from './routes/referee.routes';
import { errorHandler, requestId } from './middleware/error.middleware';
import { appLogger } from './utils/logger';

const app = express();

// Rate limiting
const limiter = rateLimit({
  windowMs: config.rateLimit.windowMs,
  max: config.rateLimit.maxRequests,
  message: 'Too many requests from this IP, please try again later.',
});

// Middleware
app.use(requestId); // Add request ID to all requests
app.use(limiter);
app.use(cors({
  origin: config.cors.origin,
  credentials: true,
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health check routes
app.use('/api/health', healthRoutes);

// VIS API routes
app.use('/api/vis', visRoutes);

// Tournament API routes
app.use('/api/tournaments', tournamentRoutes);

// Story 1.3: Referee API routes
app.use('/api/referees', refereeRoutes);

// Legacy health check endpoint (for backwards compatibility)
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    environment: config.nodeEnv,
    message: 'Use /api/health for detailed health information'
  });
});

// API routes placeholder
app.get('/api', (req, res) => {
  res.json({
    message: 'VisConnect API v1.0',
    documentation: '/api/docs',
    health: '/api/health',
    visHealth: '/api/health/vis',
    monitoring: '/api/health/monitoring',
    visTest: '/api/vis/test',
    tournaments: '/api/tournaments',
    refereeSearch: '/api/referees/search',
    visLegacyTournaments: '/api/vis/tournaments',
    tournamentCount: '/api/vis/tournaments/count'
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    error: 'Route not found',
    path: req.originalUrl,
  });
});

// Error handler
app.use(errorHandler);

// Start server
const server = app.listen(config.port, () => {
  appLogger.startup(`Server running on port ${config.port} in ${config.nodeEnv} mode`, config.port);
  appLogger.startup(`Health check: http://localhost:${config.port}/api/health`);
  appLogger.startup(`VIS Health: http://localhost:${config.port}/api/health/vis`);
  appLogger.startup(`Monitoring: http://localhost:${config.port}/api/health/monitoring`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  appLogger.shutdown('SIGTERM received, shutting down gracefully', 'SIGTERM');
  server.close(() => {
    appLogger.shutdown('Process terminated');
  });
});

process.on('SIGINT', () => {
  appLogger.shutdown('SIGINT received, shutting down gracefully', 'SIGINT');
  server.close(() => {
    appLogger.shutdown('Process terminated');
  });
});

export default app;