/**
 * Security Scanner
 * Feature: 002-production-refactoring (US2)
 *
 * Scans for security issues: credentials, HTTP usage, encryption config.
 * Provides sanitized output to prevent credential leakage in reports.
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import { Finding, FindingType, AuditChecker, Severity } from '../types';
import {
  AUDIT_CONFIG,
  shouldExcludePath,
  toProjectRelativePosixPath,
} from '../config';
import { generateFindingId } from '../tracking/finding-id-generator';
import { sanitizeFilePath, containsPotentialSecrets} from '../utils/sanitizer';
import { classifySeverity } from '../utils/severity-classifier';

export class SecurityScanner implements AuditChecker {
  readonly id = 'security';
  readonly name = 'Security Scanner';

  /**
   * Deliberately does not catch: a security scanner that fails must not report
   * "no security problems found" (issue #42, AC1). Errors propagate to the
   * orchestrator, which marks the run ERROR.
   */
  async check(): Promise<Finding[]> {
    const findings: Finding[] = [];

    // Run all security checks in parallel
    const [credentialFindings, httpFindings, encryptionFindings, sanitizationFindings] =
      await Promise.all([
        this.scanForCredentials(),
        this.scanForHttpUsage(),
        this.checkEncryptionConfig(),
        this.checkSanitization(),
      ]);

    findings.push(...credentialFindings);
    findings.push(...httpFindings);
    findings.push(...encryptionFindings);
    findings.push(...sanitizationFindings);

    return findings;
  }

  /**
   * Scan for hardcoded credentials using pattern matching
   */
  private async scanForCredentials(): Promise<Finding[]> {
    const findings: Finding[] = [];

    const patterns = [
      { pattern: /api[_-]?key\s*[:=]\s*['"]['"]?\w{20,}['"]?/gi, type: 'API Key' },
      { pattern: /password\s*[:=]\s*['"]['"]?[^'"\s]{8,}['"]?/gi, type: 'Password' },
      { pattern: /token\s*[:=]\s*['"]['"]?\w{20,}['"]?/gi, type: 'Token' },
      { pattern: /secret\s*[:=]\s*['"]['"]?\w{20,}['"]?/gi, type: 'Secret' },
      { pattern: /-----BEGIN [A-Z]+ KEY-----/g, type: 'Private Key' },
    ];

    const filesToScan = await this.getFilesToScan(['**/*.ts', '**/*.tsx', '**/*.js', '**/*.jsx']);

    for (const filePath of filesToScan) {
      try {
        const content = await fs.readFile(filePath, 'utf-8');
        const lines = content.split('\n');

        for (const { pattern, type } of patterns) {
          let match;
          const regex = new RegExp(pattern);

          lines.forEach((line, index) => {
            regex.lastIndex = 0; // Reset regex
            if (regex.test(line)) {
              // Check if it's in a comment or test file
              if (this.isInTestOrComment(filePath, line)) {
                return;
              }

              const file = sanitizeFilePath(filePath);
              const lineNumber = index + 1;
              const message = `Potential ${type} detected in source code`;

              const id = generateFindingId(
                file,
                lineNumber,
                FindingType.SECURITY_CREDENTIAL,
                message
              );

              findings.push({
                id,
                type: FindingType.SECURITY_CREDENTIAL,
                severity: classifySeverity(FindingType.SECURITY_CREDENTIAL),
                message,
                file,
                line: lineNumber,
                status: 'New' as any,
                requiresManualReview: true,
                reviewGuidance: 'Verify if this is a real credential. If yes, move to environment variables. If false positive (e.g., example code), add comment to indicate.',
                timestamp: new Date().toISOString(),
              });
            }
          });
        }
      } catch (error) {
        // Skip files that can't be read
        continue;
      }
    }

    return findings;
  }

  /**
   * Scan for HTTP usage (should use HTTPS)
   */
  private async scanForHttpUsage(): Promise<Finding[]> {
    const findings: Finding[] = [];

    const filesToScan = await this.getFilesToScan(['**/*.ts', '**/*.tsx', '**/*.js', '**/*.jsx']);

    for (const filePath of filesToScan) {
      try {
        const content = await fs.readFile(filePath, 'utf-8');
        const lines = content.split('\n');

        lines.forEach((line, index) => {
          // Look for http:// but not https://
          const httpMatch = /http:\/\/(?!localhost|127\.0\.0\.1|0\.0\.0\.0)/gi.exec(line);

          if (httpMatch) {
            // Skip comments and test files
            if (this.isInTestOrComment(filePath, line)) {
              return;
            }

            // Skip XML namespace / SOAP identifiers. These http:// URIs are
            // opaque names, not endpoints — nothing ever dereferences them, and
            // rewriting them to https:// silently breaks the SOAP request the
            // VIS API expects. Only namespace-shaped occurrences are exempt;
            // an actual http:// endpoint on the same line still gets flagged.
            if (SecurityScanner.isXmlNamespaceOnly(line)) {
              return;
            }

            const file = sanitizeFilePath(filePath);
            const lineNumber = index + 1;
            const message = 'Insecure HTTP protocol detected. Use HTTPS for production network calls.';

            const id = generateFindingId(
              file,
              lineNumber,
              FindingType.SECURITY_HTTP,
              message
            );

            findings.push({
              id,
              type: FindingType.SECURITY_HTTP,
              severity: classifySeverity(FindingType.SECURITY_HTTP),
              message,
              file,
              line: lineNumber,
              status: 'New' as any,
              requiresManualReview: false,
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

  /**
   * Check MMKV encryption configuration
   */
  private async checkEncryptionConfig(): Promise<Finding[]> {
    const findings: Finding[] = [];

    const mmkvStoragePath = path.join(
      AUDIT_CONFIG.projectRoot,
      'services/cache/MmkvStorage.ts'
    );

    try {
      const content = await fs.readFile(mmkvStoragePath, 'utf-8');

      // Check if encryption key is from environment variable
      const hasEnvKey = /process\.env\.EXPO_PUBLIC_MMKV_KEY/.test(content);
      const hasEncryptionKey = /encryptionKey/.test(content);

      if (!hasEnvKey && hasEncryptionKey) {
        const file = sanitizeFilePath(mmkvStoragePath);
        const message = 'MMKV encryption key should come from environment variable (process.env.EXPO_PUBLIC_MMKV_KEY)';

        const id = generateFindingId(
          file,
          undefined,
          FindingType.SECURITY_ENCRYPTION,
          message
        );

        findings.push({
          id,
          type: FindingType.SECURITY_ENCRYPTION,
          severity: Severity.CRITICAL,
          message,
          file,
          status: 'New' as any,
          requiresManualReview: true,
          reviewGuidance: 'Verify MMKV encryption configuration. Ensure encryption key is loaded from environment variable, not hardcoded.',
          timestamp: new Date().toISOString(),
        });
      }
    } catch (error) {
      // File doesn't exist or can't be read - skip check
    }

    return findings;
  }

  /**
   * Check Sentry error log sanitization
   */
  private async checkSanitization(): Promise<Finding[]> {
    const findings: Finding[] = [];

    const filesToScan = await this.getFilesToScan(['**/*.ts', '**/*.tsx']);

    for (const filePath of filesToScan) {
      try {
        const content = await fs.readFile(filePath, 'utf-8');
        const lines = content.split('\n');

        lines.forEach((line, index) => {
          // Look for Sentry.captureException with potentially unsanitized data
          const sentryMatch = /Sentry\.captureException\((.*?)\)/gi.exec(line);

          if (sentryMatch) {
            // Check if sensitive patterns might be in the error
            if (containsPotentialSecrets(line)) {
              const file = sanitizeFilePath(filePath);
              const lineNumber = index + 1;
              const message = 'Potential sensitive data in Sentry error logging. Ensure data is sanitized before sending to Sentry.';

              const id = generateFindingId(
                file,
                lineNumber,
                FindingType.SECURITY_SANITIZATION,
                message
              );

              findings.push({
                id,
                type: FindingType.SECURITY_SANITIZATION,
                severity: classifySeverity(FindingType.SECURITY_SANITIZATION),
                message,
                file,
                line: lineNumber,
                status: 'New' as any,
                requiresManualReview: true,
                reviewGuidance: 'Review error logging code to ensure sensitive data (emails, tokens, passwords) is sanitized before sending to Sentry.',
                timestamp: new Date().toISOString(),
              });
            }
          }
        });
      } catch (error) {
        continue;
      }
    }

    return findings;
  }

  /**
   * Get files to scan based on glob patterns (optimized with limit)
   */
  private async getFilesToScan(patterns: string[], maxFiles: number = 500): Promise<string[]> {
    const files: string[] = [];

    // Priority directories to scan (most likely to have security issues)
    const priorityDirs = ['services', 'app', 'components', 'utils', 'api'];

    async function walkDir(dir: string, isPriority: boolean = false): Promise<void> {
      // Stop if we've reached the limit (unless it's a priority directory)
      if (!isPriority && files.length >= maxFiles) {
        return;
      }

      try {
        const entries = await fs.readdir(dir, { withFileTypes: true });

        for (const entry of entries) {
          // Early exit if limit reached
          if (!isPriority && files.length >= maxFiles) {
            return;
          }

          const fullPath = path.join(dir, entry.name);
          const relativePath = toProjectRelativePosixPath(fullPath);

          // Skip excluded paths.
          // For directories we also test `<dir>/` so that a `foo/**` pattern
          // prunes the whole subtree instead of only its files.
          if (
            shouldExcludePath(fullPath) ||
            (entry.isDirectory() && shouldExcludePath(`${relativePath}/x`))
          ) {
            continue;
          }

          if (entry.isDirectory()) {
            // Check if this is a priority directory
            const dirIsPriority = priorityDirs.some(p => relativePath.startsWith(p));
            await walkDir(fullPath, dirIsPriority);
          } else if (entry.isFile()) {
            // Check if matches patterns
            if (patterns.some(pattern => {
              const ext = path.extname(entry.name);
              return pattern.includes(ext);
            })) {
              files.push(fullPath);
            }
          }
        }
      } catch (error) {
        // Skip directories we can't read
      }
    }

    await walkDir(AUDIT_CONFIG.projectRoot);
    return files;
  }

  /**
   * Check if finding is in test file or comment
   */
  /**
   * True when every insecure `http://` occurrence on the line is an XML
   * namespace or SOAP identifier rather than a network endpoint.
   *
   * XML namespace URIs (`xmlns`, `xmlns:soap`, `xsi:schemaLocation`) and
   * `SOAPAction` values are identifiers by specification: an XML processor
   * compares them as strings and never fetches them. Flagging them produced 13
   * of the 14 security findings in this repository (issue #56) and pushed
   * developers towards "fixing" them to `https://`, which breaks the request.
   *
   * The check is deliberately per-occurrence: a line that carries both a
   * namespace and a real `http://` endpoint is still reported.
   */
  static isXmlNamespaceOnly(line: string): boolean {
    const insecureUri = /http:\/\/(?!localhost|127\.0\.0\.1|0\.0\.0\.0)[^\s'"`<>)]*/gi;
    const namespaceContext =
      /(?:xmlns(?::[\w.-]+)?|(?:[\w.-]+:)?schemaLocation|SOAPAction|targetNamespace)\s*[:=]\s*["'`]?\s*$/i;

    const occurrences = line.match(insecureUri);
    if (!occurrences) {
      return false;
    }

    let cursor = 0;
    for (const uri of occurrences) {
      const at = line.indexOf(uri, cursor);
      cursor = at + uri.length;
      if (!namespaceContext.test(line.slice(0, at))) {
        return false; // a genuine endpoint — keep the finding
      }
    }

    return true;
  }

  private isInTestOrComment(filePath: string, line: string): boolean {
    // Check if test file
    if (
      filePath.includes('__tests__') ||
      filePath.includes('.test.') ||
      filePath.includes('.spec.') ||
      filePath.includes('test/')
    ) {
      return true;
    }

    // Check if in comment
    const trimmed = line.trim();
    if (trimmed.startsWith('//') || trimmed.startsWith('*') || trimmed.startsWith('/*')) {
      return true;
    }

    return false;
  }
}
