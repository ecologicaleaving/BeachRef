/**
 * Hardcoded Color Analysis Script
 * Finds all hardcoded hex colors in components and suggests token replacements
 *
 * Usage: npx ts-node scripts/analyze-hardcoded-colors.ts
 */

import * as fs from 'fs';
import * as path from 'path';

interface ColorMatch {
  file: string;
  line: number;
  color: string;
  context: string;
  suggestedToken: string | undefined;
}

/**
 * Color to token mapping - COMPLETE MAPPING to original palette ONLY
 * Maps ALL hardcoded colors to the 20-25 tokens from the original palette
 */
const COLOR_TO_TOKEN_MAP: Record<string, string> = {
  // === PALETTE ORIGINALE (esatti) ===

  // Brand Blues
  '#0B2545': 'brandBlue[900]',
  '#173D77': 'brandBlue[700]',
  '#1F5AA6': 'brandBlue[600]',
  '#2D79D8': 'brandBlue[500]',
  '#7DBAF8': 'brandBlue[300]',

  // Neutrals
  '#FFFFFF': 'neutrals.bgPage',
  '#F7FAFE': 'neutrals.bgSurface',
  '#E3ECF7': 'neutrals.borderSubtle',
  '#CFE3FA': 'neutrals.borderHover',
  '#90A4BF': 'neutrals[500]',
  '#5F6E86': 'neutrals.textSecondary',
  '#0D1A2B': 'neutrals.textPrimary',

  // Stati
  '#D92D20': 'badgeColors.live.text',
  '#FEE4E2': 'badgeColors.live.background',
  '#E9F2FF': 'badgeColors.scheduled.background',
  '#027A48': 'badgeColors.completed.text',
  '#EAF7F0': 'badgeColors.completed.background',

  // === MAPPING COLORI SIMILI → PALETTE ===

  // Bianchi/grigi chiarissimi → neutral-50
  '#F9FAFB': 'neutrals.bgPage',      // dist 8.8
  '#F8FAFC': 'neutrals.bgPage',      // dist 9.1
  '#FAFAFA': 'neutrals.bgPage',      // dist 8.7
  '#F8F9FA': 'neutrals.bgPage',      // dist 10.5
  '#FAFBFC': 'neutrals.bgPage',      // dist 7.1
  '#FFF': 'neutrals.bgPage',

  // Azzurrini pallidissimi → neutral-100
  '#F3F4F6': 'neutrals.bgSurface',   // dist 10.8 - grigi chiari
  '#F5F5F5': 'neutrals.bgSurface',   // dist 10.5
  '#F0F9FF': 'neutrals.bgSurface',   // dist 7.1
  '#EFF6FF': 'neutrals.bgSurface',   // dist 9.0
  '#F0FDF4': 'neutrals.bgSurface',   // dist 12.6 - verdini chiari
  '#F4F3F4': 'neutrals.bgSurface',
  '#EEF2FF': 'neutrals.bgSurface',
  '#F0F8FF': 'neutrals.bgSurface',
  '#F8F9FF': 'neutrals.bgSurface',
  '#FEF7FF': 'neutrals.bgSurface',
  '#F8F8F8': 'neutrals.bgSurface',
  '#EBF4FF': 'neutrals.bgSurface',

  // Bordi/divider → neutral-200
  '#E5E7EB': 'neutrals.borderSubtle', // dist 13.2
  '#E0E0E0': 'neutrals.borderSubtle',
  '#E3F2FD': 'neutrals.borderSubtle', // dist 8.5
  '#D1D5DB': 'neutrals.borderSubtle',
  '#EEEEEE': 'neutrals.borderSubtle',
  '#E2E8F0': 'neutrals.borderSubtle',
  '#E9ECEF': 'neutrals.borderSubtle',
  '#E6F3FF': 'neutrals.borderSubtle',
  '#DBEAFE': 'neutrals.borderSubtle',
  '#E0E7FF': 'neutrals.borderSubtle',

  // Grigi medi/scuri testo → neutral-700
  '#6B7280': 'neutrals.textSecondary', // dist 14.0
  '#666666': 'neutrals.textSecondary',
  '#666': 'neutrals.textSecondary',
  '#9CA3AF': 'neutrals.textSecondary',
  '#999999': 'neutrals.textSecondary',
  '#999': 'neutrals.textSecondary',
  '#9E9E9E': 'neutrals.textSecondary',

  // Quasi neri testo → neutral-900
  '#000000': 'neutrals.textPrimary',
  '#000': 'neutrals.textPrimary',
  '#333333': 'neutrals.textPrimary',
  '#333': 'neutrals.textPrimary',
  '#374151': 'neutrals.textPrimary',
  '#111827': 'neutrals.textPrimary', // dist 6.0

  // Blu scuri header → brandBlue-900
  '#1B365D': 'brandBlue[900]',

  // Blu medi links/buttons → brandBlue-500
  '#2196F3': 'brandBlue[500]',
  '#0066CC': 'brandBlue[500]',
  '#007AFF': 'brandBlue[500]',
  '#3B82F6': 'brandBlue[500]',

  // Rossi LIVE → red-500
  '#DC2626': 'badgeColors.live.text', // dist 9.7
  '#F44336': 'badgeColors.live.text',
  '#EF4444': 'badgeColors.live.dot',

  // Rossi chiari background → red-50
  '#FEE2E2': 'badgeColors.live.background', // dist 2.0
  '#FFE5E5': 'badgeColors.live.background',
  '#FFEBEE': 'badgeColors.live.background',
  '#FEF2F2': 'badgeColors.live.background',

  // Verdi success → green-500
  '#4CAF50': 'badgeColors.completed.text',
  '#10B981': 'badgeColors.completed.text',

  // Verdi chiari background → green-50
  '#E8F5E8': 'badgeColors.completed.background',
  '#ECFDF5': 'badgeColors.completed.background',
  '#D1FAE5': 'badgeColors.completed.background',
  '#F0FDF4': 'badgeColors.completed.background',

  // Blu chiari scheduled → info-50
  '#DBEAFE': 'badgeColors.scheduled.background',

  // Altri colori brand/legacy → brandBlue-500
  '#FF6B35': 'brandBlue[500]', // Vecchio brand arancione
  '#4A90A4': 'brandBlue[600]', // Teal
};

