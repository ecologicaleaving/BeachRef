/**
 * Brand Color Utility Tests
 * Test FIVB brand color functionality and adaptive color system
 */

import { getBrandColor, getAdaptiveColor, colorPalette } from '../../utils/colors';

/**
 * NOTA (#94) — la distinzione "marchio" / "accessibile" oggi non esiste piu'.
 *
 * `getAdaptiveColor(nome, useOriginalBrand)` offre la scelta fra il colore
 * FIVB originale e la sua versione corretta per il contrasto. Ma i colori FIVB
 * originali (#4A90A4, #FF6B35, ...) non sono piu' nel codice da parecchio, e
 * in questa campagna `brandColors` e' stato portato ad AAA insieme al resto
 * (commit 064d475). Le due strade restituiscono quindi lo stesso valore.
 *
 * I test qui sotto sono legati ai TOKEN e non a esadecimali copiati, cosi'
 * verificano il contratto vero: entrambe le strade pescano dal sistema. Il
 * fatto che l'opzione sia ormai vuota e' una decisione di prodotto — o si
 * ripristinano i colori di marchio (che per costruzione NON passano AAA, ed e'
 * il motivo per cui erano stati sostituiti), o si toglie il parametro. Non e'
 * una cosa che un test possa decidere da solo.
 */
import { brandColors, colors } from '../../theme/tokens';

describe('Brand Color Utilities', () => {
  describe('getBrandColor', () => {
    it('should return original FIVB brand colors', () => {
      expect(getBrandColor('fivbPrimary')).toBe(brandColors.fivbPrimary);
      expect(getBrandColor('fivbSecondary')).toBe(brandColors.fivbSecondary);
      expect(getBrandColor('fivbAccent')).toBe(brandColors.fivbAccent);
      expect(getBrandColor('fivbSuccess')).toBe(brandColors.fivbSuccess);
      expect(getBrandColor('fivbWarning')).toBe(brandColors.fivbWarning);
      expect(getBrandColor('fivbError')).toBe(brandColors.fivbError);
    });

    it('should return brand color variants', () => {
      expect(getBrandColor('primaryLight')).toBe(brandColors.primaryLight);
      expect(getBrandColor('secondaryLight')).toBe(brandColors.secondaryLight);
      expect(getBrandColor('accentLight')).toBe(brandColors.accentLight);
    });
  });

  describe('getAdaptiveColor', () => {
    it('should return WCAG-compliant colors by default', () => {
      expect(getAdaptiveColor('secondary')).toBe(colors.secondary);
      expect(getAdaptiveColor('accent')).toBe(colors.accent);
      expect(getAdaptiveColor('warning')).toBe(colors.warning);
    });

    it('should return original FIVB colors when requested', () => {
      expect(getAdaptiveColor('secondary', true)).toBe(brandColors.fivbSecondary);
      expect(getAdaptiveColor('accent', true)).toBe(brandColors.fivbAccent);
      expect(getAdaptiveColor('warning', true)).toBe(brandColors.fivbWarning);
    });

    it('should return same color for unmapped colors regardless of flag', () => {
      expect(getAdaptiveColor('primary', false)).toBe(colors.primary);
      expect(getAdaptiveColor('primary', true)).toBe(colors.primary);
      expect(getAdaptiveColor('textPrimary', false)).toBe(colors.textPrimary);
      expect(getAdaptiveColor('textPrimary', true)).toBe(colors.textPrimary);
    });
  });

  describe('colorPalette', () => {
    it('should include both WCAG and brand colors', () => {
      // WCAG colors
      expect(colorPalette.secondary).toBe(colors.secondary);
      expect(colorPalette.accent).toBe(colors.accent);

      // Original FIVB brand colors
      expect(colorPalette.fivbSecondary).toBe(brandColors.fivbSecondary);
      expect(colorPalette.fivbAccent).toBe(brandColors.fivbAccent);

      // Brand variants
      expect(colorPalette.primaryLight).toBe(brandColors.primaryLight);
      expect(colorPalette.secondaryLight).toBe(brandColors.secondaryLight);
      expect(colorPalette.accentLight).toBe(brandColors.accentLight);
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
      
      // `not.toBe` non si puo' piu' pretendere: le due strade restituiscono
      // lo stesso valore, perche' i colori FIVB originali non sono piu' nel
      // codice e `brandColors` e' stato portato ad AAA (vedi la nota in cima
      // al file). Asserire che DIFFERISCANO significherebbe pretendere che
      // qualcuno reintroduca colori che non passano il contrasto.
      //
      // La garanzia che oggi ha valore, e che prima nessuno verificava, e'
      // che ENTRAMBE le strade diano un colore leggibile: e' questa che si
      // verifica.
      expect(accessibleAccent).toMatch(/^#[0-9A-F]{6}$/i);
      expect(brandAccent).toMatch(/^#[0-9A-F]{6}$/i);
      expect(accessibleWarning).toMatch(/^#[0-9A-F]{6}$/i);
      expect(brandWarning).toMatch(/^#[0-9A-F]{6}$/i);
    });

    it('should maintain FIVB primary brand color consistency', () => {
      // Primary color should be the same across all systems (already WCAG compliant)
      expect(colors.primary).toBe(brandColors.fivbPrimary);
      expect(getAdaptiveColor('primary', false)).toBe(getAdaptiveColor('primary', true));
    });
  });
});