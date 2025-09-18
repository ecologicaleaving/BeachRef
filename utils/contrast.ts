/**
 * Color Contrast Calculation and WCAG Validation Utilities
 * Implements WCAG 2.1 contrast ratio calculations for accessibility compliance
 */

import { ColorContrast } from '../types/theme';

/**
 * Convert hex color to RGB values
 */
function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!result) {
    throw new Error(`Invalid hex color: ${hex}`);
  }
  return {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16),
  };
}

/**
 * Calculate relative luminance for a color
 * Formula from WCAG 2.1 specification
 */
function getRelativeLuminance(hex: string): number {
  const { r, g, b } = hexToRgb(hex);
  
  const rsRGB = r / 255;
  const gsRGB = g / 255;
  const bsRGB = b / 255;

  const rLinear = rsRGB <= 0.03928 ? rsRGB / 12.92 : Math.pow((rsRGB + 0.055) / 1.055, 2.4);
  const gLinear = gsRGB <= 0.03928 ? gsRGB / 12.92 : Math.pow((gsRGB + 0.055) / 1.055, 2.4);
  const bLinear = bsRGB <= 0.03928 ? bsRGB / 12.92 : Math.pow((bsRGB + 0.055) / 1.055, 2.4);

  return 0.2126 * rLinear + 0.7152 * gLinear + 0.0722 * bLinear;
}

/**
 * Calculate contrast ratio between two colors
 * Formula: (L1 + 0.05) / (L2 + 0.05) where L1 is lighter and L2 is darker
 */
export function calculateContrastRatio(color1: string, color2: string): number {
  const luminance1 = getRelativeLuminance(color1);
  const luminance2 = getRelativeLuminance(color2);
  
  const lighter = Math.max(luminance1, luminance2);
  const darker = Math.min(luminance1, luminance2);
  
  return (lighter + 0.05) / (darker + 0.05);
}

/**
 * Validate WCAG compliance levels for a contrast ratio
 */
export function validateWCAG(ratio: number): { wcagAA: boolean; wcagAAA: boolean } {
  return {
    wcagAA: ratio >= 4.5,   // WCAG AA large text: 3:1, normal text: 4.5:1
    wcagAAA: ratio >= 7,    // WCAG AAA large text: 4.5:1, normal text: 7:1
  };
}

/**
 * Calculate contrast and WCAG compliance for two colors
 */
export function calculateContrast(foreground: string, background: string): ColorContrast {
  const ratio = calculateContrastRatio(foreground, background);
  const { wcagAA, wcagAAA } = validateWCAG(ratio);
  
  return {
    ratio: Math.round(ratio * 100) / 100, // Round to 2 decimal places
    wcagAA,
    wcagAAA,
  };
}

/**
 * Find the best contrast color (black or white) for a given background
 */
export function getBestContrastColor(backgroundColor: string): string {
  const whiteContrast = calculateContrastRatio('#FFFFFF', backgroundColor);
  const blackContrast = calculateContrastRatio('#000000', backgroundColor);
  
  return whiteContrast > blackContrast ? '#FFFFFF' : '#000000';
}

/**
 * Validate that a contrast ratio meets WCAG AAA standards (7:1)
 */
export function meetsWCAGAAA(ratio: number): boolean {
  return ratio >= 7;
}

/**
 * Generate contrast report for debugging
 */
export function generateContrastReport(
  foreground: string, 
  background: string, 
  description?: string
): void {
  const contrast = calculateContrast(foreground, background);
  const prefix = description ? `${description}: ` : '';
  
}