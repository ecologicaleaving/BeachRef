#!/usr/bin/env tsx
/**
 * Automated TS6133 Fix Script
 * Fixes common "unused variable" patterns across the codebase
 */

import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';

interface TS6133Error {
  file: string;
  line: number;
  column: number;
  variable: string;
  message: string;
}

const DRY_RUN = process.argv.includes('--dry-run');
const VERBOSE = process.argv.includes('--verbose');

console.log('🤖 TS6133 Automated Fix Script\n');
console.log(`Mode: ${DRY_RUN ? 'DRY RUN' : 'APPLY FIXES'}\n`);

// Get all TS6133 errors from TypeScript compiler
function getTS6133Errors(): TS6133Error[] {
  console.log('📋 Collecting TS6133 errors...');

  let output: string;
  try {
    output = execSync('npx tsc --noEmit 2>&1', {
      encoding: 'utf-8',
      maxBuffer: 10 * 1024 * 1024
    });
  } catch (error: any) {
    // TypeScript returns exit code 2 when there are errors
    output = error.stdout || error.output?.[1] || '';
  }

  const errors: TS6133Error[] = [];
  const lines = output.split('\n');

  for (const line of lines) {
    if (!line.includes('error TS6133')) continue;

    // Parse: file(line,col): error TS6133: 'variable' is declared but its value is never read.
    const match = line.match(/^(.+?)\((\d+),(\d+)\):\s+error TS6133:\s+'(.+?)'\s+is declared/);
    if (match) {
      const [, file, lineNum, col, variable] = match;
      errors.push({
        file: file.trim(),
        line: parseInt(lineNum),
        column: parseInt(col),
        variable,
        message: line
      });
    }
  }

  console.log(`Found ${errors.length} TS6133 errors\n`);
  return errors;
}

// Fix unused imports
function fixUnusedImport(content: string, variable: string, line: number): string {
  const lines = content.split('\n');
  const targetLine = lines[line - 1];

  if (!targetLine) return content;

  // Pattern 1: import { Foo } from 'bar'
  if (targetLine.includes('import') && targetLine.includes('{') && targetLine.includes('}')) {
    const importMatch = targetLine.match(/import\s*{\s*([^}]+)\s*}\s*from/);
    if (importMatch) {
      const imports = importMatch[1].split(',').map(i => i.trim()).filter(i => i);
      const filtered = imports.filter(i => !i.includes(variable));

      if (filtered.length === 0) {
        // Remove entire import line
        lines[line - 1] = '';
        if (VERBOSE) console.log(`  ✓ Removed entire import: ${variable}`);
      } else if (filtered.length < imports.length) {
        // Remove just this import
        const newImports = filtered.join(', ');
        lines[line - 1] = targetLine.replace(importMatch[1], newImports);
        if (VERBOSE) console.log(`  ✓ Removed from import: ${variable}`);
      }
    }
  }

  // Pattern 2: import Foo from 'bar'
  else if (targetLine.match(new RegExp(`import\\s+${variable}\\s+from`))) {
    lines[line - 1] = '';
    if (VERBOSE) console.log(`  ✓ Removed default import: ${variable}`);
  }

  return lines.join('\n');
}

// Fix unused destructured variables
function fixUnusedDestructure(content: string, variable: string, line: number): string {
  const lines = content.split('\n');
  const targetLine = lines[line - 1];

  if (!targetLine) return content;

  // Pattern: const { foo, bar, baz } = something
  const destructureMatch = targetLine.match(/const\s*{\s*([^}]+)\s*}\s*=/);
  if (destructureMatch) {
    const vars = destructureMatch[1].split(',').map(v => v.trim()).filter(v => v);
    const filtered = vars.filter(v => !v.startsWith(variable));

    if (filtered.length === 0) {
      // Remove entire line if no variables left
      lines[line - 1] = '';
      if (VERBOSE) console.log(`  ✓ Removed entire destructure: ${variable}`);
    } else if (filtered.length < vars.length) {
      // Remove just this variable
      const newVars = filtered.join(', ');
      lines[line - 1] = targetLine.replace(destructureMatch[1], newVars);
      if (VERBOSE) console.log(`  ✓ Removed from destructure: ${variable}`);
    }
  }

  return lines.join('\n');
}

