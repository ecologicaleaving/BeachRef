/**
 * Supabase Connection Test Script
 * Run this to verify your new Supabase configuration works properly
 */

const { createClient } = require('@supabase/supabase-js');

// Load environment variables
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

console.log('🏗️ Testing Supabase Connection...\n');

console.log('Configuration:');
console.log(`URL: ${supabaseUrl}`);
console.log(`Key: ${supabaseKey ? supabaseKey.substring(0, 20) + '...' : 'NOT SET'}\n`);

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase configuration!');
  console.error('Please check your .env.local file has:');
  console.error('EXPO_PUBLIC_SUPABASE_URL=https://peofucnjgcrgswzqslpb.supabase.co');
  console.error('EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function testConnection() {
  try {
    console.log('🔗 Testing basic connection...');
    
    // Test 1: Basic connection with health check
    const { data: healthData, error: healthError } = await supabase
      .from('tournaments')
      .select('count', { count: 'exact', head: true });
    
    if (healthError) {
      console.error('❌ Connection failed:', healthError.message);
      
      if (healthError.message.includes('relation "tournaments" does not exist')) {
        console.log('\n📋 Tables not created yet. Please run the setup schema first:');
        console.log('1. Go to your Supabase dashboard');
        console.log('2. Open SQL Editor');
        console.log('3. Run the contents of scripts/setup-supabase-schema.sql');
      }
      return false;
    }
    
    console.log('✅ Basic connection successful!');
    console.log(`📊 Found ${healthData || 0} tournaments in database\n`);
    
    // Test 2: Insert test data
    console.log('📝 Testing data insertion...');
    const testTournament = {
      id: `test_${Date.now()}`,
      vis_no: `TEST${Date.now()}`,
      code: 'CONNTEST2025',
      name: 'Connection Test Tournament',
      gender: 'Mixed',
      tournament_type: 'LOCAL',
      status: 'upcoming',
      dates: {
        start: '2025-08-25',
        end: '2025-08-27'
      }
    };
    
    const { data: insertData, error: insertError } = await supabase
      .from('tournaments')
      .insert(testTournament)
      .select();
    
    if (insertError) {
      console.error('❌ Insert failed:', insertError.message);
      return false;
    }
    
    console.log('✅ Data insertion successful!');
    console.log('📄 Inserted tournament:', insertData[0]?.name);
    
    // Test 3: Query test data
    console.log('\n🔍 Testing data retrieval...');
    const { data: queryData, error: queryError } = await supabase
      .from('tournaments')
      .select('*')
      .eq('tournament_type', 'LOCAL')
      .limit(5);
    
    if (queryError) {
      console.error('❌ Query failed:', queryError.message);
      return false;
    }
    
    console.log('✅ Data retrieval successful!');
    console.log(`📊 Found ${queryData.length} LOCAL tournaments`);
    
    // Test 4: Clean up test data
    await supabase
      .from('tournaments')
      .delete()
      .eq('id', testTournament.id);
    
    console.log('\n🎉 All tests passed! Supabase is ready for BeachRef.');
    console.log('\n📋 Next steps:');
    console.log('1. Restart your development server');
    console.log('2. The cache will now use Supabase as Tier 3');
    console.log('3. Monitor console logs for "Supabase enabled" message');
    
    return true;
    
  } catch (error) {
    console.error('❌ Connection test failed:', error.message);
    return false;
  }
}

testConnection().then(success => {
  process.exit(success ? 0 : 1);
});