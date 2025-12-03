# Production Readiness Audit - Developer Guide

Complete guide for using the production readiness audit system in your development workflow.

---

## Quick Start

### Run Your First Audit

```bash
# Run default code quality checks (TypeScript, ESLint, Complexity)
npm run audit

# Run all checkers (US1-US7)
npm run audit -- --checks=all

# Run specific checkers
npm run audit -- --checks=security,architecture,error-handling

# Run in CI mode (strict exit codes)
npm run audit:ci
```

### View Reports

After running an audit, reports are generated in:
- **JSON**: `specs/002-production-refactoring/reports/latest.json`
- **Markdown**: `specs/002-production-refactoring/reports/latest.md`
- **Console**: Displayed in terminal with colors and emojis

---

## Available Checkers

### Code Quality (US1) - Default

#### `typescript`
- **What it checks**: TypeScript compiler errors and warnings
- **Severity**: Critical
- **When to use**: Always (runs by default)
- **Example**: `npm run audit -- --checks=typescript`

#### `eslint`
- **What it checks**: ESLint rules violations
- **Severity**: High (errors), Low (warnings)
- **When to use**: Always (runs by default)
- **Example**: `npm run audit -- --checks=eslint`

#### `complexity`
- **What it checks**: Cyclomatic complexity (threshold: 15), Cognitive complexity (threshold: 20)
- **Severity**: Medium
- **When to use**: Always (runs by default)
- **Example**: `npm run audit -- --checks=complexity`

### Security (US2)

