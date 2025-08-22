/**
 * useAssignmentCountdown Hook Tests
 * Tests for real-time countdown timer functionality
 */

import { renderHook, act } from '@testing-library/react-native';
import { useAssignmentCountdown } from '../../hooks/useAssignmentCountdown';
import { colors } from '../theme/tokens';

// Mock timers
jest.useFakeTimers();

describe('useAssignmentCountdown', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.clearAllTimers();
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  it('should initialize with zero countdown when no target date', () => {
    const { result } = renderHook(() => useAssignmentCountdown(null));

    expect(result.current.countdown.hours).toBe(0);
    expect(result.current.countdown.minutes).toBe(0);
    expect(result.current.countdown.seconds).toBe(0);
    expect(result.current.countdown.isExpired).toBe(false);
    expect(result.current.formattedTime).toBe('0:00');
    expect(result.current.urgency.level).toBe('low');
    expect(result.current.urgency.message).toBe('No upcoming assignment');
  });

  it('should calculate countdown for future date', () => {
    const futureDate = new Date(Date.now() + 90 * 60 * 1000); // 1.5 hours from now

    const { result } = renderHook(() => useAssignmentCountdown(futureDate));

    expect(result.current.countdown.hours).toBe(1);
    expect(result.current.countdown.minutes).toBe(30);
    expect(result.current.countdown.totalSeconds).toBe(90 * 60);
    expect(result.current.countdown.isExpired).toBe(false);
    expect(result.current.formattedTime).toBe('1h 30m');
  });

  it('should show minutes only for times between 10-59 minutes', () => {
    const futureDate = new Date(Date.now() + 30 * 60 * 1000); // 30 minutes from now

    const { result } = renderHook(() => useAssignmentCountdown(futureDate));

    expect(result.current.countdown.hours).toBe(0);
    expect(result.current.countdown.minutes).toBe(30);
    expect(result.current.formattedTime).toBe('30 min');
  });

  it('should show minutes and seconds for times under 10 minutes', () => {
    const futureDate = new Date(Date.now() + 5 * 60 * 1000 + 30 * 1000); // 5m 30s from now

    const { result } = renderHook(() => useAssignmentCountdown(futureDate));

    expect(result.current.countdown.hours).toBe(0);
    expect(result.current.countdown.minutes).toBe(5);
    expect(result.current.countdown.seconds).toBe(30);
    expect(result.current.formattedTime).toBe('5:30');
  });

  it('should handle expired assignments', () => {
    const pastDate = new Date(Date.now() - 10 * 60 * 1000); // 10 minutes ago

    const { result } = renderHook(() => useAssignmentCountdown(pastDate));

    expect(result.current.countdown.isExpired).toBe(true);
    expect(result.current.formattedTime).toBe('Match Time');
    expect(result.current.urgency.level).toBe('critical');
    expect(result.current.urgency.message).toBe('Match in progress');
  });

  it('should set correct urgency levels', () => {
    // Test critical urgency (5 minutes or less)
    const criticalDate = new Date(Date.now() + 3 * 60 * 1000);
    const { result: criticalResult } = renderHook(() => useAssignmentCountdown(criticalDate));
    expect(criticalResult.current.urgency.level).toBe('critical');
    expect(criticalResult.current.urgency.message).toBe('Starting very soon!');
    expect(criticalResult.current.isCritical).toBe(true);

    // Test high urgency (6-15 minutes)
    const highDate = new Date(Date.now() + 10 * 60 * 1000);
    const { result: highResult } = renderHook(() => useAssignmentCountdown(highDate));
    expect(highResult.current.urgency.level).toBe('high');
    expect(highResult.current.urgency.message).toBe('Starting soon');
    expect(highResult.current.isUrgent).toBe(true);

    // Test medium urgency (16-60 minutes)
    const mediumDate = new Date(Date.now() + 30 * 60 * 1000);
    const { result: mediumResult } = renderHook(() => useAssignmentCountdown(mediumDate));
    expect(mediumResult.current.urgency.level).toBe('medium');
    expect(mediumResult.current.urgency.message).toBe('Preparation time');

    // Test low urgency (over 1 hour)
    const lowDate = new Date(Date.now() + 120 * 60 * 1000);
    const { result: lowResult } = renderHook(() => useAssignmentCountdown(lowDate));
    expect(lowResult.current.urgency.level).toBe('low');
    expect(lowResult.current.urgency.message).toBe('On schedule');
  });

  it('should update countdown every second', () => {
    const futureDate = new Date(Date.now() + 65 * 1000); // 65 seconds from now

    const { result } = renderHook(() => useAssignmentCountdown(futureDate));

    // Initial state
    expect(result.current.countdown.minutes).toBe(1);
    expect(result.current.countdown.seconds).toBe(5);

    // Advance timer by 1 second
    act(() => {
      jest.advanceTimersByTime(1000);
    });

    expect(result.current.countdown.minutes).toBe(1);
    expect(result.current.countdown.seconds).toBe(4);

    // Advance timer by 5 more seconds
    act(() => {
      jest.advanceTimersByTime(5000);
    });

    expect(result.current.countdown.seconds).toBe(59);
    expect(result.current.countdown.minutes).toBe(0);
  });

  it('should handle target date changes', () => {
    const initialDate = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
    
    const { result, rerender } = renderHook(
      ({ targetDate }) => useAssignmentCountdown(targetDate),
      { initialProps: { targetDate: initialDate } }
    );

    expect(result.current.countdown.hours).toBe(1);

    // Change to 30 minutes
    const newDate = new Date(Date.now() + 30 * 60 * 1000);
    rerender({ targetDate: newDate });

    expect(result.current.countdown.hours).toBe(0);
    expect(result.current.countdown.minutes).toBe(30);
  });

  it('should clean up timers on unmount', () => {
    const futureDate = new Date(Date.now() + 60 * 60 * 1000);
    
    const { unmount } = renderHook(() => useAssignmentCountdown(futureDate));

    // Verify timer is running
    expect(jest.getTimerCount()).toBeGreaterThan(0);

    // Unmount and verify cleanup
    unmount();
    
    // Run any remaining timers
    jest.runAllTimers();
    
    expect(jest.getTimerCount()).toBe(0);
  });

  it('should provide correct urgency colors', () => {
    // Test critical color
    const criticalDate = new Date(Date.now() + 3 * 60 * 1000);
    const { result: criticalResult } = renderHook(() => useAssignmentCountdown(criticalDate));
    expect(criticalResult.current.urgency.color).toBe('#8B1538'); // error red

    // Test high color
    const highDate = new Date(Date.now() + 10 * 60 * 1000);
    const { result: highResult } = renderHook(() => useAssignmentCountdown(highDate));
    expect(highResult.current.urgency.color).toBe('#B8530A'); // warning orange

    // Test medium color
    const mediumDate = new Date(Date.now() + 30 * 60 * 1000);
    const { result: mediumResult } = renderHook(() => useAssignmentCountdown(mediumDate));
    expect(mediumResult.current.urgency.color).toBe('#2B5F75'); // secondary blue

    // Test low color
    const lowDate = new Date(Date.now() + 120 * 60 * 1000);
    const { result: lowResult } = renderHook(() => useAssignmentCountdown(lowDate));
    expect(lowResult.current.urgency.color).toBe(colors.success); // success green
  });

  it('should handle edge cases in time formatting', () => {
    // Test exactly 1 hour
    const oneHourDate = new Date(Date.now() + 60 * 60 * 1000);
    const { result: oneHourResult } = renderHook(() => useAssignmentCountdown(oneHourDate));
    expect(oneHourResult.current.formattedTime).toBe('1h 0m');

    // Test exactly 10 minutes
    const tenMinDate = new Date(Date.now() + 10 * 60 * 1000);
    const { result: tenMinResult } = renderHook(() => useAssignmentCountdown(tenMinDate));
    expect(tenMinResult.current.formattedTime).toBe('10 min');

    // Test exactly 1 minute
    const oneMinDate = new Date(Date.now() + 60 * 1000);
    const { result: oneMinResult } = renderHook(() => useAssignmentCountdown(oneMinDate));
    expect(oneMinResult.current.formattedTime).toBe('1:00');

    // Test less than 1 minute
    const thirtySecDate = new Date(Date.now() + 30 * 1000);
    const { result: thirtySecResult } = renderHook(() => useAssignmentCountdown(thirtySecDate));
    expect(thirtySecResult.current.formattedTime).toBe('0:30');
  });
});