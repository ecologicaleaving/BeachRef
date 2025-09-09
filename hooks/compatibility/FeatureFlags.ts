/**
 * Feature Flag System for Gradual Migration
 * Enables component-by-component rollout of new hook-based data management
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

export interface FeatureFlagConfig {
  // Hook-based data management flags
  useNewTournamentsHook?: boolean;
  useNewMatchesHook?: boolean;
  useNewRefereesHook?: boolean;
  useNewOfflineSyncHook?: boolean;
  
  // Component-specific migration flags
  useTournamentListNewHook?: boolean;
  useMatchListNewHook?: boolean;
  useRefereeCardNewHook?: boolean;
  useAssignmentCardNewHook?: boolean;
  
  // Performance and monitoring flags
  enablePerformanceComparison?: boolean;
  enableMigrationLogging?: boolean;
  
  // Rollback and safety flags
  enableRollbackOnError?: boolean;
  maxErrorThreshold?: number;
}

export interface MigrationStatus {
  component: string;
  usingNewHook: boolean;
  performanceComparison?: {
    oldSystemTime: number;
    newSystemTime: number;
    improvement: number;
  };
  errorCount: number;
  lastError?: string;
  migrationDate?: string;
}

class FeatureFlagManager {
  private static instance: FeatureFlagManager | null = null;
  private flags: FeatureFlagConfig = {};
  private migrationStatuses: Map<string, MigrationStatus> = new Map();
  private errorThresholds: Map<string, number> = new Map();
  
  // Default configuration
  private defaultFlags: FeatureFlagConfig = {
    useNewTournamentsHook: false,
    useNewMatchesHook: false,
    useNewRefereesHook: false,
    useNewOfflineSyncHook: false,
    useTournamentListNewHook: false,
    useMatchListNewHook: false,
    useRefereeCardNewHook: false,
    useAssignmentCardNewHook: false,
    enablePerformanceComparison: true,
    enableMigrationLogging: true,
    enableRollbackOnError: true,
    maxErrorThreshold: 5,
  };

  private constructor() {
    this.loadFlags();
  }

  static getInstance(): FeatureFlagManager {
    if (!FeatureFlagManager.instance) {
      FeatureFlagManager.instance = new FeatureFlagManager();
    }
    return FeatureFlagManager.instance;
  }

  /**
   * Load feature flags from storage
   */
  private async loadFlags(): Promise<void> {
    try {
      const storedFlags = await AsyncStorage.getItem('@feature_flags');
      if (storedFlags) {
        this.flags = { ...this.defaultFlags, ...JSON.parse(storedFlags) };
      } else {
        this.flags = { ...this.defaultFlags };
      }
      
      // Load migration statuses
      const storedStatuses = await AsyncStorage.getItem('@migration_statuses');
      if (storedStatuses) {
        const statusArray = JSON.parse(storedStatuses) as Array<[string, MigrationStatus]>;
        this.migrationStatuses = new Map(statusArray);
      }
    } catch (error) {
      console.warn('Failed to load feature flags, using defaults:', error);
      this.flags = { ...this.defaultFlags };
    }
  }

  /**
   * Save feature flags to storage
   */
  private async saveFlags(): Promise<void> {
    try {
      await AsyncStorage.setItem('@feature_flags', JSON.stringify(this.flags));
      
      // Save migration statuses
      const statusArray = Array.from(this.migrationStatuses.entries());
      await AsyncStorage.setItem('@migration_statuses', JSON.stringify(statusArray));
    } catch (error) {
      console.warn('Failed to save feature flags:', error);
    }
  }

  /**
   * Get feature flag value
   */
  getFlag<K extends keyof FeatureFlagConfig>(key: K): FeatureFlagConfig[K] {
    return this.flags[key] ?? this.defaultFlags[key];
  }

  /**
   * Set feature flag value
   */
  async setFlag<K extends keyof FeatureFlagConfig>(
    key: K, 
    value: FeatureFlagConfig[K]
  ): Promise<void> {
    this.flags[key] = value;
    await this.saveFlags();
  }

  /**
   * Enable new hook for specific component with migration tracking
   */
  async enableNewHookForComponent(
    component: string,
    hookType: 'tournaments' | 'matches' | 'referees' | 'offlineSync'
  ): Promise<void> {
    const flagKey = `useNew${hookType.charAt(0).toUpperCase() + hookType.slice(1)}Hook` as keyof FeatureFlagConfig;
    
    await this.setFlag(flagKey, true);
    
    // Update migration status
    this.migrationStatuses.set(component, {
      component,
      usingNewHook: true,
      errorCount: 0,
      migrationDate: new Date().toISOString()
    });
    
    await this.saveFlags();
    
    if (this.getFlag('enableMigrationLogging')) {
      console.log(`✅ Enabled ${hookType} hook for component: ${component}`);
    }
  }

  /**
   * Disable new hook for specific component (rollback)
   */
  async disableNewHookForComponent(
    component: string,
    hookType: 'tournaments' | 'matches' | 'referees' | 'offlineSync',
    reason?: string
  ): Promise<void> {
    const flagKey = `useNew${hookType.charAt(0).toUpperCase() + hookType.slice(1)}Hook` as keyof FeatureFlagConfig;
    
    await this.setFlag(flagKey, false);
    
    // Update migration status
    const currentStatus = this.migrationStatuses.get(component);
    this.migrationStatuses.set(component, {
      ...currentStatus,
      component,
      usingNewHook: false,
      lastError: reason,
    });
    
    await this.saveFlags();
    
    if (this.getFlag('enableMigrationLogging')) {
      console.warn(`⚠️ Disabled ${hookType} hook for component: ${component}`, reason ? `Reason: ${reason}` : '');
    }
  }

  /**
   * Check if component should use new hook
   */
  shouldUseNewHook(
    component: string,
    hookType: 'tournaments' | 'matches' | 'referees' | 'offlineSync'
  ): boolean {
    // Check global hook flag
    const globalFlag = this.getFlag(`useNew${hookType.charAt(0).toUpperCase() + hookType.slice(1)}Hook` as keyof FeatureFlagConfig);
    if (!globalFlag) return false;
    
    // Check component-specific flag if exists
    const componentFlag = this.getFlag(`use${component}NewHook` as keyof FeatureFlagConfig);
    if (componentFlag !== undefined) return Boolean(componentFlag);
    
    // Check error threshold
    const status = this.migrationStatuses.get(component);
    if (status && status.errorCount >= (this.getFlag('maxErrorThreshold') || 5)) {
      return false;
    }
    
    return Boolean(globalFlag);
  }

  /**
   * Record performance comparison
   */
  async recordPerformanceComparison(
    component: string,
    oldSystemTime: number,
    newSystemTime: number
  ): Promise<void> {
    if (!this.getFlag('enablePerformanceComparison')) return;
    
    const improvement = ((oldSystemTime - newSystemTime) / oldSystemTime) * 100;
    
    const currentStatus = this.migrationStatuses.get(component);
    this.migrationStatuses.set(component, {
      ...currentStatus,
      component,
      usingNewHook: currentStatus?.usingNewHook ?? false,
      errorCount: currentStatus?.errorCount ?? 0,
      performanceComparison: {
        oldSystemTime,
        newSystemTime,
        improvement
      }
    });
    
    await this.saveFlags();
    
    if (this.getFlag('enableMigrationLogging')) {
      console.log(`📊 Performance comparison for ${component}:`, {
        old: `${oldSystemTime}ms`,
        new: `${newSystemTime}ms`,
        improvement: `${improvement.toFixed(1)}%`
      });
    }
  }

  /**
   * Record error for component
   */
  async recordError(component: string, error: string): Promise<void> {
    const currentStatus = this.migrationStatuses.get(component);
    const newErrorCount = (currentStatus?.errorCount ?? 0) + 1;
    
    this.migrationStatuses.set(component, {
      ...currentStatus,
      component,
      usingNewHook: currentStatus?.usingNewHook ?? false,
      errorCount: newErrorCount,
      lastError: error
    });
    
    await this.saveFlags();
    
    // Auto-rollback if threshold exceeded
    if (this.getFlag('enableRollbackOnError') && newErrorCount >= (this.getFlag('maxErrorThreshold') || 5)) {
      console.error(`🔴 Auto-rollback triggered for ${component} due to ${newErrorCount} errors`);
      
      // Determine hook type and disable
      if (component.includes('tournament') || component.includes('Tournament')) {
        await this.disableNewHookForComponent(component, 'tournaments', `Error threshold exceeded: ${newErrorCount} errors`);
      } else if (component.includes('match') || component.includes('Match')) {
        await this.disableNewHookForComponent(component, 'matches', `Error threshold exceeded: ${newErrorCount} errors`);
      } else if (component.includes('referee') || component.includes('Referee')) {
        await this.disableNewHookForComponent(component, 'referees', `Error threshold exceeded: ${newErrorCount} errors`);
      }
    }
    
    if (this.getFlag('enableMigrationLogging')) {
      console.error(`❌ Error in ${component}:`, error, `(Count: ${newErrorCount})`);
    }
  }

  /**
   * Get migration status for component
   */
  getMigrationStatus(component: string): MigrationStatus | null {
    return this.migrationStatuses.get(component) || null;
  }

  /**
   * Get all migration statuses
   */
  getAllMigrationStatuses(): MigrationStatus[] {
    return Array.from(this.migrationStatuses.values());
  }

  /**
   * Reset error count for component
   */
  async resetErrorCount(component: string): Promise<void> {
    const currentStatus = this.migrationStatuses.get(component);
    if (currentStatus) {
      this.migrationStatuses.set(component, {
        ...currentStatus,
        errorCount: 0,
        lastError: undefined
      });
      await this.saveFlags();
    }
  }

  /**
   * Enable new hooks gradually (percentage rollout)
   */
  async enableGradualRollout(
    hookType: 'tournaments' | 'matches' | 'referees' | 'offlineSync',
    percentage: number // 0-100
  ): Promise<void> {
    const shouldEnable = Math.random() * 100 < percentage;
    const flagKey = `useNew${hookType.charAt(0).toUpperCase() + hookType.slice(1)}Hook` as keyof FeatureFlagConfig;
    
    await this.setFlag(flagKey, shouldEnable);
    
    if (this.getFlag('enableMigrationLogging')) {
      console.log(`🎲 Gradual rollout for ${hookType}: ${shouldEnable ? 'enabled' : 'disabled'} (${percentage}%)`);
    }
  }

  /**
   * Export configuration for debugging
   */
  exportConfiguration(): {
    flags: FeatureFlagConfig;
    migrationStatuses: MigrationStatus[];
  } {
    return {
      flags: { ...this.flags },
      migrationStatuses: this.getAllMigrationStatuses()
    };
  }

  /**
   * Import configuration (for testing/debugging)
   */
  async importConfiguration(config: {
    flags?: FeatureFlagConfig;
    migrationStatuses?: MigrationStatus[];
  }): Promise<void> {
    if (config.flags) {
      this.flags = { ...this.defaultFlags, ...config.flags };
    }
    
    if (config.migrationStatuses) {
      this.migrationStatuses = new Map(
        config.migrationStatuses.map(status => [status.component, status])
      );
    }
    
    await this.saveFlags();
  }
}

export const featureFlags = FeatureFlagManager.getInstance();
export default featureFlags;