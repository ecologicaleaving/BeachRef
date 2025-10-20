# Implementation Tasks: Production Readiness Audit & Security Check

**Feature**: 002-production-refactoring
**Branch**: `002-production-refactoring`
**Date**: 2025-10-20
**Spec**: [spec.md](./spec.md) | **Plan**: [plan.md](./plan.md)

## Overview

This document breaks down the implementation of the Production Readiness Audit system into executable tasks organized by user story. Each user story represents an independently testable increment that delivers value.

**Total User Stories**: 7 (4 P1, 3 P2)
**Total Tasks**: 95
**Estimated Completion**: 5-7 days (with parallelization)

---

## Implementation Strategy

### MVP Scope (User Story 1 Only)

The minimum viable product focuses on **Code Quality Verification (US1)** which provides immediate value by validating TypeScript, ESLint, and complexity compliance. This can be delivered independently and used in local development immediately.

**MVP Deliverables**:
- TypeScript strict mode validation
- ESLint critical error detection
- Cyclomatic/cognitive complexity checks
- Basic JSON report generation
- Exit code management (pass/fail)

### Incremental Delivery

After MVP, deliver user stories in priority order:
1. **US1** (P1): Code Quality → Immediate local development value
2. **US2** (P1): Security → Credential/CVE scanning before deployment
3. **US3** (P1): Architecture → Pattern validation for maintainability
4. **US4** (P1): Error Handling → Reliability verification
5. **US5-7** (P2): Performance, Data Flow, Build → Enhanced validation

### Parallel Execution Opportunities

- Within each user story, tasks marked [P] can run in parallel
- Different user stories (US2-US7) can be developed simultaneously after Setup/Foundational phases complete
- Multiple developers can work on different checkers concurrently

---

## Dependencies & Execution Order

### User Story Dependencies

```
Setup (Phase 1) ──┐
                  │
Foundational (Phase 2) ──┐
                         │
                         ├──> US1 (Code Quality) ────────────┐
                         ├──> US2 (Security) ─────────────────┤
                         ├──> US3 (Architecture) ─────────────┤
                         ├──> US4 (Error Handling) ───────────┤
                         │                                    │
                         ├──> US5 (Performance) ──────────────┤
                         ├──> US6 (Data Flow) ────────────────┤
                         └──> US7 (Build) ────────────────────┤
                                                              │
                                                              └──> Polish (Final Phase)
```

**Critical Path**: Setup → Foundational → Any User Story → Polish
**Parallelizable**: US1-US7 can all be developed concurrently after Foundational phase

### Key Blockers

- **Setup (Phase 1)** must complete before any user story work
- **Foundational (Phase 2)** provides shared infrastructure all user stories need
- **Report generation** tasks depend on at least one checker being complete
- **CI/CD integration** should wait until core checkers (US1-US4) are stable

---

## Phase 1: Setup & Project Initialization

**Goal**: Establish audit tooling structure, configuration, and shared utilities

**Independent Test**: Directory structure exists, config loads successfully, npm scripts execute without errors

### Tasks

- [x] T001 Create scripts/audit/ directory structure per plan.md
- [x] T002 Create scripts/audit/config.ts with audit configuration (complexity thresholds, paths, severity mappings)
- [x] T003 Create scripts/audit/utils/severity-classifier.ts for severity mapping logic
- [x] T004 Create scripts/audit/utils/exit-code-manager.ts for exit code determination (0/1/2)
- [x] T005 Create scripts/audit/utils/sanitizer.ts for credential sanitization in reports
- [x] T006 Create .audit-history/ directory and add to .gitignore
- [x] T007 Create specs/002-production-refactoring/reports/ directory for output
- [x] T008 Add npm scripts to package.json ("audit", "audit:ci", "audit:watch")
- [x] T009 Install required dependencies (@typescript-eslint/eslint-plugin, eslint-plugin-complexity)
- [x] T010 Create TypeScript interfaces in scripts/audit/types.ts for Finding, AuditReport, AuditSummary, etc. per data-model.md

---

## Phase 2: Foundational Infrastructure

**Goal**: Build core infrastructure needed by all user stories (finding tracking, report generation, orchestration)

**Independent Test**: Audit orchestrator can run (even with no checkers), generate empty reports, track findings, manage exit codes

### Tasks