// Fix unused function parameters
function fixUnusedParameter(content: string, variable: string, line: number): string {
  const lines = content.split('\n');
  const targetLine = lines[line - 1];

  if (!targetLine) return content;

  // Pattern: function foo(bar, baz) or (bar, baz) =>
  // Replace with underscore prefix if not used
  const paramPattern = new RegExp(`\\b${variable}\\b(?=\\s*[,)])`);
  if (paramPattern.test(targetLine)) {
    lines[line - 1] = targetLine.replace(paramPattern, `_${variable}`);
    if (VERBOSE) console.log(`  ✓ Prefixed parameter: ${variable} → _${variable}`);
  }

  return lines.join('\n');
}

// Fix unused array destructure indices
function fixUnusedArrayIndex(content: string, variable: string, line: number): string {
  const lines = content.split('\n');
  const targetLine = lines[line - 1];

  if (!targetLine) return content;

  // Pattern: const [foo, bar] = array or [foo, bar] (in forEach/map)
  if (targetLine.includes('[') && targetLine.includes(']')) {
    // Replace with empty slot or underscore
    const arrayPattern = new RegExp(`\\b${variable}\\b(?=\\s*[,\\]])`);
    if (arrayPattern.test(targetLine)) {
      lines[line - 1] = targetLine.replace(arrayPattern, '');
      if (VERBOSE) console.log(`  ✓ Removed from array destructure: ${variable}`);
    }
  }

  return lines.join('\n');
}

// Main fix function
function fixTS6133Error(error: TS6133Error): boolean {
  const filePath = path.resolve(error.file);

  if (!fs.existsSync(filePath)) {
    console.warn(`⚠️  File not found: ${filePath}`);
    return false;
  }

  let content = fs.readFileSync(filePath, 'utf-8');
  const originalContent = content;

  // Try different fix strategies
  content = fixUnusedImport(content, error.variable, error.line);
  if (content !== originalContent) {
    if (!DRY_RUN) fs.writeFileSync(filePath, content);
    return true;
  }

  content = fixUnusedDestructure(content, error.variable, error.line);
  if (content !== originalContent) {
    if (!DRY_RUN) fs.writeFileSync(filePath, content);
    return true;
  }

  content = fixUnusedParameter(content, error.variable, error.line);
  if (content !== originalContent) {
    if (!DRY_RUN) fs.writeFileSync(filePath, content);
    return true;
  }

  content = fixUnusedArrayIndex(content, error.variable, error.line);
  if (content !== originalContent) {
    if (!DRY_RUN) fs.writeFileSync(filePath, content);
    return true;
  }

  return false;
}

// Group errors by file
function groupErrorsByFile(errors: TS6133Error[]): Map<string, TS6133Error[]> {
  const grouped = new Map<string, TS6133Error[]>();

  for (const error of errors) {
    if (!grouped.has(error.file)) {
      grouped.set(error.file, []);
    }
    grouped.get(error.file)!.push(error);
  }

  return grouped;
}

// Main execution
async function main() {
  const errors = getTS6133Errors();

  if (errors.length === 0) {
    console.log('✅ No TS6133 errors found!');
    return;
  }

  const grouped = groupErrorsByFile(errors);

  console.log(`📁 Processing ${grouped.size} files...\n`);

  let fixedCount = 0;
  let skippedCount = 0;

  for (const [file, fileErrors] of grouped) {
    console.log(`\n📄 ${path.relative(process.cwd(), file)} (${fileErrors.length} errors)`);

    // Sort by line number descending (fix from bottom to top to preserve line numbers)
    fileErrors.sort((a, b) => b.line - a.line);

    for (const error of fileErrors) {
      const fixed = fixTS6133Error(error);
      if (fixed) {
        fixedCount++;
      } else {
        skippedCount++;
        if (VERBOSE) console.log(`  ⏭️  Skipped: ${error.variable} (line ${error.line})`);
      }
    }
  }

  console.log('\n' + '═'.repeat(60));
  console.log(`\n📊 Summary:`);
  console.log(`  ✅ Fixed: ${fixedCount}`);
  console.log(`  ⏭️  Skipped: ${skippedCount}`);
  console.log(`  📝 Total: ${errors.length}`);

  if (DRY_RUN) {
    console.log('\n💡 This was a DRY RUN. Run without --dry-run to apply fixes.');
  } else {
    console.log('\n✨ Fixes applied! Re-run TypeScript to verify.');
  }
}

main().catch(console.error);
