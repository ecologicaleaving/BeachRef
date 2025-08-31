/**
 * ServingIndicator Component - Serving team and player indicators
 * Part of EPIC-001 Live Score Display - Story 1.2
 * 
 * A component that displays which team and player is currently serving,
 * with visual highlights and team positioning information.
 */

import React from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import { Text } from '../Typography/Text';
import { colors, spacing, typography } from '../../theme/tokens';
import { BeachLiveTeam, BeachLivePlayer } from '../../types/beach-live';

export interface ServingIndicatorProps {
  /** Number of the serving team (1 or 2) */
  servingTeam: number;
  /** Number of the serving player */
  servingPlayer: number;
  /** Team data array [teamA, teamB] */
  teams: [
    BeachLiveTeam | { name: string; federationCode: string; players?: BeachLivePlayer[] },
    BeachLiveTeam | { name: string; federationCode: string; players?: BeachLivePlayer[] }
  ];
  /** Team positioning: which team is on left vs right */
  teamPositions?: { teamAtLeft: number; teamAtRight: number };
  /** Use compact layout for smaller spaces */
  compact?: boolean;
  /** Additional container styles */
  style?: ViewStyle;
  /** Test ID for testing */
  testID?: string;
}

/**
 * ServingIndicator component that shows serving information
 * Provides visual distinction between serving and receiving teams
 * Shows serving player information when available
 * Handles team positioning indicators (left/right of scorer table)
 */
export const ServingIndicator: React.FC<ServingIndicatorProps> = React.memo(({
  servingTeam,
  servingPlayer,
  teams,
  teamPositions,
  compact = false,
  style,
  testID,
}) => {
  // Get serving team data
  const servingTeamData = servingTeam === 1 ? teams[0] : teams[1];
  const receivingTeamData = servingTeam === 1 ? teams[1] : teams[0];

  // Get serving player information
  const getServingPlayerInfo = (): {
    playerName?: string;
    playerNumber?: number;
    position?: string;
  } => {
    if (!servingTeamData || !('players' in servingTeamData) || !servingTeamData.players) {
      return {};
    }

    const player = servingTeamData.players.find(p => p.no === servingPlayer);
    if (!player) {
      return { playerNumber: servingPlayer };
    }

    return {
      playerName: player.name,
      playerNumber: player.no,
      position: player.position,
    };
  };

  const servingPlayerInfo = getServingPlayerInfo();

  // Get team positioning information
  const getTeamPositioning = (): {
    servingTeamPosition?: 'left' | 'right';
    receivingTeamPosition?: 'left' | 'right';
  } => {
    if (!teamPositions) return {};

    const servingTeamPosition = teamPositions.teamAtLeft === servingTeam ? 'left' : 'right';
    const receivingTeamPosition = servingTeamPosition === 'left' ? 'right' : 'left';

    return { servingTeamPosition, receivingTeamPosition };
  };

  const positioning = getTeamPositioning();

  // Handle no serving information
  if (!servingTeam || !servingTeamData) {
    return (
      <View style={[styles.container, styles.noDataContainer, compact && styles.compactContainer, style]} testID={testID}>
        <Text style={[styles.noDataText, compact && styles.compactNoDataText]}>
          No serving information
        </Text>
      </View>
    );
  }

  return (
    <View 
      style={[styles.container, compact && styles.compactContainer, style]} 
      testID={testID}
      accessibilityLabel={`${servingTeamData.name} serving${servingPlayerInfo.playerName ? `, player ${servingPlayerInfo.playerName}` : servingPlayerInfo.playerNumber ? `, player ${servingPlayerInfo.playerNumber}` : ''}`}
    >
      {/* Serving team section */}
      <View style={styles.servingSection}>
        <View style={styles.servingHeader}>
          <View style={styles.servingIndicator}>
            <View style={styles.servingDot} />
            <Text style={[styles.servingLabel, compact && styles.compactServingLabel]}>
              SERVING
            </Text>
          </View>
          
          {positioning.servingTeamPosition && !compact && (
            <View style={styles.positionIndicator}>
              <Text style={styles.positionText}>
                {positioning.servingTeamPosition.toUpperCase()}
              </Text>
            </View>
          )}
        </View>

        <View style={styles.teamInfo}>
          <Text 
            style={[styles.servingTeamName, compact && styles.compactServingTeamName]}
            numberOfLines={1}
          >
            {servingTeamData.name}
          </Text>
          
          {/* Serving player information */}
          {(servingPlayerInfo.playerName || servingPlayerInfo.playerNumber) && (
            <View style={styles.playerInfo}>
              {servingPlayerInfo.playerName ? (
                <Text style={[styles.playerName, compact && styles.compactPlayerName]}>
                  #{servingPlayerInfo.playerNumber} {servingPlayerInfo.playerName}
                </Text>
              ) : (
                <Text style={[styles.playerNumber, compact && styles.compactPlayerNumber]}>
                  Player #{servingPlayerInfo.playerNumber}
                </Text>
              )}
              
              {servingPlayerInfo.position && !compact && (
                <Text style={styles.playerPosition}>
                  ({servingPlayerInfo.position})
                </Text>
              )}
            </View>
          )}
        </View>
      </View>

      {/* Divider */}
      <View style={styles.divider} />

      {/* Receiving team section */}
      <View style={styles.receivingSection}>
        <View style={styles.receivingHeader}>
          <Text style={[styles.receivingLabel, compact && styles.compactReceivingLabel]}>
            RECEIVING
          </Text>
          
          {positioning.receivingTeamPosition && !compact && (
            <View style={[styles.positionIndicator, styles.receivingPositionIndicator]}>
              <Text style={[styles.positionText, styles.receivingPositionText]}>
                {positioning.receivingTeamPosition.toUpperCase()}
              </Text>
            </View>
          )}
        </View>

        <Text 
          style={[styles.receivingTeamName, compact && styles.compactReceivingTeamName]}
          numberOfLines={1}
        >
          {receivingTeamData.name}
        </Text>
      </View>
    </View>
  );
}, (prevProps, nextProps) => {
  // Custom comparison for performance optimization
  // Only re-render if serving information has changed
  return (
    prevProps.servingTeam === nextProps.servingTeam &&
    prevProps.servingPlayer === nextProps.servingPlayer &&
    prevProps.compact === nextProps.compact &&
    prevProps.teamPositions?.teamAtLeft === nextProps.teamPositions?.teamAtLeft &&
    prevProps.teamPositions?.teamAtRight === nextProps.teamPositions?.teamAtRight &&
    prevProps.teams[0] === nextProps.teams[0] &&
    prevProps.teams[1] === nextProps.teams[1]
  );
});

