# Edge Function Deployment Issue: match-schedule-sync Boot Error

## Problem Summary
Successfully deployed the `match-schedule-sync` Edge Function to Supabase, but it fails to start with `BOOT_ERROR` when invoked.

## Current Status
- ✅ **Edge Function deployed**: Successfully uploaded via `supabase functions deploy`
- ✅ **Authentication working**: Function accepts service role key
- ❌ **Function boot failure**: Returns `{"code":"BOOT_ERROR","message":"Function failed to start (please check logs)"}`
- ✅ **Fixed cross-function imports**: Moved `auth.ts` to `_shared/` directory as per Davide's advice
- ❌ **Smoke test fails**: Even minimal function times out (2+ minutes)

## Deployment Details
```bash
# Successful deployment command
supabase functions deploy match-schedule-sync --project-ref peofucnjgcrgswzqslpb

# Files uploaded:
- supabase/functions/match-schedule-sync/deno.json
- supabase/functions/match-schedule-sync/index.ts
- supabase/functions/match-schedule-sync/cache.ts
- supabase/functions/match-schedule-sync/sync.ts
- supabase/functions/tournament-master-sync/auth.ts
```

## Function Architecture
The Edge Function is designed to:
1. Authenticate with FIVB VIS API using credentials from Supabase vault
2. Discover active tournaments needing match synchronization
3. Fetch match data from FIVB API with retry logic
4. Populate `matches` and `match_referees` tables
5. Update sync status and setup real-time subscriptions

## Potential Boot Error Causes

### 1. Missing Vault Credentials
The function tries to retrieve FIVB API credentials:
```typescript
const credentials = await getFIVBCredentialsFromVault(supabase);
if (!credentials) {
  throw new Error('Failed to retrieve FIVB API credentials');
}
```

**Issue**: Supabase vault might not have the required FIVB credentials configured.

### 2. Missing Dependencies
The function imports from multiple modules:
```typescript
import { FIVBAuthenticator, getFIVBCredentialsFromVault } from '../tournament-master-sync/auth.ts'
import { MatchSynchronizer } from './sync.ts'
import { CacheManager } from './cache.ts'
```

**Issue**: Cross-function imports or missing type definitions might cause boot failures.

### 3. Environment Variables
The function expects Supabase environment variables:
```typescript
const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
```

**Issue**: These might not be automatically available in the Edge Function environment.

### 4. Database Schema Dependencies
The function expects specific database tables and structures:
- `matches` table with normalized schema
- `match_referees` table for referee assignments
- `sync_status` table for tracking sync operations

**Issue**: Required tables or RLS policies might not exist.

## Debugging Steps Needed

### 1. Check Function Logs
- Go to Supabase Dashboard > Functions > match-schedule-sync > Logs
- Look for specific boot error details and stack traces

### 2. Verify Vault Configuration
```sql
-- Check if vault secrets exist
SELECT name FROM vault.secrets WHERE name LIKE '%fivb%';
```

### 3. Test Environment Variables
Create a minimal test function to verify environment access:
```typescript
export default function handler() {
  return new Response(JSON.stringify({
    hasUrl: !!Deno.env.get('SUPABASE_URL'),
    hasKey: !!Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  }));
}
```

### 4. Verify Database Schema
```sql
-- Check required tables exist
SELECT table_name FROM information_schema.tables
WHERE table_name IN ('matches', 'match_referees', 'sync_status');
```

## Workaround Options

### Option 1: Simplified Test Function
Deploy a minimal version that just returns success to test deployment process.

### Option 2: Manual Data Insertion
Temporarily insert test match data directly into database tables to test the recent matches feature.

### Option 3: Direct API Integration
Bypass Edge Function and call FIVB API directly from the client app until sync function is resolved.

## Questions for Investigation
1. **Vault Setup**: Are FIVB API credentials properly stored in Supabase vault?
2. **Database Schema**: Have all required tables been created with proper schema?
3. **RLS Policies**: Are Row Level Security policies preventing database access?
4. **Function Logs**: What specific error appears in the Supabase function logs?
5. **Environment**: Are Supabase environment variables automatically injected into Edge Functions?

## Files Involved
- `supabase/functions/match-schedule-sync/index.ts` - Main function entry point
- `supabase/functions/match-schedule-sync/sync.ts` - Match synchronization logic
- `supabase/functions/tournament-master-sync/auth.ts` - FIVB authentication
- `supabase/functions/match-schedule-sync/deploy.sql` - CRON job setup (not run yet)

## Test Command Used
```bash
curl -X POST "https://peofucnjgcrgswzqslpb.supabase.co/functions/v1/match-schedule-sync" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer [service-role-key]" \
  -d '{"trigger": "manual", "timestamp": "2025-01-15T10:00:00Z"}'
```

**Result**: `{"code":"BOOT_ERROR","message":"Function failed to start (please check logs)"}`

## UPDATE: Davide's Fix Applied + New Discovery

Following Davide's excellent diagnosis, we implemented the fix for cross-function imports:

1. ✅ **Created `supabase/functions/_shared/auth.ts`**
2. ✅ **Updated import to use `'../_shared/auth.ts'`**
3. ✅ **Added `deno.json` with proper npm imports**
4. ✅ **Deployed successfully**

**However**: Even a minimal smoke test times out (2+ minutes):

```typescript
console.log("match-schedule-sync boot OK");

Deno.serve(() => {
  console.log("Handler called successfully");
  return Response.json({
    hasUrl: !!Deno.env.get("SUPABASE_URL"),
    hasSrv: !!Deno.env.get("SUPABASE_SERVICE_ROLE_KEY"),
    message: "Smoke test successful"
  });
});
```

**This suggests the issue is deeper than import problems - possibly:**
- Supabase project configuration
- Edge Function runtime environment
- Network/routing issues
- Project limits or quotas

---

## ✅ RESOLVED! Following Davide's Binary Test Strategy

**SUCCESS:** Davide's diagnostic approach worked perfectly!

### What We Discovered:

1. **✅ Platform works fine** - Simple `zz-ping` function responded immediately with `HTTP 200 OK`
2. **✅ All imports work** - Progressive testing showed Supabase, auth, cache, and sync imports all loaded successfully
3. **❌ Complex logic was the culprit** - Adding business logic caused the BOOT_ERROR

### The Solution:

**Edge Function is now working perfectly!**
- All imports loaded successfully
- Function responds in ~1 second
- Ready for sync logic implementation

### Key Lessons:
1. **Binary testing strategy** identifies problems quickly
2. **Import separation** from business logic prevents bootstrap issues
3. **Gradual rebuilding** isolates the actual problem

### Current Status:
```json
{
  "hasUrl": true,
  "hasSrv": true,
  "hasClient": true,
  "message": "SUCCESS: Edge Function working! Ready to implement sync logic."
}
```

**Next Step:** Implement sync logic gradually, testing each addition to avoid reintroducing bootstrap issues.

**Grazie Davide!** 🚀 Your systematic approach solved what seemed like a complex platform issue.