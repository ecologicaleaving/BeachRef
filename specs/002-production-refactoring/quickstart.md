# Quickstart: Production Readiness Audit

**Feature**: 002-production-refactoring
**Date**: 2025-10-20
**Audience**: Developers, DevOps engineers, CI/CD maintainers

## Overview

The Production Readiness Audit system provides automated verification of code quality, security, architecture compliance, and deployment readiness. This guide covers installation, local execution, result interpretation, and CI/CD integration.

---

## Prerequisites

- Node.js 18+ installed
- TypeScript 5+ (already in project dependencies)
- ESLint configured (`.eslintrc` or `eslintConfig` in `package.json`)
- Git repository (for credential history scanning)

---

## Installation

### 1. Install Dependencies

```bash
# Install audit tooling (if not already in package.json)
npm install --save-dev @typescript-eslint/eslint-plugin eslint-plugin-complexity
npm install --save-dev gitleaks # Or git-secrets
```

### 2. Configure Audit Scripts

Add to `package.json`:

```json
{
  "scripts": {
    "audit": "ts-node scripts/audit/run-audit.ts",
    "audit:ci": "ts-node scripts/audit/run-audit.ts --ci --fail-on=critical,high",
    "audit:watch": "ts-node scripts/audit/run-audit.ts --watch"
  }
}
```

### 3. Verify Installation

```bash
npm run audit -- --version
# Output: Production Audit v1.0.0
```

---

## Running Locally

### Basic Audit

Run complete audit with all checks:

```bash
npm run audit
```

**Output**:
```
🔍 Starting Production Readiness Audit...

✅ TypeScript Checker (8.4s) - 0 errors
⚠️  ESLint Checker (3.2s) - 3 warnings
❌ Complexity Checker (1.1s) - 2 violations
✅ Security Scanner (15.7s) - 0 Critical/High
⚠️  Architecture Validator (2.3s) - 4 manual review items
✅ Performance Validator (0.8s) - 0 issues
✅ Build Validator (12.5s) - Build successful

───────────────────────────────────────────────────
📊 Audit Summary
───────────────────────────────────────────────────
Total Findings: 9 (🆕 2 new, ✅ 1 resolved)
  Critical: 0 ✅
  High: 0 ✅
  Medium: 6 ⚠️
  Low: 3 ℹ️

Manual Review Required: 4 findings

Overall Status: ✅ PASS
Exit Code: 0
Duration: 44.0s

📄 Reports generated:
  - specs/002-production-refactoring/reports/latest.json
  - specs/002-production-refactoring/reports/latest.md
```

### Run Specific Checks

```bash
# Only security checks
npm run audit -- --checks=security

# Only code quality (TypeScript + ESLint + complexity)
npm run audit -- --checks=quality

# Multiple categories
npm run audit -- --checks=security,architecture
```

### Severity Filtering

```bash
# Show only Critical and High findings
npm run audit -- --severity=critical,high

# Show all findings
npm run audit -- --severity=all
```

---

## Interpreting Results

### Understanding Exit Codes

| Exit Code | Meaning | Action Required |
|-----------|---------|-----------------|
| `0` | ✅ PASS - No Critical/High findings | Deploy safe |
| `1` | ❌ FAIL - Critical or High findings present | Fix before deployment |
| `2` | 🔴 ERROR - Audit tool failure | Fix tool configuration |

### Severity Levels

| Severity | Blocks Deployment? | Examples | Remediation Timeline |
|----------|-------------------|----------|---------------------|
| **Critical** | ❌ Yes | Hardcoded secrets, critical CVEs, TypeScript errors | Immediate (same day) |
| **High** | ❌ Yes | Unhandled errors, HTTP usage, high CVEs | Before release |
| **Medium** | ⚠️ No (warns) | Complexity violations, architecture deviations | Within sprint |
| **Low** | ℹ️ No | ESLint warnings, style issues | When convenient |

### Reading JSON Reports

**Location**: `specs/002-production-refactoring/reports/latest.json`

**Key Fields**:
```json
{
  "overallStatus": "FAIL",         // PASS or FAIL
  "exitCode": 1,                   // 0, 1, or 2
  "summary": {
    "totalFindings": 15,
    "criticalCount": 2,            // 🚨 Deployment blockers
    "highCount": 3,                // 🚨 Deployment blockers
    "newFindings": 5,              // ⚠️ Issues introduced since last audit
    "resolvedFindings": 2          // ✅ Fixed issues
  },
  "findings": [...]                // Detailed finding list
}
```

