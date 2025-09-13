/**
 * AccessibilityStatusIndicator Component
 * Story 2.4: Professional Status Indicator System
 * 
 * Enhanced accessibility support for color-blind users and screen readers
 */

import React from 'react';
import { View, Text, StyleSheet, AccessibilityInfo } from 'react-native';
import { StatusIndicatorProps, AccessibilityPattern } from '../../types/status';
import { StatusIndicator } from './StatusIndicator';
import { ProfessionalStatusIcon } from './ProfessionalStatusIcon';
import { designTokens } from '../../theme/tokens';
import { 
  getStatusColor, 
  getStatusText, 
  getStatusAccessibilityLabel,
  getAccessibilityPattern,
} from '../../utils/statusIndicators';

// Accessibility-enhanced status indicator
export interface AccessibilityStatusIndicatorProps extends StatusIndicatorProps {
  colorBlindSupport?: boolean;
  highContrastMode?: boolean;
  screenReaderOptimized?: boolean;
  patternOverride?: AccessibilityPattern;
  voiceOverDescription?: string;
  contextualDescription?: string;
}

export const AccessibilityStatusIndicator = React.memo<AccessibilityStatusIndicatorProps>(({
  type,
  size = 'medium',
  variant = 'full',
  colorBlindSupport = true,
  highContrastMode = false,
  screenReaderOptimized = true,
  patternOverride,
  voiceOverDescription,
  contextualDescription,
  accessibilityLabel,
  testID = 'accessibility-status-indicator',
  style,
  ...rest
}) => {
  const [isScreenReaderEnabled, setIsScreenReaderEnabled] = React.useState(false);
  
  const statusColor = getStatusColor(type);
  const statusText = getStatusText(type);
  const pattern = patternOverride || getAccessibilityPattern(type);
  
  // Check if screen reader is enabled
  React.useEffect(() => {
    const checkScreenReader = async () => {
      const enabled = await AccessibilityInfo.isScreenReaderEnabled();
      setIsScreenReaderEnabled(enabled);
    };
    
    checkScreenReader();
    
    const subscription = AccessibilityInfo.addEventListener(
      'screenReaderChanged',
      setIsScreenReaderEnabled
    );
    
    return () => subscription?.remove();
  }, []);
  
  // Enhanced accessibility label
  const getEnhancedAccessibilityLabel = (): string => {
    if (voiceOverDescription) return voiceOverDescription;
    
    const baseLabel = accessibilityLabel || getStatusAccessibilityLabel(type);
    const contextual = contextualDescription ? `, ${contextualDescription}` : '';
    const pattern = colorBlindSupport && getAccessibilityPattern(type) !== 'none' 
      ? `, with ${getAccessibilityPattern(type)} pattern for accessibility` 
      : '';
    
    return `${baseLabel}${contextual}${pattern}`;
  };
  
  // Render pattern overlay for color-blind support
  const renderPatternOverlay = () => {
    if (!colorBlindSupport || pattern === 'none') return null;
    
    const patternStyle = {
      position: 'absolute' as const,
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      borderRadius: variant === 'badge' ? 8 : variant === 'prominent' ? 12 : 8,
    };
    
    switch (pattern) {
      case 'dots':
        return (
          <View 
            style={[
              patternStyle,
              styles.dotsPattern,
              { borderColor: statusColor }
            ]}
            accessible={false}
          />
        );
      
      case 'stripes':
        return (
          <View 
            style={[
              patternStyle,
              styles.stripesPattern,
              { backgroundColor: `${statusColor}20` }
            ]}
            accessible={false}
          >
            <View style={[styles.stripe, { backgroundColor: statusColor }]} />
            <View style={[styles.stripe, { backgroundColor: statusColor }]} />
            <View style={[styles.stripe, { backgroundColor: statusColor }]} />
          </View>
        );
      
      case 'diagonal':
        return (
          <View 
            style={[
              patternStyle,
              styles.diagonalPattern,
              { borderColor: statusColor }
            ]}
            accessible={false}
          />
        );
      
      case 'icon':
        return (
          <View 
            style={[patternStyle, styles.iconPattern]}
            accessible={false}
          >
            <ProfessionalStatusIcon
              status={type}
              size={size}
              color={highContrastMode ? '#000000' : statusColor}
              accessibilityPattern="none"
              animated={false}
            />
          </View>
        );
      
      default:
        return null;
    }
  };
  
  // High contrast color adjustments
  const getHighContrastColor = (originalColor: string): string => {
    if (!highContrastMode) return originalColor;
    
    // Enhance contrast for outdoor visibility
    const contrastMap: Record<string, string> = {
      [designTokens.statusColors.current]: '#000000',      // Black for maximum contrast
      [designTokens.statusColors.upcoming]: '#000080',     // Dark blue
      [designTokens.statusColors.completed]: '#006400',    // Dark green
      [designTokens.statusColors.cancelled]: '#8B0000',    // Dark red
      [designTokens.statusColors.emergency]: '#FF0000',    // Bright red
    };
    
    return contrastMap[originalColor] || '#000000';
  };
  
  // Screen reader optimized description
  const renderScreenReaderContent = () => {
    if (!screenReaderOptimized || !isScreenReaderEnabled) return null;
    
    return (
      <View style={styles.screenReaderOnly}>
        <Text 
          accessible={true}
          accessibilityLabel={getEnhancedAccessibilityLabel()}
          accessibilityRole="text"
          importantForAccessibility="yes"
        >
          {`Status: ${statusText}. ${contextualDescription || ''}`}
        </Text>
      </View>
    );
  };
  
  const enhancedProps = {
    ...rest,
    type,
    size,
    variant,
    accessibilityLabel: getEnhancedAccessibilityLabel(),
    testID,
    style: [
      highContrastMode && styles.highContrast,
      style,
    ],
  };
  
  // Override colors for high contrast mode
  if (highContrastMode) {
    enhancedProps.highContrast = true;
  }
  
  return (
    <View style={styles.container} testID={`${testID}-container`}>
      <StatusIndicator {...enhancedProps} />
      {renderPatternOverlay()}
      {renderScreenReaderContent()}
    </View>
  );
});

