/**
 * Match Result Card Base Component
 * Story 2.2: Match Result Card Optimization
 * 
 * Base component for referee match result display and entry with variant support
 */

import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet
} from 'react-native';
import {
  MatchResultCardProps
} from '../../types/MatchResults';
import { 
  formatMatchTime, 
  formatMatchDate, 
  formatScoreDisplay,
  formatSetsDisplay,
  calculateFinalScore,
  convertToSetScores,
  validateMatchResult,
  getResultStatusText,
  needsSync
} from '../../utils/matchResults';
import { designTokens } from '../../theme/tokens';
import { StatusIcons, DataIcons, UtilityIcons } from '../Icons/IconLibrary';

const MatchResultCard: React.FC<MatchResultCardProps> = React.memo(({
  matchResult,
  variant,
  isEditable = false,
  onPress
}) => {
  const cardVariant = variant || matchResult.matchType;
  const styles = getStyles(cardVariant, isEditable);
  const sets = convertToSetScores(matchResult);
  const finalScore = calculateFinalScore(sets);
  const validationErrors = validateMatchResult(matchResult);
  const hasErrors = validationErrors.some(error => error.severity === 'error');
  const needsSyncStatus = needsSync(matchResult);

  const handlePress = () => {
    if (onPress) {
      try {
        onPress(matchResult);
      } catch (error) {
        // console.warn('MatchResultCard: Error in onPress callback:', error);
      }
    }
  };

  const renderStatusIcon = () => {
    if (needsSyncStatus) {
      return (
        <StatusIcons.Sync 
          width={20} 
          height={20} 
          fill={designTokens.colors.warning} 
        />
      );
    }

    switch (matchResult.status) {
      case 'Running':
        return (
          <StatusIcons.Current 
            width={20} 
            height={20} 
            fill={designTokens.colors.statusColors.current} 
          />
        );
      case 'Finished':
        return (
          <StatusIcons.Completed 
            width={20} 
            height={20} 
            fill={designTokens.colors.statusColors.completed} 
          />
        );
      case 'Scheduled':
        return (
          <StatusIcons.Upcoming 
            width={20} 
            height={20} 
            fill={designTokens.colors.statusColors.upcoming} 
          />
        );
      case 'Cancelled':
        return (
          <StatusIcons.Cancelled 
            width={20} 
            height={20} 
            fill={designTokens.colors.statusColors.cancelled} 
          />
        );
      default:
        return (
          <DataIcons.Time 
            width={20} 
            height={20} 
            fill={designTokens.colors.textSecondary} 
          />
        );
    }
  };

  const renderScoreDisplay = () => {
    if (matchResult.specialResult) {
      return (
        <View style={styles.specialResultContainer}>
          <Text style={styles.specialResultText}>
            {matchResult.specialResult.toUpperCase()}
          </Text>
          {matchResult.specialResultNotes && (
            <Text style={styles.specialResultNotes}>
              {matchResult.specialResultNotes}
            </Text>
          )}
        </View>
      );
    }

    return (
      <View style={styles.scoreContainer}>
        {sets.map((set, index) => {
          if (set.homeScore === 0 && set.awayScore === 0) return null;
          
          return (
            <View key={index} style={styles.setScore}>
              <Text style={styles.setLabel}>Set {index + 1}</Text>
              <Text style={styles.setScoreText}>
                {formatScoreDisplay(set.homeScore, set.awayScore)}
              </Text>
            </View>
          );
        })}
        
        {finalScore.isComplete && (
          <View style={styles.finalScore}>
            <Text style={styles.finalScoreLabel}>Sets</Text>
            <Text style={styles.finalScoreText}>
              {formatSetsDisplay(finalScore.homeSets, finalScore.awaySets)}
            </Text>
          </View>
        )}
      </View>
    );
  };

  const renderValidationErrors = () => {
    if (validationErrors.length === 0) return null;

    return (
      <View style={styles.errorsContainer}>
        {validationErrors.map((error, index) => (
          <View key={index} style={styles.errorItem}>
            <UtilityIcons.Warning 
              width={16} 
              height={16} 
              fill={error.severity === 'error' ? designTokens.colors.error : designTokens.colors.warning} 
            />
            <Text style={[
              styles.errorText, 
              error.severity === 'error' ? styles.errorTextCritical : styles.errorTextWarning
            ]}>
              {error.message}
            </Text>
          </View>
        ))}
      </View>
    );
  };

  const renderSyncStatus = () => {
    if (!needsSyncStatus) return null;

    return (
      <View style={styles.syncStatusContainer}>
        <StatusIcons.Sync 
          width={16} 
          height={16} 
          fill={designTokens.colors.warning} 
        />
        <Text style={styles.syncStatusText}>
          {getResultStatusText(matchResult.resultStatus)}
        </Text>
      </View>
    );
  };

  const CardWrapper = onPress ? TouchableOpacity : View;

  return (
    <CardWrapper
      style={[
        styles.card,
        hasErrors && styles.cardWithErrors,
        needsSyncStatus && styles.cardPendingSync
      ]}
      onPress={onPress ? handlePress : undefined}
      testID={onPress ? 'match-result-card-interactive' : 'match-result-card'}
      accessible={true}
      accessibilityLabel={`Match result: ${matchResult.teamAName} vs ${matchResult.teamBName}`}
      accessibilityHint={onPress ? "Tap to view match details" : undefined}
    >
      {/* Header with Status and Court */}
      <View style={styles.header}>
        <View style={styles.statusContainer}>
          {renderStatusIcon()}
          <Text style={styles.courtNumber}>Court {matchResult.court}</Text>
        </View>
        <View style={styles.timeContainer}>
          <Text style={styles.timeText}>{formatMatchTime(new Date(matchResult.localDate))}</Text>
          <Text style={styles.dateText}>{formatMatchDate(new Date(matchResult.localDate))}</Text>
        </View>
      </View>

      {/* Teams */}
      <View style={styles.teamsContainer}>
        <Text style={styles.teamName}>{matchResult.teamAName}</Text>
        <Text style={styles.vsText}>vs</Text>
        <Text style={styles.teamName}>{matchResult.teamBName}</Text>
      </View>

      {/* Score Display */}
      {renderScoreDisplay()}

      {/* Match Type and Round */}
      <View style={styles.metadataContainer}>
        <Text style={styles.matchType}>
          {cardVariant?.toUpperCase()} • {matchResult.round}
        </Text>
        <Text style={styles.resultStatus}>
          {getResultStatusText(matchResult.resultStatus)}
        </Text>
      </View>

      {/* Weather Conditions (for beach volleyball) */}
      {cardVariant === 'beach' && (matchResult.weatherConditions || matchResult.temperature) && (
        <View style={styles.weatherContainer}>
          <UtilityIcons.Weather 
            width={16} 
            height={16} 
            fill={designTokens.colors.textSecondary} 
          />
          <Text style={styles.weatherText}>
            {matchResult.weatherConditions}
            {matchResult.temperature && ` • ${matchResult.temperature}°C`}
            {matchResult.windSpeed && ` • ${matchResult.windSpeed} km/h wind`}
          </Text>
        </View>
      )}

      {/* Validation Errors */}
      {renderValidationErrors()}

      {/* Sync Status */}
      {renderSyncStatus()}

      {/* Notes */}
      {matchResult.notes && (
        <View style={styles.notesContainer}>
          <Text style={styles.notesText}>{matchResult.notes}</Text>
        </View>
      )}
    </CardWrapper>
  );
});

