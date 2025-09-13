-- Fix for analytics_events RLS policy issue
-- This resolves the 401 Unauthorized error when the contextual sync function
-- tries to log analytics events

-- Step 1: Check current policies (for reference)
-- SELECT * FROM pg_policies WHERE tablename = 'analytics_events';

-- Step 2: Drop the restrictive insert policy if it exists
DROP POLICY IF EXISTS "analytics_events_insert_policy" ON analytics_events;

-- Step 3: Create a more permissive public insert policy
-- This allows the Edge Functions to log analytics events without authentication restrictions
CREATE POLICY "analytics_events_public_insert" 
ON analytics_events 
FOR INSERT 
TO public 
WITH CHECK (true);

-- Step 4: Verify the policy was created
-- SELECT * FROM pg_policies WHERE tablename = 'analytics_events' AND cmd = 'INSERT';

-- Alternative: If you want to be more restrictive, you can use this policy instead:
-- This only allows inserts for specific event types
/*
CREATE POLICY "analytics_events_contextual_sync_insert" 
ON analytics_events 
FOR INSERT 
TO public 
WITH CHECK (event_type IN ('contextual_sync', 'tournament_sync', 'match_sync', 'referee_sync'));
*/