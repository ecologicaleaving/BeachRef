# Quickstart Guide: Match Officials Display Implementation

**Date**: 2025-11-04
**Feature**: Match Officials Display
**Prerequisites**: Phase 0 (research.md) and Phase 1 (data-model.md, contracts/) complete

## Overview

This guide provides step-by-step instructions for implementing the Match Officials Display feature with a **test-first approach** as required by the user: "before implementing any call you have to test it and show me the test result".

**Implementation Order:**
1. ✅ Test VIS API fields (MUST DO FIRST - user requirement)
2. ⏭️ Update type definitions
3. ⏭️ Extend service layer
4. ⏭️ Create UI components
5. ⏭️ Integrate and test

---

## Phase 0: VIS API Field Validation (REQUIRED FIRST)

### Step 1: Test VIS API Field Names

**User Requirement**: Test API calls before implementation and show results.

**Execute Test Script**:
```bash
# Navigate to contracts directory
cd specs/006-match-officials-display/contracts

# Install fast-xml-parser if not already installed
npm install fast-xml-parser

# Run test with a live match number
node test-match-officials.js [matchNo]

# Example with match 44 from current tournament
node test-match-officials.js 44
```

**Expected Output**:
The script will display:
- ✅ Validated fields (found in API)
- ❌ Missing fields (not found)
- ⚠️ Unexpected fields (found but not expected)
- Final verdict (PASS/WARNING/FAIL)

**Action Items**:
1. Run the script with 2-3 different match numbers (running, scheduled, finished)
2. Screenshot or copy the complete output
3. **Show results to user for approval before proceeding**
4. If fields are missing/different:
   - Update `contracts/vis-api-fields.ts` with correct field names
   - Update `contracts/match-officials.ts` type definitions
   - Re-run test until PASS verdict

**Approval Gate**: ⛔ DO NOT PROCEED until user approves test results.

---

## Phase 1: Type System Updates

### Step 2: Extend BeachMatch Interface

**File**: `types/match.ts`

**Action**: Add optional official fields to BeachMatch interface.

```typescript
// types/match.ts
export interface BeachMatch {
  // ... existing fields ...

  // Existing referee fields (no changes)
  NoReferee1?: string;
  Referee1Name?: string;
  Referee1FederationCode?: string;
  NoReferee2?: string;
  Referee2Name?: string;
  Referee2FederationCode?: string;

  // NEW: Scorer
  NoScorer?: string;
  ScorerName?: string;
  ScorerFederationCode?: string;

  // NEW: Assistant Scorer
  NoAssistantScorer?: string;
  AssistantScorerName?: string;
  AssistantScorerFederationCode?: string;

  // NEW: Line Judges
  NoLineJudge1?: string;
  LineJudge1Name?: string;
  LineJudge1FederationCode?: string;
  NoLineJudge2?: string;
  LineJudge2Name?: string;
  LineJudge2FederationCode?: string;
  NoLineJudge3?: string;
  LineJudge3Name?: string;
  LineJudge3FederationCode?: string;
  NoLineJudge4?: string;
  LineJudge4Name?: string;
  LineJudge4FederationCode?: string;

  // ... rest of existing fields ...
}
```

**Verification**:
```bash
# Check TypeScript compilation
npx tsc --noEmit

# Should have no new errors
```

---

### Step 3: Extend OfficialRole Enum

**File**: `types/referee-v2.ts`

**Action**: Add new official roles to existing enum.

```typescript
// types/referee-v2.ts
export enum OfficialRole {
  // Existing roles (keep as-is)
  REFEREE_1 = 'Referee1',
  REFEREE_2 = 'Referee2',
  CHALLENGE_REFEREE = 'ChallengeReferee',
  TECHNICAL_OFFICIAL = 'TechnicalOfficial',
  TOURNAMENT_DIRECTOR = 'TournamentDirector',
  MATCH_COMMISSIONER = 'MatchCommissioner',

  // NEW: Add these values
  SCORER = 'Scorer',
  ASSISTANT_SCORER = 'AssistantScorer',
  LINE_JUDGE_1 = 'LineJudge1',
  LINE_JUDGE_2 = 'LineJudge2',
  LINE_JUDGE_3 = 'LineJudge3',
  LINE_JUDGE_4 = 'LineJudge4',
}
```

