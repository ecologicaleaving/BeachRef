// Fix referee ID mismatch - update test referees to match what the app is looking for
require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.EXPO_PUBLIC_SUPABASE_URL,
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY
);

async function fixRefereeIds() {
  console.log('🔧 Fixing Referee ID Mismatch');
  console.log('===============================');
  
  // First, check current data
  console.log('\n📊 Current database state:');
  const { data: currentReferees } = await supabase
    .from('referees')
    .select('*');
  
  const { data: currentAnalytics } = await supabase
    .from('referee_analytics')
    .select('*');
  
  console.log('Current referees:', currentReferees);
  console.log('Current analytics:', currentAnalytics);
  
  // Update the referees table with VIS-style referee IDs
  console.log('\n🔄 Updating referees with VIS-style names...');
  
  // Update referee 1 to match "Myszkowska Agnieszka"
  await supabase
    .from('referees')
    .update({
      first_name: 'Myszkowska',
      last_name: 'Agnieszka',
      referee_id: 'Myszkowska Agnieszka'
    })
    .eq('id', 1);
  
  // Update referee 2 to match "Carvalho Rui Jorge"  
  await supabase
    .from('referees')
    .update({
      first_name: 'Carvalho',
      last_name: 'Rui Jorge',
      referee_id: 'Carvalho Rui Jorge'
    })
    .eq('id', 2);
  
  // Update referee 3 with another common referee name
  await supabase
    .from('referees')
    .update({
      first_name: 'Silva',
      last_name: 'Maria',
      referee_id: 'Silva Maria'
    })
    .eq('id', 3);
  
  console.log('✅ Updated referees table');
  
  // Now we need to update the match_referees table to use the referee names instead of IDs
  console.log('\n🔄 Updating match_referees to use referee names...');
  
  // Update match_referees to use the actual referee names as IDs
  await supabase
    .from('match_referees')
    .update({ referee_id: 'Myszkowska Agnieszka' })
    .eq('referee_id', 1);
  
  await supabase
    .from('match_referees')
    .update({ referee_id: 'Carvalho Rui Jorge' })
    .eq('referee_id', 2);
  
  await supabase
    .from('match_referees')
    .update({ referee_id: 'Silva Maria' })
    .eq('referee_id', 3);
  
  console.log('✅ Updated match_referees table');
  
  // Update referee_analytics to use the referee names as well
  console.log('\n🔄 Updating referee_analytics to use referee names...');
  
  await supabase
    .from('referee_analytics')
    .update({ referee_id: 'Myszkowska Agnieszka' })
    .eq('referee_id', 1);
  
  await supabase
    .from('referee_analytics')
    .update({ referee_id: 'Carvalho Rui Jorge' })
    .eq('referee_id', 2);
  
  await supabase
    .from('referee_analytics')
    .update({ referee_id: 'Silva Maria' })
    .eq('referee_id', 3);
  
  console.log('✅ Updated referee_analytics table');
  
  // Verify the fix
  console.log('\n✅ Verification:');
  const { data: updatedReferees } = await supabase
    .from('referees')
    .select('*');
  
  const { data: updatedAnalytics } = await supabase
    .from('referee_analytics')
    .select('*');
  
  const { data: updatedMatchReferees } = await supabase
    .from('match_referees')
    .select('*');
  
  console.log('Updated referees:', updatedReferees);
  console.log('Updated analytics:', updatedAnalytics);
  console.log('Updated match_referees:', updatedMatchReferees);
  
  // Test the query the app is making
  console.log('\n🎯 Testing app query:');
  const { data: testQuery, error: testError } = await supabase
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
    .in('referee_id', ['Myszkowska Agnieszka', 'Carvalho Rui Jorge']);
  
  if (testError) {
    console.error('❌ Test query error:', testError);
  } else {
    console.log('✅ Test query works!');
    console.log('Results:', testQuery);
  }
}

fixRefereeIds().catch(console.error);