const getStyles = (variant: string, isEditable: boolean) => {
  const baseCard: ViewStyle = {
    backgroundColor: designTokens.colors.surfacePrimary,
    borderRadius: designTokens.spacing.borderRadius,
    padding: designTokens.spacing.medium,
    marginVertical: designTokens.spacing.small,
    minHeight: 44, // Touch target compliance
    shadowColor: designTokens.colors.shadowColor,
    shadowOffset: designTokens.shadows.card.offset,
    shadowOpacity: designTokens.shadows.card.opacity,
    shadowRadius: designTokens.shadows.card.radius,
    elevation: designTokens.shadows.card.elevation,
  };

  // Variant-specific styling
  const variantStyles: Record<string, ViewStyle> = {
    beach: {
      borderLeftWidth: 4,
      borderLeftColor: designTokens.colors.accent,
    },
    indoor: {
      borderLeftWidth: 4,
      borderLeftColor: designTokens.colors.secondary,
    },
    quick: {
      borderLeftWidth: 4,
      borderLeftColor: designTokens.colors.warning,
    },
  };

  return StyleSheet.create({
    card: {
      ...baseCard,
      ...(variantStyles[variant] || variantStyles.beach),
      ...(isEditable && {
        borderWidth: 2,
        borderColor: designTokens.colors.primary,
        borderStyle: 'dashed',
      }),
    },
    cardWithErrors: {
      borderColor: designTokens.colors.error,
      borderWidth: 1,
    },
    cardPendingSync: {
      backgroundColor: designTokens.colors.surfaceSecondary,
    },
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: designTokens.spacing.small,
    },
    statusContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      flex: 1,
    },
    courtNumber: {
      ...designTokens.typography.body,
      fontWeight: '600',
      color: designTokens.colors.textPrimary,
      marginLeft: designTokens.spacing.small,
    },
    timeContainer: {
      alignItems: 'flex-end',
    },
    timeText: {
      ...designTokens.typography.bodySmall,
      fontWeight: '600',
      color: designTokens.colors.textPrimary,
    },
    dateText: {
      ...designTokens.typography.caption,
      color: designTokens.colors.textSecondary,
    },
    teamsContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: designTokens.spacing.medium,
    },
    teamName: {
      ...designTokens.typography.h3,
      fontWeight: '700',
      color: designTokens.colors.textPrimary,
      flex: 1,
      textAlign: 'center',
    },
    vsText: {
      ...designTokens.typography.body,
      color: designTokens.colors.textSecondary,
      marginHorizontal: designTokens.spacing.small,
    },
    scoreContainer: {
      flexDirection: 'row',
      justifyContent: 'center',
      flexWrap: 'wrap',
      marginBottom: designTokens.spacing.small,
    },
    setScore: {
      alignItems: 'center',
      marginHorizontal: designTokens.spacing.small,
      minWidth: 60,
    },
    setLabel: {
      ...designTokens.typography.caption,
      color: designTokens.colors.textSecondary,
      marginBottom: 2,
    },
    setScoreText: {
      ...designTokens.typography.h3,
      fontWeight: '700',
      color: designTokens.colors.textPrimary,
    },
    finalScore: {
      alignItems: 'center',
      marginLeft: designTokens.spacing.medium,
      paddingLeft: designTokens.spacing.medium,
      borderLeftWidth: 1,
      borderLeftColor: designTokens.colors.border,
    },
    finalScoreLabel: {
      ...designTokens.typography.caption,
      color: designTokens.colors.textSecondary,
      marginBottom: 2,
    },
    finalScoreText: {
      ...designTokens.typography.h2,
      fontWeight: '700',
      color: designTokens.colors.statusColors.current,
    },
    specialResultContainer: {
      alignItems: 'center',
      paddingVertical: designTokens.spacing.small,
      backgroundColor: designTokens.colors.surfaceSecondary,
      borderRadius: designTokens.spacing.borderRadius / 2,
      marginBottom: designTokens.spacing.small,
    },
    specialResultText: {
      ...designTokens.typography.h3,
      fontWeight: '700',
      color: designTokens.colors.error,
    },
    specialResultNotes: {
      ...designTokens.typography.bodySmall,
      color: designTokens.colors.textSecondary,
      marginTop: 4,
      textAlign: 'center',
    },
    metadataContainer: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginTop: designTokens.spacing.small,
    },
    matchType: {
      ...designTokens.typography.caption,
      fontWeight: '600',
      color: designTokens.colors.textSecondary,
    },
    resultStatus: {
      ...designTokens.typography.caption,
      color: designTokens.colors.textSecondary,
    },
    weatherContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      marginTop: designTokens.spacing.small,
      paddingTop: designTokens.spacing.small,
      borderTopWidth: 1,
      borderTopColor: designTokens.colors.border,
    },
    weatherText: {
      ...designTokens.typography.caption,
      color: designTokens.colors.textSecondary,
      marginLeft: designTokens.spacing.small,
    },
    errorsContainer: {
      marginTop: designTokens.spacing.small,
      paddingTop: designTokens.spacing.small,
      borderTopWidth: 1,
      borderTopColor: designTokens.colors.border,
    },
    errorItem: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 4,
    },
    errorText: {
      ...designTokens.typography.caption,
      marginLeft: designTokens.spacing.small,
      flex: 1,
    },
    errorTextCritical: {
      color: designTokens.colors.error,
    },
    errorTextWarning: {
      color: designTokens.colors.warning,
    },
    syncStatusContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      marginTop: designTokens.spacing.small,
      paddingTop: designTokens.spacing.small,
      borderTopWidth: 1,
      borderTopColor: designTokens.colors.border,
    },
    syncStatusText: {
      ...designTokens.typography.caption,
      color: designTokens.colors.warning,
      marginLeft: designTokens.spacing.small,
    },
    notesContainer: {
      marginTop: designTokens.spacing.small,
      paddingTop: designTokens.spacing.small,
      borderTopWidth: 1,
      borderTopColor: designTokens.colors.border,
    },
    notesText: {
      ...designTokens.typography.bodySmall,
      color: designTokens.colors.textSecondary,
      fontStyle: 'italic',
    },
  });
};

MatchResultCard.displayName = 'MatchResultCard';

export default MatchResultCard;