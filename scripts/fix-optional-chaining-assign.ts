#!/usr/bin/env tsx
/**
 * Fix Optional Chaining Assignment Syntax Error
 * Removes invalid `?.property = value` patterns
 */

import { readdirSync, readFileSync, writeFileSync, statSync } from 'fs';
import { join } from 'path';

const DRY_RUN = process.argv.includes('--dry-run');

// Directories to process
const DIRS_TO_PROCESS = [
  'screens',
  'components',
  'services',
  'hooks',
  'utils',
  'lib',
  'repositories',
];

// Directories to exclude
const EXCLUDE_PATTERNS = [
  'node_modules',
  'coverage',
  '__tests__',
  'supabase',
  'specs',
  '.expo',
  'dist',
  'build',
  'BeachRef-Complete-Deploy',
];

interface Fix {
  file: string;
  line: number;
  original: string;
  fixed: string;
}

const fixes: Fix[] = [];

function shouldExclude(path: string): boolean {
  return EXCLUDE_PATTERNS.some(pattern => path.includes(pattern));
}

function processFile(filePath: string): void {
  if (!filePath.match(/\.(ts|tsx)$/)) return;
  if (shouldExclude(filePath)) return;

  try {
    const content = readFileSync(filePath, 'utf-8');
    const lines = content.split('\n');
    let modified = false;
    const newLines: string[] = [];

    lines.forEach((line, index) => {
      // Pattern: something?.property = value (ASSIGNMENT ONLY)
      // Match: ?.word followed by = but NOT == or === or !=
      // Negative lookahead to exclude comparisons
      const pattern = /\?\.(\w+)\s*=(?![=>])/;

      if (pattern.test(line)) {
        // Only fix the assignment, not comparisons
        const fixedLine = line.replace(
          /\?\.(\w+)(\s*)=(?![=>])/g,
          '.$1$2='
        );

        fixes.push({
          file: filePath,
          line: index + 1,
          original: line.trim(),
          fixed: fixedLine.trim(),
        });

        newLines.push(fixedLine);
        modified = true;
      } else {
        newLines.push(line);
      }
    });

    if (modified && !DRY_RUN) {
      writeFileSync(filePath, newLines.join('\n'), 'utf-8');
    }
  } catch (error) {
    console.error(`Error processing ${filePath}:`, error);
  }
}

function processDirectory(dirPath: string): void {
  if (shouldExclude(dirPath)) return;

  try {
    const entries = readdirSync(dirPath);

    entries.forEach(entry => {
      const fullPath = join(dirPath, entry);

      try {
        const stat = statSync(fullPath);

        if (stat.isDirectory()) {
          processDirectory(fullPath);
        } else if (stat.isFile()) {
          processFile(fullPath);
        }
      } catch (error) {
        // Skip files we can't access
      }
    });
  } catch (error) {
    // Skip directories we can't read
  }
}

// Main
console.log('🔧 Fixing Optional Chaining Assignment Syntax Errors\n');
console.log(`Mode: ${DRY_RUN ? 'DRY RUN (no changes)' : 'LIVE (will modify files)'}\n`);

DIRS_TO_PROCESS.forEach(dir => {
  const dirPath = join(process.cwd(), dir);
  try {
    if (statSync(dirPath).isDirectory()) {
      console.log(`Processing ${dir}/...`);
      processDirectory(dirPath);
    }
  } catch {
    console.log(`Skipping ${dir}/ (not found)`);
  }
});

console.log('\n' + '='.repeat(60));
console.log(`Total fixes: ${fixes.length}`);

if (fixes.length > 0) {
  console.log('\nFiles modified:');
  const fileGroups = fixes.reduce((acc, fix) => {
    if (!acc[fix.file]) acc[fix.file] = [];
    acc[fix.file].push(fix);
    return acc;
  }, {} as Record<string, Fix[]>);

  Object.entries(fileGroups).forEach(([file, fileFixes]) => {
    console.log(`\n  ${file} (${fileFixes.length} fixes)`);
    fileFixes.slice(0, 3).forEach(fix => {
      console.log(`    Line ${fix.line}:`);
      console.log(`      - ${fix.original}`);
      console.log(`      + ${fix.fixed}`);
    });
    if (fileFixes.length > 3) {
      console.log(`    ... and ${fileFixes.length - 3} more`);
    }
  });

  if (DRY_RUN) {
    console.log('\n⚠️  DRY RUN - No files were modified');
    console.log('Run without --dry-run to apply fixes');
  } else {
    console.log('\n✅ All fixes applied!');
  }
} else {
  console.log('\n✅ No issues found!');
}

console.log('='.repeat(60));