**Finding Structure**:
```json
{
  "id": "a1b2c3d4e5f60708",
  "type": "security-credential",
  "severity": "Critical",
  "message": "Hardcoded API key detected",
  "file": "services/api/VisApiClient.ts",
  "line": 42,
  "status": "New",                 // New, Existing, or Resolved
  "requiresManualReview": false    // Auto-verified or needs human check
}
```

### Reading Markdown Reports

**Location**: `specs/002-production-refactoring/reports/latest.md`

Markdown reports provide human-readable summaries with:
- Executive summary (total findings, status, exit code)
- Findings grouped by severity
- Trend analysis charts (if not first run)
- Manual review items highlighted
- Remediation recommendations

**Example**:
```markdown
# Production Audit Report
**Date**: 2025-10-20 14:30:15 | **Status**: ❌ FAIL | **Exit Code**: 1

## Summary
- **Total Findings**: 15 (🆕 5 new, ✅ 2 resolved)
- **Critical**: 2 ❌ (blocks deployment)
- **High**: 3 ❌ (blocks deployment)

## Critical Findings (2)

### SEC-001: Hardcoded API key detected
**File**: `services/api/VisApiClient.ts:42`
**Status**: 🆕 New
**Message**: API key found in source code

**Remediation**:
1. Move API key to environment variable
2. Update `.env.example` with placeholder
3. Add to `.gitignore` if not already present
```

---

## Manual Review Items

Some findings require human judgment and are flagged with `"requiresManualReview": true`.

### Example: Architecture Compliance

```json
{
  "type": "architecture-di",
  "severity": "Medium",
  "message": "Service may lack dependency injection",
  "file": "services/custom/MyNewService.ts",
  "requiresManualReview": true,
  "reviewGuidance": "Verify if service has external dependencies that should be injected via constructor. Check against CLAUDE.md service layer patterns."
}
```

**How to Review**:
1. Open the file: `services/custom/MyNewService.ts`
2. Check constructor parameters (should inject dependencies, not use global imports)
3. Consult `CLAUDE.md` for service layer architecture patterns
4. If compliant: Document why pattern is correct (add comment or update docs)
5. If non-compliant: Refactor to use dependency injection

---

## Trend Analysis

After the first audit run, subsequent audits show trends:

```json
{
  "trendAnalysis": {
    "previousRunId": "run-2025-10-19-10-00-00",
    "totalFindingsChange": -3,        // 📉 Improved (3 fewer findings)
    "criticalChange": 0,              // Stable
    "highChange": -2,                 // 📉 Improved (2 fewer high findings)
    "resolutionRate": 13.3,           // 13.3% of previous findings resolved
    "newFindingRate": 33.3,           // 33.3% of current findings are new
    "recentRuns": [...]               // Last 10 runs for charting
  }
}
```

**Interpretation**:
- **Positive trends**: Negative `totalFindingsChange`, high `resolutionRate`
- **Negative trends**: Positive `totalFindingsChange`, low `resolutionRate`, high `newFindingRate`
- **Goal**: `resolutionRate` > `newFindingRate` (fixing faster than introducing)

---

## CI/CD Integration

### GitHub Actions

Create `.github/workflows/production-audit.yml`:

```yaml
name: Production Readiness Audit

on:
  push:
    branches: [master, development]
  pull_request:
    branches: [master]

jobs:
  audit:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout code
        uses: actions/checkout@v3
        with:
          fetch-depth: 0  # Full history for git-secrets scanning

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'

      - name: Install dependencies
        run: npm install

      - name: Run Production Audit
        run: npm run audit:ci
        continue-on-error: false  # Fail workflow on audit failure

      - name: Upload Audit Reports
        if: always()  # Upload even if audit fails
        uses: actions/upload-artifact@v3
        with:
          name: audit-report-${{ github.run_id }}
          path: specs/002-production-refactoring/reports/latest.*

      - name: Comment PR with Results
        if: github.event_name == 'pull_request'
        uses: actions/github-script@v6
        with:
          script: |
            const fs = require('fs');
            const report = fs.readFileSync('specs/002-production-refactoring/reports/latest.md', 'utf8');
            github.rest.issues.createComment({
              issue_number: context.issue.number,
              owner: context.repo.owner,
              repo: context.repo.repo,
              body: report
            });
```

### GitLab CI

Add to `.gitlab-ci.yml`:

```yaml
audit:
  stage: test
  script:
    - npm install
    - npm run audit:ci
  artifacts:
    when: always
    paths:
      - specs/002-production-refactoring/reports/latest.*
    expire_in: 30 days
  allow_failure: false  # Block pipeline on audit failure
```

### CircleCI

Add to `.circleci/config.yml`:

```yaml
jobs:
  audit:
    docker:
      - image: node:18
    steps:
      - checkout
      - run: npm install
      - run: npm run audit:ci
      - store_artifacts:
          path: specs/002-production-refactoring/reports/
          destination: audit-reports
```

