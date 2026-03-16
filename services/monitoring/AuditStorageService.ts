/**
 * Audit Storage Service
 *
 * Persists audit data using MMKV for fast access.
 * Development-only service with 7-day rolling window retention.
 *
 * Feature: specs/001-vis-api-optimization
 * Tasks: T022, T023
 */

import { MMKV } from 'react-native-mmkv';
import { Platform } from 'react-native';
import { ApiRequest, AuditFinding, AuditReport } from '../../types/audit';

/**
 * AuditStorageService
 *
 * MMKV-based storage for audit data with automatic cleanup.
 *
 * **Features:**
 * - 7-day rolling window retention (T023)
 * - Separate namespace for audit data
 * - Development-only (disabled in production)
 * - Automatic cleanup of expired entries
 */
export class AuditStorageService {
  private static instance: AuditStorageService | null = null;
  private storage: MMKV | null = null;
  private enabled: boolean = __DEV__;

  // Storage keys
  private readonly REQUESTS_KEY = 'audit:requests';
  private readonly FINDINGS_KEY = 'audit:findings';
  private readonly REPORTS_KEY = 'audit:reports';
  private readonly METADATA_KEY = 'audit:metadata';

  // Retention period (7 days in milliseconds)
  private readonly RETENTION_PERIOD = 7 * 24 * 60 * 60 * 1000;

  private constructor() {
    if (!__DEV__) return;

    try {
      // Initialize MMKV with audit namespace
      this.storage = new MMKV({
        id: 'audit-storage',
        ...(Platform.OS !== 'web' && process.env.EXPO_PUBLIC_MMKV_KEY
          ? { encryptionKey: process.env.EXPO_PUBLIC_MMKV_KEY }
          : {}),
      });

      // Clean up old data on initialization
      this.cleanupExpiredData();
    } catch (error) {
      console.error('[Audit Storage] Failed to initialize MMKV:', error);
      this.enabled = false;
    }
  }

  /**
   * Get singleton instance (only in __DEV__ mode)
   */
  static getInstance(): AuditStorageService {
    if (!__DEV__) {
      // Return no-op instance for production
      return {
        storeRequest: () => {},
        storeFinding: () => {},
        storeReport: () => {},
        getRequests: () => [],
        getFindings: () => [],
        getReports: () => [],
        getLatestReport: () => null,
        clearAll: () => {},
      } as any;
    }

    if (!AuditStorageService.instance) {
      AuditStorageService.instance = new AuditStorageService();
    }
    return AuditStorageService.instance;
  }

  /**
   * Store an API request
   */
  storeRequest(request: ApiRequest): void {
    if (!this.enabled || !this.storage) return;

    try {
      const requests = this.getRequests();
      requests.push(request);

      // Store updated array
      this.storage.set(this.REQUESTS_KEY, JSON.stringify(requests));

      // Update metadata
      this.updateMetadata();
    } catch (error) {
      console.error('[Audit Storage] Failed to store request:', error);
    }
  }

  /**
   * Store an audit finding
   */
  storeFinding(finding: AuditFinding): void {
    if (!this.enabled || !this.storage) return;

    try {
      const findings = this.getFindings();
      findings.push(finding);

      this.storage.set(this.FINDINGS_KEY, JSON.stringify(findings));
      this.updateMetadata();
    } catch (error) {
      console.error('[Audit Storage] Failed to store finding:', error);
    }
  }

  /**
   * Store an audit report
   */
  storeReport(report: AuditReport): void {
    if (!this.enabled || !this.storage) return;

    try {
      const reports = this.getReports();
      reports.push(report);

      // Keep only last 10 reports
      if (reports.length > 10) {
        reports.shift();
      }

      this.storage.set(this.REPORTS_KEY, JSON.stringify(reports));
      this.updateMetadata();
    } catch (error) {
      console.error('[Audit Storage] Failed to store report:', error);
    }
  }

  /**
   * Get all stored requests
   */
  getRequests(): ApiRequest[] {
    if (!this.enabled || !this.storage) return [];

    try {
      const data = this.storage.getString(this.REQUESTS_KEY);
      return data ? JSON.parse(data) : [];
    } catch (error) {
      console.error('[Audit Storage] Failed to retrieve requests:', error);
      return [];
    }
  }

