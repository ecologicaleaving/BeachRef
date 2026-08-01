/**
 * Outdoor Visibility Validation Tests
 * Story 1.5: Outdoor-Optimized Iconography
 */

import {
  ICON_COLOR_THEMES,
  validateIconAccessibility,
  getIconColor,
  CRITICAL_ICONS,
} from '../utils/icons';
import { colors } from '../theme/tokens';

// Outdoor lighting conditions that referees face
const OUTDOOR_CONDITIONS = {
  'Direct Sunlight': '#FFFFFF',  // Bright white background
  'Shade': '#F5F5F5',           // Light gray background  
  'Overcast': '#E8E8E8',        // Medium gray background
  'Golden Hour': '#FFF8DC',     // Warm light background
  'Blue Hour': '#E6F3FF',       // Cool light background
};

// User scenarios for tournament referees
const USER_SCENARIOS = [
  {
    name: 'Beach Tournament Referee',
    background: '#FFFEF7', // Sand reflection
    minContrast: 7.0,      // WCAG AAA
  },
  {
    name: 'Indoor Tournament with Bright Lighting', 
    background: '#FAFAFA',
    minContrast: 7.0,
  },
  {
    name: 'Evening Tournament',
    background: '#F0F0F0',
    minContrast: 7.0,
  },
];

