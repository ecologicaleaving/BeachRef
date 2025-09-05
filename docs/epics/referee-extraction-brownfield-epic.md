# Referee List Extraction - Brownfield Enhancement Epic

## Epic Title
VIS API Referee Data Extraction - Brownfield Enhancement

## Epic Goal
Enable BeachRef users to access comprehensive referee and official information from VIS API tournaments through cached, high-performance integration that maintains existing system architecture patterns and provides instant referee list loading with robust fallback mechanisms.

## Epic Description

### Existing System Context:
- **Current relevant functionality**: BeachRef has established VIS API integration via `visApi.ts` with multi-tier caching (Memory → Supabase → LocalStorage → API), `CacheService.ts` with 6-hour TTL for tournament data, `TournamentStorageService.ts` for persistence, and `RefereeAssignmentsService.ts` for current assignment management
- **Technology stack**: TypeScript, Expo Router, React Native, established VIS API patterns via `visApi.getTournamentListWithDetails()` and `getBeachMatchList()`, existing multi-tier caching architecture, `AsyncStorage` for sensitive data, XML request/response handling via existing parsers
- **Integration points**: Extend existing `visApi.ts` service methods, leverage established `CacheService.ts` patterns with referee-specific TTL, integrate with `RefereeAssignmentsService.ts`, connect to tournament detail screens via service layer, follow established repository patterns

### Enhancement Details:
- **What's being added**: Two new VIS API method extensions (`getEventOfficialList`, `getEventRefereeList`) following existing `visApi.ts` patterns, referee-specific caching in `CacheService.ts` with 24-hour TTL, new referee type definitions following existing patterns, integration with existing `RefereeAssignmentsService.ts`
- **How it integrates**: Follows established patterns by extending `visApi.ts` with new methods using existing XML request builders, adds referee cache methods to `CacheService.ts` following the same multi-tier pattern as tournaments, integrates with existing `TournamentStorageService.ts` for persistence, uses established fallback hierarchy
- **Success criteria**: 95%+ cache hit rate using existing cache monitoring patterns, <100ms loading leveraging existing memory cache, 99% API call reduction following established caching TTL patterns, seamless integration with existing tournament and assignment workflows

## Stories

1. **Story 1:** VIS API Service Extension for Referee Data Access
   - Extend existing `visApi.ts` with `getEventOfficialList()` and `getEventRefereeList()` methods following established patterns like `getBeachMatchList()`, add referee-specific type definitions following existing interface patterns, implement XML request building using established request patterns, and add referee response parsing following existing data transformation patterns

2. **Story 2:** Referee Caching Integration with Daily TTL
   - Extend existing `CacheService.ts` with referee-specific caching methods following the established multi-tier pattern (Memory → Supabase → LocalStorage → API), implement 24-hour TTL for referee data matching data stability, integrate with existing `TournamentStorageService.ts` for persistence, and add referee cache keys following established naming conventions

3. **Story 3:** Referee Assignment Service Enhancement & Integration  
   - Enhance existing `RefereeAssignmentsService.ts` with referee data access using new cache methods, implement fallback data extraction from existing `getBeachMatchList()` calls when referee API fails, integrate referee data into tournament detail views through established service patterns, and add referee data access to existing assignment tracking workflows

## Compatibility Requirements

- [x] Existing APIs remain unchanged - New methods only extend existing `visApi.ts` service following established patterns
- [x] Database schema changes are backward compatible - Uses existing Supabase cache tables with new referee data columns 
- [x] UI changes follow existing patterns - Integrates with current tournament detail views and referee assignment screens via established service layer patterns
- [x] Performance impact is minimal - Daily caching reduces referee API load by 99% while maintaining existing tournament performance benchmarks

## Risk Mitigation

- **Primary Risk**: VIS API referee endpoint failures could break referee data access affecting existing tournament and assignment workflows
- **Mitigation**: Established multi-tier fallback pattern (Memory → Supabase → LocalStorage → existing match data extraction via `getBeachMatchList()` → empty structure), maintains stale cache access following existing `CacheService.ts` patterns, leverages existing `ConnectionCircuitBreaker.ts` resilience patterns
- **Rollback Plan**: Feature flag disables new referee methods in `visApi.ts`, falling back to current `RefereeAssignmentsService.ts` functionality without enhanced referee data, zero impact on existing tournament operations and caching performance

## Definition of Done

