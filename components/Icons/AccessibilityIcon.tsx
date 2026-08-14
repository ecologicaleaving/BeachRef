/**
 * AccessibilityIcon Component
 * Story 1.5: Outdoor-Optimized Iconography
 * 
 * Enhanced icon component with comprehensive accessibility support
 */

import React from 'react';
import { AccessibilityRole, AccessibilityState } from 'react-native';
import { Icon, IconProps } from './Icon';

export interface AccessibilityIconProps extends IconProps {
  // Enhanced accessibility props
  //
  // Il `| undefined` esplicito e' richiesto da `exactOptionalPropertyTypes`
  // (issue #111): `IconLibrary` inoltra queste props con `{...props}`, cioe'
  // presenti e possibilmente `undefined`, che con quel flag NON e' lo stesso
  // tipo di "assenti". Dichiararle qui senza `| undefined` produceva TS2375
  // sui tre call site di `IconLibrary`.
  accessibilityState?: AccessibilityState | undefined;
  accessibilityValue?: {
    min?: number | undefined;
    max?: number | undefined;
    now?: number | undefined;
    text?: string | undefined;
  } | undefined;
  importantForAccessibility?: 'auto' | 'yes' | 'no' | 'no-hide-descendants' | undefined;
  accessibilityElementsHidden?: boolean | undefined;
  accessibilityLiveRegion?: 'none' | 'polite' | 'assertive' | undefined;

  // Screen reader specific props
  screenReaderDescription?: string | undefined;
  contextualHint?: string | undefined;

  // High contrast support
  respectHighContrastMode?: boolean | undefined;
  highContrastFallback?: string | undefined;
}

export const AccessibilityIcon: React.FC<AccessibilityIconProps> = React.memo(({
  screenReaderDescription,
  contextualHint,
  respectHighContrastMode = true,
  highContrastFallback,
  accessibilityLabel,
  accessibilityHint,
  accessibilityState,
  accessibilityValue,
  importantForAccessibility = 'auto',
  accessibilityElementsHidden,
  accessibilityLiveRegion = 'none',
  theme = 'default',
  ...iconProps
}) => {
  // Determine accessibility role based on interactivity
  const getAccessibilityRole = (): AccessibilityRole => {
    if (iconProps.isInteractive && iconProps.onPress) {
      return 'button';
    }
    return 'image';
  };

  // Enhanced accessibility label generation
  const generateAccessibilityLabel = (): string => {
    if (accessibilityLabel) {
      return accessibilityLabel;
    }
    
    const baseLabel = `${iconProps.category} ${iconProps.name} icon`;
    
    if (screenReaderDescription) {
      return `${baseLabel}, ${screenReaderDescription}`;
    }
    
    return baseLabel;
  };

  // Enhanced accessibility hint generation
  const generateAccessibilityHint = (): string | undefined => {
    if (accessibilityHint) {
      return accessibilityHint;
    }
    
    if (contextualHint) {
      return contextualHint;
    }
    
    if (iconProps.isInteractive) {
      return `Double tap to ${iconProps.category === 'action' ? 'perform action' : 'navigate'}`;
    }
    
    return undefined;
  };

  // High contrast mode support
  const getHighContrastTheme = () => {
    if (respectHighContrastMode && highContrastFallback) {
      // In a real app, this would check the system's high contrast setting
      // For now, we'll use the accessibility theme for maximum contrast
      return 'accessibility';
    }
    return theme;
  };

  return (
    <Icon
      {...iconProps}
      theme={getHighContrastTheme()}
      accessibilityRole={getAccessibilityRole()}
      accessibilityLabel={generateAccessibilityLabel()}
      accessibilityHint={generateAccessibilityHint()}
      accessibilityState={accessibilityState}
      accessibilityValue={accessibilityValue}
      importantForAccessibility={importantForAccessibility}
      accessibilityElementsHidden={accessibilityElementsHidden}
      accessibilityLiveRegion={accessibilityLiveRegion}
    />
  );
});

AccessibilityIcon.displayName = 'AccessibilityIcon';

export default AccessibilityIcon;