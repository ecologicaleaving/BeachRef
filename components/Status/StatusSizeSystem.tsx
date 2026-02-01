/**
 * StatusSizeSystem Component
 * Story 2.4: Professional Status Indicator System
 * 
 * Consistent size system for status indicators with touch target compliance
 */


import { ViewStyle, TextStyle } from 'react-native';
import { StatusIndicatorSize } from '../../types/status';
import { designTokens } from '../../theme/tokens';

// Size configuration for all status indicator components
export interface StatusSizeConfig {
  container: {
    width: number;
    height: number;
    borderRadius: number;
    padding: number;
  };
  icon: {
    size: number;
    strokeWidth: number;
  };
  text: {
    fontSize: number;
    lineHeight: number;
    fontWeight: string;
  };
  spacing: {
    horizontal: number;
    vertical: number;
    iconToText: number;
  };
  touchTarget: {
    minWidth: number;
    minHeight: number;
  };
}

// Complete size configuration mapping
export const statusSizeConfigs: Record<StatusIndicatorSize, StatusSizeConfig> = {
  small: {
    container: {
      width: 20,
      height: 20,
      borderRadius: 8,
      padding: designTokens.spacing.xs / 2,
    },
    icon: {
      size: 16,
      strokeWidth: 2,
    },
    text: {
      fontSize: 12,
      lineHeight: 16,
      fontWeight: '500',
    },
    spacing: {
      horizontal: designTokens.spacing.xs / 2,
      vertical: designTokens.spacing.xs / 4,
      iconToText: designTokens.spacing.xs / 2,
    },
    touchTarget: {
      minWidth: designTokens.iconTokens.accessibility.minimumTouchTarget, // 44px
      minHeight: designTokens.iconTokens.accessibility.minimumTouchTarget, // 44px
    },
  },
  medium: {
    container: {
      width: 28,
      height: 28,
      borderRadius: 12,
      padding: designTokens.spacing.xs,
    },
    icon: {
      size: 20,
      strokeWidth: 2.5,
    },
    text: {
      fontSize: 14,
      lineHeight: 20,
      fontWeight: '500',
    },
    spacing: {
      horizontal: designTokens.spacing.xs,
      vertical: designTokens.spacing.xs / 2,
      iconToText: designTokens.spacing.xs,
    },
    touchTarget: {
      minWidth: designTokens.iconTokens.accessibility.minimumTouchTarget, // 44px
      minHeight: designTokens.iconTokens.accessibility.minimumTouchTarget, // 44px
    },
  },
  large: {
    container: {
      width: 36,
      height: 36,
      borderRadius: 16,
      padding: designTokens.spacing.sm,
    },
    icon: {
      size: 24,
      strokeWidth: 3,
    },
    text: {
      fontSize: 16,
      lineHeight: 24,
      fontWeight: '600',
    },
    spacing: {
      horizontal: designTokens.spacing.sm,
      vertical: designTokens.spacing.xs,
      iconToText: designTokens.spacing.sm,
    },
    touchTarget: {
      minWidth: designTokens.iconTokens.accessibility.minimumTouchTarget, // 44px
      minHeight: designTokens.iconTokens.accessibility.minimumTouchTarget, // 44px
    },
  },
};

// Utility functions for consistent sizing

export const getStatusSizeConfig = (size: StatusIndicatorSize): StatusSizeConfig => {
  return statusSizeConfigs[size];
};

export const getContainerStyle = (
  size: StatusIndicatorSize, 
  variant: 'badge' | 'prominent' | 'icon-only' | 'text-only' | 'full' = 'full'
): ViewStyle => {
  const config = getStatusSizeConfig(size);
  
  const baseStyle: ViewStyle = {
    borderRadius: config.container.borderRadius,
    justifyContent: 'center',
    alignItems: 'center',
  };
  
  switch (variant) {
    case 'badge':
      return {
        ...baseStyle,
        paddingHorizontal: config.spacing.horizontal,
        paddingVertical: config.spacing.vertical,
        minHeight: config.container.height,
        flexDirection: 'row',
      };
    
    case 'prominent':
      return {
        ...baseStyle,
        padding: config.container.padding * 1.5,
        minHeight: config.container.height + config.spacing.vertical * 2,
        flexDirection: 'row',
      };
    
    case 'icon-only':
      return {
        ...baseStyle,
        width: config.container.width,
        height: config.container.height,
      };
    
    case 'text-only':
      return {
        ...baseStyle,
        paddingHorizontal: config.spacing.horizontal,
        paddingVertical: config.spacing.vertical,
      };
    
    case 'full':
    default:
      return {
        ...baseStyle,
        paddingHorizontal: config.spacing.horizontal,
        paddingVertical: config.spacing.vertical,
        minHeight: config.container.height,
        flexDirection: 'row',
      };
  }
};

