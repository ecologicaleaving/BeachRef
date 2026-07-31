/**
 * Brand Color Utility Tests
 * Test FIVB brand color functionality and adaptive color system
 */

import { getBrandColor, getAdaptiveColor, colorPalette } from '../../utils/colors';
import { brandColors, colors } from '../../theme/tokens';

describe('Brand Color Utilities', () => {
  describe('getBrandColor', () => {
    it('should return original FIVB brand colors', () => {
      expect(getBrandColor('fivbPrimary')).toBe('#1B365D');
      expect(getBrandColor('fivbSecondary')).toBe('#4A90A4');
      expect(getBrandColor('fivbAccent')).toBe('#FF6B35');
      expect(getBrandColor('fivbSuccess')).toBe('#0F4C75');
      expect(getBrandColor('fivbWarning')).toBe('#FF8C00');
      expect(getBrandColor('fivbError')).toBe('#C41E3A');
    });

    it('should return brand color variants', () => {
      expect(getBrandColor('primaryLight')).toBe('#E8EDF5');
      expect(getBrandColor('secondaryLight')).toBe('#E8F2F5');
      expect(getBrandColor('accentLight')).toBe('#FFF0E8');
    });
  });

  describe('getAdaptiveColor', () => {
    it('should return WCAG-compliant colors by default', () => {
      expect(getAdaptiveColor('secondary')).toBe('#2B5F75'); // WCAG version
      expect(getAdaptiveColor('accent')).toBe('#B8391A'); // WCAG version
      expect(getAdaptiveColor('warning')).toBe('#B8530A'); // WCAG version
    });

    it('should return original FIVB colors when requested', () => {
      expect(getAdaptiveColor('secondary', true)).toBe('#4A90A4'); // Original FIVB
      expect(getAdaptiveColor('accent', true)).toBe('#FF6B35'); // Original FIVB
      expect(getAdaptiveColor('warning', true)).toBe('#FF8C00'); // Original FIVB
    });

    it('should return same color for unmapped colors regardless of flag', () => {
      expect(getAdaptiveColor('primary', false)).toBe('#1B365D');
      expect(getAdaptiveColor('primary', true)).toBe('#1B365D');
      expect(getAdaptiveColor('textPrimary', false)).toBe('#2C3E50');
      expect(getAdaptiveColor('textPrimary', true)).toBe('#2C3E50');
    });
  });

  describe('colorPalette', () => {
    it('should include both WCAG and brand colors', () => {
      // WCAG colors
      expect(colorPalette.secondary).toBe('#2B5F75');
      expect(colorPalette.accent).toBe('#B8391A');
      
      // Original FIVB brand colors
      expect(colorPalette.fivbSecondary).toBe('#4A90A4');
      expect(colorPalette.fivbAccent).toBe('#FF6B35');
      
      // Brand variants
      expect(colorPalette.primaryLight).toBe('#E8EDF5');
      expect(colorPalette.secondaryLight).toBe('#E8F2F5');
      expect(colorPalette.accentLight).toBe('#FFF0E8');
    });

    it('should maintain semantic aliases', () => {
      expect(colorPalette.success).toBe(colors.success);
      expect(colorPalette.info).toBe(colors.secondary);
      expect(colorPalette.warning).toBe(colors.warning);
      expect(colorPalette.danger).toBe(colors.error);
      expect(colorPalette.light).toBe(colors.background);
      expect(colorPalette.dark).toBe(colors.primary);
    });
  });

  describe('FIVB Brand Color Integration', () => {
    it('should provide both accessibility-compliant and brand-accurate color options', () => {
      // Accessibility-first for critical UI elements
      const accessibleAccent = getAdaptiveColor('accent', false);
      const accessibleWarning = getAdaptiveColor('warning', false);
      
      // Brand-accurate for decorative elements
      const brandAccent = getAdaptiveColor('accent', true);
      const brandWarning = getAdaptiveColor('warning', true);
      
      expect(accessibleAccent).not.toBe(brandAccent);
      expect(accessibleWarning).not.toBe(brandWarning);
      
      // Both should be valid hex colors
      expect(accessibleAccent).toMatch(/^#[0-9A-F]{6}$/i);
      expect(brandAccent).toMatch(/^#[0-9A-F]{6}$/i);
    });

    it('should maintain FIVB primary brand color consistency', () => {
      // Primary color should be the same across all systems (already WCAG compliant)
      expect(colors.primary).toBe(brandColors.fivbPrimary);
      expect(getAdaptiveColor('primary', false)).toBe(getAdaptiveColor('primary', true));
    });
  });
});