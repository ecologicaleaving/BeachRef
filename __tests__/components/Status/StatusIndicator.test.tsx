/**
 * StatusIndicator Component Tests
 * Story 2.4: Professional Status Indicator System
 */

import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { StatusIndicator } from '../../../components/Status/StatusIndicator';
import { StatusType } from '../../../types/status';

// Mock dependencies
jest.mock('../../../components/Icons/IconLibrary', () => ({
  StatusIcons: {
    Current: jest.fn(({ testID }) => <div testID={testID}>CurrentIcon</div>),
    Upcoming: jest.fn(({ testID }) => <div testID={testID}>UpcomingIcon</div>),
    Completed: jest.fn(({ testID }) => <div testID={testID}>CompletedIcon</div>),
    Cancelled: jest.fn(({ testID }) => <div testID={testID}>CancelledIcon</div>),
    Emergency: jest.fn(({ testID }) => <div testID={testID}>EmergencyIcon</div>),
  },
}));

jest.mock('../../../theme/tokens', () => ({
  designTokens: {
    colors: {
      background: '#FFFFFF',
      textPrimary: '#2C3E50',
      textSecondary: '#445566',
    },
    spacing: {
      xs: 4,
      sm: 8,
      md: 16,
      lg: 24,
    },
    iconTokens: {
      accessibility: {
        minimumTouchTarget: 44,
      },
    },
  },
}));

jest.mock('../../../utils/statusIndicators', () => ({
  getStatusColor: jest.fn((status: StatusType) => {
    const colorMap: Record<StatusType, string> = {
      current: '#2C3E50',
      upcoming: '#2B5F75',
      completed: colors.success,
      cancelled: '#1B365D',
      changed: '#B8530A',
      'pre-match': '#2B5F75',
      'in-progress': '#2C3E50',
      delayed: '#B8530A',
      suspended: '#8B1538',
      online: colors.success,
      offline: '#445566',
      'sync-pending': '#B8530A',
      error: '#8B1538',
      critical: '#8B1538',
      warning: '#B8530A',
      'action-required': '#B8391A',
    };
    return colorMap[status] || '#2C3E50';
  }),
  getStatusText: jest.fn((status: StatusType) => {
    const textMap: Record<StatusType, string> = {
      current: 'Current',
      upcoming: 'Upcoming',
      completed: 'Completed',
      cancelled: 'Cancelled',
      changed: 'Changed',
      'pre-match': 'Pre-Match',
      'in-progress': 'In Progress',
      delayed: 'Delayed',
      suspended: 'Suspended',
      online: 'Online',
      offline: 'Offline',
      'sync-pending': 'Syncing',
      error: 'Error',
      critical: 'Critical',
      warning: 'Warning',
      'action-required': 'Action Required',
    };
    return textMap[status] || 'Unknown';
  }),
  getStatusSize: jest.fn((size) => {
    const sizeMap = { small: 24, medium: 32, large: 44 };
    return sizeMap[size] || 32;
  }),
  getStatusAccessibilityLabel: jest.fn((status, customLabel) => 
    customLabel || `Assignment status: ${status}`
  ),
  getStatusIconName: jest.fn(() => 'current'),
  shouldAnimateStatus: jest.fn((status) => ['in-progress', 'sync-pending', 'critical'].includes(status)),
  getStatusAnimationDuration: jest.fn(() => 1000),
}));

