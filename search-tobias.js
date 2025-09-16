const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function searchTobias() {
  console.log('🔍 Searching for Tobias Markfeld...');

  // Search by name
  const { data: byName } = await supabase
    .from('referees')
    .select('*')
    .or('first_name.ilike.%tobias%,last_name.ilike.%markfeld%,referee_id.ilike.%tobias%,referee_id.ilike.%markfeld%');

  console.log('Found by name:', byName?.length || 0);
  byName?.forEach(r => {
    console.log(`  - ID: ${r.id}, VIS: ${r.vis_referee_no}, RefID: ${r.referee_id}, Name: ${r.first_name} ${r.last_name}`);
  });

  // Search for 151572
  const { data: by151572 } = await supabase
    .from('referees')
    .select('*')
    .or('vis_referee_no.eq.151572,referee_id.eq.151572');

  console.log('\nFound 151572:', by151572?.length || 0);
  by151572?.forEach(r => {
    console.log(`  - ID: ${r.id}, VIS: ${r.vis_referee_no}, RefID: ${r.referee_id}, Name: ${r.first_name} ${r.last_name}`);
  });

  // Show all referees to see the pattern
  const { data: allRefs } = await supabase
    .from('referees')
    .select('*')
    .limit(10);

  console.log('\nAll referees:');
  allRefs?.forEach(r => {
    console.log(`  - ID: ${r.id}, VIS: ${r.vis_referee_no}, RefID: ${r.referee_id}, Name: ${r.first_name} ${r.last_name}`);
  });
}

searchTobias().catch(console.error);