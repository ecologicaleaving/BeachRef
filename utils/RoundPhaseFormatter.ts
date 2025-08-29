/**
 * @fileoverview FIVB-compliant round phase formatting utility
 * Converts raw round data to professional tournament terminology
 * Part of Enhanced Match Display System
 */

import { BeachRoundType } from '../types/beach-live';

/**
 * FIVB BeachRoundPhase enum values from VIS API
 */
export enum BeachRoundPhase {
  CONFEDERATION_QUOTA = 'ConfederationQuota',
  FEDERATION_QUOTA = 'FederationQuota', 
  QUALIFICATION = 'Qualification',
  MAIN_DRAW = 'MainDraw'
}

/**
 * Visual emphasis levels for different round phases
 */
export type EmphasisLevel = 'low' | 'medium' | 'high' | 'critical';

/**
 * Tournament structure types
 */
export type TournamentStructure = 'single-elimination' | 'double-elimination' | 'pool-play';

/**
 * Tournament context for round phase determination
 */
export interface TournamentContext {
  type: string;
  structure: TournamentStructure;
}

/**
 * Processed round phase information
 */
export interface RoundPhaseInfo {
  /** Display name for the round */
  displayName: string;
  /** Original round value */
  originalValue: string;
  /** Visual emphasis level */
  emphasis: EmphasisLevel;
  /** Whether this is a finals-related match */
  isFinals: boolean;
  /** Full descriptive name for accessibility */
  accessibilityLabel: string;
}

/**
 * FIVB-compliant round phase formatter
 * Handles conversion of raw tournament data to professional display format
 */
export class RoundPhaseFormatter {
  /**
   * Convert raw round data to FIVB-compliant display format
   */
  static formatRoundPhase(
    round: string,
    phase?: string,
    tournamentContext?: TournamentContext
  ): RoundPhaseInfo {
    const originalValue = String(round);
    
    // Debug logging to track decision path
    console.log(`🔍 [RoundPhaseFormatter] Processing: round="${round}", phase="${phase}"`);
    
    // Handle BeachRoundPhase enum values first (higher priority when explicitly provided)
    if (phase && Object.values(BeachRoundPhase).includes(phase as BeachRoundPhase)) {
      console.log(`🔍 [RoundPhaseFormatter] Path: BeachRoundPhase enum`);
      return this.handleBeachRoundPhase(phase as BeachRoundPhase, round);
    }
    
    // Handle FIVB RoundPhase numeric codes (from VIS API RoundPhase field)
    if (phase && this.isFivbRoundPhaseCode(phase)) {
      console.log(`🔍 [RoundPhaseFormatter] Path: FIVB RoundPhase code - phase="${phase}"`);
      
      // If this is Main Draw (RoundPhase 4) and we have a descriptive round name, use it directly
      if (phase === '4' && round && round.trim() !== '' && !this.isFivbRoundPhaseCode(round)) {
        console.log(`🔍 [RoundPhaseFormatter] Path: RoundPhase 4 with descriptive round name "${round}"`);
        return {
          displayName: round.trim(),
          originalValue: round,
          emphasis: this.determineEmphasisFromRoundName(round),
          isFinals: this.isFinalsRound(round),
          accessibilityLabel: `${round.trim()} match`
        };
      }
      
      // If this is Main Draw (RoundPhase 4), check the Round field for specific elimination round
      if (phase === '4' && this.isEliminationRound(round)) {
        console.log(`🔍 [RoundPhaseFormatter] Path: RoundPhase 4 + Elimination round "${round}"`);
        return this.formatEliminationRound(round);
      }
      
      const roundPhaseInfo = this.formatFivbRoundPhase(phase);
      return roundPhaseInfo;
    }
    
    // Handle elimination round numbers (FIVB standard)
    if (this.isEliminationRound(round)) {
      console.log(`🔍 [RoundPhaseFormatter] Path: Direct elimination round "${round}"`);
      return this.formatEliminationRound(round);
    }
    
    // Handle pool play rounds
    if (this.isPoolRound(round)) {
      console.log(`🔍 [RoundPhaseFormatter] Path: Pool round`);
      return this.formatPoolRound(round);
    }
    
    // Handle qualification rounds
    if (this.isQualificationRound(round, phase)) {
      console.log(`🔍 [RoundPhaseFormatter] Path: Qualification round`);
      return this.formatQualificationRound(round);
    }
    
    // Fallback for unknown formats
    console.log(`🔍 [RoundPhaseFormatter] Path: Fallback`);
    return this.createFallbackInfo(originalValue);
  }
  
