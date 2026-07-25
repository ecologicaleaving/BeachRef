/**
 * Type definitions for Production Readiness Audit System
 * Feature: 002-production-refactoring
 * Specification: specs/002-production-refactoring/spec.md
 * JSON Schemas: specs/002-production-refactoring/contracts/
 */

// ============================================================================
// Core Enums
// ============================================================================

/**
 * Finding type categorization (25 types as per spec)
 */
export enum FindingType {
  // Code Quality (US1)
  TYPESCRIPT_ERROR = 'typescript-error',
  ESLINT_ERROR = 'eslint-error',
  ESLINT_WARNING = 'eslint-warning',
  COMPLEXITY_CYCLOMATIC = 'complexity-cyclomatic',
  COMPLEXITY_COGNITIVE = 'complexity-cognitive',

  // Security (US2)
  SECURITY_CREDENTIAL = 'security-credential',
  SECURITY_CVE = 'security-cve',
  SECURITY_HTTP = 'security-http',
  SECURITY_ENCRYPTION = 'security-encryption',
  SECURITY_SANITIZATION = 'security-sanitization',

  // Architecture (US3)
  ARCHITECTURE_DI = 'architecture-di',
  ARCHITECTURE_NAVIGATION = 'architecture-navigation',
  ARCHITECTURE_COMPONENT = 'architecture-component',
  ARCHITECTURE_STATE = 'architecture-state',

  // Error Handling (US4)
  ERROR_HANDLING_API = 'error-handling-api',
  ERROR_HANDLING_BOUNDARY = 'error-handling-boundary',
  ERROR_HANDLING_PROMISE = 'error-handling-promise',

  // Performance (US5)
  PERFORMANCE_CACHE = 'performance-cache',
  PERFORMANCE_POLLING = 'performance-polling',
  PERFORMANCE_RESOURCE = 'performance-resource',

  // Data Flow (US6)
  DATA_FLOW = 'data-flow',
  DATA_SUBSCRIPTION = 'data-subscription',
  DATA_SYNC = 'data-sync',
  DATA_IMMUTABILITY = 'data-immutability',

  // Build (US7)
  BUILD_FAILURE = 'build-failure',
  BUILD_CONFIG = 'build-config',
  BUILD_CHECKLIST = 'build-checklist',
  BUILD_PLATFORM = 'build-platform',
}

/**
 * Severity classification (4 levels as per spec)
 */
export enum Severity {
  CRITICAL = 'Critical',
  HIGH = 'High',
  MEDIUM = 'Medium',
  LOW = 'Low',
}

/**
 * Finding lifecycle status across audit runs
 */
export enum FindingStatus {
  NEW = 'New',
  EXISTING = 'Existing',
  RESOLVED = 'Resolved',
}

/**
 * Audit execution status
 *
 * - PASS:  every requested checker ran, no blocking regressions
 * - FAIL:  every requested checker ran, blocking regressions present
 * - ERROR: at least one checker could not run — the audit result is NOT
 *          trustworthy and must never be reported as PASS (issue #42)
 */
export enum AuditStatus {
  PASS = 'PASS',
  FAIL = 'FAIL',
  ERROR = 'ERROR',
}

/**
 * Checker execution outcome
 */
export enum CheckerStatus {
  SUCCESS = 'success',
  FAILURE = 'failure',
  ERROR = 'error',
}

// ============================================================================
// Core Entities
// ============================================================================

/**
 * A single issue discovered during production readiness audit
 * JSON Schema: specs/002-production-refactoring/contracts/finding.schema.json
 */
export interface Finding {
  /** Unique deterministic identifier (16-char hex SHA-256 hash) */
  id: string;

  /** Category of finding */
  type: FindingType;

  /** Impact level of the finding */
  severity: Severity;

  /** Human-readable description of the issue */
  message: string;

  /** Relative file path from project root */
  file: string;

  /** Line number (optional for file-level findings) */
  line?: number;

  /** Column number (optional) */
  column?: number;

  /** ESLint rule ID or error code (e.g., 'typescript:2322') */
  ruleId?: string;

  /** Lifecycle state across audit runs */
  status: FindingStatus;

