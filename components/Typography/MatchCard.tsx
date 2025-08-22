/**
 * MatchCard Component - Typography Hierarchy Implementation
 * Referee-optimized match card with clear information scanning patterns
 */

import React from 'react';
import { View, StyleSheet, Pressable } from 'react-native';
import { Title, Heading, Subheading, EnhancedBodyText, EnhancedCaption } from './Text';
import { colors, spacing } from '../../theme/tokens';
import { getStatusColor } from '../../utils/colors';
import { FlagImage } from '../FlagImage';

export interface MatchInfo {
  matchId: string;
  teamA: string;
  teamB: string;
  teamACountryCode?: string;
  teamBCountryCode?: string;
  time: string;
  date: string;
  court: string;
  round: string;
  status: 'scheduled' | 'live' | 'completed' | 'cancelled';
  refereeRole?: 'referee1' | 'referee2';
  priority?: 'critical' | 'high' | 'medium' | 'low';
}

export interface MatchCardProps {
  match: MatchInfo;
  variant?: 'current' | 'upcoming' | 'completed';
  onPress?: (match: MatchInfo) => void;
  testID?: string;
}

/**
 * MatchCard with hierarchical typography for referee scanning
 * Information Hierarchy: Match ID > Teams > Time/Status > Court/Round
 */
export const MatchCard: React.FC<MatchCardProps> = ({
  match,
  variant = 'upcoming',
  onPress,
  testID,
}) => {
  const handlePress = () => {
    onPress?.(match);
  };

  const getVariantStyles = () => {
    switch (variant) {
      case 'current':
        return {
          container: styles.currentContainer,
          emphasis: 'critical' as const,
        };
      case 'completed':
        return {
          container: styles.completedContainer,
          emphasis: 'low' as const,
        };
      case 'upcoming':
      default:
        return {
          container: styles.upcomingContainer,
          emphasis: 'medium' as const,
        };
    }
  };

  const { container, emphasis } = getVariantStyles();

  return (
    <Pressable
      style={({ pressed }) => [
        styles.baseContainer,
        container,
        pressed && styles.pressed,
      ]}
      onPress={handlePress}
      accessibilityRole="button"
      accessibilityLabel={`Match ${match.matchId}: ${match.teamA} vs ${match.teamB}, ${match.date} at ${match.time}, Court ${match.court}`}
      testID={testID}
    >
      {/* PRIMARY LEVEL: Match ID - Largest, most prominent */}
      <View style={styles.matchIdSection}>
        <Title 
          level={2} 
          critical={variant === 'current'}
          color="textPrimary"
          style={styles.matchId}
        >
          {match.matchId}
        </Title>
        
        {/* Status indicator with urgent caption for live matches */}
        <EnhancedCaption
          urgent={match.status === 'live'}
          emphasis={match.status === 'live' ? 'critical' : emphasis}
          color={match.status === 'live' ? 'success' : 'textSecondary'}
          style={styles.statusText}
        >
          {match.status.toUpperCase()}
        </EnhancedCaption>
      </View>

      {/* SECONDARY LEVEL: Team Names - Clear hierarchy with vs separator */}
      <View style={styles.teamsSection}>
        <View style={styles.teamContainer}>
          <FlagImage
            countryCode={match.teamACountryCode}
            teamName={match.teamA}
            size="medium"
            style={styles.flagImage}
          />
          <Heading 
            emphasis={emphasis}
            hierarchy="secondary"
            color="textPrimary"
            style={styles.teamName}
          >
            {match.teamA}
          </Heading>
        </View>
        
        <EnhancedBodyText 
          emphasis="low"
          color="textSecondary"
          style={styles.vsText}
        >
          vs
        </EnhancedBodyText>
        
        <View style={styles.teamContainer}>
          <FlagImage
            countryCode={match.teamBCountryCode}
            teamName={match.teamB}
            size="medium"
            style={styles.flagImage}
          />
          <Heading 
            emphasis={emphasis}
            hierarchy="secondary"
            color="textPrimary"
            style={styles.teamName}
          >
            {match.teamB}
          </Heading>
        </View>
      </View>

      {/* TERTIARY LEVEL: Time and Status Information */}
      <View style={styles.timeStatusSection}>
        <View style={styles.timeInfo}>
          <Subheading 
            emphasis={emphasis}
            color="textPrimary"
            style={styles.timeText}
          >
            {match.time}
          </Subheading>
          <EnhancedCaption 
            emphasis="medium"
            color="textSecondary"
          >
            {match.date}
          </EnhancedCaption>
        </View>

        <View style={styles.venueInfo}>
          <Subheading 
            emphasis="high"
            color="textPrimary"
            style={styles.courtText}
          >
            Court {match.court}
          </Subheading>
          <EnhancedCaption 
            emphasis="medium"
            color="textSecondary"
          >
            {match.round}
          </EnhancedCaption>
        </View>
      </View>

      {/* Referee Role (if applicable) */}
      {match.refereeRole && (
        <View style={styles.refereeRoleSection}>
          <EnhancedBodyText 
            emphasis="medium"
            color="accent"
            style={styles.refereeRole}
          >
            {match.refereeRole === 'referee1' ? '1st Referee' : '2nd Referee'}
          </EnhancedBodyText>
        </View>
      )}
    </Pressable>
  );
};

const styles = StyleSheet.create({
  baseContainer: {
    backgroundColor: colors.background,
    borderRadius: 12,
    padding: spacing.lg,
    marginVertical: spacing.sm,
    marginHorizontal: spacing.md,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 8,
    borderWidth: 2,
    borderColor: '#E5E7EB',
    minHeight: 160, // Adequate touch target size
  },
  currentContainer: {
    borderColor: colors.success,
    borderWidth: 3,
    backgroundColor: '#F0FDF4', // Very light green background
  },
  upcomingContainer: {
    borderColor: colors.secondary,
    borderWidth: 2,
  },
  completedContainer: {
    borderColor: '#D1D5DB',
    opacity: 0.8,
    backgroundColor: '#F9FAFB',
  },
  pressed: {
    transform: [{ scale: 0.98 }],
    opacity: 0.9,
  },
  matchIdSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.md,
  },
  matchId: {
    flex: 1,
  },
  statusText: {
    marginLeft: spacing.sm,
  },
  teamsSection: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
    paddingHorizontal: spacing.sm,
  },
  teamContainer: {
    flex: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  teamName: {
    textAlign: 'center',
    flex: 1,
  },
  flagImage: {
    marginRight: spacing.xs,
  },
  vsText: {
    flex: 0.5,
    textAlign: 'center',
    fontWeight: '300',
  },
  timeStatusSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginBottom: spacing.sm,
  },
  timeInfo: {
    alignItems: 'flex-start',
  },
  timeText: {
    marginBottom: 2,
  },
  venueInfo: {
    alignItems: 'flex-end',
  },
  courtText: {
    marginBottom: 2,
  },
  refereeRoleSection: {
    marginTop: spacing.sm,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    alignItems: 'center',
  },
  refereeRole: {
    fontWeight: '600',
  },
});

export default MatchCard;