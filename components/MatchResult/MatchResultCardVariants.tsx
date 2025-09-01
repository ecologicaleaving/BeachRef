/**
 * Match Result Card Variants
 * Story 2.2: Match Result Card Optimization
 * 
 * Specialized variant components for different match types and workflows
 */

import React, { useState } from 'react';
import { 
  View, 
  Text, 
  TouchableOpacity, 
  ScrollView,
  StyleSheet, 
  ViewStyle, 
  TextStyle 
} from 'react-native';
import { EnhancedMatchResult, SpecialResult } from '../../types/MatchResults';
import MatchResultCard from './MatchResultCard';
import ScoreEntry from './ScoreEntry';
import QuickActions from './QuickActions';
import { 
  convertToSetScores, 
  createMatchResultFromSets,
  calculateFinalScore,
  formatMatchTime
} from '../../utils/matchResults';
import { designTokens } from '../../theme/tokens';
import { ActionIcons, UtilityIcons, StatusIcons } from '../Icons/IconLibrary';

// Beach Volleyball Result Card Component
interface BeachVolleyballResultCardProps {
  matchResult: EnhancedMatchResult;
  isEditable?: boolean;
  onUpdate?: (matchResult: EnhancedMatchResult) => void;
  onSubmit?: (matchResult: EnhancedMatchResult) => void;
  onPress?: (matchResult: EnhancedMatchResult) => void;
}

export const BeachVolleyballResultCard: React.FC<BeachVolleyballResultCardProps> = React.memo(({
  matchResult,
  isEditable = false,
  onUpdate,
  onSubmit,
  onPress
}) => {
  const [sets, setSets] = useState(convertToSetScores(matchResult));
  const [showQuickActions, setShowQuickActions] = useState(false);
  const [weatherNotes, setWeatherNotes] = useState(matchResult.weatherConditions || '');
  
  const styles = getBeachStyles();

  const handleScoreUpdate = (setIndex: number, homeScore: number, awayScore: number) => {
    if (!isEditable) return;

    const newSets = [...sets];
    newSets[setIndex] = { 
      homeScore, 
      awayScore, 
      completed: newSets[setIndex].completed 
    };
    setSets(newSets);

    const updatedResult = createMatchResultFromSets(
      { ...matchResult, weatherConditions: weatherNotes },
      newSets
    );
    
    if (onUpdate) {
      onUpdate(updatedResult);
    }
  };

  const handleSetComplete = (setIndex: number) => {
    if (!isEditable) return;

    const newSets = [...sets];
    newSets[setIndex] = { ...newSets[setIndex], completed: true };
    setSets(newSets);

    const updatedResult = createMatchResultFromSets(
      { ...matchResult, weatherConditions: weatherNotes },
      newSets
    );
    
    if (onUpdate) {
      onUpdate(updatedResult);
    }
  };

  const handleSpecialResult = (type: SpecialResult, notes?: string) => {
    if (!isEditable) return;

    const updatedResult = {
      ...matchResult,
      specialResult: type,
      specialResultNotes: notes,
      status: 'Finished' as const,
      resultStatus: 'submitted' as const,
      lastModified: new Date(),
    };
    
    if (onUpdate) {
      onUpdate(updatedResult);
    }
  };

  if (!isEditable) {
    return (
      <MatchResultCard
        matchResult={matchResult}
        variant="beach"
        onPress={onPress}
      />
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.titleContainer}>
          <StatusIcons.Beach width={24} height={24} fill={designTokens.colors.accent} />
          <Text style={styles.title}>Beach Volleyball</Text>
        </View>
        <Text style={styles.courtTime}>
          Court {matchResult.court} • {formatMatchTime(new Date(matchResult.localDate))}
        </Text>
      </View>

      {/* Teams */}
      <View style={styles.teamsContainer}>
        <Text style={styles.teamName}>{matchResult.teamAName}</Text>
        <Text style={styles.vsText}>vs</Text>
        <Text style={styles.teamName}>{matchResult.teamBName}</Text>
      </View>

      {/* Score Entry for each set */}
      <ScrollView style={styles.setsContainer}>
        {sets.map((set, index) => (
          <ScoreEntry
            key={index}
            homeScore={set.homeScore}
            awayScore={set.awayScore}
            setNumber={index + 1}
            isCompleted={set.completed}
            isEditable={isEditable && !set.completed}
            onScoreChange={(home, away) => handleScoreUpdate(index, home, away)}
            onSetComplete={() => handleSetComplete(index)}
          />
        ))}
      </ScrollView>

      {/* Weather Conditions */}
      <View style={styles.weatherContainer}>
        <View style={styles.weatherHeader}>
          <UtilityIcons.Weather width={20} height={20} fill={designTokens.colors.primary} />
          <Text style={styles.weatherTitle}>Weather Conditions</Text>
        </View>
        <View style={styles.weatherControls}>
          <TouchableOpacity 
            style={styles.weatherButton}
            onPress={() => setWeatherNotes('Sunny, No Wind')}
            testID="weather-sunny"
          >
            <Text style={styles.weatherButtonText}>☀️ Sunny</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.weatherButton}
            onPress={() => setWeatherNotes('Windy Conditions')}
            testID="weather-windy"
          >
            <Text style={styles.weatherButtonText}>💨 Windy</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.weatherButton}
            onPress={() => setWeatherNotes('Hot Conditions')}
            testID="weather-hot"
          >
            <Text style={styles.weatherButtonText}>🔥 Hot</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Action Buttons */}
      <View style={styles.actionsContainer}>
        <TouchableOpacity
          style={styles.specialResultButton}
          onPress={() => setShowQuickActions(true)}
          testID="show-special-results"
        >
          <ActionIcons.Alert width={20} height={20} fill={designTokens.colors.error} />
          <Text style={styles.specialResultButtonText}>Special Result</Text>
        </TouchableOpacity>

        {calculateFinalScore(sets).isComplete && onSubmit && (
          <TouchableOpacity
            style={styles.submitButton}
            onPress={() => {
              const finalResult = createMatchResultFromSets(
                { ...matchResult, weatherConditions: weatherNotes },
                sets
              );
              onSubmit(finalResult);
            }}
            testID="submit-beach-result"
          >
            <ActionIcons.Submit width={20} height={20} fill={designTokens.colors.surfacePrimary} />
            <Text style={styles.submitButtonText}>Submit Result</Text>
          </TouchableOpacity>
        )}
      </View>

      <QuickActions
        isVisible={showQuickActions}
        isEditable={isEditable}
        onSpecialResult={handleSpecialResult}
        onClose={() => setShowQuickActions(false)}
      />
    </View>
  );
});

