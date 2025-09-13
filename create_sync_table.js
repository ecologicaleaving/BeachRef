/**
 * Create sync_error_log table in Supabase
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

console.log('🔧 Creating sync_error_log table...');

if (!supabaseUrl || !serviceRoleKey) {
  console.error('❌ Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey);

async function createTable() {
  try {
    // Execute SQL to create table
    const { data, error } = await supabase.rpc('sql', {
      query: `
        -- Create the table
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
      `
    });

    if (error) {
      console.log('❌ SQL RPC failed, trying direct API call...');
      await createViaAPI();
    } else {
      console.log('✅ Table created successfully via SQL RPC');
      await testTable();
    }
  } catch (error) {
    console.log('❌ Error:', error.message);
    await createViaAPI();
  }
}

async function createViaAPI() {
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
      console.log('✅ Table created successfully via API');
      await testTable();
    } else {
      const errorText = await response.text();
      console.log('❌ API call failed:', errorText);
      printManualInstructions();
    }
  } catch (error) {
    console.log('❌ API call failed:', error.message);
    printManualInstructions();
  }
}

async function testTable() {
  try {
    // Test inserting a record
    const { error } = await supabase
      .from('sync_error_log')
      .insert([{
        entity_type: 'test',
        error_type: 'SYSTEM',
        error_severity: 'LOW',
        error_message: 'Table creation test - this record can be deleted',
        recovery_suggestion: 'Table is working correctly'
      }]);

    if (error) {
      console.log('⚠️  Insert test failed:', error.message);
    } else {
      console.log('✅ Table insert test successful');
      console.log('🎉 404 errors should now be fixed!');
    }
  } catch (error) {
    console.log('⚠️  Error testing table:', error.message);
  }
}

function printManualInstructions() {
  console.log('\n📋 MANUAL SETUP REQUIRED');
  console.log('═══════════════════════════════════════════════════');
  console.log('Go to your Supabase Dashboard SQL Editor and run:');
  console.log('🌐 https://supabase.com/dashboard/project/peofucnjgcrgswzqslpb/sql\n');
  
  console.log(`CREATE TABLE IF NOT EXISTS sync_error_log (
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
GRANT USAGE ON SCHEMA public TO anon, authenticated;`);
}

createTable();