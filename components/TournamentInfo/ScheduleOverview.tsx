/**
 * Schedule Overview Component
 * Story 2.3: Tournament Info Panel System
 * 
 * Referee's daily assignment schedule with time management
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  StyleSheet
} from 'react-native';
import { ScheduleOverviewProps, ScheduleItem } from '../../types/tournamentInfo';
import { designTokens } from '../../theme/tokens';
import { StatusIcons, DataIcons, UtilityIcons } from '../Icons/IconLibrary';
import {
  formatScheduleTime,
  getTimeUntilMatch,
  shouldShowTimeWarning,
  getScheduleItemStatusText,
  isScheduleItemUpcoming,
  isScheduleItemCurrent,
  getMatchDuration
} from '../../utils/tournamentInfo';

const ScheduleOverview: React.FC<ScheduleOverviewProps> = React.memo(({
  schedule,
  currentTime = new Date(),
  timeZone,
  showTimeManagement = true,
  onScheduleItemPress,
  maxItemsToShow = 5
}) => {
  const [showAllItems, setShowAllItems] = useState(false);
  const styles = getStyles();

  // Filter and sort schedule items
  const relevantSchedule = schedule
    .filter(item => item.scheduledTime >= new Date(currentTime.getTime() - 24 * 60 * 60 * 1000)) // Last 24 hours
    .sort((a, b) => a.scheduledTime.getTime() - b.scheduledTime.getTime());

  const currentMatch = relevantSchedule.find(item => isScheduleItemCurrent(item, currentTime));
  const upcomingMatches = relevantSchedule
    .filter(item => isScheduleItemUpcoming(item, currentTime))
    .slice(0, maxItemsToShow);

  const displayItems = showAllItems ? relevantSchedule : relevantSchedule.slice(0, maxItemsToShow);

  const renderStatusIcon = (item: ScheduleItem) => {
    const iconProps = { width: 16, height: 16 };
    
    if (isScheduleItemCurrent(item, currentTime)) {
      return <StatusIcons.Current {...iconProps} fill={designTokens.colors.statusColors.current} />;
    }
    
    switch (item.status) {
      case 'scheduled':
        return <StatusIcons.Upcoming {...iconProps} fill={designTokens.colors.statusColors.upcoming} />;
      case 'completed':
        return <StatusIcons.Completed {...iconProps} fill={designTokens.colors.statusColors.completed} />;
      case 'cancelled':
        return <StatusIcons.Cancelled {...iconProps} fill={designTokens.colors.error} />;
      case 'delayed':
        return <UtilityIcons.Warning {...iconProps} fill={designTokens.colors.warning} />;
      default:
        return <DataIcons.Time {...iconProps} fill={designTokens.colors.textSecondary} />;
    }
  };

  const renderTimeInfo = (item: ScheduleItem) => {
    const timeUntil = getTimeUntilMatch(item.scheduledTime, currentTime);
    const showWarning = shouldShowTimeWarning(item.scheduledTime, currentTime);
    const duration = getMatchDuration(item);

    return (
      <View style={styles.timeContainer}>
        <Text style={styles.scheduledTime}>
          {formatScheduleTime(item.scheduledTime, timeZone)}
        </Text>
        {showTimeManagement && (
          <View style={styles.timeManagement}>
            {isScheduleItemUpcoming(item, currentTime) && (
              <Text style={[
                styles.timeUntil,
                showWarning && styles.timeUntilWarning
              ]}>
                in {timeUntil}
              </Text>
            )}
            {duration !== 'TBD' && (
              <Text style={styles.duration}>{duration}</Text>
            )}
          </View>
        )}
      </View>
    );
  };

  const renderRefereePosition = (position: string) => {
    const getPositionStyle = () => {
      switch (position) {
        case 'first':
          return styles.positionFirst;
        case 'second':
          return styles.positionSecond;
        case 'line':
          return styles.positionLine;
        default:
          return styles.positionDefault;
      }
    };

    return (
      <View style={[styles.positionBadge, getPositionStyle()]}>
        <Text style={styles.positionText}>
          {position.charAt(0).toUpperCase() + position.slice(1)} Ref
        </Text>
      </View>
    );
  };

  const renderScheduleItem = ({ item, index }: { item: ScheduleItem; index: number }) => {
    const isCurrent = isScheduleItemCurrent(item, currentTime);
    const showWarning = shouldShowTimeWarning(item.scheduledTime, currentTime);

    return (
      <TouchableOpacity
        style={[
          styles.scheduleItem,
          isCurrent && styles.scheduleItemCurrent,
          showWarning && styles.scheduleItemWarning
        ]}
        onPress={() => onScheduleItemPress?.(item)}
        testID={`schedule-item-${item.matchId}`}
        accessible={true}
        accessibilityLabel={`${item.teamA} vs ${item.teamB} match at ${formatScheduleTime(item.scheduledTime)}`}
      >
        {/* Status and Time Column */}
        <View style={styles.leftColumn}>
          <View style={styles.statusRow}>
            {renderStatusIcon(item)}
            <Text style={styles.statusText}>
              {getScheduleItemStatusText(item.status)}
            </Text>
          </View>
          {renderTimeInfo(item)}
        </View>

        {/* Match Details Column */}
        <View style={styles.rightColumn}>
          <View style={styles.teamsRow}>
            <Text style={styles.teamNames} numberOfLines={1}>
              {item.teamA} vs {item.teamB}
            </Text>
            {renderRefereePosition(item.refereePosition)}
          </View>
          
          <View style={styles.matchDetailsRow}>
            <View style={styles.courtInfo}>
              <DataIcons.Location
                width={14}
                height={14}
                fill={designTokens.colors.textSecondary}
              />
              <Text style={styles.courtText}>Court {item.courtNumber}</Text>
            </View>
            <Text style={styles.roundText}>{item.round}</Text>
          </View>

          {/* Progress indicator for current match */}
          {isCurrent && item.actualStartTime && (
            <View style={styles.currentMatchIndicator}>
              <View style={styles.currentMatchDot} />
              <Text style={styles.currentMatchText}>
                Started {formatScheduleTime(item.actualStartTime, timeZone)}
              </Text>
            </View>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  const renderHeader = () => (
    <View style={styles.header}>
      <Text style={styles.title}>My Schedule</Text>
      {relevantSchedule.length > maxItemsToShow && (
        <TouchableOpacity
          onPress={() => setShowAllItems(!showAllItems)}
          style={styles.showMoreButton}
          testID="show-more-schedule"
          accessible={true}
          accessibilityLabel={showAllItems ? 'Show less schedule items' : 'Show all schedule items'}
        >
          <Text style={styles.showMoreText}>
            {showAllItems ? 'Show Less' : `Show All (${relevantSchedule.length})`}
          </Text>
          <UtilityIcons.ChevronDown
            width={16}
            height={16}
            fill={designTokens.colors.primary}
            style={showAllItems && styles.chevronRotated}
          />
        </TouchableOpacity>
      )}
    </View>
  );

  const renderCurrentMatch = () => {
    if (!currentMatch) return null;

    return (
      <View style={styles.currentMatchSection}>
        <Text style={styles.currentMatchTitle}>Current Match</Text>
        {renderScheduleItem({ item: currentMatch, index: 0 })}
      </View>
    );
  };

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <DataIcons.Time
        width={48}
        height={48}
        fill={designTokens.colors.textSecondary}
      />
      <Text style={styles.emptyStateTitle}>No matches scheduled</Text>
      <Text style={styles.emptyStateSubtitle}>
        Your referee assignments will appear here
      </Text>
    </View>
  );

  if (relevantSchedule.length === 0) {
    return (
      <View style={styles.container}>
        {renderHeader()}
        {renderEmptyState()}
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {renderHeader()}
      
      {currentMatch && renderCurrentMatch()}
      
      {upcomingMatches.length > 0 && (
        <View style={styles.upcomingSection}>
          <Text style={styles.sectionTitle}>Upcoming Matches</Text>
          <FlatList
            data={displayItems.filter(item => !isScheduleItemCurrent(item, currentTime))}
            renderItem={renderScheduleItem}
            keyExtractor={(item) => item.matchId}
            scrollEnabled={false}
            showsVerticalScrollIndicator={false}
          />
        </View>
      )}
    </View>
  );
});

