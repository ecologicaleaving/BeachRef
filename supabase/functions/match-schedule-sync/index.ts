// Progressive rebuild following Davide's advice
// Phase 5: ALL imports loaded successfully

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { FIVBAuthenticator, getFIVBCredentialsFromVault, type FIVBCredentials } from '../_shared/auth.ts'
import { CacheManager } from './cache.ts'
import { MatchSynchronizer, type FIVBMatch, type MatchSyncResult, type ActiveTournament } from './sync.ts'

console.log("match-schedule-sync boot OK - ALL imports loaded");

Deno.serve(async (req) => {
  try {
    console.log("Handler called successfully");

    const body = await req.json().catch(() => ({}));

    // Test creating client (but don't call it)
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    return Response.json({
      hasUrl: !!supabaseUrl,
      hasSrv: !!supabaseServiceKey,
      hasClient: !!supabase,
      body,
      message: "SUCCESS: Edge Function working! Ready to implement sync logic."
    });

  } catch (e) {
    console.error("Error:", e);
    return Response.json({ error: e.message }, { status: 500 });
  }
});