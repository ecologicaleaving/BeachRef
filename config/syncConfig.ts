/**
 * Data Sync Configuration
 *
 * Configures lazy loading and future background sync strategies.
 * Currently implements only lazy loading (safe approach).
 *
 * Future: Background sync can be enabled by setting backgroundSync.enabled = true
 */

export interface SyncWindowConfig {
  /** Days in the past to include in sync window */
  past: number;
  /** Days in the future to include in sync window */
  future: number;
}

export interface RateLimitConfig {
  /** Maximum concurrent API requests */
  maxConcurrent: number;
  /** Delay between requests in milliseconds */
  delayBetweenRequests: number;
  /** Number of items to process in each batch */
  batchSize: number;
}

export interface BackgroundSyncRequirements {
  /** Only sync on WiFi connection */
  wifiOnly: boolean;
  /** Minimum battery percentage required */
  minBatteryPercent: number;
}

export interface SyncConfigType {
  lazyLoading: {
    enabled: boolean;
    saveToDbAfterFetch: boolean;
  };
  backgroundSync: {
    enabled: boolean;
    windowDays: SyncWindowConfig;
    schedule: {
      interval: string;
      preferredTime: string;
    };
    rateLimit: RateLimitConfig;
    requirements: BackgroundSyncRequirements;
  };
  userTriggered: {
    showProgressBar: boolean;
    allowCancellation: boolean;
    confirmBeforeStart: boolean;
  };
  safety: {
    maxTournamentsPerSync: number;
    maxMatchesPerTournament: number;
    abortIfOverLimit: boolean;
  };
}

/**
 * Sync Configuration
 *
 * CURRENT STRATEGY: Lazy Loading Only
 * - DB populates naturally as user accesses data
 * - Every VIS API fetch is automatically saved to DB
 * - Zero mass sync at startup
 *
 * FUTURE: Background Sync (disabled by default)
 * - Can be enabled in user settings
 * - Syncs only recent/future tournaments (120 day window)
 * - Rate limited and safe
 */
export const SyncConfig: SyncConfigType = {
  // ACTIVE: Lazy loading strategy
  lazyLoading: {
    enabled: true,
    saveToDbAfterFetch: true, // Save every VIS API fetch to DB
  },

  // FUTURE: Background sync (disabled for now)
  backgroundSync: {
    enabled: false, // TODO: Enable after testing lazy loading
    windowDays: {
      past: 30,   // Only last 30 days
      future: 90, // Only next 90 days
    },
    schedule: {
      interval: '24h', // Once per day
      preferredTime: '03:00', // 3 AM local time
    },
    rateLimit: {
      maxConcurrent: 3,           // Max 3 parallel requests
      delayBetweenRequests: 200,  // 200ms = max 5 req/sec
      batchSize: 10,              // Process 10 tournaments at a time
    },
    requirements: {
      wifiOnly: true,           // Only sync on WiFi
      minBatteryPercent: 30,    // Only if battery > 30%
    },
  },

  // FUTURE: User-triggered sync (for Settings screen)
  userTriggered: {
    showProgressBar: true,
    allowCancellation: true,
    confirmBeforeStart: true,
  },

  // SAFETY: Hard limits to prevent mass downloads
  safety: {
    maxTournamentsPerSync: 200,    // Never sync more than 200 tournaments
    maxMatchesPerTournament: 500,  // Never fetch more than 500 matches per tournament
    abortIfOverLimit: true,        // Abort if limits exceeded
  },
};

/**
 * Check if background sync should run based on current conditions
 */
export function shouldRunBackgroundSync(
  isWiFi: boolean,
  batteryPercent: number,
  lastSyncTimestamp: number | null
): boolean {
  const config = SyncConfig.backgroundSync;

  if (!config.enabled) {
    return false;
  }

  // Check WiFi requirement
  if (config.requirements.wifiOnly && !isWiFi) {
    console.log('[SyncConfig] Background sync skipped: not on WiFi');
    return false;
  }

  // Check battery requirement
  if (batteryPercent < config.requirements.minBatteryPercent) {
    console.log(`[SyncConfig] Background sync skipped: battery too low (${batteryPercent}%)`);
    return false;
  }

  // Check if enough time has passed since last sync
  if (lastSyncTimestamp) {
    const hoursSinceLastSync = (Date.now() - lastSyncTimestamp) / (1000 * 60 * 60);
    const intervalHours = parseInt(config.schedule.interval); // "24h" -> 24

    if (hoursSinceLastSync < intervalHours) {
      console.log(`[SyncConfig] Background sync skipped: last sync ${hoursSinceLastSync.toFixed(1)}h ago`);
      return false;
    }
  }

  return true;
}

/**
 * Get sync window date range for background sync
 */
export function getSyncDateRange(): { startDate: string; endDate: string } {
  const now = new Date();
  const config = SyncConfig.backgroundSync.windowDays;

  const startDate = new Date(now);
  startDate.setDate(startDate.getDate() - config.past);

  const endDate = new Date(now);
  endDate.setDate(endDate.getDate() + config.future);

  return {
    startDate: startDate.toISOString().split('T')[0], // YYYY-MM-DD
    endDate: endDate.toISOString().split('T')[0],
  };
}
