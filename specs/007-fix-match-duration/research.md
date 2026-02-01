# Research: Fix Match Duration Display

**Feature**: 007-fix-match-duration
**Date**: 2025-01-25

## Research Questions

### RQ-1: VIS API Duration Field Format

**Question**: What is the exact format of DurationSet1/2/3 fields from VIS API?

**Finding**: Per VIS API documentation (https://www.fivb.org/VisSDK/VisWebService/Duration.html):
> "A duration is expressed as a positive 32-bits integer representing a number of seconds."

**Decision**: Parse DurationSet fields as integer seconds, not "mm:ss" strings.

**Rationale**: The official VIS API documentation clearly states Duration is a positive integer in seconds. The current implementation incorrectly assumes string format.

**Alternatives Considered**:
- Continue using "mm:ss" parsing with fallback → Rejected: VIS API returns integers, not strings
- Request VIS API to change format → Not feasible: external API we don't control

---

### RQ-2: Current Parsing Logic Analysis

**Question**: How does the current implementation parse duration fields?

**Finding**: Code analysis reveals two problematic implementations:

1. **`MatchDurationFormatter.ts:parseTimeString()`** (lines 13-48):
   - Expects "mm:ss" format (e.g., "25:30")
   - Treats single numbers as minutes (e.g., "25" → 1500 seconds)
   - VIS API returns seconds (e.g., "1530" → should be 1530 seconds)
   - **Bug**: "1530" parsed as 1530 minutes × 60 = 91,800 seconds (25.5 hours!) instead of 1530 seconds (25.5 minutes)

2. **`MatchDurationService.ts:parseSetDuration()`** (lines 99-113):
   - Uses regex: `/^(\d{1,2}):?(\d{2})?$/`
   - Only matches 1-2 digit numbers with optional colon
   - VIS API returns 3-4 digit numbers (e.g., "1530")
   - **Bug**: Regex fails to match, returns null for valid data

3. **`MatchListV2.tsx:getMatchDuration()`** (lines 232-313):
   - Complex fallback logic checking for colon in string
   - Misidentifies integer-as-string as "not string format"
   - Falls through to parseInt logic treating value as seconds
   - **Partial fix exists**: The fallback path is correct but convoluted

**Decision**: Refactor parsing to prioritize integer-seconds interpretation with "mm:ss" as legacy fallback.

**Rationale**: Current logic has multiple paths, some correct (by accident), some wrong. A clean implementation with clear priority order will be more maintainable.

**Alternatives Considered**:
- Fix only `MatchDurationFormatter.ts` → Rejected: `MatchDurationService.ts` also has parsing issues
- Add more fallback paths → Rejected: Increases complexity, harder to debug

---

### RQ-3: Backward Compatibility Strategy

**Question**: How should we handle potentially cached "mm:ss" format data?

**Finding**:
- Cache may contain legacy strings like "25:30" from previous incorrect parsing
- MMKV cache has 6-hour expiration per constitution
- After deployment, cached data will naturally expire within 6 hours

**Decision**: Implement dual-format parsing with priority order:
1. Try parsing as integer seconds (primary, matches VIS API spec)
2. Try parsing as "mm:ss" format (fallback for cached data)
3. Return null if both fail (graceful degradation)

**Rationale**: This ensures zero disruption during transition period while correctly handling both formats.

**Alternatives Considered**:
- Force cache clear on update → Rejected: Disruptive to users, unnecessary
- Only support integers → Rejected: May break during transition period

---

### RQ-4: Testing Strategy

**Question**: How should we update the test suite?

**Finding**: Current tests in `MatchDurationFormatter.test.ts`:
- 118 lines of comprehensive tests
- All tests assume "mm:ss" input format
- Tests pass for wrong assumptions

**Decision**:
1. Add new tests for integer-seconds input (primary format)
2. Keep existing "mm:ss" tests but mark as "legacy format compatibility"
3. Add integration tests with realistic VIS API response data

**Rationale**: Test suite should reflect actual VIS API behavior while maintaining backward compatibility coverage.

---

### RQ-5: Display Format Consistency

**Question**: Should the display format change?

**Finding**: Current display format is user-friendly:
- Short matches: "45m"
- Long matches: "1h 30m"
- Zero/null: Nothing displayed

**Decision**: Keep current display format unchanged. Only the parsing logic changes.

**Rationale**: Users are accustomed to the display format. The bug is in parsing, not formatting.

---

## Summary of Key Decisions

| Decision | Choice | Impact |
|----------|--------|--------|
| Duration field interpretation | Integer seconds | Fixes root cause |
| Parsing priority | Seconds first, "mm:ss" fallback | Backward compatible |
| Display format | No change | User experience unchanged |
| Test strategy | Add seconds tests, keep "mm:ss" as legacy | Comprehensive coverage |
| Files to modify | 2 primary, 1 secondary | Minimal change scope |

## Implementation Risk Assessment

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Cached data shows wrong duration | Low | Fallback parsing handles "mm:ss" format |
| Live matches show wrong duration | Medium | Priority seconds parsing + thorough testing |
| Tests break | Certain | Update tests to match VIS API spec |
| Other components affected | Low | MatchListV2.tsx already has correct fallback path |

## No Unresolved Questions

All NEEDS CLARIFICATION items from Technical Context have been resolved through research.
