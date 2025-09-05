/**
 * Automated Contrast Validation Utilities
 * WCAG AAA Compliance Testing for CI/CD Pipeline
 */

import { colors } from '../theme/tokens';
import { calculateContrastRatio } from './contrast';

export interface ContrastResult {
  foreground: string;
  background: string;
  ratio: number;
  wcagAA: boolean;
  wcagAAA: boolean;
  isValid: boolean;
  level: 'Pass' | 'AA' | 'Fail';
}

export interface ValidationReport {
  passed: ContrastResult[];
  failed: ContrastResult[];
  warnings: ContrastResult[];
  totalTests: number;
  passRate: number;
  summary: string;
}

/**
 * Critical color combinations that must meet WCAG AAA (7:1) standards
 */
export const CRITICAL_COMBINATIONS = [
  // Primary text combinations
  { fg: 'textPrimary', bg: 'background', description: 'Primary text on white background' },
  { fg: 'textSecondary', bg: 'background', description: 'Secondary text on white background' },
  
  // Status color combinations
  { fg: 'success', bg: 'background', description: 'Success status on white background' },
  { fg: 'warning', bg: 'background', description: 'Warning status on white background' },
  { fg: 'error', bg: 'background', description: 'Error status on white background' },
  { fg: 'accent', bg: 'background', description: 'Accent color on white background' },
  
  // Inverse text combinations (white text on colored backgrounds)
  { fg: 'background', bg: 'primary', description: 'White text on primary background' },
  { fg: 'background', bg: 'secondary', description: 'White text on secondary background' },
  { fg: 'background', bg: 'success', description: 'White text on success background' },
  { fg: 'background', bg: 'error', description: 'White text on error background' },
] as const;

/**
 * Additional combinations that should meet WCAG AA (4.5:1) standards
 */
export const STANDARD_COMBINATIONS = [
  { fg: 'primary', bg: 'background', description: 'Primary brand on white background' },
  { fg: 'secondary', bg: 'background', description: 'Secondary brand on white background' },
] as const;

/**
 * Validate a single color combination
 */
export function validateColorCombination(
  foreground: keyof typeof colors,
  background: keyof typeof colors,
  description?: string
): ContrastResult {
  const fgColor = colors[foreground];
  const bgColor = colors[background];
  const ratio = calculateContrastRatio(fgColor, bgColor);
  
  const wcagAA = ratio >= 4.5;
  const wcagAAA = ratio >= 7.0;
  
  let level: 'Pass' | 'AA' | 'Fail';
  if (wcagAAA) {
    level = 'Pass';
  } else if (wcagAA) {
    level = 'AA';
  } else {
    level = 'Fail';
  }
  
  return {
    foreground: fgColor,
    background: bgColor,
    ratio: Math.round(ratio * 100) / 100,
    wcagAA,
    wcagAAA,
    isValid: wcagAAA,
    level,
  };
}

/**
 * Run comprehensive contrast validation for all critical combinations
 */
export function validateAllCriticalCombinations(): ValidationReport {
  const results: ContrastResult[] = [];
  
  // Test critical combinations (must meet WCAG AAA)
  CRITICAL_COMBINATIONS.forEach(combo => {
    const result = validateColorCombination(combo.fg, combo.bg, combo.description);
    results.push(result);
  });
  
  // Test standard combinations (should meet WCAG AA)
  STANDARD_COMBINATIONS.forEach(combo => {
    const result = validateColorCombination(combo.fg, combo.bg, combo.description);
    results.push(result);
  });
  
  const passed = results.filter(r => r.isValid);
  const failed = results.filter(r => !r.wcagAA);
  const warnings = results.filter(r => r.wcagAA && !r.wcagAAA);
  
  const totalTests = results.length;
  const passRate = Math.round((passed.length / totalTests) * 100);
  
  const summary = `Contrast Validation: ${passed.length}/${totalTests} passed (${passRate}%), ${warnings.length} warnings, ${failed.length} failures`;
  
  return {
    passed,
    failed,
    warnings,
    totalTests,
    passRate,
    summary,
  };
}

