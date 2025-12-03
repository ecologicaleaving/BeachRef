import React, { useMemo } from 'react';
import { View, Text, StyleSheet, Animated, useEffect } from 'react-native';
import { BeachMatch } from '../types/match';
import { designTokens, colors, statusColors } from '../theme/tokens';

interface LiveMatchIndicatorProps {
  match: BeachMatch;
  isLive: boolean;
  showScore?: boolean;
}

const LiveMatchIndicator: React.FC<LiveMatchIndicatorProps> = ({
  match,
  isLive,
  showScore = true,
}) => {
  const pulseAnimation = useMemo(() => new Animated.Value(1), []);

  useEffect(() => {
    if (isLive) {
      const pulse = () => {
        Animated.sequence([
          Animated.timing(pulseAnimation, {
            toValue: 0.7,
            duration: 800,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnimation, {
            toValue: 1,
            duration: 800,
            useNativeDriver: true,
          }),
        ]).start(() => pulse());
      };
      pulse();
    }
  }, [isLive, pulseAnimation]);

  const getStatusInfo = () => {
    const status = match.Status?.toLowerCase();
    
    if (isLive) {
      return {
        color: colors.error,
        text: 'LIVE',
        backgroundColor: '#FFEBEE',
        borderColor: colors.error,
        shouldPulse: true,
      };
    }

    switch (status) {
      case 'finished':
      case 'completed':
        return {
          color: colors.success,
          text: 'FIN',
          backgroundColor: '#E8F5E8',
          borderColor: colors.success,
          shouldPulse: false,
        };
      case 'scheduled':
      case 'upcoming':
        return {
          color: '#2196F3',
          text: 'SCH',
          backgroundColor: '#E3F2FD',
          borderColor: '#2196F3',
          shouldPulse: false,
        };
      case 'inprogress':
      case 'running':
        return {
          color: colors.warning,
          text: 'PLAY',
          backgroundColor: '#FFF3E0',
          borderColor: colors.warning,
          shouldPulse: true,
        };
      default:
        return {
          color: '#9E9E9E',
          text: status?.toUpperCase().slice(0, 4) || 'TBD',
          backgroundColor: '#F5F5F5',
          borderColor: '#9E9E9E',
          shouldPulse: false,
        };
    }
  };

  const statusInfo = getStatusInfo();

  return (
    <View style={styles.container}>
      <Animated.View
        style={[
          styles.indicator,
          {
            backgroundColor: statusInfo.backgroundColor,
            borderColor: statusInfo.borderColor,
            transform: statusInfo.shouldPulse 
              ? [{ scale: pulseAnimation }] 
              : [{ scale: 1 }],
          },
        ]}
      >
        <Text style={[styles.statusText, { color: statusInfo.color }]}>
          {statusInfo.text}
        </Text>
      </Animated.View>
      
      {showScore && (isLive || match.Status?.toLowerCase() === 'finished') && (
        <View style={styles.scoreContainer}>
          <Text style={styles.scoreText}>
            {match.PointsA || 0} - {match.PointsB || 0}
          </Text>
          {isLive && (
            <Text style={styles.liveScoreLabel}>Live Score</Text>
          )}
        </View>
      )}
    </View>
  );
};

/**
 * Simple badge version for use in lists
 */
export const LiveBadge: React.FC<{ isLive: boolean; status?: string }> = ({ 
  isLive, 
  status 
}) => {
  if (!isLive && status?.toLowerCase() !== 'inprogress' && status?.toLowerCase() !== 'running') {
    return null;
  }

  return (
    <View style={[styles.badge, isLive ? styles.liveBadge : styles.playingBadge]}>
      <Text style={[styles.badgeText, isLive ? styles.liveBadgeText : styles.playingBadgeText]}>
        {isLive ? 'LIVE' : 'PLAY'}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  indicator: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 40,
  },
  statusText: {
    fontSize: 10,
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },
  scoreContainer: {
    alignItems: 'flex-start',
  },
  scoreText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
  },
  liveScoreLabel: {
    fontSize: 10,
    color: colors.error,
    fontWeight: '600',
  },
  badge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: {
    fontSize: 8,
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },
  liveBadge: {
    backgroundColor: colors.error,
  },
  liveBadgeText: {
    color: '#FFFFFF',
  },
  playingBadge: {
    backgroundColor: colors.warning,
  },
  playingBadgeText: {
    color: '#FFFFFF',
  },
});

export default LiveMatchIndicator;