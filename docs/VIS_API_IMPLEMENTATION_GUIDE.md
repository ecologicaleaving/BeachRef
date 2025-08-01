# VIS API Implementation Guide

## Overview

This document captures the correct implementation pattern for the VIS (Volleyball Information System) API that resolves production errors and provides reliable tournament data access.

## Problem Solved

**Production Error**: `Error: Failed to fetch tournament MQUI2025: 401 Unauthorized`

**Root Cause**: The VIS API uses a two-tier access model where some endpoints require authentication. 401 errors were being treated as failures instead of expected behavior.

## The Two-Tier VIS API Model

### Public Endpoints (No Authentication Required)
- **GetBeachTournamentList**: Returns tournament metadata including codes, names, dates, and tournament numbers
- **GetPlayerList**: Returns player metadata
- **GetMatchList**: Returns match metadata

### Authenticated Endpoints (Credentials Required)
- **GetBeachTournament**: Returns detailed tournament data including venue, description, administration details
- **GetMatch**: Returns detailed match data
- **GetPlayer**: Returns detailed player data

## Correct Implementation Pattern

### 1. Two-Step Process

```typescript
// Step 1: Get tournament number from public endpoint
const tournamentNumber = await getTournamentNumber(code) // Uses GetBeachTournamentList

// Step 2: Try enhanced data, gracefully handle 401
if (tournamentNumber) {
  try {
    return await fetchTournamentDetailByNumber(tournamentNumber) // Uses GetBeachTournament
  } catch (enhancedError) {
    if (enhancedError.statusCode === 401) {
      // EXPECTED BEHAVIOR - not an error
      log({ level: 'info', message: 'GetBeachTournament requires authentication, using fallback' })
      return await fetchBasicTournamentDetail(code) // Return basic data
    }
    throw enhancedError // Only throw on actual errors
  }
}
```

### 2. Request Structure

**Public Endpoint Request**:
```xml
<?xml version="1.0" encoding="utf-8"?>
<Requests>
  <Request Type="GetBeachTournamentList" 
           Fields="Code Name CountryCode StartDateMainDraw EndDateMainDraw Gender Type No">
    <Filter Code="${code}"/>
  </Request>
</Requests>
```

**Authenticated Endpoint Request**:
```xml
<?xml version="1.0" encoding="utf-8"?>
<Requests>
  <Request Type="GetBeachTournament" No="${tournamentNo}" 
           Fields="Code Name CountryCode StartDateMainDraw EndDateMainDraw Gender Type Venue City Prize Description Status"/>
</Requests>
```

### 3. Error Handling Strategy

```typescript
if (error instanceof VISApiError && error.statusCode === 401) {
  // Expected behavior for GetBeachTournament without credentials
  console.log('Authentication required for enhanced data, using basic fallback')
  return fallbackToBasicData()
} else {
  // Actual error conditions
  throw error
}
```

### 4. HTTP Status Mapping

- **401 from VIS API** → **503 Service Unavailable** (don't expose auth details)
- **404 from VIS API** → **404 Not Found** (tournament doesn't exist)
- **500 from VIS API** → **500 Internal Server Error** (VIS API issues)

## Implementation Files

### 1. `/lib/vis-client.ts`
- Core VIS API client implementation
- Two-step tournament detail fetching
- Comprehensive error handling with fallbacks
- Enhanced XML parsing for both public and authenticated responses

### 2. `/app/api/tournament/[code]/route.ts`
- Next.js API route implementation
- 5-minute caching with TTL
- Proper HTTP status code mapping
- Production error logging

### 3. `/docsOLD/visDocs.md`
- Complete VIS API documentation
- Implementation insights and patterns
- Error code reference

## Production Benefits

✅ **Works without VIS API credentials**
- Application functions normally without authentication
- Users receive basic tournament data
- No production crashes from expected 401 responses

✅ **Ready for enhanced data**
- When authentication becomes available, enhanced data is automatically used
- Seamless upgrade path from basic to detailed tournament information

✅ **Robust error handling**
- Distinguishes between expected behavior (401) and actual errors
- Comprehensive logging for production debugging
- Graceful degradation maintains user experience

✅ **Performance optimized**
- 5-minute caching reduces API load  
- Efficient two-step process minimizes requests
- Retry logic with exponential backoff

## Key Insights

1. **401 is not an error** - It's expected behavior for unauthenticated requests to protected endpoints
2. **Always attempt enhanced data first** - Try authenticated endpoints but be ready to fall back
3. **Log 401 as 'info' level** - Not 'error' since it's expected behavior
4. **Provide basic data instead of failing** - Users get tournament information even without auth
5. **Use proper HTTP status codes** - Don't expose internal authentication details to clients

## Testing

The implementation has been tested and verified to:
- Handle tournament codes that trigger 401 errors (like MQUI2025)
- Provide consistent tournament data across different access levels
- Maintain performance under production load
- Log appropriate diagnostic information for debugging

## Future Enhancements

When VIS API authentication becomes available:
1. Add authentication headers to requests
2. Enhanced data will be automatically used
3. No code changes required in consuming components
4. Fallback mechanisms remain as safety net

This implementation pattern ensures production reliability while maintaining readiness for enhanced data access.