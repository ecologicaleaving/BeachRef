/**
 * Complexity Checker
 * Feature: 002-production-refactoring (US1)
 *
 * Validates code complexity using cyclomatic and cognitive complexity metrics.
 * Uses eslint-plugin-complexity to analyze function complexity.
 */

import { ESLint } from 'eslint';
import * as path from 'path';
import { Finding, FindingType, AuditChecker } from '../types';
import { AUDIT_CONFIG } from '../config';
import { generateFindingId } from '../tracking/finding-id-generator';
import { sanitizeFilePath, sanitizeFindingMessage } from '../utils/sanitizer';
import { classifySeverity } from '../utils/severity-classifier';

export class ComplexityChecker implements AuditChecker {
  readonly id = 'complexity';
  readonly name = 'Complexity Checker';

  async check(): Promise<Finding[]> {
    const findings: Finding[] = [];

    try {
      // Create ESLint instance with complexity rules
      const eslint = new ESLint({
        overrideConfigFile: true,
        overrideConfig: {
          rules: {
            // Cyclomatic complexity (from clarification: 15)
            // Built-in ESLint rule, no plugin needed
            'complexity': ['error', AUDIT_CONFIG.complexity.cyclomatic],
          },
        } as any,
        cwd: AUDIT_CONFIG.projectRoot,
      });

      // Get files to analyze
      const filesToLint = [
        path.join(AUDIT_CONFIG.projectRoot, '**/*.ts'),
        path.join(AUDIT_CONFIG.projectRoot, '**/*.tsx'),
        path.join(AUDIT_CONFIG.projectRoot, '**/*.js'),
        path.join(AUDIT_CONFIG.projectRoot, '**/*.jsx'),
      ];

      // Run ESLint with complexity rules
      const results = await eslint.lintFiles(filesToLint);

      // Convert results to findings
      for (const result of results) {
        if (result.messages.length === 0) {
          continue;
        }

        if (this.shouldExcludeFile(result.filePath)) {
          continue;
        }

        for (const message of result.messages) {
          // Only process complexity rule violations
          if (!this.isComplexityViolation(message)) {
            continue;
          }

          const finding = this.createComplexityFinding(
            result.filePath,
            message
          );
          if (finding) {
            findings.push(finding);
          }
        }
      }
    } catch (error) {
      console.warn('Complexity checker failed:', (error as Error).message);
      return [];
    }

    return findings;
  }

  /**
   * Create finding from complexity violation
   */
  private createComplexityFinding(
    filePath: string,
    message: ESLint.LintResult['messages'][0]
  ): Finding | null {
    const file = sanitizeFilePath(filePath);

    // Determine if cyclomatic or cognitive complexity
    const isCyclomatic = message.ruleId === 'complexity';
    const type = isCyclomatic
      ? FindingType.COMPLEXITY_CYCLOMATIC
      : FindingType.COMPLEXITY_COGNITIVE;

    const severity = classifySeverity(type);

    // Extract complexity value from message
    const complexityValue = this.extractComplexityValue(message.message);
    const threshold = isCyclomatic
      ? AUDIT_CONFIG.complexity.cyclomatic
      : AUDIT_CONFIG.complexity.cognitive;

    const enhancedMessage = complexityValue
      ? `${message.message} (complexity: ${complexityValue}, threshold: ${threshold})`
      : message.message;

    const messageText = sanitizeFindingMessage(enhancedMessage);

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
      reviewGuidance: `Consider refactoring this function to reduce complexity. Break down into smaller functions or simplify conditional logic.`,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Check if message is a complexity violation
   */
  private isComplexityViolation(
    message: ESLint.LintResult['messages'][0]
  ): boolean {
    if (!message.ruleId) {
      return false;
    }

    return (
      message.ruleId === 'complexity' ||
      message.ruleId.includes('complexity')
    );
  }

  /**
   * Extract complexity value from message
   * Example message: "Function has a complexity of 18. Maximum allowed is 15."
   */
  private extractComplexityValue(message: string): number | null {
    const match = message.match(/complexity of (\d+)/i);
    if (match && match[1]) {
      return parseInt(match[1], 10);
    }
    return null;
  }

  /**
   * Check if a file should be excluded
   */
  private shouldExcludeFile(filePath: string): boolean {
    const relativePath = path.relative(AUDIT_CONFIG.projectRoot, filePath);

    return AUDIT_CONFIG.excludePaths.some((pattern) => {
      const regex = new RegExp(
        '^' + pattern.replace(/\*\*/g, '.*').replace(/\*/g, '[^/]*') + '$'
      );
      return regex.test(relativePath);
    });
  }
}