  /**
   * Handle FIVB BeachRoundPhase enum values
   */
  private static handleBeachRoundPhase(phase: BeachRoundPhase, round: string): RoundPhaseInfo {
    const originalValue = String(round);
    
    switch (phase) {
      case BeachRoundPhase.CONFEDERATION_QUOTA:
        return {
          displayName: 'Confederation Quota',
          originalValue,
          emphasis: 'low',
          isFinals: false,
          accessibilityLabel: 'Confederation Quota round'
        };
        
      case BeachRoundPhase.FEDERATION_QUOTA:
        return {
          displayName: 'Federation Quota',
          originalValue,
          emphasis: 'low',
          isFinals: false,
          accessibilityLabel: 'Federation Quota round'
        };
        
      case BeachRoundPhase.QUALIFICATION:
        return {
          displayName: `Qualification ${round}`,
          originalValue,
          emphasis: 'low',
          isFinals: false,
          accessibilityLabel: `Qualification round ${round}`
        };
        
      case BeachRoundPhase.MAIN_DRAW:
        // MainDraw with elimination rounds
        if (this.isEliminationRound(round)) {
          return this.formatEliminationRound(round);
        }
        return {
          displayName: `Main Draw ${round}`,
          originalValue,
          emphasis: 'medium',
          isFinals: false,
          accessibilityLabel: `Main Draw round ${round}`
        };
        
      default:
        return this.createFallbackInfo(originalValue);
    }
  }
  
  /**
   * Format elimination round numbers to FIVB terminology
   */
  private static formatEliminationRound(round: string): RoundPhaseInfo {
    const roundNumber = round.trim();
    
    switch (roundNumber) {
      case '4':
        return {
          displayName: 'Quarter Final',
          originalValue: round,
          emphasis: 'high',
          isFinals: true,
          accessibilityLabel: 'Quarter Final match'
        };
        
      case '3':
        return {
          displayName: 'Semi Final',
          originalValue: round,
          emphasis: 'critical',
          isFinals: true,
          accessibilityLabel: 'Semi Final match'
        };
        
      case '2':
        return {
          displayName: 'Bronze Medal',
          originalValue: round,
          emphasis: 'critical',
          isFinals: true,
          accessibilityLabel: 'Bronze Medal match'
        };
        
      case '1':
        return {
          displayName: 'Final',
          originalValue: round,
          emphasis: 'critical',
          isFinals: true,
          accessibilityLabel: 'Final match'
        };
        
      default:
        return {
          displayName: `Round ${roundNumber}`,
          originalValue: round,
          emphasis: 'medium',
          isFinals: false,
          accessibilityLabel: `Round ${roundNumber} match`
        };
    }
  }
  
  /**
   * Format pool play rounds
   */
  private static formatPoolRound(round: string): RoundPhaseInfo {
    return {
      displayName: round,
      originalValue: round,
      emphasis: 'medium',
      isFinals: false,
      accessibilityLabel: `${round} pool match`
    };
  }
  
  /**
   * Format qualification rounds
   */
  private static formatQualificationRound(round: string): RoundPhaseInfo {
    return {
      displayName: `Qualification ${round}`,
      originalValue: round,
      emphasis: 'low',
      isFinals: false,
      accessibilityLabel: `Qualification round ${round}`
    };
  }
  
  /**
   * Create fallback info for unknown formats
   */
  private static createFallbackInfo(round: string): RoundPhaseInfo {
    const trimmed = round.trim();
    
    // Handle "TBD" (To Be Determined) specifically
    if (/^tbd$/i.test(trimmed)) {
      return {
        displayName: 'TBD',
        originalValue: round,
        emphasis: 'low',
        isFinals: false,
        accessibilityLabel: 'To be determined'
      };
    }

    // Handle other common scheduling terms
    if (/^(n\/a|na|not\s*available)$/i.test(trimmed)) {
      return {
        displayName: 'N/A',
        originalValue: round,
        emphasis: 'low',
        isFinals: false,
        accessibilityLabel: 'Not available'
      };
    }
    
    // Log warning for unknown format in development
    if (__DEV__) {
      console.warn(`Unknown round format: "${round}". Using fallback display.`);
    }
    
    // For numeric rounds > 4 that aren't standard elimination rounds, add "Round " prefix
    const isHigherNumeric = /^\d+$/.test(trimmed) && parseInt(trimmed) > 4;
    const displayName = isHigherNumeric ? `Round ${round}` : round;
    const accessibilityLabel = isHigherNumeric ? `Round ${round} match` : `Round ${round}`;
    
    return {
      displayName,
      originalValue: round,
      emphasis: 'medium',
      isFinals: false,
      accessibilityLabel
    };
  }
  
