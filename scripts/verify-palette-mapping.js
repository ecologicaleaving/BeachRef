const report = require('../color-migration-report.json');

// La palette ESATTA che mi hai dato
const YOUR_PALETTE = {
  // Brand blues
  '#0B2545': 'brandBlue-900',
  '#173D77': 'brandBlue-700',
  '#1F5AA6': 'brandBlue-600',
  '#2D79D8': 'brandBlue-500',
  '#7DBAF8': 'brandBlue-300',

  // Neutrals
  '#FFFFFF': 'neutral-50',
  '#F7FAFE': 'neutral-100',
  '#E3ECF7': 'neutral-200',
  '#CFE3FA': 'neutral-300',
  '#90A4BF': 'neutral-500',
  '#5F6E86': 'neutral-700',
  '#0D1A2B': 'neutral-900',

  // Stati
  '#D92D20': 'red-500',
  '#FEE4E2': 'red-50',
  '#1F5AA6': 'info-500', // Uguale a brandBlue-600
  '#E9F2FF': 'info-50',
  '#027A48': 'green-500',
  '#EAF7F0': 'green-50',
};

console.log('=== ANALISI PALETTE vs CODEBASE ===\n');

// 1. Colori della CODEBASE che sono GIÀ nella PALETTE
console.log('✅ COLORI GIÀ NELLA PALETTE (possono essere sostituiti direttamente):\n');
let inPalette = 0;
let inPaletteOccurrences = 0;

Object.entries(report.colorUsage)
  .filter(([color]) => YOUR_PALETTE[color])
  .sort((a, b) => b[1].count - a[1].count)
  .forEach(([color, data]) => {
    console.log(`${color} (${data.count}×) → ${YOUR_PALETTE[color]}`);
    inPalette++;
    inPaletteOccurrences += data.count;
  });

console.log(`\nTotale: ${inPalette} colori, ${inPaletteOccurrences} occorrenze\n`);

// 2. Colori della CODEBASE che NON sono nella PALETTE
console.log('❌ COLORI NON NELLA PALETTE (servono decisioni manuali):\n');

const notInPalette = Object.entries(report.colorUsage)
  .filter(([color]) => !YOUR_PALETTE[color])
  .sort((a, b) => b[1].count - a[1].count);

let notInPaletteOccurrences = 0;

// Mostra i top 30
notInPalette.slice(0, 30).forEach(([color, data]) => {
  notInPaletteOccurrences += data.count;
  const files = data.occurrences.slice(0, 2).map(o => `${o.file}:${o.line}`).join(', ');
  console.log(`${color} (${data.count}×)`);
  console.log(`  → ${files}`);
});

console.log(`\n... e altri ${notInPalette.length - 30} colori\n`);

// 3. Statistiche finali
console.log('=== STATISTICHE ===\n');
console.log(`Colori unici totali: ${report.uniqueColors}`);
console.log(`Colori nella palette: ${inPalette} (${((inPalette/report.uniqueColors)*100).toFixed(1)}%)`);
console.log(`Colori fuori palette: ${notInPalette.length} (${((notInPalette.length/report.uniqueColors)*100).toFixed(1)}%)`);
console.log('');
console.log(`Occorrenze nella palette: ${inPaletteOccurrences} (${((inPaletteOccurrences/report.totalColors)*100).toFixed(1)}%)`);
console.log(`Occorrenze fuori palette: ${report.totalColors - inPaletteOccurrences} (${(((report.totalColors - inPaletteOccurrences)/report.totalColors)*100).toFixed(1)}%)`);

// 4. Colori "quasi" nella palette (vicinissimi)
console.log('\n=== COLORI SIMILI ALLA PALETTE (possibili candidati per unificazione) ===\n');

const SIMILAR_THRESHOLD = 15; // Differenza RGB massima per considerarli "simili"

function hexToRgb(hex) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return { r, g, b };
}

function colorDistance(hex1, hex2) {
  const c1 = hexToRgb(hex1);
  const c2 = hexToRgb(hex2);
  return Math.sqrt(
    Math.pow(c1.r - c2.r, 2) +
    Math.pow(c1.g - c2.g, 2) +
    Math.pow(c1.b - c2.b, 2)
  );
}

notInPalette.forEach(([color, data]) => {
  if (color.length !== 7) return; // Skip short/long hex

  for (const [paletteColor, paletteToken] of Object.entries(YOUR_PALETTE)) {
    if (paletteColor.length !== 7) continue;

    const distance = colorDistance(color, paletteColor);
    if (distance < SIMILAR_THRESHOLD) {
      console.log(`${color} (${data.count}×) ≈ ${paletteColor} (${paletteToken}) - distanza: ${distance.toFixed(1)}`);
      break;
    }
  }
});

console.log('\n✅ PROSSIMO STEP: Decidere come mappare i colori fuori palette');
