# Data Model: Production Readiness Audit & Security Check

**Feature**: 002-production-refactoring
**Date**: 2025-10-20
**Purpose**: Define data structures for audit findings, reports, and historical tracking

## Core Entities

### 1. Finding

Represents a single issue discovered during an audit check.

**Fields**:
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | string | ✅ | Unique, deterministic identifier (SHA-256 hash of signature) |
| `type` | FindingType | ✅ | Category of finding (see FindingType enum) |
| `severity` | Severity | ✅ | Impact level: Critical, High, Medium, Low |
| `message` | string | ✅ | Human-readable description of the issue |
| `file` | string | ✅ | Relative file path from project root |
| `line` | number | ⚠️ | Line number (optional for file-level findings) |
| `column` | number | ❌ | Column number (optional, for precise location) |
| `ruleId` | string | ❌ | ESLint rule ID or error code (e.g., "typescript:2322") |
| `status` | FindingStatus | ✅ | New, Existing, or Resolved |
| `requiresManualReview` | boolean | ✅ | Whether finding needs human judgment |
| `reviewGuidance` | string | ❌ | What to verify for manual review items |
| `timestamp` | ISO8601 string | ✅ | When finding was detected |

**Validation Rules**:
- `id` must be 16-character hexadecimal string
- `file` must be relative path (no absolute paths)
- `line` must be positive integer if present
- `severity` must match one of: Critical, High, Medium, Low
- `type` must be valid FindingType enum value

**State Transitions**:
```
[Not Found] --> New (first appearance in audit)
     New --> Existing (present in next audit)
     New --> Resolved (absent in next audit)
Existing --> Existing (still present)
Existing --> Resolved (fixed, no longer present)
Resolved --> [Stays Resolved] (not re-added to active findings)
```

**Example**:
```json
{
  "id": "a1b2c3d4e5f60708",
  "type": "typescript-error",
  "severity": "Critical",
  "message": "Type 'string' is not assignable to type 'number'",
  "file": "services/cache/CacheService.ts",
  "line": 142,
  "column": 23,
  "ruleId": "typescript:2322",
  "status": "New",
  "requiresManualReview": false,
  "reviewGuidance": null,
  "timestamp": "2025-10-20T10:30:15Z"
}
```

---

### 2. AuditReport

Comprehensive report of a single audit execution.

**Fields**:
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `auditRunId` | string | ✅ | Unique identifier for this audit run (timestamp-based) |
| `timestamp` | ISO8601 string | ✅ | When audit was executed |
| `overallStatus` | "PASS" \| "FAIL" | ✅ | Whether audit passed (no Critical/High) or failed |
| `exitCode` | 0 \| 1 \| 2 | ✅ | Process exit code (0=pass, 1=fail, 2=error) |
| `durationMs` | number | ✅ | Total audit execution time in milliseconds |
| `summary` | AuditSummary | ✅ | Aggregate statistics (see AuditSummary) |
| `findings` | Finding[] | ✅ | All findings discovered (sorted by severity desc) |
| `trendAnalysis` | TrendAnalysis | ❌ | Historical comparison (null if first run) |
| `checkerResults` | CheckerResult[] | ✅ | Per-checker execution details |

**Validation Rules**:
- `auditRunId` format: `run-YYYY-MM-DD-HH-MM-SS`
- `exitCode` 0 if no Critical/High findings, 1 if Critical/High present, 2 if tool failure
- `findings` array sorted by severity priority (Critical > High > Medium > Low)
- `durationMs` must be positive integer

**Relationships**:
- Contains multiple `Finding` entities
- References historical `AuditRun` via `trendAnalysis`

**Example**:
```json
{
  "auditRunId": "run-2025-10-20-10-30-15",
  "timestamp": "2025-10-20T10:30:15Z",
  "overallStatus": "FAIL",
  "exitCode": 1,
  "durationMs": 45230,
  "summary": { /* see AuditSummary */ },
  "findings": [ /* Finding array */ ],
  "trendAnalysis": { /* see TrendAnalysis */ },
  "checkerResults": [ /* CheckerResult array */ ]
}
```

