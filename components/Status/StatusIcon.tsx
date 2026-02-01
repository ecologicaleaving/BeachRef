/**
 * StatusIcon Component
 * Story 1.4: Status-Driven Color Coding System
 * 
 * An icon component that displays status with semantic color mapping
 * Provides accessibility through multiple visual indicators
 */

import React from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import { Text } from '../Typography';
import { 
  getStatusColor, 
  TournamentStatus, 
  statusColorThemes 
} from '../../utils/statusColors';


export interface StatusIconProps {
  status: TournamentStatus;
  size?: 'small' | 'medium' | 'large' | 'extra-large';
  variant?: 'filled' | 'outlined' | 'minimal';
  customIcon?: string;
  showBackground?: boolean;
  style?: ViewStyle;
  accessibilityLabel?: string;
}

const STATUS_ICONS: Record<TournamentStatus, string> = {
  current: '●', // Solid circle - high visibility
  upcoming: '◐', // Half circle - pending state
  completed: '✓', // Checkmark - success state
  cancelled: '✕', // X mark - cancelled state
  emergency: '⚠', // Warning triangle - urgent state
};

const ALTERNATIVE_ICONS: Record<TournamentStatus, string> = {
  current: '▲', // Triangle for current
  upcoming: '◆', // Diamond for upcoming
  completed: '■', // Square for completed
  cancelled: '●', // Solid circle for cancelled
  emergency: '★', // Star for emergency
};

const SIZE_CONFIG = {
  small: {
    iconSize: 12,
    containerSize: 16,
    backgroundSize: 20,
  },
  medium: {
    iconSize: 16,
    containerSize: 20,
    backgroundSize: 24,
  },
  large: {
    iconSize: 20,
    containerSize: 24,
    backgroundSize: 28,
  },
  'extra-large': {
    iconSize: 24,
    containerSize: 28,
    backgroundSize: 32,
  },
} as const;

export const StatusIcon: React.FC<StatusIconProps> = React.memo(({
  status,
  size = 'medium',
  variant = 'filled',
  customIcon,
  showBackground = false,
  style,
  accessibilityLabel,
}) => {
  const statusColor = getStatusColor(status);
  const indicatorConfig = statusColorThemes.indicator[status];
  const sizeConfig = SIZE_CONFIG[size];
  
  // Use custom icon or default based on variant
  const getIcon = (): string => {
    if (customIcon) return customIcon;
    
    return variant === 'minimal' 
      ? ALTERNATIVE_ICONS[status]
      : STATUS_ICONS[status];
  };

  const getVariantStyles = (): ViewStyle => {
    const baseSize = showBackground ? sizeConfig.backgroundSize : sizeConfig.containerSize;
    
    switch (variant) {
      case 'filled':
        return {
          width: baseSize,
          height: baseSize,
          backgroundColor: showBackground ? statusColor : 'transparent',
          borderRadius: baseSize / 2,
        };
      case 'outlined':
        return {
          width: baseSize,
          height: baseSize,
          backgroundColor: 'transparent',
          borderWidth: 2,
          borderColor: statusColor,
          borderRadius: baseSize / 2,
        };
      case 'minimal':
        return {
          width: sizeConfig.containerSize,
          height: sizeConfig.containerSize,
          backgroundColor: 'transparent',
        };
      default:
        return {};
    }
  };

  const getIconColor = (): string => {
    if (variant === 'filled' && showBackground) {
      // Use white text on colored background
      return '#FFFFFF';
    }
    return statusColor;
  };

  const iconAccessibilityLabel = accessibilityLabel || `${status} status indicator`;

  return (
    <View 
      style={[styles.container, getVariantStyles(), style]}
      accessible={true}
      accessibilityLabel={iconAccessibilityLabel}
      accessibilityRole="image"
    >
      <Text 
        style={[
          styles.icon,
          {
            fontSize: sizeConfig.iconSize,
            color: getIconColor(),
          }
        ]}
      >
        {getIcon()}
      </Text>
    </View>
  );
});

StatusIcon.displayName = 'StatusIcon';

// Utility component for multiple status indicators (for color-blind accessibility)
export interface MultiStatusIconProps {
  status: TournamentStatus;
  size?: 'small' | 'medium' | 'large';
  style?: ViewStyle;
}

export const MultiStatusIcon: React.FC<MultiStatusIconProps> = React.memo(({
  status,
  size = 'medium',
  style,
}) => {
  return (
    <View style={[styles.multiContainer, style]}>
      <StatusIcon 
        status={status} 
        size={size} 
        variant="filled" 
        showBackground 
      />
      <StatusIcon 
        status={status} 
        size="small" 
        variant="minimal" 
        style={styles.alternativeIcon}
      />
    </View>
  );
});

MultiStatusIcon.displayName = 'MultiStatusIcon';

const styles = StyleSheet.create({
  container: {
    justifyContent: 'center',
    alignItems: 'center',
    minWidth: 44, // Minimum touch target for accessibility
    minHeight: 44,
  },
  icon: {
    textAlign: 'center',
    fontWeight: 'bold',
  },
  multiContainer: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  alternativeIcon: {
    position: 'absolute',
    top: -2,
    right: -2,
    minWidth: 16,
    minHeight: 16,
  },
});

export default StatusIcon;