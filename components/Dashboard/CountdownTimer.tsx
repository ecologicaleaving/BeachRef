import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { designTokens } from '../../theme/tokens';

interface CountdownTimerProps {
  targetTime: string;
  size?: 'small' | 'medium' | 'large';
  urgentThreshold?: number;
  immediateThreshold?: number;
  showProgress?: boolean;
  showSeconds?: boolean;
  onUrgent?: () => void;
  onImmediate?: () => void;
}

export const CountdownTimer: React.FC<CountdownTimerProps> = ({
  targetTime,
  size = 'medium',
  urgentThreshold = 15,
  immediateThreshold = 5,
  showProgress = false,
  showSeconds = true,
  onUrgent,
  onImmediate,
}) => {
  const [timeRemaining, setTimeRemaining] = useState({
    hours: 0,
    minutes: 0,
    seconds: 0,
    totalMinutes: 0,
    isOverdue: false,
  });

  const [urgencyLevel, setUrgencyLevel] = useState<'normal' | 'urgent' | 'immediate' | 'overdue'>('normal');

  useEffect(() => {
    const updateTimer = () => {
      const now = new Date();
      const target = new Date(targetTime);
      const diffMs = target.getTime() - now.getTime();
      
      if (diffMs <= 0) {
        const overdueMs = Math.abs(diffMs);
        const overdueMins = Math.floor(overdueMs / (1000 * 60));
        const overdueSecs = Math.floor((overdueMs % (1000 * 60)) / 1000);
        
        setTimeRemaining({
          hours: 0,
          minutes: overdueMins,
          seconds: overdueSecs,
          totalMinutes: -overdueMins,
          isOverdue: true,
        });
        
        setUrgencyLevel('overdue');
        return;
      }

      const hours = Math.floor(diffMs / (1000 * 60 * 60));
      const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diffMs % (1000 * 60)) / 1000);
      const totalMinutes = Math.floor(diffMs / (1000 * 60));

      setTimeRemaining({
        hours,
        minutes,
        seconds,
        totalMinutes,
        isOverdue: false,
      });

      if (totalMinutes <= immediateThreshold) {
        if (urgencyLevel !== 'immediate') {
          setUrgencyLevel('immediate');
          onImmediate?.();
        }
      } else if (totalMinutes <= urgentThreshold) {
        if (urgencyLevel !== 'urgent') {
          setUrgencyLevel('urgent');
          onUrgent?.();
        }
      } else {
        setUrgencyLevel('normal');
      }
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [targetTime, urgentThreshold, immediateThreshold, urgencyLevel, onUrgent, onImmediate]);

  const formatTime = () => {
    const { hours, minutes, seconds, isOverdue } = timeRemaining;
    
    if (isOverdue) {
      return showSeconds 
        ? `OVERDUE: ${minutes}:${seconds.toString().padStart(2, '0')}`
        : `OVERDUE: ${minutes}m`;
    }

    if (hours > 0) {
      return showSeconds
        ? `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
        : `${hours}h ${minutes}m`;
    }

    return showSeconds
      ? `${minutes}:${seconds.toString().padStart(2, '0')}`
      : `${minutes}m`;
  };

  const getUrgencyColor = () => {
    switch (urgencyLevel) {
      case 'immediate':
      case 'overdue':
        return designTokens.colors.error;
      case 'urgent':
        return designTokens.colors.warning;
      default:
        return designTokens.colors.primary;
    }
  };

  return (
    <View style={[styles.container, styles[size]]}>
      <Text style={[styles.timerText, { color: getUrgencyColor() }]}>
        {formatTime()}
      </Text>
      {urgencyLevel !== 'normal' && (
        <View style={[styles.urgencyIndicator, { backgroundColor: getUrgencyColor() }]}>
          <Text style={styles.urgencyText}>
            {urgencyLevel === 'overdue' ? 'OVERDUE' : 
             urgencyLevel === 'immediate' ? 'NOW' : 'SOON'}
          </Text>
        </View>
      )}
      <Text style={styles.contextText}>
        {timeRemaining.isOverdue ? 'Match should have started' : 'Until match start'}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    borderRadius: 12,
    position: 'relative',
    overflow: 'hidden',
  },
  small: {
    padding: designTokens.spacing.sm,
    minWidth: 80,
  },
  medium: {
    padding: designTokens.spacing.md,
    minWidth: 120,
  },
  large: {
    padding: designTokens.spacing.lg,
    minWidth: 160,
  },
  timerText: {
    textAlign: 'center',
    fontWeight: 'bold',
    letterSpacing: 0.5,
    fontSize: 24,
  },
  urgencyIndicator: {
    position: 'absolute',
    top: -2,
    right: -2,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  urgencyText: {
    color: designTokens.colors.background,
    fontSize: 10,
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },
  contextText: {
    textAlign: 'center',
    marginTop: designTokens.spacing.xs,
    opacity: 0.8,
    fontSize: 14,
    color: designTokens.colors.textSecondary,
  },
});
