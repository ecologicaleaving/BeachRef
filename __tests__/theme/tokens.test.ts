/**
 * Design Tokens Tests
 * Validates design token structure, types, and contrast compliance
 */

import { designTokens, validateAllContrasts, colors, typography, spacing } from '../../theme/tokens';
import { validateColorCombination } from '../../utils/contrastValidator';

describe('Design Tokens', () => {
  describe('Color Tokens', () => {
    it('should have all required color properties', () => {
      const expectedColors = [
        'primary',
        'secondary', 
        'accent',
        'success',
        'warning',
        'error',
        'textPrimary',
        'textSecondary',
        'background',
      ];

      expectedColors.forEach(colorName => {
        expect(colors).toHaveProperty(colorName);
        expect(typeof colors[colorName as keyof typeof colors]).toBe('string');
        expect(colors[colorName as keyof typeof colors]).toMatch(/^#[0-9A-F]{6}$/i);
      });
    });

    it('should match WCAG AAA adjusted color values', () => {
      // Il nome di questo test promette "WCAG AAA", ma l'asserzione era su
      // nove esadecimali copiati a mano: non verificava alcun contrasto, e si
      // e' rotta appena la tavolozza e' stata ricalcolata — cioe' appena
      // qualcuno ha fatto proprio il lavoro che il test dovrebbe sorvegliare.
      //
      // Ora misura il rapporto di contrasto con il validatore del progetto.
      // AAA per il testo e' 7:1. Se un domani il design cambia ancora, questo
      // test resta valido e continua a proteggere la leggibilita' a bordo
      // campo, che e' la ragione per cui la soglia e' AAA e non AA.
      const suFondo: Array<keyof typeof colors> = [
        'primary',
        'secondary',
        'accent',
        'success',
        'warning',
        'error',
        'textPrimary',
        'textSecondary',
      ];

      suFondo.forEach((token) => {
        const esito = validateColorCombination(token, 'background');
        expect(esito.ratio).toBeGreaterThanOrEqual(7.0);
      });
    });
  });

  describe('Typography Tokens', () => {
    it('should have all typography scale levels', () => {
      const expectedTypography = ['hero', 'h1', 'h2', 'bodyLarge', 'body', 'caption'];
      
      expectedTypography.forEach(level => {
        expect(typography).toHaveProperty(level);
        const typographyLevel = typography[level as keyof typeof typography];
        
        expect(typographyLevel).toHaveProperty('fontSize');
        expect(typographyLevel).toHaveProperty('fontWeight');
        expect(typographyLevel).toHaveProperty('lineHeight');
        expect(typeof typographyLevel.fontSize).toBe('number');
        expect(typeof typographyLevel.fontWeight).toBe('string');
        expect(typeof typographyLevel.lineHeight).toBe('number');
      });
    });

    it('should match referee specification font sizes', () => {
      expect(typography.hero.fontSize).toBe(40);
      expect(typography.h1.fontSize).toBe(32);
      expect(typography.h2.fontSize).toBe(24);
      expect(typography.bodyLarge.fontSize).toBe(18);
      expect(typography.body.fontSize).toBe(16);
      expect(typography.caption.fontSize).toBe(14);
    });

    it('should have proper font weights', () => {
      // `'bold'` e `'700'` rendono identici in React Native: asserire l'una o
      // l'altra forma verifica come e' scritto il token, non come appare il
      // testo. Cio' che conta davvero e' la GERARCHIA — che un titolo pesi
      // piu' del corpo — e quella un test puo' proteggerla sul serio.
      const peso = (v: string | undefined): number => {
        if (v === 'bold') return 700;
        if (v === 'normal' || v === undefined) return 400;
        return Number(v);
      };

      expect(peso(typography.hero.fontWeight)).toBeGreaterThanOrEqual(700);
      expect(peso(typography.h1.fontWeight)).toBeGreaterThanOrEqual(700);
      expect(peso(typography.h2.fontWeight)).toBeGreaterThanOrEqual(600);
      expect(peso(typography.h2.fontWeight)).toBeLessThanOrEqual(peso(typography.h1.fontWeight));
      expect(peso(typography.body.fontWeight)).toBeLessThan(peso(typography.h2.fontWeight));
      expect(peso(typography.bodyLarge.fontWeight)).toBeLessThan(peso(typography.h1.fontWeight));
      expect(peso(typography.caption.fontWeight)).toBeGreaterThanOrEqual(400);
    });

    it('should have logical line height progression', () => {
      // Line heights should be appropriate for readability
      expect(typography.hero.lineHeight).toBe(48);
      expect(typography.h1.lineHeight).toBe(40);
      expect(typography.h2.lineHeight).toBe(32);
      expect(typography.bodyLarge.lineHeight).toBe(28);
      expect(typography.body.lineHeight).toBe(24);
      expect(typography.caption.lineHeight).toBe(20);
    });
  });

  describe('Spacing Tokens', () => {
    it('should follow 8px base unit system', () => {
      expect(spacing.xs).toBe(4);   // 0.5 * 8
      expect(spacing.sm).toBe(8);   // 1 * 8
      expect(spacing.md).toBe(16);  // 2 * 8
      expect(spacing.lg).toBe(24);  // 3 * 8
      expect(spacing.xl).toBe(32);  // 4 * 8
      expect(spacing.xxl).toBe(48); // 6 * 8
    });

    it('should have logical progression', () => {
      expect(spacing.xs).toBeLessThan(spacing.sm);
      expect(spacing.sm).toBeLessThan(spacing.md);
      expect(spacing.md).toBeLessThan(spacing.lg);
      expect(spacing.lg).toBeLessThan(spacing.xl);
      expect(spacing.xl).toBeLessThan(spacing.xxl);
    });
  });

  describe('Complete Design Tokens', () => {
    it('should have all required top-level properties', () => {
      expect(designTokens).toHaveProperty('colors');
      expect(designTokens).toHaveProperty('typography');
      expect(designTokens).toHaveProperty('spacing');
      expect(designTokens).toHaveProperty('contrast');
    });

    it('should have immutable token objects', () => {
      // Test that tokens are readonly
      expect(Object.isFrozen(designTokens.colors)).toBe(false); // const assertion doesn't freeze
      // But the structure should be consistent
      expect(typeof designTokens.colors.primary).toBe('string');
    });
  });

  describe('Contrast Validation', () => {
    it('should have contrast data for all color combinations', () => {
      const expectedContrastColors = [
        'textPrimary',
        'textSecondary',
        'accent',
        'success',
        'warning',
        'error',
      ];

      expectedContrastColors.forEach(colorName => {
        expect(designTokens.contrast).toHaveProperty(colorName);
        const colorContrast = designTokens.contrast[colorName as keyof typeof designTokens.contrast];
        
        expect(colorContrast).toHaveProperty('onBackground');
        expect(colorContrast).toHaveProperty('onPrimary');
        expect(colorContrast).toHaveProperty('onSecondary');
        
        // Each contrast object should have ratio and WCAG compliance flags
        Object.values(colorContrast).forEach(contrast => {
          expect(contrast).toHaveProperty('ratio');
          expect(contrast).toHaveProperty('wcagAA');
          expect(contrast).toHaveProperty('wcagAAA');
          expect(typeof contrast.ratio).toBe('number');
          expect(typeof contrast.wcagAA).toBe('boolean');
          expect(typeof contrast.wcagAAA).toBe('boolean');
        });
      });
    });

    it('should validate critical text combinations meet WCAG AAA', () => {
      // Primary text on background should meet WCAG AAA
      const textOnBackground = designTokens.contrast.textPrimary.onBackground;
      expect(textOnBackground.wcagAAA).toBe(true);
      expect(textOnBackground.ratio).toBeGreaterThanOrEqual(7);
    });

    it('should run validation function without errors', () => {
      // Mock console methods to avoid noise in tests
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

      const result = validateAllContrasts();
      expect(typeof result).toBe('boolean');

      consoleSpy.mockRestore();
      consoleWarnSpy.mockRestore();
      consoleErrorSpy.mockRestore();
    });
  });
});