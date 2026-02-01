/**
 * ProfessionalStatusBadge Component
 * Story 2.4: Professional Status Indicator System
 * 
 * Enhanced inline status badge for professional referee workflow
 * Extends Story 1.4 StatusBadge with new professional features
 */

import React from 'react';
import { View} from 'react-native';
import { StatusBadgeProps } from '../../types/status';
import { StatusIndicator } from './StatusIndicator';

export const ProfessionalStatusBadge = React.memo<StatusBadgeProps>(({
  type,
  size = 'small',
  compact = false,
  position = 'top-right',
  animated = false, // Badges typically don't animate to avoid distraction
  accessibilityPattern = 'none',
  showIcon = true,
  showText = !compact, // Hide text in compact mode for space efficiency
  onPress,
  disabled = false,
  accessibilityLabel,
  accessibilityHint,
  testID = 'professional-status-badge',
  style,
  ...rest
}) => {
  const badgePositionStyle = React.useMemo(() => {
    const baseStyle = {
      position: 'absolute' as const,
      zIndex: 10,
    };
    
    const offset = size === 'small' ? -2 : size === 'medium' ? -4 : -6;
    
    // Position the badge relative to parent container
    switch (position) {
      case 'top-right':
        return { ...baseStyle, top: offset, right: offset };
      case 'top-left':
        return { ...baseStyle, top: offset, left: offset };
      case 'bottom-right':
        return { ...baseStyle, bottom: offset, right: offset };
      case 'bottom-left':
        return { ...baseStyle, bottom: offset, left: offset };
      default:
        return { ...baseStyle, top: offset, right: offset };
    }
  }, [position, size]);
  
  const badgeConfig = React.useMemo(() => ({
    type,
    size: compact ? 'small' : size,
    variant: 'badge' as const,
    animated,
    accessibilityPattern,
    showIcon: compact ? true : showIcon, // Always show icon in compact mode for recognition
    showText: compact ? false : showText, // Never show text in compact mode for space
    onPress,
    disabled,
    accessibilityLabel: accessibilityLabel || `${type} status badge`,
    accessibilityHint,
    testID,
    ...rest,
  }), [
    type, size, compact, animated, accessibilityPattern, 
    showIcon, showText, onPress, disabled, 
    accessibilityLabel, accessibilityHint, testID, rest
  ]);
  
  return (
    <View style={[badgePositionStyle, style]}>
      <StatusIndicator {...badgeConfig} />
    </View>
  );
});

ProfessionalStatusBadge.displayName = 'ProfessionalStatusBadge';

export default ProfessionalStatusBadge;