/**
 * Performance Validator
 * Feature: 002-production-refactoring (US5)
 *
 * Validates performance patterns: cache configuration, polling intervals, resource usage.
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import { Finding, FindingType, AuditChecker } from '../types';
import { AUDIT_CONFIG } from '../config';
import { generateFindingId } from '../tracking/finding-id-generator';
import { sanitizeFilePath } from '../utils/sanitizer';
import { classifySeverity } from '../utils/severity-classifier';

export class PerformanceValidator implements AuditChecker {
  readonly id = 'performance';
  readonly name = 'Performance Validator';

  async check(): Promise<Finding[]> {
    const findings: Finding[] = [];

    try {
      const [cacheFindings, pollingFindings, resourceFindings] = await Promise.all([
        this.checkCacheConfiguration(),
        this.checkPollingConfiguration(),
        this.checkResourceUsage(),
      ]);

      findings.push(...cacheFindings, ...pollingFindings, ...resourceFindings);
    } catch (error) {
      console.warn('Performance validator error:', (error as Error).message);
    }

    return findings;
  }

  private async checkCacheConfiguration(): Promise<Finding[]> {
    const findings: Finding[] = [];
    const cacheServicePath = path.join(AUDIT_CONFIG.projectRoot, 'services/cache/CacheService.ts');

    try {
      const content = await fs.readFile(cacheServicePath, 'utf-8');

      // Check for proper TTL configuration
      const hasTTL = /ttl\s*[:=]/i.test(content);
      const hasAdaptiveTTL = /adaptive.*ttl|ttl.*adaptive/i.test(content);

      if (!hasTTL) {
        const file = sanitizeFilePath(cacheServicePath);
        const message = 'Cache service should implement TTL (Time To Live) configuration for cache entries.';

        const id = generateFindingId(file, undefined, FindingType.PERFORMANCE_CACHE, message);

        findings.push({
          id,
          type: FindingType.PERFORMANCE_CACHE,
          severity: classifySeverity(FindingType.PERFORMANCE_CACHE),
          message,
          file,
          status: 'New' as any,
          requiresManualReview: true,
          reviewGuidance: 'Verify cache TTL configuration. Cache should have adaptive TTL based on data volatility (5s for live data, 24h for static). See specs/001-vis-api-optimization for reference.',
          timestamp: new Date().toISOString(),
        });
      }

      // Check for stale-while-revalidate pattern
      const hasStaleWhileRevalidate = /stale.*revalidate|revalidate.*stale/i.test(content);

      if (!hasStaleWhileRevalidate) {
        const file = sanitizeFilePath(cacheServicePath);
        const message = 'Cache service should implement stale-while-revalidate pattern for better UX.';

        const id = generateFindingId(file, undefined, FindingType.PERFORMANCE_CACHE, message);

        findings.push({
          id,
          type: FindingType.PERFORMANCE_CACHE,
          severity: classifySeverity(FindingType.PERFORMANCE_CACHE),
          message,
          file,
          status: 'New' as any,
          requiresManualReview: true,
          reviewGuidance: 'Consider implementing stale-while-revalidate: serve stale data immediately while fetching fresh data in background.',
          timestamp: new Date().toISOString(),
        });
      }

      // Check for MMKV usage (performance optimization)
      const hasMmkv = /mmkv|MMKV/.test(content);
      const hasAsyncStorage = /AsyncStorage/i.test(content);

      if (hasAsyncStorage && !hasMmkv) {
        const file = sanitizeFilePath(cacheServicePath);
        const message = 'Consider migrating from AsyncStorage to MMKV for 30x performance improvement.';

        const id = generateFindingId(file, undefined, FindingType.PERFORMANCE_CACHE, message);

        findings.push({
          id,
          type: FindingType.PERFORMANCE_CACHE,
          severity: classifySeverity(FindingType.PERFORMANCE_CACHE),
          message,
          file,
          status: 'New' as any,
          requiresManualReview: true,
          reviewGuidance: 'MMKV provides 30x faster storage compared to AsyncStorage. See services/cache/MmkvStorage.ts for implementation.',
          timestamp: new Date().toISOString(),
        });
      }
    } catch (error) {
      // Cache service may not exist
    }

    return findings;
  }

  private async checkPollingConfiguration(): Promise<Finding[]> {
    const findings: Finding[] = [];
    const pollingFiles = await this.findFiles(
      path.join(AUDIT_CONFIG.projectRoot, 'services'),
      /polling.*\.ts$/i
    );

    for (const filePath of pollingFiles) {
      try {
        const content = await fs.readFile(filePath, 'utf-8');
        const lines = content.split('\n');

        lines.forEach((line, index) => {
          // Check for hardcoded polling intervals
          const hasHardcodedInterval = /setInterval\s*\(\s*.*?,\s*(\d+)\s*\)/gi.exec(line);

          if (hasHardcodedInterval) {
            const interval = parseInt(hasHardcodedInterval[1], 10);

            // Flag intervals < 5000ms (5s) as too aggressive
            if (interval < 5000) {
              const file = sanitizeFilePath(filePath);
              const lineNumber = index + 1;
              const message = `Polling interval ${interval}ms may be too aggressive. Consider adaptive polling based on match status.`;

              const id = generateFindingId(file, lineNumber, FindingType.PERFORMANCE_POLLING, message);

              findings.push({
                id,
                type: FindingType.PERFORMANCE_POLLING,
                severity: classifySeverity(FindingType.PERFORMANCE_POLLING),
                message,
                file,
                line: lineNumber,
                status: 'New' as any,
                requiresManualReview: true,
                reviewGuidance: 'Use adaptive polling: Running matches: 5s, Scheduled: 60s, Finished: disabled. See PollingConfigurationManager for reference.',
                timestamp: new Date().toISOString(),
              });
            }
          }

          // Check for app state awareness
          const hasAppState = /AppState|appState/.test(content);
          const hasPolling = /setInterval|polling/i.test(content);

          if (hasPolling && !hasAppState) {
            const file = sanitizeFilePath(filePath);
            const message = 'Polling service should be app state aware (suspend in background, resume in foreground).';

            const id = generateFindingId(file, undefined, FindingType.PERFORMANCE_POLLING, message);

            findings.push({
              id,
              type: FindingType.PERFORMANCE_POLLING,
              severity: classifySeverity(FindingType.PERFORMANCE_POLLING),
              message,
              file,
              status: 'New' as any,
              requiresManualReview: true,
              reviewGuidance: 'Add AppState listener to suspend polling after 30s in background, resume on foreground. Saves battery and bandwidth.',
              timestamp: new Date().toISOString(),
            });
          }
        });
      } catch (error) {
        continue;
      }
    }

    return findings;
  }

  private async checkResourceUsage(): Promise<Finding[]> {
    const findings: Finding[] = [];

    try {
      const tsxFiles = await this.findFiles(AUDIT_CONFIG.projectRoot, /\.(tsx)$/);

      for (const filePath of tsxFiles) {
        // Skip test files
        if (filePath.includes('__tests__') || filePath.includes('.test.')) {
          continue;
        }

        const content = await fs.readFile(filePath, 'utf-8');

        // Check for missing useMemo for expensive computations
        const hasExpensiveComputation = /(map|filter|reduce|sort)\s*\(/g.test(content);
        const hasUseMemo = /useMemo/g.test(content);

        if (hasExpensiveComputation && !hasUseMemo) {
          // Check if it's in a render context
          const hasComponent = /function\s+\w+.*\(.*\).*\{[\s\S]*return\s+\(/gi.test(content);

          if (hasComponent) {
            const file = sanitizeFilePath(filePath);
            const message = 'Component may have expensive computations without memoization. Consider using useMemo for array operations.';

            const id = generateFindingId(file, undefined, FindingType.PERFORMANCE_RESOURCE, message);

            findings.push({
              id,
              type: FindingType.PERFORMANCE_RESOURCE,
              severity: classifySeverity(FindingType.PERFORMANCE_RESOURCE),
              message,
              file,
              status: 'New' as any,
              requiresManualReview: true,
              reviewGuidance: 'Review component for expensive computations (map, filter, reduce, sort). Use useMemo to prevent recalculation on every render.',
              timestamp: new Date().toISOString(),
            });
          }
        }

        // Check for missing useCallback for event handlers
        const hasEventHandler = /on[A-Z]\w+\s*=\s*\{.*=>/g.test(content);
        const hasUseCallback = /useCallback/g.test(content);

        if (hasEventHandler && !hasUseCallback) {
          const file = sanitizeFilePath(filePath);
          const message = 'Component may create new function references on every render. Consider using useCallback for event handlers.';

          const id = generateFindingId(file, undefined, FindingType.PERFORMANCE_RESOURCE, message);

          findings.push({
            id,
            type: FindingType.PERFORMANCE_RESOURCE,
            severity: classifySeverity(FindingType.PERFORMANCE_RESOURCE),
            message,
            file,
            status: 'New' as any,
            requiresManualReview: true,
            reviewGuidance: 'Use useCallback for event handlers to prevent child component re-renders when parent re-renders.',
            timestamp: new Date().toISOString(),
          });
        }
      }
    } catch (error) {
      // Continue on error
    }

    return findings;
  }

  private async findFiles(dir: string, pattern: RegExp): Promise<string[]> {
    const files: string[] = [];

    async function walk(currentDir: string): Promise<void> {
      try {
        const entries = await fs.readdir(currentDir, { withFileTypes: true });

        for (const entry of entries) {
          const fullPath = path.join(currentDir, entry.name);

          // Skip excluded paths
          const relativePath = path.relative(AUDIT_CONFIG.projectRoot, fullPath);
          if (AUDIT_CONFIG.excludePaths.some(p => {
            const regex = new RegExp('^' + p.replace(/\*\*/g, '.*').replace(/\*/g, '[^/]*') + '$');
            return regex.test(relativePath);
          })) {
            continue;
          }

          if (entry.isDirectory()) {
            await walk(fullPath);
          } else if (entry.isFile() && pattern.test(entry.name)) {
            files.push(fullPath);
          }
        }
      } catch (error) {
        // Skip directories we can't read
      }
    }

    try {
      await walk(dir);
    } catch (error) {
      // Directory doesn't exist
    }

    return files;
  }
}
