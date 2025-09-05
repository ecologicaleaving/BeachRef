# Story CACHE-1.1: Focus-Aware Polling System

**Epic**: EPIC-CACHE-001 Cache Performance Optimization - Brownfield Enhancement  
**Phase**: Phase 1 - Critical Performance Fixes  
**Story Points**: 3  
**Priority**: Critical  
**Assignee**: TBD  
**Sprint**: TBD  

## User Story

**As a** mobile app user  
**I want** the app to reduce battery consumption when running in the background  
**So that** my device battery lasts longer while still receiving live match updates when I'm actively using the app  

## Background & Context

BeachRef currently implements continuous polling for live match updates regardless of app state (background/foreground) and screen focus. This results in significant battery drain when the app runs in background, violating VIS Cache Guidelines v0.1 requirements for mobile optimization.

The current CacheService.ts (1,600+ LOC) has sophisticated 4-tier cache architecture but lacks AppState integration. The service needs to be enhanced to pause polling when the app is backgrounded or screen loses focus, while maintaining live polling capabilities when users are actively viewing matches.

This story is the first of three stories in EPIC-CACHE-001 that will achieve 30-50% API call reduction and 20-30% battery life improvement through intelligent polling strategies.

## Acceptance Criteria

### App State Management ✅

**AC1: AppState listener integration with CacheService**
- [ ] Add React Native AppState listener to CacheService.initialize() method
- [ ] Track app state changes (active/background/inactive) in private static property
- [ ] Implement adjustPollingForAppState() method that pauses/resumes polling
- [ ] Ensure listener is properly cleaned up on service shutdown

**AC2: Screen focus integration with polling control**
- [ ] Add setScreenFocus(focused: boolean) static method to CacheService
- [ ] Integrate with React Navigation useIsFocused hook at component level
- [ ] Combine screen focus state with app state for polling decisions
- [ ] Pause polling when screen loses focus even if app is active

### Polling Control Logic ✅

**AC3: Intelligent polling pause/resume behavior**
- [ ] Stop all active polling when app goes to background or inactive state
- [ ] Resume polling for live matches only when app returns to foreground AND screen is focused
- [ ] Maintain existing polling intervals for live matches when conditions are met
- [ ] Add shouldPoll(status: string) method combining app state, focus state, and match status

### Performance & Validation ✅

**AC4: Battery usage metrics and validation**
- [ ] Add battery usage tracking to CacheStatsService for background scenarios
- [ ] Implement pauseAllPolling() and resumePolling() methods in CacheService
- [ ] Validate 20-30% battery improvement through device profiling
- [ ] Ensure no degradation in foreground polling performance

**AC5: Backward compatibility maintenance**
- [ ] All existing CacheService method signatures remain unchanged
- [ ] Existing polling logic continues to work when app is active and focused
- [ ] No breaking changes to tournament browsing or match monitoring functionality
- [ ] Graceful degradation if AppState API is unavailable

## Technical Requirements

### Performance Requirements
- 60-80% reduction in background API calls when app is not in active focus
- No performance degradation in foreground polling (maintain <100ms cache responses)
- Battery usage improvement of 20-30% in background scenarios
- Memory overhead <5MB for state tracking

### Quality Requirements  
- Unit test coverage >90% for new AppState and focus handling methods
- Integration tests for app state transition scenarios
- Performance benchmarks for background vs foreground polling
- Error handling for AppState listener failures

### Compatibility Requirements
- React Native 0.79.5 compatibility with AppState API
- No breaking changes to existing CacheService interface
- Backward compatibility with existing polling consumers
- Support for both iOS and Android platforms

## Definition of Done

### Code Quality ✅
- [ ] All code compiles without TypeScript errors
- [ ] Unit tests pass with >90% coverage for new methods
- [ ] Code review completed and approved
- [ ] ESLint checks pass without warnings
- [ ] Performance benchmarks meet 20-30% battery improvement

