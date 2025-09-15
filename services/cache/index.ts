/**
 * Unified Cache System
 * Part of Service Layer Consolidation Refactoring
 *
 * This module consolidates:
 * - LocalStorageManager functionality
 * - TournamentStorageService caching logic
 * - RefereeAssignmentsService cache patterns
 *
 * Usage:
 * 1. Use UnifiedCacheManager directly for new code
 * 2. Use migration adapters for existing code compatibility
 * 3. Gradually migrate existing usage to unified patterns
 */

// Core cache system
export { UnifiedCacheManager, cacheManager } from './UnifiedCacheManager';
export type { CacheOperationResult, CacheStats } from './UnifiedCacheManager';

// Cache strategies and configuration
export { CacheStrategies, CacheStrategyFactory } from './CacheStrategy';
export type { CacheStrategy, CacheEntry, CacheMetadata } from './CacheStrategy';

// Migration adapters for backward compatibility
export {
  LocalStorageManagerAdapter,
  TournamentStorageServiceAdapter,
  localStorageManager,
  TournamentStorageService
} from './CacheMigrationAdapter';
export type { UserPreferences } from './CacheMigrationAdapter';

/**
 * Quick start guide:
 *
 * // For new code - use UnifiedCacheManager directly:
 * import { cacheManager, CacheStrategies } from './services/cache';
 *
 * await cacheManager.set('tournament_details', 'tournament_123', tournamentData);
 * const result = await cacheManager.get('tournament_details', 'tournament_123');
 *
 * // For existing code - use migration adapters:
 * import { TournamentStorageService } from './services/cache';
 *
 * await TournamentStorageService.saveSelectedTournament(tournament);
 * const tournament = await TournamentStorageService.getSelectedTournament();
 *
 * // Available cache strategies:
 * - GENERAL: 6 hours TTL for general caching
 * - TOURNAMENT_DETAILS: 6 hours TTL with compression
 * - REFEREE_DATA: 24 hours TTL with compression
 * - OFFLINE: 7 days TTL for offline data
 * - USER_PREFERENCES: Never expires automatically
 * - ASSIGNMENTS: 5 minutes TTL for assignment data
 */