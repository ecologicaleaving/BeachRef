/**
 * API Audit Service
 *
 * Captures and validates VIS API requests against documentation.
 * Identifies malformed requests, over-fetching, and other optimization opportunities.
 *
 * Feature: specs/001-vis-api-optimization
 * Tasks: T013, T016-T019
 */

import { v4 as uuidv4 } from 'uuid';
import {
  ApiRequest,
  AuditFinding,
  VisApiEndpoint,
  Severity,
  FindingCategory,
  NetworkType,
  RequestSource,
} from '../../types/audit';

// Platform detection
const isWeb = typeof window !== 'undefined' && typeof window.document !== 'undefined';

// Conditional imports for native-only dependencies
let XMLParser: any = null;
let Sentry: any = null;

if (!isWeb) {
  try {
    const fxp = require('fast-xml-parser');
    XMLParser = fxp.XMLParser;
  } catch (e) {
    console.warn('[API Audit] fast-xml-parser not available');
  }

  try {
    Sentry = require('@sentry/react-native');
  } catch (e) {
    console.warn('[API Audit] Sentry not available');
  }
}

/**
 * ApiAuditService
 *
 * Captures all VIS API requests and validates them against VIS API documentation.
 * Only active in __DEV__ mode for development monitoring.
 *
 * **Validation Checks (T017-T019):**
 * - XML format validation (well-formed, correct structure)
 * - Parameter validation (correct form parameter name: "Request" not "xmlRequest")
 * - <Requests> wrapper validation (all requests must be wrapped)
 * - Field count thresholds (>20 for list views, >30 for detail views)
 */
export class ApiAuditService {
  private static instance: ApiAuditService | null = null;
  private requests: Map<string, ApiRequest> = new Map();
  private findings: Map<string, AuditFinding[]> = new Map();
  private xmlParser: any = null;
  private enabled: boolean = __DEV__;

  private constructor() {
    if (XMLParser) {
      this.xmlParser = new XMLParser({
        ignoreAttributes: false,
        attributeNamePrefix: '@_',
      });
    }
  }

  /**
   * Get singleton instance (only in __DEV__ mode)
   */
  static getInstance(): ApiAuditService {
    if (!__DEV__) {
      // In production, return a no-op instance
      return {
        captureRequest: () => {},
        getRequest: () => undefined,
        getFindings: () => [],
        getAllRequests: () => [],
        getAllFindings: () => [],
        clearAudit: () => {},
      } as any;
    }

    if (!ApiAuditService.instance) {
      ApiAuditService.instance = new ApiAuditService();
    }
    return ApiAuditService.instance;
  }

  /**
   * Capture an API request for audit analysis (T013)
   *
   * @param request - API request to capture
   */
  captureRequest(request: ApiRequest): void {
    if (!this.enabled) return;

    try {
      // Store request
      this.requests.set(request.id, request);

      // T069-T071: Payload monitoring
      this.logPayloadSize(request);
      this.logFieldCount(request);

      // Validate request and collect findings
      const findings = this.validateRequest(request);
      if (findings.length > 0) {
        this.findings.set(request.id, findings);

        // Log findings in development
        console.warn(`[API Audit] Found ${findings.length} issues in request ${request.id}:`, findings);

        // Send critical findings to Sentry (if configured and available)
        const criticalFindings = findings.filter(f => f.severity === 'critical');
        if (Sentry && criticalFindings.length > 0 && process.env.EXPO_PUBLIC_SENTRY_DSN) {
          criticalFindings.forEach(finding => {
            Sentry.captureMessage(
              `VIS API Issue: ${finding.issue}`,
              {
                level: 'warning',
                tags: {
                  endpoint: request.endpoint,
                  category: finding.category,
                },
                extra: {
                  finding,
                  request: {
                    id: request.id,
                    endpoint: request.endpoint,
                    fieldCount: request.fieldCount,
                  },
                },
              }
            );
          });
        }
      }
    } catch (error) {
      console.error('[API Audit] Error capturing request:', error);
    }
  }

