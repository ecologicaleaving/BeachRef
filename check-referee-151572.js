const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function checkReferee151572() {
  // Check if 151572 exists by vis_referee_no or referee_id
  const { data: existingRef } = await supabase
    .from('referees')
    .select('*')
    .or('vis_referee_no.eq.151572,referee_id.eq.151572,id.eq.151572');

  console.log('Referee 151572 exists:', existingRef?.length || 0);
  if (existingRef && existingRef.length > 0) {
    console.log('Found:', existingRef[0]);
  }

  // Let's also see what other referees exist
  const { data: allRefs } = await supabase
    .from('referees')
    .select('id, vis_referee_no, referee_id, first_name, last_name')
    .limit(5);

  console.log('\nExisting referees:');
  allRefs?.forEach(r => {
    console.log(`  - ID: ${r.id}, VIS: ${r.vis_referee_no}, RefID: ${r.referee_id}, Name: ${r.first_name} ${r.last_name}`);
  });
}

checkReferee151572().catch(console.error);