- [x] T011 Implement finding ID generation in scripts/audit/tracking/finding-id-generator.ts using SHA-256 hashing per research.md
- [x] T012 Implement audit history manager in scripts/audit/tracking/audit-history-manager.ts for persistence (.audit-history/)
- [x] T013 Implement trend analyzer in scripts/audit/tracking/trend-analyzer.ts for historical comparison
- [x] T014 [P] Implement JSON reporter in scripts/audit/reporters/json-reporter.ts per audit-report.schema.json
- [x] T015 [P] Implement Markdown reporter in scripts/audit/reporters/markdown-reporter.ts with severity-grouped sections
- [x] T016 [P] Implement console reporter in scripts/audit/reporters/console-reporter.ts for terminal output during execution
- [x] T017 Create main orchestrator in scripts/audit/run-audit.ts that coordinates checker execution
- [x] T018 Implement parallel checker execution in run-audit.ts using Promise.all() for independent checkers
- [x] T019 Implement graceful failure handling in run-audit.ts (complete all checks even if one fails)
- [x] T020 Integrate exit code manager in run-audit.ts to determine 0/1/2 based on severity findings

---

## Phase 3: User Story 1 - Code Quality Verification (P1)

**Story Goal**: Validate TypeScript, ESLint, and complexity compliance to ensure code quality standards

**Independent Test**: Run `npm run audit -- --checks=quality` and verify TypeScript errors, ESLint violations, and complexity issues are detected and reported with correct severity

**Acceptance Criteria**:
- All TypeScript files compile without errors in strict mode
- Zero critical ESLint violations
- No files exceed cyclomatic complexity 15 or cognitive complexity 20
- Zero high/critical dependency vulnerabilities

### Tasks

- [x] T021 [P] [US1] Implement TypeScript checker in scripts/audit/checkers/typescript-checker.ts using TypeScript Compiler API
- [x] T022 [P] [US1] Implement ESLint checker in scripts/audit/checkers/eslint-checker.ts using ESLint Node.js API
- [x] T023 [P] [US1] Implement complexity checker in scripts/audit/checkers/complexity-checker.ts using eslint-plugin-complexity
- [x] T024 [US1] Configure cyclomatic complexity threshold (max: 15) in complexity checker per clarifications
- [x] T025 [US1] Configure cognitive complexity threshold (max: 20) in complexity checker per clarifications
- [x] T026 [US1] Map TypeScript errors to Finding objects with severity "Critical"
- [x] T027 [US1] Map ESLint errors to Finding objects with severity "Critical" or "High" based on rule severity
- [x] T028 [US1] Map ESLint warnings to Finding objects with severity "Medium" or "Low"
- [x] T029 [US1] Map complexity violations to Finding objects with severity "Medium"
- [x] T030 [US1] Integrate TypeScript checker into run-audit.ts orchestrator
- [x] T031 [US1] Integrate ESLint checker into run-audit.ts orchestrator
- [x] T032 [US1] Integrate complexity checker into run-audit.ts orchestrator
- [x] T033 [US1] Implement npm audit execution for dependency CVE scanning
- [x] T034 [US1] Parse npm audit JSON output and create Finding objects with appropriate severity
- [x] T035 [US1] Add code quality findings to audit report with file paths and line numbers

---

## Phase 4: User Story 2 - Security Compliance Audit (P1)

**Story Goal**: Scan for hardcoded credentials, CVEs, insecure network calls, and encryption issues

**Independent Test**: Run `npm run audit -- --checks=security` and verify credential detection, HTTPS validation, encryption checks, and CVE scanning work correctly with sanitized output

**Acceptance Criteria**:
- Zero hardcoded API keys, passwords, or tokens in source code or git history
- All network requests use HTTPS
- MMKV encryption properly configured
- Zero high/critical dependency vulnerabilities
- Sensitive data sanitized in error logs

### Tasks

- [ ] T036 [P] [US2] Implement security scanner in scripts/audit/checkers/security-scanner.ts as coordinator for security checks
- [ ] T037 [P] [US2] Implement credential scanning using gitleaks (or git-secrets) for codebase and git history
- [ ] T038 [US2] Parse gitleaks JSON output and create Finding objects with severity "Critical"
- [ ] T039 [US2] Sanitize actual credential values using sanitizer.ts before adding to reports
- [ ] T040 [US2] Implement HTTPS validation by grepping codebase for http:// in network calls
- [ ] T041 [US2] Create Finding objects for HTTP usage with severity "High" and file/line locations
- [ ] T042 [US2] Implement MMKV encryption configuration check in services/cache/MmkvStorage.ts
- [ ] T043 [US2] Verify encryption key comes from environment variable (process.env.EXPO_PUBLIC_MMKV_KEY)
- [ ] T044 [US2] Create Finding for missing/misconfigured encryption with severity "Critical"
- [ ] T045 [US2] Implement Sentry sanitization check by analyzing error logging code
- [ ] T046 [US2] Verify sensitive data patterns (emails, tokens, passwords) are sanitized before Sentry.captureException
- [ ] T047 [US2] Create Finding for unsanitized sensitive data in error logs with severity "High"
- [ ] T048 [US2] Integrate security scanner into run-audit.ts orchestrator
- [ ] T049 [US2] Add security findings to audit report with sanitized output

