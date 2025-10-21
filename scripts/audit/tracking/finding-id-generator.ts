/**
 * Finding ID Generator
 * Feature: 002-production-refactoring
 *
 * Generates deterministic unique IDs for findings using SHA-256 hashing.
 * IDs are stable across audit runs if the same issue is found in the same location.
 *
 * As per research.md:
 * - Uses SHA-256 hash of (file + line + type + message)
 * - Truncated to 16-char hex for readability
 * - Deterministic: same input always produces same ID
 */

import * as crypto from 'crypto';
import { Finding, FindingType } from '../types';

/**
 * Generate a deterministic finding ID
 *
 * @param file - Relative file path
 * @param line - Line number (optional)
 * @param type - Finding type
 * @param message - Finding message (normalized)
 * @returns 16-character hex hash
 */
export function generateFindingId(
  file: string,
  line: number | undefined,
  type: FindingType | string,
  message: string
): string {
  // Normalize inputs for consistent hashing
  const normalizedFile = file.toLowerCase().replace(/\\/g, '/');
  const normalizedLine = line?.toString() ?? '0';
  const normalizedType = type.toString();
  const normalizedMessage = normalizeMessage(message);

  // Combine components into hashable string
  const hashInput = `${normalizedFile}:${normalizedLine}:${normalizedType}:${normalizedMessage}`;

  // Generate SHA-256 hash
  const hash = crypto.createHash('sha256').update(hashInput).digest('hex');

  // Truncate to 16 characters (provides ~2^64 unique IDs)
  return hash.substring(0, 16);
}

/**
 * Generate finding ID from a complete Finding object
 *
 * @param finding - Partial finding data (id will be generated)
 * @returns 16-character hex hash
 */
export function generateFindingIdFromObject(
  finding: Omit<Finding, 'id' | 'status' | 'timestamp'>
): string {
  return generateFindingId(
    finding.file,
    finding.line,
    finding.type,
    finding.message
  );
}

/**
 * Normalize finding message for consistent hashing
 * Removes variable portions (line numbers, column numbers, etc.)
 *
 * @param message - Raw finding message
 * @returns Normalized message
 */
function normalizeMessage(message: string): string {
  let normalized = message;

  // Remove line/column references (e.g., "at line 42:10")
  normalized = normalized.replace(/at line \d+:\d+/gi, 'at line X:Y');
  normalized = normalized.replace(/line \d+/gi, 'line X');
  normalized = normalized.replace(/column \d+/gi, 'column Y');

  // Remove file paths (already in file field)
  normalized = normalized.replace(/in file [^\s]+/gi, 'in file X');

  // Remove specific code values that might change
  normalized = normalized.replace(/'[^']*'/g, "'VALUE'");
  normalized = normalized.replace(/"[^"]*"/g, '"VALUE"');

  // Trim whitespace
  normalized = normalized.trim();

  return normalized;
}

/**
 * Validate that an ID matches the expected format
 *
 * @param id - ID to validate
 * @returns True if valid (16-char hex)
 */
export function isValidFindingId(id: string): boolean {
  return /^[a-f0-9]{16}$/.test(id);
}

/**
 * Check if two findings represent the same underlying issue
 * Based on their deterministic IDs
 *
 * @param finding1 - First finding
 * @param finding2 - Second finding
 * @returns True if they have the same ID
 */
export function areSameFindings(
  finding1: Pick<Finding, 'file' | 'line' | 'type' | 'message'>,
  finding2: Pick<Finding, 'file' | 'line' | 'type' | 'message'>
): boolean {
  const id1 = generateFindingId(
    finding1.file,
    finding1.line,
    finding1.type,
    finding1.message
  );
  const id2 = generateFindingId(
    finding2.file,
    finding2.line,
    finding2.type,
    finding2.message
  );

  return id1 === id2;
}
