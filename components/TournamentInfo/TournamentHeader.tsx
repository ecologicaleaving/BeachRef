/**
 * Tournament Header Component
 * Story 2.3: Tournament Info Panel System
 * 
 * Tournament name, date, location with referee-relevant details
 */

import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet
} from 'react-native';
import { TournamentHeaderProps } from '../../types/tournamentInfo';
import { designTokens } from '../../theme/tokens';
import { StatusIcons, DataIcons } from '../Icons/IconLibrary';
import {
  formatTournamentDateRange,
  getTournamentStatusText,
  isTournamentActive,
  getTournamentProgress
} from '../../utils/tournamentInfo';

const TournamentHeader: React.FC<TournamentHeaderProps> = React.memo(({
  tournamentInfo,
  currentDate = new Date(),
  showStatus = true,
  onTournamentPress
}) => {
  const styles = getStyles();
  const isActive = isTournamentActive(tournamentInfo, currentDate);
  const progress = getTournamentProgress(tournamentInfo, currentDate);
  const statusText = getTournamentStatusText(tournamentInfo.status);

  const renderStatusIndicator = () => {
    if (!showStatus) return null;

    const getStatusColor = () => {
      switch (tournamentInfo.status) {
        case 'active':
          return designTokens.colors.statusColors.current;
        case 'upcoming':
          return designTokens.colors.statusColors.upcoming;
        case 'completed':
          return designTokens.colors.statusColors.completed;
        case 'cancelled':
          return designTokens.colors.error;
        default:
          return designTokens.colors.textSecondary;
      }
    };

    const getStatusIcon = () => {
      switch (tournamentInfo.status) {
        case 'active':
          return (
            <StatusIcons.Current
              width={18}
              height={18}
              fill={getStatusColor()}
            />
          );
        case 'upcoming':
          return (
            <StatusIcons.Upcoming
              width={18}
              height={18}
              fill={getStatusColor()}
            />
          );
        case 'completed':
          return (
            <StatusIcons.Completed
              width={18}
              height={18}
              fill={getStatusColor()}
            />
          );
        case 'cancelled':
          return (
            <StatusIcons.Cancelled
              width={18}
              height={18}
              fill={getStatusColor()}
            />
          );
        default:
          return null;
      }
    };

    return (
      <View style={styles.statusContainer}>
        {getStatusIcon()}
        <Text style={[styles.statusText, { color: getStatusColor() }]}>
          {statusText}
        </Text>
        {isActive && progress > 0 && (
          <View style={styles.progressContainer}>
            <View style={styles.progressBar}>
              <View 
                style={[
                  styles.progressFill, 
                  { width: `${progress}%` }
                ]} 
              />
            </View>
            <Text style={styles.progressText}>{progress}%</Text>
          </View>
        )}
      </View>
    );
  };

  const renderTournamentType = () => {
    return (
      <View style={styles.typeContainer}>
        <View style={[
          styles.typeBadge,
          tournamentInfo.type === 'beach' ? styles.typeBadgeBeach : styles.typeBadgeIndoor
        ]}>
          <Text style={styles.typeText}>
            {tournamentInfo.type.toUpperCase()}
          </Text>
        </View>
      </View>
    );
  };

  const CardWrapper = onTournamentPress ? TouchableOpacity : View;

  return (
    <CardWrapper
      style={styles.container}
      onPress={onTournamentPress}
      testID="tournament-header"
      accessible={true}
      accessibilityLabel={`${tournamentInfo.name} tournament header`}
      accessibilityHint={onTournamentPress ? 'Tap for tournament details' : undefined}
    >
      {/* Tournament Name and Type */}
      <View style={styles.titleRow}>
        <Text style={styles.tournamentName} numberOfLines={2}>
          {tournamentInfo.name}
        </Text>
        {renderTournamentType()}
      </View>

      {/* Location and Venue */}
      <View style={styles.locationRow}>
        <DataIcons.Location
          width={16}
          height={16}
          fill={designTokens.colors.textSecondary}
        />
        <View style={styles.locationTextContainer}>
          <Text style={styles.locationText} numberOfLines={1}>
            {tournamentInfo.location}
          </Text>
          <Text style={styles.venueText} numberOfLines={1}>
            {tournamentInfo.venue}
          </Text>
        </View>
      </View>

      {/* Date Range */}
      <View style={styles.dateRow}>
        <DataIcons.Time
          width={16}
          height={16}
          fill={designTokens.colors.textSecondary}
        />
        <Text style={styles.dateText}>
          {formatTournamentDateRange(
            tournamentInfo.startDate, 
            tournamentInfo.endDate, 
            tournamentInfo.timezone
          )}
        </Text>
        {tournamentInfo.timezone && (
          <Text style={styles.timezoneText}>
            ({tournamentInfo.timezone.split('/')[1]})
          </Text>
        )}
      </View>

      {/* Tournament Organizer */}
      <View style={styles.organizerRow}>
        <DataIcons.Organization
          width={16}
          height={16}
          fill={designTokens.colors.textSecondary}
        />
        <Text style={styles.organizerText}>
          Organized by {tournamentInfo.organizerName}
        </Text>
      </View>

      {/* Status Indicator */}
      {renderStatusIndicator()}

      {/* Director Quick Info */}
      <View style={styles.directorRow}>
        <DataIcons.Person
          width={16}
          height={16}
          fill={designTokens.colors.textSecondary}
        />
        <View style={styles.directorInfo}>
          <Text style={styles.directorName}>
            {tournamentInfo.director.name}
          </Text>
          <Text style={styles.directorRole}>
            {tournamentInfo.director.role}
          </Text>
        </View>
      </View>
    </CardWrapper>
  );
});

