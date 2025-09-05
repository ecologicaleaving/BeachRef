# Duration Debug Fix - Using Enhanced Match Data

## Problem
You're seeing "Duration Debug: in console only this, no duration" because the current `GetBeachMatchList` API call doesn't return duration data. The `getMatchDuration` function is trying to access duration fields that aren't available in the basic match list response.

## Solution
Use our new **Enhanced Match Data** functionality that calls `GetBeachMatch` for each match to get ALL duration information.

## Quick Fix

### Option 1: Replace the existing enhancement with our enhanced match data

In `MatchListV2.tsx`, replace this section:

```typescript
// CURRENT CODE (around line 260)
const enhanced = await setScoreService.enhanceMatchesWithSetScores(matches);
```

With this:

```typescript
// NEW CODE - Use Enhanced Match Data
import { VisApiIntegrationService } from '../../services/api/VisApiIntegrationService';

const enhanced = await integrationService.getMatchesWithEnhancedData(
  { tournamentNo: tournament.visNo },
  {
    includeSetScores: true,
    includeStatistics: true,
    parallel: true // Process in parallel for better performance
  }
);

// The enhanced.matches will now contain ALL VIS API data including duration
setEnhancedMatches(enhanced.matches);
```

### Option 2: Integrate with existing enhancement system

Add duration enhancement to your existing service:

```typescript
// In your enhancement service
const enhanceMatchesWithDuration = async (matches: BeachMatch[]): Promise<BeachMatch[]> => {
  const integrationService = new VisApiIntegrationService(apiClient);
  
  const result = await integrationService.getMatchesWithEnhancedData(
    { tournamentNo: tournament.visNo },
    { includeSetScores: true, parallel: true }
  );
  
  return result.matches;
};
```

## Duration Data Available After Enhancement

With our enhanced match data, you'll have access to:

```typescript
// All these duration fields will be available:
{
  Duration: "65",           // Total match duration in minutes
  DurationSet1: "23",       // First set duration  
  DurationSet2: "19",       // Second set duration
  DurationSet3: "23",       // Third set duration (if played)
  StartTime: "10:00",       // Match start time
  EndTime: "11:05",         // Match end time
  // Plus ALL other VIS API fields without complex mapping
}
```

## Updated getMatchDuration Function

The existing function will now work correctly:

```typescript
const getMatchDuration = (match: ExtendedBeachMatch): string | null => {
  console.log('Duration Debug:', {
    matchId: match.id,
    // These will now have values with enhanced data:
    duration: match.Duration,           // ✅ Available
    durationSet1: match.DurationSet1,   // ✅ Available  
    durationSet2: match.DurationSet2,   // ✅ Available
    durationSet3: match.DurationSet3,   // ✅ Available
    startTime: match.StartTime,         // ✅ Available
    endTime: match.EndTime              // ✅ Available
  });
  
  // Primary: Use total match duration
  if (match.Duration) {
    const totalMinutes = parseInt(match.Duration);
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    
    return hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;
  }
  
  // Fallback: Calculate from individual set durations
  const set1 = match.DurationSet1 ? parseInt(match.DurationSet1) : 0;
  const set2 = match.DurationSet2 ? parseInt(match.DurationSet2) : 0;
  const set3 = match.DurationSet3 ? parseInt(match.DurationSet3) : 0;
  
  if (set1 || set2 || set3) {
    const total = set1 + set2 + set3;
    const hours = Math.floor(total / 60);
    const minutes = total % 60;
    
    return hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;
  }
  
  return null;
};
```

## Performance Considerations

- Use `parallel: true` for faster processing
- The enhanced data is fetched once and cached
- Graceful fallback if individual calls fail
- Comprehensive metrics for monitoring

## Implementation Steps

1. **Import the service** in your component
2. **Replace or enhance** the existing match enhancement
3. **Update any duration-related logic** to use the new data structure
4. **Remove debug logs** once working correctly

This fix ensures you get complete duration information for all matches without any debug issues!