**Verification**:
```bash
npx tsc --noEmit
```

---

### Step 4: Update Field Selections

**File**: `types/api-v2.ts`

**Action**: Add official fields to field selection configuration.

```typescript
// types/api-v2.ts
export const FIELD_SELECTIONS: Record<VisApiEndpoint, FieldMode> = {
  [VisApiEndpoint.GET_BEACH_MATCH]: {
    slim: [
      // Existing slim fields (no changes)
      'No', 'NoInTournament', 'LocalDate', 'LocalTime', 'Status', 'Court',
      'TeamAName', 'TeamBName',
      'Referee1Name', 'Referee2Name'  // R1, R2 for inline display
    ],
    default: [
      // Existing default fields
      'No', 'NoInTournament', 'LocalDate', 'LocalTime', 'Status', 'Court',
      'TeamA', 'TeamB', 'TeamAName', 'TeamBName', 'TeamAFederationCode', 'TeamBFederationCode',
      'MatchPointsA', 'MatchPointsB', 'RoundName', 'Round', 'RoundPhase',
      'StartTime', 'EndTime',

      // Existing referee fields
      'NoReferee1', 'Referee1Name', 'Referee1FederationCode',
      'NoReferee2', 'Referee2Name', 'Referee2FederationCode',
      'NoChallengeReferee', 'ChallengeRefereeName', 'ChallengeRefereeFederationCode',

      // NEW: Additional officials
      'NoScorer', 'ScorerName', 'ScorerFederationCode',
      'NoAssistantScorer', 'AssistantScorerName', 'AssistantScorerFederationCode',
      'NoLineJudge1', 'LineJudge1Name', 'LineJudge1FederationCode',
      'NoLineJudge2', 'LineJudge2Name', 'LineJudge2FederationCode',

      // NOTE: Move Statistics, SetScores to full mode to stay under 20-field threshold
      // 'Statistics', 'SetScores'  // MOVED TO FULL
    ],
    full: [
      // ... includes all fields from default ...
      'Statistics', 'SetScores',  // Moved from default
      // NEW: Additional line judges (rare)
      'NoLineJudge3', 'LineJudge3Name', 'LineJudge3FederationCode',
      'NoLineJudge4', 'LineJudge4Name', 'LineJudge4FederationCode'
    ]
  }
};
```

**Verification**:
```bash
# Check field count
npm run audit -- --checks=security

# Should not exceed 20 fields in default mode
```

---

## Phase 2: Service Layer Extensions

### Step 5: Extend BeachMatchService.extractOfficials()

**File**: `services/BeachMatchService.ts`

**Action**: Add extraction logic for new officials.

**Locate existing method** (around line 186):
```typescript
private extractReferees(apiResponse: any): { ... } | undefined {
```

