/**
 * StatusIcon Component
 * Story 1.5: Outdoor-Optimized Iconography
 * 
 * Specialized icon component for tournament status indicators
 * Integrates with Story 1.4 status color system
 */

import React from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import { Icon, IconProps } from './Icon';
import { TournamentStatus } from '../../utils/statusColors';
import { IconSize, IconVariant } from '../../utils/icons';
import { colors } from '../../theme/tokens';

export interface StatusIconProps extends Omit<IconProps, 'category' | 'name' | 'theme' | 'colorKey'> {
  status: TournamentStatus;
  size?: IconSize;
  variant?: IconVariant;
  showBackground?: boolean;
  isInteractive?: boolean;
  style?: ViewStyle;
}

// Status to icon mapping for consistency with StatusBadge
const STATUS_ICON_MAP: Record<TournamentStatus, string> = {
  current: 'current',      // play-circle icon
  upcoming: 'upcoming',    // clock icon  
  completed: 'completed',  // checkmark-circle icon
  cancelled: 'cancelled',  // close-circle icon
  emergency: 'emergency',  // warning icon
};

export const StatusIcon: React.FC<StatusIconProps> = React.memo(({
  status,
  size = 'medium',
  variant = 'outlined',
  showBackground = false,
  isInteractive = false,
  style,
  ...restProps
}) => {
  const isEmergency = status === 'emergency';
  const iconName = STATUS_ICON_MAP[status];

  const containerStyle: ViewStyle[] = [
    styles.container,
    showBackground && styles.backgroundContainer,
    showBackground && getBackgroundStyle(status),
    style,
  ];

  return (
    <View style={containerStyle}>
      <Icon
        category="status"
        name={iconName}
        size={size}
        variant={variant}
        theme="status"
        colorKey={status}
        isInteractive={isInteractive}
        isEmergency={isEmergency}
        accessibilityLabel={`${status} status`}
        accessibilityHint={`Tournament or match is ${status}`}
        {...restProps}
      />
    </View>
  );
});

StatusIcon.displayName = 'StatusIcon';

/**
 * Get background styling for status icons
 */
function getBackgroundStyle(status: TournamentStatus): ViewStyle {
  const backgroundOpacity = status === 'emergency' ? 0.15 : 0.1;
  
  // This would use the actual status colors from the design system
  const backgroundColors: Record<TournamentStatus, string> = {
    current: `${colors.textPrimary}${Math.round(backgroundOpacity * 255).toString(16).padStart(2, '0')}`,
    upcoming: `${colors.secondary}${Math.round(backgroundOpacity * 255).toString(16).padStart(2, '0')}`,
    completed: `${colors.success}${Math.round(backgroundOpacity * 255).toString(16).padStart(2, '0')}`,
    cancelled: `${colors.primary}${Math.round(backgroundOpacity * 255).toString(16).padStart(2, '0')}`,
    emergency: `${colors.error}${Math.round(backgroundOpacity * 255).toString(16).padStart(2, '0')}`,
  };

  return {
    backgroundColor: backgroundColors[status],
    borderRadius: 20,
    padding: 8,
  };
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  backgroundContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default StatusIcon;