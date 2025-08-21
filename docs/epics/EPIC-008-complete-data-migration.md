# EPIC-008: Complete Data Architecture Migration

**Status**: Draft
**Priority**: Critical
**Epic Type**: Strategic Technical Migration
**Estimated Timeline**: 2-3 weeks
**Risk Level**: Medium-High (Bundle performance regression risk)

## Epic Statement

As a **BeachRef development team**, we want to **complete the migration from legacy VisApiService to the new VisApiClient and TournamentCore data model** so that **we achieve the 30% bundle size reduction target, eliminate dual system bundling, and deliver stable production performance with the new data architecture**.

## Background & Context

**Current State Analysis (Based on Epic 7 Story 7.4):**
- ✅ **Critical Foundation Complete**: CacheService migrated, legacy files deleted
- ⚠️ **Bundle Regression Issue**: 4.78MB vs 2.71MB target (76% over target)
- ⚠️ **30 Files Remaining**: Still importing legacy VisApiService patterns
- ✅ **Architecture Success**: Bundle compilation improved from 64% to 99.8%

**Root Cause Identified:**
Dual system bundling where both legacy VisApiService (2000+ lines) and new VisApiClient are included in the webpack bundle, preventing the targeted 30% bundle size reduction.

**Architect Assessment (Winston):**
The migration architecture is sound, with clear phased approach to eliminate dual bundling through systematic service layer migration, followed by business logic and test infrastructure updates.

## Business Value

**Performance Optimization:**
- Achieve Epic 007's 30% bundle size reduction target
- Eliminate 40% memory usage through immutable data patterns
- Improve application startup and runtime performance

**Architectural Benefits:**
- Complete migration to type-safe TournamentCore interface
- Unified VisApiClient with optimized field selection
- Elimination of legacy technical debt (2000+ lines of fallback logic)

**Developer Experience:**
- Cleaner, more maintainable codebase
- Better TypeScript support with immutable patterns
- Reduced complexity in API interaction patterns

## Epic Scope

### In Scope
- Complete migration of all 30 remaining files from legacy VisApiService to VisApiClient
- Service layer migration (5 critical services)
- Business logic layer migration (8 hook and screen files)
- Test infrastructure migration (15+ test files)
- Bundle size optimization and validation
- Production deployment with performance monitoring

### Out of Scope
- New feature development during migration
- API endpoint changes or enhancements
- UI/UX modifications beyond necessary type updates
- Database schema changes

## Success Criteria

### SC1: Bundle Size Target Achievement
**Given** all legacy code is migrated and removed
**When** I analyze the production bundle
**Then** bundle size is reduced to ≤2.71MB (30% reduction from 3.87MB baseline)
**And** no dual system bundling exists
**And** tree-shaking effectively removes unused code

### SC2: Complete Legacy Elimination
**Given** the migration is complete
**When** I audit the codebase
**Then** zero files import from legacy VisApiService patterns
**And** all components use TournamentCore interface exclusively
**And** all services use VisApiClient exclusively

### SC3: Production Performance Stability
**Given** the migration is deployed to production
**When** I monitor application performance
**Then** memory usage is reduced by ≥40% from baseline
**And** application startup time improves
**And** no regression in user experience metrics

### SC4: Test Coverage Maintenance
**Given** all code is migrated
**When** I run the test suite
**Then** all tests pass with new architecture
**And** test coverage remains ≥75%
**And** critical user workflows are verified

## Implementation Strategy

### Phase 1: Critical Service Layer (2-3 days) 🎯
**Priority**: IMMEDIATE - Eliminates dual bundling
**Files (5)**:
- `services/TournamentOperationsService.ts`
- `services/MatchResultsService.ts`
- `services/RefereeAssignmentsService.ts`
- `services/MatchProcessingService.ts`
- `services/RealtimeFallbackService.ts`

**Expected Impact**: ~70% of bundle size regression eliminated

### Phase 2: Business Logic Layer (3-4 days) 🔄
**Priority**: HIGH - Completes functional migration
**Files (8)**:
- `hooks/useRefereeManagement.ts`
- `hooks/useRealtimeData.ts`
- `hooks/useCourtManagement.ts`
- `screens/TournamentDetailScreen.tsx`
- `screens/ScheduleResultsScreen.tsx`
- `screens/RefereeSettingsScreen.tsx`
- `screens/CourtMonitorScreen.tsx`
- `screens/RefereeMonitorScreen.tsx`