  /**
   * Get all stored findings
   */
  getFindings(): AuditFinding[] {
    if (!this.enabled || !this.storage) return [];

    try {
      const data = this.storage.getString(this.FINDINGS_KEY);
      return data ? JSON.parse(data) : [];
    } catch (error) {
      console.error('[Audit Storage] Failed to retrieve findings:', error);
      return [];
    }
  }

  /**
   * Get all stored reports
   */
  getReports(): AuditReport[] {
    if (!this.enabled || !this.storage) return [];

    try {
      const data = this.storage.getString(this.REPORTS_KEY);
      return data ? JSON.parse(data) : [];
    } catch (error) {
      console.error('[Audit Storage] Failed to retrieve reports:', error);
      return [];
    }
  }

  /**
   * Get the latest audit report
   */
  getLatestReport(): AuditReport | null {
    const reports = this.getReports();
    return reports.length > 0 ? reports[reports.length - 1] : null;
  }

  /**
   * T023: Clean up data older than 7 days (rolling window retention)
   */
  private cleanupExpiredData(): void {
    if (!this.enabled || !this.storage) return;

    try {
      const cutoffTime = Date.now() - this.RETENTION_PERIOD;

      // Clean up requests
      const requests = this.getRequests();
      const validRequests = requests.filter(r => r.timestamp >= cutoffTime);
      if (validRequests.length !== requests.length) {
        this.storage.set(this.REQUESTS_KEY, JSON.stringify(validRequests));
        console.log(
          `[Audit Storage] Cleaned up ${requests.length - validRequests.length} expired requests`
        );
      }

      // Clean up findings
      const findings = this.getFindings();
      const validFindings = findings.filter(f => f.timestamp >= cutoffTime);
      if (validFindings.length !== findings.length) {
        this.storage.set(this.FINDINGS_KEY, JSON.stringify(validFindings));
        console.log(
          `[Audit Storage] Cleaned up ${findings.length - validFindings.length} expired findings`
        );
      }

      // Clean up reports
      const reports = this.getReports();
      const validReports = reports.filter(r => r.generatedAt >= cutoffTime);
      if (validReports.length !== reports.length) {
        this.storage.set(this.REPORTS_KEY, JSON.stringify(validReports));
        console.log(
          `[Audit Storage] Cleaned up ${reports.length - validReports.length} expired reports`
        );
      }

      this.updateMetadata();
    } catch (error) {
      console.error('[Audit Storage] Failed to cleanup expired data:', error);
    }
  }

  /**
   * Update metadata (last cleanup time, entry counts)
   */
  private updateMetadata(): void {
    if (!this.enabled || !this.storage) return;

    try {
      const metadata = {
        lastCleanup: Date.now(),
        requestCount: this.getRequests().length,
        findingCount: this.getFindings().length,
        reportCount: this.getReports().length,
      };

      this.storage.set(this.METADATA_KEY, JSON.stringify(metadata));
    } catch (error) {
      console.error('[Audit Storage] Failed to update metadata:', error);
    }
  }

  /**
   * Get storage metadata
   */
  getMetadata(): {
    lastCleanup: number;
    requestCount: number;
    findingCount: number;
    reportCount: number;
  } | null {
    if (!this.enabled || !this.storage) return null;

    try {
      const data = this.storage.getString(this.METADATA_KEY);
      return data ? JSON.parse(data) : null;
    } catch (error) {
      console.error('[Audit Storage] Failed to retrieve metadata:', error);
      return null;
    }
  }

  /**
   * Clear all audit data
   */
  clearAll(): void {
    if (!this.enabled || !this.storage) return;

    try {
      this.storage.delete(this.REQUESTS_KEY);
      this.storage.delete(this.FINDINGS_KEY);
      this.storage.delete(this.REPORTS_KEY);
      this.storage.delete(this.METADATA_KEY);

      console.log('[Audit Storage] Cleared all audit data');
    } catch (error) {
      console.error('[Audit Storage] Failed to clear data:', error);
    }
  }

  /**
   * Get storage size (for debugging)
   */
  getStorageSize(): number {
    if (!this.enabled || !this.storage) return 0;

    try {
      let totalSize = 0;

      const keys = [
        this.REQUESTS_KEY,
        this.FINDINGS_KEY,
        this.REPORTS_KEY,
        this.METADATA_KEY,
      ];

      keys.forEach(key => {
        const data = this.storage!.getString(key);
        if (data) {
          totalSize += new Blob([data]).size;
        }
      });

      return totalSize;
    } catch (error) {
      console.error('[Audit Storage] Failed to calculate storage size:', error);
      return 0;
    }
  }
}
