-- Manual trigger for the match-schedule-sync edge function
-- Run this in Supabase Dashboard > SQL Editor
--
-- DO NOT paste a service_role key into this file.
--     This file is tracked by git on a public repository. An earlier revision
--     told you to replace a placeholder with your real key inline — that is
--     exactly the habit that produced issue #56. Read the key from Supabase
--     Vault instead, so the secret never touches tracked source.
--
-- One-time setup (run once, from the SQL Editor, and never commit the value):
--
--     select vault.create_secret(
--       '<paste the service_role key here, in the SQL Editor only>',
--       'service_role_key',
--       'service_role key used by scheduled/manual edge function calls'
--     );
--
-- The project URL is not a secret and can stay inline.

-- Method 1: read the key from Vault (preferred)
select net.http_post(
  'https://peofucnjgcrgswzqslpb.supabase.co/functions/v1/match-schedule-sync',
  jsonb_build_object(
    'Content-Type', 'application/json',
    'Authorization', 'Bearer ' || (
      select decrypted_secret
      from vault.decrypted_secrets
      where name = 'service_role_key'
    )
  ),
  jsonb_build_object(
    'trigger', 'manual',
    'timestamp', now()
  )
);

-- Method 2: rely on the current authenticated role (no key material at all)
select net.http_post(
  'https://peofucnjgcrgswzqslpb.supabase.co/functions/v1/match-schedule-sync',
  jsonb_build_object(
    'Content-Type', 'application/json'
  ),
  jsonb_build_object(
    'trigger', 'manual',
    'timestamp', now()
  )
);

-- Method 3: call the edge function over HTTP from outside the database.
-- Keep the key in your shell environment, never in a file:
--
--     curl -X POST \
--       -H "Content-Type: application/json" \
--       -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY" \
--       -d '{"trigger":"manual"}' \
--       https://peofucnjgcrgswzqslpb.supabase.co/functions/v1/match-schedule-sync

-- Any of the above will:
-- 1. Call the match-schedule-sync function
-- 2. Sync matches from the FIVB VIS API
-- 3. Populate the matches and match_referees tables
-- 4. Make recent matches appear in the app
