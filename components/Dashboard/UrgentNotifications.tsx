import React from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { designTokens } from '../../theme/tokens';
import { Assignment } from '../../types/assignments';

interface UrgentNotificationsProps {
  level: 'immediate' | 'urgent' | 'normal';
  message: string;
  assignment?: Assignment;
}

export const UrgentNotifications: React.FC<UrgentNotificationsProps> = ({
  level,
  message,
  assignment,
}) => {
  const pulseAnimation = React.useRef(new Animated.Value(1)).current;

  React.useEffect(() => {
    if (level === 'immediate') {
      const pulse = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnimation, {
            toValue: 1.1,
            duration: 500,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnimation, {
            toValue: 1,
            duration: 500,
            useNativeDriver: true,
          }),
        ])
      );
      pulse.start();
      return () => pulse.stop();
    }
  }, [level, pulseAnimation]);

  if (level === 'normal') return null;

  return (
    <Animated.View 
      style={[
        styles.container,
        styles[level],
        { transform: [{ scale: pulseAnimation }] }
      ]}
    >
      <Text style={styles.icon}>
        {level === 'immediate' ? '🚨' : '⚠️'}
      </Text>
      <Text style={[styles.message, styles[`${level}Text`]]}>
        {message}
      </Text>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: designTokens.spacing.md,
    paddingVertical: designTokens.spacing.sm,
    borderRadius: 8,
    marginBottom: designTokens.spacing.md,
  },
  immediate: {
    backgroundColor: designTokens.colors.error,
    borderWidth: 3,
    borderColor: designTokens.colors.background,
  },
  urgent: {
    backgroundColor: designTokens.colors.warning,
    borderWidth: 2,
    borderColor: designTokens.colors.background,
  },
  icon: {
    fontSize: 20,
    marginRight: designTokens.spacing.sm,
  },
  message: {
    fontWeight: 'bold',
    textAlign: 'center',
    letterSpacing: 0.5,
  },
  immediateText: {
    color: designTokens.colors.background,
    fontSize: 16,
  },
  urgentText: {
    color: designTokens.colors.background,
    fontSize: 14,
  },
});