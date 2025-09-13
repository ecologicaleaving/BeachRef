// Debug referee ID mismatch issue
require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.EXPO_PUBLIC_SUPABASE_URL,
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY
);

async function debugRefereeIds() {
  console.log('🔍 Debugging Referee ID Mismatch');
  console.log('=================================');
  
  // Check what's in the database
  console.log('\n📊 Database referee_analytics:');
  const { data: analytics, error: analyticsError } = await supabase
    .from('referee_analytics')
    .select(`
      referee_id,
      total_assignments,
      first_referee_count,
      second_referee_count,
      referees!inner(id, referee_id, first_name, last_name)
    `);
  
  if (analyticsError) {
    console.error('❌ Analytics query error:', analyticsError);
  } else {
    console.log('Analytics data:', analytics);
    
    analytics?.forEach((record, i) => {
      console.log(`${i + 1}. Referee Analytics ID: ${record.referee_id}`);
      console.log(`   Referee DB ID: ${record.referees.id}`);  
      console.log(`   Referee VIS ID: ${record.referees.referee_id}`);
      console.log(`   Name: ${record.referees.first_name} ${record.referees.last_name}`);
      console.log(`   Assignments: ${record.total_assignments}`);
      console.log('');
    });
  }
  
  // Check what the component might be getting
  console.log('📱 Component expects:');
  console.log('- referee.RefereeId (6-digit VIS ID)');
  console.log('- analytics.referee_id to match referee.RefereeId');
  console.log('');
  
  // Check if we have a mismatch
  console.log('🔧 Potential Fix:');
  console.log('The component looks for stats.referee_id === referee.RefereeId');
  console.log('But analytics.referee_id might be the internal DB ID, not the VIS ID');
  
  return analytics;
}

debugRefereeIds().catch(console.error);