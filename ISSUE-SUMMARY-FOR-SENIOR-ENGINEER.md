# Technical Issue Summary: Recent Matches Not Populating in Referee Stats Panel

## Problem Overview
We successfully implemented a unified data fetching approach for referee stats, but the "recent matches" section remains empty despite having matches in the database.

## Current Status
- ✅ **Database connection working**: `✅ Table 'matches' exists with 10 rows`
- ✅ **Stats calculation working**: Shows `{totalMatches: 21, matchesAsFirst: 9, matchesAsSecond: 12}`
- ❌ **Recent matches empty**: `recentMatches: Array(0)`

## Architecture Context

### Database Schema (Normalized)
```sql
-- Main matches table
CREATE TABLE matches (
  id bigint PRIMARY KEY,
  vis_match_no bigint,
  tournament_code text,
  utc_datetime timestamptz,
  court text,
  status text,
  round_name text,
  team_a_name text,
  team_b_name text,
  -- No direct referee fields
);

-- Separate referee assignments table
CREATE TABLE match_referees (
  match_id bigint REFERENCES matches(id),
  referee_id bigint REFERENCES referees(id),
  role text CHECK (role IN ('FIRST','SECOND','CHALLENGE')),
  PRIMARY KEY (match_id, role)
);
```

### Data Flow Issue
1. **CacheService.getMatches()** returns raw database matches (no referee info)
2. **RefereeStatsService** tries to filter matches by referee
3. **Problem**: Database matches don't include `refereeAssignments` property
4. **Solution Attempted**: Query `match_referees` table directly

## Code Implementation

### Current Approach (RefereeStatsService.ts:320-390)
```typescript
if (matchesResult.source === 'database') {
  // Query match_referees table with join
  const { data: refereeAssignments, error } = await supabase
    .from('match_referees')
    .select(`
      match_id, role,
      matches (id, vis_match_no, tournament_code, utc_datetime, court, status, round_name, team_a_name, team_b_name)
    `)
    .eq('matches.tournament_code', tournamentNo)  // Filter by tournament
    .eq('referee_id', refereeId);                 // Filter by referee
}
```

## Debugging Information Needed

### Console Logs to Check
1. `🔍 Sample match data:` - Shows structure of database matches
2. `🔍 Data source:` - Should show "database"
3. `🔍 Database matches detected, querying match_referees table directly`
4. `✅ Found referee assignments from database: N` - Shows count found

### Potential Issues

#### 1. **Referee ID Mismatch**
- **Query uses**: `referee_id = '151572'` (string)
- **Database expects**: Could be integer or different format
- **Check**: What's the actual data type of `match_referees.referee_id`?

#### 2. **Tournament Code Mismatch**
- **Query uses**: `tournament_code = '1552'`
- **Database has**: Might be different format or field name
- **Check**: What values are actually in `matches.tournament_code`?

#### 3. **Empty Tables**
- **Possibility**: `match_referees` table might be empty
- **Check**: `SELECT COUNT(*) FROM match_referees`

#### 4. **RLS Policies**
- **Issue**: Row Level Security might block the query
- **Check**: Are RLS policies too restrictive for anonymous access?

## Diagnostic Queries Needed

### Database Investigation
```sql
-- 1. Check if match_referees table has data
SELECT COUNT(*) FROM match_referees;

-- 2. Check referee_id format in match_referees
SELECT DISTINCT referee_id, pg_typeof(referee_id) FROM match_referees LIMIT 5;

-- 3. Check tournament_code values in matches
SELECT DISTINCT tournament_code FROM matches WHERE tournament_code LIKE '%1552%';

-- 4. Check if specific referee has any assignments
SELECT * FROM match_referees WHERE referee_id = '151572' OR referee_id = 151572;

-- 5. Manual join test
SELECT mr.*, m.tournament_code, m.vis_match_no
FROM match_referees mr
JOIN matches m ON mr.match_id = m.id
WHERE m.tournament_code = '1552'
LIMIT 5;
```

### Code Investigation
- **Add more debug logs** in the query section
- **Log the actual query parameters** being used
- **Log the raw query result** before transformation

## Temporary Workaround
Since stats are working via VIS API fallback, the core functionality works. Recent matches could temporarily use the same VIS API approach until database query is fixed.

## Questions for Senior Engineer
1. **Data Integrity**: Are `match_referees` records actually being created by the sync process?
2. **Schema Validation**: Should we verify the actual database schema vs. migration files?
3. **Alternative Approach**: Would it be better to modify the database query to include referee info directly?
4. **Testing Strategy**: Should we add integration tests for the referee assignment queries?

---

**Files involved:**
- `services/RefereeStatsService.ts` (lines 320-390)
- `services/DualReadService.ts` (database queries)
- `supabase/migrations/008_create_match_schema.sql` (schema definition)

**Test scenario:**
- Referee ID: `151572`
- Tournament: `1552`
- Expected: Show last 3 matches for this referee
- Actual: Empty array