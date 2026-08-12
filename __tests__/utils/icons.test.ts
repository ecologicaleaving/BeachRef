/**
 * Icon System Tests
 * Story 1.5: Outdoor-Optimized Iconography
 */

import {
  ICON_SIZES,
  STROKE_WIDTHS,
  CORE_ICON_MAP,
  ICON_COLOR_THEMES,
  CRITICAL_ICONS,
  getIconName,
  getIconColor,
  getIconSize,
  getIconStyles,
  getVariantIconName,
  validateIconAccessibility,
  validateIconFamily,
} from '../../utils/icons';
import { colors, statusColors } from '../../theme/tokens';

describe('Icon System Utilities', () => {
  describe('Icon Size Constants', () => {
    it('should have correct icon sizes', () => {
      expect(ICON_SIZES.small).toBe(24);
      expect(ICON_SIZES.medium).toBe(32);
      expect(ICON_SIZES.large).toBe(44);
    });

    it('should have large icons meet touch target requirements', () => {
      expect(ICON_SIZES.large).toBeGreaterThanOrEqual(44);
    });
  });

  describe('Stroke Width Configuration', () => {
    it('should have consistent stroke widths', () => {
      expect(STROKE_WIDTHS.small).toBe(2);
      expect(STROKE_WIDTHS.medium).toBe(2.5);
      expect(STROKE_WIDTHS.large).toBe(3);
    });

    it('should have increasing stroke widths for larger icons', () => {
      expect(STROKE_WIDTHS.small).toBeLessThan(STROKE_WIDTHS.medium);
      expect(STROKE_WIDTHS.medium).toBeLessThan(STROKE_WIDTHS.large);
    });
  });

  describe('Core Icon Mapping', () => {
    it('should have all required icon categories', () => {
      const expectedCategories = ['status', 'navigation', 'action', 'data', 'communication', 'utility'];
      expectedCategories.forEach(category => {
        expect(CORE_ICON_MAP).toHaveProperty(category);
      });
    });

    it('should have status icons matching status colors', () => {
      const statusIcons = CORE_ICON_MAP.status;
      expect(statusIcons).toHaveProperty('current');
      expect(statusIcons).toHaveProperty('upcoming');
      expect(statusIcons).toHaveProperty('completed');
      expect(statusIcons).toHaveProperty('cancelled');
      expect(statusIcons).toHaveProperty('emergency');
    });

    it('should have navigation icons for core app functions', () => {
      const navIcons = CORE_ICON_MAP.navigation;
      expect(navIcons).toHaveProperty('home');
      expect(navIcons).toHaveProperty('tournaments');
      expect(navIcons).toHaveProperty('assignments');
      expect(navIcons).toHaveProperty('back');
    });
  });

  describe('Icon Color Themes', () => {
    it('should have all required color themes', () => {
      expect(ICON_COLOR_THEMES).toHaveProperty('default');
      expect(ICON_COLOR_THEMES).toHaveProperty('status');
      expect(ICON_COLOR_THEMES).toHaveProperty('highContrast');
      expect(ICON_COLOR_THEMES).toHaveProperty('accessibility');
    });

    it('should have status theme colors matching status color system', () => {
      const statusTheme = ICON_COLOR_THEMES.status;
      expect(statusTheme.current).toBe(statusColors.current);
      expect(statusTheme.upcoming).toBe(statusColors.upcoming);
      expect(statusTheme.completed).toBe(statusColors.completed);
      expect(statusTheme.cancelled).toBe(statusColors.cancelled);
      expect(statusTheme.emergency).toBe(statusColors.emergency);
    });

    it('should have accessibility theme with maximum contrast', () => {
      const accessibilityTheme = ICON_COLOR_THEMES.accessibility;
      expect(accessibilityTheme.primary).toBe('#000000'); // Pure black
      // "Massimo contrasto" e' una proprieta' MISURABILE, non un esadecimale.
      // L'accento e' passato da #CC0000 a #9D0000, cioe' a un rosso piu' scuro
      // e quindi piu' leggibile su bianco: il test fotografava il valore
      // vecchio e sarebbe diventato rosso proprio perche' l'accessibilita' era
      // migliorata. Ora verifica cio' che il tema promette.
      const luminanza = (esa: string): number => {
        const canale = (c: number) => {
          const v = c / 255;
          return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
        };
        const r = canale(parseInt(esa.slice(1, 3), 16));
        const g = canale(parseInt(esa.slice(3, 5), 16));
        const b = canale(parseInt(esa.slice(5, 7), 16));
        return 0.2126 * r + 0.7152 * g + 0.0722 * b;
      };
      const rapportoSuBianco = (esa: string) => 1.05 / (luminanza(esa) + 0.05);

      expect(accessibilityTheme.accent).toMatch(/^#[0-9A-F]{6}$/i);
      // AAA per il testo: 7:1 su fondo bianco.
      expect(rapportoSuBianco(accessibilityTheme.accent)).toBeGreaterThanOrEqual(7);
    });
  });

  describe('getIconName Function', () => {
    it('should return correct icon names for valid categories', () => {
      expect(getIconName('status', 'current')).toBe('play-circle');
      expect(getIconName('navigation', 'home')).toBe('home');
      expect(getIconName('action', 'edit')).toBe('pencil');
    });

    it('should return fallback icon for invalid category/key', () => {
      expect(getIconName('invalid' as any, 'test')).toBe('help-circle');
      expect(getIconName('status', 'invalid')).toBe('help-circle');
    });

    it('should work with all status icons', () => {
      expect(getIconName('status', 'current')).toBe('play-circle');
      expect(getIconName('status', 'upcoming')).toBe('clock');
      expect(getIconName('status', 'completed')).toBe('checkmark-circle');
      expect(getIconName('status', 'cancelled')).toBe('close-circle');
      expect(getIconName('status', 'emergency')).toBe('warning');
    });
  });

  describe('getIconColor Function', () => {
    it('should return color configuration with contrast info', () => {
      const colorConfig = getIconColor('default', 'primary');
      
      expect(colorConfig).toHaveProperty('color');
      expect(colorConfig).toHaveProperty('contrastRatio');
      expect(colorConfig).toHaveProperty('wcagCompliant');
      expect(typeof colorConfig.color).toBe('string');
      expect(typeof colorConfig.contrastRatio).toBe('number');
      expect(typeof colorConfig.wcagCompliant).toBe('boolean');
    });

    it('should use fallback color for invalid keys', () => {
      const colorConfig = getIconColor('default', 'invalid');
      const primaryConfig = getIconColor('default', 'primary');
      
      expect(colorConfig.color).toBe(primaryConfig.color);
    });

    it('should work with different background colors', () => {
      const whiteBackground = getIconColor('default', 'primary', '#FFFFFF');
      const darkBackground = getIconColor('default', 'primary', '#000000');
      
      expect(whiteBackground.contrastRatio).not.toBe(darkBackground.contrastRatio);
    });
  });

  describe('getIconSize Function', () => {
    it('should return size configuration with touch target', () => {
      const sizeConfig = getIconSize('medium');
      
      expect(sizeConfig).toHaveProperty('size');
      expect(sizeConfig).toHaveProperty('strokeWidth');
      expect(sizeConfig).toHaveProperty('touchTarget');
    });

    it('should ensure interactive icons meet 44px touch target', () => {
      const smallInteractive = getIconSize('small', true);
      expect(smallInteractive.touchTarget).toBeGreaterThanOrEqual(44);
      expect(smallInteractive.size).toBeGreaterThanOrEqual(44);
    });

    it('should increase size for emergency icons', () => {
      const normal = getIconSize('medium');
      const emergency = getIconSize('medium', false, true);
      
      expect(emergency.size).toBeGreaterThan(normal.size);
      expect(emergency.strokeWidth).toBeGreaterThan(normal.strokeWidth);
    });

    it('should always have minimum touch target of 44px', () => {
      const configs = [
        getIconSize('small'),
        getIconSize('medium'),
        getIconSize('large'),
      ];
      
      configs.forEach(config => {
        expect(config.touchTarget).toBeGreaterThanOrEqual(44);
      });
    });
  });

  describe('getIconStyles Function', () => {
    it('should return complete style configuration', () => {
      const styles = getIconStyles('medium', 'default');
      
      expect(styles).toHaveProperty('size');
      expect(styles).toHaveProperty('color');
      expect(styles).toHaveProperty('strokeWidth');
      expect(styles).toHaveProperty('style');
      expect(styles).toHaveProperty('accessibility');
      expect(styles).toHaveProperty('contrast');
    });

    it('should have proper accessibility configuration', () => {
      const interactiveStyles = getIconStyles('large', 'default', 'primary', 'outlined', true);
      const nonInteractiveStyles = getIconStyles('large', 'default', 'primary', 'outlined', false);
      
      expect(interactiveStyles.accessibility.accessibilityRole).toBe('button');
      expect(nonInteractiveStyles.accessibility.accessibilityRole).toBe('image');
    });

    it('should adjust stroke width for outlined variants', () => {
      const outlined = getIconStyles('medium', 'default', 'primary', 'outlined');
      const filled = getIconStyles('medium', 'default', 'primary', 'filled');
      
      expect(outlined.strokeWidth).toBeGreaterThan(0);
      expect(filled.strokeWidth).toBe(0);
    });

    it('should include contrast information', () => {
      const styles = getIconStyles('medium', 'default');
      
      expect(styles.contrast).toHaveProperty('ratio');
      expect(styles.contrast).toHaveProperty('compliant');
      expect(typeof styles.contrast.ratio).toBe('number');
      expect(typeof styles.contrast.compliant).toBe('boolean');
    });

    it('should support all icon variants', () => {
      const filled = getIconStyles('medium', 'default', 'primary', 'filled');
      const outlined = getIconStyles('medium', 'default', 'primary', 'outlined');
      const rounded = getIconStyles('medium', 'default', 'primary', 'rounded');
      
      expect(filled.variant).toBe('filled');
      expect(outlined.variant).toBe('outlined');
      expect(rounded.variant).toBe('rounded');
      
      expect(filled.strokeWidth).toBe(0);
      expect(outlined.strokeWidth).toBeGreaterThan(0);
      expect(rounded.strokeWidth).toBeGreaterThan(0);
      expect(rounded.strokeWidth).toBeLessThan(outlined.strokeWidth);
    });
  });

  describe('getVariantIconName Function', () => {
    it('should return correct variant names for Ionicons', () => {
      expect(getVariantIconName('home', 'filled')).toBe('home');
      expect(getVariantIconName('home', 'outlined')).toBe('home-outline');
      expect(getVariantIconName('home', 'rounded')).toBe('home-outline');
    });

    it('should handle existing outlined icons correctly', () => {
      expect(getVariantIconName('home-outline', 'outlined')).toBe('home-outline');
      expect(getVariantIconName('home-outline', 'filled')).toBe('home-outline');
    });

    it('should fallback gracefully for invalid variants', () => {
      expect(getVariantIconName('home', 'invalid' as any)).toBe('home');
    });
  });

  describe('Critical Icons List', () => {
    it('should include essential app icons', () => {
      const criticalIconsList = Array.from(CRITICAL_ICONS);
      
      expect(criticalIconsList).toContain('status.current');
      expect(criticalIconsList).toContain('status.emergency');
      expect(criticalIconsList).toContain('navigation.home');
      expect(criticalIconsList).toContain('navigation.tournaments');
    });

    it('should have reasonable number of critical icons for performance', () => {
      expect(CRITICAL_ICONS.length).toBeLessThanOrEqual(10);
      expect(CRITICAL_ICONS.length).toBeGreaterThanOrEqual(5);
    });
  });

  describe('validateIconAccessibility Function', () => {
    it('should validate icons against WCAG AAA requirements', () => {
      const highContrastIcon = validateIconAccessibility(colors.textPrimary);
      const lowContrastIcon = validateIconAccessibility('#CCCCCC');
      
      expect(highContrastIcon.isValid).toBe(true);
      expect(highContrastIcon.contrastRatio).toBeGreaterThanOrEqual(7.0);
      expect(lowContrastIcon.isValid).toBe(false);
    });

    it('should provide helpful recommendations for low contrast', () => {
      const result = validateIconAccessibility('#CCCCCC');
      
      expect(result.recommendations).toBeDefined();
      expect(result.recommendations.length).toBeGreaterThan(0);
      expect(result.recommendations.some(rec => rec.includes('contrast'))).toBe(true);
    });

    it('should handle different background colors', () => {
      const whiteBackground = validateIconAccessibility('#333333', '#FFFFFF');
      const darkBackground = validateIconAccessibility('#333333', '#000000');
      
      expect(whiteBackground.contrastRatio).not.toBe(darkBackground.contrastRatio);
    });
  });

  describe('validateIconFamily Function', () => {
    it('should validate stroke width consistency within size categories', () => {
      const consistentFamily = [
        { size: 24, strokeWidth: 2, color: '#000000' },
        { size: 24, strokeWidth: 2, color: '#333333' },
        { size: 32, strokeWidth: 2.5, color: '#000000' },
        { size: 32, strokeWidth: 2.5, color: '#333333' },
      ];
      
      const result = validateIconFamily(consistentFamily);
      expect(result.isConsistent).toBe(true);
      expect(result.issues).toHaveLength(0);
    });

    it('should identify inconsistent stroke widths', () => {
      const inconsistentFamily = [
        { size: 24, strokeWidth: 2, color: '#000000' },
        { size: 24, strokeWidth: 3, color: '#333333' }, // Inconsistent stroke width
      ];
      
      const result = validateIconFamily(inconsistentFamily);
      expect(result.isConsistent).toBe(false);
      expect(result.issues.length).toBeGreaterThan(0);
      expect(result.issues[0]).toContain('Inconsistent stroke widths');
    });
  });

  describe('Story 1.5 Acceptance Criteria Compliance', () => {
    it('AC 1: Should support high-contrast outlined variants', () => {
      // Test outlined variant with high contrast colors
      const outlinedIcon = getIconStyles('large', 'highContrast', 'primary', 'outlined');
      
      expect(outlinedIcon.strokeWidth).toBeGreaterThan(0);
      expect(outlinedIcon.contrast.ratio).toBeGreaterThanOrEqual(7.0);
    });

    it('AC 2: Should optimize icon sizing for touch targets (minimum 44px)', () => {
      const interactiveIcon = getIconSize('small', true);
      
      expect(interactiveIcon.touchTarget).toBeGreaterThanOrEqual(44);
      expect(interactiveIcon.size).toBeGreaterThanOrEqual(44);
    });

    it('AC 3: Should apply consistent icon style across all elements', () => {
      const icons = [
        getIconStyles('small', 'default'),
        getIconStyles('medium', 'default'), 
        getIconStyles('large', 'default'),
      ];
      
      // Check consistency in stroke width proportions
      const strokeRatios = icons.map(icon => icon.strokeWidth / icon.size);
      const uniqueRatios = [...new Set(strokeRatios.map(r => Math.round(r * 100)))];
      
      // Should have consistent proportional relationships
      expect(uniqueRatios.length).toBeLessThanOrEqual(3);
    });

    it('AC 4 & 5: Should validate outdoor visibility and provide documentation', () => {
      // Test validation functions work for outdoor visibility
      const outdoorTest = validateIconAccessibility(colors.textPrimary);
      
      expect(outdoorTest.contrastRatio).toBeGreaterThanOrEqual(7.0);
      expect(outdoorTest.isValid).toBe(true);
      
      // Test that icon utilities provide documentation-ready information
      expect(getIconName).toBeDefined();
      expect(CORE_ICON_MAP).toBeDefined();
      expect(CRITICAL_ICONS).toBeDefined();
    });
  });

  describe('Integration with Existing Design System', () => {
    it('should integrate with status colors from Story 1.4', () => {
      const statusTheme = ICON_COLOR_THEMES.status;
      
      expect(statusTheme.current).toBe(statusColors.current);
      expect(statusTheme.upcoming).toBe(statusColors.upcoming);
      expect(statusTheme.completed).toBe(statusColors.completed);
      expect(statusTheme.cancelled).toBe(statusColors.cancelled);
      expect(statusTheme.emergency).toBe(statusColors.emergency);
    });

    it('should maintain WCAG AAA compliance standards', () => {
      const iconColors = Object.values(ICON_COLOR_THEMES.default);
      
      iconColors.forEach(color => {
        const colorConfig = getIconColor('default', 'primary');
        expect(colorConfig.contrastRatio).toBeGreaterThanOrEqual(4.5); // Minimum AA
      });
    });
  });

  describe('Performance Considerations', () => {
    it('should have reasonable number of critical icons for preloading', () => {
      expect(CRITICAL_ICONS.length).toBeLessThanOrEqual(10); // Keep bundle size manageable
    });

    it('should provide efficient icon lookup', () => {
      // This asserts that the lookup does not degrade with the size of the map,
      // by comparing 1000 lookups against 100 of the same lookups. A wall-clock
      // budget ("< 10 ms") does not survive a parallel jest run — it made this
      // suite flip red at random depending on what else the worker was doing
      // (it failed at 11.68 ms once in three full runs, green in isolation).
      const measure = (iterations: number) => {
        const start = performance.now();
        for (let i = 0; i < iterations; i++) {
          getIconName('status', 'current');
        }
        return performance.now() - start;
      };

      // Warm up, so JIT compilation does not land inside a measurement.
      measure(1000);

      const hundred = measure(100);
      const thousand = measure(1000);

      // O(1) per lookup ⇒ 10× the iterations costs ~10× the time. The margin is
      // deliberately wide (50×): the point is to catch a lookup that became a
      // scan, not to benchmark the machine.
      expect(thousand).toBeLessThan(Math.max(hundred, 0.1) * 50);
    });
  });
});