---

## Phase 5: User Story 3 - Architecture Compliance Audit (P1)

**Story Goal**: Validate service layer patterns, navigation conventions, and component separation per CLAUDE.md

**Independent Test**: Run `npm run audit -- --checks=architecture` and verify dependency injection, Expo Router patterns, and component separation are flagged correctly with manual review guidance

**Acceptance Criteria**:
- All services follow dependency injection patterns
- Navigation uses Expo Router file-based conventions
- Domain components separated from design system
- State management follows provider/hook patterns

### Tasks

- [ ] T050 [P] [US3] Implement architecture validator in scripts/audit/checkers/architecture-validator.ts
- [ ] T051 [US3] Load CLAUDE.md constitution for architecture pattern reference
- [ ] T052 [US3] Implement dependency injection validation by parsing service class constructors
- [ ] T053 [US3] Check for constructor parameters vs global imports in services/ directory
- [ ] T054 [US3] Create Finding for missing dependency injection with severity "Medium" and requiresManualReview: true
- [ ] T055 [US3] Add reviewGuidance: "Verify if service has external dependencies that should be injected per CLAUDE.md"
- [ ] T056 [US3] Implement Expo Router pattern validation by checking app/ directory structure
- [ ] T057 [US3] Verify file-based routing conventions (_layout.tsx, index.tsx, [id].tsx patterns)
- [ ] T058 [US3] Create Finding for navigation pattern violations with severity "Medium"
- [ ] T059 [US3] Implement component separation check by validating components/ vs services/ imports
- [ ] T060 [US3] Flag components importing directly from services/ (should use hooks) with severity "Medium"
- [ ] T061 [US3] Implement state management pattern validation for Context providers and hooks
- [ ] T062 [US3] Check for proper provider wrapping and hook usage patterns
- [ ] T063 [US3] Integrate architecture validator into run-audit.ts orchestrator
- [ ] T064 [US3] Add architecture findings to audit report with manual review flags

---

## Phase 6: User Story 4 - Error Handling Coverage (P1)

**Story Goal**: Verify API error handling, error boundaries, and promise rejection handling

**Independent Test**: Run `npm run audit -- --checks=error-handling` and verify missing try-catch blocks, unhandled promises, and missing error boundaries are detected

**Acceptance Criteria**:
- All VIS API calls have error handling and cache fallback
- Error boundaries protect critical user flows
- Zero unhandled promise rejections
- Storage failures handled gracefully

### Tasks

- [ ] T065 [P] [US4] Implement error handling validator in scripts/audit/checkers/error-handling-validator.ts
- [ ] T066 [US4] Parse API call sites in services/ directory using TypeScript AST
- [ ] T067 [US4] Check for try-catch blocks around API calls (fetch, axios, VIS API client methods)
- [ ] T068 [US4] Verify .catch() handlers on promise chains
- [ ] T069 [US4] Create Finding for missing error handling with severity "High" and file/line location
- [ ] T070 [US4] Implement error boundary detection by scanning for ErrorBoundary components in app/
- [ ] T071 [US4] Check that critical screens (_layout.tsx, index.tsx) have error boundary wrappers
- [ ] T072 [US4] Create Finding for missing error boundaries with severity "Medium"
- [ ] T073 [US4] Implement unhandled promise rejection detection by scanning for async functions without try-catch
- [ ] T074 [US4] Flag async functions without error handling with severity "High"
- [ ] T075 [US4] Integrate error handling validator into run-audit.ts orchestrator
- [ ] T076 [US4] Add error handling findings to audit report

---

## Phase 7: User Story 5 - Performance Benchmarking (P2)

**Story Goal**: Validate cache configuration and polling intervals match documented targets

**Independent Test**: Run `npm run audit -- --checks=performance` and verify cache TTL configs and polling intervals are validated against spec targets

