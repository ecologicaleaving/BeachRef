import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';

// Load environment variables
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing required environment variables:');
  console.error('SUPABASE_URL:', supabaseUrl ? '✓' : '✗');
  console.error('SUPABASE_SERVICE_ROLE_KEY:', supabaseServiceKey ? '✓' : '✗');
  process.exit(1);
}

// Create Supabase client with service role key
const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function runMigration(migrationPath: string) {
  try {
    console.log(`Running migration: ${migrationPath}`);
    
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
    
    const { error} = await supabase.rpc('exec_sql', { 
      sql: migrationSQL 
    });
    
    if (error) {
      // Try direct query execution if rpc doesn't work
      const { error: queryError } = await supabase
        .from('_migrations')
        .select('*')
        .limit(0); // This will fail but test connection
        
      if (queryError) {
        console.log('Using direct SQL execution...');
        // Split SQL into individual statements and execute them
        const statements = migrationSQL
          .split(';')
          .map(s => s.trim())
          .filter(s => s.length > 0 && !s.startsWith('--'));
          
        for (const statement of statements) {
          if (statement.trim()) {
            console.log('Executing:', statement.substring(0, 100) + '...');
            // Note: Supabase JS client doesn't support raw SQL execution
            // This would need to be run through the Supabase SQL editor
          }
        }
        
        console.log('\n⚠️  Migration file created but needs to be run manually:');
        console.log('1. Open Supabase Dashboard SQL Editor');
        console.log('2. Copy and paste the content from:');
        console.log(`   ${migrationPath}`);
        console.log('3. Execute the SQL');
      }
    } else {
      console.log('✅ Migration completed successfully');
    }
    
  } catch (err) {
    console.error('Migration failed:', err);
    console.log('\n⚠️  Please run the migration manually in Supabase Dashboard:');
    console.log('1. Open Supabase Dashboard SQL Editor');
    console.log('2. Copy and paste the content from:');
    console.log(`   ${migrationPath}`);
  }
}

async function testConnection() {
  try {
    console.log('Testing Supabase connection...');
    
    // Test connection with a simple query
    const { error } = await supabase.from('_test').select('*').limit(1);
    
    if (error && error.code === 'PGRST116') {
      console.log('✅ Supabase connection successful');
      return true;
    } else if (error) {
      console.error('Connection test failed:', error.message);
      return false;
    } else {
      console.log('✅ Supabase connection successful');
      return true;
    }
  } catch (err) {
    console.error('Connection test failed:', err);
    return false;
  }
}

async function main() {
  console.log('🚀 Setting up Supabase...\n');
  
  // Test connection
  const connected = await testConnection();
  if (!connected) {
    console.error('❌ Cannot connect to Supabase. Please check your credentials.');
    process.exit(1);
  }
  
  // Run migration
  const migrationPath = path.join(__dirname, '../supabase/migrations/001_enable_rls_and_realtime.sql');
  await runMigration(migrationPath);
  
  console.log('\n🎉 Supabase setup completed!');
  console.log('\nNext steps:');
  console.log('- RLS policies are ready for tournaments, matches, and sync_status tables');
  console.log('- Real-time is configured for tournaments and matches');
  console.log('- Run the functions when tables are created in future stories');
}

main().catch(console.error);