  /**
   * Validate API request against VIS documentation
   *
   * @param request - Request to validate
   * @returns Array of audit findings
   */
  private validateRequest(request: ApiRequest): AuditFinding[] {
    const findings: AuditFinding[] = [];

    // T017: XML format validation
    const xmlFindings = this.validateXmlFormat(request);
    findings.push(...xmlFindings);

    // T018: Parameter validation
    const paramFindings = this.validateParameters(request);
    findings.push(...paramFindings);

    // T019: <Requests> wrapper validation
    const wrapperFindings = this.validateRequestsWrapper(request);
    findings.push(...wrapperFindings);

    // T020: Field count thresholds
    const fieldFindings = this.validateFieldCount(request);
    findings.push(...fieldFindings);

    return findings;
  }

  /**
   * T017: Validate XML format
   */
  private validateXmlFormat(request: ApiRequest): AuditFinding[] {
    const findings: AuditFinding[] = [];

    // Skip XML parsing if xmlParser not available (web platform)
    if (!this.xmlParser) {
      return findings;
    }

    try {
      // Try to parse XML
      this.xmlParser.parse(request.requestXml);
    } catch (error: any) {
      findings.push(this.createFinding(
        request.id,
        'critical',
        'malformed',
        `Request XML is not well-formed: ${error.message}`,
        'Valid XML structure per VIS API documentation',
        request.requestXml.substring(0, 200),
        {
          errorRate: 1.0,
          payloadIncrease: 0,
          affectedEndpoints: [request.endpoint],
        }
      ));
    }

    return findings;
  }

  /**
   * T018: Validate parameter names (must use "Request" not "xmlRequest")
   */
  private validateParameters(request: ApiRequest): AuditFinding[] {
    const findings: AuditFinding[] = [];

    // Check if headers indicate form data with incorrect parameter name
    const contentType = request.requestHeaders['Content-Type'] || request.requestHeaders['content-type'] || '';
    if (contentType.includes('application/x-www-form-urlencoded')) {
      // Check for common mistakes
      if (request.requestXml.includes('xmlRequest=') || request.requestXml.includes('xml=')) {
        findings.push(this.createFinding(
          request.id,
          'critical',
          'incorrect-parameter',
          'Request uses incorrect form parameter name (should be "Request", not "xmlRequest" or "xml")',
          'Form parameter: Request=<XML content>',
          'Form parameter: xmlRequest=<XML content> or xml=<XML content>',
          {
            errorRate: 1.0,
            payloadIncrease: 0,
            affectedEndpoints: [request.endpoint],
          }
        ));
      }
    }

    return findings;
  }

  /**
   * T019: Validate <Requests> wrapper
   */
  private validateRequestsWrapper(request: ApiRequest): AuditFinding[] {
    const findings: AuditFinding[] = [];

    // Check if XML starts with <Requests> root element
    const trimmed = request.requestXml.trim();
    if (!trimmed.startsWith('<Requests>') && !trimmed.startsWith('<Requests ')) {
      findings.push(this.createFinding(
        request.id,
        'critical',
        'malformed',
        'Request XML must be wrapped in <Requests> root element',
        '<Requests><Request Type="...">...</Request></Requests>',
        trimmed.substring(0, 100),
        {
          errorRate: 1.0,
          payloadIncrease: 0,
          affectedEndpoints: [request.endpoint],
        }
      ));
    }

    return findings;
  }

  /**
   * T020: Validate field count thresholds
   */
  private validateFieldCount(request: ApiRequest): AuditFinding[] {
    const findings: AuditFinding[] = [];

    // Determine expected threshold based on endpoint type
    const isListEndpoint = request.endpoint.includes('List');
    const isDetailEndpoint = request.endpoint === VisApiEndpoint.GET_BEACH_MATCH ||
                             request.endpoint === VisApiEndpoint.GET_BEACH_TOURNAMENT;

    let threshold = 20; // Default
    let recommendedMax = 10;

    if (isListEndpoint) {
      threshold = 20;
      recommendedMax = 10;
    } else if (isDetailEndpoint) {
      threshold = 30;
      recommendedMax = 15;
    }

    if (request.fieldCount > threshold) {
      findings.push(this.createFinding(
        request.id,
        'warning',
        'over-fetching',
        `Request has ${request.fieldCount} fields (threshold: ${threshold} for ${isListEndpoint ? 'list' : 'detail'} views)`,
        `Use slim mode with <=${recommendedMax} fields for ${isListEndpoint ? 'list' : 'detail'} views`,
        `${request.fieldCount} fields requested`,
        {
          errorRate: 0,
          payloadIncrease: (request.fieldCount - recommendedMax) * 100, // Estimate 100 bytes per extra field
          affectedEndpoints: [request.endpoint],
        }
      ));
    }

    return findings;
  }