---

## Troubleshooting

### Audit Hangs or Times Out

**Symptom**: Audit doesn't complete within 15 minutes

**Solutions**:
1. Run individual checkers to isolate issue:
   ```bash
   npm run audit -- --checks=typescript   # Test TypeScript check only
   npm run audit -- --checks=security     # Test security checks
   ```

2. Check for large files causing slow parsing:
   ```bash
   # Exclude large generated files
   npm run audit -- --exclude=node_modules,dist,build
   ```

### TypeScript Checker Returns Errors from node_modules

**Symptom**: Findings show errors in `node_modules/` or `dist/`

**Solution**: Update audit config to exclude non-source directories:

```typescript
// scripts/audit/config.ts
export const AUDIT_CONFIG = {
  excludePaths: [
    'node_modules/**',
    'dist/**',
    'build/**',
    '.expo/**',
    '.audit-history/**'
  ]
};
```

### Security Scanner Reports False Positives

**Symptom**: Credentials flagged in test files or documentation

**Solution**: Add exceptions for known safe patterns:

```typescript
// scripts/audit/checkers/security-scanner.ts
const FALSE_POSITIVE_PATTERNS = [
  /test\/fixtures\/.*\.ts/,        // Test fixtures
  /docs\/.*\.md/,                   // Documentation examples
  /EXAMPLE_API_KEY/                 // Placeholder text
];
```

### Finding History Corrupted

**Symptom**: Trend analysis shows incorrect data or missing runs

**Solution**: Reset audit history:

```bash
# Backup current history
mv .audit-history .audit-history.backup

# Fresh start (loses historical trends)
npm run audit

# Or manually fix corrupted JSON
# Edit .audit-history/audit-runs.json to remove invalid entries
```

---

## Configuration Reference

### Audit Config File

**Location**: `scripts/audit/config.ts`

**Configurable Options**:

```typescript
export const AUDIT_CONFIG = {
  // Complexity thresholds (from spec clarifications)
  complexity: {
    cyclomatic: 15,
    cognitive: 20
  },

  // Severity mapping
  severityMap: {
    'typescript-error': 'Critical',
    'security-credential': 'Critical',
    'security-cve-critical': 'Critical',
    'eslint-error': 'High',
    'security-http': 'High',
    'complexity-cyclomatic': 'Medium',
    'architecture-di': 'Medium'
  },

  // Report paths
  reports: {
    outputDir: 'specs/002-production-refactoring/reports/',
    latestJson: 'latest.json',
    latestMarkdown: 'latest.md',
    archiveFormat: 'YYYY-MM-DD-HH-MM-SS'
  },

  // History persistence
  history: {
    directory: '.audit-history/',
    findingsFile: 'findings.json',
    runsFile: 'audit-runs.json',
    maxHistoricalRuns: 100,
    maxHistoricalFindings: 1000
  },

  // Performance limits
  performance: {
    maxDurationMs: 15 * 60 * 1000,  // 15 minutes
    checkerTimeoutMs: 5 * 60 * 1000  // 5 minutes per checker
  }
};
```

---

## FAQ

### Q: Can I run the audit on specific files or directories?

**A**: Yes, use the `--scope` flag:

```bash
npm run audit -- --scope=services/
npm run audit -- --scope=services/cache/CacheService.ts
```

### Q: How do I exclude certain findings from failing CI?

**A**: Use `--ignore` with finding IDs:

```bash
npm run audit:ci -- --ignore=a1b2c3d4e5f60708,f6e5d4c3b2a10987
```

Or update severity mappings in `config.ts` to downgrade specific types to Medium/Low.

### Q: Can I export reports to other formats (HTML, PDF)?

**A**: Currently JSON and Markdown are supported. For HTML:

```bash
# Convert Markdown to HTML using pandoc
pandoc specs/002-production-refactoring/reports/latest.md -o report.html
```

### Q: How long is audit history retained?

**A**: By default:
- Last 100 audit runs
- Last 1000 unique findings
- Configurable in `AUDIT_CONFIG.history.max*`

### Q: Can I customize finding messages or severity levels?

**A**: Yes, edit severity mappings in `config.ts` and override messages in individual checkers (`scripts/audit/checkers/*`).

---

## Next Steps

1. ✅ Run initial audit: `npm run audit`
2. ✅ Review and fix Critical/High findings
3. ✅ Configure CI/CD integration
4. ✅ Establish team process for manual review items
5. ✅ Monitor trends weekly to track improvement

**Support**: For issues or questions, check audit logs in reports or consult `specs/002-production-refactoring/plan.md` for architectural details.
