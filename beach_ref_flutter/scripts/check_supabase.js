const https = require('https');

const SUPABASE_URL = process.env.SUPABASE_URL;
const ANON_KEY = process.env.SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !ANON_KEY) {
  console.error('Missing env vars: SUPABASE_URL and SUPABASE_ANON_KEY must be set.');
  process.exit(1);
}

function query(path) {
  return new Promise((resolve, reject) => {
    const url = new URL(`${SUPABASE_URL}/rest/v1/${path}`);
    const opts = {
      hostname: url.hostname,
      path: url.pathname + url.search,
      headers: {
        'apikey': ANON_KEY,
        'Authorization': `Bearer ${ANON_KEY}`,
      },
    };
    https.get(opts, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        try { resolve(JSON.parse(data)); }
        catch { resolve(data); }
      });
    }).on('error', reject);
  });
}

async function main() {
  console.log('=== Checking Supabase DB for Flutter-saved matches ===\n');

  // 1. Recent matches by last_synced
  try {
    const recent = await query('matches?select=no,tournament_no,team_a_name,team_b_name,status,last_synced&order=last_synced.desc.nullslast&limit=15');
    if (Array.isArray(recent) && recent.length > 0) {
      console.log(`Found ${recent.length} recent matches:\n`);
      console.table(recent.map(m => ({
        no: m.no,
        tournament: m.tournament_no,
        teams: `${m.team_a_name || '?'} vs ${m.team_b_name || '?'}`,
        status: m.status,
        synced: m.last_synced,
      })));
    } else {
      console.log('No matches found in DB.');
      console.log('Response:', JSON.stringify(recent).substring(0, 500));
    }
  } catch (e) {
    console.error('Error querying matches:', e.message);
  }

  // 2. Count by tournament
  try {
    const all = await query('matches?select=tournament_no');
    if (Array.isArray(all) && all.length > 0) {
      const counts = {};
      all.forEach(m => { counts[m.tournament_no] = (counts[m.tournament_no] || 0) + 1; });
      console.log(`\n=== Matches by tournament (${all.length} total) ===\n`);
      Object.entries(counts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 15)
        .forEach(([t, c]) => console.log(`  Tournament ${t}: ${c} matches`));
    } else {
      console.log('\nNo matches in DB at all.');
    }
  } catch (e) {
    console.error('Error counting:', e.message);
  }
}

main();
