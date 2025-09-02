# Epic 1: Live Score Display - Brownfield Enhancement (Phase 1)

## Epic Goal
Enable real-time live score display in tournament detail screens by integrating FIVB VIS SDK GetBeachLiveRequest API, providing referees with immediate access to match status, scores, and key indicators without manual refresh.

## Epic Description

**Existing System Context:**
- Current relevant functionality: Tournament detail screens display static match information from VIS API
- Technology stack: React Native, Expo Router, TypeScript, existing VIS API client with caching
- Integration points: `services/api/VisApiClient.ts`, tournament detail screen components, cache management services

**Enhancement Details:**
- What's being added: Real-time live score display using GetBeachLiveRequest API integration
- How it integrates: Extends existing VIS API client with live score endpoints, adds polling service with version-based optimization
- Success criteria: Sub-second score updates, 95% bandwidth reduction via versioning, seamless integration with existing tournament screens

## Stories

1. **Story 1:** [Extend VIS API Client for Live Score Retrieval](../stories/live-score/live-score-epic-01-story-01.md) - Add GetBeachLiveRequest integration to existing VisApiClient.ts with version-based polling and error handling
2. **Story 2:** [Create Live Score Display Components](../stories/live-score/live-score-epic-01-story-02.md) - Build reusable UI components for real-time score display with match status indicators and serving information  
3. **Story 3:** [Integrate Live Score Service with Tournament Details](../stories/live-score/live-score-epic-01-story-03.md) - Connect live score polling service to tournament detail screens with automatic updates and loading states

## Compatibility Requirements

- ✅ Existing APIs remain unchanged (extends VisApiClient.ts without breaking changes)
- ✅ Database schema changes are backward compatible (no database changes required)
- ✅ UI changes follow existing patterns (uses established component architecture)
- ✅ Performance impact is minimal (optimized polling with version control)

## Risk Mitigation

- **Primary Risk:** Increased API calls could impact performance and data usage
- **Mitigation:** Implement version-based polling and circuit breaker pattern from existing architecture
- **Rollback Plan:** Feature flag to disable live score polling, fallback to existing static display

## Definition of Done

- ✅ All stories completed with acceptance criteria met
- ✅ Existing functionality verified through testing (tournament list, match details remain unchanged)
- ✅ Integration points working correctly (VIS API client maintains existing functionality)
- ✅ Documentation updated appropriately (API client extensions documented)
- ✅ No regression in existing features (full regression test suite passes)

## Technical Requirements

### API Integration
- Extend existing VIS API client (`services/api/VisApiClient.ts`)
- Add live score specific endpoints and request builders
- Implement version tracking and caching strategy

### UI Components
- Create live score display components
- Add match status indicators
- Implement real-time update animations
- Design statistics visualization

### State Management
- Extend assignment status management for live scores
- Implement real-time subscription service
- Add live score caching with version control

### Error Handling
- Implement circuit breaker for live score requests
- Add fallback strategies for connection failures
- Handle role conflicts and access denied scenarios

## Success Metrics

### User Engagement
- Increased time spent on tournament details screen
- Reduced manual refresh actions
- Higher user satisfaction scores for live features

### Technical Performance
- Sub-second update latency for live scores
- <95% bandwidth reduction with version-based polling
- Zero data conflicts with multi-client architecture

### Business Value
- Enhanced professional referee tool positioning
- Competitive advantage in beach volleyball app market
- Foundation for future advanced features (statistics, analytics)

## Implementation Timeline

**Duration**: 2-3 weeks
**Team Size**: 2-3 developers
**Prerequisites**: None (builds on existing VIS API integration)

## Related Documentation

- [FIVB VIS SDK Documentation Guide](../FIVB_VIS_SDK_DOCUMENTATION_GUIDE.md)
- [Live Score Implementation Findings](../LIVE_SCORE_IMPLEMENTATION_FINDINGS.md)
- Detailed stories in [stories/live-score/](../stories/live-score/) directory