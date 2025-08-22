#!/usr/bin/env node

/**
 * Color Migration Utility
 * Automatically replace hardcoded green color values with design token references
 */

const fs = require('fs');
const path = require('path');
const glob = require('glob');

// Color mappings to replace
const COLOR_MAPPINGS = {
  '#2E8B57': 'colors.success',     // Original FIVB green -> success token
  '#1E5A3A': 'colors.success',     // Dark WCAG green -> success token
  '#0F4C75': 'colors.success',     // New blue-teal (should already use token)
};

// Import patterns to add when tokens are used
const IMPORT_PATTERNS = {
  'colors.': "import { colors } from '../theme/tokens';",
  'statusColors.': "import { statusColors } from '../theme/tokens';",
  'brandColors.': "import { brandColors } from '../theme/tokens';",
};

// File patterns to search
const FILE_PATTERNS = [
  'screens/**/*.{ts,tsx}',
  'components/**/*.{ts,tsx}',
  'hooks/**/*.{ts,tsx}',
  'utils/**/*.{ts,tsx}',
  'services/**/*.{ts,tsx}',
  '__tests__/**/*.{ts,tsx}',
];

// Files to exclude from migration
const EXCLUDE_PATTERNS = [
  '**/node_modules/**',
  '**/theme/tokens.ts',
  '**/scripts/**',
  '**/*.test.ts',
  '**/*.test.tsx',
];

let totalReplacements = 0;
let filesModified = [];
let migrationReport = [];

function shouldExcludeFile(filePath) {
  return EXCLUDE_PATTERNS.some(pattern => {
    const regex = new RegExp(pattern.replace(/\*\*/g, '.*').replace(/\*/g, '[^/]*'));
    return regex.test(filePath);
  });
}

function addImportIfNeeded(content, tokenUsed, filePath) {
  const importStatement = IMPORT_PATTERNS[tokenUsed];
  if (!importStatement) return content;

  // Check if import already exists
  if (content.includes(importStatement)) return content;

  // Find existing imports section
  const lines = content.split('\n');
  let importInsertIndex = 0;

  // Find last import or first non-comment line
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (line.startsWith('import ') || line.startsWith('from ')) {
      importInsertIndex = i + 1;
    } else if (line && !line.startsWith('//') && !line.startsWith('/*') && !line.startsWith('*')) {
      break;
    }
  }

  // Insert import statement
  lines.splice(importInsertIndex, 0, importStatement);
  return lines.join('\n');
}

function migrateFile(filePath) {
  try {
    let content = fs.readFileSync(filePath, 'utf8');
    let fileModified = false;
    let replacements = [];

    // Replace hardcoded colors
    for (const [oldColor, newToken] of Object.entries(COLOR_MAPPINGS)) {
      const regex = new RegExp(`['"]${oldColor.replace('#', '\\#')}['"]`, 'g');
      const matches = content.match(regex);
      
      if (matches) {
        content = content.replace(regex, newToken);
        fileModified = true;
        replacements.push({
          from: oldColor,
          to: newToken,
          count: matches.length
        });
        totalReplacements += matches.length;
      }
    }

    if (fileModified) {
      // Add necessary imports
      const tokenTypes = new Set();
      replacements.forEach(rep => {
        const tokenPrefix = rep.to.split('.')[0] + '.';
        if (IMPORT_PATTERNS[tokenPrefix]) {
          tokenTypes.add(tokenPrefix);
        }
      });

      tokenTypes.forEach(tokenType => {
        content = addImportIfNeeded(content, tokenType, filePath);
      });

      // Write back to file
      fs.writeFileSync(filePath, content, 'utf8');
      filesModified.push(filePath);
      
      migrationReport.push({
        file: filePath,
        replacements: replacements
      });

      console.log(`✅ Migrated: ${filePath}`);
      replacements.forEach(rep => {
        console.log(`   ${rep.from} → ${rep.to} (${rep.count} occurrences)`);
      });
    }

  } catch (error) {
    console.error(`❌ Error processing ${filePath}:`, error.message);
  }
}

function generateReport() {
  const reportPath = path.join(__dirname, 'color-migration-report.json');
  const report = {
    timestamp: new Date().toISOString(),
    totalReplacements,
    filesModified: filesModified.length,
    details: migrationReport
  };

  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
  console.log(`\n📊 Migration report saved to: ${reportPath}`);
}

function main() {
  console.log('🎨 Starting color migration...\n');

  // Find all files to process
  const allFiles = [];
  FILE_PATTERNS.forEach(pattern => {
    const files = glob.sync(pattern, { cwd: process.cwd() });
    allFiles.push(...files);
  });

  // Filter out excluded files
  const filesToProcess = allFiles.filter(file => !shouldExcludeFile(file));

  console.log(`Found ${filesToProcess.length} files to process...\n`);

  // Process each file
  filesToProcess.forEach(migrateFile);

  // Generate summary
  console.log('\n🎉 Migration complete!');
  console.log(`📁 Files modified: ${filesModified.length}`);
  console.log(`🔄 Total replacements: ${totalReplacements}`);

  generateReport();

  if (filesModified.length > 0) {
    console.log('\n🚨 Remember to:');
    console.log('1. Test the application thoroughly');
    console.log('2. Run linting and fix any issues');
    console.log('3. Update tests if needed');
    console.log('4. Commit changes with descriptive message');
  }
}

// Run if called directly
if (require.main === module) {
  main();
}

module.exports = { migrateFile, COLOR_MAPPINGS };