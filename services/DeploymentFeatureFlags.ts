/**
 * Deployment Feature Flags Service
 * Story 001.3: Schema Cleanup and Rollout Management - Task 2
 * Provides feature flag management for staged deployment with rollback capability
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { ErrorLogger } from './ErrorLogger';

export interface FeatureFlagConfig {
  USE_NEW_ANALYTICS_ENDPOINTS: boolean;
  ENABLE_ANALYTICS_MONITORING: boolean;
  ANALYTICS_CACHE_ENABLED: boolean;
  ANALYTICS_PERFORMANCE_LOGGING: boolean;
}

export interface FeatureFlagOverrides {
  [key: string]: boolean;
}

export class DeploymentFeatureFlags {
  private static instance: DeploymentFeatureFlags | null = null;
  private errorLogger: ErrorLogger;
  private flags: FeatureFlagConfig;
  private overrides: FeatureFlagOverrides = {};
  private readonly STORAGE_KEY = 'deployment_feature_flags';
  private readonly OVERRIDE_STORAGE_KEY = 'feature_flag_overrides';

  private constructor() {
    this.errorLogger = ErrorLogger.getInstance();
    
    // Default feature flag configuration
    this.flags = {
      // SPENTO di partenza (issue #102).
      //
      // Era acceso. Finche' nessuno consultava questo flag non faceva danni;
      // nel momento in cui `useRefereeAnalytics` lo consulta, un default acceso
      // significa che alla prima apertura TUTTI gli utenti prendono le
      // statistiche dalle Edge Function invece che dal percorso attuale — senza
      // che nessuno abbia verificato che i numeri coincidano, e senza un modo
      // di tornare indietro che non sia un commit e un deploy.
      //
      // Si accende deliberatamente, un browser alla volta, con
      // `?nuoveAnalytics=on`. Vedi `applyBrowserOverride`.
      USE_NEW_ANALYTICS_ENDPOINTS: this.getEnvironmentFlag('USE_NEW_ANALYTICS_ENDPOINTS', false),
      ENABLE_ANALYTICS_MONITORING: this.getEnvironmentFlag('ENABLE_ANALYTICS_MONITORING', true),
      ANALYTICS_CACHE_ENABLED: this.getEnvironmentFlag('ANALYTICS_CACHE_ENABLED', true),
      ANALYTICS_PERFORMANCE_LOGGING: this.getEnvironmentFlag('ANALYTICS_PERFORMANCE_LOGGING', false)
    };

    // SINCRONO, e prima di `initializeFlags()`: quest'ultima e' asincrona, e il
    // primo `isNewAnalyticsEndpointsEnabled()` puo' arrivare prima che finisca.
    // Un interruttore che vale "fra un attimo" non serve a chi sta guardando la
    // pagina adesso.
    this.applyBrowserOverride();

    this.initializeFlags();
  }

  /**
   * L'interruttore che si puo' azionare davvero (issue #102).
   *
   * `EXPO_PUBLIC_USE_NEW_ANALYTICS_ENDPOINTS` su Netlify e' un PAVIMENTO, non un
   * rimedio: cambiarla e' un redeploy, e nel frattempo chi ha i numeri sbagliati
   * continua a vederli. E' la lezione scritta in CLAUDE.md dopo la #54.
   *
   *   ?nuoveAnalytics=on    accende, e la scelta resta memorizzata
   *   ?nuoveAnalytics=off   spegne, idem
   *
   * Vale per il browser che lo digita, quindi serve a verificare e a rientrare
   * in fretta — non a spegnere per tutti. Per quello serve cambiare il default,
   * ed e' voluto: promuovere una sorgente dati a tutti deve essere un atto
   * deliberato e revisionabile in una diff.
   */
  private applyBrowserOverride(): void {
    const CHIAVE = 'beachref.nuoveAnalytics';
    const PARAM = 'nuoveAnalytics';

    try {
      if (typeof window === 'undefined' || !window.localStorage) return;

      const daUrl = new URLSearchParams(window.location?.search ?? '').get(PARAM);

      if (daUrl === 'on' || daUrl === 'off') {
        window.localStorage.setItem(CHIAVE, daUrl);
      }

      const scelta = window.localStorage.getItem(CHIAVE);
      if (scelta === 'on' || scelta === 'off') {
        this.flags.USE_NEW_ANALYTICS_ENDPOINTS = scelta === 'on';
      }
    } catch {
      // Storage negato o URL illeggibile: si resta sul default. Un interruttore
      // rotto non deve impedire alla pagina di aprirsi.
    }
  }

  /**
   * Get the singleton instance of DeploymentFeatureFlags
   */
  public static getInstance(): DeploymentFeatureFlags {
    if (!DeploymentFeatureFlags.instance) {
      DeploymentFeatureFlags.instance = new DeploymentFeatureFlags();
    }
    return DeploymentFeatureFlags.instance;
  }

  /**
   * Initialize flags from storage and environment
   */
  private async initializeFlags(): Promise<void> {
    try {
      // Load stored overrides
      const storedOverrides = await AsyncStorage.getItem(this.OVERRIDE_STORAGE_KEY);
      if (storedOverrides) {
        this.overrides = JSON.parse(storedOverrides);
      }

      // Load stored flags
      const storedFlags = await AsyncStorage.getItem(this.STORAGE_KEY);
      if (storedFlags) {
        const parsedFlags = JSON.parse(storedFlags);
        this.flags = { ...this.flags, ...parsedFlags };
      }

      // Apply environment overrides
      this.applyEnvironmentOverrides();
    } catch (error) {
      await this.errorLogger.logError({
        entity_type: 'feature_flags',
        error: error as Error,
        context: { operation: 'initialize_flags' }
      });
    }
  }

  /**
   * Get environment flag value with fallback
   */
  private getEnvironmentFlag(key: string, defaultValue: boolean): boolean {
    // Si guarda ANCHE la variante `EXPO_PUBLIC_` (issue #102).
    //
    // Nel bundle web, Expo inlinea soltanto le variabili che cominciano per
    // `EXPO_PUBLIC_`: `process.env.USE_NEW_ANALYTICS_ENDPOINTS` e' quindi
    // sempre `undefined` nel browser, e con lui il valore predefinito vinceva
    // sempre. Un interruttore che nell'unico ambiente dove gira non si puo'
    // toccare non e' un interruttore.
    const envValue = process.env[key] ?? process.env[`EXPO_PUBLIC_${key}`];
    if (envValue === undefined) return defaultValue;
    return envValue.toLowerCase() === 'true';
  }

  /**
   * Apply environment variable overrides
   */
  private applyEnvironmentOverrides(): void {
    // Critical rollback flag - always check environment first
    const useNewEndpoints = process.env.USE_NEW_ANALYTICS_ENDPOINTS;
    if (useNewEndpoints !== undefined) {
      this.flags.USE_NEW_ANALYTICS_ENDPOINTS = useNewEndpoints.toLowerCase() === 'true';
    }

    // Other environment overrides
    const enableMonitoring = process.env.ENABLE_ANALYTICS_MONITORING;
    if (enableMonitoring !== undefined) {
      this.flags.ENABLE_ANALYTICS_MONITORING = enableMonitoring.toLowerCase() === 'true';
    }

    const cacheEnabled = process.env.ANALYTICS_CACHE_ENABLED;
    if (cacheEnabled !== undefined) {
      this.flags.ANALYTICS_CACHE_ENABLED = cacheEnabled.toLowerCase() === 'true';
    }

    const performanceLogging = process.env.ANALYTICS_PERFORMANCE_LOGGING;
    if (performanceLogging !== undefined) {
      this.flags.ANALYTICS_PERFORMANCE_LOGGING = performanceLogging.toLowerCase() === 'true';
    }
  }

  /**
   * Check if new analytics endpoints should be used
   */
  isNewAnalyticsEndpointsEnabled(): boolean {
    return this.getFlag('USE_NEW_ANALYTICS_ENDPOINTS');
  }

  /**
   * Check if analytics monitoring is enabled
   */
  isAnalyticsMonitoringEnabled(): boolean {
    return this.getFlag('ENABLE_ANALYTICS_MONITORING');
  }

  /**
   * Check if analytics cache is enabled
   */
  isAnalyticsCacheEnabled(): boolean {
    return this.getFlag('ANALYTICS_CACHE_ENABLED');
  }

  /**
   * Check if analytics performance logging is enabled
   */
  isAnalyticsPerformanceLoggingEnabled(): boolean {
    return this.getFlag('ANALYTICS_PERFORMANCE_LOGGING');
  }

  /**
   * Get flag value with override support
   */
  getFlag(key: keyof FeatureFlagConfig): boolean {
    // Check for override first
    if (this.overrides.hasOwnProperty(key)) {
      return this.overrides[key];
    }
    
    // Return configured value
    return this.flags[key];
  }

  /**
   * Set temporary flag override (for testing/debugging)
   */
  async setOverride(key: keyof FeatureFlagConfig, value: boolean): Promise<void> {
    try {
      this.overrides[key] = value;
      await AsyncStorage.setItem(this.OVERRIDE_STORAGE_KEY, JSON.stringify(this.overrides));
    } catch (error) {
      await this.errorLogger.logError({
        entity_type: 'feature_flags',
        error: error as Error,
        context: { operation: 'set_override', key, value }
      });
    }
  }

  /**
   * Clear flag override
   */
  async clearOverride(key: keyof FeatureFlagConfig): Promise<void> {
    try {
      delete this.overrides[key];
      await AsyncStorage.setItem(this.OVERRIDE_STORAGE_KEY, JSON.stringify(this.overrides));
    } catch (error) {
      await this.errorLogger.logError({
        entity_type: 'feature_flags',
        error: error as Error,
        context: { operation: 'clear_override', key }
      });
    }
  }

  /**
   * Clear all overrides
   */
  async clearAllOverrides(): Promise<void> {
    try {
      this.overrides = {};
      await AsyncStorage.removeItem(this.OVERRIDE_STORAGE_KEY);
    } catch (error) {
      await this.errorLogger.logError({
        entity_type: 'feature_flags',
        error: error as Error,
        context: { operation: 'clear_all_overrides' }
      });
    }
  }

  /**
   * Emergency rollback - immediately disable new analytics endpoints
   */
  async emergencyRollback(): Promise<void> {
    try {
      await this.setOverride('USE_NEW_ANALYTICS_ENDPOINTS', false);
      
      // Log the rollback for monitoring
      await this.errorLogger.logError({
        entity_type: 'deployment_rollback',
        error: new Error('Emergency rollback triggered - disabled new analytics endpoints'),
        context: { 
          operation: 'emergency_rollback',
          timestamp: new Date().toISOString(),
          previous_state: this.flags.USE_NEW_ANALYTICS_ENDPOINTS
        }
      });
    } catch (error) {
      // Critical - use console if logging fails
      console.error('Emergency rollback failed:', error);
    }
  }

  /**
   * Get all current flag states (for debugging/monitoring)
   */
  getAllFlags(): { flags: FeatureFlagConfig; overrides: FeatureFlagOverrides } {
    return {
      flags: { ...this.flags },
      overrides: { ...this.overrides }
    };
  }

  /**
   * Update flag configuration (for runtime updates)
   */
  async updateFlags(newFlags: Partial<FeatureFlagConfig>): Promise<void> {
    try {
      this.flags = { ...this.flags, ...newFlags };
      await AsyncStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.flags));
    } catch (error) {
      await this.errorLogger.logError({
        entity_type: 'feature_flags',
        error: error as Error,
        context: { operation: 'update_flags', newFlags }
      });
    }
  }

  /**
   * Health check for feature flag system
   */
  async healthCheck(): Promise<{
    status: 'healthy' | 'degraded' | 'failed';
    flags: FeatureFlagConfig;
    overrides: FeatureFlagOverrides;
    environment_overrides: string[];
  }> {
    try {
      // Check if we can access storage
      await AsyncStorage.getItem(this.STORAGE_KEY);
      
      // Get environment overrides
      const envOverrides = [];
      if (process.env.USE_NEW_ANALYTICS_ENDPOINTS !== undefined) {
        envOverrides.push('USE_NEW_ANALYTICS_ENDPOINTS');
      }
      if (process.env.ENABLE_ANALYTICS_MONITORING !== undefined) {
        envOverrides.push('ENABLE_ANALYTICS_MONITORING');
      }
      if (process.env.ANALYTICS_CACHE_ENABLED !== undefined) {
        envOverrides.push('ANALYTICS_CACHE_ENABLED');
      }
      if (process.env.ANALYTICS_PERFORMANCE_LOGGING !== undefined) {
        envOverrides.push('ANALYTICS_PERFORMANCE_LOGGING');
      }

      return {
        status: 'healthy',
        flags: { ...this.flags },
        overrides: { ...this.overrides },
        environment_overrides: envOverrides
      };
    } catch (error) {
      await this.errorLogger.logError({
        entity_type: 'feature_flags',
        error: error as Error,
        context: { operation: 'health_check' }
      });

      return {
        status: 'failed',
        flags: { ...this.flags },
        overrides: { ...this.overrides },
        environment_overrides: []
      };
    }
  }
}