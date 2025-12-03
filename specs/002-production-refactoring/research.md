# Research: Production Readiness Audit & Security Check

**Feature**: 002-production-refactoring
**Date**: 2025-10-20
**Purpose**: Technology selection, best practices, and implementation patterns for production audit system

## Research Areas

### 1. TypeScript Compilation Validation

**Decision**: Use TypeScript Compiler API programmatically

**Rationale**:
- Programmatic access via `ts.createProgram()` allows detailed error analysis
- Can extract specific error locations (file, line, column) for reporting
- Respects existing `tsconfig.json` strict mode configuration
- Zero additional dependencies (TypeScript already in project)

**Implementation Pattern**:
```typescript
import * as ts from 'typescript';

const configPath = ts.findConfigFile('./', ts.sys.fileExists, 'tsconfig.json');
const config = ts.readConfigFile(configPath, ts.sys.readFile);
const parsedConfig = ts.parseJsonConfigFileContent(config.config, ts.sys, './');
const program = ts.createProgram(parsedConfig.fileNames, parsedConfig.options);
const diagnostics = ts.getPreEmitDiagnostics(program);
// diagnostics array contains all TypeScript errors with file/line/column info
```

**Alternatives Considered**:
- Shell execution of `tsc --noEmit`: Loses structured error data, harder to parse
- `ts-node` compilation: Adds unnecessary runtime complexity

---

### 2. ESLint Integration

**Decision**: Use ESLint Node.js API with programmatic execution

**Rationale**:
- `ESLint` class provides structured lint results with severity, rule IDs, locations
- Can filter by severity (error vs warning) for Critical/High classification
- Respects existing `.eslintrc` or ESLint config in `package.json`
- Returns machine-readable JSON output

**Implementation Pattern**:
```typescript
import { ESLint } from 'eslint';

const eslint = new ESLint();
const results = await eslint.lintFiles(['**/*.ts', '**/*.tsx']);
// results contains file, messages (with severity, ruleId, line, column)
const errorCount = ESLint.getErrorResults(results).length;
```

**Alternatives Considered**:
- CLI execution via child_process: Requires parsing text output, loses type safety
- Custom AST parsing: Reinvents the wheel, high maintenance burden

---

### 3. Code Complexity Analysis

**Decision**: Use `eslint-plugin-complexity` or `typescript-eslint` complexity rules

**Rationale**:
- Already integrated with ESLint, no separate tool needed
- Supports both cyclomatic and cognitive complexity (via community plugins)
- Configurable thresholds match clarification (cyclomatic ≤15, cognitive ≤20)
- Outputs standard ESLint format for consistent reporting

**Configuration**:
```json
{
  "rules": {
    "complexity": ["error", { "max": 15 }],
    "@typescript-eslint/cognitive-complexity": ["error", { "max": 20 }]
  }
}
```

**Alternatives Considered**:
- Plato / escomplex: Standalone tools, fragmented ecosystem, less TypeScript support
- SonarQube: Requires external service, overly complex for this use case

---

### 4. Security Scanning

**Decision**: Multi-tool approach for comprehensive coverage

**Tools**:
1. **`npm audit`** - Dependency vulnerability scanning (built-in)
   - Detects CVEs in production and dev dependencies
   - JSON output with severity levels (critical, high, moderate, low)

2. **`gitleaks`** (or `git-secrets`) - Credential scanning in codebase and git history
   - Detects hardcoded API keys, passwords, tokens via regex patterns
   - Can scan git history for committed secrets
   - JSON output with file/line locations

3. **Custom HTTPS/Encryption Validators** - Project-specific checks
   - Grep for `http://` in network calls (should be `https://`)
   - Validate MMKV encryption configuration presence
   - Check for `process.env` usage for sensitive keys

**Rationale**:
- No single tool covers all security requirements from spec
- Layered approach catches different vulnerability types
- All tools support JSON output for consistent reporting

**Alternatives Considered**:
- Snyk: Commercial tool, requires API key, adds external dependency
- OWASP Dependency-Check: Java-based, heavyweight for Node.js projects

---

### 5. Architecture Compliance Validation

**Decision**: Custom validators with pattern matching and heuristics

**Approach**:
Since architecture compliance is subjective (FR-035 flagged for manual review), use a hybrid approach:

**Automated Checks** (Pattern Detection):
- Scan for `export class *Service` in `/services` directory
- Validate services use dependency injection (constructor parameters, not global imports)
- Check navigation follows Expo Router file-based conventions (`/app` directory structure)
- Verify components don't import from `/services` (should use hooks)

**Manual Review Flags**:
- Complex dependency injection patterns require human verification
- State management provider/hook patterns need contextual review
- Component/domain separation has gray areas

**Implementation**:
```typescript
// Example heuristic for dependency injection
function validateDependencyInjection(serviceFile: string): Finding[] {
  const ast = parseTypeScript(serviceFile);
  const classNode = findClassDeclaration(ast);
  const constructor = findConstructor(classNode);

  if (!constructor || constructor.parameters.length === 0) {
    return [createFinding({
      type: 'architecture-violation',
      severity: 'Medium',
      message: 'Service class lacks dependency injection (no constructor parameters)',
      requiresManualReview: true,
      reviewGuidance: 'Verify if service has external dependencies that should be injected'
    })];
  }
  return [];
}
```

