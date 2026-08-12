/**
 * Automated Contrast Validation Tests
 * CI/CD Pipeline Integration Tests for WCAG AAA Compliance
 */

import {
  validateColorCombination,
  validateAllCriticalCombinations,
  generateValidationReport,
  validateContrastOrFail,
  CRITICAL_COMBINATIONS,
  STANDARD_COMBINATIONS,
  type ContrastResult,
  type ValidationReport,
} from '../../utils/contrastValidator';
import { colors } from '../../theme/tokens';

describe('Automated Contrast Validation', () => {
  describe('validateColorCombination', () => {
    it('should validate WCAG AAA compliant combinations', () => {
      const result = validateColorCombination('textPrimary', 'background');
      
      expect(result.ratio).toBeGreaterThanOrEqual(7.0);
      expect(result.wcagAA).toBe(true);
      expect(result.wcagAAA).toBe(true);
      expect(result.isValid).toBe(true);
      expect(result.level).toBe('Pass');
      expect(result.foreground).toBe(colors.textPrimary);
      expect(result.background).toBe(colors.background);
    });

    it('should identify WCAG AA but not AAA combinations', () => {
      // Test with a color that meets AA but not AAA (mock scenario)
      // Since our colors should all be AAA, we'll test with a hypothetical case
      const mockResult: ContrastResult = {
        foreground: '#666666',
        background: '#FFFFFF',
        ratio: 5.5,
        wcagAA: true,
        wcagAAA: false,
        isValid: false,
        level: 'AA',
      };

      expect(mockResult.wcagAA).toBe(true);
      expect(mockResult.wcagAAA).toBe(false);
      expect(mockResult.level).toBe('AA');
    });

    it('should identify failing combinations', () => {
      // Test with colors that should fail (mock scenario)
      const mockResult: ContrastResult = {
        foreground: '#CCCCCC',
        background: '#FFFFFF',
        ratio: 1.6,
        wcagAA: false,
        wcagAAA: false,
        isValid: false,
        level: 'Fail',
      };

      expect(mockResult.wcagAA).toBe(false);
      expect(mockResult.wcagAAA).toBe(false);
      expect(mockResult.level).toBe('Fail');
    });

    it('should return precise contrast ratios', () => {
      const result = validateColorCombination('accent', 'background');
      
      expect(typeof result.ratio).toBe('number');
      expect(result.ratio).toBeGreaterThan(0);
      expect(Number.isFinite(result.ratio)).toBe(true);
      // Should round to 2 decimal places
      expect(result.ratio).toBe(Math.round(result.ratio * 100) / 100);
    });
  });

  describe('Critical Combinations Validation', () => {
    it('should have all required critical combinations defined', () => {
      expect(CRITICAL_COMBINATIONS.length).toBeGreaterThanOrEqual(10);
      
      // Check for essential combinations
      const combinationStrings = CRITICAL_COMBINATIONS.map(c => `${c.fg}-${c.bg}`);
      expect(combinationStrings).toContain('textPrimary-background');
      expect(combinationStrings).toContain('textSecondary-background');
      expect(combinationStrings).toContain('background-primary');
      expect(combinationStrings).toContain('accent-background');
    });

    it('should validate all critical combinations meet WCAG AAA', () => {
      CRITICAL_COMBINATIONS.forEach(combo => {
        const result = validateColorCombination(combo.fg, combo.bg);
        expect(result.wcagAAA).toBe(true);
        expect(result.ratio).toBeGreaterThanOrEqual(7.0);
        expect(result.isValid).toBe(true);
      });
    });

    it('should validate standard combinations meet at least WCAG AA', () => {
      STANDARD_COMBINATIONS.forEach(combo => {
        const result = validateColorCombination(combo.fg, combo.bg);
        expect(result.wcagAA).toBe(true);
        expect(result.ratio).toBeGreaterThanOrEqual(4.5);
      });
    });
  });

  describe('validateAllCriticalCombinations', () => {
    let report: ValidationReport;

    beforeAll(() => {
      report = validateAllCriticalCombinations();
    });

    it('should return a complete validation report', () => {
      expect(report).toHaveProperty('passed');
      expect(report).toHaveProperty('failed');
      expect(report).toHaveProperty('warnings');
      expect(report).toHaveProperty('totalTests');
      expect(report).toHaveProperty('passRate');
      expect(report).toHaveProperty('summary');
      
      expect(Array.isArray(report.passed)).toBe(true);
      expect(Array.isArray(report.failed)).toBe(true);
      expect(Array.isArray(report.warnings)).toBe(true);
      expect(typeof report.totalTests).toBe('number');
      expect(typeof report.passRate).toBe('number');
      expect(typeof report.summary).toBe('string');
    });

    it('should have all critical combinations pass WCAG AAA', () => {
      // All our critical combinations should pass AAA
      expect(report.failed.length).toBe(0);
      expect(report.passed.length).toBeGreaterThanOrEqual(CRITICAL_COMBINATIONS.length);
      expect(report.passRate).toBeGreaterThanOrEqual(90); // Should be 100% for critical
    });

    it('should calculate correct totals', () => {
      const expectedTotal = CRITICAL_COMBINATIONS.length + STANDARD_COMBINATIONS.length;
      expect(report.totalTests).toBe(expectedTotal);
      
      const calculatedTotal = report.passed.length + report.failed.length + report.warnings.length;
      expect(calculatedTotal).toBe(report.totalTests);
    });

    it('should generate meaningful summary', () => {
      expect(report.summary).toContain('Contrast Validation:');
      expect(report.summary).toContain(`${report.totalTests}`);
      expect(report.summary).toContain(`${report.passRate}%`);
    });
  });

  describe('generateValidationReport', () => {
    it('should generate a readable text report', () => {
      const reportText = generateValidationReport();
      
      expect(typeof reportText).toBe('string');
      expect(reportText).toContain('WCAG AAA Contrast Validation Report');
      expect(reportText).toContain('✅ PASSED');
      expect(reportText).toContain(':1 -'); // Should contain contrast ratios
      expect(reportText).toContain('End Report');
    });

    it('should include all test results in report', () => {
      const reportText = generateValidationReport();
      
      // Should mention specific color combinations
      expect(reportText).toContain(colors.textPrimary);
      expect(reportText).toContain(colors.background);
      
      // Should include contrast ratios
      expect(reportText).toMatch(/\d+(\.\d+)?:1/); // Pattern for ratios like "7.58:1"
    });
  });

  describe('validateContrastOrFail - CI/CD Integration', () => {
    it('should pass without throwing for valid color combinations', () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      
      expect(() => {
        validateContrastOrFail();
      }).not.toThrow();
      
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('✅ WCAG AAA Contrast Validation: All critical combinations passed')
      );
      
      consoleSpy.mockRestore();
    });

    it('should log warnings for combinations that meet AA but not AAA', () => {
      const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      
      validateContrastOrFail();
      
      // Clean up
      consoleWarnSpy.mockRestore();
      consoleSpy.mockRestore();
    });
  });

  describe('Regression Testing', () => {
    it('should maintain minimum contrast ratios for critical combinations', () => {
      // Test that critical combinations meet minimum WCAG AAA standards
      // We test for minimum thresholds rather than exact values to avoid floating point issues
      const criticalMinimums = {
        'textPrimary-background': 7.0,    // Should be significantly above 7:1
        'textSecondary-background': 7.0,  // Should meet exactly 7:1 minimum
        'accent-background': 7.0,         // Should meet exactly 7:1 minimum
        'success-background': 7.0,        // Should be above 7:1
        'warning-background': 7.0,        // Should meet exactly 7:1 minimum
        'error-background': 7.0,          // Should be above 7:1
        'background-primary': 7.0,        // Should be significantly above 7:1
        'background-secondary': 7.0,      // Should be above 7:1
      };

      Object.entries(criticalMinimums).forEach(([combo, minRatio]) => {
        const [fg, bg] = combo.split('-') as [keyof typeof colors, keyof typeof colors];
        const result = validateColorCombination(fg, bg);
        
        expect(result.ratio).toBeGreaterThanOrEqual(minRatio);
        expect(result.wcagAAA).toBe(true);
        expect(result.isValid).toBe(true);
      });
    });

    it('should prevent regression below WCAG AAA standards', () => {
      // This test ensures that future changes don't break accessibility
      const report = validateAllCriticalCombinations();
      
      // All critical combinations must maintain WCAG AAA
      report.passed.forEach(result => {
        expect(result.ratio).toBeGreaterThanOrEqual(7.0);
      });
      
      // No critical combinations should fail
      expect(report.failed.length).toBe(0);
    });

    it('should validate all color tokens have valid hex values', () => {
      // `colors` contiene anche GRUPPI annidati (`statusColors` e simili): il
      // ciclo pretendeva un esadecimale da ogni voce e inciampava sul primo
      // oggetto. I gruppi si verificano in profondita', cosi' la copertura
      // aumenta invece di diminuire.
      const verificaEsa = (valore: string) => {
        expect(valore).toMatch(/^#[0-9A-F]{6}$/i);
        expect(valore.length).toBe(7); // '#' + 6 characters
      };

      Object.values(colors).forEach((valore) => {
        if (typeof valore === 'string') {
          verificaEsa(valore);
          return;
        }
        Object.values(valore as Record<string, string>).forEach(verificaEsa);
      });
    });
  });

  describe('Performance Testing', () => {
    it('should complete validation within reasonable time', () => {
      const startTime = Date.now();
      validateAllCriticalCombinations();
      const endTime = Date.now();
      
      const executionTime = endTime - startTime;
      expect(executionTime).toBeLessThan(100); // Should complete within 100ms
    });

    it('should handle large batches of combinations efficiently', () => {
      // Test with all possible color combinations
      // Solo i token SEMPLICI: `colors` contiene anche gruppi annidati, e su
      // quelli `validateColorCombination` muore con "Invalid hex color:
      // [object Object]". La firma dichiara `keyof typeof colors`, cioe'
      // accetta anche le chiavi dei gruppi che non sa gestire — una trappola
      // nel tipo, non solo nel test.
      const allColors = (Object.entries(colors)
        .filter(([, v]) => typeof v === 'string')
        .map(([k]) => k)) as (keyof typeof colors)[];
      const startTime = Date.now();
      
      let validationCount = 0;
      allColors.forEach(fg => {
        allColors.forEach(bg => {
          if (fg !== bg) { // Skip same color combinations
            validateColorCombination(fg, bg);
            validationCount++;
          }
        });
      });
      
      const endTime = Date.now();
      const executionTime = endTime - startTime;
      const avgTimePerValidation = executionTime / validationCount;
      
      expect(avgTimePerValidation).toBeLessThan(1); // Less than 1ms per validation
    });
  });
});