---

### 3. AuditSummary

Aggregate statistics for an audit run.

**Fields**:
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `totalFindings` | number | ✅ | Total count of all findings |
| `criticalCount` | number | ✅ | Count of Critical severity findings |
| `highCount` | number | ✅ | Count of High severity findings |
| `mediumCount` | number | ✅ | Count of Medium severity findings |
| `lowCount` | number | ✅ | Count of Low severity findings |
| `newFindings` | number | ✅ | Count of findings appearing for first time |
| `existingFindings` | number | ✅ | Count of findings present in previous audit |
| `resolvedFindings` | number | ✅ | Count of findings fixed since last audit |
| `manualReviewCount` | number | ✅ | Count of findings requiring manual verification |

**Validation Rules**:
- All counts must be non-negative integers
- `totalFindings` = `criticalCount` + `highCount` + `mediumCount` + `lowCount`
- `totalFindings` = `newFindings` + `existingFindings`

**Example**:
```json
{
  "totalFindings": 25,
  "criticalCount": 2,
  "highCount": 5,
  "mediumCount": 10,
  "lowCount": 8,
  "newFindings": 3,
  "existingFindings": 22,
  "resolvedFindings": 1,
  "manualReviewCount": 4
}
```

---

### 4. TrendAnalysis

Historical comparison showing remediation progress.

**Fields**:
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `previousRunId` | string | ✅ | ID of previous audit run for comparison |
| `totalFindingsChange` | number | ✅ | Change in total findings (positive = increased, negative = decreased) |
| `criticalChange` | number | ✅ | Change in Critical findings |
| `highChange` | number | ✅ | Change in High findings |
| `resolutionRate` | number | ✅ | Percentage of previous findings that were resolved (0-100) |
| `newFindingRate` | number | ✅ | Percentage of findings that are new (0-100) |
| `recentRuns` | AuditRunSummary[] | ✅ | Last 10 audit runs with summary stats |

**Validation Rules**:
- `resolutionRate` = (resolvedFindings / previousTotalFindings) * 100
- `newFindingRate` = (newFindings / totalFindings) * 100
- `recentRuns` limited to 10 most recent entries

**Example**:
```json
{
  "previousRunId": "run-2025-10-19-14-15-00",
  "totalFindingsChange": +2,
  "criticalChange": 0,
  "highChange": -1,
  "resolutionRate": 4.0,
  "newFindingRate": 12.0,
  "recentRuns": [
    {
      "auditRunId": "run-2025-10-19-14-15-00",
      "timestamp": "2025-10-19T14:15:00Z",
      "totalFindings": 24,
      "criticalCount": 2,
      "highCount": 6,
      "exitCode": 1
    }
  ]
}
```

---

### 5. CheckerResult

Execution details for a single audit checker.

**Fields**:
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `checkerId` | string | ✅ | Unique checker identifier (e.g., "typescript", "eslint") |
| `checkerName` | string | ✅ | Human-readable checker name |
| `status` | "success" \| "failure" \| "error" | ✅ | Checker execution outcome |
| `durationMs` | number | ✅ | Checker execution time |
| `findingCount` | number | ✅ | Number of findings produced by this checker |
| `errorMessage` | string | ❌ | Error details if checker failed (status: "error") |

**Validation Rules**:
- `status` "success" = checker ran and produced results (may have 0 findings)
- `status` "failure" = checker ran but found issues (findings count > 0)
- `status` "error" = checker crashed or failed to execute
- `errorMessage` required when `status` is "error"

**Example**:
```json
{
  "checkerId": "typescript",
  "checkerName": "TypeScript Strict Mode Validation",
  "status": "failure",
  "durationMs": 8420,
  "findingCount": 5,
  "errorMessage": null
}
```

---