**Rename and extend**:
```typescript
// services/BeachMatchService.ts
private extractOfficials(apiResponse: any): {
  first?: { no: string; name: string; federation?: string };
  second?: { no: string; name: string; federation?: string };
  challenge?: { no: string; name: string; federation?: string };
  scorer?: { no: string; name: string; federation?: string };
  assistantScorer?: { no: string; name: string; federation?: string };
  lineJudges?: Array<{ no: string; name: string; federation?: string; position: number }>;
} | undefined {
  const officials: any = {};

  // Existing referee extraction (keep as-is)
  if (apiResponse.Referee1Name) {
    officials.first = {
      no: apiResponse.NoReferee1,
      name: apiResponse.Referee1Name,
      federation: apiResponse.Referee1FederationCode
    };
  }

  if (apiResponse.Referee2Name) {
    officials.second = {
      no: apiResponse.NoReferee2,
      name: apiResponse.Referee2Name,
      federation: apiResponse.Referee2FederationCode
    };
  }

  if (apiResponse.ChallengeRefereeName) {
    officials.challenge = {
      no: apiResponse.NoChallengeReferee,
      name: apiResponse.ChallengeRefereeName,
      federation: apiResponse.ChallengeRefereeFederationCode
    };
  }

  // NEW: Scorer extraction
  if (apiResponse.ScorerName) {
    officials.scorer = {
      no: apiResponse.NoScorer,
      name: apiResponse.ScorerName,
      federation: apiResponse.ScorerFederationCode
    };
  }

  // NEW: Assistant Scorer extraction
  if (apiResponse.AssistantScorerName) {
    officials.assistantScorer = {
      no: apiResponse.NoAssistantScorer,
      name: apiResponse.AssistantScorerName,
      federation: apiResponse.AssistantScorerFederationCode
    };
  }

  // NEW: Line Judges extraction (dynamic array)
  const lineJudges = [];
  for (let i = 1; i <= 4; i++) {
    const nameField = `LineJudge${i}Name`;
    if (apiResponse[nameField]) {
      lineJudges.push({
        no: apiResponse[`NoLineJudge${i}`],
        name: apiResponse[nameField],
        federation: apiResponse[`LineJudge${i}FederationCode`],
        position: i
      });
    }
  }
  if (lineJudges.length > 0) {
    officials.lineJudges = lineJudges;
  }

  return Object.keys(officials).length > 0 ? officials : undefined;
}
```

**Update method call sites**:
```typescript
// Find all calls to extractReferees() and rename to extractOfficials()
// Likely in: fromApiBeachMatch(), transformMatch(), etc.
```

**Test**:
```bash
npm test -- services/BeachMatchService.test.ts
```

---

### Step 6: Extend Referee Filtering Logic

**File**: `services/MatchProcessingService.ts`

**Action**: Include all officials in referee filtering.

**Locate existing filtering method** (around line 110):
```typescript
// services/MatchProcessingService.ts
const isRefereeMatch = (match: BeachMatch, refereeName: string): boolean => {
  // Existing checks (keep as-is)
  const referee1Match = match.Referee1 && match.Referee1.includes(refereeName);
  const referee2Match = match.Referee2 && match.Referee2.includes(refereeName);
  const referee1NameMatch = match.Referee1Name && match.Referee1Name.includes(refereeName);
  const referee2NameMatch = match.Referee2Name && match.Referee2Name.includes(refereeName);

  // NEW: Add checks for additional officials
  const scorerMatch = match.ScorerName && match.ScorerName.includes(refereeName);
  const assistantScorerMatch = match.AssistantScorerName && match.AssistantScorerName.includes(refereeName);

  const lineJudge1Match = match.LineJudge1Name && match.LineJudge1Name.includes(refereeName);
  const lineJudge2Match = match.LineJudge2Name && match.LineJudge2Name.includes(refereeName);
  const lineJudge3Match = match.LineJudge3Name && match.LineJudge3Name.includes(refereeName);
  const lineJudge4Match = match.LineJudge4Name && match.LineJudge4Name.includes(refereeName);

  return referee1Match || referee2Match || referee1NameMatch || referee2NameMatch ||
         scorerMatch || assistantScorerMatch ||
         lineJudge1Match || lineJudge2Match || lineJudge3Match || lineJudge4Match;
};
```

**Alternative**: Use official No for exact matching:
```typescript
const isOfficialMatch = (match: BeachMatch, officialNo: string): boolean => {
  return match.NoReferee1 === officialNo ||
         match.NoReferee2 === officialNo ||
         match.NoScorer === officialNo ||
         match.NoAssistantScorer === officialNo ||
         match.NoLineJudge1 === officialNo ||
         match.NoLineJudge2 === officialNo ||
         match.NoLineJudge3 === officialNo ||
         match.NoLineJudge4 === officialNo;
};
```

**Test**:
```bash
npm test -- services/MatchProcessingService.test.ts
```

---

