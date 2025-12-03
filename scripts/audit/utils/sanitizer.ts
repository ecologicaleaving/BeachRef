/**
 * Data Sanitization Utility
 * Feature: 002-production-refactoring
 *
 * Sanitizes file paths and sensitive data before including in reports.
 * Ensures no secrets or sensitive information leaks into audit reports.
 */

import * as path from 'path';
import { AUDIT_CONFIG } from '../config';

/**
 * Sanitize a file path to be relative from project root
 * Removes absolute paths to prevent exposing system directory structure
 *
 * @param filePath - Absolute or relative file path
 * @returns Sanitized relative path from project root
 */
export function sanitizeFilePath(filePath: string): string {
  try {
    // Convert to relative path from project root
    const relativePath = path.relative(AUDIT_CONFIG.projectRoot, filePath);

    // If path is outside project root (starts with ..), use basename
    if (relativePath.startsWith('..')) {
      return path.basename(filePath);
    }

    // Normalize path separators (use forward slashes for consistency)
    return relativePath.split(path.sep).join('/');
  } catch (error) {
    // Fallback to basename if path resolution fails
    return path.basename(filePath);
  }
}

/**
 * Sanitize error message to remove potential secrets
 * Removes file paths, environment variables, and API keys from error messages
 *
 * @param message - Raw error message
 * @returns Sanitized message
 */
export function sanitizeErrorMessage(message: string): string {
  let sanitized = message;

  // Remove absolute paths (e.g., C:\Users\..., /home/...)
  sanitized = sanitized.replace(/[A-Z]:\\[\w\\/.-]+/gi, '[PATH]');
  sanitized = sanitized.replace(/\/[\w\\/.-]+/g, (match) => {
    // Only replace if it looks like an absolute path
    return match.startsWith('/home') ||
      match.startsWith('/usr') ||
      match.startsWith('/var')
      ? '[PATH]'
      : match;
  });

  // Remove potential API keys (long alphanumeric strings)
  sanitized = sanitized.replace(/[a-zA-Z0-9]{32,}/g, '[REDACTED]');

  // Remove environment variable values
  sanitized = sanitized.replace(/=["']?[\w\\/.-]+["']?/g, '=[REDACTED]');

  // Remove URLs with auth tokens
  sanitized = sanitized.replace(
    /(https?:\/\/)[^@\s]+@/g,
    '$1[REDACTED]@'
  );

  return sanitized;
}

/**
 * Sanitize finding message for safe reporting
 * Removes code snippets that might contain secrets
 *
 * @param message - Raw finding message
 * @returns Sanitized message
 */
export function sanitizeFindingMessage(message: string): string {
  let sanitized = message;

  // Remove code blocks (might contain secrets in examples)
  sanitized = sanitized.replace(/```[\s\S]*?```/g, '[CODE BLOCK]');
  sanitized = sanitized.replace(/`[^`]+`/g, '[CODE]');

  // Sanitize error portions
  sanitized = sanitizeErrorMessage(sanitized);

  return sanitized;
}

/**
 * Sanitize rule ID to prevent information disclosure
 * Some rule IDs might contain plugin paths or custom rule names
 *
 * @param ruleId - Raw rule ID (e.g., '@typescript-eslint/no-explicit-any')
 * @returns Sanitized rule ID
 */
export function sanitizeRuleId(ruleId: string): string {
  // Remove absolute paths from custom rule IDs
  if (ruleId.includes('/') || ruleId.includes('\\')) {
    const parts = ruleId.split(/[/\\]/);
    return parts[parts.length - 1];
  }

  return ruleId;
}

/**
 * Truncate long strings to prevent report bloat
 * @param str - String to truncate
 * @param maxLength - Maximum length (default: 500)
 * @returns Truncated string with ellipsis if needed
 */
export function truncateString(str: string, maxLength: number = 500): string {
  if (str.length <= maxLength) {
    return str;
  }

  return str.substring(0, maxLength - 3) + '...';
}

/**
 * Sanitize stack trace to remove sensitive paths
 * @param stackTrace - Raw stack trace
 * @returns Sanitized stack trace with relative paths
 */
export function sanitizeStackTrace(stackTrace: string): string {
  const lines = stackTrace.split('\n');

  return lines
    .map((line) => {
      // Replace absolute paths with relative ones
      let sanitized = line;

      // Match common stack trace patterns
      const pathMatch = line.match(/\((.+):(\d+):(\d+)\)/);
      if (pathMatch) {
        const [fullMatch, filePath, lineNum, colNum] = pathMatch;
        const relativePath = sanitizeFilePath(filePath);
        sanitized = line.replace(
          fullMatch,
          `(${relativePath}:${lineNum}:${colNum})`
        );
      }

      return sanitized;
    })
    .join('\n');
}

/**
 * Check if a string contains potential secrets
 * Used to flag findings that require manual review
 *
 * @param content - Content to check
 * @returns True if potential secrets detected
 */
export function containsPotentialSecrets(content: string): boolean {
  const secretPatterns = [
    /api[_-]?key/i,
    /secret/i,
    /password/i,
    /token/i,
    /auth/i,
    /credential/i,
    /[a-zA-Z0-9]{32,}/, // Long alphanumeric strings
    /-----BEGIN [A-Z]+ KEY-----/, // Private keys
  ];

  return secretPatterns.some((pattern) => pattern.test(content));
}