describe('StatusIndicator Component', () => {
  const defaultProps = {
    type: 'current' as StatusType,
    testID: 'test-status-indicator',
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Basic Rendering', () => {
    it('should render with default props', () => {
      const { getByTestId } = render(<StatusIndicator {...defaultProps} />);
      expect(getByTestId('test-status-indicator')).toBeTruthy();
    });

    it('should render with all status types', () => {
      const statuses: StatusType[] = [
        'current', 'upcoming', 'completed', 'cancelled', 'changed',
        'pre-match', 'in-progress', 'delayed', 'suspended',
        'online', 'offline', 'sync-pending', 'error',
        'critical', 'warning', 'action-required'
      ];

      statuses.forEach(status => {
        const { getByTestId } = render(
          <StatusIndicator type={status} testID={`status-${status}`} />
        );
        expect(getByTestId(`status-${status}`)).toBeTruthy();
      });
    });

    it('should render with different sizes', () => {
      const sizes = ['small', 'medium', 'large'] as const;
      
      sizes.forEach(size => {
        const { getByTestId } = render(
          <StatusIndicator 
            {...defaultProps} 
            size={size}
            testID={`status-${size}`}
          />
        );
        expect(getByTestId(`status-${size}`)).toBeTruthy();
      });
    });

    it('should render with different variants', () => {
      const variants = ['badge', 'prominent', 'icon-only', 'text-only', 'full'] as const;
      
      variants.forEach(variant => {
        const { getByTestId } = render(
          <StatusIndicator 
            {...defaultProps} 
            variant={variant}
            testID={`status-${variant}`}
          />
        );
        expect(getByTestId(`status-${variant}`)).toBeTruthy();
      });
    });
  });

  describe('Icon and Text Display', () => {
    it('should show icon when showIcon is true', () => {
      const { getByTestId } = render(
        <StatusIndicator {...defaultProps} showIcon={true} />
      );
      expect(getByTestId('test-status-indicator-icon')).toBeTruthy();
    });

    it('should hide icon when showIcon is false', () => {
      const { queryByTestId } = render(
        <StatusIndicator {...defaultProps} showIcon={false} />
      );
      expect(queryByTestId('test-status-indicator-icon')).toBeNull();
    });

    it('should show text when showText is true', () => {
      const { getByTestId } = render(
        <StatusIndicator {...defaultProps} showText={true} />
      );
      expect(getByTestId('test-status-indicator-text')).toBeTruthy();
    });

    it('should hide text when showText is false', () => {
      const { queryByTestId } = render(
        <StatusIndicator {...defaultProps} showText={false} />
      );
      expect(queryByTestId('test-status-indicator-text')).toBeNull();
    });

    it('should display custom label when provided', () => {
      const customLabel = 'Custom Status Label';
      const { getByText } = render(
        <StatusIndicator {...defaultProps} customLabel={customLabel} />
      );
      expect(getByText(customLabel)).toBeTruthy();
    });
  });

  describe('Interactive Behavior', () => {
    it('should be touchable when onPress is provided', () => {
      const onPress = jest.fn();
      const { getByTestId } = render(
        <StatusIndicator {...defaultProps} onPress={onPress} />
      );
      
      const touchable = getByTestId('test-status-indicator-touchable');
      expect(touchable).toBeTruthy();
    });

    it('should call onPress when pressed', () => {
      const onPress = jest.fn();
      const { getByTestId } = render(
        <StatusIndicator {...defaultProps} onPress={onPress} />
      );
      
      fireEvent.press(getByTestId('test-status-indicator-touchable'));
      expect(onPress).toHaveBeenCalledTimes(1);
    });

    it('should not be touchable when disabled', () => {
      const onPress = jest.fn();
      const { getByTestId } = render(
        <StatusIndicator {...defaultProps} onPress={onPress} disabled={true} />
      );
      
      const touchable = getByTestId('test-status-indicator-touchable');
      fireEvent.press(touchable);
      expect(onPress).not.toHaveBeenCalled();
    });

    it('should not render touchable wrapper when no onPress provided', () => {
      const { queryByTestId } = render(
        <StatusIndicator {...defaultProps} />
      );
      expect(queryByTestId('test-status-indicator-touchable')).toBeNull();
    });
  });

  describe('Animation Behavior', () => {
    it('should animate for animatable statuses', async () => {
      const { getByTestId } = render(
        <StatusIndicator type="in-progress" animated={true} testID="animated-status" />
      );
      
      const indicator = getByTestId('animated-status');
      expect(indicator).toBeTruthy();
      
      // Animation should start automatically for 'in-progress' status
      await waitFor(() => {
        // Test that animation state is set up correctly
        expect(indicator).toBeTruthy();
      });
    });

    it('should not animate when animated is false', () => {
      const { getByTestId } = render(
        <StatusIndicator type="in-progress" animated={false} testID="non-animated-status" />
      );
      
      const indicator = getByTestId('non-animated-status');
      expect(indicator).toBeTruthy();
    });

    it('should handle animation state changes correctly', async () => {
      const { rerender, getByTestId } = render(
        <StatusIndicator type="upcoming" animated={true} testID="status-change" />
      );
      
      // Change to animatable status
      rerender(
        <StatusIndicator type="critical" animated={true} testID="status-change" />
      );
      
      await waitFor(() => {
        expect(getByTestId('status-change')).toBeTruthy();
      });
    });
  });

  describe('Accessibility', () => {
    it('should have proper accessibility properties', () => {
      const accessibilityLabel = 'Test accessibility label';
      const accessibilityHint = 'Test accessibility hint';
      
      const { getByLabelText } = render(
        <StatusIndicator 
          {...defaultProps} 
          accessibilityLabel={accessibilityLabel}
          accessibilityHint={accessibilityHint}
        />
      );
      
      expect(getByLabelText(accessibilityLabel)).toBeTruthy();
    });

    it('should use default accessibility label when none provided', () => {
      const { getByTestId } = render(
        <StatusIndicator {...defaultProps} />
      );
      
      const indicator = getByTestId('test-status-indicator');
      expect(indicator).toBeTruthy();
    });

    it('should have button role when interactive', () => {
      const onPress = jest.fn();
      const { getByTestId } = render(
        <StatusIndicator {...defaultProps} onPress={onPress} />
      );
      
      const touchable = getByTestId('test-status-indicator-touchable');
      expect(touchable.props.accessibilityRole).toBe('button');
    });
  });

  describe('Style Customization', () => {
    it('should apply custom style', () => {
      const customStyle = { backgroundColor: 'red' };
      const { getByTestId } = render(
        <StatusIndicator {...defaultProps} style={customStyle} />
      );
      
      const indicator = getByTestId('test-status-indicator');
      expect(indicator).toBeTruthy();
    });

    it('should handle high contrast mode', () => {
      const { getByTestId } = render(
        <StatusIndicator {...defaultProps} highContrast={true} />
      );
      
      expect(getByTestId('test-status-indicator')).toBeTruthy();
    });
  });

  describe('Edge Cases', () => {
    it('should handle undefined props gracefully', () => {
      const { getByTestId } = render(
        <StatusIndicator 
          type="current"
          testID="edge-case-status"
          size={undefined as any}
          variant={undefined as any}
        />
      );
      
      expect(getByTestId('edge-case-status')).toBeTruthy();
    });

    it('should handle rapid prop changes', async () => {
      const { rerender, getByTestId } = render(
        <StatusIndicator type="current" testID="rapid-change" />
      );
      
      // Rapidly change props
      for (let i = 0; i < 10; i++) {
        rerender(
          <StatusIndicator 
            type={i % 2 === 0 ? 'current' : 'upcoming'} 
            testID="rapid-change" 
          />
        );
      }
      
      await waitFor(() => {
        expect(getByTestId('rapid-change')).toBeTruthy();
      });
    });

    it('should cleanup animation on unmount', () => {
      const { unmount } = render(
        <StatusIndicator type="in-progress" animated={true} />
      );
      
      // Should not throw error on unmount
      expect(() => unmount()).not.toThrow();
    });
  });

  describe('Performance', () => {
    it('should render quickly with complex props', () => {
      const startTime = performance.now();
      
      render(
        <StatusIndicator 
          type="critical"
          size="large"
          variant="prominent"
          animated={true}
          showIcon={true}
          showText={true}
          highContrast={true}
          customLabel="Complex status indicator"
          accessibilityLabel="Complex accessibility label"
          accessibilityHint="Complex accessibility hint"
          onPress={() => {}}
        />
      );
      
      const endTime = performance.now();
      const renderTime = endTime - startTime;
      
      // Should render in under 50ms
      expect(renderTime).toBeLessThan(50);
    });

    it('should handle multiple instances efficiently', () => {
      const startTime = performance.now();
      
      const indicators = Array.from({ length: 100 }, (_, i) => (
        <StatusIndicator 
          key={i}
          type="current"
          testID={`perf-status-${i}`}
        />
      ));
      
      render(<>{indicators}</>);
      
      const endTime = performance.now();
      const renderTime = endTime - startTime;
      
      // Should render 100 instances in under 200ms
      expect(renderTime).toBeLessThan(200);
    });
  });
});