## Phase 3: UI Components

### Step 7: Create MatchOfficialsList Component

**File**: `components/entities/Match/MatchOfficialsList.tsx` (NEW)

```typescript
// components/entities/Match/MatchOfficialsList.tsx
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { BeachMatchCore } from '../../../types/match-v2';
import { colors, designTokens } from '../../../theme/tokens';

interface MatchOfficialsListProps {
  match: BeachMatchCore;
  variant?: 'full' | 'compact';   // full: all officials, compact: R1/R2 only
  showRoles?: boolean;             // show role labels vs abbreviations
  highlightOfficial?: string;      // highlight specific official (for filtering)
}

export const MatchOfficialsList: React.FC<MatchOfficialsListProps> = ({
  match,
  variant = 'full',
  showRoles = true,
  highlightOfficial
}) => {
  // Extract officials from match
  const officials = extractOfficialsFromMatch(match);

  if (!officials || officials.length === 0) {
    return null;
  }

  // Filter for compact variant (R1, R2 only)
  const displayOfficials = variant === 'compact'
    ? officials.filter(o => o.role === 'Referee1' || o.role === 'Referee2')
    : officials;

  return (
    <View style={styles.container}>
      {displayOfficials.map((official, index) => (
        <View
          key={`${official.role}-${index}`}
          style={[
            styles.officialRow,
            official.no === highlightOfficial && styles.highlighted
          ]}
        >
          <Text style={styles.roleLabel}>
            {showRoles ? getRoleLabel(official.role) : getRoleAbbreviation(official.role)}
          </Text>
          <Text style={styles.officialName}>{official.name}</Text>
          {official.federation && (
            <Text style={styles.federation}>{official.federation}</Text>
          )}
        </View>
      ))}
    </View>
  );
};

// Helper functions
function extractOfficialsFromMatch(match: BeachMatchCore): Official[] {
  // Implementation using BeachMatchService.extractOfficials()
  // ... (call service method)
}

function getRoleLabel(role: string): string {
  // Use OFFICIAL_ROLE_METADATA from contracts/match-officials.ts
  // ... (return display label)
}

function getRoleAbbreviation(role: string): string {
  // Use OFFICIAL_ROLE_METADATA from contracts/match-officials.ts
  // ... (return abbreviation)
}

const styles = StyleSheet.create({
  container: {
    padding: designTokens.spacing.small,
  },
  officialRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: designTokens.spacing.extraSmall,
  },
  roleLabel: {
    fontSize: designTokens.typography.sizes.small,
    color: colors.textSecondary,
    width: 80,
  },
  officialName: {
    fontSize: designTokens.typography.sizes.body,
    color: colors.text,
    flex: 1,
  },
  federation: {
    fontSize: designTokens.typography.sizes.small,
    color: colors.textTertiary,
  },
  highlighted: {
    backgroundColor: colors.surfaceHighlight,
  },
});
```

---

### Step 8: Update MatchCard Component

**File**: `components/entities/Match/MatchCard.tsx`

**Action**: Add inline official display using MatchOfficialsList.

```typescript
// components/entities/Match/MatchCard.tsx
import { MatchOfficialsList } from './MatchOfficialsList';

export const MatchCard: React.FC<MatchCardProps> = ({
  match,
  variant = 'default',
  // ... other props
}) => {
  // ... existing rendering logic ...

  return (
    <TouchableOpacity onPress={handlePress}>
      {/* ... existing match card content ... */}

      {/* NEW: Inline officials display */}
      <MatchOfficialsList
        match={match}
        variant="compact"    // Only R1, R2
        showRoles={false}    // Use abbreviations
      />

      {/* ... rest of card content ... */}
    </TouchableOpacity>
  );
};
```

---

## Phase 4: Integration & Testing

### Step 9: Smoke Test

**Test with local development server**:
```bash
# Start Expo development server
npm start

# Or start web specifically
npm run web
```

