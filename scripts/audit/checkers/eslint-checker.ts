/**
 * ESLint Checker
 * Feature: 002-production-refactoring (US1)
 *
 * Validates code quality using ESLint.
 * Detects errors and warnings based on project's ESLint configuration.
 */

import { ESLint } from 'eslint';
import * as path from 'path';
import { Finding, FindingType, AuditChecker } from '../types';
import { AUDIT_CONFIG, resolveExistingRoots } from '../config';
import { generateFindingId } from '../tracking/finding-id-generator';
import { sanitizeFilePath, sanitizeFindingMessage } from '../utils/sanitizer';
import { classifySeverity } from '../utils/severity-classifier';

export class EslintChecker implements AuditChecker {
  readonly id = 'eslint';
  readonly name = 'ESLint Checker';

  /**
   * Directories linted, kept identical to what `npm run lint` covers so the two
   * counts are cross-checkable (issue #42, AC3).
   */
  get scope(): string[] {
    return resolveExistingRoots(AUDIT_CONFIG.lintRoots).map((abs) =>
      path.relative(AUDIT_CONFIG.projectRoot, abs).replace(/\\/g, '/')
    );
  }

  /**
   * Run ESLint over the project's lint roots using the project's own
   * eslint.config.js.
   *
   * Deliberately does NOT catch errors: before #42 this method swallowed every
   * failure and returned `[]`, so a broken ESLint configuration was
   * indistinguishable from a clean codebase. Any throw here is surfaced by the
   * orchestrator as CheckerStatus.ERROR and forces a non-zero exit.
   */
  async check(): Promise<Finding[]> {
    const findings: Finding[] = [];

    const roots = resolveExistingRoots(AUDIT_CONFIG.lintRoots);

    if (roots.length === 0) {
      throw new Error(
        `No lint roots found. Expected at least one of: ${AUDIT_CONFIG.lintRoots.join(', ')} under ${AUDIT_CONFIG.projectRoot}`
      );
    }

    // Uses the project's eslint.config.js (flat config auto-discovery).
    // Passing directories rather than '**/*.jsx'-style globs avoids the
    // "No files matching ... were found" hard failure that used to be swallowed.
    const eslint = new ESLint({
      cwd: AUDIT_CONFIG.projectRoot,
      errorOnUnmatchedPattern: false,
    });

    const results = await eslint.lintFiles(roots);

    for (const result of results) {
      if (result.messages.length === 0) {
        continue;
      }

      for (const message of result.messages) {
        const finding = this.createFindingFromMessage(result.filePath, message);
        if (finding) {
          findings.push(finding);
        }
      }
    }

    return findings;
  }

  /**
   * Create finding from ESLint message
   */
  private createFindingFromMessage(
    filePath: string,
    message: ESLint.LintResult['messages'][0]
  ): Finding | null {
    // Skip if message is from a plugin we don't want to include
    if (this.shouldSkipMessage(message)) {
      return null;
    }

    const file = sanitizeFilePath(filePath);

    // Determine finding type based on severity
    const type =
      message.severity === 2
        ? FindingType.ESLINT_ERROR
        : FindingType.ESLINT_WARNING;

    const severity = classifySeverity(type);

    const messageText = sanitizeFindingMessage(message.message);

    const id = generateFindingId(file, message.line, type, messageText);

    return {
      id,
      type,
      severity,
      message: messageText,
      file,
      line: message.line,
      column: message.column,
      ruleId: message.ruleId || undefined,
      status: 'New' as any, // Will be determined by orchestrator
      requiresManualReview: false,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Check if a message should be skipped
   */
  private shouldSkipMessage(message: ESLint.LintResult['messages'][0]): boolean {
    // Skip if no rule ID (usually parsing errors - handled by TypeScript checker)
    if (!message.ruleId) {
      return true;
    }

    // Skip complexity rules (handled by complexity checker)
    if (message.ruleId.includes('complexity')) {
      return true;
    }

    return false;
  }
}