// Hex color regex (matches #RGB, #RRGGBB, #RRGGBBAA)
const HEX_COLOR_REGEX = /#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6}|[0-9A-Fa-f]{8})\b/g;

/**
 * Normalize hex color to uppercase 6-digit format
 */
function normalizeHexColor(color: string): string {
  let normalized = color.toUpperCase();

  // Expand 3-digit to 6-digit (#RGB -> #RRGGBB)
  if (normalized.length === 4) {
    normalized = '#' + normalized[1] + normalized[1] +
                 normalized[2] + normalized[2] +
                 normalized[3] + normalized[3];
  }

  // Strip alpha channel if present (#RRGGBBAA -> #RRGGBB)
  if (normalized.length === 9) {
    normalized = normalized.substring(0, 7);
  }

  return normalized;
}

/**
 * Find suggested token for a color
 */
function suggestToken(color: string): string | undefined {
  const normalized = normalizeHexColor(color);
  return COLOR_TO_TOKEN_MAP[normalized];
}

/**
 * Recursively find all files with given extensions
 */
function findFiles(dir: string, extensions: string[]): string[] {
  const files: string[] = [];

  const items = fs.readdirSync(dir);

  for (const item of items) {
    const fullPath = path.join(dir, item);
    const stat = fs.statSync(fullPath);

    if (stat.isDirectory()) {
      // Skip node_modules and other build directories
      if (!['node_modules', '.git', 'dist', 'build', '.expo'].includes(item)) {
        files.push(...findFiles(fullPath, extensions));
      }
    } else if (stat.isFile()) {
      const ext = path.extname(item);
      if (extensions.includes(ext)) {
        files.push(fullPath);
      }
    }
  }

  return files;
}

/**
 * Analyze a single file for hardcoded colors
 */