### 6. AuditHistory

Persistent record of all findings and audit runs over time.

**Structure** (`.audit-history/findings.json`):
```typescript
{
  [findingId: string]: {
    id: string;                    // Finding ID
    type: FindingType;
    firstSeen: ISO8601;            // When first detected
    lastSeen: ISO8601;             // Most recent occurrence
    status: "Active" | "Resolved"; // Current status
    occurrences: Array<{
      auditRunId: string;
      timestamp: ISO8601;
      severity: Severity;          // May change over time (e.g., CVE upgrade)
      file: string;
      line: number | null;
    }>;
  }
}
```

**Structure** (`.audit-history/audit-runs.json`):
```typescript
{
  runs: Array<{
    id: string;                    // Audit run ID
    timestamp: ISO8601;
    totalFindings: number;
    criticalCount: number;
    highCount: number;
    mediumCount: number;
    lowCount: number;
    newFindings: number;
    resolvedFindings: number;
    exitCode: 0 | 1 | 2;
  }>
}
```

**Validation Rules**:
- `occurrences` sorted by timestamp desc (most recent first)
- `status` "Active" if finding present in most recent audit run
- `status` "Resolved" if absent from most recent audit run but in history
- `runs` array limited to last 100 runs (trim older entries)

---

## Enumerations

### FindingType

Categories of audit findings.

```typescript
enum FindingType {
  // Code Quality
  "typescript-error"         = "TypeScript compilation error",
  "eslint-error"             = "ESLint critical violation",
  "eslint-warning"           = "ESLint warning",
  "complexity-cyclomatic"    = "Cyclomatic complexity threshold exceeded",
  "complexity-cognitive"     = "Cognitive complexity threshold exceeded",

  // Security
  "security-credential"      = "Hardcoded credential detected",
  "security-cve"             = "Dependency vulnerability (CVE)",
  "security-http"            = "Insecure HTTP usage (should be HTTPS)",
  "security-encryption"      = "Missing or misconfigured encryption",
  "security-sanitization"    = "Input sanitization missing",

  // Architecture
  "architecture-di"          = "Dependency injection pattern violation",
  "architecture-navigation"  = "Navigation pattern violation (Expo Router)",
  "architecture-component"   = "Component separation violation",
  "architecture-state"       = "State management pattern violation",

  // Error Handling
  "error-handling-api"       = "Missing error handling for API call",
  "error-handling-boundary"  = "Missing error boundary",
  "error-handling-promise"   = "Unhandled promise rejection",

  // Performance
  "performance-cache"        = "Cache configuration issue",
  "performance-polling"      = "Polling interval misconfiguration",

  // Data Integrity
  "data-flow"                = "Data flow validation failure",
  "data-subscription"        = "Subscription cleanup issue",
  "data-sync"                = "Sync operation ordering issue",

  // Build & Deployment
  "build-failure"            = "Production build failure",
  "build-config"             = "Environment variable missing/undocumented",
  "build-checklist"          = "Deployment checklist incomplete"
}
```

### Severity

Impact level of a finding.

```typescript
enum Severity {
  Critical = "Critical",  // Blocks deployment, immediate fix required
  High = "High",          // Blocks deployment, fix before release
  Medium = "Medium",      // Warns but allows deployment, should fix soon
  Low = "Low"             // Informational, fix when convenient
}
```

**Severity Mapping Guidelines**:
- **Critical**: Hardcoded secrets, critical CVEs, TypeScript errors, build failures
- **High**: Unhandled errors, HTTP usage, high CVEs, missing error boundaries
- **Medium**: Complexity violations, moderate CVEs, architecture pattern deviations
- **Low**: ESLint warnings, style issues, minor config inconsistencies

### FindingStatus

Lifecycle state of a finding across audit runs.

```typescript
enum FindingStatus {
  New = "New",           // First appearance in current audit
  Existing = "Existing", // Present in previous and current audit
  Resolved = "Resolved"  // Present in previous audit, absent in current
}
```

