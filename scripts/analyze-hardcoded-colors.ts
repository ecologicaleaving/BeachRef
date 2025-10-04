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
 * Color to token mapping - ONLY colors from the 6-step palette
 * Maps existing hardcoded colors to the closest token from your original palette
 */
const COLOR_TO_TOKEN_MAP: Record<string, string> = {
  // STEP 1: Unified Brand Blue Scale (--brand-900 to --brand-300)
  '#0B2545': 'brandBlue[900]',  // Header/footer
  '#173D77': 'brandBlue[700]',  // Titles/iconography
  '#1F5AA6': 'brandBlue[600]',  // Card borders/active
  '#2D79D8': 'brandBlue[500]',  // Primary buttons/links
  '#7DBAF8': 'brandBlue[300]',  // Hover/focus rings

  // STEP 2: Rationalized Neutrals (bianchi/grigi-azzurri)
  '#FFFFFF': 'neutrals.bgPage',        // Pagina
  '#F7FAFE': 'neutrals.bgSurface',     // Card/pannelli
  '#E3ECF7': 'neutrals.borderSubtle',  // Divider/contorni card
  '#0D1A2B': 'neutrals.textPrimary',   // Testo primario
  '#5F6E86': 'neutrals.textSecondary', // Testo secondario

  // STEP 3: Badge e stati (LIVE/Scheduled)
  '#D92D20': 'badgeColors.live.text',         // LIVE testo/bordo
  '#FEE4E2': 'badgeColors.live.background',   // LIVE pill bkg
  '#EF4444': 'badgeColors.live.dot',          // Punto rosso live
  '#E9F2FF': 'badgeColors.scheduled.background', // Scheduled pill bkg
  '#027A48': 'badgeColors.completed.text',    // Completed testo
  '#EAF7F0': 'badgeColors.completed.background', // Completed pill bkg

  // STEP 4: Pulsanti, link e focus ring
  '#F0F6FF': 'buttonTokens.secondary.backgroundHover', // Secondary hover
  '#B42318': 'buttonTokens.destructive.text',          // Reset/destructive text
  '#FAC5C3': 'buttonTokens.destructive.border',        // Reset/destructive border

  // STEP 5: Card tornei: bordo/ombra
  '#CFE3FA': 'cardTokens.borderHover',  // Card hover border

  // STEP 6: Token semantici messaggi/alert
  '#B54708': 'alertTokens.warning.text',       // Warning testo
  '#FFF4E5': 'alertTokens.warning.background', // Warning bkg
  // Note: #EAF7F0 already mapped in STEP 3 as badgeColors.completed.background (same as alertTokens.success.background)
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