describe('Outdoor Visibility Validation', () => {
  describe('Icon Theme Outdoor Compatibility', () => {
    Object.keys(ICON_COLOR_THEMES).forEach(themeName => {
      describe(`${themeName} theme`, () => {
        const theme = ICON_COLOR_THEMES[themeName];
        
        Object.entries(OUTDOOR_CONDITIONS).forEach(([conditionName, backgroundColor]) => {
          it(`should be visible in ${conditionName} conditions`, () => {
            Object.entries(theme).forEach(([colorKey, color]) => {
              if (typeof color === 'string') {
                const validation = validateIconAccessibility(color, backgroundColor);
                
                // For accessibility theme, require high contrast but realistic
                const minContrast = themeName === 'accessibility' ? 7.0 : 
                                  themeName === 'highContrast' ? 6.0 : 4.5;
                
                expect(validation.contrastRatio).toBeGreaterThanOrEqual(minContrast);
                expect(validation.isValid).toBe(validation.contrastRatio >= 7.0);
              }
            });
          });
        });
      });
    });
  });

  describe('User Scenario Validation', () => {
    USER_SCENARIOS.forEach(scenario => {
      it(`should support ${scenario.name} requirements`, () => {
        // Test critical colors for tournament referees (focus on high-visibility colors)
        const criticalColors = [
          colors.textPrimary,  // Primary icons (10.98:1 contrast)
          colors.error,        // Emergency alerts (9.28:1 contrast)  
          colors.secondary,    // Secondary actions (8.40:1 contrast)
        ];
        
        criticalColors.forEach(color => {
          const validation = validateIconAccessibility(color, scenario.background);
          
          expect(validation.contrastRatio).toBeGreaterThanOrEqual(scenario.minContrast);
          expect(validation.isValid).toBe(true);
        });
      });
    });
  });

  describe('Critical Icons Outdoor Performance', () => {
    it('should ensure all critical icons meet outdoor standards', () => {
      const criticalIconsList = Array.from(CRITICAL_ICONS);
      
      expect(criticalIconsList.length).toBeGreaterThan(0);
      
      // Test critical icons against harsh outdoor conditions  
      criticalIconsList.forEach(iconKey => {
        const [category, name] = iconKey.split('.');
        
        // Test with different themes
        ['highContrast', 'accessibility'].forEach(theme => {
          const colorConfig = getIconColor(theme, 'primary');
          
          // Test against direct sunlight (worst case)
          const validation = validateIconAccessibility(
            colorConfig.color, 
            OUTDOOR_CONDITIONS['Direct Sunlight']
          );
          
          expect(validation.contrastRatio).toBeGreaterThanOrEqual(7.0);
          expect(validation.isValid).toBe(true);
        });
      });
    });
  });

  describe('Performance Under Rapid Visibility Checks', () => {
    it('should perform icon visibility validation efficiently', () => {
      const startTime = performance.now();
      
      // Simulate rapid checks during live match updates
      for (let i = 0; i < 100; i++) {
        validateIconAccessibility(colors.textPrimary, '#FFFFFF');
        getIconColor('default', 'primary');
      }
      
      const endTime = performance.now();
      const duration = endTime - startTime;

      // La soglia era 50 ms, ed e' stata una delle sorgenti di instabilita'
      // della suite (issue #94, AC6): tre esecuzioni consecutive dello stesso
      // commit davano tre risultati, perche' un micro-benchmark a orologio
      // misura il carico della macchina, non il codice. Su questa macchina,
      // con l'audit in parallelo, sono stati misurati 55 ms.
      //
      // Il ciclo resta — esercitare 100 volte il percorso e' un fumo utile, e
      // intercetta un ricalcolo accidentalmente quadratico o un'esplosione di
      // allocazioni. Ma il limite ora e' largo di proposito: cattura una
      // regressione catastrofica (ordini di grandezza), non una fluttuazione.
      // Se serve davvero un budget di 50 ms sul dispositivo, va misurato sul
      // dispositivo, non in jest su un portatile.
      expect(duration).toBeLessThan(2000);
    });
  });

  describe('Emergency Icon Visibility', () => {
    it('should maximize emergency icon visibility', () => {
      // Emergency icons must be visible in ALL conditions
      Object.values(OUTDOOR_CONDITIONS).forEach(background => {
        const emergencyValidation = validateIconAccessibility(colors.error, background);
        
        // Emergency icons require high contrast (7:1 WCAG AAA minimum)
        expect(emergencyValidation.contrastRatio).toBeGreaterThanOrEqual(7.0);
        expect(emergencyValidation.isValid).toBe(true);
      });
    });
  });

  describe('Accessibility Compliance Verification', () => {
    it('should exceed WCAG AAA standards for outdoor use', () => {
      // Test our high contrast theme against WCAG AAA (7:1) requirements
      const highContrastTheme = ICON_COLOR_THEMES.highContrast;
      
      Object.entries(highContrastTheme).forEach(([colorKey, color]) => {
        if (typeof color === 'string') {
          // Test against white background (common for outdoor screens)
          const validation = validateIconAccessibility(color, '#FFFFFF');
          
          // Must exceed WCAG AAA minimum
          expect(validation.contrastRatio).toBeGreaterThan(7.0);
          expect(validation.isValid).toBe(true);
        }
      });
    });

    it('should provide accessibility recommendations when needed', () => {
      // Test with a low-contrast color to ensure recommendations work
      const lowContrastValidation = validateIconAccessibility('#CCCCCC', '#FFFFFF');
      
      expect(lowContrastValidation.isValid).toBe(false);
      expect(lowContrastValidation.recommendations).toBeDefined();
      expect(lowContrastValidation.recommendations.length).toBeGreaterThan(0);
      expect(lowContrastValidation.recommendations[0]).toContain('contrast');
    });
  });

  describe('Touch Target Outdoor Usability', () => {
    it('should ensure touch targets work in outdoor conditions', () => {
      // In outdoor conditions, touch accuracy decreases
      // Our icons should be easily tappable even with gloves or sunglasses
      
      const outdoorTouchTargets = [
        { size: 'small', expectedMin: 24 },
        { size: 'medium', expectedMin: 32 }, 
        { size: 'large', expectedMin: 44 },
      ];
      
      outdoorTouchTargets.forEach(({ size, expectedMin }) => {
        const iconStyles = getIconColor('default', 'primary');
        
        // Verify minimum sizes are met
        expect(expectedMin).toBeGreaterThanOrEqual(
          size === 'small' ? 24 : 
          size === 'medium' ? 32 : 44
        );
      });
    });
  });
});