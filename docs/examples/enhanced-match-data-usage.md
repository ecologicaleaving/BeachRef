# Enhanced Match Data Usage

This document demonstrates how to use the new enhanced match data functionality that calls `GetBeachMatch` for each match in a `BeachMatchList` to populate all available VIS API data without overcomplicated mapping.

## Overview

The enhanced match data feature provides:
- **GetBeachMatch endpoint**: Individual match data retrieval
- **Enhanced match list**: Automatically calls GetBeachMatch for each match
- **Raw data preservation**: No overcomplicated mapping, all VIS API fields available
- **Performance options**: Parallel or sequential processing
- **Graceful fallback**: Falls back to original data on individual failures

## Basic Usage

### 1. Using VisApiClient directly

```typescript
import { VisApiClient, GetBeachMatchRequest } from '../services/api/VisApiClient';

const apiClient = new VisApiClient(config);

// Get individual match with full details
const matchRequest: GetBeachMatchRequest = {
  matchNo: '001',
  tournamentNo: 'T001',
  includeResults: true,
  includeReferees: true,
  includeTeamDetails: true,
  includeSetScores: true,
  includeStatistics: true
};

const response = await apiClient.getBeachMatch(matchRequest);
if (response.success) {
  console.log('Full match data:', response.xmlData);
}
```

### 2. Using VisApiIntegrationService (Recommended)

```typescript
import { VisApiIntegrationService } from '../services/api/VisApiIntegrationService';

const integrationService = new VisApiIntegrationService(apiClient);

// Get enhanced match list with full individual data
const result = await integrationService.getMatchesWithEnhancedData(
  { tournamentNo: 'T001' },
  {
    includeRefereeData: true,
    includeSetScores: true,
    includeStatistics: true,
    parallel: true // Process matches in parallel for better performance
  }
);

console.log('Enhanced matches:', result.matches);
console.log('Performance metrics:', result.metrics);
```

## Advanced Configuration

### Parallel vs Sequential Processing

```typescript
// Parallel processing (faster, higher API load)
const parallelResult = await integrationService.getMatchesWithEnhancedData(
  { tournamentNo: 'T001' },
  { parallel: true }
);

// Sequential processing (slower, lower API load)
const sequentialResult = await integrationService.getMatchesWithEnhancedData(
  { tournamentNo: 'T001' },
  { parallel: false }
);
```

### Selective Data Inclusion

```typescript
// Include only specific data types
const selectiveResult = await integrationService.getMatchesWithEnhancedData(
  { tournamentNo: 'T001' },
  {
    includeRefereeData: false,  // Skip referee data
    includeSetScores: true,     // Include set-by-set scores
    includeStatistics: false,   // Skip match statistics
    parallel: true
  }
);
```

## Raw Data Structure

The enhanced match data preserves the original VIS API structure without complex mapping:

```typescript
// Example of raw match data structure
const enhancedMatch = {
  // Direct VIS API attributes
  No: "001",
  Status: "Running", 
  Court: "1",
  LocalDate: "2025-01-01",
  LocalTime: "10:00",
  
  // Nested structures preserved
  TeamA: "Team Alpha",
  TeamB: "Team Beta",
  Sets: {
    Set: [
      { No: "1", TeamAPoints: "21", TeamBPoints: "15" },
      { No: "2", TeamAPoints: "19", TeamBPoints: "21" }
    ]
  },
  Referees: {
    Referee1Name: "John Doe",
    Referee2Name: "Jane Smith"
  },
  
  // All other VIS API fields available without transformation
  // No overcomplicated mapping - direct access to API data
};
```

## Error Handling and Fallback

The system gracefully handles failures:

```typescript
const result = await integrationService.getMatchesWithEnhancedData(
  { tournamentNo: 'T001' }
);

// Check which individual calls succeeded
const successfulEnhancements = result.metrics.individualCalls.filter(m => m.success);
const failedEnhancements = result.metrics.individualCalls.filter(m => !m.success);

console.log(`Enhanced ${successfulEnhancements.length} matches`);
console.log(`Fell back to original data for ${failedEnhancements.length} matches`);

// Matches array contains either enhanced data or fallback to original BeachMatchList data
result.matches.forEach((match, index) => {
  const wasEnhanced = result.metrics.individualCalls[index]?.success;
  console.log(`Match ${index}: ${wasEnhanced ? 'Enhanced' : 'Original'} data`);
});
```

## Performance Monitoring

The enhanced functionality provides detailed performance metrics:

```typescript
const result = await integrationService.getMatchesWithEnhancedData(
  { tournamentNo: 'T001' },
  { parallel: true }
);

console.log('Performance Metrics:');
console.log('- List call duration:', result.metrics.listCall.durationMs, 'ms');
console.log('- Individual calls:', result.metrics.individualCalls.length);
console.log('- Successfully enhanced:', result.metrics.enhancedMatches);
console.log('- Total duration:', result.metrics.totalDuration, 'ms');

// Detailed per-call metrics
result.metrics.individualCalls.forEach((call, index) => {
  console.log(`Match ${index}: ${call.success ? 'Success' : 'Failed'} in ${call.durationMs}ms`);
});
```

## Implementation Flow

The enhanced match data follows this flow:

1. **GetBeachMatchList**: Retrieve initial match list from tournament
2. **Extract Match Numbers**: Parse match IDs from the list response  
3. **For Each Match**: Call GetBeachMatch to get full individual data
4. **Parse Raw Data**: Extract all VIS API fields without complex mapping
5. **Return Enhanced Data**: Provide full match objects with all available data

This approach ensures you get the complete VIS API data structure for each match without losing any information through transformation layers.