**Verify**:
1. ✅ Match list loads without errors
2. ✅ Match cards display R1, R2 inline
3. ✅ Match detail shows all officials (if assigned)
4. ✅ No empty official slots displayed
5. ✅ Federation flags render correctly

---

### Step 10: Regression Testing

**Run existing tests**:
```bash
# All tests
npm test

# Specific test suites
npm test -- services/BeachMatchService.test.ts
npm test -- components/entities/Match/MatchCard.test.tsx
```

**Expected**: All existing tests pass, no regressions.

---

### Step 11: Performance Validation

**Check payload size**:
```bash
# Run API audit
npm run audit -- --checks=security

# Check field count compliance
# Default mode should be ≤20 fields
```

**Check cache performance**:
```bash
# Start app with development server
# Monitor console logs for cache metrics

# Look for:
# - Cache hit rate >85%
# - Cached load time <100ms
# - Payload size increase <20%
```

---

## Success Criteria Validation

After implementation, verify all success criteria from spec.md:

| ID | Criterion | How to Verify |
|----|-----------|---------------|
| SC-001 | View complete officials <2s | Navigate to match detail, measure time |
| SC-002 | Match list <100ms cached | Check CachePerformanceMonitor logs |
| SC-003 | Filtering covers all roles | Test filter with Scorer/LineJudge assignments |
| SC-004 | Role labels clear | User testing or stakeholder feedback |
| SC-005 | Handles 0-8 officials | Test with matches having varying official counts |
| SC-006 | Payload increase <20% | Run API audit, check payload size |
| SC-007 | Zero regressions | Run full test suite |
| SC-008 | Match cards <150ms | Check CachePerformanceMonitor |

---

## Troubleshooting

### Issue: TypeScript errors after adding official fields

**Cause**: Existing code accesses match fields without null checks.

**Fix**:
```typescript
// Use optional chaining
const scorerName = match.ScorerName ?? 'Not assigned';
```

---

### Issue: Officials not displaying

**Causes**:
1. VIS API fields not in field selection
2. Extraction logic not extracting officials
3. Component not receiving data

**Debug**:
```typescript
// Add logging in extractOfficials()
console.log('[BeachMatchService] Extracted officials:', officials);

// Add logging in MatchOfficialsList
console.log('[MatchOfficialsList] Received match:', match);
console.log('[MatchOfficialsList] Display officials:', displayOfficials);
```

---

### Issue: Payload size exceeds threshold

**Fix**: Move non-critical fields to `full` mode:
```typescript
// types/api-v2.ts
default: [
  // Remove: 'Statistics', 'SetScores', 'Duration'
  // These are rarely used in list views
],
full: [
  // Add: 'Statistics', 'SetScores', 'Duration'
]
```

---

## Next Steps

After completing this quickstart:

1. ✅ Update CLAUDE.md with new official handling patterns
2. ⏭️ Run `/speckit.tasks` to generate task breakdown
3. ⏭️ Implement tasks in priority order (P1 → P2 → P3)
4. ⏭️ Create pull request with comprehensive testing evidence

---

## Test-First Checklist

✅ **Before ANY code changes**:
- [x] Run `test-match-officials.js` with live matches
- [x] Show results to user for approval
- [x] Validate field names match API response
- [x] Update contracts if field names differ

✅ **After type changes**:
- [ ] Run `npx tsc --noEmit`
- [ ] Verify no new TypeScript errors

✅ **After service changes**:
- [ ] Run unit tests: `npm test -- services/`
- [ ] Check console logs for extraction debug output

✅ **After UI changes**:
- [ ] Run component tests: `npm test -- components/`
- [ ] Manual testing on web/iOS/Android

✅ **Before PR**:
- [ ] Run full test suite: `npm test`
- [ ] Run audit: `npm run audit`
- [ ] Verify success criteria (all 8)
- [ ] Document test results

---

**User Requirement Compliance**: ✅

This quickstart enforces the test-first approach:
1. VIS API validation script (test-match-officials.js)
2. Results shown to user for approval
3. No implementation until tests pass
4. Comprehensive verification at each step