**Expected Impact**: Complete functional migration, remaining bundle optimization

### Phase 3: Test Infrastructure (2-3 days) 🧪
**Priority**: MEDIUM - Ensures quality and maintainability
**Files (15+)**:
- `services/__tests__/*.test.ts`
- `__tests__/hooks/*.test.ts`
- `components/__tests__/*.test.tsx`

**Expected Impact**: Test coverage maintenance, quality assurance

## Risk Assessment & Mitigation

### High Risk: Bundle Size Regression
**Risk**: Migration doesn't achieve 30% reduction target
**Likelihood**: Medium
**Impact**: High
**Mitigation**: 
- Phase 1 specifically targets dual bundling elimination
- Bundle analysis after each phase
- Rollback capability per phase

### Medium Risk: Production Stability
**Risk**: Migration introduces runtime errors
**Likelihood**: Low
**Impact**: High
**Mitigation**:
- Comprehensive testing after each phase
- Staging environment validation
- Feature flag rollback capability
- Incremental deployment approach

### Medium Risk: Development Timeline
**Risk**: Migration takes longer than estimated
**Likelihood**: Medium
**Impact**: Medium
**Mitigation**:
- Clear phase priorities focusing on highest impact first
- Parallel development where possible
- Daily progress monitoring

## Technical Constraints

**Zero Regression Requirement**: No existing functionality can be broken
**Bundle Size Target**: Must achieve ≤2.71MB bundle size
**Performance Target**: 40% memory usage reduction
**TypeScript Compliance**: All code must compile without errors
**Test Coverage**: Maintain ≥75% test coverage throughout migration

## Dependencies

**Prerequisite Work (Complete):**
- ✅ Epic 007 foundation work (TournamentCore interface, VisApiClient, repository pattern)
- ✅ CacheService migration (critical service already completed)
- ✅ Legacy file removal (types/tournament.ts, services/visApi.ts, etc.)

**Concurrent Work**:
- Production monitoring system (already implemented)
- Memory profiling infrastructure (already implemented)

**Follow-up Work**:
- Bundle optimization fine-tuning (if needed)
- Performance baseline establishment
- Documentation updates

## Definition of Done

- [ ] All 30 files migrated from legacy VisApiService to VisApiClient
- [ ] Bundle size reduced to ≤2.71MB (30% reduction achieved)
- [ ] Memory usage reduced by ≥40% from baseline
- [ ] All tests pass with ≥75% coverage
- [ ] Production deployment successful with monitoring active
- [ ] No regression in existing functionality
- [ ] Documentation updated to reflect new architecture
- [ ] Epic 007 success criteria fully achieved

## Rollback Plan

**Phase-Level Rollback**: Each phase creates a git commit allowing granular rollback
**Feature Flag System**: Critical components can be rolled back via feature flags
**Staging Validation**: All phases validated in staging before production
**Production Monitoring**: Real-time monitoring with automatic rollback triggers

## Monitoring & Success Metrics

**Bundle Size**: Real-time webpack bundle analysis
**Memory Usage**: Production memory profiling with alerts
**Performance**: Application startup time and runtime metrics
**Error Rates**: Production error monitoring with alerting
**User Experience**: Core user workflow performance tracking

---

## Story Breakdown

### Story 8.1: Critical Service Layer Migration
**Epic**: EPIC-008
**Priority**: Critical
**Estimate**: 3 story points

Migrate the 5 critical services that are causing dual bundling to VisApiClient and TournamentCore patterns.

### Story 8.2: Business Logic Layer Migration  
**Epic**: EPIC-008
**Priority**: High
**Estimate**: 5 story points

Migrate hooks and screen components to complete the functional migration to new architecture.

### Story 8.3: Test Infrastructure Migration
**Epic**: EPIC-008
**Priority**: Medium
**Estimate**: 3 story points

Update all test files to use new architecture patterns and maintain test coverage.

### Story 8.4: Bundle Optimization Validation
**Epic**: EPIC-008
**Priority**: High
**Estimate**: 2 story points

Validate bundle size reduction achievement and optimize final bundle configuration.

---

**Created**: 2025-08-21
**Author**: Sarah (Product Owner)
**Architect Consultation**: Winston (System Architect)
**Based On**: Epic 007 Story 7.4 Analysis and Winston's Migration Architecture Plan