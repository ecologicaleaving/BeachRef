/**
 * StatusIndicatorVariants Component
 * Story 2.4: Professional Status Indicator System
 * 
 * Specialized status indicator variants for different contexts
 */

import React from 'react';
import { View, Animated, ViewStyle} from 'react-native';
import { StatusIndicatorProps, StatusIndicatorSize } from '../../types/status';
import { StatusIndicator } from './StatusIndicator';

import { designTokens } from '../../theme/tokens';
import { getStatusColor} from '../../utils/statusIndicators';

// Inline Status Badge - Small indicators for lists and cards
export interface InlineStatusBadgeProps extends Omit<StatusIndicatorProps, 'variant'> {
  compact?: boolean;
  roundedCorners?: boolean;
}

export const InlineStatusBadge = React.memo<InlineStatusBadgeProps>(({
  type,
  size = 'small',
  compact = false,
  roundedCorners = true,
  showIcon = true,
  showText = !compact,
  testID = 'inline-status-badge',
  style,
  ...rest
}) => {
  const badgeStyle: ViewStyle = {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: compact ? designTokens.spacing.xs / 2 : designTokens.spacing.xs,
    paddingVertical: designTokens.spacing.xs / 2,
    borderRadius: roundedCorners ? (size === 'small' ? 8 : size === 'medium' ? 10 : 12) : 0,
    minHeight: size === 'small' ? 20 : size === 'medium' ? 24 : 28,
  };

  return (
    <View style={[badgeStyle, style]} testID={testID}>
      <StatusIndicator
        type={type}
        size={size}
        variant="badge"
        showIcon={showIcon}
        showText={showText}
        testID={`${testID}-indicator`}
        {...rest}
      />
    </View>
  );
});

// Prominent Status Display - Large indicators for critical information
export interface ProminentStatusDisplayProps extends Omit<StatusIndicatorProps, 'variant'> {
  emphasis?: 'normal' | 'high' | 'critical';
  fullWidth?: boolean;
}

export const ProminentStatusDisplay = React.memo<ProminentStatusDisplayProps>(({
  type,
  size = 'large',
  emphasis = 'normal',
  fullWidth = false,
  showIcon = true,
  showText = true,
  animated = true,
  testID = 'prominent-status-display',
  style,
  ...rest
}) => {
  const statusColor = getStatusColor(type);
  
  const getEmphasisStyle = (): ViewStyle => {
    const baseStyle = {
      padding: designTokens.spacing.md,
      borderRadius: 16,
      borderWidth: 2,
    };
    
    switch (emphasis) {
      case 'critical':
        return {
          ...baseStyle,
          backgroundColor: `${statusColor}20`,
          borderColor: statusColor,
          borderWidth: 3,
          boxShadow: `0px 4px 8px ${statusColor}4D`,
          elevation: 8,
        };
      case 'high':
        return {
          ...baseStyle,
          backgroundColor: `${statusColor}15`,
          borderColor: statusColor,
          borderWidth: 2,
          boxShadow: `0px 2px 4px ${statusColor}33`,
          elevation: 4,
        };
      case 'normal':
      default:
        return {
          ...baseStyle,
          backgroundColor: `${statusColor}10`,
          borderColor: statusColor,
          borderWidth: 1,
        };
    }
  };

  const displayStyle: ViewStyle = {
    ...getEmphasisStyle(),
    width: fullWidth ? '100%' : undefined,
    alignSelf: fullWidth ? 'stretch' : 'flex-start',
  };

  return (
    <View style={[displayStyle, style]} testID={testID}>
      <StatusIndicator
        type={type}
        size={size}
        variant="prominent"
        showIcon={showIcon}
        showText={showText}
        animated={animated}
        testID={`${testID}-indicator`}
        {...rest}
      />
    </View>
  );
});

// Animated Status Transition - Smooth transitions for status changes
export interface AnimatedStatusTransitionProps {
  fromStatus?: StatusIndicatorProps['type'];
  toStatus: StatusIndicatorProps['type'];
  duration?: number;
  size?: StatusIndicatorSize;
  showIcon?: boolean;
  showText?: boolean;
  onTransitionComplete?: () => void;
  testID?: string;
  style?: ViewStyle;
}

