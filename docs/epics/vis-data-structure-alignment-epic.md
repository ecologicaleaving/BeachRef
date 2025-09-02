# VIS Data Structure Alignment - Brownfield Enhancement

## Epic Goal

Restructure BeachRef data interfaces to align with official VIS API specifications, ensuring type safety and VIS compliance while maintaining all current functionality without breaking changes.

## Epic Description

### Existing System Context

- **Current relevant functionality**: BeachRef processes tournament and match data from VIS API through fragmented interfaces (`BeachMatch`, `BeachLiveMatch`, `BeachMatchCore`, API types)
- **Technology stack**: React Native 0.79.5 + TypeScript, Expo Router, VIS API integration via `visApi.ts`, multi-layer caching system
- **Integration points**: `VisResponseParser` for API responses, cache services for data persistence, `MatchDurationFormatter` for duration display, match list components for UI

### Enhancement Details

- **What's being added/changed**: 
  - Replace string types with proper numeric types for VIS fields (`No`, `MatchPointsA/B`, etc.)
  - Align field names with VIS schema (`TeamAFederationCode` vs `TeamACountryCode`)
  - Add missing required fields like `Format` enum
  - Consolidate 4 fragmented match interfaces into unified VIS-compliant structure
  - Update duration system to use VIS seconds-based format instead of "mm:ss" parsing

- **How it integrates**: 
  - New `VisCompliantMatch` interface becomes single source of truth
  - Gradual migration with compatibility layer to prevent breaking changes
  - Updated parsers maintain existing API integration while improving type safety
  - Existing cache and UI layers adapt to new types transparently

- **Success criteria**: 
  - Zero type conversion errors in production
  - All match data uses proper VIS numeric types
  - Single unified interface replaces current fragmentation
  - 100% existing functionality preserved
  - Field names match VIS schema exactly

## Stories

1. **Story 1: Create VIS-Compliant Foundation Types**
   - Create new `VisCompliantMatch` interface with proper numeric types (`No: number`, `MatchPointsA: number`, etc.)
   - Add required `BeachMatchFormat` enum and missing required fields
   - Implement field name corrections (`TeamAFederationCode` instead of `TeamACountryCode`)
   - Establish compatibility layer for gradual migration

2. **Story 2: Migrate Core Services to VIS Types**
   - Update `VisResponseParser` to convert VIS string responses to proper numeric types
   - Replace `MatchDurationFormatter` string parsing with VIS seconds-based `VisDurationParser`
   - Update cache services (`CacheService`, `TournamentStorageService`) to store VIS-compliant data
   - Ensure existing API calls (`GetEventList`, `GetBeachMatchList`) work with new types

3. **Story 3: Consolidate Interface Architecture**
   - Deprecate fragmented interfaces (`BeachMatch`, `BeachLiveMatch`, `BeachMatchCore`, API types)
   - Update all service imports and component props to use unified `VisCompliantMatch`
   - Update match display components (`MatchList`, `MatchCard`) to work with new data structure
   - Remove legacy interfaces and update all import statements

## Compatibility Requirements

- ✅ **Existing APIs remain unchanged**: VIS API integration through `visApi.ts` continues working identically
- ✅ **Database schema changes are backward compatible**: LocalStorage data auto-migrates or remains compatible
- ✅ **UI changes follow existing patterns**: All match display components maintain identical visual behavior
- ✅ **Performance impact is minimal**: New types improve performance by reducing conversion overhead

## Risk Mitigation

- **Primary Risk**: Breaking existing match display functionality during type migration
- **Mitigation**: Implement gradual migration with compatibility layer, comprehensive testing of existing UI flows
- **Rollback Plan**: Revert to legacy interfaces, restore original parser logic, rollback cache service changes

## Definition of Done

- ✅ All stories completed with acceptance criteria met
- ✅ Existing functionality verified through testing (tournament selection, match lists, duration display)
- ✅ Integration points working correctly (VIS API calls, cache operations, UI rendering)
- ✅ Documentation updated appropriately (type definitions, service layer changes)
- ✅ No regression in existing features (referee dashboard, match monitoring, tournament details)

---

## Validation Checklist

### Scope Validation
- ✅ Epic can be completed in 3 stories maximum
- ✅ No architectural documentation required - follows existing service patterns
- ✅ Enhancement follows existing patterns (service layer updates, type improvements)
- ✅ Integration complexity is manageable - parser updates and type migrations

### Risk Assessment
- ✅ Risk to existing system is low - gradual migration with compatibility layer
- ✅ Rollback plan is feasible - revert parser and type changes
- ✅ Testing approach covers existing functionality - UI flow testing, API integration verification
- ✅ Team has sufficient knowledge of integration points - VIS API, cache services, UI components

### Completeness Check
- ✅ Epic goal is clear and achievable - VIS compliance with zero breaking changes
- ✅ Stories are properly scoped - foundation, services, consolidation
- ✅ Success criteria are measurable - type safety metrics, functionality verification
- ✅ Dependencies identified - VIS API responses, cache layer, UI components

---

## Story Manager Handoff

**Story Manager Handoff:**

"Please develop detailed user stories for this brownfield epic. Key considerations:

- This is an enhancement to an existing system running React Native 0.79.5 + TypeScript with Expo Router and VIS API integration
- Integration points: `VisResponseParser` for API data transformation, cache services (`CacheService`, `TournamentStorageService`), match display components (`MatchList`, `MatchCard`), duration formatting utilities
- Existing patterns to follow: Service layer architecture with caching, gradual type migrations with compatibility layers, component prop interfaces
- Critical compatibility requirements: Zero breaking changes to existing tournament selection, match display, and referee dashboard functionality
- Each story must include verification that existing functionality remains intact, particularly VIS API integration and match data display

The epic should maintain system integrity while delivering VIS-compliant data structures with improved type safety."

---

**Epic Status**: Ready for Story Development  
**Estimated Timeline**: 3-4 weeks  
**Risk Level**: Low (brownfield enhancement with compatibility focus)  
**Dependencies**: VIS API integration, existing cache layer, match display components