BeachVolleyballResultCard.displayName = 'BeachVolleyballResultCard';

// Indoor Tournament Result Card Component
interface IndoorTournamentResultCardProps {
  matchResult: EnhancedMatchResult;
  isEditable?: boolean;
  onUpdate?: (matchResult: EnhancedMatchResult) => void;
  onSubmit?: (matchResult: EnhancedMatchResult) => void;
  onPress?: (matchResult: EnhancedMatchResult) => void;
}

export const IndoorTournamentResultCard: React.FC<IndoorTournamentResultCardProps> = React.memo(({
  matchResult,
  isEditable = false,
  onUpdate,
  onSubmit,
  onPress
}) => {
  const [sets, setSets] = useState(convertToSetScores(matchResult));
  const [showQuickActions, setShowQuickActions] = useState(false);
  const [statistics, setStatistics] = useState({
    duration: matchResult.durationSet1 || '',
    timeouts: 0,
    challenges: 0,
  });
  
  const styles = getIndoorStyles();

  const handleScoreUpdate = (setIndex: number, homeScore: number, awayScore: number) => {
    if (!isEditable) return;

    const newSets = [...sets];
    newSets[setIndex] = { 
      homeScore, 
      awayScore, 
      completed: newSets[setIndex].completed 
    };
    setSets(newSets);

    const updatedResult = createMatchResultFromSets(matchResult, newSets);
    
    if (onUpdate) {
      onUpdate(updatedResult);
    }
  };

  const handleSetComplete = (setIndex: number) => {
    if (!isEditable) return;

    const newSets = [...sets];
    newSets[setIndex] = { ...newSets[setIndex], completed: true };
    setSets(newSets);

    const updatedResult = createMatchResultFromSets(matchResult, newSets);
    
    if (onUpdate) {
      onUpdate(updatedResult);
    }
  };

  const handleSpecialResult = (type: SpecialResult, notes?: string) => {
    if (!isEditable) return;

    const updatedResult = {
      ...matchResult,
      specialResult: type,
      specialResultNotes: notes,
      status: 'Finished' as const,
      resultStatus: 'submitted' as const,
      lastModified: new Date(),
    };
    
    if (onUpdate) {
      onUpdate(updatedResult);
    }
  };

  if (!isEditable) {
    return (
      <MatchResultCard
        matchResult={matchResult}
        variant="indoor"
        onPress={onPress}
      />
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.titleContainer}>
          <StatusIcons.Indoor width={24} height={24} fill={designTokens.colors.secondary} />
          <Text style={styles.title}>Indoor Tournament</Text>
        </View>
        <Text style={styles.roundInfo}>
          {matchResult.round} • Court {matchResult.court}
        </Text>
      </View>

      {/* Teams */}
      <View style={styles.teamsContainer}>
        <Text style={styles.teamName}>{matchResult.teamAName}</Text>
        <Text style={styles.vsText}>vs</Text>
        <Text style={styles.teamName}>{matchResult.teamBName}</Text>
      </View>

      {/* Score Entry for each set */}
      <ScrollView style={styles.setsContainer}>
        {sets.map((set, index) => (
          <ScoreEntry
            key={index}
            homeScore={set.homeScore}
            awayScore={set.awayScore}
            setNumber={index + 1}
            isCompleted={set.completed}
            isEditable={isEditable && !set.completed}
            onScoreChange={(home, away) => handleScoreUpdate(index, home, away)}
            onSetComplete={() => handleSetComplete(index)}
          />
        ))}
      </ScrollView>

      {/* Extended Statistics */}
      <View style={styles.statisticsContainer}>
        <Text style={styles.statisticsTitle}>Match Statistics</Text>
        <View style={styles.statsGrid}>
          <View style={styles.statItem}>
            <Text style={styles.statLabel}>Duration</Text>
            <Text style={styles.statValue}>{statistics.duration || 'N/A'}</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statLabel}>Timeouts</Text>
            <Text style={styles.statValue}>{statistics.timeouts}</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statLabel}>Challenges</Text>
            <Text style={styles.statValue}>{statistics.challenges}</Text>
          </View>
        </View>
      </View>

      {/* Action Buttons */}
      <View style={styles.actionsContainer}>
        <TouchableOpacity
          style={styles.specialResultButton}
          onPress={() => setShowQuickActions(true)}
          testID="show-special-results"
        >
          <ActionIcons.Alert width={20} height={20} fill={designTokens.colors.error} />
          <Text style={styles.specialResultButtonText}>Special Result</Text>
        </TouchableOpacity>

        {calculateFinalScore(sets).isComplete && onSubmit && (
          <TouchableOpacity
            style={styles.submitButton}
            onPress={() => {
              const finalResult = createMatchResultFromSets(matchResult, sets);
              onSubmit(finalResult);
            }}
            testID="submit-indoor-result"
          >
            <ActionIcons.Submit width={20} height={20} fill={designTokens.colors.surfacePrimary} />
            <Text style={styles.submitButtonText}>Submit Result</Text>
          </TouchableOpacity>
        )}
      </View>

      <QuickActions
        isVisible={showQuickActions}
        isEditable={isEditable}
        onSpecialResult={handleSpecialResult}
        onClose={() => setShowQuickActions(false)}
      />
    </View>
  );
});

