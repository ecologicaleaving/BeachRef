const report = require('../color-migration-report.json');

// Phase 1 target colors: Surfaces & borders
const phase1Colors = [
  { color: '#F7FAFE', token: 'neutrals.bgSurface' },
  { color: '#E3ECF7', token: 'neutrals.borderSubtle' },
  { color: '#F5F5F5', token: 'neutrals.bgSurface' },
  { color: '#F3F4F6', token: 'neutrals.bgSurface' },
  { color: '#E5E7EB', token: 'neutrals.borderSubtle' },
  { color: '#E0E0E0', token: 'neutrals.borderSubtle' },
  { color: '#F8FAFC', token: 'neutrals.bgSurface' },
  { color: '#F9FAFB', token: 'neutrals.bgSurface' },
];

console.log('=== PHASE 1: SURFACES & BORDERS ===\n');

let total = 0;
const fileMap = new Map();

phase1Colors.forEach(({ color, token }) => {
  const data = report.colorUsage[color];
  if (data) {
    total += data.count;
    console.log(`${color} (${data.count}×) → ${token}`);
    console.log('  Top files:');
    data.occurrences.slice(0, 3).forEach(occ => {
      console.log(`    - ${occ.file}:${occ.line}`);

      // Track files for batch processing
      if (!fileMap.has(occ.file)) {
        fileMap.set(occ.file, []);
      }
      fileMap.get(occ.file).push({ color, token, line: occ.line });
    });
    console.log('');
  }
});

console.log(`Total Phase 1 occurrences: ${total}`);
console.log(`\nFiles to modify (showing files with most occurrences):`);

// Sort files by occurrence count
const sortedFiles = Array.from(fileMap.entries())
  .map(([file, occurrences]) => ({ file, count: occurrences.length }))
  .sort((a, b) => b.count - a.count)
  .slice(0, 10);

sortedFiles.forEach(({ file, count }) => {
  console.log(`  ${file} (${count} occurrences)`);
});
