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
    
    // Debug logging to understand API data structure
    if (process.env.NODE_ENV === 'development') {
      console.log(`🔍 [MatchDataTransformer] Processing match:`, {
        matchNo: match.No,
        Round: visMatch.Round,
        RoundPhase: visMatch.RoundPhase,
        RoundName: visMatch.RoundName,
        RoundCode: visMatch.RoundCode,
        component: 'MatchDataTransformer'
      });
    }
    
    // Priority 1: Use RoundName if available (pre-formatted by API)
    if (visMatch.RoundName && typeof visMatch.RoundName === 'string' && visMatch.RoundName.trim() !== '') {
      return {
        round: visMatch.RoundName.trim(),
        phase: visMatch.RoundPhase
      };
    }
    
    // Priority 2: Use Round + RoundPhase combination
    if (visMatch.Round && visMatch.RoundPhase) {
      return {
        round: String(visMatch.Round).trim(),
        phase: String(visMatch.RoundPhase).trim()
      };
    }
    
    // Priority 3: Individual field fallbacks
    if (visMatch.Round) {
      return {
        round: String(visMatch.Round).trim(),
        phase: visMatch.RoundPhase
      };
    }
    
    if (visMatch.RoundPhase) {
      // Special handling for RoundPhase-only scenarios
      const roundPhase = String(visMatch.RoundPhase).trim();
      
      // If RoundPhase is a number, it needs Round context for proper display
      if (/^[1-4]$/.test(roundPhase)) {
        return {
          round: 'TBD', // Will trigger fallback formatting
          phase: roundPhase
        };
      }
      
      // If RoundPhase is a string enum, use it directly
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
      visMatch.RoundName ||
      visMatch.Round ||
      visMatch.RoundPhase ||
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
      hasRoundName: !!visMatch.RoundName,
      hasRound: !!visMatch.Round,
      hasRoundPhase: !!visMatch.RoundPhase,
      hasLegacyRound: !!match.Round,
      values: {
        RoundName: visMatch.RoundName,
        Round: visMatch.Round,
        RoundPhase: visMatch.RoundPhase,
        legacyRound: match.Round
      }
    };
  }
}