**Alternatives Considered**:
- ArchUnit (Java): Not available for TypeScript
- Dependency-cruiser: Good for module dependencies, less suitable for pattern validation
- Manual checklist only: Doesn't leverage automation where patterns are detectable

---

### 6. Performance Validation

**Decision**: Static analysis of cache configuration + runtime measurement guidance

**Automated Checks**:
- Validate cache TTL configurations exist in `CacheService.ts`
- Check polling interval configurations in `PollingConfigurationManager.ts`
- Verify constants match spec targets (70% cache hit, <100ms loads, 5s/60s/off polling)

**Manual Verification Flags**:
- Actual cache hit rates require runtime measurement (flag for profiling)
- Load time benchmarks need real-world testing (flag for performance testing)

**Implementation**:
```typescript
// Static validation of config values
function validateCacheConfig(): Finding[] {
  const config = parseCacheServiceConfig();

  if (config.liveTTL !== 5000) { // 5 seconds
    return [createFinding({
      type: 'performance-config',
      severity: 'Medium',
      message: `Live data TTL is ${config.liveTTL}ms, expected 5000ms per spec`,
      file: 'services/cache/CacheService.ts'
    })];
  }
  return [];
}
```

**Alternatives Considered**:
- Runtime performance profiling: Out of scope (audit is static analysis)
- Lighthouse CI: Web-focused, not applicable to React Native

---

### 7. Finding ID Generation

**Decision**: Deterministic hashing based on finding signature

**Algorithm**:
```typescript
import crypto from 'crypto';

function generateFindingId(finding: Finding): string {
  const signature = [
    finding.type,           // e.g., 'typescript-error', 'security-credential'
    finding.file,           // File path
    finding.line,           // Line number
    finding.ruleId || '',   // ESLint rule ID or error code
    finding.message         // Normalized message (remove dynamic values)
  ].join('|');

  return crypto.createHash('sha256').update(signature).digest('hex').slice(0, 16);
  // 16-char hex = 64-bit hash, sufficient uniqueness for ~10-50 findings
}
```

**Rationale**:
- Stable IDs persist across audit runs for same issue at same location
- File + line ensures uniqueness per issue
- Hash prevents ID collisions between different finding types
- Normalized message handles minor wording variations

**Collision Handling**:
- Append line number suffix if collision detected during run
- Log collision warning (edge case: ~1 in 18 quintillion for 64-bit hash)

**Alternatives Considered**:
- UUID v4: Non-deterministic, can't track same finding across runs
- Sequential IDs: Not stable across runs, can't correlate findings

---

### 8. Audit History Persistence

**Decision**: JSON file-based storage in `.audit-history/` directory

**Schema**:
```typescript
// .audit-history/findings.json
{
  "findingId": {
    "id": "abc123def456",
    "type": "typescript-error",
    "firstSeen": "2025-10-20T10:00:00Z",
    "lastSeen": "2025-10-20T14:30:00Z",
    "status": "Existing" | "Resolved",
    "occurrences": [
      { "auditRunId": "run-001", "timestamp": "...", "severity": "High" },
      { "auditRunId": "run-002", "timestamp": "...", "severity": "High" }
    ]
  }
}

// .audit-history/audit-runs.json
{
  "runs": [
    {
      "id": "run-001",
      "timestamp": "2025-10-20T10:00:00Z",
      "totalFindings": 25,
      "criticalCount": 2,
      "highCount": 5,
      "mediumCount": 10,
      "lowCount": 8,
      "newFindings": 3,
      "resolvedFindings": 1,
      "exitCode": 1
    }
  ]
}
```

**Rationale**:
- JSON is human-readable and easy to parse
- File-based storage requires no external database
- Gitignored by default (`.audit-history/` in `.gitignore`)
- Enables offline trend analysis without network calls

**Alternatives Considered**:
- SQLite database: Overkill for simple key-value storage
- CSV files: Harder to represent nested data (occurrences array)
- Cloud storage: Violates offline-capable constraint

---

### 9. Report Generation

**Decision**: Dual format - JSON (machine-readable) + Markdown (human-readable)

**JSON Report Structure**:
```json
{
  "auditRunId": "run-001",
  "timestamp": "2025-10-20T10:00:00Z",
  "overallStatus": "FAIL",
  "exitCode": 1,
  "summary": {
    "totalFindings": 25,
    "critical": 2,
    "high": 5,
    "medium": 10,
    "low": 8,
    "newFindings": 3,
    "resolvedFindings": 1
  },
  "findings": [
    {
      "id": "abc123",
      "type": "security-credential",
      "severity": "Critical",
      "message": "Hardcoded API key detected",
      "file": "services/api/VisApiClient.ts",
      "line": 42,
      "column": 15,
      "status": "New",
      "requiresManualReview": false,
      "reviewGuidance": null
    }
  ],
  "trendAnalysis": {
    "totalFindingsOverTime": [25, 28, 25],
    "resolutionRate": "4% (1/25)",
    "newFindingsRate": "12% (3/25)"
  }
}
```

