/**
 * Status Indicators Utilities Tests
 * Story 2.4: Professional Status Indicator System
 */

import {
  getStatusColor,
  getStatusText,
  getStatusSize,
  getStatusAccessibilityLabel,
  getStatusIconName,
  getAccessibilityPattern,
  shouldAnimateStatus,
  getStatusAnimationDuration,
  isAssignmentStatus,
  isMatchStatus,
  isSystemStatus,
  isUrgencyStatus,
  getStatusCategory,
  getStatusPriority,
  isValidStatusTransition,
  validateStatusColorContrast,
} from '../../utils/statusIndicators';
import { StatusType } from '../../types/status';

describe('Status Indicators Utilities', () => {
  describe('getStatusColor', () => {
    it('should return correct colors for assignment statuses', () => {
      expect(getStatusColor('current')).toBeDefined();
      expect(getStatusColor('upcoming')).toBeDefined();
      expect(getStatusColor('completed')).toBeDefined();
      expect(getStatusColor('cancelled')).toBeDefined();
      expect(getStatusColor('changed')).toBeDefined();
    });

    it('should return correct colors for match statuses', () => {
      expect(getStatusColor('pre-match')).toBeDefined();
      expect(getStatusColor('in-progress')).toBeDefined();
      expect(getStatusColor('delayed')).toBeDefined();
      expect(getStatusColor('suspended')).toBeDefined();
    });

    it('should return correct colors for system statuses', () => {
      expect(getStatusColor('online')).toBeDefined();
      expect(getStatusColor('offline')).toBeDefined();
      expect(getStatusColor('sync-pending')).toBeDefined();
      expect(getStatusColor('error')).toBeDefined();
    });

    it('should return correct colors for urgency statuses', () => {
      expect(getStatusColor('critical')).toBeDefined();
      expect(getStatusColor('warning')).toBeDefined();
      expect(getStatusColor('action-required')).toBeDefined();
    });
  });

  describe('getStatusText', () => {
    it('should return readable text for all status types', () => {
      expect(getStatusText('current')).toBe('Current');
      expect(getStatusText('upcoming')).toBe('Upcoming');
      expect(getStatusText('completed')).toBe('Completed');
      expect(getStatusText('cancelled')).toBe('Cancelled');
      expect(getStatusText('changed')).toBe('Changed');
      expect(getStatusText('pre-match')).toBe('Pre-Match');
      expect(getStatusText('in-progress')).toBe('In Progress');
      expect(getStatusText('delayed')).toBe('Delayed');
      expect(getStatusText('suspended')).toBe('Suspended');
      expect(getStatusText('online')).toBe('Online');
      expect(getStatusText('offline')).toBe('Offline');
      expect(getStatusText('sync-pending')).toBe('Syncing');
      expect(getStatusText('error')).toBe('Error');
      expect(getStatusText('critical')).toBe('Critical');
      expect(getStatusText('warning')).toBe('Warning');
      expect(getStatusText('action-required')).toBe('Action Required');
    });
  });

  describe('getStatusSize', () => {
    it('should return correct pixel values for each size', () => {
      expect(getStatusSize('small')).toBe(24);
      expect(getStatusSize('medium')).toBe(32);
      expect(getStatusSize('large')).toBe(44);
    });
  });

  describe('getStatusAccessibilityLabel', () => {
    it('should generate appropriate accessibility labels', () => {
      expect(getStatusAccessibilityLabel('current')).toBe('Assignment status: Current');
      expect(getStatusAccessibilityLabel('pre-match')).toBe('Match status: Pre-Match');
      expect(getStatusAccessibilityLabel('online')).toBe('System status: Online');
      expect(getStatusAccessibilityLabel('critical')).toBe('Critical alert');
    });

    it('should use custom label when provided', () => {
      const customLabel = 'Custom assignment status';
      expect(getStatusAccessibilityLabel('current', customLabel)).toBe(customLabel);
    });
  });

  describe('getStatusIconName', () => {
    it('should return appropriate icon names for all statuses', () => {
      expect(getStatusIconName('current')).toBe('current');
      expect(getStatusIconName('upcoming')).toBe('upcoming');
      expect(getStatusIconName('completed')).toBe('completed');
      expect(getStatusIconName('cancelled')).toBe('cancelled');
      expect(getStatusIconName('changed')).toBe('alert');
      expect(getStatusIconName('critical')).toBe('emergency');
    });
  });

  describe('getAccessibilityPattern', () => {
    it('should return appropriate patterns for color-blind support', () => {
      expect(getAccessibilityPattern('current')).toBe('dots');
      expect(getAccessibilityPattern('upcoming')).toBe('stripes');
      expect(getAccessibilityPattern('completed')).toBe('none');
      expect(getAccessibilityPattern('cancelled')).toBe('diagonal');
      expect(getAccessibilityPattern('critical')).toBe('icon');
    });
  });

  describe('shouldAnimateStatus', () => {
    it('should return true for animatable statuses', () => {
      expect(shouldAnimateStatus('in-progress')).toBe(true);
      expect(shouldAnimateStatus('sync-pending')).toBe(true);
      expect(shouldAnimateStatus('critical')).toBe(true);
    });

    it('should return false for non-animatable statuses', () => {
      expect(shouldAnimateStatus('completed')).toBe(false);
      expect(shouldAnimateStatus('cancelled')).toBe(false);
      expect(shouldAnimateStatus('upcoming')).toBe(false);
    });
  });

  describe('getStatusAnimationDuration', () => {
    it('should return appropriate durations for different statuses', () => {
      expect(getStatusAnimationDuration('critical')).toBe(500);
      expect(getStatusAnimationDuration('in-progress')).toBe(2000);
      expect(getStatusAnimationDuration('sync-pending')).toBe(1500);
      expect(getStatusAnimationDuration('upcoming')).toBe(1000);
    });
  });

  describe('Status category functions', () => {
    it('should correctly identify assignment statuses', () => {
      expect(isAssignmentStatus('current')).toBe(true);
      expect(isAssignmentStatus('upcoming')).toBe(true);
      expect(isAssignmentStatus('completed')).toBe(true);
      expect(isAssignmentStatus('cancelled')).toBe(true);
      expect(isAssignmentStatus('changed')).toBe(true);
      expect(isAssignmentStatus('in-progress')).toBe(false);
    });

    it('should correctly identify match statuses', () => {
      expect(isMatchStatus('pre-match')).toBe(true);
      expect(isMatchStatus('in-progress')).toBe(true);
      expect(isMatchStatus('delayed')).toBe(true);
      expect(isMatchStatus('suspended')).toBe(true);
      expect(isMatchStatus('current')).toBe(false);
    });

    it('should correctly identify system statuses', () => {
      expect(isSystemStatus('online')).toBe(true);
      expect(isSystemStatus('offline')).toBe(true);
      expect(isSystemStatus('sync-pending')).toBe(true);
      expect(isSystemStatus('error')).toBe(true);
      expect(isSystemStatus('current')).toBe(false);
    });

    it('should correctly identify urgency statuses', () => {
      expect(isUrgencyStatus('critical')).toBe(true);
      expect(isUrgencyStatus('warning')).toBe(true);
      expect(isUrgencyStatus('action-required')).toBe(true);
      expect(isUrgencyStatus('current')).toBe(false);
    });
  });

  describe('getStatusCategory', () => {
    it('should return correct categories for all status types', () => {
      expect(getStatusCategory('current')).toBe('assignment');
      expect(getStatusCategory('pre-match')).toBe('match');
      expect(getStatusCategory('online')).toBe('system');
      expect(getStatusCategory('critical')).toBe('urgency');
    });

    it('should throw error for unknown status', () => {
      expect(() => getStatusCategory('unknown' as StatusType)).toThrow('Unknown status type');
    });
  });

  describe('getStatusPriority', () => {
    it('should return higher priority for more urgent statuses', () => {
      expect(getStatusPriority('critical')).toBeGreaterThan(getStatusPriority('warning'));
      expect(getStatusPriority('warning')).toBeGreaterThan(getStatusPriority('current'));
      expect(getStatusPriority('current')).toBeGreaterThan(getStatusPriority('upcoming'));
      expect(getStatusPriority('upcoming')).toBeGreaterThan(getStatusPriority('completed'));
    });

    it('should assign specific priority values correctly', () => {
      expect(getStatusPriority('critical')).toBe(100);
      expect(getStatusPriority('action-required')).toBe(90);
      expect(getStatusPriority('warning')).toBe(80);
      expect(getStatusPriority('current')).toBe(70);
      expect(getStatusPriority('completed')).toBe(10);
      expect(getStatusPriority('online')).toBe(5);
    });
  });

  describe('isValidStatusTransition', () => {
    describe('assignment status transitions', () => {
      it('should allow valid assignment transitions', () => {
        expect(isValidStatusTransition('upcoming', 'current')).toBe(true);
        expect(isValidStatusTransition('current', 'completed')).toBe(true);
        expect(isValidStatusTransition('upcoming', 'cancelled')).toBe(true);
        expect(isValidStatusTransition('changed', 'current')).toBe(true);
      });

      it('should reject invalid assignment transitions', () => {
        expect(isValidStatusTransition('completed', 'current')).toBe(false);
        expect(isValidStatusTransition('cancelled', 'upcoming')).toBe(false);
        expect(isValidStatusTransition('upcoming', 'completed')).toBe(false);
      });
    });

    describe('match status transitions', () => {
      it('should allow valid match transitions', () => {
        expect(isValidStatusTransition('pre-match', 'in-progress')).toBe(true);
        expect(isValidStatusTransition('in-progress', 'completed')).toBe(true);
        expect(isValidStatusTransition('delayed', 'in-progress')).toBe(true);
        expect(isValidStatusTransition('suspended', 'in-progress')).toBe(true);
      });

      it('should reject invalid match transitions', () => {
        expect(isValidStatusTransition('completed', 'in-progress')).toBe(false);
        expect(isValidStatusTransition('pre-match', 'completed')).toBe(false);
      });
    });

    describe('system status transitions', () => {
      it('should allow valid system transitions', () => {
        expect(isValidStatusTransition('online', 'offline')).toBe(true);
        expect(isValidStatusTransition('offline', 'online')).toBe(true);
        expect(isValidStatusTransition('sync-pending', 'online')).toBe(true);
        expect(isValidStatusTransition('error', 'online')).toBe(true);
      });
    });

    describe('cross-category transitions', () => {
      it('should reject transitions between different categories', () => {
        expect(isValidStatusTransition('current', 'pre-match')).toBe(false);
        expect(isValidStatusTransition('online', 'current')).toBe(false);
        expect(isValidStatusTransition('critical', 'upcoming')).toBe(false);
      });
    });
  });

  describe('validateStatusColorContrast', () => {
    it('should validate contrast ratios for status colors', () => {
      expect(validateStatusColorContrast('current')).toBe(true);
      expect(validateStatusColorContrast('upcoming')).toBe(true);
      expect(validateStatusColorContrast('completed')).toBe(true);
      expect(validateStatusColorContrast('critical')).toBe(true);
    });

    it('should work with custom background colors', () => {
      expect(validateStatusColorContrast('current', '#000000')).toBeDefined();
      expect(validateStatusColorContrast('current', '#FFFFFF')).toBeDefined();
    });
  });

  describe('Edge cases and error handling', () => {
    it('should handle all defined status types without errors', () => {
      const allStatuses: StatusType[] = [
        'current', 'upcoming', 'completed', 'cancelled', 'changed',
        'pre-match', 'in-progress', 'delayed', 'suspended',
        'online', 'offline', 'sync-pending', 'error',
        'critical', 'warning', 'action-required'
      ];

      allStatuses.forEach(status => {
        expect(() => getStatusColor(status)).not.toThrow();
        expect(() => getStatusText(status)).not.toThrow();
        expect(() => getStatusAccessibilityLabel(status)).not.toThrow();
        expect(() => getStatusIconName(status)).not.toThrow();
        expect(() => getAccessibilityPattern(status)).not.toThrow();
        expect(() => shouldAnimateStatus(status)).not.toThrow();
        expect(() => getStatusAnimationDuration(status)).not.toThrow();
        expect(() => getStatusCategory(status)).not.toThrow();
        expect(() => getStatusPriority(status)).not.toThrow();
      });
    });

    it('should return consistent results for repeated calls', () => {
      const status: StatusType = 'current';
      const color1 = getStatusColor(status);
      const color2 = getStatusColor(status);
      expect(color1).toBe(color2);

      const text1 = getStatusText(status);
      const text2 = getStatusText(status);
      expect(text1).toBe(text2);
    });
  });

  /**
   * Queste due soglie misuravano la macchina, non il codice: 130 ms contro un
   * limite di 100 su un run con i worker jest in parallelo, 12 ms sulla stessa
   * macchina ferma. Il test cambiava colore in base a cosa altro stava girando
   * (issue #94). I limiti sono ora due ordini di grandezza sopra il costo
   * reale: intercettano ancora una regressione vera — una lookup che comincia a
   * fare IO, o che diventa quadratica — senza dipendere dallo scheduler.
   */
  describe('Performance tests', () => {
    it('should execute status utility functions quickly', () => {
      const startTime = performance.now();

      for (let i = 0; i < 1000; i++) {
        getStatusColor('current');
        getStatusText('upcoming');
        getStatusCategory('completed');
        getStatusPriority('critical');
      }

      const endTime = performance.now();
      const duration = endTime - startTime;

      expect(duration).toBeLessThan(3000);
    });

    it('should handle rapid status transition validations', () => {
      const startTime = performance.now();

      for (let i = 0; i < 1000; i++) {
        isValidStatusTransition('upcoming', 'current');
        isValidStatusTransition('current', 'completed');
        isValidStatusTransition('pre-match', 'in-progress');
      }

      const endTime = performance.now();
      const duration = endTime - startTime;

      expect(duration).toBeLessThan(2000);
    });
  });
});