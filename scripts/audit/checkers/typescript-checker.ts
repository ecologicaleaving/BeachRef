/**
 * TypeScript Checker
 * Feature: 002-production-refactoring (US1)
 *
 * Validates TypeScript code using the TypeScript Compiler API.
 * Detects type errors, syntax errors, and configuration issues.
 */

import * as ts from 'typescript';
import * as path from 'path';
import { Finding, FindingType, AuditChecker } from '../types';
import { AUDIT_CONFIG } from '../config';
import { generateFindingId } from '../tracking/finding-id-generator';
import { sanitizeFilePath, sanitizeFindingMessage } from '../utils/sanitizer';
import { classifySeverity } from '../utils/severity-classifier';

export class TypeScriptChecker implements AuditChecker {
  readonly id = 'typescript';
  readonly name = 'TypeScript Checker';

  async check(): Promise<Finding[]> {
    const findings: Finding[] = [];

    // Find tsconfig.json.
    // A missing tsconfig is a checker failure, not "zero type errors" —
    // returning [] here would make a broken setup look clean (issue #42, AC1).
    const configPath = this.findTsConfig();
    if (!configPath) {
      throw new Error(
        `No tsconfig.json found under ${AUDIT_CONFIG.projectRoot} — cannot type-check.`
      );
    }

    // Parse tsconfig.json
    const configFile = ts.readConfigFile(configPath, ts.sys.readFile);
    if (configFile.error) {
      return [
        this.createConfigErrorFinding(
          configPath,
          configFile.error
        ),
      ];
    }

    // Parse command line
    const parsedConfig = ts.parseJsonConfigFileContent(
      configFile.config,
      ts.sys,
      path.dirname(configPath)
    );

    if (parsedConfig.errors.length > 0) {
      for (const error of parsedConfig.errors) {
        findings.push(this.createConfigErrorFinding(configPath, error));
      }
    }

    // Create TypeScript program
    const program = ts.createProgram({
      rootNames: parsedConfig.fileNames,
      options: parsedConfig.options,
    });

    // Get all diagnostics
    const diagnostics = [
      ...program.getSyntacticDiagnostics(),
      ...program.getSemanticDiagnostics(),
      ...program.getGlobalDiagnostics(),
    ];

    // Convert diagnostics to findings
    for (const diagnostic of diagnostics) {
      const finding = this.createFindingFromDiagnostic(diagnostic);
      if (finding && this.shouldIncludeFinding(finding)) {
        findings.push(finding);
      }
    }

    return findings;
  }

  /**
   * Create finding from TypeScript diagnostic
   */
  private createFindingFromDiagnostic(
    diagnostic: ts.Diagnostic
  ): Finding | null {
    if (!diagnostic.file) {
      // Global diagnostic (no specific file)
      return null;
    }

    const file = sanitizeFilePath(diagnostic.file.fileName);
    const message = sanitizeFindingMessage(
      ts.flattenDiagnosticMessageText(diagnostic.messageText, '\n')
    );

    const position = diagnostic.file.getLineAndCharacterOfPosition(
      diagnostic.start ?? 0
    );

    const line = position.line + 1; // TypeScript uses 0-based lines
    const column = position.character + 1;

    const id = generateFindingId(
      file,
      line,
      FindingType.TYPESCRIPT_ERROR,
      message
    );

    return {
      id,
      type: FindingType.TYPESCRIPT_ERROR,
      severity: classifySeverity(FindingType.TYPESCRIPT_ERROR),
      message,
      file,
      line,
      column,
      ruleId: `typescript:${diagnostic.code}`,
      status: 'New' as any, // Will be determined by audit orchestrator
      requiresManualReview: false,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Create finding for TypeScript config error
   */
  private createConfigErrorFinding(
    configPath: string,
    diagnostic: ts.Diagnostic
  ): Finding {
    const file = sanitizeFilePath(configPath);
    const message = sanitizeFindingMessage(
      ts.flattenDiagnosticMessageText(diagnostic.messageText, '\n')
    );

    const id = generateFindingId(
      file,
      undefined,
      FindingType.BUILD_CONFIG,
      message
    );

    return {
      id,
      type: FindingType.BUILD_CONFIG,
      severity: classifySeverity(FindingType.BUILD_CONFIG),
      message: `TypeScript configuration error: ${message}`,
      file,
      ruleId: `typescript:${diagnostic.code}`,
      status: 'New' as any,
      requiresManualReview: false,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Find tsconfig.json in project root
   */
  private findTsConfig(): string | null {
    const configPath = path.join(AUDIT_CONFIG.projectRoot, 'tsconfig.json');

    if (ts.sys.fileExists(configPath)) {
      return configPath;
    }

    return null;
  }

  /**
   * Check if finding should be included (not in excluded paths)
   */
  private shouldIncludeFinding(finding: Finding): boolean {
    const fullPath = path.join(AUDIT_CONFIG.projectRoot, finding.file);
    const relativePath = path.relative(AUDIT_CONFIG.projectRoot, fullPath);

    return !AUDIT_CONFIG.excludePaths.some((pattern) => {
      const regex = new RegExp(
        '^' + pattern.replace(/\*\*/g, '.*').replace(/\*/g, '[^/]*') + '$'
      );
      return regex.test(relativePath);
    });
  }
}