**Markdown Report Structure**:
```markdown
# Production Audit Report
**Date**: 2025-10-20 10:00:00 | **Status**: ❌ FAIL | **Exit Code**: 1

## Summary
- **Total Findings**: 25 (🆕 3 new, ✅ 1 resolved)
- **Critical**: 2 ❌ (blocks deployment)
- **High**: 5 ❌ (blocks deployment)
- **Medium**: 10 ⚠️
- **Low**: 8 ℹ️

## Critical Findings (2)
### SEC-001: Hardcoded API key detected
**File**: `services/api/VisApiClient.ts:42:15`
**Status**: 🆕 New
**Message**: Hardcoded API key detected in source code
```

**Rationale**:
- JSON for CI/CD parsing and tooling integration
- Markdown for developer readability in PRs and local development
- Both formats generated simultaneously from same data structure

**Alternatives Considered**:
- HTML reports: Requires web server or file:// protocol, less portable
- XML: More verbose, harder to read in version control
- Plain text: Loses formatting and structure

---

### 10. CI/CD Integration

**Decision**: npm script + exit code pattern for universal CI compatibility

**Implementation**:
```json
// package.json
{
  "scripts": {
    "audit": "ts-node scripts/audit/run-audit.ts",
    "audit:ci": "ts-node scripts/audit/run-audit.ts --ci --fail-on=critical,high"
  }
}
```

**Exit Codes**:
- `0`: Audit passed (no Critical/High findings)
- `1`: Audit failed (Critical or High findings detected)
- `2`: Audit error (tool failure, not finding-related)

**GitHub Actions Example**:
```yaml
name: Production Audit
on: [push, pull_request]
jobs:
  audit:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - run: npm install
      - run: npm run audit:ci
      - uses: actions/upload-artifact@v3
        if: always()
        with:
          name: audit-report
          path: specs/002-production-refactoring/reports/latest.*
```

**Rationale**:
- npm scripts work across all CI systems (GitHub Actions, GitLab CI, CircleCI, Jenkins)
- Exit code convention is universal standard for CI pass/fail
- Artifact upload preserves reports for post-mortem analysis

**Alternatives Considered**:
- GitHub Actions specific syntax: Locks into single CI provider
- Custom CI integration per provider: High maintenance, fragmented

---

## Best Practices Summary

### Error Handling
- Audit scripts MUST catch and log individual checker failures
- Continue execution even if one checker crashes (e.g., ESLint hangs)
- Distinguish between finding failures (exit 1) and tool failures (exit 2)

### Performance Optimization
- Run independent checkers in parallel (TypeScript, ESLint, complexity, security)
- Use streaming for large file operations (git history scanning)
- Cache checker results during single audit run (don't recompile TypeScript twice)

### Security
- Sanitize credential patterns before writing to reports (mask actual secrets)
- Use regex patterns for credential detection with low false-positive rate
- Never log actual secret values, only "[REDACTED]" placeholders

### Maintainability
- Each checker is independent, testable module
- Configuration centralized in `config.ts` (thresholds, paths, severity mappings)
- JSON schemas for report formats enable validation and IDE autocomplete

### Documentation
- Quickstart guide covers: installation, running locally, interpreting results, CI setup
- Each finding type includes remediation guidance in reports
- Manual review items specify what to verify and acceptance criteria

---

## Technology Stack Final Selection

| Category | Tool/Library | Version | Purpose |
|----------|-------------|---------|---------|
| TypeScript Validation | TypeScript Compiler API | 5.x | Type checking, strict mode |
| Linting | ESLint | 8.x | Code quality, complexity |
| Complexity | eslint-plugin-complexity | Latest | Cyclomatic complexity |
| Cognitive Complexity | @typescript-eslint/eslint-plugin | Latest | Cognitive complexity |
| Dependency CVEs | npm audit | Built-in | Vulnerability scanning |
| Credential Scanning | gitleaks | Latest | Hardcoded secrets detection |
| Hashing | Node crypto (built-in) | N/A | Finding ID generation |
| File I/O | Node fs/promises | N/A | Report and history persistence |
| JSON Validation | ajv (optional) | Latest | Schema validation for reports |
| Markdown Generation | Custom template strings | N/A | Human-readable reports |

---

## Research Completion Checklist

✅ TypeScript compilation validation approach defined
✅ ESLint integration pattern selected
✅ Complexity analysis tool chosen and configured
✅ Security scanning multi-tool strategy established
✅ Architecture validation hybrid approach (automated + manual) designed
✅ Performance validation approach (static config checks + manual flags) defined
✅ Finding ID generation algorithm specified (deterministic hashing)
✅ Audit history persistence schema designed (JSON file-based)
✅ Report generation dual-format approach defined (JSON + Markdown)
✅ CI/CD integration pattern established (npm scripts + exit codes)

**Status**: Phase 0 Research Complete ✅

All NEEDS CLARIFICATION items resolved. Ready for Phase 1: Data Model and Contracts.