#### `security`
- **What it checks**:
  - Hardcoded credentials (API keys, passwords, tokens, secrets)
  - Insecure HTTP usage (http:// instead of https://)
  - MMKV encryption configuration
  - Sentry error log sanitization
- **Severity**: Critical (credentials), High (HTTP), Medium (config)
- **When to use**: Before commits, in CI/CD
- **Example**: `npm run audit -- --checks=security`
- **Note**: Optimized to scan 500 priority files (services, app, components, utils, api)

### Architecture (US3)

#### `architecture`
- **What it checks**:
  - Service layer dependency injection patterns
  - Expo Router vs imperative navigation
  - Component separation (domain vs design system)
- **Severity**: Medium
- **When to use**: During code reviews, refactoring
- **Example**: `npm run audit -- --checks=architecture`

### Error Handling (US4)

#### `error-handling`
- **What it checks**:
  - API calls without try-catch (fetch, axios)
  - Missing React error boundaries
  - Promise chains without .catch()
- **Severity**: High
- **When to use**: Before releases, in CI/CD
- **Example**: `npm run audit -- --checks=error-handling`

### Performance (US5)

#### `performance`
- **What it checks**:
  - Cache configuration (TTL, stale-while-revalidate, MMKV usage)
  - Polling intervals and app state awareness
  - React component optimizations (useMemo, useCallback)
- **Severity**: Medium
- **When to use**: Performance optimization sprints
- **Example**: `npm run audit -- --checks=performance`

### Data Flow (US6)

#### `data-flow`
- **What it checks**:
  - useEffect cleanup functions (subscription leaks)
  - Sync patterns (conflict resolution, retry logic)
  - Data immutability (direct state mutations, array mutations)
- **Severity**: Medium
- **When to use**: State management reviews
- **Example**: `npm run audit -- --checks=data-flow`

### Build & Deployment (US7)

#### `build`
- **What it checks**:
  - Expo configuration (app name, version, bundle IDs)
  - TypeScript configuration (strict mode, esModuleInterop)
  - Platform compatibility (web vs native APIs)
- **Severity**: Medium
- **When to use**: Before builds, pre-deployment
- **Example**: `npm run audit -- --checks=build`

---

## CLI Options

### `--checks` - Select Checkers

Run specific checkers or groups:

```bash
# Single checker
npm run audit -- --checks=typescript

# Multiple checkers (comma-separated)
npm run audit -- --checks=typescript,eslint,security

# Aliases
npm run audit -- --checks=quality  # US1: typescript, eslint, complexity
npm run audit -- --checks=all      # US1-US7: all 9 checkers
```

### `--ci` - CI Mode

Strict mode for continuous integration:

```bash
npm run audit:ci  # Alias for: npm run audit -- --ci
```

**Behavior**:
- Fails on Critical or High severity findings
- Exits with code 1 (blocks deployment)
- Optimized for pipeline integration

### `--fail-on` - Custom Failure Levels

Override default failure behavior:

```bash
# Fail only on Critical findings
npm run audit -- --fail-on=critical

# Fail on Critical or High (default in CI mode)
npm run audit -- --fail-on=critical,high

# Fail on any findings
npm run audit -- --fail-on=critical,high,medium,low
```

### `--severity` - Filter by Severity

Show only specific severity levels:

```bash
# Show only Critical findings
npm run audit -- --severity=critical

# Show Critical and High
npm run audit -- --severity=critical,high
```

### `--scope` - Scope to Paths

Audit specific files or directories:

```bash
# Audit only services directory
npm run audit -- --scope=services/**/*.ts

# Audit specific file
npm run audit -- --scope=app/index.tsx
```

### `--ignore` - Ignore Finding IDs

Ignore specific findings by their deterministic SHA-256 IDs:

```bash
npm run audit -- --ignore=abc123def456,789ghi012jkl
```

**How to get finding IDs**: Check the JSON or Markdown reports for the `id` field.

### `--exclude` - Exclude Paths

Exclude paths from auditing (in addition to default exclusions):

```bash
npm run audit -- --exclude=__tests__/**,*.test.ts
```

---

## Exit Codes

The audit tool uses standard exit codes for CI/CD integration:

| Exit Code | Status | Meaning | Action |
|-----------|--------|---------|--------|
| `0` | ✅ PASS | No Critical/High findings | Deployment allowed |
| `1` | ❌ FAIL | Critical/High findings present | Blocks deployment |
| `2` | 🔴 ERROR | Audit tool failure (timeout, crash) | Fix audit system |

### Examples

```bash
# Check exit code in bash
npm run audit
echo $?  # 0 = pass, 1 = fail, 2 = error

# Use in CI/CD pipeline
npm run audit:ci && echo "Deployment approved" || echo "Deployment blocked"
```

---

## Severity Levels

Understanding finding severity and recommended actions:

### 🔴 Critical
- **Examples**: TypeScript errors, hardcoded credentials, missing API error handling
- **Action**: Fix immediately, blocks deployment
- **Timeline**: Within 1 day

### 🟠 High
- **Examples**: Error handling gaps, unhandled promise rejections
- **Action**: Fix before release
- **Timeline**: Within 1 sprint

### 🟡 Medium
- **Examples**: Architecture patterns, performance issues, build config
- **Action**: Fix within sprint
- **Timeline**: 1-2 weeks

### 🟢 Low
- **Examples**: ESLint warnings, optional checklists
- **Action**: Fix when convenient
- **Timeline**: Next refactoring cycle

---

## Manual Review Items

Some findings require human judgment and are flagged with `requiresManualReview: true`.

### How to Handle

1. **Find Manual Review Items** in reports:
   - Console output shows count: `Manual Review Required: 2378 findings`
   - Markdown report has a dedicated section
   - JSON report: filter by `"requiresManualReview": true`

2. **Review Guidance** is provided for each finding:
   ```json
   {
     "requiresManualReview": true,
     "reviewGuidance": "Verify API call has proper error handling..."
   }
   ```

3. **Make Decision**:
   - **Valid Issue**: Fix the code
   - **False Positive**: Add comment explaining why it's safe, or use `--ignore` flag

---

## Workflow Integration

### Pre-Commit Hook

Add to `.husky/pre-commit`:

```bash
#!/bin/sh
npm run audit -- --fail-on=critical
```

### Pre-Push Hook

Add to `.husky/pre-push`:

```bash
#!/bin/sh
npm run audit:ci
```

### Local Development

```bash
# Quick check before committing
npm run audit

# Full check before pushing
npm run audit -- --checks=all
```

### Code Review

```bash
# Audit only changed files in current branch
git diff --name-only master... | grep -E '\.(ts|tsx)$' > /tmp/files.txt
npm run audit -- --scope=$(cat /tmp/files.txt | tr '\n' ',')
```

---

## CI/CD Integration

### GitHub Actions

Create `.github/workflows/audit.yml`:

```yaml
name: Production Readiness Audit

on:
  pull_request:
    branches: [master, main, development]
  push:
    branches: [master, main, development]

jobs:
  audit:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Run Production Audit
        run: npm run audit:ci

      - name: Upload Audit Report
        if: always()
        uses: actions/upload-artifact@v3
        with:
          name: audit-report
          path: specs/002-production-refactoring/reports/latest.md
```

### GitLab CI

Add to `.gitlab-ci.yml`:

```yaml
audit:
  stage: test
  script:
    - npm ci
    - npm run audit:ci
  artifacts:
    when: always
    paths:
      - specs/002-production-refactoring/reports/latest.json
      - specs/002-production-refactoring/reports/latest.md
    reports:
      junit: specs/002-production-refactoring/reports/latest.json
  only:
    - merge_requests
    - master
    - development
```

### Azure Pipelines

Add to `azure-pipelines.yml`:

```yaml
- task: Npm@1
  displayName: 'Install dependencies'
  inputs:
    command: 'ci'

- task: Npm@1
  displayName: 'Run Production Audit'
  inputs:
    command: 'custom'
    customCommand: 'run audit:ci'

- task: PublishBuildArtifacts@1
  displayName: 'Publish Audit Report'
  condition: always()
  inputs:
    PathtoPublish: 'specs/002-production-refactoring/reports/'
    ArtifactName: 'audit-reports'
```

---

## Trend Analysis

The audit system tracks changes over time automatically.

### What's Tracked

- **Total findings** (new, existing, resolved)
- **Critical/High findings** (deployment blockers)
- **Resolution rate** (% of previous findings fixed)
- **New finding rate** (% of new issues introduced)

### Example Output

```
📈 Trend Analysis
Compared to: run-2025-10-20-17-57-17

  📉 Total Findings: -150
  📉 Critical: -10
  📈 High: +5

  Resolution Rate: 15%
  New Finding Rate: 2.5%
```

### History Location

Audit history is stored in `.audit-history/` (gitignored):
- `findings.json` - Historical findings (max 1000, automatic cleanup)
- `audit-runs.json` - Historical runs (max 100, automatic cleanup)

---

## Troubleshooting

### Checker Timeout

**Issue**: `Error: Checker timeout after 300000ms`

**Solutions**:
1. Security Scanner has file limit (500 priority files)
2. Increase timeout in `scripts/audit/config.ts`:
   ```typescript
   performance: {
     checkerTimeoutMs: 10 * 60 * 1000, // 10 minutes
   }
   ```
3. Run specific checkers instead of `--checks=all`

### High Finding Count

**Issue**: Thousands of findings overwhelming

**Solutions**:
1. Filter by severity: `npm run audit -- --severity=critical,high`
2. Start with code quality: `npm run audit -- --checks=quality`
3. Fix blockers first, then medium/low over time
4. Use `--scope` to audit incrementally

### False Positives

**Issue**: Findings that are incorrect

**Solutions**:
1. Add explanatory comments in code
2. Use `--ignore` flag with finding IDs
3. Submit issue for pattern improvement

### CI/CD Integration Issues

**Issue**: Audit fails in CI but passes locally

**Solutions**:
1. Ensure same Node.js version (18+)
2. Run `npm ci` instead of `npm install`
3. Check for environment-specific files
4. Verify `.audit-history/` is in `.gitignore`

---

## Best Practices

### Daily Workflow

```bash
# Morning: Check project health
npm run audit

# Before commit: Quick check
npm run audit -- --checks=typescript,eslint

# Before push: Full audit
npm run audit:ci
```

### Sprint Planning

```bash
# Week start: Full audit
npm run audit -- --checks=all > audit-sprint-start.txt

# Week end: Compare
npm run audit -- --checks=all > audit-sprint-end.txt
diff audit-sprint-start.txt audit-sprint-end.txt
```

### Release Process

```bash
# Pre-release audit
npm run audit:ci

# Check manual review items
grep "Manual Review Required" specs/002-production-refactoring/reports/latest.md

# Verify no blockers
grep -E "(Critical|High):" specs/002-production-refactoring/reports/latest.md
```

---

## Advanced Usage

### Custom Checker Development

Create new checkers in `scripts/audit/checkers/`:

```typescript
import { Finding, FindingType, AuditChecker } from '../types';
import { AUDIT_CONFIG } from '../config';

export class CustomChecker implements AuditChecker {
  readonly id = 'custom';
  readonly name = 'Custom Checker';

  async check(): Promise<Finding[]> {
    // Your validation logic
    return [];
  }
}
```

Register in `scripts/audit/run-audit.ts`:

```typescript
case 'custom':
  checkers.push(new CustomChecker());
  break;
```

### Programmatic Usage

```typescript
import { TypeScriptChecker } from './scripts/audit/checkers/typescript-checker';

const checker = new TypeScriptChecker();
const findings = await checker.check();

console.log(`Found ${findings.length} TypeScript issues`);
```

---

## Support

### Documentation

- **Specification**: `specs/002-production-refactoring/spec.md`
- **Implementation Plan**: `specs/002-production-refactoring/plan.md`
- **Task Tracking**: `specs/002-production-refactoring/tasks.md`
- **This Guide**: `specs/002-production-refactoring/AUDIT_GUIDE.md`

### Common Issues

Check `specs/002-production-refactoring/reports/latest.md` for detailed finding explanations.

### Extending the System

The audit system is designed to be extensible. Add new checkers, modify severities, or customize reports as needed.

---

**Version**: 1.0.0
**Last Updated**: 2025-10-20
**Feature**: 002-production-refactoring