ServingIndicator.displayName = 'ServingIndicator';

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background,
    borderRadius: 8,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.textSecondary + '30',
  },
  compactContainer: {
    padding: spacing.sm,
    borderRadius: 6,
  },
  noDataContainer: {
    justifyContent: 'center',
    opacity: 0.7,
  },
  servingSection: {
    flex: 1,
    alignItems: 'flex-start',
  },
  servingHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    marginBottom: spacing.xs,
  },
  servingIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  servingDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.success,
    shadowColor: colors.success,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 3,
    elevation: 3,
  },
  servingLabel: {
    fontSize: typography.caption.fontSize,
    fontWeight: 'bold',
    color: colors.success,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  compactServingLabel: {
    fontSize: 10,
  },
  positionIndicator: {
    paddingHorizontal: spacing.xs,
    paddingVertical: 2,
    backgroundColor: colors.primary + '20',
    borderRadius: 4,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  receivingPositionIndicator: {
    backgroundColor: colors.textSecondary + '20',
    borderColor: colors.textSecondary,
  },
  positionText: {
    fontSize: 10,
    fontWeight: '600',
    color: colors.primary,
  },
  receivingPositionText: {
    color: colors.textSecondary,
  },
  teamInfo: {
    width: '100%',
  },
  servingTeamName: {
    fontSize: typography.body.fontSize,
    fontWeight: 'bold',
    color: colors.success,
    marginBottom: spacing.xs,
  },
  compactServingTeamName: {
    fontSize: typography.caption.fontSize + 1,
    marginBottom: spacing.xs / 2,
  },
  playerInfo: {
    gap: spacing.xs / 2,
  },
  playerName: {
    fontSize: typography.caption.fontSize,
    color: colors.textPrimary,
    fontWeight: '600',
  },
  compactPlayerName: {
    fontSize: 10,
  },
  playerNumber: {
    fontSize: typography.caption.fontSize,
    color: colors.textPrimary,
    fontWeight: '500',
  },
  compactPlayerNumber: {
    fontSize: 10,
  },
  playerPosition: {
    fontSize: typography.caption.fontSize - 1,
    color: colors.textSecondary,
    fontStyle: 'italic',
  },
  divider: {
    width: 2,
    height: '80%',
    backgroundColor: colors.textSecondary + '40',
    marginHorizontal: spacing.md,
  },
  receivingSection: {
    flex: 1,
    alignItems: 'flex-end',
  },
  receivingHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    marginBottom: spacing.xs,
  },
  receivingLabel: {
    fontSize: typography.caption.fontSize,
    fontWeight: '600',
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  compactReceivingLabel: {
    fontSize: 10,
  },
  receivingTeamName: {
    fontSize: typography.body.fontSize,
    fontWeight: '500',
    color: colors.textSecondary,
    textAlign: 'right',
  },
  compactReceivingTeamName: {
    fontSize: typography.caption.fontSize + 1,
  },
  noDataText: {
    fontSize: typography.body.fontSize,
    color: colors.textSecondary,
    textAlign: 'center',
    fontStyle: 'italic',
  },
  compactNoDataText: {
    fontSize: typography.caption.fontSize,
  },
});

export default ServingIndicator;