  /** Whether finding needs human judgment */
  requiresManualReview: boolean;

  /** What to verify for manual review items */
  reviewGuidance?: string;

  /** When finding was detected (ISO 8601 format) */
  timestamp: string;
}

/**
 * Aggregate statistics for an audit run
 */
export interface AuditSummary {
  totalFindings: number;
  criticalCount: number;
  highCount: number;
  mediumCount: number;
  lowCount: number;
  newFindings: number;
  existingFindings: number;
  resolvedFindings: number;
  manualReviewCount: number;
}

/**
 * Historical comparison showing remediation progress
 */
export interface TrendAnalysis {
  /** Previous audit run ID for comparison */
  previousRunId: string;

  /** Change in total findings (negative is improvement) */
  totalFindingsChange: number;

  /** Change in critical findings */
  criticalChange: number;

  /** Change in high findings */
  highChange: number;

  /** Percentage of previous findings resolved (0-100) */
  resolutionRate: number;

  /** Percentage of current findings that are new (0-100) */
  newFindingRate: number;

  /** Last 10 runs for charting */
  recentRuns: AuditRunSummary[];
}

/**
 * Summary of a single historical audit run
 */
export interface AuditRunSummary {
  auditRunId: string;
  timestamp: string;
  totalFindings: number;
  criticalCount: number;
  highCount: number;
  exitCode: 0 | 1 | 2;
}

/**
 * Execution details for a single audit checker
 */
export interface CheckerResult {
  /** Unique checker identifier (e.g., 'typescript', 'eslint') */
  checkerId: string;

  /** Human-readable checker name */
  checkerName: string;

  /** Checker execution outcome */
  status: CheckerStatus;

  /** Checker execution time */
  durationMs: number;

  /** Number of findings produced by this checker */
  findingCount: number;

  /** Error details if checker failed (status: 'error') */
  errorMessage?: string;
}

/**
 * How the pass/fail gate was evaluated for a run.
 *
 * Introduced by issue #42: the audit inherits thousands of pre-existing
 * findings, so the gate blocks on *regressions* against a frozen baseline
 * rather than on the absolute total.
 */
export interface GateResult {
  /** 'baseline' = block on regressions only; 'absolute' = block on every blocking finding */
  mode: 'baseline' | 'absolute';

  /** Severity levels considered blocking for this run */
  failOnSeverities: Severity[];

  /** Findings at a blocking severity (regardless of baseline) */
  blockingFindingCount: number;

  /** Blocking findings that exceed the frozen baseline budget — these fail the build */
  regressionCount: number;

  /** Blocking findings covered by the baseline (reported, not blocking) */
  baselinedCount: number;

  /** Baseline file used, relative to project root (undefined when mode='absolute') */
  baselineFile?: string;

  /** IDs of the regressions, for reporting */
  regressionFindingIds: string[];
}

/**
 * Roster of checkers for a run — makes it impossible for a checker to be
 * silently absent (issue #42, AC5).
 */
export interface CheckerRoster {
  /** Every checker the audit tool knows about */
  available: string[];

  /** Checker ids selected for this run */
  requested: string[];

  /** Known checker ids NOT selected for this run */
  skipped: string[];

  /** Ids passed on the CLI that match no known checker */
  unknown: string[];
}

/**
 * Comprehensive report of a single audit execution
 * JSON Schema: specs/002-production-refactoring/contracts/audit-report.schema.json
 */
export interface AuditReport {
  /** Unique identifier for this audit run (format: run-YYYY-MM-DD-HH-MM-SS) */
  auditRunId: string;

  /** When audit was executed (ISO 8601 format) */
  timestamp: string;

  /** Whether audit passed or failed */
  overallStatus: AuditStatus;

  /** Process exit code (0=pass, 1=fail, 2=error) */
  exitCode: 0 | 1 | 2;

  /** Total audit execution time in milliseconds */
  durationMs: number;

  /** Aggregate statistics */
  summary: AuditSummary;

  /** All findings discovered (sorted by severity desc) */
  findings: Finding[];

  /** Historical comparison (null if first run) */
  trendAnalysis?: TrendAnalysis;

