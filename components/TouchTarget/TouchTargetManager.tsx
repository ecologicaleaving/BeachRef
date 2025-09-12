/**
 * TouchTargetManager
 * Core component for managing touch target compliance and validation
 */

import React, { useMemo, useCallback, useRef } from 'react';
import { View, StyleSheet, ViewProps } from 'react-native';
import type {
  TouchTargetProperties,
  TouchTargetSize,
  TouchTargetPriority,
  TouchTargetManagerConfig,
  TouchTargetValidationStatus,
  ComponentTouchTargetMetadata,
} from '../../types/touchTarget';
import {
  calculateOptimalTouchTargetSize,
  validateTouchTargetCompliance,
  generateHitSlop,
  DEFAULT_TOUCH_TARGET_COMPLIANCE,
  touchTargetToStyles,
} from '../../utils/touchTargets';

interface TouchTargetManagerProps extends ViewProps {
  /**
   * Touch target configuration
   */
  targetId: string;
  size?: TouchTargetSize;
  priority?: TouchTargetPriority;
  customSize?: {
    width?: number;
    height?: number;
  };
  
  /**
   * Compliance and validation
   */
  enforceCompliance?: boolean;
  enableValidation?: boolean;
  enableDebugging?: boolean;
  
  /**
   * Accessibility
   */
  accessibilityLabel?: string;
  accessibilityHint?: string;
  accessibilityRole?: string;
  
  /**
   * Interaction handlers
   */
  onPress?: () => void;
  onPressIn?: () => void;
  onPressOut?: () => void;
  onLongPress?: () => void;
  
  /**
   * Validation callbacks
   */
  onValidationResult?: (result: {
    isCompliant: boolean;
    validationStatus: TouchTargetValidationStatus;
    metadata: ComponentTouchTargetMetadata;
  }) => void;
  
  /**
   * Children and styling
   */
  children?: React.ReactNode;
  containerStyle?: any;
  debugStyle?: any;
}

/**
 * TouchTargetManager component provides touch target compliance enforcement
 * and validation for interactive components
 */
