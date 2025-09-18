/**
 * Modular Real-time Services
 * Part of Real-time Service Architecture Simplification Refactoring
 *
 * This module replaces the monolithic RealtimeSubscriptionService (656 lines) with:
 * - SubscriptionManager: Subscription lifecycle management
 * - ConnectionPoolManager: Connection pooling and retry logic
 * - RealtimeOrchestrator: Service coordination
 * - Migration adapters for backward compatibility
 *
 * Benefits:
 * - Single Responsibility Principle
 * - Easier testing with dependency injection
 * - Better maintainability
 * - Reduced coupling between concerns
 */

// Core modular services (recommended for new code)
export { SubscriptionManager } from './SubscriptionManager';
export type { SubscriptionConfig, Subscription, SubscriptionEventHandler } from './SubscriptionManager';

export { ConnectionPoolManager, ConnectionState } from './ConnectionPoolManager';
export type { ConnectionHealth, RetryConfig } from './ConnectionPoolManager';

export { RealtimeOrchestrator } from './RealtimeOrchestrator';
export type { OrchestratorConfig, SubscriptionRequest, SubscriptionStatus } from './RealtimeOrchestrator';

// Migration adapters for backward compatibility
export {
  RealtimeSubscriptionService,
  RealtimeSubscriptionServiceLegacy,
  RealtimeSubscriptionServiceInstance
} from './RealtimeMigrationAdapter';

// Re-exported types for compatibility (avoiding duplicates)
export type { ConnectionStateListener } from './ConnectionPoolManager';

/**
 * Quick Migration Guide:
 *
 * STEP 1: Replace imports (no code changes needed)
 * OLD: import { RealtimeSubscriptionService } from '../services/RealtimeSubscriptionService';
 * NEW: import { RealtimeSubscriptionService } from '../services/realtime';
 *
 * STEP 2: For new features, use the modular approach
 * import { RealtimeOrchestrator } from '../services/realtime';
 * const orchestrator = RealtimeOrchestrator.getInstance();
 * await orchestrator.subscribe({
 *   tournamentNo: '123',
 *   liveMatchesOnly: true,
 * });
 *
 * STEP 3: Benefits of the new architecture
 * - Dependency injection for testing
 * - Focused single responsibilities
 * - Better error handling and circuit breaking
 * - Improved performance monitoring
 * - Cleaner fallback management
 */

/**
 * Service Architecture:
 *
 * ┌─────────────────────────────────────┐
 * │         RealtimeOrchestrator        │  ← High-level coordination
 * │  (Service coordination & policies)  │
 * └─────────────────┬───────────────────┘
 *                   │
 *        ┌──────────┼──────────┐
 *        │          │          │
 *        ▼          ▼          ▼
 * ┌─────────────┐ ┌──────────┐ ┌─────────────────┐
 * │Subscription │ │Connection│ │   Fallback      │
 * │  Manager    │ │Pool Mgr  │ │   Service       │
 * │             │ │          │ │  (existing)     │
 * └─────────────┘ └──────────┘ └─────────────────┘
 *
 * Migration Compatibility Layer:
 * ┌───────────────────────────────────────────────┐
 * │        RealtimeMigrationAdapter               │
 * │  (Maintains RealtimeSubscriptionService API)  │
 * └───────────────────────────────────────────────┘
 */