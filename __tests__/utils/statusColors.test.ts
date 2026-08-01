/**
 * Status Color Utilities Tests
 * Story 1.4: Status-Driven Color Coding System
 */

import {
  getStatusColor,
  getAssignmentStatusColor,
  getMatchStatusColor,
  getStatusColorWithText,
  getStatusColorForBackground,
  getStatusPriority,
  isValidStatus,
  validateStatusColorAccessibility,
  generateStatusColorCSSVars,
  statusColorThemes,
  statusColors,
  TournamentStatus,
  AssignmentStatus,
  MatchStatus,
} from '../../utils/statusColors';

import { colors } from '../../theme/tokens';

describe('Status Colors Utility Functions', () => {
  describe('getStatusColor', () => {
    it('should return correct colors for each status', () => {
      expect(getStatusColor('current')).toBe(statusColors.current);
      expect(getStatusColor('upcoming')).toBe(statusColors.upcoming);
      expect(getStatusColor('completed')).toBe(statusColors.completed);
      expect(getStatusColor('cancelled')).toBe(statusColors.cancelled);
      expect(getStatusColor('emergency')).toBe(statusColors.emergency);
    });

    it('should provide fallback for invalid status', () => {
      // TypeScript should prevent this, but testing runtime behavior
      const result = getStatusColor('invalid' as TournamentStatus);
      expect(result).toBe(statusColors.upcoming);
    });
  });

  describe('getAssignmentStatusColor', () => {
    it('should map assignment statuses to correct colors', () => {
      expect(getAssignmentStatusColor('active')).toBe(statusColors.current);
      expect(getAssignmentStatusColor('scheduled')).toBe(statusColors.upcoming);
      expect(getAssignmentStatusColor('finished')).toBe(statusColors.completed);
      expect(getAssignmentStatusColor('modified')).toBe(statusColors.cancelled);
      expect(getAssignmentStatusColor('urgent')).toBe(statusColors.emergency);
    });
  });

  describe('getMatchStatusColor', () => {
    it('should map match statuses to correct colors', () => {
      expect(getMatchStatusColor('live')).toBe(statusColors.current);
      expect(getMatchStatusColor('pending')).toBe(statusColors.upcoming);
      expect(getMatchStatusColor('final')).toBe(statusColors.completed);
      expect(getMatchStatusColor('postponed')).toBe(statusColors.cancelled);
      expect(getMatchStatusColor('critical')).toBe(statusColors.emergency);
    });
  });

  describe('getStatusColorWithText', () => {
    it('should return status color with optimal text color', () => {
      // `current` (LIVE) e' un caso speciale DELIBERATO in
      // `utils/statusColors.ts`: sfondo bianco e testo colorato, non il
      // contrario. Questo test asseriva il comportamento precedente
      // (`backgroundColor === statusColors.current`) e falliva da quando la
      // scelta e' stata fatta — qui aveva ragione il codice, che porta la
      // motivazione scritta accanto all'implementazione (issue #94).
      const currentResult = getStatusColorWithText('current');
      expect(currentResult.backgroundColor).toBe('#FFFFFF');
      expect(currentResult.textColor).toBe(statusColors.current);
      expect(currentResult.contrastRatio).toBeGreaterThanOrEqual(7); // WCAG AAA
    });

    it('should ensure all status colors meet WCAG AA requirements', () => {
      const statuses: TournamentStatus[] = ['current', 'upcoming', 'completed', 'cancelled', 'emergency'];
      
      statuses.forEach(status => {
        const result = getStatusColorWithText(status);
        expect(result.contrastRatio).toBeGreaterThanOrEqual(4.5); // WCAG AA minimum
      });
    });
  });

  describe('getStatusColorForBackground', () => {
    it('should return status color with contrast info for different backgrounds', () => {
      const result = getStatusColorForBackground('current', 'background');
      expect(result.statusColor).toBe(statusColors.current);
      expect(result.contrastRatio).toBeGreaterThanOrEqual(7); // Status colors should meet WCAG AAA on background
      expect(result.wcagCompliant).toBe(true);
    });

    it('should work with primary and secondary backgrounds', () => {
      const primaryResult = getStatusColorForBackground('emergency', 'primary');
      expect(primaryResult.statusColor).toBe(statusColors.emergency);
      
      const secondaryResult = getStatusColorForBackground('upcoming', 'secondary');
      expect(secondaryResult.statusColor).toBe(statusColors.upcoming);
    });
  });

  describe('getStatusPriority', () => {
    it('should return correct priority ordering', () => {
      expect(getStatusPriority('emergency')).toBe(1); // Highest priority
      expect(getStatusPriority('current')).toBe(2);
      expect(getStatusPriority('upcoming')).toBe(3);
      expect(getStatusPriority('cancelled')).toBe(4);
      expect(getStatusPriority('completed')).toBe(5); // Lowest priority
    });

    it('should enable proper sorting by priority', () => {
      const statuses: TournamentStatus[] = ['completed', 'emergency', 'upcoming', 'current', 'cancelled'];
      const sorted = statuses.sort((a, b) => getStatusPriority(a) - getStatusPriority(b));
      
      expect(sorted).toEqual(['emergency', 'current', 'upcoming', 'cancelled', 'completed']);
    });
  });

  describe('isValidStatus', () => {
    it('should validate correct statuses', () => {
      expect(isValidStatus('current')).toBe(true);
      expect(isValidStatus('upcoming')).toBe(true);
      expect(isValidStatus('completed')).toBe(true);
      expect(isValidStatus('cancelled')).toBe(true);
      expect(isValidStatus('emergency')).toBe(true);
    });

    it('should reject invalid statuses', () => {
      expect(isValidStatus('invalid')).toBe(false);
      expect(isValidStatus('pending')).toBe(false);
      expect(isValidStatus('')).toBe(false);
    });
  });

  describe('validateStatusColorAccessibility', () => {
    it('should validate all status colors meet WCAG AAA requirements', () => {
      const validation = validateStatusColorAccessibility();
      
      expect(validation).toHaveLength(5);
      validation.forEach(result => {
        expect(result.onBackground).toBeGreaterThanOrEqual(7);
        expect(result.wcagCompliant).toBe(true);
      });
    });

    it('should include all status colors in validation', () => {
      const validation = validateStatusColorAccessibility();
      const statuses = validation.map(v => v.status);
      
      expect(statuses).toContain('current');
      expect(statuses).toContain('upcoming');
      expect(statuses).toContain('completed');
      expect(statuses).toContain('cancelled');
      expect(statuses).toContain('emergency');
    });
  });

  describe('generateStatusColorCSSVars', () => {
    it('should generate CSS variables for all status colors', () => {
      const cssVars = generateStatusColorCSSVars();
      
      expect(cssVars['--status-current']).toBe(statusColors.current);
      expect(cssVars['--status-upcoming']).toBe(statusColors.upcoming);
      expect(cssVars['--status-completed']).toBe(statusColors.completed);
      expect(cssVars['--status-cancelled']).toBe(statusColors.cancelled);
      expect(cssVars['--status-emergency']).toBe(statusColors.emergency);
    });
  });

  describe('statusColorThemes', () => {
    it('should provide badge theme configurations', () => {
      // `current` (LIVE) e' invertito rispetto agli altri stati, di proposito:
      // sfondo bianco e testo colorato. Il test asseriva il contrario e
      // falliva da quando la scelta e' stata fatta (issue #94).
      expect(statusColorThemes.badge.current.bg).toBe('#FFFFFF');
      expect(statusColorThemes.badge.current.text).toBe(statusColors.current);
      // Gli altri seguono la convenzione opposta: sfondo colorato, testo bianco.
      expect(statusColorThemes.badge.emergency.bg).toBe(statusColors.emergency);
      expect(statusColorThemes.badge.emergency.text).toBe('#FFFFFF');
    });

    it('should provide border theme configurations', () => {
      expect(statusColorThemes.border.current.borderColor).toBe(statusColors.current);
      expect(statusColorThemes.border.current.width).toBe(2);
      expect(statusColorThemes.border.emergency.width).toBe(3); // Thicker border for emergency
    });

    it('should provide indicator theme configurations', () => {
      expect(statusColorThemes.indicator.current.color).toBe(statusColors.current);
      expect(statusColorThemes.indicator.current.size).toBe('large');
      expect(statusColorThemes.indicator.emergency.size).toBe('large');
    });
  });

  describe('Story 1.4 Acceptance Criteria Compliance', () => {
    it('AC 1: Should implement color coding for all assignment states', () => {
      // Questo test congelava cinque esadecimali (`#2C3E50`, `#2B5F75`,
      // `#1B365D`, `#8B1538`) di una palette di DUE migrazioni fa: la
      // "blue-teal" del 2025-08 e poi "Titanium & Gold". Falliva a ogni
      // decisione di design, il che lo rendeva un test della palette contro
      // se' stessa — non dell'accettazione della Story 1.4 (issue #94).
      //
      // L'AC 1 chiede "color coding for all assignment states": cio' che deve
      // valere e' che ogni stato ABBIA un colore, e che gli stati siano
      // DISTINGUIBILI fra loro. Quale tonalita' sia e' una scelta di design,
      // e la sua conformita' e' verificata dall'AC 1 & 2 qui sotto.
      const states: TournamentStatus[] = ['current', 'upcoming', 'completed', 'cancelled', 'emergency'];

      states.forEach(state => {
        expect(statusColors[state]).toMatch(/^#[0-9A-Fa-f]{6}$/);
      });

      // `emergency` deve restare distinguibile da `current`: sono i due stati
      // che un arbitro non puo' permettersi di confondere a colpo d'occhio.
      expect(statusColors.emergency).not.toBe(statusColors.current);

      // E nessuno stato puo' collassare su un altro.
      const distinct = new Set(states.map(s => statusColors[s].toUpperCase()));
      expect(distinct.size).toBe(states.length);
    });

    it('AC 1 & 2: Should ensure colors meet WCAG AAA (7:1) contrast requirements', () => {
      const validation = validateStatusColorAccessibility();
      validation.forEach(result => {
        expect(result.onBackground).toBeGreaterThanOrEqual(7);
        expect(result.wcagCompliant).toBe(true);
      });
    });

    it('AC 5: Should provide maximum visibility treatment for emergency states', () => {
      const emergencyStyle = getStatusColorWithText('emergency');
      const emergencyTheme = statusColorThemes.border.emergency;
      const emergencyIndicator = statusColorThemes.indicator.emergency;
      
      // Emergency should have highest contrast
      expect(emergencyStyle.contrastRatio).toBeGreaterThanOrEqual(9);
      
      // Emergency should have thicker border
      expect(emergencyTheme.width).toBeGreaterThan(statusColorThemes.border.current.width);
      
      // Emergency should have large indicator size
      expect(emergencyIndicator.size).toBe('large');
    });
  });

  describe('Performance and Accessibility Requirements', () => {
    it('should provide efficient color calculation', () => {
      const start = performance.now();
      
      // Test multiple calls to ensure performance
      for (let i = 0; i < 100; i++) {
        getStatusColor('current');
        getStatusColorWithText('upcoming');
        getStatusColorForBackground('completed');
      }
      
      const end = performance.now();
      expect(end - start).toBeLessThan(50); // Should complete quickly
    });

    it('should maintain consistent color values', () => {
      // Colors should be consistent across multiple calls
      expect(getStatusColor('current')).toBe(getStatusColor('current'));
      expect(getAssignmentStatusColor('active')).toBe(getAssignmentStatusColor('active'));
      expect(getMatchStatusColor('live')).toBe(getMatchStatusColor('live'));
    });
  });
});

describe('Integration with Design Token System', () => {
  it('should integrate with existing color token system', () => {
    // Status colors should be separate from basic colors but compatible
    expect(statusColors.current).toBeDefined();
    expect(statusColors.upcoming).toBeDefined();
    expect(statusColors.completed).toBeDefined();
    expect(statusColors.cancelled).toBeDefined();
    expect(statusColors.emergency).toBeDefined();
  });

  it('should maintain FIVB brand color alignment', () => {
    // Current should be based on FIVB accent (orange) family
    expect(statusColors.current.includes('#')).toBe(true);
    
    // Upcoming should be based on FIVB secondary (blue) family
    expect(statusColors.upcoming.includes('#')).toBe(true);
    
    // Should maintain hex color format
    expect(statusColors.current).toMatch(/^#[0-9A-Fa-f]{6}$/);
    expect(statusColors.upcoming).toMatch(/^#[0-9A-Fa-f]{6}$/);
  });
});