function analyzeFile(filePath: string): ColorMatch[] {
  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.split('\n');
  const matches: ColorMatch[] = [];

  lines.forEach((line, index) => {
    let match;
    HEX_COLOR_REGEX.lastIndex = 0; // Reset regex state

    while ((match = HEX_COLOR_REGEX.exec(line)) !== null) {
      const color = match[0];
      const suggestedToken = suggestToken(color);

      matches.push({
        file: filePath,
        line: index + 1,
        color: normalizeHexColor(color),
        context: line.trim(),
        suggestedToken,
      });
    }
  });

  return matches;
}

/**
 * Group matches by color
 */
function groupByColor(matches: ColorMatch[]): Map<string, ColorMatch[]> {
  const grouped = new Map<string, ColorMatch[]>();

  matches.forEach(match => {
    const existing = grouped.get(match.color) || [];
    existing.push(match);
    grouped.set(match.color, existing);
  });

  return grouped;
}

/**
 * Main analysis function
 */
function analyzeHardcodedColors() {
  console.log('🔍 Analyzing hardcoded colors in components...\n');

  const rootDir = path.resolve(__dirname, '..');
  const componentsDir = path.join(rootDir, 'components');
  const screensDir = path.join(rootDir, 'screens');

  // Find all component files
  const files = [
    ...findFiles(componentsDir, ['.tsx', '.ts']),
    ...findFiles(screensDir, ['.tsx', '.ts']),
  ];

  console.log(`📁 Found ${files.length} files to analyze\n`);

  // Analyze all files
  const allMatches: ColorMatch[] = [];
  files.forEach(file => {
    const matches = analyzeFile(file);
    allMatches.push(...matches);
  });

  console.log(`🎨 Found ${allMatches.length} hardcoded colors\n`);

  // Group by color
  const grouped = groupByColor(allMatches);

  // Sort by frequency (most used first)
  const sortedColors = Array.from(grouped.entries())
    .sort((a, b) => b[1].length - a[1].length);

  // Print summary
  console.log('📊 COLOR USAGE SUMMARY:\n');
  console.log('Color      | Count | Suggested Token');
  console.log('-----------|-------|----------------------------------');

  sortedColors.forEach(([color, matches]) => {
    const token = matches[0]?.suggestedToken || '⚠️  NO MAPPING';
    console.log(`${color} | ${String(matches.length).padStart(5)} | ${token}`);
  });

  console.log('\n');

  // Print unmapped colors
  const unmappedColors = sortedColors.filter(([_, matches]) => !matches[0]?.suggestedToken);

  if (unmappedColors.length > 0) {
    console.log('⚠️  UNMAPPED COLORS (need manual review):\n');

    unmappedColors.forEach(([color, matches]) => {
      console.log(`${color} (${matches.length} occurrences):`);

      // Show first 3 examples
      matches.slice(0, 3).forEach(match => {
        const relativePath = path.relative(rootDir, match.file);
        console.log(`  ${relativePath}:${match.line}`);
        console.log(`    ${match.context.substring(0, 80)}...`);
      });

      if (matches.length > 3) {
        console.log(`  ... and ${matches.length - 3} more`);
      }
      console.log('');
    });
  }

  // Generate migration report
  const reportPath = path.join(rootDir, 'color-migration-report.json');
  const report = {
    totalFiles: files.length,
    totalColors: allMatches.length,
    uniqueColors: grouped.size,
    mappedColors: sortedColors.filter(([_, matches]) => matches[0]?.suggestedToken).length,
    unmappedColors: unmappedColors.length,
    colorUsage: Object.fromEntries(
      sortedColors.map(([color, matches]) => [
        color,
        {
          count: matches.length,
          suggestedToken: matches[0]?.suggestedToken,
          occurrences: matches.map(m => ({
            file: path.relative(rootDir, m.file),
            line: m.line,
          })),
        },
      ])
    ),
  };

  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
  console.log(`\n📄 Full report saved to: ${path.relative(rootDir, reportPath)}`);

  // Print next steps
  console.log('\n✅ NEXT STEPS:');
  console.log('1. Review unmapped colors and add them to COLOR_TO_TOKEN_MAP');
  console.log('2. Run the replacement script: npm run migrate-colors');
  console.log('3. Test the app to ensure everything works');
  console.log('4. Commit the changes\n');
}

// Run analysis
analyzeHardcodedColors();