export const AnimatedStatusTransition = React.memo<AnimatedStatusTransitionProps>(({
  fromStatus,
  toStatus,
  duration = 300,
  size = 'medium',
  showIcon = true,
  showText = true,
  onTransitionComplete,
  testID = 'animated-status-transition',
  style,
}) => {
  const fadeAnim = React.useRef(new Animated.Value(fromStatus ? 1 : 0)).current;
  const scaleAnim = React.useRef(new Animated.Value(1)).current;
  const [currentStatus, setCurrentStatus] = React.useState(fromStatus || toStatus);

  React.useEffect(() => {
    if (!fromStatus) {
      // Initial display
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: duration / 2,
        useNativeDriver: true,
      }).start();
      return;
    }

    // Transition animation sequence
    Animated.sequence([
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: duration / 2,
          useNativeDriver: true,
        }),
        Animated.timing(scaleAnim, {
          toValue: 0.8,
          duration: duration / 2,
          useNativeDriver: true,
        }),
      ]),
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: duration / 2,
          useNativeDriver: true,
        }),
        Animated.timing(scaleAnim, {
          toValue: 1,
          duration: duration / 2,
          useNativeDriver: true,
        }),
      ]),
    ]).start(() => {
      onTransitionComplete?.();
    });

    // Update status at midpoint of animation
    setTimeout(() => {
      setCurrentStatus(toStatus);
    }, duration / 2);
  }, [fromStatus, toStatus, duration, fadeAnim, scaleAnim, onTransitionComplete]);

  return (
    <Animated.View
      style={[
        { opacity: fadeAnim, transform: [{ scale: scaleAnim }] },
        style,
      ]}
      testID={testID}
    >
      <StatusIndicator
        type={currentStatus}
        size={size}
        variant="full"
        showIcon={showIcon}
        showText={showText}
        animated={false} // Controlled by parent animation
        testID={`${testID}-indicator`}
      />
    </Animated.View>
  );
});

// Contextual Status Placement - Smart placement system for different contexts
export interface ContextualStatusPlacementProps extends StatusIndicatorProps {
  context: 'list-item' | 'card-header' | 'card-footer' | 'toolbar' | 'overlay';
  parentWidth?: number;
  parentHeight?: number;
}

export const ContextualStatusPlacement = React.memo<ContextualStatusPlacementProps>(({
  context,
  parentWidth,
  parentHeight,
  type,
  size: propSize,
  testID = 'contextual-status-placement',
  style,
  ...rest
}) => {
  const getContextualConfig = () => {
    switch (context) {
      case 'list-item':
        return {
          size: 'small' as StatusIndicatorSize,
          variant: 'badge' as const,
          showIcon: true,
          showText: false,
          style: { alignSelf: 'center' as const },
        };
      
      case 'card-header':
        return {
          size: 'small' as StatusIndicatorSize,
          variant: 'full' as const,
          showIcon: true,
          showText: true,
          style: { alignSelf: 'flex-start' as const },
        };
      
      case 'card-footer':
        return {
          size: 'medium' as StatusIndicatorSize,
          variant: 'full' as const,
          showIcon: true,
          showText: true,
          style: { alignSelf: 'flex-end' as const },
        };
      
      case 'toolbar':
        return {
          size: 'medium' as StatusIndicatorSize,
          variant: 'icon-only' as const,
          showIcon: true,
          showText: false,
          style: { 
            minWidth: designTokens.iconTokens.accessibility.minimumTouchTarget,
            minHeight: designTokens.iconTokens.accessibility.minimumTouchTarget,
            justifyContent: 'center' as const,
            alignItems: 'center' as const,
          },
        };
      
      case 'overlay':
        return {
          size: 'large' as StatusIndicatorSize,
          variant: 'prominent' as const,
          showIcon: true,
          showText: true,
          style: { 
            position: 'absolute' as const,
            top: designTokens.spacing.md,
            right: designTokens.spacing.md,
            zIndex: 10,
          },
        };
      
      default:
        return {
          size: 'medium' as StatusIndicatorSize,
          variant: 'full' as const,
          showIcon: true,
          showText: true,
          style: {},
        };
    }
  };

  const contextConfig = getContextualConfig();
  const finalSize = propSize || contextConfig.size;

  return (
    <StatusIndicator
      type={type}
      size={finalSize}
      variant={contextConfig.variant}
      showIcon={contextConfig.showIcon}
      showText={contextConfig.showText}
      testID={testID}
      style={[contextConfig.style, style]}
      {...rest}
    />
  );
});

// Set display names for better debugging
InlineStatusBadge.displayName = 'InlineStatusBadge';
ProminentStatusDisplay.displayName = 'ProminentStatusDisplay';
AnimatedStatusTransition.displayName = 'AnimatedStatusTransition';
ContextualStatusPlacement.displayName = 'ContextualStatusPlacement';

export default {
  InlineStatusBadge,
  ProminentStatusDisplay,
  AnimatedStatusTransition,
  ContextualStatusPlacement,
};