// Color-blind pattern alternatives
export interface ColorBlindPatternProps {
  pattern: AccessibilityPattern;
  color: string;
  size: number;
  testID?: string;
}

export const ColorBlindPattern = React.memo<ColorBlindPatternProps>(({
  pattern,
  color,
  size,
  testID = 'color-blind-pattern',
}) => {
  const patternSize = size;
  
  const baseStyle = {
    width: patternSize,
    height: patternSize,
    position: 'absolute' as const,
    top: 0,
    left: 0,
  };
  
  switch (pattern) {
    case 'dots':
      return (
        <View 
          style={[
            baseStyle,
            {
              borderRadius: patternSize / 2,
              borderWidth: 2,
              borderColor: color,
              borderStyle: 'dotted',
            }
          ]}
          testID={testID}
          accessible={false}
        />
      );
    
    case 'stripes':
      return (
        <View 
          style={[baseStyle, { overflow: 'hidden', borderRadius: 4 }]}
          testID={testID}
          accessible={false}
        >
          {Array.from({ length: 3 }, (_, i) => (
            <View
              key={i}
              style={[
                styles.stripe,
                {
                  backgroundColor: color,
                  height: patternSize / 3,
                  top: i * (patternSize / 3),
                }
              ]}
            />
          ))}
        </View>
      );
    
    case 'diagonal':
      return (
        <View 
          style={[
            baseStyle,
            {
              borderWidth: 2,
              borderColor: color,
              transform: [{ rotate: '45deg' }],
              borderRadius: 4,
            }
          ]}
          testID={testID}
          accessible={false}
        />
      );
    
    default:
      return null;
  }
});

// High contrast status legend
export interface StatusLegendProps {
  statuses: {
    type: StatusIndicatorProps['type'];
    label?: string;
    description?: string;
  }[];
  showPatterns?: boolean;
  testID?: string;
}

export const StatusLegend = React.memo<StatusLegendProps>(({
  statuses,
  showPatterns = true,
  testID = 'status-legend',
}) => {
  return (
    <View style={styles.legend} testID={testID}>
      <Text style={styles.legendTitle} accessibilityRole="header">
        Status Indicators
      </Text>
      {statuses.map((status, index) => (
        <View key={`${status.type}-${index}`} style={styles.legendItem}>
          <AccessibilityStatusIndicator
            type={status.type}
            size="small"
            variant="full"
            colorBlindSupport={showPatterns}
            screenReaderOptimized={true}
            contextualDescription={status.description}
            testID={`${testID}-${status.type}`}
          />
          <View style={styles.legendText}>
            <Text style={styles.legendLabel}>
              {status.label || getStatusText(status.type)}
            </Text>
            {status.description && (
              <Text style={styles.legendDescription}>
                {status.description}
              </Text>
            )}
          </View>
        </View>
      ))}
    </View>
  );
});

AccessibilityStatusIndicator.displayName = 'AccessibilityStatusIndicator';
ColorBlindPattern.displayName = 'ColorBlindPattern';
StatusLegend.displayName = 'StatusLegend';

const styles = StyleSheet.create({
  container: {
    position: 'relative',
  },
  
  // High contrast mode
  highContrast: {
    boxShadow: '0px 2px 4px rgba(0, 0, 0, 0.8)',
    elevation: 8,
  },
  
  // Screen reader only content
  screenReaderOnly: {
    position: 'absolute',
    left: -10000,
    width: 1,
    height: 1,
    overflow: 'hidden',
  },
  
  // Pattern styles
  dotsPattern: {
    borderWidth: 2,
    borderStyle: 'dotted',
    backgroundColor: 'transparent',
  },
  
  stripesPattern: {
    flexDirection: 'column',
    justifyContent: 'space-between',
    overflow: 'hidden',
  },
  
  stripe: {
    position: 'absolute',
    width: '100%',
    opacity: 0.3,
  },
  
  diagonalPattern: {
    borderWidth: 2,
    transform: [{ rotate: '45deg' }],
    backgroundColor: 'transparent',
  },
  
  iconPattern: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  
  // Legend styles
  legend: {
    backgroundColor: designTokens.colors.background,
    padding: designTokens.spacing.md,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: designTokens.colors.textSecondary,
  },
  
  legendTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: designTokens.colors.textPrimary,
    marginBottom: designTokens.spacing.md,
  },
  
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: designTokens.spacing.sm,
  },
  
  legendText: {
    marginLeft: designTokens.spacing.md,
    flex: 1,
  },
  
  legendLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: designTokens.colors.textPrimary,
  },
  
  legendDescription: {
    fontSize: 14,
    color: designTokens.colors.textSecondary,
    marginTop: 2,
  },
});

export default {
  AccessibilityStatusIndicator,
  ColorBlindPattern,
  StatusLegend,
};