  /**
   * Check if round represents elimination phase
   * Updated based on real API data - using traditional beach volleyball elimination structure
   */
  private static isEliminationRound(round: string): boolean {
    const trimmed = round.trim();
    // Only consider 1,2,3 as elimination rounds since 4 seems to be all matches in some tournaments
    return /^[1-3]$/.test(trimmed);
  }
  
  /**
   * Check if round represents pool play
   */
  private static isPoolRound(round: string): boolean {
    return /pool/i.test(round) || /group/i.test(round);
  }
  
  /**
   * Check if round represents qualification
   */
  private static isQualificationRound(round: string, phase?: string): boolean {
    return /qualification/i.test(round) || phase === 'Qualification';
  }
  
  /**
   * Check if value is a FIVB RoundPhase numeric code
   */
  private static isFivbRoundPhaseCode(round: string): boolean {
    const trimmed = round.trim();
    return /^[1-4]$/.test(trimmed);
  }
  
  /**
   * Format FIVB RoundPhase numeric codes
   * Based on real API data observation - CORRECTED MAPPING:
   * 1 = Qualification rounds  
   * 2 = Pool Play/Group Stage
   * 3 = Bronze Medal match or Secondary elimination  
   * 4 = Main Draw/Elimination Finals (Finals, Semi-Finals)
   */
  private static formatFivbRoundPhase(roundPhase: string): RoundPhaseInfo {
    const code = roundPhase.trim();
    
    switch (code) {
      case '1':
        return {
          displayName: 'Qualification',
          originalValue: roundPhase,
          emphasis: 'low',
          isFinals: false,
          accessibilityLabel: 'Qualification match'
        };
        
      case '2':
        return {
          displayName: 'Pool Play',
          originalValue: roundPhase,
          emphasis: 'medium',
          isFinals: false,
          accessibilityLabel: 'Pool Play match'
        };
        
      case '3':
        return {
          displayName: 'Bronze Medal',
          originalValue: roundPhase,
          emphasis: 'critical',
          isFinals: true,
          accessibilityLabel: 'Bronze Medal match'
        };
        
      case '4':
        // RoundPhase 4 = Main Draw/Elimination phase
        // When no separate Round field available, show generic "Elimination"
        return {
          displayName: 'Elimination',
          originalValue: roundPhase,
          emphasis: 'high',
          isFinals: false,
          accessibilityLabel: 'Elimination phase'
        };
        
      default:
        return {
          displayName: `Phase ${code}`,
          originalValue: roundPhase,
          emphasis: 'medium',
          isFinals: false,
          accessibilityLabel: `Phase ${code} match`
        };
    }
  }
  
  /**
   * Determine visual emphasis based on round importance
   */
  static getVisualEmphasis(roundInfo: RoundPhaseInfo): EmphasisLevel {
    return roundInfo.emphasis;
  }
  
  /**
   * Determine emphasis level from round name content
   */
  private static determineEmphasisFromRoundName(roundName: string): EmphasisLevel {
    const lower = roundName.toLowerCase();
    
    if (lower.includes('final') && !lower.includes('semi')) {
      return 'critical';
    }
    
    if (lower.includes('semi') || lower.includes('bronze') || lower.includes('medal')) {
      return 'critical';
    }
    
    if (lower.includes('quarter') || lower.includes('round of 8')) {
      return 'high';
    }
    
    if (lower.includes('round of')) {
      return 'high';
    }
    
    if (lower.includes('pool') || lower.includes('group')) {
      return 'medium';
    }
    
    return 'medium';
  }
  
  /**
   * Check if round name represents finals-related matches
   */
  private static isFinalsRound(roundName: string): boolean {
    const lower = roundName.toLowerCase();
    return lower.includes('final') || lower.includes('bronze') || lower.includes('medal') ||
           lower.includes('semi') || lower.includes('quarter');
  }
}