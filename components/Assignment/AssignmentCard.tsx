/**
 * Assignment Card Base Component
 * Story 2.1: Assignment Card Component System
 * 
 * Base component for referee assignment display with variant support
 */

import React from 'react';
import { 
  View, 
  Text, 
  TouchableOpacity, 
  StyleSheet, 
  ViewStyle, 
  TextStyle 
} from 'react-native';
import { AssignmentCardProps } from '../../types/assignments';
import { 
  formatAssignmentTime, 
  formatAssignmentDate, 
  formatRefereePosition,
  getCountdownText,
  isAssignmentStartingSoon 
} from '../../utils/assignments';
import { designTokens } from '../../theme/tokens';
import { StatusIcons, DataIcons, UtilityIcons } from '../Icons/IconLibrary';

const AssignmentCard: React.FC<AssignmentCardProps> = React.memo(({
  assignment,
  variant,
  showCountdown = false,
  onPress,
  isInteractive = false
}) => {
  const cardVariant = variant || assignment.status;
  const styles = getStyles(cardVariant);
  const isStartingSoon = isAssignmentStartingSoon(assignment.matchTime);

  const handlePress = () => {
    if (isInteractive && onPress) {
      onPress(assignment);
    }
  };

  const renderStatusIcon = () => {
    switch (cardVariant) {
      case 'current':
        return (
          <StatusIcons.Current 
            size="medium" 
            theme="highContrast"
          />
        );
      case 'upcoming':
        return (
          <StatusIcons.Upcoming 
            size="medium" 
            theme={isStartingSoon ? "highContrast" : "default"}
          />
        );
      case 'completed':
        return (
          <StatusIcons.Completed 
            size="medium" 
            theme="default"
          />
        );
      case 'cancelled':
        return (
          <StatusIcons.Cancelled 
            size="medium" 
            theme="default"
          />
        );
      default:
        return null;
    }
  };

  const renderCountdown = () => {
    if (!showCountdown || cardVariant === 'completed' || cardVariant === 'cancelled') {
      return null;
    }

    const countdownText = getCountdownText(assignment.matchTime);
    
    return (
      <View style={styles.countdownContainer}>
        <Text style={styles.countdownText}>{countdownText}</Text>
      </View>
    );
  };

  const CardWrapper = isInteractive ? TouchableOpacity : View;
  const cardProps = isInteractive ? {
    onPress: handlePress,
    activeOpacity: 0.8,
    accessibilityRole: 'button' as const,
    accessibilityLabel: `Assignment: ${assignment.homeTeam} vs ${assignment.awayTeam} at ${formatAssignmentTime(assignment.matchTime)}`,
    accessibilityHint: 'Double tap to view assignment details',
    testID: `assignment-card-${assignment.id}`
  } : {
    testID: `assignment-card-${assignment.id}`
  };

  return (
    <CardWrapper 
      style={styles.card}
      {...cardProps}
    >
      {/* Status Header */}
      <View style={styles.statusHeader}>
        <View style={styles.statusIconContainer}>
          {renderStatusIcon()}
          <Text style={styles.statusText}>
            {formatRefereePosition(assignment.refereePosition)}
          </Text>
        </View>
        {renderCountdown()}
      </View>

      {/* Match Information */}
      <View style={styles.matchInfoContainer}>
        <View style={styles.teamsContainer}>
          <Text style={styles.teamsText}>
            {assignment.homeTeam} vs {assignment.awayTeam}
          </Text>
        </View>
        
        <View style={styles.matchDetailsContainer}>
          <View style={styles.courtTimeContainer}>
            <DataIcons.Details 
              size="small" 
              theme="default" 
              colorKey="secondary"
            />
            <Text style={styles.courtText}>Court {assignment.courtNumber}</Text>
          </View>
          
          <View style={styles.courtTimeContainer}>
            <UtilityIcons.Info 
              size="small" 
              theme="default" 
              colorKey="muted"
            />
            <Text style={styles.timeText}>
              {formatAssignmentDate(assignment.matchTime)} at {formatAssignmentTime(assignment.matchTime)}
            </Text>
          </View>
        </View>
      </View>

      {/* Result Summary for completed assignments */}
      {assignment.matchResult && cardVariant === 'completed' && (
        <View style={styles.resultContainer}>
          <Text style={styles.resultText}>Result: {assignment.matchResult}</Text>
        </View>
      )}

      {/* Notes */}
      {assignment.notes && (
        <View style={styles.notesContainer}>
          <Text style={styles.notesText}>{assignment.notes}</Text>
        </View>
      )}
    </CardWrapper>
  );
});

AssignmentCard.displayName = 'AssignmentCard';