IndoorTournamentResultCard.displayName = 'IndoorTournamentResultCard';

// Quick Result Entry Card Component
interface QuickResultEntryCardProps {
  matchResult: EnhancedMatchResult;
  onSubmit: (matchResult: EnhancedMatchResult) => void;
  onCancel: () => void;
}

export const QuickResultEntryCard: React.FC<QuickResultEntryCardProps> = React.memo(({
  matchResult,
  onSubmit,
  onCancel
}) => {
  const [quickResult, setQuickResult] = useState<'home' | 'away' | null>(null);
  const [showQuickActions, setShowQuickActions] = useState(false);
  
  const styles = getQuickStyles();

  const handleQuickResult = (winner: 'home' | 'away') => {
    const result = winner === 'home' 
      ? { homeSets: 2, awaySets: 0 }
      : { homeSets: 0, awaySets: 2 };

    const quickResult: EnhancedMatchResult = {
      ...matchResult,
      matchPointsA: result.homeSets,
      matchPointsB: result.awaySets,
      pointsTeamASet1: winner === 'home' ? 21 : 15,
      pointsTeamBSet1: winner === 'home' ? 15 : 21,
      pointsTeamASet2: winner === 'home' ? 21 : 16,
      pointsTeamBSet2: winner === 'home' ? 16 : 21,
      status: 'Finished',
      resultStatus: 'submitted',
      lastModified: new Date(),
    };

    onSubmit(quickResult);
  };

  const handleSpecialResult = (type: SpecialResult, notes?: string) => {
    const specialResult: EnhancedMatchResult = {
      ...matchResult,
      specialResult: type,
      specialResultNotes: notes,
      status: 'Finished',
      resultStatus: 'submitted',
      lastModified: new Date(),
    };

    onSubmit(specialResult);
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.titleContainer}>
          <ActionIcons.Fast width={24} height={24} fill={designTokens.colors.warning} />
          <Text style={styles.title}>Quick Result Entry</Text>
        </View>
        <TouchableOpacity 
          style={styles.cancelButton}
          onPress={onCancel}
          testID="cancel-quick-entry"
        >
          <UtilityIcons.Close width={20} height={20} fill={designTokens.colors.textSecondary} />
        </TouchableOpacity>
      </View>

      {/* Teams */}
      <View style={styles.teamsContainer}>
        <Text style={styles.courtInfo}>
          Court {matchResult.court} • {formatMatchTime(new Date(matchResult.localDate))}
        </Text>
        <View style={styles.matchupContainer}>
          <Text style={styles.teamName}>{matchResult.teamAName}</Text>
          <Text style={styles.vsText}>vs</Text>
          <Text style={styles.teamName}>{matchResult.teamBName}</Text>
        </View>
      </View>

      {/* Quick Winner Buttons */}
      <View style={styles.quickWinnerContainer}>
        <Text style={styles.quickWinnerTitle}>Select Winner (2-0)</Text>
        <View style={styles.winnerButtons}>
          <TouchableOpacity
            style={[styles.winnerButton, styles.homeWinnerButton]}
            onPress={() => handleQuickResult('home')}
            testID="quick-home-winner"
          >
            <Text style={styles.winnerButtonText}>{matchResult.teamAName}</Text>
            <Text style={styles.winnerButtonSubtext}>wins 2-0</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.winnerButton, styles.awayWinnerButton]}
            onPress={() => handleQuickResult('away')}
            testID="quick-away-winner"
          >
            <Text style={styles.winnerButtonText}>{matchResult.teamBName}</Text>
            <Text style={styles.winnerButtonSubtext}>wins 2-0</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Special Result Button */}
      <View style={styles.specialResultContainer}>
        <TouchableOpacity
          style={styles.specialResultButton}
          onPress={() => setShowQuickActions(true)}
          testID="show-quick-special-results"
        >
          <ActionIcons.Alert width={20} height={20} fill={designTokens.colors.error} />
          <Text style={styles.specialResultButtonText}>Special Result</Text>
        </TouchableOpacity>
      </View>

      <QuickActions
        isVisible={showQuickActions}
        isEditable={true}
        onSpecialResult={handleSpecialResult}
        onClose={() => setShowQuickActions(false)}
      />
    </View>
  );
});