  /**
   * Create an audit finding
   */
  private createFinding(
    apiRequestId: string,
    severity: Severity,
    category: FindingCategory,
    issue: string,
    expectedFormat: string,
    actualFormat: string,
    impactAssessment: {
      errorRate: number;
      payloadIncrease: number;
      affectedEndpoints: string[];
    }
  ): AuditFinding {
    return {
      id: uuidv4(),
      apiRequestId,
      severity,
      category,
      issue,
      expectedFormat,
      actualFormat,
      recommendation: this.getRecommendation(category, issue),
      impactAssessment,
      timestamp: Date.now(),
      resolved: false,
    };
  }

  /**
   * Get recommendation based on finding category
   */
  private getRecommendation(category: FindingCategory, issue: string): string {
    switch (category) {
      case 'malformed':
        return 'Fix XML structure to conform to VIS API documentation. Ensure all requests are wrapped in <Requests> root element.';
      case 'over-fetching':
        return 'Use field selection mode (slim/default/full) to request only needed fields. Consider context-aware field selection based on network type.';
      case 'incorrect-parameter':
        return 'Use correct form parameter name "Request" instead of "xmlRequest" or "xml" when posting to VIS API.';
      case 'missing-field':
        return 'Include all required fields as specified in VIS API documentation for this endpoint.';
      case 'excessive-batch':
        return 'Split large batch requests into smaller chunks to avoid timeout and improve reliability.';
      default:
        return 'Review VIS API documentation for correct usage.';
    }
  }

  /**
   * Get a captured request by ID
   */
  getRequest(requestId: string): ApiRequest | undefined {
    return this.requests.get(requestId);
  }

  /**
   * Get findings for a specific request
   */
  getFindings(requestId: string): AuditFinding[] {
    return this.findings.get(requestId) || [];
  }

  /**
   * Get all captured requests
   */
  getAllRequests(): ApiRequest[] {
    return Array.from(this.requests.values());
  }

  /**
   * Get all findings across all requests
   */
  getAllFindings(): AuditFinding[] {
    const allFindings: AuditFinding[] = [];
    this.findings.forEach(findings => {
      allFindings.push(...findings);
    });
    return allFindings;
  }

  /**
   * Clear audit data (for testing or resetting)
   */
  clearAudit(): void {
    this.requests.clear();
    this.findings.clear();
  }

  // ========================================================================
  // Payload Monitoring (T069-T071)
  // ========================================================================

  /**
   * T069: Log payload size for optimization tracking
   *
   * Tracks request/response payload sizes and logs warnings for oversized payloads.
   *
   * @param request - API request to analyze
   */
  logPayloadSize(request: ApiRequest): void {
    const requestSizeKB = request.payloadSize / 1024;
    const responseSizeKB = request.responseBody.length / 1024;
    const totalSizeKB = requestSizeKB + responseSizeKB;

    console.log('[API Audit - Payload Size]', {
      endpoint: request.endpoint,
      requestId: request.id,
      requestSize: `${requestSizeKB.toFixed(2)} KB`,
      responseSize: `${responseSizeKB.toFixed(2)} KB`,
      totalSize: `${totalSizeKB.toFixed(2)} KB`,
      timestamp: new Date(request.timestamp).toISOString(),
    });

    // T071: Warn if payload exceeds 50KB threshold
    this.checkPayloadThreshold(request, totalSizeKB);
  }

  /**
   * T070: Log field count per request for optimization tracking
   *
   * Tracks number of fields requested and compares to recommended values.
   *
   * @param request - API request to analyze
   */
  logFieldCount(request: ApiRequest): void {
    const isListEndpoint = request.endpoint.includes('List');
    const recommendedSlim = isListEndpoint ? 10 : 5;
    const recommendedDefault = isListEndpoint ? 20 : 15;

    const modeIndicator = request.fieldCount <= recommendedSlim ? 'slim' :
                          request.fieldCount <= recommendedDefault ? 'default' :
                          'full/over-fetching';

    console.log('[API Audit - Field Count]', {
      endpoint: request.endpoint,
      requestId: request.id,
      fieldCount: request.fieldCount,
      mode: modeIndicator,
      recommendedSlim,
      recommendedDefault,
      source: request.source,
      timestamp: new Date(request.timestamp).toISOString(),
    });
  }

