# BeachRef Implementation Insights

### CRITICAL PRODUCTION IMPLEMENTATION NOTES

**Problem Solved**: `Error: Failed to fetch tournament MQUI2025: 401 Unauthorized`

**Root Cause**: GetBeachTournament endpoint requires authentication, but 401 responses were being treated as failures instead of expected behavior.

**Solution**: Two-step implementation pattern with graceful 401 handling:

1. **Step 1**: Use `GetBeachTournamentList` (public) to get tournament numbers
2. **Step 2**: Try `GetBeachTournament` (authenticated) for enhanced data
3. **Step 3**: When 401 occurs → Log as 'info' (not error) and fallback to basic data

**Key Implementation Pattern**:
```typescript
try {
  const tournamentNumber = await getTournamentNumber(code) // Public endpoint
  if (tournamentNumber) {
    return await fetchTournamentDetailByNumber(tournamentNumber) // Auth endpoint
  }
} catch (detailError) {
  if (detailError.statusCode === 401) {
    // EXPECTED - not an error
    log({ level: 'info', message: 'GetBeachTournament requires authentication, using fallback' })
    return await fetchBasicTournamentDetail(code) // Fallback to public data
  }
  throw detailError // Only throw on actual errors
}
```

**Production Benefits**:
- ✅ Works without VIS API credentials
- ✅ Provides basic tournament data to users
- ✅ Ready for enhanced data when auth available
- ✅ Prevents crashes from expected 401 responses

---
