/**
 * Icon Component
 * Story 1.5: Outdoor-Optimized Iconography
 * 
 * High-visibility, outdoor-optimized icon component for tournament referees
 */

import React from 'react';
import { View, StyleSheet, TouchableOpacity, ViewStyle, AccessibilityRole, Platform, Text } from 'react-native';
import { Ionicons } from './vectorIconSets';
import { 
  IconSize, 
  IconVariant, 
  IconCategory,
  getIconName,
  getIconStyles,
  getVariantIconName,
  ICON_COLOR_THEMES 
} from '../../utils/icons';

export interface IconProps {
  category: IconCategory;
  name: string;
  size?: IconSize;
  variant?: IconVariant;
  theme?: keyof typeof ICON_COLOR_THEMES;
  colorKey?: string;
  isInteractive?: boolean;
  isEmergency?: boolean;
  onPress?: () => void;
  style?: ViewStyle;
  testID?: string;
  accessibilityLabel?: string;
  accessibilityHint?: string;
}

export const Icon: React.FC<IconProps> = React.memo(({
  category,
  name,
  size = 'medium',
  variant = 'outlined',
  theme = 'default',
  colorKey = 'primary',
  isInteractive = false,
  isEmergency = false,
  onPress,
  style,
  testID,
  accessibilityLabel,
  accessibilityHint,
}) => {
  const baseIconName = getIconName(category, name);
  const variantIconName = getVariantIconName(baseIconName, variant);
  const iconStyles = getIconStyles(size, theme, colorKey, variant, isInteractive, isEmergency);
  
  // Log accessibility warnings
  if (!iconStyles.contrast.compliant) {
    // console.warn(`Icon contrast insufficient for outdoor visibility: ${iconStyles.contrast.ratio.toFixed(2)}:1`);
  }

  const containerStyle: ViewStyle[] = [
    styles.container,
    iconStyles.style,
    style,
  ];

  const iconElement = Platform.OS === 'web' ? (
    // Web fallback to avoid font loading timeouts
    <Text aria-label={variantIconName} style={{ fontSize: iconStyles.size, color: iconStyles.color, opacity: iconStyles.variant === 'filled' && !isEmergency ? 0.95 : 1.0 }}>
      ●
    </Text>
  ) : (
    <Ionicons
      name={variantIconName as any}
      size={iconStyles.size}
      color={iconStyles.color}
      style={{
        opacity: iconStyles.variant === 'filled' && !isEmergency ? 0.95 : 1.0,
      }}
    />
  );

  // If interactive, wrap in TouchableOpacity
  if (isInteractive && onPress) {
    return (
      <TouchableOpacity
        style={containerStyle}
        onPress={onPress}
        activeOpacity={0.7}
        testID={testID}
        accessibilityRole={iconStyles.accessibility.accessibilityRole as AccessibilityRole}
        accessibilityLabel={accessibilityLabel || `${category} ${name} icon`}
        accessibilityHint={accessibilityHint}
      >
        {iconElement}
      </TouchableOpacity>
    );
  }

  // Non-interactive icon
  return (
    <View
      style={containerStyle}
      testID={testID}
      accessibilityRole={iconStyles.accessibility.accessibilityRole as AccessibilityRole}
      accessibilityLabel={accessibilityLabel || `${category} ${name} icon`}
    >
      {iconElement}
    </View>
  );
});

Icon.displayName = 'Icon';

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default Icon;