export const getIconStyle = (size: StatusIndicatorSize): { size: number; strokeWidth: number } => {
  const config = getStatusSizeConfig(size);
  return {
    size: config.icon.size,
    strokeWidth: config.icon.strokeWidth,
  };
};

export const getTextStyle = (size: StatusIndicatorSize): TextStyle => {
  const config = getStatusSizeConfig(size);
  return {
    fontSize: config.text.fontSize,
    lineHeight: config.text.lineHeight,
    fontWeight: config.text.fontWeight as any,
  };
};

export const getTouchTargetStyle = (size: StatusIndicatorSize): ViewStyle => {
  const config = getStatusSizeConfig(size);
  return {
    minWidth: config.touchTarget.minWidth,
    minHeight: config.touchTarget.minHeight,
    justifyContent: 'center',
    alignItems: 'center',
  };
};

export const getSpacingStyle = (size: StatusIndicatorSize): ViewStyle => {
  const config = getStatusSizeConfig(size);
  return {
    marginLeft: config.spacing.iconToText,
  };
};

// Responsive size selection based on screen size or context
export interface ResponsiveSizeOptions {
  screenWidth?: number;
  screenHeight?: number;
  context?: 'mobile' | 'tablet' | 'desktop';
  density?: 'low' | 'medium' | 'high';
}

export const getResponsiveSize = (
  baseSize: StatusIndicatorSize,
  options: ResponsiveSizeOptions = {}
): StatusIndicatorSize => {
  const { screenWidth = 375, context = 'mobile', density = 'medium' } = options;
  
  // Adjust size based on screen width
  if (context === 'tablet' || screenWidth > 768) {
    // Larger sizes for tablets
    switch (baseSize) {
      case 'small': return 'medium';
      case 'medium': return 'large';
      case 'large': return 'large';
    }
  }
  
  // Adjust size based on density
  if (density === 'high') {
    switch (baseSize) {
      case 'small': return 'medium';
      case 'medium': return 'large';
      case 'large': return 'large';
    }
  } else if (density === 'low') {
    switch (baseSize) {
      case 'small': return 'small';
      case 'medium': return 'small';
      case 'large': return 'medium';
    }
  }
  
  return baseSize;
};

// Validation function to ensure accessibility compliance
export const validateTouchTargetCompliance = (size: StatusIndicatorSize): boolean => {
  const config = getStatusSizeConfig(size);
  const minTouchTarget = designTokens.iconTokens.accessibility.minimumTouchTarget;
  
  return (
    config.touchTarget.minWidth >= minTouchTarget &&
    config.touchTarget.minHeight >= minTouchTarget
  );
};

// Get all available sizes for configuration
export const getAvailableSizes = (): StatusIndicatorSize[] => {
  return Object.keys(statusSizeConfigs) as StatusIndicatorSize[];
};

// Size comparison utility
export const compareSizes = (size1: StatusIndicatorSize, size2: StatusIndicatorSize): number => {
  const sizeOrder: Record<StatusIndicatorSize, number> = {
    small: 1,
    medium: 2,
    large: 3,
  };
  
  return sizeOrder[size1] - sizeOrder[size2];
};

export default {
  statusSizeConfigs,
  getStatusSizeConfig,
  getContainerStyle,
  getIconStyle,
  getTextStyle,
  getTouchTargetStyle,
  getSpacingStyle,
  getResponsiveSize,
  validateTouchTargetCompliance,
  getAvailableSizes,
  compareSizes,
};