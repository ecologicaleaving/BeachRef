#!/usr/bin/env ts-node

/**
 * Automated TypeScript TS2532/TS18048 Error Fixer
 *
 * Fixes "Object is possibly 'undefined'" errors by:
 * - Adding nullish coalescing operators (?? '')
 * - Adding optional chaining operators (?.)
 * - Adding non-null assertions (!) when safe
 *
 * Usage:
 *   npm run fix-undefined          # Apply fixes
 *   npm run fix-undefined -- --dry-run  # Preview only
 */

import { execSync } from 'child_process';
import { readFileSync, writeFileSync } from 'fs';
import { resolve } from 'path';

interface UndefinedError {
  file: string;
  line: number;
  column: number;
  message: string;
  context: string;
}

const DRY_RUN = process.argv.includes('--dry-run');
const VERBOSE = process.argv.includes('--verbose');

// Patterns to fix
const FIX_PATTERNS = {
  // Array access after length check: arr[0] -> arr[0]!
  arrayAccessAfterCheck: /if \((\w+)\.length > 0\)/,

  // Regex match array access: match[1] -> match[1] ?? ''
  regexMatchAccess: /(\w+)\[(\d+)\]/,

  // String methods on possibly undefined: str.trim() -> (str ?? '').trim()
  stringMethods: /\.(?:trim|toLowerCase|toUpperCase|split|includes|startsWith|endsWith)\(/,

  // parseInt with possibly undefined: parseInt(val) -> parseInt(val ?? '0')
  parseIntUndefined: /parseInt\(([^)]+)\)/,

  // Optional property access: obj.prop -> obj?.prop
  propertyAccess: /(\w+)\.(\w+)/,
};

function log(message: string, level: 'info' | 'success' | 'warning' | 'error' = 'info') {
  const icons = { info: '📋', success: '✅', warning: '⚠️', error: '❌' };
  console.log(`${icons[level]} ${message}`);
}

