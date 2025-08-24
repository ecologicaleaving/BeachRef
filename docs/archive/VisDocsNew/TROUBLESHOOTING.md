# VIS API Troubleshooting Guide

## Common Issues and Solutions

### 1. GetBeachMatchList Returns No Matches

**Problem**: GetBeachMatchList request returns empty results even though tournaments exist.

**Symptoms**:
- Tournament list loads correctly with `GetEventList`
- `GetBeachMatchList` returns `<BeachMatches NbItems="0" />` or times out
- Console shows "No matches found" for tournaments

**Root Cause**: Using incorrect tournament identifier format.

**Solution**: 
✅ **Use EventNo from GetEventList directly as TournamentNo in GetBeachMatchList**

```javascript
// ❌ WRONG - searching for 8000+ tournament IDs
const tournamentId = '8001'; // Does not work

// ❌ WRONG - extracting from composite ID
const tournamentId = tournament.id.split('_')[2]; // May not work

// ✅ CORRECT - use EventNo directly
const tournamentId = tournament.visNo; // EventNo from GetEventList
```

**Example Working Flow**:
1. GetEventList returns: `<Event No="1602" Name="BPT Elite Montreal" .../>`
2. Use TournamentNo="1602" in GetBeachMatchList
3. Result: 206,000+ matches found successfully

### 2. API Timeouts in Node.js Environment

**Problem**: VIS API calls timeout when made from Node.js/server environments.

**Symptoms**:
- Requests work in browser console
- Node.js fetch() calls timeout after 10-15 seconds
- Error: "The operation was aborted due to timeout"

**Root Cause**: VIS API may block non-browser requests or have CORS restrictions.

**Solution**: 
✅ **Test API calls in browser console first, then implement in browser-based code**

```javascript
// Test in browser console first:
async function testVISAPI() {
  const response = await fetch('https://www.fivb.org/Vis2009/XmlRequest.asmx', {
    method: 'POST',
    headers: {'Content-Type': 'application/x-www-form-urlencoded'},
    body: 'Request=' + encodeURIComponent('<Request Type="GetBeachMatchList" Fields="No LocalDate LocalTime Status"><Filter TournamentNo="1602" /></Request>')
  });
  const text = await response.text();
  console.log('Matches found:', (text.match(/<BeachMatch/g) || []).length);
}
```

### 3. Large Response Handling

**Problem**: Match responses can be very large (20MB+ for some tournaments).

**Symptoms**:
- Slow loading times
- Memory usage spikes
- Browser tab freezes

**Solution**:
✅ **Use minimal field sets and implement progressive loading**

```xml
<!-- Minimal fields for initial load -->
<Request Type="GetBeachMatchList" Fields="No LocalDate LocalTime Status Court">
  <Filter TournamentNo="1602" />
</Request>

<!-- Full details only when needed -->
<Request Type="GetBeachMatchList" Fields="No LocalDate LocalTime Status Court TeamAName TeamBName MatchPointsA MatchPointsB Referee1Name Referee2Name">
  <Filter TournamentNo="1602" />
</Request>
```

### 4. Date Filtering Not Working

**Problem**: StartDate/EndDate filters in GetEventList may not work as expected.

**Symptoms**:
- Requesting 2025 tournaments returns 2011 tournaments
- Date filters seem ignored

**Root Cause**: VIS API may return all tournaments regardless of date filters.

**Solution**:
✅ **Filter dates client-side after receiving response**

```javascript
// Server-side filtering may not work:
// <Filter StartDate="2025-08-01" EndDate="2025-08-31" />

// Client-side filtering works:
const tournaments = responseData.filter(tournament => {
  const startDate = tournament.StartDate;
  return startDate >= '2025-08-01' && startDate <= '2025-08-31';
});
```

### 5. Tournament vs Event vs Match Hierarchy

**Problem**: Confusion between EventNo, TournamentNo, and match identifiers.

**Correct Hierarchy**:
```
Event (from GetEventList)
├── EventNo = "1602" (use this as TournamentNo in GetBeachMatchList)
└── Contains BeachTournament
    └── Contains BeachMatches
        └── Each match has unique No
```

**API Call Flow**:
1. `GetEventList` → Get events with EventNo
2. `GetBeachMatchList` using EventNo as TournamentNo → Get matches
3. Optional: `GetBeachTournament` using EventNo for tournament details

## Debugging Tips

### 1. Browser Console Testing
Always test API calls in browser console first:

```javascript
// Quick test template
async function quickTest(tournamentId) {
  const response = await fetch('https://www.fivb.org/Vis2009/XmlRequest.asmx', {
    method: 'POST',
    headers: {'Content-Type': 'application/x-www-form-urlencoded'},
    body: `Request=${encodeURIComponent(`<Request Type="GetBeachMatchList" Fields="No Status"><Filter TournamentNo="${tournamentId}" /></Request>`)}`
  });
  const text = await response.text();
  console.log(`Tournament ${tournamentId}: ${(text.match(/<BeachMatch/g) || []).length} matches`);
  return text;
}
```

### 2. Response Analysis
Check response structure:

```javascript
// Check if response is SOAP or direct XML
if (responseText.includes('soap:Envelope')) {
  console.log('SOAP format - need to extract inner XML');
} else if (responseText.includes('<BeachMatches>')) {
  console.log('Direct XML format - ready to parse');
}
```

### 3. Error Codes
Common VIS API error patterns:
- Empty response: Tournament exists but no matches
- `<BeachMatches NbItems="0" />`: Valid request but no results
- Timeout: Network/CORS issues or invalid request
- SOAP fault: Invalid request format or parameters

## Performance Optimization

### 1. Field Selection
Only request needed fields:
```xml
<!-- Basic match list -->
Fields="No LocalDate LocalTime Status Court TeamAName TeamBName"

<!-- With scores -->
Fields="No LocalDate LocalTime Status Court TeamAName TeamBName MatchPointsA MatchPointsB"

<!-- With referees -->
Fields="No LocalDate LocalTime Status Court TeamAName TeamBName Referee1Name Referee2Name"
```

### 2. Caching Strategy
- Cache tournament lists for 6 hours
- Cache match data for 30 minutes (more dynamic)
- Use match Status field to determine cache validity

### 3. Progressive Loading
- Load basic info first (No, Date, Time, Status)
- Load detailed info on demand (scores, referees, stats)
- Implement virtual scrolling for large match lists

## Testing Commands

### Browser Console Tests
```javascript
// Test tournament 1602 (known working)
quickTest('1602');

// Get tournament list
async function getTournaments() {
  const response = await fetch('https://www.fivb.org/Vis2009/XmlRequest.asmx', {
    method: 'POST',
    headers: {'Content-Type': 'application/x-www-form-urlencoded'},
    body: 'Request=' + encodeURIComponent('<Request Type="GetEventList" Fields="No Name Code StartDate EndDate"><Filter HasBeachTournament="True" /></Request>')
  });
  const text = await response.text();
  console.log('Tournaments found:', (text.match(/<Event/g) || []).length);
  return text;
}
```

---

**Last Updated**: August 21, 2025  
**Status**: ✅ Match loading issue resolved - EventNo works directly as TournamentNo