const getStyles = (variant: string) => {
  const baseCard: ViewStyle = {
    backgroundColor: designTokens.colors.surfacePrimary,
    borderRadius: designTokens.spacing.borderRadius,
    padding: designTokens.spacing.medium,
    marginVertical: designTokens.spacing.small,
    marginHorizontal: designTokens.spacing.medium,
    borderWidth: 1,
    minHeight: 44, // Touch target compliance
  };

  const baseText: TextStyle = {
    fontFamily: designTokens.typography.fontFamily,
    color: designTokens.colors.textPrimary,
  };

  // Variant-specific styling
  let cardStyle: ViewStyle = { ...baseCard };
  let statusTextStyle: TextStyle = { ...baseText };

  switch (variant) {
    case 'current':
      cardStyle = {
        ...cardStyle,
        borderColor: designTokens.colors.accent,
        borderWidth: 2,
        backgroundColor: designTokens.colors.surfacePrimary,
        elevation: 4,
        shadowColor: designTokens.colors.accent,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 4,
      };
      statusTextStyle = {
        ...statusTextStyle,
        color: designTokens.colors.accent,
        fontWeight: '600',
      };
      break;
    case 'upcoming':
      cardStyle = {
        ...cardStyle,
        borderColor: designTokens.colors.secondary,
        backgroundColor: designTokens.colors.surfacePrimary,
      };
      statusTextStyle = {
        ...statusTextStyle,
        color: designTokens.colors.secondary,
        fontWeight: '500',
      };
      break;
    case 'completed':
      cardStyle = {
        ...cardStyle,
        borderColor: designTokens.colors.textSecondary,
        backgroundColor: designTokens.colors.surfaceSecondary,
        opacity: 0.8,
      };
      statusTextStyle = {
        ...statusTextStyle,
        color: designTokens.colors.textSecondary,
        fontWeight: '400',
      };
      break;
    case 'cancelled':
      cardStyle = {
        ...cardStyle,
        borderColor: designTokens.colors.error,
        backgroundColor: designTokens.colors.surfaceSecondary,
        opacity: 0.7,
      };
      statusTextStyle = {
        ...statusTextStyle,
        color: designTokens.colors.error,
        fontWeight: '500',
      };
      break;
  }

  return StyleSheet.create({
    card: cardStyle,
    statusHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: designTokens.spacing.small,
    },
    statusIconContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      flex: 1,
    },
    statusText: {
      ...statusTextStyle,
      fontSize: designTokens.typography.sizes.body,
      marginLeft: designTokens.spacing.small,
    },
    countdownContainer: {
      backgroundColor: variant === 'current' ? designTokens.colors.accent : designTokens.colors.secondary,
      paddingHorizontal: designTokens.spacing.small,
      paddingVertical: designTokens.spacing.xsmall,
      borderRadius: designTokens.spacing.borderRadius / 2,
    },
    countdownText: {
      ...baseText,
      color: designTokens.colors.surfacePrimary,
      fontSize: designTokens.typography.sizes.small,
      fontWeight: '600',
    },
    matchInfoContainer: {
      marginBottom: designTokens.spacing.small,
    },
    teamsContainer: {
      marginBottom: designTokens.spacing.xsmall,
    },
    teamsText: {
      ...baseText,
      fontSize: variant === 'current' ? designTokens.typography.sizes?.h2 : designTokens.typography.sizes.h3,
      fontWeight: variant === 'current' ? '700' : '600',
      lineHeight: variant === 'current' ? designTokens.typography.lineHeights.h2 : designTokens.typography.lineHeights.h3,
    },
    matchDetailsContainer: {
      gap: designTokens.spacing.xsmall,
    },
    courtTimeContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: designTokens.spacing.xsmall,
    },
    courtText: {
      ...baseText,
      fontSize: designTokens.typography.sizes.body,
      fontWeight: '500',
      color: designTokens.colors.textSecondary,
    },
    timeText: {
      ...baseText,
      fontSize: designTokens.typography.sizes.body,
      color: designTokens.colors.textSecondary,
    },
    resultContainer: {
      marginTop: designTokens.spacing.small,
      paddingTop: designTokens.spacing.small,
      borderTopWidth: 1,
      borderTopColor: designTokens.colors.textSecondary,
    },
    resultText: {
      ...baseText,
      fontSize: designTokens.typography.sizes.body,
      fontWeight: '500',
      color: designTokens.colors.textSecondary,
    },
    notesContainer: {
      marginTop: designTokens.spacing.small,
    },
    notesText: {
      ...baseText,
      fontSize: designTokens.typography.sizes.small,
      fontStyle: 'italic',
      color: designTokens.colors.textSecondary,
    },
  });
};

export default AssignmentCard;