/**
 * Generate detailed validation report for CI/CD pipeline
 */
export function generateValidationReport(): string {
  const report = validateAllCriticalCombinations();
  
  let output = '\n=== WCAG AAA Contrast Validation Report ===\n\n';
  output += `${report.summary}\n\n`;
  
  if (report.passed.length > 0) {
    output += '✅ PASSED (WCAG AAA - 7:1 ratio):\n';
    report.passed.forEach(result => {
      output += `   ${result.ratio}:1 - ${result.foreground} on ${result.background}\n`;
    });
    output += '\n';
  }
  
  if (report.warnings.length > 0) {
    output += '⚠️  WARNINGS (WCAG AA - 4.5:1 ratio, but not AAA):\n';
    report.warnings.forEach(result => {
      output += `   ${result.ratio}:1 - ${result.foreground} on ${result.background}\n`;
    });
    output += '\n';
  }
  
  if (report.failed.length > 0) {
    output += '❌ FAILED (Below WCAG AA standards):\n';
    report.failed.forEach(result => {
      output += `   ${result.ratio}:1 - ${result.foreground} on ${result.background}\n`;
    });
    output += '\n';
  }
  
  output += '=== End Report ===\n';
  
  return output;
}

/**
 * Validate contrast ratios and throw error if critical combinations fail
 * Used in CI/CD pipeline to fail builds with accessibility issues
 */
export function validateContrastOrFail(): void {
  const report = validateAllCriticalCombinations();
  
  if (report.failed.length > 0) {
    const failureDetails = report.failed
      .map(r => `${r.foreground} on ${r.background}: ${r.ratio}:1`)
      .join(', ');
    
    throw new Error(
      `WCAG Contrast Validation Failed: ${report.failed.length} critical combinations below accessibility standards. ` +
      `Failed combinations: ${failureDetails}. All critical combinations must meet WCAG AAA (7:1 minimum).`
    );
  }
  
  // console.log('✅ WCAG AAA Contrast Validation: All critical combinations passed');
  
  if (report.warnings.length > 0) {
    // console.warn(`⚠️  ${report.warnings.length} combinations meet WCAG AA but not AAA standards`);
  }
}

/**
 * Development utility to check specific color combinations
 */
export function checkCombination(
  foreground: keyof typeof colors,
  background: keyof typeof colors
): void {
  const result = validateColorCombination(foreground, background);
  
  // console.log(`\n=== Color Combination Check ===`);
  // console.log(`Foreground: ${foreground} (${result.foreground})`);
  // console.log(`Background: ${background} (${result.background})`);
  // console.log(`Contrast Ratio: ${result.ratio}:1`);
  // console.log(`WCAG AA (4.5:1): ${result.wcagAA ? '✅' : '❌'}`);
  // console.log(`WCAG AAA (7:1): ${result.wcagAAA ? '✅' : '❌'}`);
  // console.log(`Status: ${result.level}`);
  // console.log(`================================\n`);
}

/**
 * Batch check multiple combinations for development
 */
export function checkMultipleCombinations(
  combinations: Array<{ fg: keyof typeof colors; bg: keyof typeof colors; desc?: string }>
): void {
  // console.log('\n=== Batch Color Combination Check ===\n');
  
  combinations.forEach((combo, index) => {
    const result = validateColorCombination(combo.fg, combo.bg);
    const status = result.wcagAAA ? '✅ AAA' : result.wcagAA ? '⚠️  AA' : '❌ FAIL';
    
    // console.log(
    //   `${index + 1}. ${combo.desc || `${combo.fg} on ${combo.bg}`}: ` +
    //   `${result.ratio}:1 ${status}`
    // );
  });
  
  // console.log('\n======================================\n');
}