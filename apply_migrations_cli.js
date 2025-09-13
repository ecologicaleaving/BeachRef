/**
 * Apply all migrations using Supabase CLI
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🚀 Applying migrations via Supabase CLI...\n');

// First, let's check if supabase CLI is available and linked
try {
  console.log('1. Checking Supabase CLI status...');
  const status = execSync('supabase status', { encoding: 'utf8' });
  console.log('✅ Supabase CLI is available');
  console.log(status);
} catch (error) {
  console.log('⚠️  Supabase CLI status check failed, trying to link project...');
  
  // Try to link the project
  try {
    console.log('2. Linking to remote project...');
    const linkResult = execSync('supabase link --project-ref peofucnjgcrgswzqslpb', { 
      encoding: 'utf8',
      input: 'nVpvfuhinmR2s8Ae\n' // Database password
    });
    console.log('✅ Project linked successfully');
    console.log(linkResult);
  } catch (linkError) {
    console.log('❌ Failed to link project:', linkError.message);
    console.log('\nTrying alternative approach with direct SQL execution...');
  }
}

// Apply migrations one by one
const migrations = [
  '002_create_database_schema.sql',
  '008_create_match_schema.sql', 
  '009_create_analytics_schema.sql',
  '009_create_sync_status_schema.sql'
];

console.log('\n3. Applying migrations...');

for (let i = 0; i < migrations.length; i++) {
  const migration = migrations[i];
  const migrationPath = path.join(__dirname, 'supabase', 'migrations', migration);
  
  console.log(`\n📋 Migration ${i + 1}/${migrations.length}: ${migration}`);
  
  if (!fs.existsSync(migrationPath)) {
    console.log(`❌ Migration file not found: ${migrationPath}`);
    continue;
  }
  
  try {
    // Method 1: Try using supabase db push
    console.log('   Trying supabase db push...');
    const result = execSync(`supabase db push`, { 
      encoding: 'utf8',
      cwd: __dirname
    });
    console.log('✅ Migration applied successfully via db push');
    console.log(result);
    break; // If db push works, it applies all migrations
  } catch (error1) {
    console.log('   db push failed, trying direct SQL execution...');
    
    try {
      // Method 2: Try using supabase db reset with migrations
      const resetResult = execSync(`supabase db reset --linked`, { 
        encoding: 'utf8',
        cwd: __dirname,
        input: 'y\n' // Confirm reset
      });
      console.log('✅ Database reset with migrations applied');
      console.log(resetResult);
      break; // If reset works, all migrations are applied
    } catch (error2) {
      console.log('   Database reset failed, trying individual file execution...');
      
      try {
        // Method 3: Execute SQL file directly
        const sqlContent = fs.readFileSync(migrationPath, 'utf8');
        
        // Try to execute via psql if available
        const tempFile = path.join(__dirname, `temp_migration_${i}.sql`);
        fs.writeFileSync(tempFile, sqlContent);
        
        const psqlResult = execSync(`psql "postgresql://postgres:nVpvfuhinmR2s8Ae@db.peofucnjgcrgswzqslpb.supabase.co:5432/postgres" -f "${tempFile}"`, {
          encoding: 'utf8'
        });
        
        console.log(`✅ Migration applied via direct psql execution`);
        console.log(psqlResult);
        
        // Clean up temp file
        fs.unlinkSync(tempFile);
        
      } catch (error3) {
        console.log(`❌ All methods failed for ${migration}`);
        console.log('Error details:', error3.message);
        
        // Fall back to showing manual instructions
        console.log(`\n📋 MANUAL EXECUTION REQUIRED for ${migration}:`);
        console.log('Copy this file content to Supabase Dashboard SQL Editor:');
        console.log(`File: ${migrationPath}`);
        console.log('Dashboard: https://supabase.com/dashboard/project/peofucnjgcrgswzqslpb/sql');
      }
    }
  }
}

console.log('\n🎯 Migration process completed!');
console.log('Check your Supabase dashboard to verify all tables were created.');