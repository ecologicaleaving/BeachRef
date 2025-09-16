const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function checkMatches1552() {
  console.log('🔍 Checking matches for tournament 1552...');

  const { data: matches, error } = await supabase
    .from('matches')
    .select('vis_match_no, team_a_name, team_b_name, status, court, utc_datetime')
    .eq('tournament_code', '1552')
    .limit(10);

  if (error) {
    console.log('Error:', error.message);
  } else {
    console.log(`Found ${matches.length} matches for tournament 1552:`);
    matches.forEach(m => {
      console.log(`  - Match ${m.vis_match_no}: ${m.team_a_name} vs ${m.team_b_name} (${m.status})`);
    });
  }

  // Also check referee assignments for 151572 in tournament 1552
  const { data: refs } = await supabase
    .from('match_referees')
    .select(`
      role,
      matches (
        vis_match_no,
        team_a_name,
        team_b_name,
        tournament_code
      )
    `)
    .eq('referee_id', 151572)
    .eq('matches.tournament_code', '1552');

  console.log(`\n👨‍⚖️ Referee 151572 assignments in tournament 1552: ${refs?.length || 0}`);
}

checkMatches1552().catch(console.error);