QuickResultEntryCard.displayName = 'QuickResultEntryCard';

// Styles for Beach Volleyball variant
const getBeachStyles = () => StyleSheet.create({
  container: {
    backgroundColor: designTokens.colors.surfacePrimary,
    borderRadius: designTokens.spacing.borderRadius,
    padding: designTokens.spacing.large,
    marginVertical: designTokens.spacing.medium,
    borderLeftWidth: 4,
    borderLeftColor: designTokens.colors.accent,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: designTokens.spacing.medium,
  },
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  title: {
    ...designTokens.typography.h3,
    fontWeight: '700',
    color: designTokens.colors.textPrimary,
    marginLeft: designTokens.spacing.small,
  },
  courtTime: {
    ...designTokens.typography.bodySmall,
    color: designTokens.colors.textSecondary,
  },
  teamsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: designTokens.spacing.large,
  },
  teamName: {
    ...designTokens.typography.h2,
    fontWeight: '700',
    color: designTokens.colors.textPrimary,
    flex: 1,
    textAlign: 'center',
  },
  vsText: {
    ...designTokens.typography.body,
    color: designTokens.colors.textSecondary,
    marginHorizontal: designTokens.spacing.medium,
  },
  setsContainer: {
    maxHeight: 400,
    marginBottom: designTokens.spacing.large,
  },
  weatherContainer: {
    backgroundColor: designTokens.colors.surfaceSecondary,
    borderRadius: designTokens.spacing.borderRadius,
    padding: designTokens.spacing.medium,
    marginBottom: designTokens.spacing.medium,
  },
  weatherHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: designTokens.spacing.small,
  },
  weatherTitle: {
    ...designTokens.typography.bodySmall,
    fontWeight: '600',
    color: designTokens.colors.textPrimary,
    marginLeft: designTokens.spacing.small,
  },
  weatherControls: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: designTokens.spacing.small,
  },
  weatherButton: {
    backgroundColor: designTokens.colors.surfacePrimary,
    borderRadius: designTokens.spacing.borderRadius,
    paddingHorizontal: designTokens.spacing.medium,
    paddingVertical: designTokens.spacing.small,
    minHeight: 44,
    justifyContent: 'center',
  },
  weatherButtonText: {
    ...designTokens.typography.caption,
    color: designTokens.colors.textPrimary,
  },
  actionsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: designTokens.spacing.medium,
  },
  specialResultButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: designTokens.colors.surfaceSecondary,
    borderRadius: designTokens.spacing.borderRadius,
    paddingVertical: designTokens.spacing.medium,
    minHeight: 44,
    borderWidth: 2,
    borderColor: designTokens.colors.error,
  },
  specialResultButtonText: {
    ...designTokens.typography.body,
    fontWeight: '600',
    color: designTokens.colors.error,
    marginLeft: designTokens.spacing.small,
  },
  submitButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: designTokens.colors.statusColors.completed,
    borderRadius: designTokens.spacing.borderRadius,
    paddingVertical: designTokens.spacing.medium,
    minHeight: 44,
  },
  submitButtonText: {
    ...designTokens.typography.body,
    fontWeight: '600',
    color: designTokens.colors.surfacePrimary,
    marginLeft: designTokens.spacing.small,
  },
});