---

## Data Flow Diagram

```
┌─────────────────────┐
│ Audit Execution     │
│ (run-audit.ts)      │
└──────────┬──────────┘
           │
           │ Runs all checkers in parallel
           │
           ▼
┌─────────────────────┐      ┌──────────────────────┐
│ TypeScript Checker  │      │ ESLint Checker       │
│ Security Scanner    │ ───▶ │ Produces Findings[]  │
│ Architecture        │      │                      │
│ Performance, etc.   │      │                      │
└─────────────────────┘      └──────────┬───────────┘
                                        │
                                        │ Findings sent to
                                        │
                                        ▼
                             ┌──────────────────────┐
                             │ Finding ID Generator │
                             │ (deterministic hash) │
                             └──────────┬───────────┘
                                        │
                                        │ Findings with IDs
                                        │
                                        ▼
                             ┌──────────────────────┐
                             │ Audit History Manager│
                             │ Compares with previous│
                             │ Sets status (New/Existing)
                             └──────────┬───────────┘
                                        │
                                        │ Enriched Findings + Trend Data
                                        │
                                        ▼
                             ┌──────────────────────┐
                             │ Severity Classifier  │
                             │ Determines overall   │
                             │ PASS/FAIL            │
                             └──────────┬───────────┘
                                        │
                                        │ AuditReport object
                                        │
                    ┌───────────────────┴───────────────────┐
                    │                                       │
                    ▼                                       ▼
         ┌──────────────────────┐           ┌──────────────────────┐
         │ JSON Reporter        │           │ Markdown Reporter    │
         │ Writes JSON file     │           │ Writes MD file       │
         └──────────────────────┘           └──────────────────────┘
                    │                                       │
                    └───────────────────┬───────────────────┘
                                        │
                                        ▼
                             ┌──────────────────────┐
                             │ Exit Code Manager    │
                             │ Returns 0 or 1       │
                             └──────────────────────┘
```

---

## Indexing & Performance

### Finding ID Index
- In-memory Map during audit run: `Map<FindingId, Finding>`
- Fast lookup for duplicate detection within single run
- No database needed, simple hash-based access

### Audit History Access Patterns
- **Read**: Load entire `.audit-history/findings.json` on audit start (~1-2MB for 1000 findings)
- **Write**: Update history after finding ID assignment, before report generation
- **Optimization**: Keep history file <5MB (limit to last 1000 unique findings)

### Report Storage
- Latest reports always overwrite: `reports/latest.json`, `reports/latest.md`
- Historical reports archived by timestamp: `reports/2025-10-20-10-30-15/`
- Optional cleanup: Delete archives older than 90 days

---

## Schema Evolution

### Version 1.0 (Initial)
- Core entities: Finding, AuditReport, AuditSummary, TrendAnalysis
- Finding ID generation: SHA-256 hash
- History persistence: JSON files

### Future Considerations (Not Implemented)
- **Database Migration**: If findings exceed 10,000, consider SQLite
- **Compression**: Gzip historical reports to save disk space
- **Remote Storage**: Optional cloud backup for CI/CD environments
- **Custom Fields**: Extensible metadata field for project-specific findings

---

## Data Model Completion Checklist

✅ Finding entity defined with all required fields and validation rules
✅ AuditReport entity defined with summary and trend analysis
✅ AuditSummary statistics defined with counts and percentages
✅ TrendAnalysis defined with historical comparison metrics
✅ CheckerResult defined for per-checker execution tracking
✅ AuditHistory persistence schema defined (JSON file structure)
✅ FindingType enum defined with all 20+ finding categories
✅ Severity enum defined with 4 levels and mapping guidelines
✅ FindingStatus enum defined with lifecycle states
✅ Data flow diagram showing processing pipeline
✅ Indexing and performance considerations documented

**Status**: Phase 1 Data Model Complete ✅

Ready for contract definition (JSON Schemas).