### Documentation ✅  
- [ ] JSDoc comments added to all new public methods
- [ ] AppState integration documented in architecture notes
- [ ] Performance improvement metrics documented
- [ ] Migration guide for existing polling consumers

### Integration ✅
- [ ] Feature integrates without breaking existing cache functionality
- [ ] Tournament browsing continues to work in all app states
- [ ] Live match monitoring works correctly when app is focused
- [ ] Error handling validated for all state transitions

### Validation ✅
- [ ] All acceptance criteria met with automated tests
- [ ] Manual testing completed on iOS and Android devices
- [ ] Battery profiling completed showing improvement
- [ ] Edge cases tested (rapid app state changes, network issues)

## Dev Notes

### Previous Story Insights
This is the first story in EPIC-CACHE-001. No previous story context available.

### Data Models
No new data models required. Uses existing:
- `TournamentCore` from types/tournament-v2.ts [Source: existing codebase]
- `BeachMatch` from types/match.ts [Source: existing codebase] 
- `CacheConfiguration` from types/cache.ts [Source: existing codebase]

### API Specifications
No API changes required. Enhanced existing internal methods:
- `CacheService.initialize()` - add AppState listener [Source: services/CacheService.ts:27-41]
- New method: `setScreenFocus(focused: boolean)` [Source: architecture/CacheImplementationAnalysis.md#improvement-1]
- New method: `shouldPoll(status: string)` - polling decision logic [Source: architecture/CacheImplementationAnalysis.md#improvement-1]

### Component Specifications
Integration points for screen focus detection:
- useIsFocused from @react-navigation/native [Source: React Navigation v7 integration]
- AppState from react-native [Source: React Native 0.79.5 compatibility]
- CacheService static methods maintain existing interface [Source: services/CacheService.ts:16-22]

### File Locations
Based on existing project structure:
- **Primary**: `services/CacheService.ts` - add AppState integration methods [Source: services/CacheService.ts]
- **Enhanced**: `services/CacheStatsService.ts` - add battery metrics tracking [Source: services/CacheStatsService.ts]
- **Tests**: `services/__tests__/CacheService.test.ts` - add AppState test scenarios [Source: existing test structure]

### Testing Requirements
Based on project testing strategy:
- Unit tests for AppState listener registration/cleanup [Source: comprehensive test coverage requirements]
- Integration tests for state transition scenarios [Source: architecture/CacheImplementationAnalysis.md#testing-strategy]  
- Battery usage validation through device profiling [Source: architecture/CacheImplementationAnalysis.md#performance-targets]
- Mock AppState for unit testing environment [Source: React Native testing patterns]

### Technical Constraints
- React Native 0.79.5 AppState API compatibility [Source: package dependencies]
- TypeScript strict mode compliance [Source: existing codebase standards]
- Existing 4-tier cache architecture must remain operational [Source: architecture/CacheImplementationAnalysis.md#architecture-overview]
- No breaking changes to existing service interface [Source: compatibility requirements]

## Tasks / Subtasks

### Task 1: AppState Integration (AC: 1, 3)
1. Add React Native AppState import to CacheService.ts
2. Add private static appState property tracking current state  
3. Implement AppState.addEventListener in initialize() method
4. Create adjustPollingForAppState() private method
5. Add cleanup logic for AppState listener

### Task 2: Screen Focus Integration (AC: 2, 3)  
1. Add setScreenFocus(focused: boolean) static method to CacheService
2. Add private static screenFocused boolean property
3. Update shouldPoll() logic to check both app state and screen focus
4. Document integration pattern for useIsFocused hook

### Task 3: Polling Control Logic (AC: 3, 4)
1. Implement pauseAllPolling() method to stop active intervals
2. Implement resumePolling() method for selective restart
3. Create shouldPoll(status: string) method with combined logic
4. Update existing polling methods to respect new shouldPoll checks

### Task 4: Battery Metrics & Validation (AC: 4, 5)
1. Extend CacheStatsService with battery usage tracking methods
2. Add background vs foreground polling counters
3. Implement device profiling hooks for battery validation
4. Create performance benchmark tests

### Task 5: Testing & Documentation (All ACs)
1. Write unit tests for AppState listener lifecycle
2. Create integration tests for app state transitions  
3. Add JSDoc documentation for all new methods
4. Update architecture documentation with AppState integration
5. Create performance validation test suite

## Implementation Notes

### Key Files to Create/Modify
```
services/CacheService.ts          - Add AppState integration (primary changes)
services/CacheStatsService.ts     - Add battery usage metrics  
services/__tests__/CacheService.test.ts - Add AppState test coverage
```

### Dependencies
- React Native AppState API (built-in)
- @react-navigation/native useIsFocused hook (existing)
- Existing MemoryCacheManager and LocalStorageManager services
- CacheStatsService for metrics collection

### Risk Mitigation
**Primary Risk**: AppState listener may not fire reliably on all devices or React Native versions
**Mitigation**: Add timeout-based fallback polling, comprehensive error handling, feature flag for disabling if issues occur

## Estimated Effort: 3 Story Points

**Breakdown:**
- AppState integration: 1 point
- Focus management logic: 1 point  
- Testing and validation: 1 point

**Timeline:** 2-3 days for experienced React Native developer

## Dependencies

### Upstream Dependencies
- None - this is the first story in EPIC-CACHE-001

### Downstream Dependencies  
- Story CACHE-1.2: API Field Optimization System (benefits from reduced background calls)
- Story CACHE-1.3: Adaptive Polling Intervals (builds on focus-aware foundation)

## Success Metrics

### Immediate Success Indicators
- Background API calls reduced by >60% when app not in focus
- All existing functionality continues working without regression
- AppState transitions handled gracefully without errors

### Quality Indicators
- Unit test coverage >90% for new AppState methods
- No memory leaks from AppState listener registration
- Clean TypeScript compilation with existing strict settings

### Integration Indicators
- Tournament browsing works in all app states
- Live match updates resume correctly when app returns to focus
- Performance metrics show no degradation in foreground scenarios

---

## QA Results

### QA Agent
[Agent name and role]

### Review Date
[YYYY-MM-DD]

### Review Summary
**[APPROVED/NEEDS WORK/REJECTED]** [Status symbol] - [Brief summary]

### Detailed Assessment

#### Code Quality Analysis ✅
- [Quality assessment details]

#### Test Coverage Validation ✅
- [Test coverage analysis]

#### Architecture Review ✅
- [Architecture assessment]

#### Performance Analysis ✅
- [Performance validation]

#### Integration Assessment ✅
- [Integration testing results]

### Key Strengths Identified
1. [Strength 1]
2. [Strength 2]
3. [Additional strengths]

### Risk Assessment ✅
- [Risk level assessment]
- [Risk mitigation validation]

### Recommendations
1. [Recommendation 1]
2. [Recommendation 2]

### Final Verdict
**[APPROVAL STATUS]** ✅

[Summary paragraph of overall assessment]

**Story CACHE-1.1 Status**: [COMPLETED/IN PROGRESS/BLOCKED] ✅

---

## Dev Agent Record

### Agent Model Used
[Claude model used]

### Completion Notes List
- [Key completion note 1]
- [Key completion note 2]
- [Additional implementation notes]

### File List
**Created Files:**
- [File 1] - [Description] ([X] lines)
- [File 2] - [Description] ([Y] lines)

**Modified Files:**
- [File 1] - [Description of changes] ([X] lines modified)

**Total Implementation:** [X] lines of production code + [Y] lines of tests

### Debug Log References
- [Debug note 1]
- [Debug note 2]
- [Additional debug information]

---

**Created**: 2025-09-04  
**Last Updated**: 2025-09-04  
**Status**: Draft ✅  
**QA Status**: [QA_STATUS] ✅  
**Next Story**: CACHE-1.2 - API Field Optimization System