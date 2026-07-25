#!/usr/bin/env node
/**
 * Demo script for OfficialsService (issue #40, AC13).
 *
 * Prints the officials of a real tournament and the number of VIS calls spent,
 * so the "2 calls per tournament, independent of the number of matches" claim
 * is verifiable by hand.
 *
 * Usage:
 *   node scripts/show-tournament-officials.js [eventNo]
 *
 * Defaults to EventNo 1719 (BPT Elite João Pessoa 2026).
 *
 * It mirrors the exact requests OfficialsService issues through VisApiClient,
 * using plain node https so it runs outside the Expo runtime (the service
 * itself pulls in MMKV/NetInfo). The parsing logic is the same recipe:
 * see services/OfficialsService.ts for the production implementation.
 */

const https = require('https');
const { XMLParser } = require('fast-xml-parser');

const EVENT_NO = process.argv[2] || '1719';

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: '',
  textNodeName: '_text',
  parseAttributeValue: false,
  trimValues: true
});

// --- Functions codes, mirrored from types/referee-v2.ts -------------------
const FUNCTION_CODES = { '2': 'LineJudge', '4': 'Scorer' };
const mapFunction = code => FUNCTION_CODES[String(code ?? '').trim()] || 'Unknown';

// --- Known VIS limitation, see types/referee-v2.ts ------------------------
const UNAVAILABLE_ROLES = ['RefereeCoach', 'TechnicalDelegate'];

let apiCalls = 0;

