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
   * Guard rail, not a budget (issue #60). The scan walks the whole first-party
   * tree; this only exists so an accidental inclusion of a huge vendored
   * directory fails loudly instead of silently truncating the scan.
   * ~800 files today.
   */
  static readonly SCAN_FILE_LIMIT = 5000;

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

              // Skip values that are not literals: `${...}` interpolations and
              // env lookups are the *correct* way to carry a credential, and
              // flagging them trains people to ignore this finding class — the
              // one class CLAUDE.md says must never be baselined. Same
              // per-occurrence shape as the XML-namespace exemption (#56): a
              // line with both an interpolation and a literal is still flagged.
              if (SecurityScanner.isNonLiteralCredentialOnly(line)) {
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
   * Get files to scan based on glob patterns.
   *
   * ISSUE #60 — the walk used to stop after 500 files, keeping only a
   * `priorityDirs` list (`services`, `app`, `components`, `utils`, `api`)
   * exempt. But the exemption was evaluated on the *recursive* call, while the
   * root-level loop kept its own `files.length >= maxFiles` early return: once
   * the budget was spent, the root loop returned and every remaining top-level
   * directory was dropped — alphabetically, everything from `store/` onward.
   *
   * Measured on this repo: 516 of 801 first-party files scanned, and **zero**
   * files under `supabase/` — the walk never got past `services/`. So the one
   * checker that #60 keeps pointed at the Deno Edge Functions was not reading
   * them at all, and a planted credential there was not reported.
   *
   * There is no cap now, only a guard rail: if the tree ever grows past
   * SCAN_FILE_LIMIT this **throws**, which the orchestrator reports as
   * `ERROR` / exit 2. Truncating silently is the failure mode #42 exists to
   * prevent, and for the credential scanner specifically it is the difference
   * between "no secrets" and "no secrets in the part we looked at". The full
   * uncapped walk costs a few seconds.
   */
  private async getFilesToScan(
    patterns: string[],
    maxFiles: number = SecurityScanner.SCAN_FILE_LIMIT
  ): Promise<string[]> {
    const files: string[] = [];
    // The security scanner has NO per-checker exclusions (issue #60): it is the
    // one checker that must see every line of first-party code, including the
    // Deno Edge Functions in supabase/functions. The id is passed anyway so the
    // call site is uniform with the other walkers and a future exclusion cannot
    // be added here by accident without editing config.ts.
    const checkerId = this.id;

    async function walkDir(dir: string): Promise<void> {
      try {
        const entries = await fs.readdir(dir, { withFileTypes: true });

        for (const entry of entries) {
          const fullPath = path.join(dir, entry.name);
          const relativePath = toProjectRelativePosixPath(fullPath);

          // Skip excluded paths.
          // For directories we also test `<dir>/` so that a `foo/**` pattern
          // prunes the whole subtree instead of only its files.
          if (
            shouldExcludePath(fullPath, checkerId) ||
            (entry.isDirectory() && shouldExcludePath(`${relativePath}/x`, checkerId))
          ) {
            continue;
          }

          if (entry.isDirectory()) {
            await walkDir(fullPath);
          } else if (entry.isFile()) {
            // Check if matches patterns
            if (patterns.some(pattern => {
              const ext = path.extname(entry.name);
              return pattern.includes(ext);
            })) {
              files.push(fullPath);

              if (files.length > maxFiles) {
                throw new Error(
                  `Security scan aborted: more than ${maxFiles} files to scan. ` +
                  `Raise SecurityScanner.SCAN_FILE_LIMIT or add an entry to ` +
                  `AUDIT_CONFIG.excludePaths — do not let the scan truncate ` +
                  `silently (issue #60).`
                );
              }
            }
          }
        }
      } catch (error) {
        // A directory we cannot read is skipped; the scan-limit guard must not
        // be swallowed by that same catch.
        if ((error as Error).message?.startsWith('Security scan aborted')) {
          throw error;
        }
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
  static isNonLiteralCredentialOnly(line: string): boolean {
    const assignments = [
      ...line.matchAll(
        /(?:api[_-]?key|password|token|secret)\s*[:=]\s*['"`]?([^'"`\s>]{4,})/gi
      ),
    ];

    if (assignments.length === 0) {
      return false;
    }

    // `${x}`, `$x`, `process.env.X`, `Deno.env.get(...)`, `config.password`
    const nonLiteral = /^(?:\$\{|\$[A-Za-z_]|process\.env|Deno\.env|import\.meta\.env)/;

    return assignments.every((m) => nonLiteral.test(m[1] ?? ''));
  }

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
    // Normalise separators before matching. `test/` never matched on Windows,
    // where the path reads `...\vis-data-sync\test\error-handling-test.ts` —
    // the same raw-separator bug as #42/#44, in its last hiding place. It only
    // surfaced with #60, because until then the scan never walked far enough
    // to reach a Deno test directory.
    const normalisedPath = filePath.replace(/\\/g, '/');

    // Check if test file. `_test.ts` / `-test.ts` are the Deno conventions used
    // under supabase/functions.
    if (
      normalisedPath.includes('__tests__') ||
      normalisedPath.includes('.test.') ||
      normalisedPath.includes('.spec.') ||
      normalisedPath.includes('test/') ||
      /[-_]test\.[cm]?[jt]sx?$/.test(normalisedPath)
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