const getStyles = () => {
  return StyleSheet.create({
    container: {
      backgroundColor: designTokens.colors.surfacePrimary,
      borderRadius: designTokens.spacing.borderRadius,
      padding: designTokens.spacing.large,
      marginHorizontal: designTokens.spacing.medium,
      marginVertical: designTokens.spacing.small,
      boxShadow: `0px 1px 2px rgba(0, 0, 0, 0.1)`,
      elevation: 2,
    },
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: designTokens.spacing.medium,
    },
    title: {
      ...designTokens.typography.h3,
      fontWeight: '700',
      color: designTokens.colors.textPrimary,
    },
    showMoreButton: {
      flexDirection: 'row',
      alignItems: 'center',
      minHeight: 44, // Touch target compliance
    },
    showMoreText: {
      ...designTokens.typography.bodySmall,
      color: designTokens.colors.primary,
      marginRight: 4,
    },
    chevronRotated: {
      transform: [{ rotate: '180deg' }],
    },
    currentMatchSection: {
      marginBottom: designTokens.spacing.large,
    },
    currentMatchTitle: {
      ...designTokens.typography.body,
      fontWeight: '600',
      color: designTokens.colors.statusColors.current,
      marginBottom: designTokens.spacing.small,
    },
    upcomingSection: {
      marginTop: designTokens.spacing.medium,
    },
    sectionTitle: {
      ...designTokens.typography.body,
      fontWeight: '600',
      color: designTokens.colors.textSecondary,
      marginBottom: designTokens.spacing.small,
    },
    scheduleItem: {
      flexDirection: 'row',
      backgroundColor: designTokens.colors.surfaceSecondary,
      borderRadius: designTokens.spacing.borderRadius,
      padding: designTokens.spacing.medium,
      marginBottom: designTokens.spacing.small,
      minHeight: 88, // Adequate touch target
      borderLeftWidth: 3,
      borderLeftColor: designTokens.colors.border,
    },
    scheduleItemCurrent: {
      backgroundColor: designTokens.colors.statusColors.current + '10',
      borderLeftColor: designTokens.colors.statusColors.current,
    },
    scheduleItemWarning: {
      backgroundColor: designTokens.colors.warning + '10',
      borderLeftColor: designTokens.colors.warning,
    },
    leftColumn: {
      width: 80,
      marginRight: designTokens.spacing.medium,
    },
    rightColumn: {
      flex: 1,
    },
    statusRow: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 4,
    },
    statusText: {
      ...designTokens.typography.caption,
      color: designTokens.colors.textSecondary,
      marginLeft: 4,
    },
    timeContainer: {
      alignItems: 'flex-start',
    },
    scheduledTime: {
      ...designTokens.typography.body,
      fontWeight: '700',
      color: designTokens.colors.textPrimary,
    },
    timeManagement: {
      marginTop: 4,
    },
    timeUntil: {
      ...designTokens.typography.caption,
      color: designTokens.colors.textSecondary,
    },
    timeUntilWarning: {
      color: designTokens.colors.warning,
      fontWeight: '600',
    },
    duration: {
      ...designTokens.typography.caption,
      color: designTokens.colors.textSecondary,
      marginTop: 2,
    },
    teamsRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      marginBottom: designTokens.spacing.small,
    },
    teamNames: {
      ...designTokens.typography.body,
      fontWeight: '600',
      color: designTokens.colors.textPrimary,
      flex: 1,
      marginRight: designTokens.spacing.small,
    },
    positionBadge: {
      paddingHorizontal: designTokens.spacing.small,
      paddingVertical: 2,
      borderRadius: 4,
      minWidth: 60,
      alignItems: 'center',
    },
    positionFirst: {
      backgroundColor: designTokens.colors.primary + '20',
      borderWidth: 1,
      borderColor: designTokens.colors.primary,
    },
    positionSecond: {
      backgroundColor: designTokens.colors.secondary + '20',
      borderWidth: 1,
      borderColor: designTokens.colors.secondary,
    },
    positionLine: {
      backgroundColor: designTokens.colors.accent + '20',
      borderWidth: 1,
      borderColor: designTokens.colors.accent,
    },
    positionDefault: {
      backgroundColor: designTokens.colors.surfaceSecondary,
    },
    positionText: {
      ...designTokens.typography.caption,
      fontWeight: '600',
      color: designTokens.colors.textPrimary,
      fontSize: 10,
    },
    matchDetailsRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    courtInfo: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    courtText: {
      ...designTokens.typography.bodySmall,
      color: designTokens.colors.textSecondary,
      marginLeft: 4,
    },
    roundText: {
      ...designTokens.typography.bodySmall,
      color: designTokens.colors.textSecondary,
    },
    currentMatchIndicator: {
      flexDirection: 'row',
      alignItems: 'center',
      marginTop: designTokens.spacing.small,
      paddingTop: designTokens.spacing.small,
      borderTopWidth: 1,
      borderTopColor: designTokens.colors.statusColors.current + '30',
    },
    currentMatchDot: {
      width: 8,
      height: 8,
      borderRadius: 4,
      backgroundColor: designTokens.colors.statusColors.current,
      marginRight: designTokens.spacing.small,
    },
    currentMatchText: {
      ...designTokens.typography.caption,
      color: designTokens.colors.statusColors.current,
      fontWeight: '500',
    },
    emptyState: {
      alignItems: 'center',
      paddingVertical: designTokens.spacing.extraLarge,
    },
    emptyStateTitle: {
      ...designTokens.typography.h3,
      color: designTokens.colors.textSecondary,
      marginTop: designTokens.spacing.medium,
      marginBottom: designTokens.spacing.small,
    },
    emptyStateSubtitle: {
      ...designTokens.typography.body,
      color: designTokens.colors.textSecondary,
      textAlign: 'center',
      opacity: 0.7,
    },
  });
};

ScheduleOverview.displayName = 'ScheduleOverview';

export default ScheduleOverview;