// Styles for Indoor Tournament variant
const getIndoorStyles = () => StyleSheet.create({
  container: {
    backgroundColor: designTokens.colors.surfacePrimary,
    borderRadius: designTokens.spacing.borderRadius,
    padding: designTokens.spacing.large,
    marginVertical: designTokens.spacing.medium,
    borderLeftWidth: 4,
    borderLeftColor: designTokens.colors.secondary,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: designTokens.spacing.medium,
  },
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  title: {
    ...designTokens.typography.h3,
    fontWeight: '700',
    color: designTokens.colors.textPrimary,
    marginLeft: designTokens.spacing.small,
  },
  roundInfo: {
    ...designTokens.typography.bodySmall,
    color: designTokens.colors.textSecondary,
  },
  teamsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: designTokens.spacing.large,
  },
  teamName: {
    ...designTokens.typography.h2,
    fontWeight: '700',
    color: designTokens.colors.textPrimary,
    flex: 1,
    textAlign: 'center',
  },
  vsText: {
    ...designTokens.typography.body,
    color: designTokens.colors.textSecondary,
    marginHorizontal: designTokens.spacing.medium,
  },
  setsContainer: {
    maxHeight: 400,
    marginBottom: designTokens.spacing.large,
  },
  statisticsContainer: {
    backgroundColor: designTokens.colors.surfaceSecondary,
    borderRadius: designTokens.spacing.borderRadius,
    padding: designTokens.spacing.medium,
    marginBottom: designTokens.spacing.medium,
  },
  statisticsTitle: {
    ...designTokens.typography.bodySmall,
    fontWeight: '600',
    color: designTokens.colors.textPrimary,
    marginBottom: designTokens.spacing.small,
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  statItem: {
    alignItems: 'center',
  },
  statLabel: {
    ...designTokens.typography.caption,
    color: designTokens.colors.textSecondary,
    marginBottom: 2,
  },
  statValue: {
    ...designTokens.typography.bodySmall,
    fontWeight: '600',
    color: designTokens.colors.textPrimary,
  },
  actionsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: designTokens.spacing.medium,
  },
  specialResultButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: designTokens.colors.surfaceSecondary,
    borderRadius: designTokens.spacing.borderRadius,
    paddingVertical: designTokens.spacing.medium,
    minHeight: 44,
    borderWidth: 2,
    borderColor: designTokens.colors.error,
  },
  specialResultButtonText: {
    ...designTokens.typography.body,
    fontWeight: '600',
    color: designTokens.colors.error,
    marginLeft: designTokens.spacing.small,
  },
  submitButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: designTokens.colors.statusColors.completed,
    borderRadius: designTokens.spacing.borderRadius,
    paddingVertical: designTokens.spacing.medium,
    minHeight: 44,
  },
  submitButtonText: {
    ...designTokens.typography.body,
    fontWeight: '600',
    color: designTokens.colors.surfacePrimary,
    marginLeft: designTokens.spacing.small,
  },
});

