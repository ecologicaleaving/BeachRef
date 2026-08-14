/**
 * StatusIndicator Component
 * Story 2.4: Professional Status Indicator System
 * 
 * Enhanced status indicator component with comprehensive variant system
 * Extends Story 1.4 status components with professional referee features
 */

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Animated } from 'react-native';
import { StatusIndicatorProps, StatusAnimationState } from '../../types/status';
import { designTokens } from '../../theme/tokens';
import { 
  getStatusColor, 
  getStatusText, 
  getStatusSize, 
  getStatusAccessibilityLabel,
  shouldAnimateStatus,
  getStatusAnimationDuration,
} from '../../utils/statusIndicators';
import { StatusIcons } from '../Icons/IconLibrary';

export const StatusIndicator = React.memo<StatusIndicatorProps>(({
  type,
  size = 'medium',
  variant = 'full',
  animated = true,
  animationState = 'idle',
  accessibilityPattern = 'none',
  highContrast = false,
  showIcon = true,
  showText = true,
  customLabel,
  onPress,
  disabled = false,
  accessibilityLabel,
  accessibilityHint,
  testID,
  style,
}) => {
  const animatedValue = React.useRef(new Animated.Value(1)).current;
  const [currentAnimationState, setCurrentAnimationState] = React.useState<StatusAnimationState>(animationState);
  
  const statusColor = getStatusColor(type);
  const statusText = getStatusText(type);
  const sizeValue = getStatusSize(size);
  const defaultAccessibilityLabel = getStatusAccessibilityLabel(type, customLabel);
  const shouldAnimate = animated && shouldAnimateStatus(type);
  const animationDuration = getStatusAnimationDuration(type);
  
  // Animation effect
  //
  // Il ciclo di pulsazione si ripianifica da solo con un `setTimeout`, e
  // l'effect non aveva alcun cleanup (issue #111): per `in-progress`,
  // `sync-pending` e `critical` il ciclo sopravviveva allo smontaggio del
  // componente, continuando a ripartire e a chiamare `setCurrentAnimationState`
  // su un componente che non c'e' piu'. Sotto jest lo si vede in modo netto —
  // il timer scattava dopo il teardown della suite, quando `Animated` non
  // esiste piu', e faceva cadere il processo Node con
  // `Cannot read properties of undefined (reading 'sequence')`.
  //
  // Ora l'effect restituisce il proprio cleanup: annulla il timer in attesa e
  // ferma l'animazione in corso. `annullato` serve perche' la callback di
  // `.start()` puo' arrivare DOPO lo smontaggio: `stopAnimation()` la invoca
  // comunque, e senza questa guardia ripianificherebbe il timer che abbiamo
  // appena annullato.
  React.useEffect(() => {
    if (!shouldAnimate) return;

    let timer: ReturnType<typeof setTimeout> | undefined;
    let annullato = false;

    const startAnimation = () => {
      if (annullato) return;
      setCurrentAnimationState('transitioning');

      Animated.sequence([
        Animated.timing(animatedValue, {
          toValue: 0.7,
          duration: animationDuration / 2,
          useNativeDriver: true,
        }),
        Animated.timing(animatedValue, {
          toValue: 1,
          duration: animationDuration / 2,
          useNativeDriver: true,
        }),
      ]).start(() => {
        if (annullato) return;
        setCurrentAnimationState('idle');
        // Continue pulsing for certain statuses
        if (['in-progress', 'sync-pending', 'critical'].includes(type)) {
          timer = setTimeout(startAnimation, 100);
        }
      });
    };

    if (currentAnimationState === 'idle') {
      startAnimation();
    }

    return () => {
      annullato = true;
      if (timer) clearTimeout(timer);
      animatedValue.stopAnimation();
    };
  }, [shouldAnimate, type, animationDuration, animatedValue, currentAnimationState]);
  
  // Get component styles based on variant and size
  const getContainerStyle = () => {
    const baseStyle = {
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      justifyContent: 'center' as const,
    };
    
    switch (variant) {
      case 'badge':
        return {
          ...baseStyle,
          backgroundColor: statusColor,
          paddingHorizontal: designTokens.spacing.xs,
          paddingVertical: designTokens.spacing.xs / 2,
          borderRadius: size === 'small' ? 8 : size === 'medium' ? 12 : 16,
          minHeight: sizeValue,
        };
      
      case 'prominent':
        return {
          ...baseStyle,
          backgroundColor: highContrast ? statusColor : `${statusColor}15`,
          borderWidth: 2,
          borderColor: statusColor,
          paddingHorizontal: designTokens.spacing.md,
          paddingVertical: designTokens.spacing.sm,
          borderRadius: size === 'small' ? 12 : size === 'medium' ? 16 : 20,
          minHeight: sizeValue + designTokens.spacing.sm,
        };
      
      case 'icon-only':
        return {
          ...baseStyle,
          width: sizeValue,
          height: sizeValue,
          borderRadius: sizeValue / 2,
        };
      
      case 'text-only':
        return {
          ...baseStyle,
          paddingHorizontal: designTokens.spacing.xs,
          paddingVertical: designTokens.spacing.xs / 2,
        };
      
      case 'full':
      default:
        return {
          ...baseStyle,
          backgroundColor: `${statusColor}10`,
          borderWidth: 1,
          borderColor: statusColor,
          paddingHorizontal: designTokens.spacing.sm,
          paddingVertical: designTokens.spacing.xs,
          borderRadius: size === 'small' ? 8 : size === 'medium' ? 12 : 16,
          minHeight: sizeValue,
        };
    }
  };
  
  const getTextStyle = () => {
    const isInverted = variant === 'badge' || (variant === 'prominent' && highContrast);
    const textColor = isInverted ? designTokens.colors.background : statusColor;
    
    const fontSize = size === 'small' ? 12 : size === 'medium' ? 14 : 16;
    const fontWeight = variant === 'prominent' ? '600' : '500';
    
    return {
      color: textColor,
      fontSize,
      fontWeight,
      marginLeft: showIcon && showText ? designTokens.spacing.xs : 0,
    };
  };
  
  const getIconSize = () => {
    switch (size) {
      case 'small': return 16;
      case 'medium': return 20;
      case 'large': return 24;
      default: return 20;
    }
  };
  
  const getIconColor = () => {
    const isInverted = variant === 'badge' || (variant === 'prominent' && highContrast);
    return isInverted ? designTokens.colors.background : statusColor;
  };
  
  // Get icon component based on status type
  const getIconComponent = React.useMemo(() => {
    switch (type) {
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
  }, [type]);

  // Render icon based on status type
  const renderIcon = () => {
    if (!showIcon) return null;
    
    const IconComponent = getIconComponent;
    
    return (
      <IconComponent
        size={getIconSize()}
        color={getIconColor()}
        testID={`${testID}-icon`}
      />
    );
  };
  
  // Render text label
  const renderText = () => {
    if (!showText) return null;
    
    return (
      <Text 
        style={getTextStyle()}
        numberOfLines={1}
        testID={`${testID}-text`}
      >
        {customLabel || statusText}
      </Text>
    );
  };
  
  // Render accessibility pattern overlay
  const renderAccessibilityPattern = () => {
    if (accessibilityPattern === 'none' || accessibilityPattern === 'icon') return null;
    
    // Pattern implementation would depend on the specific pattern type
    // For now, we'll use a simple overlay approach
    const patternStyle = {
      position: 'absolute' as const,
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      opacity: 0.3,
    };
    
    switch (accessibilityPattern) {
      case 'dots':
        return <View style={[patternStyle, { backgroundColor: 'transparent' }]} />;
      case 'stripes':
        return <View style={[patternStyle, { backgroundColor: 'transparent' }]} />;
      case 'diagonal':
        return <View style={[patternStyle, { backgroundColor: 'transparent' }]} />;
      default:
        return null;
    }
  };
  
  const containerStyle = getContainerStyle();
  const isInteractive = onPress && !disabled;
  
  const content = (
    <Animated.View
      style={[
        containerStyle,
        shouldAnimate && { opacity: animatedValue },
        style,
      ]}
      testID={testID}
    >
      {renderIcon()}
      {renderText()}
      {renderAccessibilityPattern()}
    </Animated.View>
  );
  
  if (isInteractive) {
    return (
      <TouchableOpacity
        onPress={onPress}
        disabled={disabled}
        accessible={true}
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel || defaultAccessibilityLabel}
        accessibilityHint={accessibilityHint}
        style={[styles.touchableContainer, disabled && styles.disabled]}
        testID={`${testID}-touchable`}
      >
        {content}
      </TouchableOpacity>
    );
  }
  
  return (
    <View
      accessible={true}
      accessibilityLabel={accessibilityLabel || defaultAccessibilityLabel}
      accessibilityHint={accessibilityHint}
    >
      {content}
    </View>
  );
});

StatusIndicator.displayName = 'StatusIndicator';

const styles = StyleSheet.create({
  touchableContainer: {
    minHeight: designTokens.iconTokens.accessibility.minimumTouchTarget, // 44px
    justifyContent: 'center',
    alignItems: 'center',
  },
  disabled: {
    opacity: 0.5,
  },
});

export default StatusIndicator;