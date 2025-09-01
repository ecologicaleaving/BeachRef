/**
 * @fileoverview Unit tests for FIVB-compliant round phase formatter
 */

import { RoundPhaseFormatter, BeachRoundPhase, EmphasisLevel } from '../RoundPhaseFormatter';

describe('RoundPhaseFormatter', () => {
  describe('formatRoundPhase', () => {
    describe('FIVB RoundPhase numeric codes', () => {
      it('converts RoundPhase "1" to "Finals"', () => {
        const result = RoundPhaseFormatter.formatRoundPhase('1');
        
        expect(result.displayName).toBe('Finals');
        expect(result.originalValue).toBe('1');
        expect(result.emphasis).toBe('critical');
        expect(result.isFinals).toBe(true);
        expect(result.accessibilityLabel).toBe('Finals phase matches');
      });

      it('converts RoundPhase "2" to "Bronze"', () => {
        const result = RoundPhaseFormatter.formatRoundPhase('2');
        
        expect(result.displayName).toBe('Bronze');
        expect(result.originalValue).toBe('2');
        expect(result.emphasis).toBe('critical');
        expect(result.isFinals).toBe(true);
        expect(result.accessibilityLabel).toBe('Bronze Medal match');
      });

      it('converts RoundPhase "3" to "Pool Play"', () => {
        const result = RoundPhaseFormatter.formatRoundPhase('3');
        
        expect(result.displayName).toBe('Pool Play');
        expect(result.originalValue).toBe('3');
        expect(result.emphasis).toBe('medium');
        expect(result.isFinals).toBe(false);
        expect(result.accessibilityLabel).toBe('Pool Play match');
      });

      it('converts RoundPhase "4" to "Qualification"', () => {
        const result = RoundPhaseFormatter.formatRoundPhase('4');
        
        expect(result.displayName).toBe('Qualification');
        expect(result.originalValue).toBe('4');
        expect(result.emphasis).toBe('low');
        expect(result.isFinals).toBe(false);
        expect(result.accessibilityLabel).toBe('Qualification match');
      });

      it('handles unknown FIVB codes with fallback', () => {
        const result = RoundPhaseFormatter.formatRoundPhase('5');
        
        expect(result.displayName).toBe('Round 5');
        expect(result.originalValue).toBe('5');
        expect(result.emphasis).toBe('medium');
        expect(result.isFinals).toBe(false);
        expect(result.accessibilityLabel).toBe('Round 5 match');
      });

      it('handles rounds with whitespace', () => {
        const result = RoundPhaseFormatter.formatRoundPhase('  3  ');
        
        expect(result.displayName).toBe('Pool Play');
        expect(result.emphasis).toBe('medium');
      });
    });

    describe('BeachRoundPhase enum handling', () => {
      it('handles ConfederationQuota phase', () => {
        const result = RoundPhaseFormatter.formatRoundPhase('1', BeachRoundPhase.CONFEDERATION_QUOTA);
        
        expect(result.displayName).toBe('Confederation Quota');
        expect(result.originalValue).toBe('1');
        expect(result.emphasis).toBe('low');
        expect(result.isFinals).toBe(false);
        expect(result.accessibilityLabel).toBe('Confederation Quota round');
      });

      it('handles FederationQuota phase', () => {
        const result = RoundPhaseFormatter.formatRoundPhase('2', BeachRoundPhase.FEDERATION_QUOTA);
        
        expect(result.displayName).toBe('Federation Quota');
        expect(result.emphasis).toBe('low');
        expect(result.accessibilityLabel).toBe('Federation Quota round');
      });

      it('handles Qualification phase', () => {
        const result = RoundPhaseFormatter.formatRoundPhase('3', BeachRoundPhase.QUALIFICATION);
        
        expect(result.displayName).toBe('Qualification 3');
        expect(result.emphasis).toBe('low');
        expect(result.accessibilityLabel).toBe('Qualification round 3');
      });

      it('handles MainDraw phase with elimination rounds', () => {
        const result = RoundPhaseFormatter.formatRoundPhase('1', BeachRoundPhase.MAIN_DRAW);
        
        expect(result.displayName).toBe('Final');
        expect(result.emphasis).toBe('critical');
        expect(result.isFinals).toBe(true);
      });

      it('handles MainDraw phase with non-elimination rounds', () => {
        const result = RoundPhaseFormatter.formatRoundPhase('Round A', BeachRoundPhase.MAIN_DRAW);
        
        expect(result.displayName).toBe('Main Draw Round A');
        expect(result.emphasis).toBe('medium');
        expect(result.isFinals).toBe(false);
      });
    });

    describe('pool play rounds', () => {
      it('handles pool rounds correctly', () => {
        const result = RoundPhaseFormatter.formatRoundPhase('Pool A');
        
        expect(result.displayName).toBe('Pool A');
        expect(result.originalValue).toBe('Pool A');
        expect(result.emphasis).toBe('medium');
        expect(result.isFinals).toBe(false);
        expect(result.accessibilityLabel).toBe('Pool A pool match');
      });

      it('handles group rounds correctly', () => {
        const result = RoundPhaseFormatter.formatRoundPhase('Group B');
        
        expect(result.displayName).toBe('Group B');
        expect(result.emphasis).toBe('medium');
        expect(result.accessibilityLabel).toBe('Group B pool match');
      });

      it('handles case-insensitive pool detection', () => {
        const result = RoundPhaseFormatter.formatRoundPhase('POOL C');
        
        expect(result.displayName).toBe('POOL C');
        expect(result.emphasis).toBe('medium');
      });
    });

    describe('qualification rounds', () => {
      it('handles qualification rounds by content', () => {
        const result = RoundPhaseFormatter.formatRoundPhase('Qualification Round 1');
        
        expect(result.displayName).toBe('Qualification Qualification Round 1');
        expect(result.emphasis).toBe('low');
        expect(result.accessibilityLabel).toBe('Qualification round Qualification Round 1');
      });

      it('handles qualification rounds by phase parameter', () => {
        const result = RoundPhaseFormatter.formatRoundPhase('1', 'Qualification');
        
        expect(result.displayName).toBe('Qualification 1');
        expect(result.emphasis).toBe('low');
      });
    });

    describe('fallback handling', () => {
      it('handles unknown round formats gracefully', () => {
        const consoleSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
        
        const result = RoundPhaseFormatter.formatRoundPhase('Unknown Format');
        
        expect(result.displayName).toBe('Unknown Format');
        expect(result.originalValue).toBe('Unknown Format');
        expect(result.emphasis).toBe('medium');
        expect(result.isFinals).toBe(false);
        expect(result.accessibilityLabel).toBe('Round Unknown Format');
        
        // Should log warning in development
        expect(consoleSpy).toHaveBeenCalledWith(
          'Unknown round format: "Unknown Format". Using fallback display.'
        );
        
        consoleSpy.mockRestore();
      });

      it('preserves original values in fallback', () => {
        const result = RoundPhaseFormatter.formatRoundPhase('Custom Round Name');
        
        expect(result.displayName).toBe('Custom Round Name');
        expect(result.originalValue).toBe('Custom Round Name');
      });
    });

    describe('edge cases', () => {
      it('handles empty strings', () => {
        const result = RoundPhaseFormatter.formatRoundPhase('');
        
        expect(result.displayName).toBe('');
        expect(result.originalValue).toBe('');
        expect(result.emphasis).toBe('medium');
      });

      it('handles numeric strings correctly', () => {
        const result = RoundPhaseFormatter.formatRoundPhase('0');
        
        expect(result.displayName).toBe('0');
        expect(result.emphasis).toBe('medium');
        expect(result.isFinals).toBe(false);
      });

      it('handles mixed case input', () => {
        const result = RoundPhaseFormatter.formatRoundPhase('pOoL a');
        
        expect(result.displayName).toBe('pOoL a');
        expect(result.emphasis).toBe('medium');
      });

      it('handles TBD (To Be Determined) rounds', () => {
        const result = RoundPhaseFormatter.formatRoundPhase('TBD');
        
        expect(result.displayName).toBe('TBD');
        expect(result.originalValue).toBe('TBD');
        expect(result.emphasis).toBe('low');
        expect(result.isFinals).toBe(false);
        expect(result.accessibilityLabel).toBe('To be determined');
      });

      it('handles case-insensitive TBD', () => {
        const result = RoundPhaseFormatter.formatRoundPhase('tbd');
        
        expect(result.displayName).toBe('TBD');
        expect(result.emphasis).toBe('low');
        expect(result.accessibilityLabel).toBe('To be determined');
      });

      it('handles N/A rounds', () => {
        const result = RoundPhaseFormatter.formatRoundPhase('N/A');
        
        expect(result.displayName).toBe('N/A');
        expect(result.originalValue).toBe('N/A');
        expect(result.emphasis).toBe('low');
        expect(result.isFinals).toBe(false);
        expect(result.accessibilityLabel).toBe('Not available');
      });

      it('handles various N/A formats', () => {
        ['na', 'NA', 'not available', 'NOT AVAILABLE'].forEach(naFormat => {
          const result = RoundPhaseFormatter.formatRoundPhase(naFormat);
          expect(result.displayName).toBe('N/A');
          expect(result.accessibilityLabel).toBe('Not available');
        });
      });
    });
  });

  describe('getVisualEmphasis', () => {
    it('returns the emphasis from round info', () => {
      const roundInfo = RoundPhaseFormatter.formatRoundPhase('1');
      const emphasis = RoundPhaseFormatter.getVisualEmphasis(roundInfo);
      
      expect(emphasis).toBe('critical');
    });

    it('returns correct emphasis for different rounds', () => {
      const testCases: Array<[string, EmphasisLevel]> = [
        ['1', 'critical'],   // Finals
        ['2', 'critical'],   // Bronze Medal
        ['3', 'medium'],     // Pool Play
        ['4', 'low'],        // Qualification
        ['Pool A', 'medium'],
        ['Unknown', 'medium']
      ];

      testCases.forEach(([round, expectedEmphasis]) => {
        const roundInfo = RoundPhaseFormatter.formatRoundPhase(round);
        const emphasis = RoundPhaseFormatter.getVisualEmphasis(roundInfo);
        expect(emphasis).toBe(expectedEmphasis);
      });
    });
  });
});