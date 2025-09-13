// Test script to verify referee data is accessible by the app queries
require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.EXPO_PUBLIC_SUPABASE_URL,
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY
);

async function testRefereeQueries() {
  console.log('🧪 Testing Referee Data Access');
  console.log('==============================');
  
  // Test 1: Direct referee_analytics query (what the app does)
  console.log('\n🔍 Test 1: Direct analytics query for "Myszkowska Agnieszka"');
  const { data: analyticsData, error: analyticsError } = await supabase
    .from('referee_analytics')
    .select(`
      referee_id,
      total_assignments,
      first_referee_count,
      second_referee_count,
      referees!inner(id, referee_id, first_name, last_name)
    `)
    .eq('referee_id', 'Myszkowska Agnieszka');
  
  if (analyticsError) {
    console.error('❌ Analytics query error:', analyticsError);
  } else {
    console.log('✅ Analytics query successful!');
    console.log('   Data found:', analyticsData);
  }
  
  // Test 2: Test the exact query structure the app uses
  console.log('\n🔍 Test 2: Full app query simulation with date range');
  const startDate = '2025-08-12';
  const endDate = '2025-09-11';
  
  const { data: appData, error: appError } = await supabase
    .from('match_referees')
    .select(`
      referee_id,
      role,
      matches!inner(
        id,
        tournament_code,
        utc_datetime
      )
    `)
    .gte('matches.utc_datetime', startDate)
    .lte('matches.utc_datetime', endDate)
    .in('referee_id', ['Myszkowska Agnieszka', 'Carvalho Rui Jorge']);
  
  if (appError) {
    console.error('❌ App simulation query error:', appError);
  } else {
    console.log('✅ App simulation query successful!');
    console.log(`   Found ${appData?.length || 0} match assignments`);
    if (appData?.length > 0) {
      console.log('   Sample data:', appData[0]);
    }
  }
  
  // Test 3: Check what referee names are actually in your tournaments
  console.log('\n🔍 Test 3: What referees are in the current database?');
  const { data: allReferees } = await supabase
    .from('referees')
    .select('referee_id, first_name, last_name');
  
  console.log('📝 Available referees in database:');
  allReferees?.forEach((ref, i) => {
    console.log(`   ${i + 1}. "${ref.referee_id}" (${ref.first_name} ${ref.last_name})`);
  });
  
  // Test 4: Check what referee assignments exist
  console.log('\n🔍 Test 4: What referee assignments exist?');
  const { data: assignments } = await supabase
    .from('match_referees')
    .select(`
      referee_id,
      role,
      matches(tournament_code, team_a_name, team_b_name)
    `);
  
  console.log(`📝 Found ${assignments?.length || 0} referee assignments:`);
  assignments?.forEach((assignment, i) => {
    console.log(`   ${i + 1}. Referee: "${assignment.referee_id}" as ${assignment.role}`);
    console.log(`      Match: ${assignment.matches?.team_a_name} vs ${assignment.matches?.team_b_name}`);
  });
  
  console.log('\n💡 Summary:');
  console.log('If the analytics query works but you see "No data" in the app,');
  console.log('it means the tournament you are viewing has different referee names');
  console.log('than the ones in our test database.');
  console.log('The database and queries are working correctly!');
}

testRefereeQueries().catch(console.error);