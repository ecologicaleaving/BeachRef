/**
 * Data Flow Validator
 * Feature: 002-production-refactoring (US6)
 *
 * Validates data flow patterns: subscription management, sync patterns, immutability.
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import { Finding, FindingType, AuditChecker } from '../types';
import { AUDIT_CONFIG, shouldExcludePath } from '../config';
import { generateFindingId } from '../tracking/finding-id-generator';
import { sanitizeFilePath } from '../utils/sanitizer';
import { classifySeverity } from '../utils/severity-classifier';

export class DataFlowValidator implements AuditChecker {
  readonly id = 'data-flow';
  readonly name = 'Data Flow Validator';

  async check(): Promise<Finding[]> {
    const findings: Finding[] = [];

    // Errors propagate on purpose (issue #42, AC1).
    const [subscriptionFindings, syncFindings, immutabilityFindings] = await Promise.all([
      this.checkSubscriptionManagement(),
      this.checkSyncPatterns(),
      this.checkDataImmutability(),
    ]);

    findings.push(...subscriptionFindings, ...syncFindings, ...immutabilityFindings);

    return findings;
  }

  private async checkSubscriptionManagement(): Promise<Finding[]> {
    const findings: Finding[] = [];
    const hooksDir = path.join(AUDIT_CONFIG.projectRoot, 'hooks');

    try {
      const hookFiles = await this.findFiles(hooksDir, /\.ts(x)?$/);

      for (const filePath of hookFiles) {
        const content = await fs.readFile(filePath, 'utf-8');
        const lines = content.split('\n');

        lines.forEach((line, index) => {
          // Check for useEffect with subscriptions
          const hasUseEffect = /useEffect\s*\(/i.test(line);

          if (hasUseEffect) {
            // Check if there's a cleanup function
            const nextLines = lines.slice(index, index + 20).join('\n');
            const hasReturn = /return\s*\(\s*\)\s*=>/.test(nextLines) || /return\s*function/.test(nextLines);
            const hasSubscription = /subscribe|addEventListener|setInterval|setTimeout/i.test(nextLines);

            if (hasSubscription && !hasReturn) {
              const file = sanitizeFilePath(filePath);
              const lineNumber = index + 1;
              const message = 'useEffect with subscription may lack cleanup function. This can cause memory leaks.';

              const id = generateFindingId(file, lineNumber, FindingType.DATA_SUBSCRIPTION, message);

              findings.push({
                id,
                type: FindingType.DATA_SUBSCRIPTION,
                severity: classifySeverity(FindingType.DATA_SUBSCRIPTION),
                message,
                file,
                line: lineNumber,
                status: 'New' as any,
                requiresManualReview: true,
                reviewGuidance: 'Ensure useEffect returns cleanup function to unsubscribe/remove listeners. Pattern: return () => { subscription.unsubscribe(); }',
                timestamp: new Date().toISOString(),
              });
            }
          }
        });
      }
    } catch (error) {
      // Hooks directory may not exist
    }

    return findings;
  }

  private async checkSyncPatterns(): Promise<Finding[]> {
    const findings: Finding[] = [];
    const syncServicePath = path.join(AUDIT_CONFIG.projectRoot, 'services/sync/SyncManager.ts');

    try {
      const content = await fs.readFile(syncServicePath, 'utf-8');

      // Check for conflict resolution strategy
      const hasConflictResolution = /conflict.*resolution|resolve.*conflict/i.test(content);

      if (!hasConflictResolution) {
        const file = sanitizeFilePath(syncServicePath);
        const message = 'Sync service should implement conflict resolution strategy for offline-to-online sync.';

        const id = generateFindingId(file, undefined, FindingType.DATA_SYNC, message);

        findings.push({
          id,
          type: FindingType.DATA_SYNC,
          severity: classifySeverity(FindingType.DATA_SYNC),
          message,
          file,
          status: 'New' as any,
          requiresManualReview: true,
          reviewGuidance: 'Implement conflict resolution: last-write-wins, server-wins, or manual resolution based on data criticality.',
          timestamp: new Date().toISOString(),
        });
      }

      // Check for retry logic
      const hasRetry = /retry|exponential.*backoff/i.test(content);

      if (!hasRetry) {
        const file = sanitizeFilePath(syncServicePath);
        const message = 'Sync service should implement retry logic with exponential backoff for failed sync operations.';

        const id = generateFindingId(file, undefined, FindingType.DATA_SYNC, message);

        findings.push({
          id,
          type: FindingType.DATA_SYNC,
          severity: classifySeverity(FindingType.DATA_SYNC),
          message,
          file,
          status: 'New' as any,
          requiresManualReview: true,
          reviewGuidance: 'Add exponential backoff for sync retries: 1s, 2s, 4s, 8s, 16s, max 5 attempts.',
          timestamp: new Date().toISOString(),
        });
      }

      // Check for queue management
      const hasQueue = /queue|pending.*operations/i.test(content);

      if (!hasQueue) {
        const file = sanitizeFilePath(syncServicePath);
        const message = 'Sync service should queue operations when offline for processing when connection returns.';

        const id = generateFindingId(file, undefined, FindingType.DATA_SYNC, message);

        findings.push({
          id,
          type: FindingType.DATA_SYNC,
          severity: classifySeverity(FindingType.DATA_SYNC),
          message,
          file,
          status: 'New' as any,
          requiresManualReview: true,
          reviewGuidance: 'Implement operation queue to store offline mutations. Process queue on reconnect with proper ordering.',
          timestamp: new Date().toISOString(),
        });
      }
    } catch (error) {
      // Sync service may not exist
    }

    return findings;
  }

  private async checkDataImmutability(): Promise<Finding[]> {
    const findings: Finding[] = [];

    try {
      const tsFiles = await this.findFiles(AUDIT_CONFIG.projectRoot, /\.(ts|tsx)$/);

      for (const filePath of tsFiles) {
        // Skip test files
        if (filePath.includes('__tests__') || filePath.includes('.test.')) {
          continue;
        }

        const content = await fs.readFile(filePath, 'utf-8');
        const lines = content.split('\n');

        lines.forEach((line, index) => {
          // Check for direct state mutation
          const hasDirectMutation = /state\.\w+\s*=/.test(line) || /props\.\w+\s*=/.test(line);

          if (hasDirectMutation) {
            // Check if it's not in a class setter or function declaration
            const surroundingLines = lines.slice(Math.max(0, index - 3), index + 3).join('\n');
            const isInFunction = /function|=>|constructor|set\s+\w+/.test(surroundingLines);

            if (!isInFunction) {
              const file = sanitizeFilePath(filePath);
              const lineNumber = index + 1;
              const message = 'Potential direct state mutation detected. Use immutable update patterns.';

              const id = generateFindingId(file, lineNumber, FindingType.DATA_IMMUTABILITY, message);

              findings.push({
                id,
                type: FindingType.DATA_IMMUTABILITY,
                severity: classifySeverity(FindingType.DATA_IMMUTABILITY),
                message,
                file,
                line: lineNumber,
                status: 'New' as any,
                requiresManualReview: true,
                reviewGuidance: 'Avoid direct mutations. Use spread operator: setState({ ...state, field: value }). For arrays: [...array, newItem].',
                timestamp: new Date().toISOString(),
              });
            }
          }

          // Check for .push(), .pop(), .splice() on state/props
          const hasArrayMutation = /(state|props)\.\w+\.(push|pop|splice|shift|unshift)\s*\(/i.test(line);

          if (hasArrayMutation) {
            const file = sanitizeFilePath(filePath);
            const lineNumber = index + 1;
            const message = 'Array mutation method detected on state/props. Use immutable array methods.';

            const id = generateFindingId(file, lineNumber, FindingType.DATA_IMMUTABILITY, message);

            findings.push({
              id,
              type: FindingType.DATA_IMMUTABILITY,
              severity: classifySeverity(FindingType.DATA_IMMUTABILITY),
              message,
              file,
              line: lineNumber,
              status: 'New' as any,
              requiresManualReview: true,
              reviewGuidance: 'Use immutable array methods: .concat(), .filter(), .map(), or spread [...array, item]. Avoid push, pop, splice.',
              timestamp: new Date().toISOString(),
            });
          }
        });
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

          // Skip excluded paths — see the note in error-handling-validator.ts:
          // the inline copy matched against raw path.relative() output and so
          // never excluded anything on Windows (issue #44).
          if (shouldExcludePath(fullPath)) {
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
