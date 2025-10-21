/**
 * Architecture Validator
 * Feature: 002-production-refactoring (US3)
 *
 * Validates service layer patterns, navigation conventions, component separation.
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import { Finding, FindingType, AuditChecker } from '../types';
import { AUDIT_CONFIG } from '../config';
import { generateFindingId } from '../tracking/finding-id-generator';
import { sanitizeFilePath } from '../utils/sanitizer';
import { classifySeverity } from '../utils/severity-classifier';

export class ArchitectureValidator implements AuditChecker {
  readonly id = 'architecture';
  readonly name = 'Architecture Validator';

  async check(): Promise<Finding[]> {
    const findings: Finding[] = [];

    try {
      const [diFindings, navFindings, componentFindings] = await Promise.all([
        this.checkDependencyInjection(),
        this.checkNavigationPatterns(),
        this.checkComponentSeparation(),
      ]);

      findings.push(...diFindings, ...navFindings, ...componentFindings);
    } catch (error) {
      console.warn('Architecture validator error:', (error as Error).message);
    }

    return findings;
  }

  private async checkDependencyInjection(): Promise<Finding[]> {
    const findings: Finding[] = [];
    const servicesDir = path.join(AUDIT_CONFIG.projectRoot, 'services');

    try {
      const serviceFiles = await this.findFiles(servicesDir, /\.ts$/);

      for (const filePath of serviceFiles) {
        const content = await fs.readFile(filePath, 'utf-8');

        // Check for service class with constructor
        const hasClass = /class\s+\w+Service/.test(content);
        const hasConstructor = /constructor\s*\(/.test(content);

        if (hasClass && !hasConstructor) {
          const file = sanitizeFilePath(filePath);
          const message = 'Service may lack dependency injection. Consider using constructor parameters for dependencies.';

          const id = generateFindingId(file, undefined, FindingType.ARCHITECTURE_DI, message);

          findings.push({
            id,
            type: FindingType.ARCHITECTURE_DI,
            severity: classifySeverity(FindingType.ARCHITECTURE_DI),
            message,
            file,
            status: 'New' as any,
            requiresManualReview: true,
            reviewGuidance: 'Check if service has external dependencies that should be injected via constructor. Refer to CLAUDE.md for service layer patterns.',
            timestamp: new Date().toISOString(),
          });
        }
      }
    } catch (error) {
      // Services directory may not exist
    }

    return findings;
  }

  private async checkNavigationPatterns(): Promise<Finding[]> {
    const findings: Finding[] = [];
    const appDir = path.join(AUDIT_CONFIG.projectRoot, 'app');

    try {
      const appFiles = await this.findFiles(appDir, /\.(ts|tsx)$/);

      for (const filePath of appFiles) {
        const content = await fs.readFile(filePath, 'utf-8');

        // Check for improper navigation (not using Expo Router)
        const hasNavigate = /useNavigation|navigation\.navigate/.test(content);
        const hasRouter = /useRouter|router\.(push|replace)/.test(content);

        if (hasNavigate && !hasRouter) {
          const file = sanitizeFilePath(filePath);
          const message = 'Navigation should use Expo Router file-based conventions (useRouter hook) instead of imperative navigation.';

          const id = generateFindingId(file, undefined, FindingType.ARCHITECTURE_NAVIGATION, message);

          findings.push({
            id,
            type: FindingType.ARCHITECTURE_NAVIGATION,
            severity: classifySeverity(FindingType.ARCHITECTURE_NAVIGATION),
            message,
            file,
            status: 'New' as any,
            requiresManualReview: true,
            reviewGuidance: 'Verify navigation pattern. Expo Router should be used for file-based routing. Check CLAUDE.md navigation architecture.',
            timestamp: new Date().toISOString(),
          });
        }
      }
    } catch (error) {
      // App directory may not exist
    }

    return findings;
  }

  private async checkComponentSeparation(): Promise<Finding[]> {
    const findings: Finding[] = [];
    const componentsDir = path.join(AUDIT_CONFIG.projectRoot, 'components');

    try {
      const componentFiles = await this.findFiles(componentsDir, /\.(tsx)$/);

      for (const filePath of componentFiles) {
        // Check if domain component is in design system directory
        const isDomainComponent = /\/(referee|tournament|assignment|match)\//i.test(filePath);
        const isInDesignSystem = /components\/(Button|Text|Container|Icon)/i.test(filePath);

        if (isDomainComponent && isInDesignSystem) {
          const file = sanitizeFilePath(filePath);
          const message = 'Domain components should be separated from design system components.';

          const id = generateFindingId(file, undefined, FindingType.ARCHITECTURE_COMPONENT, message);

          findings.push({
            id,
            type: FindingType.ARCHITECTURE_COMPONENT,
            severity: classifySeverity(FindingType.ARCHITECTURE_COMPONENT),
            message,
            file,
            status: 'New' as any,
            requiresManualReview: true,
            reviewGuidance: 'Review component placement. Domain components (referee, tournament, etc.) should be separate from design system (Button, Text, etc.). See CLAUDE.md component architecture.',
            timestamp: new Date().toISOString(),
          });
        }
      }
    } catch (error) {
      // Components directory may not exist
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