function visCall(xmlRequest) {
  apiCalls += 1;
  return new Promise((resolve, reject) => {
    const body = `Request=${encodeURIComponent(xmlRequest)}`;
    const req = https.request(
      {
        hostname: 'www.fivb.org',
        port: 443,
        path: '/Vis2009/XmlRequest.asmx',
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Content-Length': Buffer.byteLength(body),
          'X-FIVB-App-ID': '2a9523517c52420da73d927c6d6bab23'
        }
      },
      res => {
        let data = '';
        res.on('data', chunk => (data += chunk));
        res.on('end', () => resolve(data));
      }
    );
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

const NAMED = { lt: '<', gt: '>', quot: '"', apos: "'", amp: '&' };

/** Single-pass entity decoder — mirrors utils/visEmbeddedXml.ts */
function decodeXmlEntities(input) {
  if (input === null || input === undefined) return '';
  return String(input).replace(/&(#[xX][0-9a-fA-F]+|#[0-9]+|[a-zA-Z][a-zA-Z0-9]*);/g, (m, ent) => {
    if (ent[0] === '#') {
      const isHex = ent[1] === 'x' || ent[1] === 'X';
      const cp = isHex ? parseInt(ent.slice(2), 16) : parseInt(ent.slice(1), 10);
      if (!Number.isFinite(cp) || cp < 0 || cp > 0x10ffff) return m;
      try {
        return String.fromCodePoint(cp);
      } catch {
        return m;
      }
    }
    const v = NAMED[ent.toLowerCase()];
    return v === undefined ? m : v;
  });
}

function parseEmbedded(escaped) {
  const decoded = decodeXmlEntities(escaped).trim();
  if (!decoded) return null;
  try {
    return parser.parse(decoded);
  } catch {
    return null;
  }
}

const toArray = v => (v === null || v === undefined ? [] : Array.isArray(v) ? v : [v]);

async function main() {
  console.log('='.repeat(78));
  console.log(`OFFICIALS — EventNo ${EVENT_NO}`);
  console.log('='.repeat(78));

  // ---- Call 1: event roster ---------------------------------------------
  const eventXml = await visCall(
    `<Request Type="GetEvent" No="${EVENT_NO}" Fields="No Name AuxiliaryPersons" />`
  );
  const event = parser.parse(eventXml).Event;

  if (!event) {
    console.error('GetEvent returned no <Event>. Raw response:', eventXml.slice(0, 300));
    process.exit(1);
  }

  const roster = toArray(parseEmbedded(event.AuxiliaryPersons)?.AuxiliaryPersons?.AuxiliaryPerson)
    .filter(p => p && p.No !== undefined)
    .map(p => ({
      no: String(p.No),
      firstName: String(p.FirstName ?? ''),
      lastName: String(p.LastName ?? ''),
      nationality: String(p.NationalityCode ?? ''),
      functionCode: String(p.Functions ?? ''),
      function: mapFunction(p.Functions)
    }));

  const index = new Map(roster.map(p => [p.no, p]));

  console.log(`\nEvent: ${event.Name}`);
  console.log(`\n-- Auxiliary officials (${roster.length}) ${'-'.repeat(40)}`);
  for (const p of roster) {
    console.log(
      `  #${p.no.padStart(2)}  ${`${p.firstName} ${p.lastName}`.padEnd(34)} ${p.nationality.padEnd(3)} ` +
        `Functions=${p.functionCode} -> ${p.function}`
    );
  }

  const unknown = roster.filter(p => p.function === 'Unknown');
  if (unknown.length > 0) {
    console.log(`  !! ${unknown.length} official(s) with an unmapped Functions code — see issue #40 AC7`);
  }

  // ---- Call 2: every match of the event, with Personnel ------------------
  const matchesXml = await visCall(
    `<Request Type="GetBeachMatchList" Fields="No NoInTournament NoEvent Status Court LocalDate LocalTime TeamAName TeamBName Referee1Name Referee2Name Personnel">` +
      `<Filter NoEvent="${EVENT_NO}" /></Request>`
  );
  const matches = toArray(parser.parse(matchesXml).BeachMatches?.BeachMatch);

  const PERSONNEL_SLOTS = [
    ['Scorer', 'Scorer'],
    ['AssistantScorer', 'Assistant Scorer'],
    ['LineJudge1', 'Line Judge 1'],
    ['LineJudge2', 'Line Judge 2']
  ];

  let withPersonnel = 0;
  let unresolved = 0;

  console.log(`\n-- Matches (${matches.length}) ${'-'.repeat(52)}`);

  for (const match of matches) {
    const personnel = parseEmbedded(match.Personnel)?.Personnel;

    if (!personnel) {
      console.log(`  Match ${match.No} (#${match.NoInTournament})  — no Personnel data`);
      continue;
    }

    withPersonnel += 1;
    const teams = `${match.TeamAName || 'TBD'} vs ${match.TeamBName || 'TBD'}`;
    console.log(`  Match ${match.No} (#${match.NoInTournament})  ${teams}`);
    console.log(`      Referees: ${match.Referee1Name || '-'} / ${match.Referee2Name || '-'}`);

    for (const [attr, label] of PERSONNEL_SLOTS) {
      const id = personnel[attr];
      if (id === undefined || id === null || String(id).trim() === '') continue;

      const person = index.get(String(id).trim());
      if (!person) unresolved += 1;

      console.log(
        `      ${label.padEnd(17)}: ${person ? `${person.firstName} ${person.lastName} (${person.nationality})` : `#${id} [unresolved]`}`
      );
    }
  }

  // ---- Summary -----------------------------------------------------------
  console.log(`\n${'='.repeat(78)}`);
  console.log('SUMMARY');
  console.log('='.repeat(78));
  console.log(`  Auxiliary officials in roster : ${roster.length}`);
  console.log(`  Matches                       : ${matches.length}`);
  console.log(`  Matches with Personnel        : ${withPersonnel}`);
  console.log(`  Matches without Personnel     : ${matches.length - withPersonnel}`);
  console.log(`  Unresolved personnel ids      : ${unresolved}`);
  console.log(`  Roles unavailable from VIS    : ${UNAVAILABLE_ROLES.join(', ')} (issue #40, AC8)`);
  console.log(`\n  >>> VIS API CALLS SPENT: ${apiCalls} <<<`);
  console.log(`      (constant — it does not grow with the ${matches.length} matches)`);
}

main().catch(err => {
  console.error('Failed:', err.message);
  process.exit(1);
});