**Acceptance Criteria**:
- Cache TTL configurations match spec (5s live, 15s dynamic, 120s semi-static, 24h static)
- Polling intervals correct (5s running, 60s scheduled, off finished)
- Manual review flags for runtime metrics

### Tasks

- [ ] T077 [P] [US5] Implement performance validator in scripts/audit/checkers/performance-validator.ts
- [ ] T078 [US5] Parse CacheService.ts to extract TTL configuration constants
- [ ] T079 [US5] Validate liveTTL === 5000ms per spec clarifications
- [ ] T080 [US5] Validate dynamicTTL === 15000ms per spec
- [ ] T081 [US5] Create Finding for incorrect TTL values with severity "Medium"
- [ ] T082 [US5] Parse PollingConfigurationManager.ts to extract polling interval configs
- [ ] T083 [US5] Validate running match interval === 5000ms (5s)
- [ ] T084 [US5] Validate scheduled match interval === 60000ms (60s)
- [ ] T085 [US5] Create Finding for incorrect polling intervals with severity "Medium"
- [ ] T086 [US5] Add manual review flags for runtime performance (cache hit rate, load times) with reviewGuidance
- [ ] T087 [US5] Integrate performance validator into run-audit.ts orchestrator
- [ ] T088 [US5] Add performance findings to audit report

---

## Phase 8: User Story 6 - Data Flow Integrity (P2)

**Story Goal**: Validate multi-level cache flow, subscription cleanup, and sync operations

**Independent Test**: Run `npm run audit -- --checks=data-flow` and verify cache layer transitions, subscription cleanup patterns, and sync queue ordering are validated

**Acceptance Criteria**:
- Data flows correctly through Memory → MMKV → API
- Subscription services clean up on unmount
- Sync operations execute in correct order

### Tasks

- [ ] T089 [P] [US6] Implement data flow validator in scripts/audit/checkers/data-flow-validator.ts
- [ ] T090 [US6] Validate cache service implements three-level hierarchy (Memory, MMKV, API) per architecture
- [ ] T091 [US6] Check for proper cache.get() fallback logic (L1 miss → L2 → L3)
- [ ] T092 [US6] Create Finding for missing cache level with severity "Medium"
- [ ] T093 [US6] Scan subscription services for useEffect cleanup return functions
- [ ] T094 [US6] Flag missing cleanup in real-time subscription hooks with severity "Medium"
- [ ] T095 [US6] Validate SyncManager.ts queue ordering logic for offline-to-online transitions
- [ ] T096 [US6] Integrate data flow validator into run-audit.ts orchestrator
- [ ] T097 [US6] Add data flow findings to audit report

---

## Phase 9: User Story 7 - Build & Deployment Verification (P2)

**Story Goal**: Verify production builds succeed and environment variables are documented

**Independent Test**: Run `npm run audit -- --checks=build` and verify build execution, env var documentation, and deployment checklist presence

**Acceptance Criteria**:
- Web build completes successfully
- Native build configuration has no errors
- All required environment variables documented in .env.example
- Deployment checklist exists

### Tasks

- [ ] T098 [P] [US7] Implement build validator in scripts/audit/checkers/build-validator.ts
- [ ] T099 [US7] Execute production web build command (npx expo export:web) and capture exit code
- [ ] T100 [US7] Create Finding for build failure with severity "Critical" and build error output
- [ ] T101 [US7] Verify .env.example exists and contains required variables (EXPO_PUBLIC_SENTRY_DSN, EXPO_PUBLIC_MMKV_KEY)
- [ ] T102 [US7] Scan codebase for process.env usage and cross-reference with .env.example
- [ ] T103 [US7] Create Finding for undocumented environment variables with severity "Medium"
- [ ] T104 [US7] Check for deployment checklist in docs/ or .github/ directory
- [ ] T105 [US7] Create Finding for missing deployment checklist with severity "Low"
- [ ] T106 [US7] Integrate build validator into run-audit.ts orchestrator (runs last due to build time)
- [ ] T107 [US7] Add build findings to audit report

---

## Phase 10: Polish & Cross-Cutting Concerns

**Goal**: CI/CD integration, documentation, comprehensive testing, and final refinements

**Independent Test**: CI/CD pipeline runs audit successfully, all documentation is complete, audit executes end-to-end with all checkers

### Tasks

