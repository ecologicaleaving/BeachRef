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
import { AUDIT_CONFIG, resolveExistingRoots, shouldExcludePath } from '../config';
import { generateFindingId } from '../tracking/finding-id-generator';
import { sanitizeFilePath, sanitizeFindingMessage } from '../utils/sanitizer';
import { classifySeverity } from '../utils/severity-classifier';

export class ComplexityChecker implements AuditChecker {
  readonly id = 'complexity';
  readonly name = 'Complexity Checker';

  get scope(): string[] {
    return resolveExistingRoots(AUDIT_CONFIG.complexityRoots).map((abs) =>
      path.relative(AUDIT_CONFIG.projectRoot, abs).replace(/\\/g, '/')
    );
  }

  /**
   * Run the built-in `complexity` rule over the project's source roots.
   *
   * Two bugs fixed in issue #42:
   *  1. `overrideConfigFile: true` threw away the project's flat config, so no
   *     TypeScript parser was registered and every .ts/.tsx file was ignored
   *     ("All files matched by '**\/*.ts' are ignored"). The rule is now layered
   *     ON TOP of the project config instead of replacing it.
   *  2. The failure was caught and turned into `return []` — a broken checker
   *     was indistinguishable from a clean codebase. Errors now propagate.
   */
  async check(): Promise<Finding[]> {
    const findings: Finding[] = [];

    const roots = resolveExistingRoots(AUDIT_CONFIG.complexityRoots);

    if (roots.length === 0) {
      throw new Error(
        `No complexity roots found. Expected at least one of: ${AUDIT_CONFIG.complexityRoots.join(', ')} under ${AUDIT_CONFIG.projectRoot}`
      );
    }

    const eslint = new ESLint({
      cwd: AUDIT_CONFIG.projectRoot,
      errorOnUnmatchedPattern: false,
      // Layered on top of eslint.config.js so the TypeScript parser stays active
      overrideConfig: [
        {
          rules: {
            // Cyclomatic complexity (from clarification: 15)
            complexity: ['error', AUDIT_CONFIG.complexity.cyclomatic],
          },
        },
      ] as any,
    });

    const results = await eslint.lintFiles(roots);

    for (const result of results) {
      if (result.messages.length === 0) {
        continue;
      }

      // `this.id` so a future per-checker exclusion applies here too; today
      // complexity has none — it is framework-agnostic (issue #60).
      if (shouldExcludePath(result.filePath, this.id)) {
        continue;
      }

      for (const message of result.messages) {
        // Only process complexity rule violations — everything else in these
        // files is the ESLint checker's job.
        if (!this.isComplexityViolation(message)) {
          continue;
        }

        const finding = this.createComplexityFinding(result.filePath, message);
        if (finding) {
          findings.push(finding);
        }
      }
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
}
