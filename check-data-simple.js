// Simple data check script
require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.EXPO_PUBLIC_SUPABASE_URL,
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY
);

async function checkCurrentData() {
  console.log('🔍 Checking current database data...\n');
  
  // Check referee_analytics data (what the app uses)
  console.log('📊 REFEREE_ANALYTICS table:');
  const { data: analytics, error: analyticsError } = await supabase
    .from('referee_analytics')
    .select('*');
  
  if (analyticsError) {
    console.error('❌ Analytics error:', analyticsError.message);
  } else {
    console.log(`   Found ${analytics?.length || 0} records`);
    analytics?.forEach((record, i) => {
      console.log(`   ${i + 1}. Referee ID: ${record.referee_id} | Assignments: ${record.total_assignments} | R1: ${record.first_referee_count} | R2: ${record.second_referee_count}`);
    });
  }
  
  // Check referees table
  console.log('\n👤 REFEREES table:');
  const { data: referees, error: refereesError } = await supabase
    .from('referees')
    .select('id, referee_id, first_name, last_name');
  
  if (refereesError) {
    console.error('❌ Referees error:', refereesError.message);
  } else {
    console.log(`   Found ${referees?.length || 0} records`);
    referees?.forEach((record, i) => {
      console.log(`   ${i + 1}. ID: ${record.id} | VIS ID: ${record.referee_id} | Name: ${record.first_name} ${record.last_name}`);
    });
  }
  
  // Try the exact query the app is using
  console.log('\n🎯 TESTING APP QUERY:');
  console.log('   Simulating useRefereeAnalytics query...');
  
  // The app looks for referee analytics with specific filters
  const { data: appData, error: appError } = await supabase
    .from('referee_analytics')
    .select(`
      referee_id,
      total_assignments,
      first_referee_count,
      second_referee_count,
      referees!inner(id, referee_id, first_name, last_name)
    `);
  
  if (appError) {
    console.error('❌ App query error:', appError.message);
    
    // Try simpler version
    console.log('   Trying simpler query...');
    const { data: simpleData, error: simpleError } = await supabase
      .from('referee_analytics')
      .select('referee_id, total_assignments, first_referee_count, second_referee_count');
    
    if (simpleError) {
      console.error('❌ Simple query error:', simpleError.message);
    } else {
      console.log('✅ Simple query works:', simpleData);
    }
  } else {
    console.log('✅ App query works!');
    console.log('   Data available for app:', appData);
    
    // Check if this matches what the component expects
    if (appData?.length > 0) {
      console.log('\n🎯 COMPONENT MATCHING TEST:');
      console.log('   The component looks for: stats.referee_id === referee.RefereeId');
      console.log(`   Available referee_id values: ${appData.map(d => d.referee_id).join(', ')}`);
      console.log('   ⚠️  Make sure your component referee.RefereeId matches one of these values!');
    }
  }
}

checkCurrentData().catch(console.error);