- [ ] T108 Create GitHub Actions workflow in .github/workflows/production-audit.yml per quickstart.md
- [ ] T109 Configure workflow to run on push to master/development and pull requests
- [ ] T110 Add audit report upload as artifact in CI workflow
- [ ] T111 Add PR comment with audit results using github-script action
- [ ] T112 Update CLAUDE.md with audit tooling documentation section
- [ ] T113 Add audit usage instructions to README.md (link to quickstart.md)
- [ ] T114 Create .env.example if not exists and document EXPO_PUBLIC_SENTRY_DSN, EXPO_PUBLIC_MMKV_KEY
- [ ] T115 Test end-to-end audit execution with all checkers enabled
- [ ] T116 Verify JSON report validates against audit-report.schema.json
- [ ] T117 Verify Markdown report renders correctly with all severity sections
- [ ] T118 Test audit history persistence across multiple runs
- [ ] T119 Verify trend analysis shows correct new/resolved findings
- [ ] T120 Test exit code behavior (0 for pass, 1 for Critical/High findings)
- [ ] T121 Test parallel checker execution performance (<15 min total)
- [ ] T122 Test graceful failure when individual checker crashes
- [ ] T123 Verify credential sanitization in reports (no actual secrets displayed)
- [ ] T124 Test manual review flags appear correctly for subjective findings
- [ ] T125 Document audit configuration options in quickstart.md
- [ ] T126 Create troubleshooting section in quickstart.md with common issues

---

## Parallel Execution Examples

### Phase 2 (Foundational)
**Can run in parallel**:
- T014 (JSON reporter) || T015 (Markdown reporter) || T016 (Console reporter)

**Must run sequentially**:
- T011-T013 (tracking infrastructure) → T017-T020 (orchestrator setup)

### Phase 3 (User Story 1)
**Can run in parallel**:
- T021 (TypeScript checker) || T022 (ESLint checker) || T023 (Complexity checker)

**Must run sequentially**:
- T021-T029 (checker implementations) → T030-T035 (integration and reporting)

### User Stories (Phases 3-9)
**Can run in parallel** (different developers/branches):
- US1 (Phase 3) || US2 (Phase 4) || US3 (Phase 5) || US4 (Phase 6)
- US5 (Phase 7) || US6 (Phase 8) || US7 (Phase 9)

All user stories can be developed concurrently after Foundational phase completes.

### Phase 10 (Polish)
**Can run in parallel**:
- T108-T111 (CI/CD setup) || T112-T114 (Documentation) || T115-T126 (Testing)

---

## Testing Strategy

### Manual Testing Checklist

Since this is an audit/verification tool, testing focuses on validation accuracy:

**Per User Story**:
1. Create test fixtures with known issues (e.g., file with complexity >15, hardcoded API key)
2. Run audit with only that user story's checkers enabled
3. Verify findings are detected with correct severity
4. Verify report output is accurate and actionable

**End-to-End**:
1. Run full audit on actual BeachRef codebase
2. Verify all 7 user stories execute successfully
3. Check report completeness (all checkers ran, findings categorized)
4. Verify exit code matches findings (0 if no Critical/High, 1 otherwise)

**CI/CD Integration**:
1. Push commit to feature branch
2. Verify GitHub Actions workflow triggers
3. Check audit runs in CI and produces artifacts
4. Verify PR comment appears with results

### Acceptance Testing

Each user story has independent acceptance criteria defined in spec.md. After completing tasks for a user story:

1. Execute the specific checker(s)
2. Verify all acceptance scenarios pass
3. Generate report and confirm findings match expectations
4. Mark user story as complete

---

## Task Completion Summary

**Total Tasks**: 126
- Setup (Phase 1): 10 tasks
- Foundational (Phase 2): 10 tasks
- US1 - Code Quality (Phase 3): 15 tasks
- US2 - Security (Phase 4): 14 tasks
- US3 - Architecture (Phase 5): 15 tasks
- US4 - Error Handling (Phase 6): 12 tasks
- US5 - Performance (Phase 7): 12 tasks
- US6 - Data Flow (Phase 8): 9 tasks
- US7 - Build (Phase 9): 10 tasks
- Polish (Phase 10): 19 tasks

**Parallel Opportunities**: 35+ tasks can run in parallel (marked with [P])
**User Story Independence**: All 7 user stories can be developed simultaneously after Phase 2

**Estimated Timeline**:
- With sequential execution: ~10-12 days
- With parallelization (2-3 developers): ~5-7 days
- MVP only (US1): ~2-3 days

**Format Validation**: ✅ All 126 tasks follow strict checklist format with checkboxes, task IDs, story labels, and file paths