function getTypeScriptErrors(): UndefinedError[] {
  log('Scanning for TS2532/TS18048 errors...', 'info');

  let output: string;
  try {
    output = execSync('npx tsc --noEmit 2>&1', {
      encoding: 'utf-8',
      maxBuffer: 10 * 1024 * 1024
    });
  } catch (error: any) {
    output = error.stdout || error.output?.[1] || '';
  }

  const errors: UndefinedError[] = [];
  const lines = output.split(/\r?\n/);
  let totalMatches = 0;
  let filteredOut = 0;

  if (VERBOSE) {
    log(`  Total lines in output: ${lines.length}`, 'info');
    const ts2532Lines = lines.filter(l => l.includes('TS2532') || l.includes('TS18048'));
    log(`  Lines with TS2532/TS18048: ${ts2532Lines.length}`, 'info');
    if (ts2532Lines.length > 0) {
      const sampleLine = ts2532Lines[0] ?? '';
      log(`  Sample TS2532/TS18048 line:`, 'info');
      log(`    "${sampleLine}"`, 'info');
      const testMatch = sampleLine.match(/^(.+\.tsx?)\((\d+),(\d+)\): error TS(?:2532|18048): (.+)$/);
      log(`  Regex test result: ${testMatch ? 'MATCHED' : 'NO MATCH'}`, testMatch ? 'success' : 'error');
      if (testMatch) {
        log(`    File: ${testMatch[1]}`, 'info');
      }
    }
  }

  for (const line of lines) {
    // Match both TS2532 and TS18048: file.ts(line,col): error TS2532/TS18048: ... possibly 'undefined'.
    const match = line.match(/^(.+\.tsx?)\((\d+),(\d+)\): error TS(?:2532|18048): (.+)$/);
    if (match) {
      totalMatches++;
      const [, file, lineStr, colStr, message] = match;

      // Only process app/screens/components/services files
      if (!file.match(/(^|\/)(?:app|screens|components|services)\//)) {
        filteredOut++;
        continue;
      }

      errors.push({
        file: file!,
        line: parseInt(lineStr ?? '0'),
        column: parseInt(colStr ?? '0'),
        message: message!,
        context: ''
      });
    }
  }

  if (VERBOSE) {
    log(`  Total TS2532/TS18048 matches: ${totalMatches}`, 'info');
    log(`  Filtered out (not in target dirs): ${filteredOut}`, 'info');
    log(`  Errors to fix: ${errors.length}`, 'info');
  }

  return errors;
}

function readLine(file: string, lineNumber: number): string {
  try {
    const content = readFileSync(file, 'utf-8');
    const lines = content.split('\n');
    return lines[lineNumber - 1] ?? '';
  } catch {
    return '';
  }
}

function applyFix(error: UndefinedError): { fixed: boolean; strategy: string } {
  const filePath = resolve(error.file);
  const line = readLine(filePath, error.line);

  if (!line || line.trim().length === 0) {
    return { fixed: false, strategy: 'empty-line' };
  }

  let content: string;
  try {
    content = readFileSync(filePath, 'utf-8');
  } catch {
    return { fixed: false, strategy: 'read-error' };
  }

  const lines = content.split(/\r?\n/);
  const targetLine = lines[error.line - 1];

  if (!targetLine) {
    return { fixed: false, strategy: 'line-not-found' };
  }

  let newLine = targetLine;
  let strategy = '';

  // Check context: look at previous lines for patterns
  const prevLine1 = lines[error.line - 2] ?? '';
  const prevLine2 = lines[error.line - 3] ?? '';
  const prevLine3 = lines[error.line - 4] ?? '';

  // Strategy 1: Variable used after array access post length check
  // Pattern: if (arr.length > 0) { const item = arr[0]; ... item.something ... }
  const isVariableFromArrayAccess = prevLine1.match(/const (\w+) = (\w+)\[/) ||
                                     prevLine2.match(/const (\w+) = (\w+)\[/) ||
                                     prevLine3.match(/const (\w+) = (\w+)\[/);
  const isAfterLengthCheck = prevLine1.includes('.length >') ||
                              prevLine2.includes('.length >') ||
                              prevLine3.includes('.length >') ||
                              prevLine3.includes('for (let i = 0; i <') ||
                              prevLine3.includes('for (const ');

  if (isVariableFromArrayAccess && isAfterLengthCheck) {
    const varMatch = targetLine.match(/(\w+)\.(getAttribute|[\w]+)/);
    if (varMatch) {
      const varName = varMatch[1];
      const method = varMatch[2];
      // Don't add ! if already has optional chaining or non-null assertion
      if (!targetLine.includes('?.') && !targetLine.includes(`${varName}!`)) {
        newLine = targetLine.replace(`${varName}.${method}`, `${varName}!.${method}`);
        strategy = 'variable-after-length-check';
      }
    }
  }

  // Strategy 2: Array access within for loop or after length check
  else if (targetLine.match(/(\w+)\[i\]/) || targetLine.match(/(\w+)\[0\]/) || targetLine.match(/(\w+)\[1\]/)) {
    const inForLoop = prevLine1.includes('for (let i = 0;') ||
                      prevLine2.includes('for (let i = 0;') ||
                      prevLine3.includes('for (let i = 0;');
    const afterLengthCheck = prevLine1.includes('.length >') ||
                             prevLine2.includes('.length >') ||
                             prevLine3.includes('.length >');

    if (inForLoop || afterLengthCheck) {
      // Use non-null assertion for array access
      newLine = targetLine.replace(/(\w+)\[([i0-9]+)\](\.)/g, '$1[$2]!$3');
      strategy = 'array-access-non-null';
    } else {
      // Use optional chaining for uncertain cases
      newLine = targetLine.replace(/(\w+)\[([0-9]+)\](\.)/g, '$1[$2]?$3');
      strategy = 'array-access-optional';
    }
  }

  // Strategy 3: String method calls on possibly undefined
  else if (targetLine.match(/\.(?:trim|toLowerCase|toUpperCase|split|includes|startsWith|endsWith)\(/)) {
    const methodMatch = targetLine.match(/(\w+)(\.(?:trim|toLowerCase|toUpperCase|split|includes|startsWith|endsWith)\()/);
    if (methodMatch) {
      const varName = methodMatch[1];
      const method = methodMatch[2];
      if (!targetLine.includes('??')) {
        newLine = targetLine.replace(`${varName}${method}`, `(${varName} ?? '')${method}`);
        strategy = 'string-method-nullish';
      }
    }
  }

  // Strategy 4: parseInt with possibly undefined
  else if (targetLine.includes('parseInt(')) {
    newLine = targetLine.replace(/parseInt\(([^)]+)\)/g, (match, arg) => {
      if (arg.includes('??')) return match;
      return `parseInt(${arg} ?? '0')`;
    });
    strategy = 'parseInt-nullish';
  }

  // Strategy 5: getAttribute() calls - DISABLED (creates TS2869 errors)
  // The pattern getAttribute('No' ?? '0') is incorrect
  // getAttribute already returns string | null, so use || after the call
  // else if (targetLine.includes('.getAttribute(')) {
  //   ...
  // }

  // Strategy 6: Property access - use optional chaining
  else if (targetLine.includes('.')) {
    if (!targetLine.includes('?.') && !targetLine.includes('!.')) {
      const beforeError = targetLine.substring(0, error.column - 1);
      const lastDot = beforeError.lastIndexOf('.');
      if (lastDot !== -1) {
        newLine = targetLine.substring(0, lastDot) + '?.' + targetLine.substring(lastDot + 1);
        strategy = 'optional-chaining';
      }
    }
  }

  // If no fix applied, skip
  if (newLine === targetLine) {
    return { fixed: false, strategy: 'no-pattern-match' };
  }

  if (VERBOSE) {
    log(`  ${error.file}:${error.line}`, 'info');
    log(`    Before: ${targetLine.trim()}`, 'info');
    log(`    After:  ${newLine.trim()}`, 'info');
    log(`    Strategy: ${strategy}`, 'info');
  }

  if (!DRY_RUN) {
    lines[error.line - 1] = newLine;
    writeFileSync(filePath, lines.join('\n'), 'utf-8');
  }

  return { fixed: true, strategy };
}

async function main() {
  log('🔧 TypeScript TS2532 Auto-Fixer', 'info');
  log('================================\n', 'info');

  if (DRY_RUN) {
    log('Running in DRY-RUN mode (no changes will be made)\n', 'warning');
  }

  const errors = getTypeScriptErrors();
  log(`Found ${errors.length} TS2532/TS18048 errors in app code\n`, 'info');

  if (errors.length === 0) {
    log('No errors to fix!', 'success');
    return;
  }

  const stats = {
    total: errors.length,
    fixed: 0,
    skipped: 0,
    strategies: new Map<string, number>()
  };

  for (const error of errors) {
    const result = applyFix(error);

    if (result.fixed) {
      stats.fixed++;
      stats.strategies.set(
        result.strategy,
        (stats.strategies.get(result.strategy) || 0) + 1
      );
    } else {
      stats.skipped++;
      if (VERBOSE) {
        log(`  Skipped ${error.file}:${error.line} (${result.strategy})`, 'warning');
      }
    }
  }

  log('\n================================', 'info');
  log('Summary:', 'info');
  log(`  Total errors: ${stats.total}`, 'info');
  log(`  Fixed: ${stats.fixed}`, stats.fixed > 0 ? 'success' : 'info');
  log(`  Skipped: ${stats.skipped}`, 'info');

  if (stats.strategies.size > 0) {
    log('\nStrategies used:', 'info');
    stats.strategies.forEach((count, strategy) => {
      log(`  ${strategy}: ${count}`, 'info');
    });
  }

  if (!DRY_RUN && stats.fixed > 0) {
    log('\n✨ Changes applied! Run `npx tsc --noEmit` to verify.', 'success');
  } else if (DRY_RUN && stats.fixed > 0) {
    log('\n💡 Run without --dry-run to apply changes.', 'info');
  }
}

main().catch(error => {
  log(`Fatal error: ${error instanceof Error ? error.message : String(error)}`, 'error');
  process.exit(1);
});