  /**
   * T071: Check payload size threshold and create alert if exceeded
   *
   * Creates audit finding if payload exceeds 50KB warning threshold.
   *
   * @param request - API request to check
   * @param totalSizeKB - Total payload size in KB
   */
  private checkPayloadThreshold(request: ApiRequest, totalSizeKB: number): void {
    const THRESHOLD_KB = 50;

    if (totalSizeKB > THRESHOLD_KB) {
      const finding = this.createFinding(
        request.id,
        'warning',
        'over-fetching',
        `Payload size ${totalSizeKB.toFixed(2)} KB exceeds ${THRESHOLD_KB} KB threshold`,
        `Use field selection to reduce payload to <${THRESHOLD_KB} KB`,
        `${totalSizeKB.toFixed(2)} KB total (request + response)`,
        {
          errorRate: 0,
          payloadIncrease: (totalSizeKB - THRESHOLD_KB) * 1024, // Bytes over threshold
          affectedEndpoints: [request.endpoint],
        }
      );

      // Add finding to tracking
      const existingFindings = this.findings.get(request.id) || [];
      this.findings.set(request.id, [...existingFindings, finding]);

      console.warn('[API Audit - Payload Threshold]', {
        endpoint: request.endpoint,
        requestId: request.id,
        payloadSize: `${totalSizeKB.toFixed(2)} KB`,
        threshold: `${THRESHOLD_KB} KB`,
        overBy: `${(totalSizeKB - THRESHOLD_KB).toFixed(2)} KB`,
        recommendation: 'Use slim or default field mode to reduce payload size',
      });
    }
  }

  /**
   * Get payload statistics across all captured requests
   *
   * @returns Payload statistics for reporting
   */
  getPayloadStats(): {
    totalRequests: number;
    avgPayloadSizeKB: number;
    maxPayloadSizeKB: number;
    minPayloadSizeKB: number;
    payloadsOverThreshold: number;
    avgFieldCount: number;
    maxFieldCount: number;
    minFieldCount: number;
  } {
    const requests = this.getAllRequests();

    if (requests.length === 0) {
      return {
        totalRequests: 0,
        avgPayloadSizeKB: 0,
        maxPayloadSizeKB: 0,
        minPayloadSizeKB: 0,
        payloadsOverThreshold: 0,
        avgFieldCount: 0,
        maxFieldCount: 0,
        minFieldCount: 0,
      };
    }

    const THRESHOLD_KB = 50;
    let totalPayloadSize = 0;
    let maxPayloadSize = 0;
    let minPayloadSize = Infinity;
    let payloadsOverThreshold = 0;
    let totalFieldCount = 0;
    let maxFieldCount = 0;
    let minFieldCount = Infinity;

    for (const request of requests) {
      const requestSizeKB = request.payloadSize / 1024;
      const responseSizeKB = request.responseBody.length / 1024;
      const totalSizeKB = requestSizeKB + responseSizeKB;

      totalPayloadSize += totalSizeKB;
      maxPayloadSize = Math.max(maxPayloadSize, totalSizeKB);
      minPayloadSize = Math.min(minPayloadSize, totalSizeKB);

      if (totalSizeKB > THRESHOLD_KB) {
        payloadsOverThreshold++;
      }

      totalFieldCount += request.fieldCount;
      maxFieldCount = Math.max(maxFieldCount, request.fieldCount);
      minFieldCount = Math.min(minFieldCount, request.fieldCount);
    }

    return {
      totalRequests: requests.length,
      avgPayloadSizeKB: totalPayloadSize / requests.length,
      maxPayloadSizeKB: maxPayloadSize,
      minPayloadSizeKB: minPayloadSize === Infinity ? 0 : minPayloadSize,
      payloadsOverThreshold,
      avgFieldCount: totalFieldCount / requests.length,
      maxFieldCount,
      minFieldCount: minFieldCount === Infinity ? 0 : minFieldCount,
    };
  }
}