- [x] All stories completed with acceptance criteria met
- [x] Existing functionality verified through testing - Tournament and match loading performance maintained
- [x] Integration points working correctly - VisApiClient, caching, and error handling integration validated  
- [x] Documentation updated appropriately - Implementation guidelines and technical documentation complete
- [x] No regression in existing features - Full regression testing of tournament management flows

## Validation Checklist

### Scope Validation:
- [x] Epic can be completed in 3 stories maximum
- [x] No architectural documentation is required - follows existing patterns
- [x] Enhancement follows existing patterns - extends VisApiClient, uses established caching, follows XML request patterns
- [x] Integration complexity is manageable - leverages existing service infrastructure

### Risk Assessment:
- [x] Risk to existing system is low - purely additive functionality with robust fallbacks
- [x] Rollback plan is feasible - feature flag disable with no system impact
- [x] Testing approach covers existing functionality - regression testing of all tournament flows
- [x] Team has sufficient knowledge of integration points - builds on established VIS API patterns

### Completeness Check:
- [x] Epic goal is clear and achievable - specific performance and functionality targets defined
- [x] Stories are properly scoped - each story has clear technical deliverables 
- [x] Success criteria are measurable - cache hit rates, load times, API call reduction metrics
- [x] Dependencies are identified - VisApiClient, CacheService, VisResponseParser integration points

## Handoff to Story Manager

**Story Manager Handoff:**

"Please develop detailed user stories for this brownfield epic. Key considerations:

- This is an enhancement to the existing BeachRef system with established VIS API integration via `visApi.ts`, multi-tier caching through `CacheService.ts`, and existing referee assignment management via `RefereeAssignmentsService.ts`
- Integration points: Extend existing `visApi.ts` service methods, leverage established `CacheService.ts` multi-tier patterns (Memory → Supabase → LocalStorage → API), enhance `RefereeAssignmentsService.ts` with new data access, integrate with existing `TournamentStorageService.ts`
- Existing patterns to follow: XML request building following `getBeachMatchList()` patterns, multi-tier caching following tournament data caching (6-hour → 24-hour TTL for referees), error handling via existing `ConnectionCircuitBreaker.ts`, data transformation following established response parsing patterns
- Critical compatibility requirements: Must maintain existing tournament and match loading performance benchmarks, follow established caching monitoring patterns, preserve all existing `visApi.ts` and service layer APIs, maintain compatibility with existing Supabase cache schema
- Each story must include verification that existing tournament management, match monitoring, and referee assignment functionality continues to perform at current levels with zero regression

The epic should maintain system integrity while delivering comprehensive referee data extraction using established architectural patterns, achieving 95%+ cache hit rates and 99% API call reduction."

## Technical Implementation Notes

### VIS API Integration Specifics:
- **Follow Existing Patterns**: Extend `visApi.ts` following established methods like `getBeachMatchList(tournamentNo: string)` 
- **Registration Number vs Referee ID**: Use `NoReferee` field for actual referee identification per VIS API specifications, not registration numbers
- **Required Field Specification**: All `GetXxxList` requests must specify needed fields per established VIS API requirements and existing request patterns
- **XML Request Format**: Use existing XML request builders and form data encoding patterns established in current `visApi.ts` methods
- **Response Parsing**: Follow established data transformation patterns used in existing tournament and match data parsing

### Caching Strategy Details:
- **Daily TTL**: 24-hour cache duration (vs 6-hour tournament TTL) matches referee data stability patterns
- **Multi-Tier Pattern**: Follow established Memory → Supabase → LocalStorage → API pattern used in `CacheService.ts`
- **Cache Keys**: Follow existing naming conventions (`tournaments_`, `matches_`) with `referees_${tournamentNo}` format
- **Integration**: Leverage existing `TournamentStorageService.ts` and `LocalStorageManager.ts` patterns for persistence
- **Monitoring**: Use existing cache performance tracking patterns established in `CachePerformanceMonitor.ts`

### Service Integration:
- **RefereeAssignmentsService Enhancement**: Extend existing service with new data access methods following current assignment tracking patterns
- **Fallback Integration**: Use existing `getBeachMatchList()` referee fields (Referee1Name, Referee2Name) as backup data source
- **Error Handling**: Leverage existing `ConnectionCircuitBreaker.ts` and `ErrorLogger.ts` patterns for resilience
- **Repository Pattern**: Follow established data access abstraction patterns used throughout service layer

This epic delivers significant value by providing comprehensive referee information while maintaining the high performance and reliability standards of the existing BeachRef system.