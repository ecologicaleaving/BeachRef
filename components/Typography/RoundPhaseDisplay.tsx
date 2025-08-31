/**
 * @fileoverview FIVB-compliant round phase display component
 * Renders tournament round information with professional terminology
 * Part of Enhanced Match Display System
 */

import React from 'react';
import { TextStyle } from 'react-native';
import { EnhancedCaption } from './Text';
import { 
  RoundPhaseFormatter, 
  TournamentContext, 
  EmphasisLevel 
} from '../../utils/RoundPhaseFormatter';

/**
 * Props for RoundPhaseDisplay component
 */
export interface RoundPhaseDisplayProps {
  /** Raw round string from match data */
  round: string;
  /** Optional phase information from VIS API */
  phase?: string;
  /** Tournament context for structure recognition */
  tournamentContext?: TournamentContext;
  /** Visual emphasis level override */
  emphasis?: EmphasisLevel;
  /** Color scheme override */
  color?: 'textPrimary' | 'textSecondary' | 'accent' | 'success';
  /** Additional text styling */
  style?: TextStyle;
  /** Test ID for automated testing */
  testID?: string;
}

/**
 * FIVB-compliant round phase display component
 * 
 * Converts raw round data (like "1", "2", "3", "4") to professional
 * tournament terminology (like "Final", "Semi Final", "Quarter Final")
 * 
 * @example
 * ```tsx
 * <RoundPhaseDisplay 
 *   round="1" 
 *   phase="MainDraw"
 *   emphasis="critical"
 * />
 * // Renders: "Final" with critical emphasis
 * ```
 */
export const RoundPhaseDisplay: React.FC<RoundPhaseDisplayProps> = ({
  round,
  phase,
  tournamentContext,
  emphasis: emphasisOverride,
  color = 'textSecondary',
  style,
  testID
}) => {
  // Format the round phase using FIVB standards
  const roundInfo = RoundPhaseFormatter.formatRoundPhase(
    round,
    phase,
    tournamentContext
  );
  
  // Use provided emphasis or calculated emphasis
  const finalEmphasis = emphasisOverride || roundInfo.emphasis;
  
  return (
    <EnhancedCaption
      emphasis={finalEmphasis}
      color={color}
      style={style}
      accessibilityLabel={roundInfo.accessibilityLabel}
      accessibilityRole="text"
      testID={testID}
    >
      {roundInfo.displayName}
    </EnhancedCaption>
  );
};

/**
 * React.memo comparison function for performance optimization
 */
const areEqual = (
  prevProps: RoundPhaseDisplayProps,
  nextProps: RoundPhaseDisplayProps
): boolean => {
  return (
    prevProps.round === nextProps.round &&
    prevProps.phase === nextProps.phase &&
    prevProps.emphasis === nextProps.emphasis &&
    prevProps.color === nextProps.color &&
    JSON.stringify(prevProps.tournamentContext) === JSON.stringify(nextProps.tournamentContext)
  );
};

/**
 * Memoized version for performance in match lists
 */
export const RoundPhaseDisplayMemo = React.memo(RoundPhaseDisplay, areEqual);

// Default export uses memoized version for performance
export default RoundPhaseDisplayMemo;