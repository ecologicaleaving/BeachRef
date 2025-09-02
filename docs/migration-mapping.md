# Interface Migration Mapping - Story 1.3

## Legacy Interfaces to Deprecate

### 1. BeachMatch (types/match.ts)
**Current Usage**: Legacy string-based interface
**Target**: Replace with VisCompliantMatch
**Migration Priority**: HIGH (most commonly used)

### 2. BeachLiveMatch (types/beach-live.ts)  
**Current Usage**: Real-time match updates with numeric types
**Target**: Replace with VisCompliantMatch
**Migration Priority**: MEDIUM (already has numeric types)

### 3. BeachMatchCore (types/match-v2.ts)
**Current Usage**: Core domain model with computed fields  
**Target**: Replace with VisCompliantMatch
**Migration Priority**: HIGH (domain model)

### 4. API types (types/api-v2.ts)
**Current Usage**: Raw API response interfaces
**Target**: Partial replacement with VisCompliantMatch
**Migration Priority**: LOW (internal API handling)

## Files Requiring Updates

### Components (17 files identified)
- app/ref-mode.tsx
- components/live-score/LiveScoreCard.tsx
- components/live-score/ScoreDisplay.tsx
- components/LiveMatchIndicator.tsx
- components/MatchList/MatchList.tsx
- components/MatchList/MatchListV2.tsx
- components/referee/MatchCard.tsx
- components/tournament/CourtAssignmentIndicator.tsx
- components/tournament/ScheduleChangeIndicator.tsx
- components/TournamentDetail.tsx
- screens/CourtMonitorScreen.tsx
- screens/RefereeMonitorScreen.tsx
- screens/RefereeSettingsScreen.tsx
- screens/ScheduleResultsScreen.tsx
- screens/TournamentDetailScreen.tsx

### Services (10+ files identified)
- services/api/VisApiClient.ts
- services/api/VisApiIntegrationService.ts
- services/CacheService.ts
- services/DataTransformationService.ts
- services/MatchDataTransformer.ts
- repositories/MatchRepository.ts

### Hooks (8 files identified)
- hooks/useCourtManagement.ts
- hooks/useDataTransformation.ts
- hooks/useDateNavigation.ts
- hooks/useRealtimeData.ts
- hooks/useRefereeManagement.ts
- hooks/useTournamentDetailStatus.ts

### Tests (5+ files identified)
- components/__tests__/live-score/LiveScoreCard.test.tsx
- components/__tests__/TournamentDetail.matches.integration.test.tsx
- services/api/__tests__/VisApiClient.beach-live.test.ts
- hooks/__tests__/useLiveScores.test.ts

## Migration Order Strategy

1. **Phase 1**: Add deprecation warnings to legacy interfaces
2. **Phase 2**: Update service layer (least UI impact)
3. **Phase 3**: Update hooks and repositories  
4. **Phase 4**: Update components (most visible changes)
5. **Phase 5**: Update API integration
6. **Phase 6**: Remove legacy interfaces

## Interface Compatibility Matrix

| Interface | VisCompliantMatch Compatible | Conversion Required | Risk Level |
|-----------|---------------------------|-------------------|------------|
| BeachMatch | No (string types) | Yes (convertLegacyToVisCompliant) | High |
| BeachLiveMatch | Partial (already numeric) | Minor | Low |
| BeachMatchCore | No (different structure) | Yes (field mapping) | Medium |
| API types | No (raw responses) | Yes (parsing layer) | Low |