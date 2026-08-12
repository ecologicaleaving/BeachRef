/**
 * @fileoverview Unit tests for FIVB-compliant round phase formatter
 */

import { RoundPhaseFormatter, BeachRoundPhase, EmphasisLevel } from '../RoundPhaseFormatter';

describe('RoundPhaseFormatter', () => {
  describe('formatRoundPhase', () => {
    /**
     * `formatRoundPhase(round, phase)` prende DUE campi distinti del VIS, e
     * questo blocco li confondeva: passava il codice come primo argomento e poi
     * asseriva la semantica del secondo. Peggio, la mappatura che asseriva
     * (1=Finals, 3=Pool Play, 4=Qualification) non e' ne' quella di `Round` ne'
     * quella di `RoundPhase`: e' la mappatura che il formatter aveva PRIMA
     * della correzione fatta sui dati reali dell'API (vedi il commento su
     * `formatFivbRoundPhase`). Sei test su sei erano rossi, e il settimo
     * ("2" -> "Bronze") passava per coincidenza — e' l'unico valore che le due
     * mappature condividono. Issue #94.
     *
     * I due campi sono provati separatamente, ciascuno con la propria
     * mappatura.
     */
    describe('Round field — numeri di tabellone a eliminazione', () => {
      it('converts round "1" to "Gold"', () => {
        const result = RoundPhaseFormatter.formatRoundPhase('1');

        expect(result.displayName).toBe('Gold');
        expect(result.originalValue).toBe('1');
        expect(result.emphasis).toBe('critical');
        expect(result.isFinals).toBe(true);
        expect(result.accessibilityLabel).toBe('Gold Medal match');
      });

      it('converts round "2" to "Bronze"', () => {
        const result = RoundPhaseFormatter.formatRoundPhase('2');

        expect(result.displayName).toBe('Bronze');
        expect(result.originalValue).toBe('2');
        expect(result.emphasis).toBe('critical');
        expect(result.isFinals).toBe(true);
        expect(result.accessibilityLabel).toBe('Bronze Medal match');
      });

      it('converts round "3" to "Semi Final"', () => {
        const result = RoundPhaseFormatter.formatRoundPhase('3');

        expect(result.displayName).toBe('Semi Final');
        expect(result.originalValue).toBe('3');
        expect(result.emphasis).toBe('critical');
        expect(result.isFinals).toBe(true);
        expect(result.accessibilityLabel).toBe('Semi Final match');
      });

      it('handles rounds with whitespace', () => {
        const result = RoundPhaseFormatter.formatRoundPhase('  3  ');

        expect(result.displayName).toBe('Semi Final');
        expect(result.emphasis).toBe('critical');
      });

      it('non tratta "4" come eliminazione: in molti tornei e\' tutto il tabellone', () => {
        const result = RoundPhaseFormatter.formatRoundPhase('4');

        expect(result.displayName).toBe('4');
        expect(result.isFinals).toBe(false);
      });

      it('prefissa con "R." i numeri di round oltre il tabellone noto', () => {
        const result = RoundPhaseFormatter.formatRoundPhase('5');

        expect(result.displayName).toBe('R.5');
        expect(result.originalValue).toBe('5');
        expect(result.emphasis).toBe('medium');
        expect(result.isFinals).toBe(false);
        expect(result.accessibilityLabel).toBe('Round 5 match');
      });
    });

    describe('RoundPhase field — codici numerici FIVB (secondo argomento)', () => {
      it('converts RoundPhase "1" to "Qualification"', () => {
        const result = RoundPhaseFormatter.formatRoundPhase('', '1');

        expect(result.displayName).toBe('Qualification');
        expect(result.emphasis).toBe('low');
        expect(result.isFinals).toBe(false);
        expect(result.accessibilityLabel).toBe('Qualification match');
      });

      it('converts RoundPhase "2" to "Pool Play"', () => {
        const result = RoundPhaseFormatter.formatRoundPhase('', '2');

        expect(result.displayName).toBe('Pool Play');
        expect(result.emphasis).toBe('medium');
        expect(result.isFinals).toBe(false);
      });

      it('converts RoundPhase "3" to "Bronze"', () => {
        const result = RoundPhaseFormatter.formatRoundPhase('', '3');

        expect(result.displayName).toBe('Bronze');
        expect(result.emphasis).toBe('critical');
        expect(result.isFinals).toBe(true);
      });

      it('converts RoundPhase "4" to "Elimination" quando non c\'e\' un Round', () => {
        const result = RoundPhaseFormatter.formatRoundPhase('', '4');

        expect(result.displayName).toBe('Elimination');
        expect(result.emphasis).toBe('high');
      });

      it('con RoundPhase "4" il nome del Round, se c\'e\', vince', () => {
        const result = RoundPhaseFormatter.formatRoundPhase('Round of 16', '4');

        expect(result.displayName).toBe('Round of 16');
        expect(result.emphasis).toBe('high');
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

        // MainDraw delega a `formatEliminationRound`, che chiama la finale
        // "Gold" — non "Final" — in coppia con "Bronze". Le due etichette sono
        // le due medaglie, ed e' l'unica coppia coerente.
        expect(result.displayName).toBe('Gold');
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

        // Il test pretendeva un `console.warn` che il formatter non ha mai
        // emesso. E non deve emetterlo: questo e' il percorso di rendering di
        // ogni singola card partita, e un round non riconosciuto e' un caso
        // previsto — per questo esiste il fallback. Un warn qui vorrebbe dire
        // una riga di log per card, a ogni render. Cio' che conta e' che il
        // fallback non perda il valore originale, ed e' asserito sopra.
        expect(consoleSpy).not.toHaveBeenCalled();

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
        ['1', 'critical'],   // Gold
        ['2', 'critical'],   // Bronze
        ['3', 'critical'],   // Semi Final
        ['4', 'medium'],     // non e' un round a eliminazione: fallback
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