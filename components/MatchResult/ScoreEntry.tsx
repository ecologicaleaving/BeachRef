/**
 * Score Entry Interface Component
 * Story 2.2: Match Result Card Optimization
 * 
 * Touch-optimized score input controls for outdoor referee conditions
 */

import React, { useState } from 'react';
import { 
  View, 
  Text, 
  TouchableOpacity, 
  TextInput,
  StyleSheet, 
  Alert
} from 'react-native';
import { ScoreEntryProps, ResultValidationError } from '../../types/MatchResults';
import { validateSetScore } from '../../utils/matchResults';
import { designTokens } from '../../theme/tokens';
import { ActionIcons, UtilityIcons } from '../Icons/IconLibrary';

const ScoreEntry: React.FC<ScoreEntryProps> = React.memo(({
  homeScore,
  awayScore,
  setNumber,
  isCompleted,
  isEditable,
  onScoreChange,
  onSetComplete
}) => {
  const [homeInput, setHomeInput] = useState(homeScore.toString());
  const [awayInput, setAwayInput] = useState(awayScore.toString());
  const [errors, setErrors] = useState<ResultValidationError[]>([]);

  const styles = getStyles(isCompleted, isEditable);

  const validateAndUpdate = (newHomeScore: string, newAwayScore: string) => {
    const homeNum = parseInt(newHomeScore) || 0;
    const awayNum = parseInt(newAwayScore) || 0;
    
    const validationErrors = validateSetScore(homeNum, awayNum, setNumber);
    setErrors(validationErrors);
    
    if (homeNum !== homeScore || awayNum !== awayScore) {
      onScoreChange(homeNum, awayNum);
    }
  };

  const handleHomeScoreChange = (value: string) => {
    // Only allow numbers
    const numericValue = value.replace(/[^0-9]/g, '');
    if (numericValue.length <= 2) { // Max 2 digits
      setHomeInput(numericValue);
      validateAndUpdate(numericValue, awayInput);
    }
  };

  const handleAwayScoreChange = (value: string) => {
    // Only allow numbers
    const numericValue = value.replace(/[^0-9]/g, '');
    if (numericValue.length <= 2) { // Max 2 digits
      setAwayInput(numericValue);
      validateAndUpdate(homeInput, numericValue);
    }
  };

  const incrementScore = (team: 'home' | 'away') => {
    if (!isEditable) return;
    
    if (team === 'home') {
      const newScore = Math.min(homeScore + 1, 99);
      const newInput = newScore.toString();
      setHomeInput(newInput);
      validateAndUpdate(newInput, awayInput);
    } else {
      const newScore = Math.min(awayScore + 1, 99);
      const newInput = newScore.toString();
      setAwayInput(newInput);
      validateAndUpdate(homeInput, newInput);
    }
  };

  const decrementScore = (team: 'home' | 'away') => {
    if (!isEditable) return;
    
    if (team === 'home') {
      const newScore = Math.max(homeScore - 1, 0);
      const newInput = newScore.toString();
      setHomeInput(newInput);
      validateAndUpdate(newInput, awayInput);
    } else {
      const newScore = Math.max(awayScore - 1, 0);
      const newInput = newScore.toString();
      setAwayInput(newInput);
      validateAndUpdate(homeInput, newInput);
    }
  };

  const handleSetComplete = () => {
    if (!isEditable) return;
    
    const criticalErrors = errors.filter(error => error.severity === 'error');
    if (criticalErrors.length > 0) {
      Alert.alert(
        'Invalid Score',
        criticalErrors[0]?.message ?? 'Invalid score entered',
        [{ text: 'OK' }]
      );
      return;
    }
    
    onSetComplete();
  };

  const renderScoreInput = (
    score: number, 
    input: string, 
    onChangeText: (text: string) => void,
    onIncrement: () => void,
    onDecrement: () => void,
    team: 'home' | 'away'
  ) => (
    <View style={styles.scoreInputContainer}>
      {/* Decrement Button */}
      <TouchableOpacity
        style={[styles.adjustButton, !isEditable && styles.adjustButtonDisabled]}
        onPress={onDecrement}
        disabled={!isEditable || score <= 0}
        testID={`${team}-decrement-button`}
        accessible={true}
        accessibilityLabel={`Decrease ${team} score`}
      >
        <ActionIcons.Minus 
          width={24} 
          height={24} 
          fill={isEditable && score > 0 ? designTokens.colors.textPrimary : designTokens.colors.textDisabled} 
        />
      </TouchableOpacity>

      {/* Score Display/Input */}
      <View style={styles.scoreDisplayContainer}>
        {isEditable ? (
          <TextInput
            style={styles.scoreInput}
            value={input}
            onChangeText={onChangeText}
            keyboardType="numeric"
            maxLength={2}
            selectTextOnFocus={true}
            testID={`${team}-score-input`}
            accessible={true}
            accessibilityLabel={`${team} team score`}
            accessibilityHint="Enter score for this set"
          />
        ) : (
          <Text style={styles.scoreDisplay}>
            {score}
          </Text>
        )}
      </View>

      {/* Increment Button */}
      <TouchableOpacity
        style={[styles.adjustButton, !isEditable && styles.adjustButtonDisabled]}
        onPress={onIncrement}
        disabled={!isEditable || score >= 99}
        testID={`${team}-increment-button`}
        accessible={true}
        accessibilityLabel={`Increase ${team} score`}
      >
        <ActionIcons.Plus 
          width={24} 
          height={24} 
          fill={isEditable && score < 99 ? designTokens.colors.textPrimary : designTokens.colors.textDisabled} 
        />
      </TouchableOpacity>
    </View>
  );

  const renderValidationErrors = () => {
    if (errors.length === 0) return null;

    return (
      <View style={styles.errorsContainer}>
        {errors.map((error, index) => (
          <View key={index} style={styles.errorItem}>
            <UtilityIcons.Warning 
              width={14} 
              height={14} 
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

  return (
    <View style={styles.container}>
      {/* Set Header */}
      <View style={styles.header}>
        <Text style={styles.setTitle}>Set {setNumber}</Text>
        {isCompleted && (
          <View style={styles.completedIndicator}>
            <UtilityIcons.Check 
              width={16} 
              height={16} 
              fill={designTokens.colors.statusColors.completed} 
            />
            <Text style={styles.completedText}>Complete</Text>
          </View>
        )}
      </View>

      {/* Score Entry Interface */}
      <View style={styles.scoreEntryContainer}>
        {/* Home Team Score */}
        <View style={styles.teamScoreContainer}>
          <Text style={styles.teamLabel}>Home</Text>
          {renderScoreInput(
            homeScore,
            homeInput,
            handleHomeScoreChange,
            () => incrementScore('home'),
            () => decrementScore('home'),
            'home'
          )}
        </View>

        {/* VS Separator */}
        <View style={styles.separatorContainer}>
          <Text style={styles.separatorText}>vs</Text>
        </View>

        {/* Away Team Score */}
        <View style={styles.teamScoreContainer}>
          <Text style={styles.teamLabel}>Away</Text>
          {renderScoreInput(
            awayScore,
            awayInput,
            handleAwayScoreChange,
            () => incrementScore('away'),
            () => decrementScore('away'),
            'away'
          )}
        </View>
      </View>

      {/* Validation Errors */}
      {renderValidationErrors()}

      {/* Complete Set Button */}
      {isEditable && !isCompleted && (homeScore > 0 || awayScore > 0) && (
        <TouchableOpacity
          style={[
            styles.completeButton,
            errors.some(e => e.severity === 'error') && styles.completeButtonDisabled
          ]}
          onPress={handleSetComplete}
          disabled={errors.some(e => e.severity === 'error')}
          testID="complete-set-button"
          accessible={true}
          accessibilityLabel="Mark set as complete"
          accessibilityHint="Finalizes the score for this set"
        >
          <UtilityIcons.Check 
            width={20} 
            height={20} 
            fill={designTokens.colors.surfacePrimary} 
          />
          <Text style={styles.completeButtonText}>Complete Set</Text>
        </TouchableOpacity>
      )}
    </View>
  );
});

const getStyles = (isCompleted: boolean, isEditable: boolean) => {
  return StyleSheet.create({
    container: {
      backgroundColor: designTokens.colors.surfacePrimary,
      borderRadius: designTokens.spacing.borderRadius,
      padding: designTokens.spacing.medium,
      marginVertical: designTokens.spacing.small,
      borderWidth: 1,
      borderColor: isCompleted ? designTokens.colors.statusColors.completed : designTokens.colors.border,
    },
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: designTokens.spacing.medium,
    },
    setTitle: {
      ...designTokens.typography.h3,
      fontWeight: '700',
      color: designTokens.colors.textPrimary,
    },
    completedIndicator: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    completedText: {
      ...designTokens.typography.caption,
      color: designTokens.colors.statusColors.completed,
      marginLeft: 4,
      fontWeight: '600',
    },
    scoreEntryContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    teamScoreContainer: {
      flex: 1,
      alignItems: 'center',
    },
    teamLabel: {
      ...designTokens.typography.bodySmall,
      color: designTokens.colors.textSecondary,
      marginBottom: designTokens.spacing.small,
      fontWeight: '600',
    },
    scoreInputContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
    },
    adjustButton: {
      width: 44, // Touch target compliance
      height: 44,
      borderRadius: 22,
      backgroundColor: designTokens.colors.surfaceSecondary,
      alignItems: 'center',
      justifyContent: 'center',
      marginHorizontal: designTokens.spacing.small,
    },
    adjustButtonDisabled: {
      backgroundColor: designTokens.colors.surfaceDisabled,
      opacity: 0.5,
    },
    scoreDisplayContainer: {
      minWidth: 80,
      alignItems: 'center',
    },
    scoreInput: {
      ...designTokens.typography.hero,
      fontWeight: '700',
      color: designTokens.colors.textPrimary,
      textAlign: 'center',
      backgroundColor: designTokens.colors.surfaceSecondary,
      borderRadius: designTokens.spacing.borderRadius,
      paddingHorizontal: designTokens.spacing.medium,
      paddingVertical: designTokens.spacing.small,
      minHeight: 44, // Touch target compliance
      minWidth: 80,
      borderWidth: 2,
      borderColor: designTokens.colors.primary,
    },
    scoreDisplay: {
      ...designTokens.typography.hero,
      fontWeight: '700',
      color: designTokens.colors.textPrimary,
      textAlign: 'center',
    },
    separatorContainer: {
      alignItems: 'center',
      justifyContent: 'center',
      marginHorizontal: designTokens.spacing.medium,
    },
    separatorText: {
      ...designTokens.typography.body,
      color: designTokens.colors.textSecondary,
      fontWeight: '600',
    },
    errorsContainer: {
      marginTop: designTokens.spacing.small,
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
    completeButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: designTokens.colors.statusColors.completed,
      borderRadius: designTokens.spacing.borderRadius,
      paddingVertical: designTokens.spacing.medium,
      paddingHorizontal: designTokens.spacing.large,
      marginTop: designTokens.spacing.medium,
      minHeight: 44, // Touch target compliance
    },
    completeButtonDisabled: {
      backgroundColor: designTokens.colors.surfaceDisabled,
      opacity: 0.5,
    },
    completeButtonText: {
      ...designTokens.typography.body,
      fontWeight: '600',
      color: designTokens.colors.surfacePrimary,
      marginLeft: designTokens.spacing.small,
    },
  });
};

ScoreEntry.displayName = 'ScoreEntry';

export default ScoreEntry;