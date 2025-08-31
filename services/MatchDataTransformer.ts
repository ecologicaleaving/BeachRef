/**
 * @fileoverview Match Data Transformer Service
 * Transforms raw VIS API match data for proper display formatting
 * Handles the separation of Round and RoundPhase fields for accurate tournament phase display
 */

import { BeachMatch } from '../types/match';

/**
 * Round display data structure for UI components
 */
export interface RoundDisplayData {
  /** The round identifier for display (e.g., "1", "2", "Final") */
  round: string;
  /** The phase identifier for formatting context (e.g., "4", "MainDraw") */
  phase?: string;
}

/**
 * Service for transforming match data between VIS API format and UI display format
 * Solves the "4 everywhere" issue by properly separating Round and RoundPhase fields
 */
export class MatchDataTransformer {
  /**
   * Extract round display data from match with proper field separation
   * 
   * Priority order for round information:
   * 1. Use RoundName if available (already human-readable)
   * 2. Use Round + RoundPhase combination for formatter processing
   * 3. Fallback to individual fields with sensible defaults
   * 
   * @param match BeachMatch from VIS API
   * @returns RoundDisplayData with separated round and phase information
   */
  static getRoundDisplayData(match: BeachMatch): RoundDisplayData {
    // Cast to access VIS API fields not in our type definition yet
    const visMatch = match as any;
    
    
    // Priority 1: Use roundName if available (pre-formatted by API)
    if (visMatch.roundName && typeof visMatch.roundName === 'string' && visMatch.roundName.trim() !== '') {
      return {
        round: visMatch.roundName.trim(),
        phase: visMatch.roundPhase
      };
    }
    
    // Priority 2: Use round + roundPhase combination
    if (visMatch.round && visMatch.roundPhase) {
      return {
        round: String(visMatch.round).trim(),
        phase: String(visMatch.roundPhase).trim()
      };
    }
    
    // Priority 3: Individual field fallbacks
    if (visMatch.round) {
      return {
        round: String(visMatch.round).trim(),
        phase: visMatch.roundPhase
      };
    }
    
    if (visMatch.roundPhase) {
      // Special handling for roundPhase-only scenarios
      const roundPhase = String(visMatch.roundPhase).trim();
      
      // If roundPhase is a number, it needs round context for proper display
      if (/^[1-4]$/.test(roundPhase)) {
        return {
          round: 'TBD', // Will trigger fallback formatting
          phase: roundPhase
        };
      }
      
      // If roundPhase is a string enum, use it directly
      return {
        round: roundPhase,
        phase: roundPhase
      };
    }
    
    // Final fallback
    return {
      round: match.Round || 'TBD',
      phase: undefined
    };
  }
  
  /**
   * Check if match has proper round information for display
   * Used for validation and debugging
   */
  static hasValidRoundData(match: BeachMatch): boolean {
    const visMatch = match as any;
    return !!(
      visMatch.roundName ||
      visMatch.round ||
      visMatch.roundPhase ||
      match.Round
    );
  }
  
  /**
   * Get debug information about match round data
   * Useful for troubleshooting tournament phase display issues
   */
  static getDebugInfo(match: BeachMatch): Record<string, any> {
    const visMatch = match as any;
    return {
      matchNo: match.No,
      hasRoundName: !!visMatch.roundName,
      hasRound: !!visMatch.round,
      hasRoundPhase: !!visMatch.roundPhase,
      hasLegacyRound: !!match.Round,
      values: {
        roundName: visMatch.roundName,
        round: visMatch.round,
        roundPhase: visMatch.roundPhase,
        legacyRound: match.Round
      }
    };
  }
}