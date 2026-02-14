/**
 * Supabase DB Coverage Report
 *
 * Analyzes how much match/referee data is available in the shared DB
 * to evaluate readiness for referee statistics features.
 */
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
        'Prefer': 'count=exact',
      },
    };
    https.get(opts, (res) => {
      let data = '';
      const contentRange = res.headers['content-range']; // e.g. "0-999/1234"
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          resolve({ data: json, totalCount: contentRange ? parseInt(contentRange.split('/')[1]) : null });
        } catch {
          resolve({ data, totalCount: null });
        }
      });
    }).on('error', reject);
  });
}

// Paginated fetch — Supabase default limit is 1000
async function fetchAll(table, select, filters = '') {
  const all = [];
  let offset = 0;
  const limit = 1000;
  while (true) {
    const path = `${table}?select=${encodeURIComponent(select)}${filters}&limit=${limit}&offset=${offset}`;
    const { data } = await query(path);
    if (!Array.isArray(data) || data.length === 0) break;
    all.push(...data);
    if (data.length < limit) break;
    offset += limit;
  }
  return all;
}

async function main() {
  console.log('╔══════════════════════════════════════════════════════════╗');
  console.log('║          SUPABASE DB COVERAGE REPORT                   ║');
  console.log('╚══════════════════════════════════════════════════════════╝\n');

  // ── 1. Total matches ──
  console.log('Fetching all matches...');
  const matches = await fetchAll('matches',
    'no,tournament_no,status,local_date,referee1_name,referee2_name,referee1_federation_code,referee2_federation_code,team_a_name,team_b_name,match_points_a,match_points_b,points_team_a_set1,points_team_b_set1,last_synced'
  );

  console.log(`\n📊 TOTALE MATCH IN DB: ${matches.length}\n`);

  if (matches.length === 0) {
    console.log('❌ Nessun match in DB. Il Flutter deve prima popolare il database.');
    return;
  }

  // ── 2. Tournaments coverage ──
  const byTournament = {};
  for (const m of matches) {
    const t = m.tournament_no || 'unknown';
    if (!byTournament[t]) byTournament[t] = { total: 0, withRef1: 0, withRef2: 0, withBothRefs: 0, withScores: 0, finished: 0, dates: new Set() };
    const entry = byTournament[t];
    entry.total++;
    if (m.referee1_name) entry.withRef1++;
    if (m.referee2_name) entry.withRef2++;
    if (m.referee1_name && m.referee2_name) entry.withBothRefs++;
    if (m.match_points_a != null || m.points_team_a_set1 != null) entry.withScores++;
    const status = parseInt(m.status) || 0;
    if (status >= 9) entry.finished++;
    if (m.local_date) entry.dates.add(m.local_date.substring(0, 4)); // year
  }

  const tournamentNos = Object.keys(byTournament).sort((a, b) => parseInt(b) - parseInt(a));

  console.log('─────────────────────────────────────────────────────────');
  console.log('📋 COPERTURA PER TORNEO');
  console.log('─────────────────────────────────────────────────────────');
  console.log(`${'Tournament'.padEnd(12)} ${'Match'.padStart(6)} ${'Ref1'.padStart(6)} ${'Ref2'.padStart(6)} ${'Both'.padStart(6)} ${'Score'.padStart(6)} ${'Done'.padStart(6)} ${'Ref%'.padStart(6)}`);
  console.log('─'.repeat(60));

  let totalMatches = 0, totalWithRef1 = 0, totalWithRef2 = 0, totalWithBoth = 0, totalWithScores = 0, totalFinished = 0;

  for (const t of tournamentNos) {
    const e = byTournament[t];
    const refPct = e.total > 0 ? Math.round((e.withBothRefs / e.total) * 100) : 0;
    console.log(
      `${t.padEnd(12)} ${String(e.total).padStart(6)} ${String(e.withRef1).padStart(6)} ${String(e.withRef2).padStart(6)} ${String(e.withBothRefs).padStart(6)} ${String(e.withScores).padStart(6)} ${String(e.finished).padStart(6)} ${(refPct + '%').padStart(6)}`
    );
    totalMatches += e.total;
    totalWithRef1 += e.withRef1;
    totalWithRef2 += e.withRef2;
    totalWithBoth += e.withBothRefs;
    totalWithScores += e.withScores;
    totalFinished += e.finished;
  }

  console.log('─'.repeat(60));
  const totalRefPct = totalMatches > 0 ? Math.round((totalWithBoth / totalMatches) * 100) : 0;
  console.log(
    `${'TOTALE'.padEnd(12)} ${String(totalMatches).padStart(6)} ${String(totalWithRef1).padStart(6)} ${String(totalWithRef2).padStart(6)} ${String(totalWithBoth).padStart(6)} ${String(totalWithScores).padStart(6)} ${String(totalFinished).padStart(6)} ${(totalRefPct + '%').padStart(6)}`
  );

  // ── 3. Summary metrics ──
  console.log('\n─────────────────────────────────────────────────────────');
  console.log('📈 METRICHE CHIAVE PER STATISTICHE ARBITRO');
  console.log('─────────────────────────────────────────────────────────');
  console.log(`  Tornei in DB:                    ${tournamentNos.length}`);
  console.log(`  Match totali:                    ${totalMatches}`);
  console.log(`  Match completati (status>=9):    ${totalFinished} (${pct(totalFinished, totalMatches)})`);
  console.log(`  Match con arbitro 1:             ${totalWithRef1} (${pct(totalWithRef1, totalMatches)})`);
  console.log(`  Match con arbitro 2:             ${totalWithRef2} (${pct(totalWithRef2, totalMatches)})`);
  console.log(`  Match con ENTRAMBI gli arbitri:  ${totalWithBoth} (${pct(totalWithBoth, totalMatches)})`);
  console.log(`  Match con punteggi:              ${totalWithScores} (${pct(totalWithScores, totalMatches)})`);

  // ── 4. Unique referees ──
  const refSet = new Set();
  const refStats = {};
  for (const m of matches) {
    for (const [name, fed] of [[m.referee1_name, m.referee1_federation_code], [m.referee2_name, m.referee2_federation_code]]) {
      if (name) {
        refSet.add(name);
        if (!refStats[name]) refStats[name] = { count: 0, federation: fed || '' };
        refStats[name].count++;
      }
    }
  }

  console.log(`\n  Arbitri unici nel DB:            ${refSet.size}`);

  // Top referees
  const topRefs = Object.entries(refStats)
    .sort((a, b) => b[1].count - a[1].count)
    .slice(0, 15);

  console.log('\n─────────────────────────────────────────────────────────');
  console.log('🏆 TOP 15 ARBITRI PER NUMERO DI MATCH');
  console.log('─────────────────────────────────────────────────────────');
  console.log(`${'#'.padStart(3)} ${'Match'.padStart(6)}  ${'Fed'.padEnd(5)} Nome`);
  console.log('─'.repeat(50));
  topRefs.forEach(([name, stats], i) => {
    console.log(`${String(i + 1).padStart(3)} ${String(stats.count).padStart(6)}  ${stats.federation.padEnd(5)} ${name}`);
  });

  // ── 5. Year distribution ──
  const byYear = {};
  for (const m of matches) {
    const year = m.local_date ? m.local_date.substring(0, 4) : 'N/A';
    if (!byYear[year]) byYear[year] = { total: 0, withRefs: 0 };
    byYear[year].total++;
    if (m.referee1_name && m.referee2_name) byYear[year].withRefs++;
  }

  console.log('\n─────────────────────────────────────────────────────────');
  console.log('📅 DISTRIBUZIONE PER ANNO');
  console.log('─────────────────────────────────────────────────────────');
  for (const year of Object.keys(byYear).sort()) {
    const y = byYear[year];
    const bar = '█'.repeat(Math.round(y.total / 10));
    console.log(`  ${year}: ${String(y.total).padStart(5)} match (${pct(y.withRefs, y.total)} con arbitri) ${bar}`);
  }

  // ── 6. Readiness assessment ──
  console.log('\n─────────────────────────────────────────────────────────');
  console.log('🎯 VALUTAZIONE READINESS STATISTICHE ARBITRO');
  console.log('─────────────────────────────────────────────────────────');

  const checks = [
    { label: 'Match con dati arbitro >= 500', ok: totalWithBoth >= 500, value: totalWithBoth },
    { label: 'Arbitri unici >= 50', ok: refSet.size >= 50, value: refSet.size },
    { label: 'Tornei >= 5', ok: tournamentNos.length >= 5, value: tournamentNos.length },
    { label: 'Match completati >= 80%', ok: totalFinished / totalMatches >= 0.8, value: pct(totalFinished, totalMatches) },
    { label: 'Copertura arbitri >= 70%', ok: totalWithBoth / totalMatches >= 0.7, value: pct(totalWithBoth, totalMatches) },
  ];

  let passed = 0;
  for (const c of checks) {
    const icon = c.ok ? '✅' : '❌';
    passed += c.ok ? 1 : 0;
    console.log(`  ${icon} ${c.label} → ${c.value}`);
  }

  console.log(`\n  Risultato: ${passed}/${checks.length} criteri soddisfatti`);
  if (passed >= 4) {
    console.log('  🟢 PRONTO per implementare statistiche arbitro!');
  } else if (passed >= 2) {
    console.log('  🟡 PARZIALE — servono piu dati. Continua a navigare tornei nell\'app.');
  } else {
    console.log('  🔴 NON PRONTO — il DB ha troppo pochi dati.');
  }

  console.log('\n─────────────────────────────────────────────────────────');
  console.log('💡 NOTA: i dati crescono man mano che gli utenti');
  console.log('   navigano i tornei nell\'app (lazy loading → Supabase).');
  console.log('─────────────────────────────────────────────────────────\n');
}

function pct(part, total) {
  if (total === 0) return '0%';
  return Math.round((part / total) * 100) + '%';
}

main().catch(e => console.error('Error:', e));