// Styles for Quick Result Entry variant
const getQuickStyles = () => StyleSheet.create({
  container: {
    backgroundColor: designTokens.colors.surfacePrimary,
    borderRadius: designTokens.spacing.borderRadius,
    padding: designTokens.spacing.large,
    marginVertical: designTokens.spacing.medium,
    borderLeftWidth: 4,
    borderLeftColor: designTokens.colors.warning,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: designTokens.spacing.medium,
  },
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  title: {
    ...designTokens.typography.h3,
    fontWeight: '700',
    color: designTokens.colors.textPrimary,
    marginLeft: designTokens.spacing.small,
  },
  cancelButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: designTokens.colors.surfaceSecondary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  teamsContainer: {
    alignItems: 'center',
    marginBottom: designTokens.spacing.large,
  },
  courtInfo: {
    ...designTokens.typography.bodySmall,
    color: designTokens.colors.textSecondary,
    marginBottom: designTokens.spacing.small,
  },
  matchupContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  teamName: {
    ...designTokens.typography.h2,
    fontWeight: '700',
    color: designTokens.colors.textPrimary,
    flex: 1,
    textAlign: 'center',
  },
  vsText: {
    ...designTokens.typography.body,
    color: designTokens.colors.textSecondary,
    marginHorizontal: designTokens.spacing.medium,
  },
  quickWinnerContainer: {
    marginBottom: designTokens.spacing.large,
  },
  quickWinnerTitle: {
    ...designTokens.typography.h3,
    fontWeight: '600',
    color: designTokens.colors.textPrimary,
    textAlign: 'center',
    marginBottom: designTokens.spacing.medium,
  },
  winnerButtons: {
    flexDirection: 'row',
    gap: designTokens.spacing.medium,
  },
  winnerButton: {
    flex: 1,
    alignItems: 'center',
    padding: designTokens.spacing.large,
    borderRadius: designTokens.spacing.borderRadius,
    minHeight: 80,
    justifyContent: 'center',
    borderWidth: 3,
  },
  homeWinnerButton: {
    backgroundColor: designTokens.colors.surfaceSecondary,
    borderColor: designTokens.colors.statusColors.completed,
  },
  awayWinnerButton: {
    backgroundColor: designTokens.colors.surfaceSecondary,
    borderColor: designTokens.colors.statusColors.completed,
  },
  winnerButtonText: {
    ...designTokens.typography.body,
    fontWeight: '700',
    color: designTokens.colors.textPrimary,
    textAlign: 'center',
    marginBottom: 4,
  },
  winnerButtonSubtext: {
    ...designTokens.typography.caption,
    color: designTokens.colors.statusColors.completed,
    fontWeight: '600',
  },
  specialResultContainer: {
    alignItems: 'center',
  },
  specialResultButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: designTokens.colors.surfaceSecondary,
    borderRadius: designTokens.spacing.borderRadius,
    paddingVertical: designTokens.spacing.medium,
    paddingHorizontal: designTokens.spacing.large,
    minHeight: 44,
    borderWidth: 2,
    borderColor: designTokens.colors.error,
    minWidth: 200,
  },
  specialResultButtonText: {
    ...designTokens.typography.body,
    fontWeight: '600',
    color: designTokens.colors.error,
    marginLeft: designTokens.spacing.small,
  },
});