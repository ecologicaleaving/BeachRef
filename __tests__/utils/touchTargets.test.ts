/**
 * Touch Target Utilities Test Suite
 * Comprehensive testing for touch target sizing, validation, and compliance
 */

import {
  calculateOptimalTouchTargetSize,
  validateTouchTargetCompliance,
  calculateTouchTargetSpacing,
  detectTouchTargetOverlaps,
  auditComponentTouchTargets,
  generateHitSlop,
  measureTouchTargetPerformance,
  touchTargetToStyles,
  validateTouchTargetAnimations,
  DEFAULT_TOUCH_TARGET_COMPLIANCE,
  TOUCH_TARGET_PRESETS,
  getDeviceInfo,
} from '../../utils/touchTargets';

import type {
  TouchTargetSize,
  TouchTargetDimensions,
  TouchTargetProperties,
  TouchTargetValidationContext,
  TouchTargetCompliance,
} from '../../types/touchTarget';

describe('Touch Target Utilities', () => {
  
  describe('calculateOptimalTouchTargetSize', () => {
    it('should return default medium size when no parameters provided', () => {
      const result = calculateOptimalTouchTargetSize();
      expect(result).toEqual(TOUCH_TARGET_PRESETS.medium);
    });
    
    it('should return correct preset dimensions for each size', () => {
      const sizes: TouchTargetSize[] = ['small', 'medium', 'large'];
      
      sizes.forEach(size => {
        const result = calculateOptimalTouchTargetSize(size);
        expect(result).toEqual(TOUCH_TARGET_PRESETS[size]);
      });
    });
    
    it('should adjust size for outdoor conditions', () => {
      const context: Partial<TouchTargetValidationContext> = {
        environmentalFactors: {
          outdoorConditions: true,
          glovedHands: false,
          wetConditions: false,
          singleHandedUse: false,
        },
      };
      
      const result = calculateOptimalTouchTargetSize('medium', context);
      const expected = TOUCH_TARGET_PRESETS.medium;
      
      expect(result.width).toBeGreaterThan(expected.width);
      expect(result.height).toBeGreaterThan(expected.height);
    });
    
    it('should adjust size for gloved hands', () => {
      const context: Partial<TouchTargetValidationContext> = {
        environmentalFactors: {
          outdoorConditions: false,
          glovedHands: true,
          wetConditions: false,
          singleHandedUse: false,
        },
      };
      
      const result = calculateOptimalTouchTargetSize('medium', context);
      const expected = TOUCH_TARGET_PRESETS.medium;
      
      expect(result.width).toBeGreaterThan(expected.width);
      expect(result.height).toBeGreaterThan(expected.height);
    });
    
    it('should ensure minimum compliance even with small base size', () => {
      const result = calculateOptimalTouchTargetSize('small');
      
      expect(result.width).toBeGreaterThanOrEqual(DEFAULT_TOUCH_TARGET_COMPLIANCE.minimumSize);
      expect(result.height).toBeGreaterThanOrEqual(DEFAULT_TOUCH_TARGET_COMPLIANCE.minimumSize);
    });
  });
  
  describe('validateTouchTargetCompliance', () => {
    it('should mark compliant targets as compliant', () => {
      const dimensions: TouchTargetDimensions = {
        width: 48,
        height: 48,
        minWidth: 48,
        minHeight: 48,
      };
      
      const result = validateTouchTargetCompliance(dimensions);
      
      expect(result.isCompliant).toBe(true);
      expect(result.validationStatus).toBe('compliant');
      expect(result.issues).toHaveLength(0);
    });
    
    it('should mark non-compliant targets with issues', () => {
      const dimensions: TouchTargetDimensions = {
        width: 30,
        height: 30,
        minWidth: 30,
        minHeight: 30,
      };
      
      const result = validateTouchTargetCompliance(dimensions);
      
      expect(result.isCompliant).toBe(false);
      expect(result.validationStatus).toBe('non-compliant');
      expect(result.issues.length).toBeGreaterThan(0);
      expect(result.issues[0].type).toBe('size');
      expect(result.issues[0].severity).toBe('error');
    });
    
    it('should mark targets below recommended size as warning', () => {
      const dimensions: TouchTargetDimensions = {
        width: 44, // Minimum compliant but below recommended
        height: 44,
        minWidth: 44,
        minHeight: 44,
      };
      
      const result = validateTouchTargetCompliance(dimensions);
      
      expect(result.isCompliant).toBe(true);
      expect(result.validationStatus).toBe('warning');
      expect(result.issues.length).toBeGreaterThan(0);
      expect(result.issues[0].severity).toBe('warning');
    });
    
    it('should warn about excessively large targets', () => {
      const dimensions: TouchTargetDimensions = {
        width: 100, // Above maximum practical size
        height: 100,
        minWidth: 100,
        minHeight: 100,
      };
      
      const result = validateTouchTargetCompliance(dimensions);
      
      expect(result.isCompliant).toBe(true);
      expect(result.issues.some(issue => issue.message.includes('exceeds practical maximum'))).toBe(true);
    });
  });
  
  describe('calculateTouchTargetSpacing', () => {
    it('should calculate appropriate spacing for normal priority', () => {
      const currentTarget: TouchTargetDimensions = {
        width: 48,
        height: 48,
        minWidth: 48,
        minHeight: 48,
      };
      
      const spacing = calculateTouchTargetSpacing(currentTarget, undefined, 'normal');
      
      expect(spacing.horizontal).toBeGreaterThanOrEqual(DEFAULT_TOUCH_TARGET_COMPLIANCE.spacing.recommended);
      expect(spacing.vertical).toBeGreaterThanOrEqual(DEFAULT_TOUCH_TARGET_COMPLIANCE.spacing.recommended);
    });
    
    it('should calculate larger spacing for critical priority', () => {
      const currentTarget: TouchTargetDimensions = {
        width: 48,
        height: 48,
        minWidth: 48,
        minHeight: 48,
      };
      
      const normalSpacing = calculateTouchTargetSpacing(currentTarget, undefined, 'normal');
      const criticalSpacing = calculateTouchTargetSpacing(currentTarget, undefined, 'critical');
      
      expect(criticalSpacing.horizontal).toBeGreaterThan(normalSpacing.horizontal);
      expect(criticalSpacing.vertical).toBeGreaterThan(normalSpacing.vertical);
    });
    
    it('should scale spacing based on target sizes', () => {
      const smallTarget: TouchTargetDimensions = {
        width: 44,
        height: 44,
        minWidth: 44,
        minHeight: 44,
      };
      
      const largeTarget: TouchTargetDimensions = {
        width: 64,
        height: 64,
        minWidth: 64,
        minHeight: 64,
      };
      
      const smallSpacing = calculateTouchTargetSpacing(smallTarget);
      const largeSpacing = calculateTouchTargetSpacing(largeTarget);
      
      expect(largeSpacing.horizontal).toBeGreaterThanOrEqual(smallSpacing.horizontal);
    });
  });
  
  describe('detectTouchTargetOverlaps', () => {
    it('should detect overlapping targets', () => {
      const targets = [
        {
          id: 'target1',
          bounds: { x: 0, y: 0, width: 48, height: 48 },
          dimensions: { width: 48, height: 48, minWidth: 48, minHeight: 48 },
        },
        {
          id: 'target2',
          bounds: { x: 20, y: 20, width: 48, height: 48 }, // Overlapping
          dimensions: { width: 48, height: 48, minWidth: 48, minHeight: 48 },
        },
      ];
      
      const issues = detectTouchTargetOverlaps(targets);
      
      expect(issues).toHaveLength(1);
      expect(issues[0].type).toBe('overlap');
      expect(issues[0].severity).toBe('error');
    });
    
    it('should not detect non-overlapping targets', () => {
      const targets = [
        {
          id: 'target1',
          bounds: { x: 0, y: 0, width: 48, height: 48 },
          dimensions: { width: 48, height: 48, minWidth: 48, minHeight: 48 },
        },
        {
          id: 'target2',
          bounds: { x: 60, y: 60, width: 48, height: 48 }, // Not overlapping
          dimensions: { width: 48, height: 48, minWidth: 48, minHeight: 48 },
        },
      ];
      
      const issues = detectTouchTargetOverlaps(targets);
      
      expect(issues).toHaveLength(0);
    });
  });
  
  describe('auditComponentTouchTargets', () => {
    it('should generate comprehensive audit report', () => {
      const touchTargets: TouchTargetProperties[] = [
        {
          id: 'target1',
          size: 'medium',
          priority: 'normal',
          dimensions: { width: 48, height: 48, minWidth: 48, minHeight: 48 },
          isCompliant: true,
          validationStatus: 'compliant',
        },
        {
          id: 'target2',
          size: 'small',
          priority: 'normal',
          dimensions: { width: 30, height: 30, minWidth: 30, minHeight: 30 },
          isCompliant: false,
          validationStatus: 'non-compliant',
        },
      ];
      
      const audit = auditComponentTouchTargets('TestComponent', 'test/path', touchTargets);
      
      expect(audit.componentId).toBe('TestComponent');
      expect(audit.compliance.totalTargets).toBe(2);
      expect(audit.compliance.compliantTargets).toBe(1);
      expect(audit.compliance.nonCompliantTargets).toBe(1);
      expect(audit.compliance.overallScore).toBe(50); // 1 compliant out of 2 = 50%
      expect(audit.recommendations.length).toBeGreaterThan(0);
    });
    
    it('should calculate correct compliance score', () => {
      const touchTargets: TouchTargetProperties[] = [
        {
          id: 'target1',
          size: 'medium',
          priority: 'normal',
          dimensions: { width: 48, height: 48, minWidth: 48, minHeight: 48 },
          isCompliant: true,
          validationStatus: 'compliant',
        },
        {
          id: 'target2',
          size: 'medium',
          priority: 'normal',
          dimensions: { width: 44, height: 44, minWidth: 44, minHeight: 44 },
          isCompliant: true,
          validationStatus: 'warning', // Warning counts as 0.5
        },
      ];
      
      const audit = auditComponentTouchTargets('TestComponent', 'test/path', touchTargets);
      
      // 1 compliant + 0.5 warning out of 2 = 75%
      expect(audit.compliance.overallScore).toBe(75);
    });
  });
  
  describe('generateHitSlop', () => {
    it('should generate hit slop for non-compliant targets', () => {
      const currentSize: TouchTargetDimensions = {
        width: 30,
        height: 30,
        minWidth: 30,
        minHeight: 30,
      };
      
      const hitSlop = generateHitSlop(currentSize);
      
      // Should add enough hit slop to reach minimum size
      const expectedDeficit = DEFAULT_TOUCH_TARGET_COMPLIANCE.minimumSize - 30;
      const expectedHitSlop = Math.ceil(expectedDeficit / 2);
      
      expect(hitSlop.top).toBe(expectedHitSlop);
      expect(hitSlop.right).toBe(expectedHitSlop);
      expect(hitSlop.bottom).toBe(expectedHitSlop);
      expect(hitSlop.left).toBe(expectedHitSlop);
    });
    
    it('should generate zero hit slop for compliant targets', () => {
      const currentSize: TouchTargetDimensions = {
        width: 48,
        height: 48,
        minWidth: 48,
        minHeight: 48,
      };
      
      const hitSlop = generateHitSlop(currentSize);
      
      expect(hitSlop.top).toBe(0);
      expect(hitSlop.right).toBe(0);
      expect(hitSlop.bottom).toBe(0);
      expect(hitSlop.left).toBe(0);
    });
  });
  
  describe('measureTouchTargetPerformance', () => {
    it('should track touch performance metrics', () => {
      const performance = measureTouchTargetPerformance();
      
      // Record some touch responses
      performance.recordTouchResponse(10);
      performance.recordTouchResponse(20);
      performance.recordTouchResponse(30);
      
      const metrics = performance.getMetrics();
      
      expect(metrics.touchCount).toBe(3);
      expect(metrics.averageResponseTime).toBe(20); // (10 + 20 + 30) / 3
      // Il commento accanto all'asserzione dichiarava la regola giusta —
      // "excellent" sotto i 16ms — e poi pretendeva "excellent" da una media
      // di 20. Il test contraddiceva se stesso, e il codice aveva ragione.
      expect(metrics.performanceScore).toBe('good'); // 20ms: sopra i 16ms di 'excellent'
    });
    
    it('should categorize performance correctly', () => {
      const performance = measureTouchTargetPerformance();
      
      // Test different performance levels
      performance.recordTouchResponse(50); // Fair performance
      
      const metrics = performance.getMetrics();
      expect(metrics.performanceScore).toBe('fair');
    });
  });
  
  describe('touchTargetToStyles', () => {
    it('should convert dimensions to React Native styles', () => {
      const dimensions: TouchTargetDimensions = {
        width: 48,
        height: 48,
        minWidth: 44,
        minHeight: 44,
      };
      
      const styles = touchTargetToStyles(dimensions);
      
      expect(styles).toEqual({
        width: 48,
        height: 48,
        minWidth: 44,
        minHeight: 44,
      });
    });
    
    it('should include spacing when provided', () => {
      const dimensions: TouchTargetDimensions = {
        width: 48,
        height: 48,
        minWidth: 44,
        minHeight: 44,
      };
      
      const spacing = {
        top: 8,
        right: 12,
        bottom: 8,
        left: 12,
        horizontal: 12,
        vertical: 8,
      };
      
      const styles = touchTargetToStyles(dimensions, spacing);
      
      expect(styles).toEqual({
        width: 48,
        height: 48,
        minWidth: 44,
        minHeight: 44,
        marginTop: 8,
        marginRight: 12,
        marginBottom: 8,
        marginLeft: 12,
      });
    });
  });
  
  describe('validateTouchTargetAnimations', () => {
    it('should validate optimized animations', () => {
      const config = {
        duration: 200,
        useNativeDriver: true,
        property: 'opacity',
      };
      
      const result = validateTouchTargetAnimations(config);
      
      expect(result.isOptimized).toBe(true);
      expect(result.recommendations).toHaveLength(0);
    });
    
    it('should flag long animations', () => {
      const config = {
        duration: 500, // Too long
        useNativeDriver: true,
        property: 'opacity',
      };
      
      const result = validateTouchTargetAnimations(config);
      
      expect(result.isOptimized).toBe(false);
      expect(result.recommendations.some(rec => rec.includes('duration'))).toBe(true);
    });
    
    it('should recommend native driver for compatible properties', () => {
      const config = {
        duration: 200,
        useNativeDriver: false,
        property: 'transform',
      };
      
      const result = validateTouchTargetAnimations(config);
      
      expect(result.isOptimized).toBe(false);
      expect(result.recommendations.some(rec => rec.includes('native driver'))).toBe(true);
    });
    
    it('should recommend transform properties over layout properties', () => {
      const config = {
        duration: 200,
        useNativeDriver: true,
        property: 'width', // Layout property
      };
      
      const result = validateTouchTargetAnimations(config);
      
      expect(result.recommendations.some(rec => rec.includes('transform properties'))).toBe(true);
    });
  });
  
  describe('Performance Requirements', () => {
    it('should validate utility functions perform within requirements', () => {
      const iterations = 1000;
      const startTime = performance.now();
      
      // Test performance of key utilities
      for (let i = 0; i < iterations; i++) {
        calculateOptimalTouchTargetSize('medium');
        validateTouchTargetCompliance({
          width: 48,
          height: 48,
          minWidth: 48,
          minHeight: 48,
        });
      }
      
      const endTime = performance.now();
      const totalTime = endTime - startTime;
      
      // Should complete 1000 operations in less than 100ms
      expect(totalTime).toBeLessThan(100);
    });
    
    it('should validate touch target transitions perform within requirements', () => {
      const iterations = 1000;
      const startTime = performance.now();
      
      // Test performance of status transitions
      for (let i = 0; i < iterations; i++) {
        const dimensions = calculateOptimalTouchTargetSize('medium');
        validateTouchTargetCompliance(dimensions);
      }
      
      const endTime = performance.now();
      const executionTime = endTime - startTime;
      
      // Should complete 1000 transitions in less than 50ms
      expect(executionTime).toBeLessThan(50);
    });
  });
});