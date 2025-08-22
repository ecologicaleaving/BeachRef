/**
 * Contrast Calculation Utilities Tests
 * Validates WCAG 2.1 contrast ratio calculations and compliance checks
 */

import {
import { colors } from '../theme/tokens';
  calculateContrastRatio,
  validateWCAG,
  calculateContrast,
  getBestContrastColor,
  meetsWCAGAAA,
} from '../../utils/contrast';

describe('Contrast Utilities', () => {
  describe('calculateContrastRatio', () => {
    it('should calculate correct contrast ratio for black and white', () => {
      const ratio = calculateContrastRatio('#000000', '#FFFFFF');
      expect(ratio).toBeCloseTo(21, 0); // 21:1 is the theoretical maximum
    });

    it('should calculate correct contrast ratio for same colors', () => {
      const ratio = calculateContrastRatio('#FF0000', '#FF0000');
      expect(ratio).toBeCloseTo(1, 1); // Same colors should have 1:1 ratio
    });

    it('should handle order independence', () => {
      const ratio1 = calculateContrastRatio('#000000', '#FFFFFF');
      const ratio2 = calculateContrastRatio('#FFFFFF', '#000000');
      expect(ratio1).toEqual(ratio2);
    });

    it('should calculate referee color palette contrasts correctly', () => {
      // Test primary color against white background
      const primaryOnWhite = calculateContrastRatio('#1B365D', '#FFFFFF');
      expect(primaryOnWhite).toBeGreaterThan(7); // Should meet WCAG AAA

      // Test text primary against white background
      const textPrimaryOnWhite = calculateContrastRatio('#2C3E50', '#FFFFFF');
      expect(textPrimaryOnWhite).toBeGreaterThan(7); // Should meet WCAG AAA
    });
  });

  describe('validateWCAG', () => {
    it('should validate WCAG AA compliance', () => {
      const { wcagAA, wcagAAA } = validateWCAG(4.5);
      expect(wcagAA).toBe(true);
      expect(wcagAAA).toBe(false);
    });

    it('should validate WCAG AAA compliance', () => {
      const { wcagAA, wcagAAA } = validateWCAG(7.0);
      expect(wcagAA).toBe(true);
      expect(wcagAAA).toBe(true);
    });

    it('should fail both compliance levels for low contrast', () => {
      const { wcagAA, wcagAAA } = validateWCAG(3.0);
      expect(wcagAA).toBe(false);
      expect(wcagAAA).toBe(false);
    });
  });

  describe('calculateContrast', () => {
    it('should return complete contrast information', () => {
      const contrast = calculateContrast('#2C3E50', '#FFFFFF');
      
      expect(contrast).toHaveProperty('ratio');
      expect(contrast).toHaveProperty('wcagAA');
      expect(contrast).toHaveProperty('wcagAAA');
      expect(typeof contrast.ratio).toBe('number');
      expect(typeof contrast.wcagAA).toBe('boolean');
      expect(typeof contrast.wcagAAA).toBe('boolean');
    });

    it('should round ratio to 2 decimal places', () => {
      const contrast = calculateContrast('#808080', '#FFFFFF');
      expect(contrast.ratio.toString()).toMatch(/^\d+\.\d{1,2}$/);
    });
  });

  describe('getBestContrastColor', () => {
    it('should return white for dark backgrounds', () => {
      const best = getBestContrastColor('#1B365D');
      expect(best).toBe('#FFFFFF');
    });

    it('should return black for light backgrounds', () => {
      const best = getBestContrastColor('#FFFFFF');
      expect(best).toBe('#000000');
    });

    it('should handle medium backgrounds correctly', () => {
      const best = getBestContrastColor('#808080');
      // For medium gray, either could work, but should return the better option
      expect(['#FFFFFF', '#000000']).toContain(best);
    });
  });

  describe('meetsWCAGAAA', () => {
    it('should return true for ratios >= 7:1', () => {
      expect(meetsWCAGAAA(7.0)).toBe(true);
      expect(meetsWCAGAAA(8.5)).toBe(true);
      expect(meetsWCAGAAA(21.0)).toBe(true);
    });

    it('should return false for ratios < 7:1', () => {
      expect(meetsWCAGAAA(6.9)).toBe(false);
      expect(meetsWCAGAAA(4.5)).toBe(false);
      expect(meetsWCAGAAA(1.0)).toBe(false);
    });
  });

  describe('Referee Color Palette WCAG AAA Compliance', () => {
    const colors = {
      primary: '#1B365D',
      secondary: '#2B5F75',
      accent: '#9B2D07',
      success: colors.success,
      warning: '#7A4405',
      error: '#8B1538',
      textPrimary: '#2C3E50',
      textSecondary: '#445566',
      background: '#FFFFFF',
    };

    it('should validate text colors meet WCAG AAA on white background', () => {
      const textPrimaryContrast = calculateContrast(colors.textPrimary, colors.background);
      const textSecondaryContrast = calculateContrast(colors.textSecondary, colors.background);

      expect(textPrimaryContrast.wcagAAA).toBe(true);
      expect(textPrimaryContrast.ratio).toBeGreaterThan(7);
      
      // Text secondary might not meet AAA, but should meet AA
      expect(textSecondaryContrast.wcagAA).toBe(true);
    });

    it('should validate accent colors have sufficient contrast', () => {
      const accentContrast = calculateContrast(colors.accent, colors.background);
      const successContrast = calculateContrast(colors.success, colors.background);
      const errorContrast = calculateContrast(colors.error, colors.background);

      // These should at least meet AA standards
      expect(accentContrast.wcagAA).toBe(true);
      expect(successContrast.wcagAA).toBe(true);
      expect(errorContrast.wcagAA).toBe(true);
    });

    it('should validate all critical combinations meet WCAG AAA', () => {
      // Test the most critical text/background combinations
      const criticalCombinations = [
        [colors.textPrimary, colors.background], // Dark text on white
        [colors.background, colors.primary],     // White text on dark primary
      ];

      criticalCombinations.forEach(([foreground, background]) => {
        const contrast = calculateContrast(foreground, background);
        expect(contrast.wcagAAA).toBe(true);
      });
      
      // textPrimary on primary has low contrast, but background on primary is good
      const whiteOnPrimary = calculateContrast(colors.background, colors.primary);
      expect(whiteOnPrimary.wcagAAA).toBe(true);
    });
  });
});