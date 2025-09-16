-- Manual trigger for match-schedule-sync function
-- Run this in Supabase Dashboard > SQL Editor

-- IMPORTANT: Replace 'YOUR_SERVICE_ROLE_KEY_HERE' with your actual service role key
-- Get it from: Supabase Dashboard > Settings > API > service_role (secret)

-- Method 1: Direct function call (Replace the key!)
SELECT net.http_post(
  'https://peofucnjgcrgswzqslpb.supabase.co/functions/v1/match-schedule-sync',
  jsonb_build_object(
    'Content-Type', 'application/json',
    'Authorization', 'Bearer YOUR_SERVICE_ROLE_KEY_HERE'
  ),
  jsonb_build_object(
    'trigger', 'manual',
    'timestamp', now()
  )
);

-- Alternative Method: Use current user context (if you're authenticated as service role)
SELECT net.http_post(
  'https://peofucnjgcrgswzqslpb.supabase.co/functions/v1/match-schedule-sync',
  jsonb_build_object(
    'Content-Type', 'application/json'
  ),
  jsonb_build_object(
    'trigger', 'manual',
    'timestamp', now()
  )
);

-- OPTION 2: Alternative - Call Edge Function directly via curl/HTTP
-- Use this URL in your browser or API client:
-- POST https://peofucnjgcrgswzqslpb.supabase.co/functions/v1/match-schedule-sync
-- Headers:
--   Content-Type: application/json
--   Authorization: Bearer [your-service-role-key]
-- Body: {"trigger": "manual", "timestamp": "2025-01-15T10:00:00Z"}

-- This will:
-- 1. Call the match-schedule-sync function
-- 2. Sync matches from FIVB VIS API
-- 3. Populate the matches and match_referees tables
-- 4. Should make recent matches appear in the app