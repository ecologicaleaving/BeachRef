#!/usr/bin/env node
/**
 * Prerender certification test (issue #34).
 *
 * Verifies that Expo's static web export actually prerenders above-the-fold
 * content into each route's HTML (not just an empty `<div id="root">` shell).
 * This is the regression guard for the SSG work: if a future change makes a
 * route render `null` in Node (e.g. a component touching `window`/native at
 * render time), the root collapses to empty and this test fails.
 *
 * Usage:
 *   node tests/prerender-check.js [distDir]
 * Default distDir: dist
 *
 * Exit code 0 = all checked routes have prerendered content; 1 = failure.
 */
const fs = require('fs');
const path = require('path');

const distDir = process.argv[2] || 'dist';

// route file -> a string that MUST appear in the prerendered root markup
const EXPECTED = {
  'tournament-selection.html': 'Tournament Selection',
  'index.html': 'Loading', // splash "Loading BeachRef..."
};

// minimum non-script character count inside <div id="root"> to consider the
// route "prerendered" (empty shell is ~15-40 chars of wrapper divs)
const MIN_ROOT_CHARS = 300;

function rootBlock(html) {
  const start = html.indexOf('<div id="root">');
  if (start < 0) return null;
  // cut at the first bootstrap <script src=...> after the root open tag
  const scriptIdx = html.indexOf('<script src', start);
  return html.slice(start, scriptIdx > 0 ? scriptIdx : undefined);
}

let pass = 0;
let fail = 0;
const failures = [];

for (const [file, needle] of Object.entries(EXPECTED)) {
  const filePath = path.join(distDir, file);
  if (!fs.existsSync(filePath)) {
    fail++;
    failures.push(`${file}: MISSING (build did not emit this route)`);
    continue;
  }
  const html = fs.readFileSync(filePath, 'utf8');
  const root = rootBlock(html);
  if (!root) {
    fail++;
    failures.push(`${file}: no <div id="root"> found`);
    continue;
  }
  const len = root.replace(/\s/g, '').length;
  const hasNeedle = root.includes(needle);
  if (len >= MIN_ROOT_CHARS && hasNeedle) {
    console.log(`✅ ${file} — prerendered (${len} chars, contains "${needle}")`);
    pass++;
  } else {
    fail++;
    failures.push(
      `${file}: root too small or missing content ` +
      `(chars=${len}/${MIN_ROOT_CHARS}, contains "${needle}"=${hasNeedle})`
    );
  }
}

console.log('');
if (fail > 0) {
  console.error('❌ Prerender check FAILED:');
  failures.forEach((f) => console.error('   - ' + f));
  console.error(`\n=== ${pass} passed, ${fail} failed ===`);
  process.exit(1);
}
console.log(`=== ${pass} passed, ${fail} failed ===`);
process.exit(0);