export const TouchTargetManager: React.FC<TouchTargetManagerProps> = React.memo(({
  targetId,
  size = 'medium',
  priority = 'normal',
  customSize,
  enforceCompliance = true,
  enableValidation = true,
  enableDebugging = false,
  accessibilityLabel,
  accessibilityHint,
  accessibilityRole = 'button',
  onPress,
  onPressIn,
  onPressOut,
  onLongPress,
  onValidationResult,
  children,
  containerStyle,
  debugStyle,
  style,
  ...viewProps
}) => {
  const validationRef = useRef<ComponentTouchTargetMetadata | null>(null);
  
  // Calculate optimal touch target dimensions
  const targetDimensions = useMemo(() => {
    if (customSize) {
      return {
        width: customSize.width || DEFAULT_TOUCH_TARGET_COMPLIANCE.minimumSize,
        height: customSize.height || DEFAULT_TOUCH_TARGET_COMPLIANCE.minimumSize,
        minWidth: customSize.width || DEFAULT_TOUCH_TARGET_COMPLIANCE.minimumSize,
        minHeight: customSize.height || DEFAULT_TOUCH_TARGET_COMPLIANCE.minimumSize,
      };
    }
    
    return calculateOptimalTouchTargetSize(size);
  }, [size, customSize]);
  
  // Validate touch target compliance
  const validationResult = useMemo(() => {
    if (!enableValidation) {
      return {
        isCompliant: true,
        validationStatus: 'unknown' as TouchTargetValidationStatus,
        issues: [],
      };
    }
    
    return validateTouchTargetCompliance(targetDimensions);
  }, [targetDimensions, enableValidation]);
  
  // Generate hit slop for compliance
  const hitSlop = useMemo(() => {
    if (!enforceCompliance || validationResult.isCompliant) {
      return undefined;
    }
    
    return generateHitSlop(targetDimensions);
  }, [targetDimensions, enforceCompliance, validationResult.isCompliant]);
  
  // Create touch target properties
  const touchTargetProperties: TouchTargetProperties = useMemo(() => ({
    id: targetId,
    size,
    priority,
    dimensions: targetDimensions,
    isCompliant: validationResult.isCompliant,
    validationStatus: validationResult.validationStatus,
    accessibilityLabel,
    customSizing: customSize,
  }), [targetId, size, priority, targetDimensions, validationResult, accessibilityLabel, customSize]);
  
  // Create component metadata
  const componentMetadata: ComponentTouchTargetMetadata = useMemo(() => ({
    componentName: 'TouchTargetManager',
    componentPath: `components/TouchTarget/TouchTargetManager.tsx`,
    touchTargets: [touchTargetProperties],
    lastAuditDate: new Date(),
    compliance: {
      score: validationResult.isCompliant ? 100 : 0,
      status: validationResult.validationStatus,
      issues: validationResult.issues,
    },
    performance: {
      renderTime: 0, // Will be measured in production
      touchResponseTime: 0,
      memoryUsage: 0,
    },
  }), [touchTargetProperties, validationResult]);
  
  // Handle validation result callback
  const handleValidationResult = useCallback(() => {
    if (onValidationResult && enableValidation) {
      onValidationResult({
        isCompliant: validationResult.isCompliant,
        validationStatus: validationResult.validationStatus,
        metadata: componentMetadata,
      });
    }
  }, [onValidationResult, validationResult, componentMetadata, enableValidation]);
  
  // Trigger validation callback when validation changes
  React.useEffect(() => {
    handleValidationResult();
  }, [handleValidationResult]);
  
  // Generate container styles
  const containerStyles = useMemo(() => {
    const baseStyles = touchTargetToStyles(targetDimensions);
    
    const debugStyles = enableDebugging ? {
      borderWidth: 2,
      borderColor: validationResult.isCompliant ? '#4CAF50' : '#F44336',
      backgroundColor: validationResult.isCompliant 
        ? 'rgba(76, 175, 80, 0.1)' 
        : 'rgba(244, 67, 54, 0.1)',
    } : {};
    
    return [
      styles.container,
      baseStyles,
      debugStyles,
      containerStyle,
    ];
  }, [targetDimensions, enableDebugging, validationResult.isCompliant, containerStyle]);
  
  // Generate accessibility props
  const accessibilityProps = useMemo(() => ({
    accessible: true,
    accessibilityRole: accessibilityRole,
    accessibilityLabel: accessibilityLabel || `Touch target ${targetId}`,
    accessibilityHint: accessibilityHint,
    accessibilityState: {
      disabled: !onPress,
    },
  }), [accessibilityRole, accessibilityLabel, targetId, accessibilityHint, onPress]);
  
  // Performance measurement for touch responses
  const touchPerformanceRef = useRef({
    startTime: 0,
    endTime: 0,
  });
  
  const now = () => (typeof performance !== 'undefined' && typeof performance.now === 'function') ? performance.now() : Date.now();

  const handlePressIn = useCallback(() => {
    touchPerformanceRef.current.startTime = now();
    onPressIn?.();
  }, [onPressIn]);
  
  const handlePressOut = useCallback(() => {
    touchPerformanceRef.current.endTime = now();
    onPressOut?.();
  }, [onPressOut]);
  
  const handlePress = useCallback(() => {
    const responseTime = touchPerformanceRef.current.endTime - touchPerformanceRef.current.startTime;
    
    // Update metadata with performance metrics
    if (validationRef.current) {
      validationRef.current.performance.touchResponseTime = responseTime;
    }
    
    onPress?.();
  }, [onPress]);
  
  // Store validation metadata
  validationRef.current = componentMetadata;
  
  return (
    <View
      {...viewProps}
      style={[containerStyles, style]}
      hitSlop={hitSlop}
      onTouchStart={handlePressIn}
      onTouchEnd={handlePressOut}
      {...accessibilityProps}
    >
      {children}
      
      {/* Debug information overlay */}
      {enableDebugging && (
        <View style={[styles.debugOverlay, debugStyle]}>
          <View style={styles.debugInfo}>
            {/* Debug info will be rendered by TouchTargetVisualization component */}
          </View>
        </View>
      )}
    </View>
  );
});

TouchTargetManager.displayName = 'TouchTargetManager';

const styles = StyleSheet.create({
  container: {
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  debugOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    pointerEvents: 'none' as const,
    zIndex: 1000,
  },
  debugInfo: {
    position: 'absolute',
    top: -20,
    left: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    padding: 2,
    borderRadius: 2,
  },
});

export default TouchTargetManager;