const getStyles = (): StyleSheet.NamedStyles<any> => {
  return StyleSheet.create({
    container: {
      backgroundColor: designTokens.colors.surfacePrimary,
      borderRadius: designTokens.spacing.borderRadius,
      padding: designTokens.spacing.large,
      marginHorizontal: designTokens.spacing.medium,
      marginVertical: designTokens.spacing.small,
      boxShadow: `0px 2px 4px rgba(0, 0, 0, 0.15)`,
      elevation: 3,
      borderLeftWidth: 4,
      borderLeftColor: designTokens.colors.primary,
    },
    titleRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      marginBottom: designTokens.spacing.medium,
    },
    tournamentName: {
      ...designTokens.typography.h2,
      fontWeight: '700',
      color: designTokens.colors.textPrimary,
      flex: 1,
      marginRight: designTokens.spacing.small,
      lineHeight: designTokens.typography.h2.lineHeight * 0.95,
    },
    typeContainer: {
      alignItems: 'flex-end',
    },
    typeBadge: {
      paddingHorizontal: designTokens.spacing.small,
      paddingVertical: 4,
      borderRadius: 6,
      minWidth: 60,
      alignItems: 'center',
    },
    typeBadgeBeach: {
      backgroundColor: designTokens.colors.accent + '20',
      borderWidth: 1,
      borderColor: designTokens.colors.accent,
    },
    typeBadgeIndoor: {
      backgroundColor: designTokens.colors.secondary + '20',
      borderWidth: 1,
      borderColor: designTokens.colors.secondary,
    },
    typeText: {
      ...designTokens.typography.caption,
      fontWeight: '700',
      color: designTokens.colors.textPrimary,
      fontSize: 11,
    },
    locationRow: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: designTokens.spacing.small,
    },
    locationTextContainer: {
      marginLeft: designTokens.spacing.small,
      flex: 1,
    },
    locationText: {
      ...designTokens.typography.body,
      fontWeight: '600',
      color: designTokens.colors.textPrimary,
    },
    venueText: {
      ...designTokens.typography.bodySmall,
      color: designTokens.colors.textSecondary,
      marginTop: 2,
    },
    dateRow: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: designTokens.spacing.small,
    },
    dateText: {
      ...designTokens.typography.body,
      color: designTokens.colors.textSecondary,
      marginLeft: designTokens.spacing.small,
      flex: 1,
    },
    timezoneText: {
      ...designTokens.typography.caption,
      color: designTokens.colors.textSecondary,
      marginLeft: designTokens.spacing.small,
    },
    organizerRow: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: designTokens.spacing.small,
    },
    organizerText: {
      ...designTokens.typography.bodySmall,
      color: designTokens.colors.textSecondary,
      marginLeft: designTokens.spacing.small,
    },
    statusContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      marginVertical: designTokens.spacing.small,
      paddingVertical: designTokens.spacing.small,
      paddingHorizontal: designTokens.spacing.medium,
      backgroundColor: designTokens.colors.surfaceSecondary,
      borderRadius: designTokens.spacing.borderRadius,
    },
    statusText: {
      ...designTokens.typography.body,
      fontWeight: '600',
      marginLeft: designTokens.spacing.small,
    },
    progressContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      marginLeft: designTokens.spacing.medium,
      flex: 1,
    },
    progressBar: {
      flex: 1,
      height: 4,
      backgroundColor: designTokens.colors.border,
      borderRadius: 2,
      marginRight: designTokens.spacing.small,
    },
    progressFill: {
      height: '100%',
      backgroundColor: designTokens.colors.statusColors.current,
      borderRadius: 2,
    },
    progressText: {
      ...designTokens.typography.caption,
      fontWeight: '600',
      color: designTokens.colors.statusColors.current,
      minWidth: 32,
    },
    directorRow: {
      flexDirection: 'row',
      alignItems: 'center',
      marginTop: designTokens.spacing.small,
      paddingTop: designTokens.spacing.small,
      borderTopWidth: 1,
      borderTopColor: designTokens.colors.border,
    },
    directorInfo: {
      marginLeft: designTokens.spacing.small,
    },
    directorName: {
      ...designTokens.typography.bodySmall,
      fontWeight: '600',
      color: designTokens.colors.textPrimary,
    },
    directorRole: {
      ...designTokens.typography.caption,
      color: designTokens.colors.textSecondary,
      marginTop: 1,
    },
  });
};

TournamentHeader.displayName = 'TournamentHeader';

export default TournamentHeader;