  /** Per-checker execution details */
  checkerResults: CheckerResult[];

  /** Which checkers ran and which did not (issue #42, AC5) */
  checkerRoster: CheckerRoster;

  /** How PASS/FAIL was decided (issue #42, AC7) */
  gate: GateResult;
}

// ============================================================================
// Audit History Persistence
// ============================================================================

/**
 * Single occurrence of a finding in a specific audit run
 */
export interface FindingOccurrence {
  auditRunId: string;
  timestamp: string;
  severity: Severity;
  file: string;
  line?: number;
}

/**
 * Finding with historical occurrence tracking
 */
export interface HistoricalFinding {
  id: string;
  type: string;
  firstSeen: string;
  lastSeen: string;
  status: 'Active' | 'Resolved';
  occurrences: FindingOccurrence[];
}

/**
 * Metadata for a historical audit run
 */
export interface HistoricalRun {
  id: string;
  timestamp: string;
  totalFindings: number;
  criticalCount: number;
  highCount: number;
  mediumCount: number;
  lowCount: number;
  newFindings: number;
  resolvedFindings: number;
  exitCode: 0 | 1 | 2;
}

/**
 * Persistent record of all findings and audit runs over time
 * JSON Schema: specs/002-production-refactoring/contracts/audit-history.schema.json
 */
export interface AuditHistory {
  /** Map of finding IDs to historical finding data */
  findings: Record<string, HistoricalFinding>;

  /** Historical audit run metadata (max 100 runs) */
  runs: HistoricalRun[];
}

// ============================================================================
// Configuration
// ============================================================================

/**
 * Complexity thresholds (from spec clarifications)
 */
export interface ComplexityThresholds {
  cyclomatic: number;
  cognitive: number;
}

/**
 * Audit system configuration
 */
export interface AuditConfig {
  /** Project root directory */
  projectRoot: string;

  /** Paths to exclude from auditing */
  excludePaths: string[];

  /** Source roots linted by the ESLint checker (parity with `npm run lint`) */
  lintRoots: string[];

  /** Source roots analysed by the Complexity checker */
  complexityRoots: string[];

  /** Frozen baseline file, relative to project root */
  baselineFile: string;

  /** Complexity thresholds */
  complexity: ComplexityThresholds;

  /** Severity mapping for finding types */
  severityMap: Record<string, Severity>;

  /** Report output paths */
  reports: {
    outputDir: string;
    latestJson: string;
    latestMarkdown: string;
    archiveFormat: string;
  };

  /** History persistence configuration */
  history: {
    directory: string;
    findingsFile: string;
    runsFile: string;
    maxHistoricalRuns: number;
    maxHistoricalFindings: number;
  };

  /** Performance limits */
  performance: {
    maxDurationMs: number;
    checkerTimeoutMs: number;
  };
}

// ============================================================================
// CLI Arguments
// ============================================================================

/**
 * Command-line arguments for audit execution
 */
export interface AuditCliArgs {
  /** Run in CI mode (strict exit codes) */
  ci?: boolean;

  /** Fail on specific severity levels (comma-separated) */
  failOn?: string;

  /** Watch mode for continuous auditing */
  watch?: boolean;

  /** Run specific checks only (comma-separated) */
  checks?: string;

  /** Show only specific severity levels (comma-separated) */
  severity?: string;

  /** Scope audit to specific files/directories */
  scope?: string;

  /** Ignore specific finding IDs (comma-separated) */
  ignore?: string;

  /** Exclude paths from auditing */
  exclude?: string;

  /** Show version */
  version?: boolean;

  /** Regenerate the frozen baseline from this run instead of gating on it */
  updateBaseline?: boolean;

  /** Ignore the frozen baseline and gate on the absolute finding count */
  noBaseline?: boolean;
}

// ============================================================================
// Checker Interface
// ============================================================================

/**
 * Base interface for all audit checkers
 */
export interface AuditChecker {
  /** Unique identifier for this checker */
  readonly id: string;

  /** Human-readable name */
  readonly name: string;

  /**
   * Execute the audit check
   * @returns Array of findings discovered
   */
  check(): Promise<Finding[]>;
}
