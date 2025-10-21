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
import { AUDIT_CONFIG } from '../config';
import { generateFindingId } from '../tracking/finding-id-generator';
import { sanitizeFilePath, sanitizeFindingMessage } from '../utils/sanitizer';
import { classifySeverity } from '../utils/severity-classifier';

export class EslintChecker implements AuditChecker {
  readonly id = 'eslint';
  readonly name = 'ESLint Checker';

  async check(): Promise<Finding[]> {
    const findings: Finding[] = [];

    try {
      // Create ESLint instance with project configuration
      const eslint = new ESLint({
        cwd: AUDIT_CONFIG.projectRoot,
        // ESLint will automatically find and use .eslintrc or package.json config
      });

      // Get files to lint
      const filesToLint = [
        path.join(AUDIT_CONFIG.projectRoot, '**/*.ts'),
        path.join(AUDIT_CONFIG.projectRoot, '**/*.tsx'),
        path.join(AUDIT_CONFIG.projectRoot, '**/*.js'),
        path.join(AUDIT_CONFIG.projectRoot, '**/*.jsx'),
      ];

      // Run ESLint
      const results = await eslint.lintFiles(filesToLint);

      // Convert results to findings
      for (const result of results) {
        // Skip if no messages or in excluded paths
        if (result.messages.length === 0) {
          continue;
        }

        if (this.shouldExcludeFile(result.filePath)) {
          continue;
        }

        for (const message of result.messages) {
          const finding = this.createFindingFromMessage(
            result.filePath,
            message
          );
          if (finding) {
            findings.push(finding);
          }
        }
      }
    } catch (error) {
      // If ESLint fails (e.g., no config found), return empty findings
      console.warn('ESLint checker failed:', (error as Error).message);
      return [];
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
   * Check if a file should be excluded from linting
   */
  private shouldExcludeFile(filePath: string): boolean {
    const relativePath = path.relative(AUDIT_CONFIG.projectRoot, filePath);

    return AUDIT_CONFIG.excludePaths.some((pattern) => {
      // Simple glob pattern matching (supports ** and *)
      const regex = new RegExp(
        '^' + pattern.replace(/\*\*/g, '.*').replace(/\*/g, '[^/]*') + '$'
      );
      return regex.test(relativePath);
    });
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
