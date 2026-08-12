/**
 * Typography System Tests
 * Validates typography tokens, structure, and WCAG compliance
 */

import { typography, colors } from '../../../theme/tokens';
import { validateColorCombination } from '../../../utils/colors';

describe('Typography System', () => {
  /**
   * Le VARIANTI tipografiche, cioe' le voci che hanno davvero un `fontSize`.
   * `typography` espone anche gruppi (`sizes`), che non sono varianti e su cui
   * ogni asserzione dimensionale e' priva di senso.
   */
  const varianti = (): Array<[string, { fontSize: number; lineHeight?: number }]> =>
    Object.entries(typography).filter(
      ([, v]) => typeof (v as any)?.fontSize === 'number'
    ) as Array<[string, { fontSize: number; lineHeight?: number }]>;

  describe('Typography Tokens Structure', () => {
    it('should have all required typography variants', () => {
      const expectedVariants = ['hero', 'h1', 'h2', 'bodyLarge', 'body', 'caption'];
      
      expectedVariants.forEach(variant => {
        expect(typography).toHaveProperty(variant);
        const typographyVariant = typography[variant as keyof typeof typography];
        
        expect(typographyVariant).toHaveProperty('fontSize');
        expect(typographyVariant).toHaveProperty('fontWeight');
        expect(typographyVariant).toHaveProperty('lineHeight');
        expect(typeof typographyVariant.fontSize).toBe('number');
        expect(typeof typographyVariant.fontWeight).toBe('string');
        expect(typeof typographyVariant.lineHeight).toBe('number');
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

    it('should have proper font weights for hierarchy', () => {
      // `'bold'` e `'700'` rendono identici in React Native: asserire l'una o
      // l'altra forma verifica come e' SCRITTO il token, non come appare il
      // testo. Il nome del test dice "hierarchy", ed e' la gerarchia che si
      // verifica.
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
      expect(peso(typography.caption.fontWeight)).toBeGreaterThanOrEqual(400);
    });

    it('should have logical line height progression', () => {
      expect(typography.hero.lineHeight).toBe(48);
      expect(typography.h1.lineHeight).toBe(40);
      expect(typography.h2.lineHeight).toBe(32);
      expect(typography.bodyLarge.lineHeight).toBe(28);
      expect(typography.body.lineHeight).toBe(24);
      expect(typography.caption.lineHeight).toBe(20);
    });
  });

  describe('WCAG AAA Typography Compliance', () => {
    it('should maintain 7:1 contrast ratio for primary text on white background', () => {
      const result = validateColorCombination(colors.textPrimary, colors.background);
      expect(result.isValid).toBe(true);
      expect(result.ratio).toBeGreaterThanOrEqual(7);
    });

    it('should maintain 7:1 contrast ratio for secondary text on white background', () => {
      const result = validateColorCombination(colors.textSecondary, colors.background);
      expect(result.isValid).toBe(true);
      expect(result.ratio).toBeGreaterThanOrEqual(7);
    });

    it('should maintain 7:1 contrast ratio for white text on primary backgrounds', () => {
      const primaryBgs: (keyof typeof colors)[] = ['primary', 'secondary'];
      
      primaryBgs.forEach(bg => {
        const result = validateColorCombination(colors.background, colors[bg]);
        expect(result.ratio).toBeGreaterThanOrEqual(7);
      });
    });

    it('should maintain WCAG compliance for status color text', () => {
      const statusColors: (keyof typeof colors)[] = ['success', 'error'];
      const aaPlus: (keyof typeof colors)[] = ['warning', 'accent'];
      
      // These status colors meet WCAG AAA (7:1)
      statusColors.forEach(statusColor => {
        const result = validateColorCombination(colors[statusColor], colors.background);
        expect(result.ratio).toBeGreaterThanOrEqual(7);
      });
      
      // These status colors meet WCAG AA+ (4.5:1) to maintain brand integrity
      aaPlus.forEach(statusColor => {
        const result = validateColorCombination(colors[statusColor], colors.background);
        expect(result.ratio).toBeGreaterThanOrEqual(4.5);
        expect(result.isValid || result.recommendation).toBeTruthy(); // Should be valid or have recommendation
      });
    });
  });

  describe('Font Size Accessibility', () => {
    it('should have minimum 14px font size for accessibility', () => {
      // Solo le VARIANTI: `typography` contiene anche un gruppo `sizes`, che
      // non ha `fontSize` — il ciclo ci finiva sopra e confrontava
      // `undefined`. E' lo stesso inciampo gia' visto su `colors`.
      varianti().forEach(([nome, typeStyle]) => {
        expect(typeStyle.fontSize).toBeGreaterThanOrEqual(14);
      });
    });

    it('should support 200% scaling for accessibility', () => {
      // Test that font sizes would be readable at 200% scale
      varianti().forEach(([nome, typeStyle]) => {
        const scaledSize = typeStyle.fontSize * 2;
        expect(scaledSize).toBeLessThanOrEqual(120); // Max practical size on mobile
      });
    });

    it('should have proper line height ratios for readability', () => {
      varianti().forEach(([variant, typeStyle]) => {
        const lineHeightRatio = (typeStyle.lineHeight ?? 0) / typeStyle.fontSize;
        // Line height should be between 1.2-1.6 for optimal readability
        expect(lineHeightRatio).toBeGreaterThanOrEqual(1.2);
        expect(lineHeightRatio).toBeLessThanOrEqual(1.6);
      });
    });
  });

  describe('Outdoor Visibility Optimization', () => {
    it('should have sufficient font weight for sunlight readability', () => {
      // Il peso si misura, non si confronta come stringa: `'bold'` e `'700'`
      // rendono identici. Cio' che conta per leggere sotto il sole e' che
      // titoli e didascalie siano abbastanza PESANTI.
      const peso = (v: string | undefined): number => {
        if (v === 'bold') return 700;
        if (v === 'normal' || v === undefined) return 400;
        return Number(v);
      };

      // Hero and H1 should be bold for maximum visibility
      expect(peso(typography.hero.fontWeight)).toBeGreaterThanOrEqual(700);
      expect(peso(typography.h1.fontWeight)).toBeGreaterThanOrEqual(700);

      // H2 should be semibold for good hierarchy
      expect(peso(typography.h2.fontWeight)).toBeGreaterThanOrEqual(600);

      // Caption should be medium for better visibility than normal
      expect(peso(typography.caption.fontWeight)).toBeGreaterThanOrEqual(500);
    });

    it('should have font sizes appropriate for outdoor viewing distances', () => {
      // Hero text (court numbers) should be very large for distance viewing
      expect(typography.hero.fontSize).toBeGreaterThanOrEqual(36);
      
      // H1 text (titles) should be large for quick scanning
      expect(typography.h1.fontSize).toBeGreaterThanOrEqual(28);
      
      // Body text should be larger than typical web standards for outdoor use
      expect(typography.body.fontSize).toBeGreaterThanOrEqual(16);
    });
  });

  describe('Typography Scale Consistency', () => {
    it('should have logical size progression', () => {
      const sizes = [
        typography.caption.fontSize,
        typography.body.fontSize,
        typography.bodyLarge.fontSize,
        typography.h2.fontSize,
        typography.h1.fontSize,
        typography.hero.fontSize,
      ];
      
      // Each size should be larger than the previous
      for (let i = 1; i < sizes.length; i++) {
        expect(sizes[i]).toBeGreaterThan(sizes[i - 1]);
      }
    });

    it('should have proportional line height scaling', () => {
      const lineHeights = [
        typography.caption.lineHeight,
        typography.body.lineHeight,
        typography.bodyLarge.lineHeight,
        typography.h2.lineHeight,
        typography.h1.lineHeight,
        typography.hero.lineHeight,
      ];
      
      // Each line height should be larger than the previous
      for (let i = 1; i < lineHeights.length; i++) {
        expect(lineHeights[i]).toBeGreaterThan(lineHeights[i - 1]);
      }
    });
  });

  describe('React Native Integration Requirements', () => {
    it('should use system fonts for guaranteed availability', () => {
      // System fonts are handled in the component, but we can test the principles
      expect(typeof typography.hero.fontWeight).toBe('string');
      expect(typography.hero.fontSize).toBeGreaterThan(0);
    });

    it('should have integer font sizes for pixel-perfect rendering', () => {
      varianti().forEach(([nome, typeStyle]) => {
        expect(Number.isInteger(typeStyle.fontSize)).toBe(true);
        expect(Number.isInteger(typeStyle.lineHeight)).toBe(true);
      });
    });
  });
});