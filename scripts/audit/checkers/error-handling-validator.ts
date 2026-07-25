/**
 * Error Handling Validator
 * Feature: 002-production-refactoring (US4)
 *
 * Validates error handling patterns: API errors, boundaries, promise rejections.
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import { Finding, FindingType, AuditChecker } from '../types';
import { AUDIT_CONFIG } from '../config';
import { generateFindingId } from '../tracking/finding-id-generator';
import { sanitizeFilePath } from '../utils/sanitizer';
import { classifySeverity } from '../utils/severity-classifier';

export class ErrorHandlingValidator implements AuditChecker {
  readonly id = 'error-handling';
  readonly name = 'Error Handling Validator';

  async check(): Promise<Finding[]> {
    const findings: Finding[] = [];

    // Errors propagate on purpose (issue #42, AC1).
    const [apiFindings, boundaryFindings, promiseFindings] = await Promise.all([
      this.checkApiErrorHandling(),
      this.checkErrorBoundaries(),
      this.checkPromiseErrorHandling(),
    ]);

    findings.push(...apiFindings, ...boundaryFindings, ...promiseFindings);

    return findings;
  }

  private async checkApiErrorHandling(): Promise<Finding[]> {
    const findings: Finding[] = [];
    const servicesDir = path.join(AUDIT_CONFIG.projectRoot, 'services');

    try {
      const serviceFiles = await this.findFiles(servicesDir, /\.ts$/);

      for (const filePath of serviceFiles) {
        const content = await fs.readFile(filePath, 'utf-8');
        const lines = content.split('\n');

        lines.forEach((line, index) => {
          // Look for fetch/axios calls without try-catch
          const hasApiCall = /(fetch|axios\.(get|post|put|delete))\s*\(/i.test(line);

          if (hasApiCall) {
            // Check if within try-catch block (simple heuristic)
            const surroundingLines = lines.slice(Math.max(0, index - 5), index + 5).join('\n');
            const hasTryCatch = /try\s*\{/.test(surroundingLines) || /catch\s*\(/i.test(surroundingLines);

            if (!hasTryCatch) {
              const file = sanitizeFilePath(filePath);
              const lineNumber = index + 1;
              const message = 'API call may lack error handling. Wrap in try-catch or handle promise rejection.';

              const id = generateFindingId(file, lineNumber, FindingType.ERROR_HANDLING_API, message);

              findings.push({
                id,
                type: FindingType.ERROR_HANDLING_API,
                severity: classifySeverity(FindingType.ERROR_HANDLING_API),
                message,
                file,
                line: lineNumber,
                status: 'New' as any,
                requiresManualReview: true,
                reviewGuidance: 'Verify API call has proper error handling. All network calls should handle errors gracefully.',
                timestamp: new Date().toISOString(),
              });
            }
          }
        });
      }
    } catch (error) {
      // Services directory may not exist
    }

    return findings;
  }

  private async checkErrorBoundaries(): Promise<Finding[]> {
    const findings: Finding[] = [];
    const appDir = path.join(AUDIT_CONFIG.projectRoot, 'app');

    try {
      // Check if error boundaries exist
      const errorBoundaryFiles = await this.findFiles(AUDIT_CONFIG.projectRoot, /ErrorBoundary\.(tsx|ts)$/);

      if (errorBoundaryFiles.length === 0) {
        const file = 'app/';
        const message = 'No React error boundaries detected. Add error boundaries to catch component errors.';

        const id = generateFindingId(file, undefined, FindingType.ERROR_HANDLING_BOUNDARY, message);

        findings.push({
          id,
          type: FindingType.ERROR_HANDLING_BOUNDARY,
          severity: classifySeverity(FindingType.ERROR_HANDLING_BOUNDARY),
          message,
          file,
          status: 'New' as any,
          requiresManualReview: true,
          reviewGuidance: 'Implement React error boundaries for critical user flows. See React documentation on error boundaries.',
          timestamp: new Date().toISOString(),
        });
      }
    } catch (error) {
      // App directory may not exist
    }

    return findings;
  }

  private async checkPromiseErrorHandling(): Promise<Finding[]> {
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
          // Look for promises without .catch()
          const hasPromise = /\.then\s*\(/.test(line);
          const hasCatch = /\.catch\s*\(/.test(line);

          if (hasPromise && !hasCatch) {
            // Check surrounding lines for catch
            const nextLines = lines.slice(index, index + 3).join('\n');
            if (!/\.catch\s*\(/.test(nextLines)) {
              const file = sanitizeFilePath(filePath);
              const lineNumber = index + 1;
              const message = 'Promise chain may lack error handling. Add .catch() or use async/await with try-catch.';

              const id = generateFindingId(file, lineNumber, FindingType.ERROR_HANDLING_PROMISE, message);

              findings.push({
                id,
                type: FindingType.ERROR_HANDLING_PROMISE,
                severity: classifySeverity(FindingType.ERROR_HANDLING_PROMISE),
                message,
                file,
                line: lineNumber,
                status: 'New' as any,
                requiresManualReview: true,
                reviewGuidance: 'Verify promise has error handling. All promise chains should handle rejections.',
                timestamp: new Date().toISOString(),
              });
            }
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
