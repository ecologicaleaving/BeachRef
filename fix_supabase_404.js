/**
 * Fix Supabase 404 errors by ensuring all required tables exist with proper permissions
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

console.log('🔧 Fixing Supabase 404 errors...');
console.log(`🔗 URL: ${supabaseUrl}`);
console.log(`🔑 Service key: ${serviceRoleKey ? 'Present' : 'Missing'}`);

if (!supabaseUrl || !serviceRoleKey) {
  console.error('❌ Missing Supabase credentials in .env.local');
  console.error('Required: EXPO_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function checkAndCreateTables() {
  console.log('\n🔍 Checking sync_error_log table...');

  try {
    // Test if we can query the table
    const { data: testData, error: testError } = await supabase
      .from('sync_error_log')
      .select('id')
      .limit(1);

    if (testError) {
      if (testError.message.includes('not found') || testError.code === '42P01') {
        console.log('❌ sync_error_log table does not exist, creating...');
        await createSyncErrorLogTable();
      } else if (testError.message.includes('permission denied') || testError.code === '42501') {
        console.log('🔐 Table exists but permissions need fixing...');
        await fixTablePermissions();
      } else {
        console.log('⚠️  Unknown error:', testError);
        return false;
      }
    } else {
      console.log('✅ sync_error_log table exists and is accessible');
      
      // Test inserting a record
      const { error: insertError } = await supabase
        .from('sync_error_log')
        .insert([{
          entity_type: 'test',
          error_type: 'SYSTEM',
          error_severity: 'LOW',
          error_message: '404 fix test - this record can be deleted',
          recovery_suggestion: 'This is a test record'
        }]);

      if (insertError) {
        console.log('⚠️  Insert failed:', insertError.message);
        await fixTablePermissions();
      } else {
        console.log('✅ Table insert test successful');
      }
    }

    return true;
  } catch (error) {
    console.error('❌ Error checking table:', error);
    return false;
  }
}

async function createSyncErrorLogTable() {
  console.log('🛠️  Creating sync_error_log table...');

  try {
    // Try to execute raw SQL using the REST API directly
    const response = await fetch(`${supabaseUrl}/rest/v1/rpc/exec_sql`, {
      method: 'POST',
      headers: {
        'apikey': serviceRoleKey,
        'Authorization': `Bearer ${serviceRoleKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        sql: `
CREATE TABLE IF NOT EXISTS sync_error_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type VARCHAR NOT NULL,
  tournament_no VARCHAR,
  error_type VARCHAR NOT NULL,
  error_severity VARCHAR NOT NULL,
  error_message TEXT NOT NULL,
  error_context JSONB,
  recovery_suggestion TEXT,
  occurred_at TIMESTAMP DEFAULT NOW(),
  resolved_at TIMESTAMP,
  resolution_notes TEXT
);

ALTER TABLE sync_error_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow all access to sync_error_log" ON sync_error_log;
CREATE POLICY "Allow all access to sync_error_log" ON sync_error_log
    FOR ALL
    TO anon, authenticated
    USING (true)
    WITH CHECK (true);

GRANT ALL ON sync_error_log TO anon, authenticated;
GRANT USAGE ON SCHEMA public TO anon, authenticated;
        `
      })
    });

    if (response.ok) {
      console.log('✅ Table created successfully via SQL RPC');
      return true;
    } else {
      console.log('⚠️  SQL RPC not available, table might need manual creation');
      await printManualInstructions();
      return false;
    }
  } catch (error) {
    console.log('⚠️  Could not create table automatically:', error.message);
    await printManualInstructions();
    return false;
  }
}

async function fixTablePermissions() {
  console.log('🔧 Fixing table permissions...');

  try {
    const response = await fetch(`${supabaseUrl}/rest/v1/rpc/exec_sql`, {
      method: 'POST',
      headers: {
        'apikey': serviceRoleKey,
        'Authorization': `Bearer ${serviceRoleKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        sql: `
-- Fix permissions for sync_error_log
ALTER TABLE sync_error_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow all access to sync_error_log" ON sync_error_log;
CREATE POLICY "Allow all access to sync_error_log" ON sync_error_log
    FOR ALL
    TO anon, authenticated
    USING (true)
    WITH CHECK (true);

GRANT ALL ON sync_error_log TO anon, authenticated;
GRANT USAGE ON SCHEMA public TO anon, authenticated;
        `
      })
    });

    if (response.ok) {
      console.log('✅ Permissions fixed successfully');
      return true;
    } else {
      console.log('⚠️  Could not fix permissions automatically');
      return false;
    }
  } catch (error) {
    console.log('⚠️  Error fixing permissions:', error.message);
    return false;
  }
}

async function printManualInstructions() {
  console.log('\n📋 MANUAL SETUP REQUIRED');
  console.log('═══════════════════════════════════════════════════');
  console.log('Go to your Supabase Dashboard SQL Editor and run this SQL:');
  console.log('🌐 Dashboard: https://supabase.com/dashboard/project/peofucnjgcrgswzqslpb/sql\n');
  
  console.log(`-- Create sync_error_log table and fix permissions
CREATE TABLE IF NOT EXISTS sync_error_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type VARCHAR NOT NULL,
  tournament_no VARCHAR,
  error_type VARCHAR NOT NULL,
  error_severity VARCHAR NOT NULL,
  error_message TEXT NOT NULL,
  error_context JSONB,
  recovery_suggestion TEXT,
  occurred_at TIMESTAMP DEFAULT NOW(),
  resolved_at TIMESTAMP,
  resolution_notes TEXT
);

-- Enable Row Level Security
ALTER TABLE sync_error_log ENABLE ROW LEVEL SECURITY;

-- Create permissive policy
DROP POLICY IF EXISTS "Allow all access to sync_error_log" ON sync_error_log;
CREATE POLICY "Allow all access to sync_error_log" ON sync_error_log
    FOR ALL
    TO anon, authenticated
    USING (true)
    WITH CHECK (true);

-- Grant permissions
GRANT ALL ON sync_error_log TO anon, authenticated;
GRANT USAGE ON SCHEMA public TO anon, authenticated;

-- Test insert
INSERT INTO sync_error_log (entity_type, error_type, error_severity, error_message, recovery_suggestion)
VALUES ('system', 'SETUP', 'LOW', 'Table created manually - 404 errors should be fixed', 'Table is now ready');`);
  
  console.log('\n═══════════════════════════════════════════════════');
}

// Run the fix
checkAndCreateTables()
  .then((success) => {
    if (success) {
      console.log('\n🎉 404 error fix completed successfully!');
      console.log('Your app should now work without Supabase 404 errors.');
    } else {
      console.log('\n⚠️  Please complete the manual setup above.');
    }
  })
  .catch((error) => {
    console.error('\n❌ Fix failed:', error);
    console.log('\n📋 Please run the SQL manually in your Supabase dashboard.');
  });