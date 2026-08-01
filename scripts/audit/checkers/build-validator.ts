/**
 * Build Validator
 * Feature: 002-production-refactoring (US7)
 *
 * Validates build configuration: Expo config, TypeScript config, platform compatibility.
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import { Finding, FindingType, AuditChecker } from '../types';
import { AUDIT_CONFIG, shouldExcludePath } from '../config';
import { generateFindingId } from '../tracking/finding-id-generator';
import { sanitizeFilePath } from '../utils/sanitizer';
import { classifySeverity } from '../utils/severity-classifier';

export class BuildValidator implements AuditChecker {
  readonly id = 'build';
  readonly name = 'Build Validator';

  async check(): Promise<Finding[]> {
    const findings: Finding[] = [];

    // Errors propagate on purpose (issue #42, AC1).
    const [expoFindings, tsFindings, platformFindings] = await Promise.all([
      this.checkExpoConfig(),
      this.checkTypeScriptConfig(),
      this.checkPlatformCompatibility(),
    ]);

    findings.push(...expoFindings, ...tsFindings, ...platformFindings);

    return findings;
  }

  private async checkExpoConfig(): Promise<Finding[]> {
    const findings: Finding[] = [];
    const appConfigPath = path.join(AUDIT_CONFIG.projectRoot, 'app.json');

    try {
      const content = await fs.readFile(appConfigPath, 'utf-8');
      const config = JSON.parse(content);

      // Check for production app name
      if (config.expo?.name && config.expo.name.toLowerCase().includes('example')) {
        const file = sanitizeFilePath(appConfigPath);
        const message = 'App name contains "example". Update to production name before deployment.';

        const id = generateFindingId(file, undefined, FindingType.BUILD_CONFIG, message);

        findings.push({
          id,
          type: FindingType.BUILD_CONFIG,
          severity: classifySeverity(FindingType.BUILD_CONFIG),
          message,
          file,
          status: 'New' as any,
          requiresManualReview: false,
          timestamp: new Date().toISOString(),
        });
      }

      // Check for version configuration
      if (!config.expo?.version) {
        const file = sanitizeFilePath(appConfigPath);
        const message = 'Missing version in app.json. Ensure version is set for production builds.';

        const id = generateFindingId(file, undefined, FindingType.BUILD_CONFIG, message);

        findings.push({
          id,
          type: FindingType.BUILD_CONFIG,
          severity: classifySeverity(FindingType.BUILD_CONFIG),
          message,
          file,
          status: 'New' as any,
          requiresManualReview: false,
          timestamp: new Date().toISOString(),
        });
      }

      // Check for bundle identifier (iOS)
      if (!config.expo?.ios?.bundleIdentifier) {
        const file = sanitizeFilePath(appConfigPath);
        const message = 'Missing iOS bundleIdentifier in app.json. Required for iOS builds.';

        const id = generateFindingId(file, undefined, FindingType.BUILD_CONFIG, message);

        findings.push({
          id,
          type: FindingType.BUILD_CONFIG,
          severity: classifySeverity(FindingType.BUILD_CONFIG),
          message,
          file,
          status: 'New' as any,
          requiresManualReview: false,
          timestamp: new Date().toISOString(),
        });
      }

      // Check for package name (Android)
      if (!config.expo?.android?.package) {
        const file = sanitizeFilePath(appConfigPath);
        const message = 'Missing Android package in app.json. Required for Android builds.';

        const id = generateFindingId(file, undefined, FindingType.BUILD_CONFIG, message);

        findings.push({
          id,
          type: FindingType.BUILD_CONFIG,
          severity: classifySeverity(FindingType.BUILD_CONFIG),
          message,
          file,
          status: 'New' as any,
          requiresManualReview: false,
          timestamp: new Date().toISOString(),
        });
      }

      // Check for new architecture flag
      if (config.expo?.plugins) {
        const hasNewArchitecture = JSON.stringify(config.expo.plugins).includes('newArchEnabled');

        if (hasNewArchitecture) {
          const file = sanitizeFilePath(appConfigPath);
          const message = 'React Native new architecture is enabled. Ensure all dependencies are compatible.';

          const id = generateFindingId(file, undefined, FindingType.BUILD_PLATFORM, message);

          findings.push({
            id,
            type: FindingType.BUILD_PLATFORM,
            severity: classifySeverity(FindingType.BUILD_PLATFORM),
            message,
            file,
            status: 'New' as any,
            requiresManualReview: true,
            reviewGuidance: 'Verify all npm dependencies support React Native new architecture. Check package documentation.',
            timestamp: new Date().toISOString(),
          });
        }
      }
    } catch (error) {
      // app.json doesn't exist or invalid JSON
      const file = 'app.json';
      const message = 'app.json is missing or invalid. Expo configuration is required for builds.';

      const id = generateFindingId(file, undefined, FindingType.BUILD_CONFIG, message);

      findings.push({
        id,
        type: FindingType.BUILD_CONFIG,
        severity: classifySeverity(FindingType.BUILD_CONFIG),
        message,
        file,
        status: 'New' as any,
        requiresManualReview: false,
        timestamp: new Date().toISOString(),
      });
    }

    return findings;
  }

  private async checkTypeScriptConfig(): Promise<Finding[]> {
    const findings: Finding[] = [];
    const tsconfigPath = path.join(AUDIT_CONFIG.projectRoot, 'tsconfig.json');

    try {
      const content = await fs.readFile(tsconfigPath, 'utf-8');
      const config = JSON.parse(content);

      // Check for strict mode
      if (!config.compilerOptions?.strict) {
        const file = sanitizeFilePath(tsconfigPath);
        const message = 'TypeScript strict mode is not enabled. Enable for better type safety.';

        const id = generateFindingId(file, undefined, FindingType.BUILD_CONFIG, message);

        findings.push({
          id,
          type: FindingType.BUILD_CONFIG,
          severity: classifySeverity(FindingType.BUILD_CONFIG),
          message,
          file,
          status: 'New' as any,
          requiresManualReview: true,
          reviewGuidance: 'Enable "strict": true in tsconfig.json for maximum type safety. May require fixing existing type errors.',
          timestamp: new Date().toISOString(),
        });
      }

      // Check for skipLibCheck (should be true for performance)
      if (config.compilerOptions?.skipLibCheck === false) {
        const file = sanitizeFilePath(tsconfigPath);
        const message = 'skipLibCheck is disabled. Enable for faster TypeScript compilation.';

        const id = generateFindingId(file, undefined, FindingType.BUILD_CONFIG, message);

        findings.push({
          id,
          type: FindingType.BUILD_CONFIG,
          severity: classifySeverity(FindingType.BUILD_CONFIG),
          message,
          file,
          status: 'New' as any,
          requiresManualReview: false,
          timestamp: new Date().toISOString(),
        });
      }

      // Check for esModuleInterop (recommended for better imports)
      if (!config.compilerOptions?.esModuleInterop) {
        const file = sanitizeFilePath(tsconfigPath);
        const message = 'esModuleInterop is not enabled. Enable for better ES module compatibility.';

        const id = generateFindingId(file, undefined, FindingType.BUILD_CONFIG, message);

        findings.push({
          id,
          type: FindingType.BUILD_CONFIG,
          severity: classifySeverity(FindingType.BUILD_CONFIG),
          message,
          file,
          status: 'New' as any,
          requiresManualReview: true,
          reviewGuidance: 'Enable "esModuleInterop": true for better import compatibility with CommonJS modules.',
          timestamp: new Date().toISOString(),
        });
      }
    } catch (error) {
      // tsconfig.json doesn't exist or invalid JSON
      const file = 'tsconfig.json';
      const message = 'tsconfig.json is missing or invalid. TypeScript configuration is required for type checking.';

      const id = generateFindingId(file, undefined, FindingType.BUILD_CONFIG, message);

      findings.push({
        id,
        type: FindingType.BUILD_CONFIG,
        severity: classifySeverity(FindingType.BUILD_CONFIG),
        message,
        file,
        status: 'New' as any,
        requiresManualReview: false,
        timestamp: new Date().toISOString(),
      });
    }

    return findings;
  }

  private async checkPlatformCompatibility(): Promise<Finding[]> {
    const findings: Finding[] = [];

    try {
      const tsxFiles = await this.findFiles(AUDIT_CONFIG.projectRoot, /\.(tsx)$/);

      for (const filePath of tsxFiles) {
        // Skip test files
        if (filePath.includes('__tests__') || filePath.includes('.test.')) {
          continue;
        }

        const content = await fs.readFile(filePath, 'utf-8');

        // Check for web-only APIs used without platform checks
        const hasWebApi = /window\.|document\.|navigator\.|localStorage\./gi.test(content);
        const hasPlatformCheck = /Platform\.(OS|select)|Platform\.OS\s*===\s*['"]web['"]/.test(content);

        if (hasWebApi && !hasPlatformCheck) {
          const file = sanitizeFilePath(filePath);
          const message = 'Web-only API usage detected without Platform check. May cause crashes on native.';

          const id = generateFindingId(file, undefined, FindingType.BUILD_PLATFORM, message);

          findings.push({
            id,
            type: FindingType.BUILD_PLATFORM,
            severity: classifySeverity(FindingType.BUILD_PLATFORM),
            message,
            file,
            status: 'New' as any,
            requiresManualReview: true,
            reviewGuidance: 'Wrap web APIs in Platform.OS === "web" check or use Platform.select(). See React Native Platform docs.',
            timestamp: new Date().toISOString(),
          });
        }

        // Check for native-only APIs used without platform checks
        const hasNativeApi = /NativeModules\.|BackHandler\.|PermissionsAndroid\./gi.test(content);
        const hasNativePlatformCheck = /Platform\.(OS|select)|Platform\.OS\s*!==\s*['"]web['"]/.test(content);

        if (hasNativeApi && !hasNativePlatformCheck) {
          const file = sanitizeFilePath(filePath);
          const message = 'Native-only API usage detected without Platform check. May cause errors on web.';

          const id = generateFindingId(file, undefined, FindingType.BUILD_PLATFORM, message);

          findings.push({
            id,
            type: FindingType.BUILD_PLATFORM,
            severity: classifySeverity(FindingType.BUILD_PLATFORM),
            message,
            file,
            status: 'New' as any,
            requiresManualReview: true,
            reviewGuidance: 'Wrap native APIs in Platform.OS !== "web" check. Provide web alternatives or graceful fallbacks.',
            timestamp: new Date().toISOString(),
          });
        }
      }
    } catch (error) {
      // Continue on error
    }

    return findings;
  }

  private async findFiles(dir: string, pattern: RegExp): Promise<string[]> {
    const files: string[] = [];
    // Passed to shouldExcludePath so this checker's own scope exclusions apply
    // on top of the global ones (issue #60).
    const checkerId = this.id;

    async function walk(currentDir: string): Promise<void> {
      try {
        const entries = await fs.readdir(currentDir, { withFileTypes: true });

        for (const entry of entries) {
          const fullPath = path.join(currentDir, entry.name);

          // Skip excluded paths — see the note in error-handling-validator.ts:
          // the inline copy matched against raw path.relative() output and so
          // never excluded anything on Windows (issue #44).
          if (shouldExcludePath(fullPath, checkerId)) {
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
