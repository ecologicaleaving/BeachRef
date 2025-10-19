/**
 * Field Selection Validator
 *
 * Validates field selection against best practices and detects over-fetching.
 *
 * Feature: specs/001-vis-api-optimization
 * Task: T014
 */

import { v4 as uuidv4 } from 'uuid';
import {
  ApiRequest,
  AuditFinding,
  VisApiEndpoint,
  FieldMode,
  UseCase,
} from '../../types/audit';
import { validateFieldCount, getFieldCount } from '../../types/field-selection';

/**
 * FieldSelectionValidator
 *
 * Validates field selection strategies and detects over-fetching patterns.
 *
 * **Validation Rules:**
 * - Slim mode: <=10 fields for lists, <=5 for polling
 * - Default mode: <=20 fields for lists, <=15 for details
 * - Full mode: unrestricted (but should be used sparingly)
 */
export class FieldSelectionValidator {
  /**
   * Validate field selection for an API request
   *
   * @param request - API request to validate
   * @param mode - Field selection mode used
   * @param useCase - Use case (list/detail/polling/prefetch)
   * @returns Audit findings if validation fails
   */
  validateFieldSelection(
    request: ApiRequest,
    mode: FieldMode = 'default',
    useCase: UseCase = 'list'
  ): AuditFinding | null {
    // Skip validation for full mode (no restrictions)
    if (mode === 'full') return null;

    // Validate field count
    const isValid = validateFieldCount(request.fieldCount, mode, useCase);

    if (!isValid) {
      return this.createOverFetchingFinding(request, mode, useCase);
    }

    return null;
  }

  /**
   * Detect over-fetching by comparing requested fields to actual usage
   *
   * This is a placeholder for future proxy-based tracking where we monitor
   * which fields are actually accessed in the UI.
   *
   * @param request - API request
   * @param accessedFields - Fields that were actually used (tracked via proxy)
   * @returns Audit finding if over-fetching detected
   */
  detectOverFetching(
    request: ApiRequest,
    accessedFields?: string[]
  ): AuditFinding | null {
    // Future implementation: Compare requested fields vs accessed fields
    // For now, we rely on field count validation
    if (!accessedFields || accessedFields.length === 0) {
      return null;
    }

    const unusedFieldCount = request.fieldCount - accessedFields.length;
    if (unusedFieldCount > 5) { // More than 5 unused fields
      return {
        id: uuidv4(),
        apiRequestId: request.id,
        severity: 'info',
        category: 'over-fetching',
        issue: `Request fetched ${unusedFieldCount} fields that were never accessed in the UI`,
        expectedFormat: `Only request fields that will be used: [${accessedFields.join(', ')}]`,
        actualFormat: `Requested ${request.fieldCount} fields, used ${accessedFields.length}`,
        recommendation: 'Use field selection mode to request only the fields that will be displayed or processed.',
        impactAssessment: {
          errorRate: 0,
          payloadIncrease: unusedFieldCount * 100, // Estimate 100 bytes per field
          affectedEndpoints: [request.endpoint],
        },
        timestamp: Date.now(),
        resolved: false,
      };
    }

    return null;
  }

  /**
   * Create over-fetching finding
   */
  private createOverFetchingFinding(
    request: ApiRequest,
    mode: FieldMode,
    useCase: UseCase
  ): AuditFinding {
    const thresholds = this.getThresholds(mode, useCase);

    return {
      id: uuidv4(),
      apiRequestId: request.id,
      severity: 'warning',
      category: 'over-fetching',
      issue: `Request has ${request.fieldCount} fields in ${mode} mode for ${useCase} (threshold: ${thresholds.max})`,
      expectedFormat: `<=${thresholds.recommended} fields for ${mode} mode ${useCase} views`,
      actualFormat: `${request.fieldCount} fields requested`,
      recommendation: this.getRecommendation(mode, useCase, request.fieldCount, thresholds),
      impactAssessment: {
        errorRate: 0,
        payloadIncrease: (request.fieldCount - thresholds.recommended) * 100,
        affectedEndpoints: [request.endpoint],
      },
      timestamp: Date.now(),
      resolved: false,
    };
  }

  /**
   * Get thresholds for field count validation
   */
  private getThresholds(
    mode: FieldMode,
    useCase: UseCase
  ): { max: number; recommended: number } {
    if (mode === 'slim') {
      if (useCase === 'list') return { max: 10, recommended: 8 };
      if (useCase === 'polling') return { max: 5, recommended: 5 };
      return { max: 10, recommended: 8 };
    }

    if (mode === 'default') {
      if (useCase === 'list') return { max: 20, recommended: 10 };
      if (useCase === 'detail') return { max: 15, recommended: 12 };
      return { max: 20, recommended: 15 };
    }

    return { max: 999, recommended: 999 }; // Full mode
  }

  /**
   * Get recommendation based on validation failure
   */
  private getRecommendation(
    mode: FieldMode,
    useCase: UseCase,
    actualCount: number,
    thresholds: { max: number; recommended: number }
  ): string {
    const excess = actualCount - thresholds.recommended;

    return `Reduce field count by ${excess} fields. Current: ${actualCount}, Recommended: ${thresholds.recommended} for ${mode} mode ${useCase} views. Consider using context-aware field selection based on network type (slim mode on cellular, default on WiFi).`;
  }

  /**
   * Get field selection recommendations for an endpoint
   */
  getRecommendationsForEndpoint(
    endpoint: VisApiEndpoint,
    networkType: 'wifi' | 'cellular' | 'offline'
  ): {
    mode: FieldMode;
    maxFields: number;
    reason: string;
  } {
    if (networkType === 'offline' || networkType === 'cellular') {
      return {
        mode: 'slim',
        maxFields: endpoint.includes('List') ? 10 : 5,
        reason: `Use slim mode on ${networkType} to conserve bandwidth and improve performance`,
      };
    }

    return {
      mode: 'default',
      maxFields: endpoint.includes('List') ? 20 : 15,
      reason: 'Use default mode on WiFi for balanced payload size and feature completeness',
    };
  }
}
