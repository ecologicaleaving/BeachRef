/**
 * ProfessionalStatusIcon Component
 * Story 2.4: Professional Status Indicator System
 * 
 * Enhanced status icon with professional referee features
 */

import React from 'react';
import { View, StyleSheet, Animated } from 'react-native';
import { StatusIconProps } from '../../types/status';

import { 
  getStatusColor, 
  getStatusSize,
  getStatusIconName,
  shouldAnimateStatus,
  getStatusAnimationDuration,
} from '../../utils/statusIndicators';
import { StatusIcons } from '../Icons/IconLibrary';

export const ProfessionalStatusIcon = React.memo<StatusIconProps>(({
  status,
  size = 'medium',
  color,
  accessibilityPattern = 'none',
  animated = true,
  testID = 'professional-status-icon',
  style,
}) => {
  const animatedValue = React.useRef(new Animated.Value(1)).current;
  
  const statusColor = color || getStatusColor(status);
  const sizeValue = getStatusSize(size);
  const iconName = getStatusIconName(status);
  const shouldAnimate = animated && shouldAnimateStatus(status);
  const animationDuration = getStatusAnimationDuration(status);
  
  // Animation effect for specific statuses
  React.useEffect(() => {
    if (!shouldAnimate) return;
    
    const startAnimation = () => {
      Animated.sequence([
        Animated.timing(animatedValue, {
          toValue: 0.6,
          duration: animationDuration / 2,
          useNativeDriver: true,
        }),
        Animated.timing(animatedValue, {
          toValue: 1,
          duration: animationDuration / 2,
          useNativeDriver: true,
        }),
      ]).start(() => {
        // Continue pulsing for critical statuses
        if (['critical', 'in-progress', 'sync-pending'].includes(status)) {
          setTimeout(startAnimation, 200);
        }
      });
    };
    
    startAnimation();
  }, [shouldAnimate, status, animationDuration, animatedValue]);
  
  // Get the appropriate icon component
  const IconComponent = React.useMemo(() => {
    switch (status) {
      case 'current':
        return StatusIcons.Current;
      case 'upcoming':
        return StatusIcons.Upcoming;
      case 'completed':
        return StatusIcons.Completed;
      case 'cancelled':
        return StatusIcons.Cancelled;
      case 'critical':
      case 'warning':
      case 'action-required':
        return StatusIcons.Emergency;
      default:
        return StatusIcons.Current;
    }
  }, [status]);
  
  const iconSize = React.useMemo(() => {
    switch (size) {
      case 'small': return 16;
      case 'medium': return 20;
      case 'large': return 28;
      default: return 20;
    }
  }, [size]);
  
  // Render accessibility pattern overlay
  const renderAccessibilityPattern = () => {
    if (accessibilityPattern === 'none' || accessibilityPattern === 'icon') return null;
    
    const patternSize = sizeValue;
    const patternStyle = {
      position: 'absolute' as const,
      width: patternSize,
      height: patternSize,
      borderRadius: patternSize / 2,
      top: 0,
      left: 0,
    };
    
    switch (accessibilityPattern) {
      case 'dots':
        return (
          <View 
            style={[
              patternStyle, 
              {
                backgroundColor: 'transparent',
                borderWidth: 2,
                borderColor: statusColor,
                borderStyle: 'dotted',
              }
            ]} 
          />
        );
      case 'stripes':
        return (
          <View 
            style={[
              patternStyle,
              {
                backgroundColor: `${statusColor}20`,
                borderWidth: 1,
                borderColor: statusColor,
              }
            ]} 
          />
        );
      case 'diagonal':
        return (
          <View 
            style={[
              patternStyle,
              {
                backgroundColor: 'transparent',
                borderWidth: 2,
                borderColor: statusColor,
                transform: [{ rotate: '45deg' }],
              }
            ]} 
          />
        );
      default:
        return null;
    }
  };
  
  const containerStyle = [
    styles.container,
    {
      width: sizeValue,
      height: sizeValue,
    },
    style,
  ];
  
  return (
    <View style={containerStyle} testID={testID}>
      <Animated.View
        style={[
          styles.iconContainer,
          shouldAnimate && { opacity: animatedValue },
        ]}
      >
        <IconComponent
          size={iconSize}
          color={statusColor}
          testID={`${testID}-icon`}
        />
        {renderAccessibilityPattern()}
      </Animated.View>
    </View>
  );
});

ProfessionalStatusIcon.displayName = 'ProfessionalStatusIcon';

const styles = StyleSheet.create({
  container: {
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  iconContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
    height: '100%',
  },
});

export default ProfessionalStatusIcon;