/**
 * useCurrentAssignment Hook Tests
 * Tests for current assignment detection and management
 */

import { renderHook, act, waitFor } from '@testing-library/react-native';
import { useCurrentAssignment } from '../../hooks/useCurrentAssignment';

describe('useCurrentAssignment', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should initialize with loading state', () => {
    const { result } = renderHook(() => useCurrentAssignment());

    expect(result.current.loading).toBe(true);
    expect(result.current.currentAssignment).toBe(null);
    expect(result.current.upcomingAssignments).toEqual([]);
    expect(result.current.error).toBe(null);
    expect(result.current.lastUpdated).toBe(null);
  });

  it('should load current and upcoming assignments', async () => {
    const { result } = renderHook(() => useCurrentAssignment());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.currentAssignment).toBeDefined();
    expect(result.current.currentAssignment?.id).toBe('current-001');
    expect(result.current.currentAssignment?.status).toBe('current');
    expect(result.current.upcomingAssignments).toHaveLength(2);
    expect(result.current.lastUpdated).toBeInstanceOf(Date);
  });

  it('should have current assignment with correct properties', async () => {
    const { result } = renderHook(() => useCurrentAssignment());

    // `toBeDefined()` e' vero anche per `null`: l'attesa terminava subito,
    // mentre l'incarico non era ancora arrivato, e la riga dopo leggeva
    // `null.homeTeam`. Serve `not.toBeNull()`.
    await waitFor(() => {
      expect(result.current.currentAssignment).not.toBeNull();
    });

    const currentAssignment = result.current.currentAssignment!;
    expect(currentAssignment.homeTeam).toBe('Beach Warriors');
    expect(currentAssignment.awayTeam).toBe('Sand Storms');
    expect(currentAssignment.courtNumber).toBe(1);
    expect(currentAssignment.refereePosition).toBe('1st Referee');
    expect(currentAssignment.importance).toBe('high');
    expect(currentAssignment.matchType).toBe('Pool Play');
    expect(currentAssignment.notes).toBe('Championship semi-final match');
  });

  it('should have upcoming assignments with correct properties', async () => {
    const { result } = renderHook(() => useCurrentAssignment());

    await waitFor(() => {
      expect(result.current.upcomingAssignments).toHaveLength(2);
    });

    const upcomingAssignments = result.current.upcomingAssignments;
    
    // First upcoming assignment
    expect(upcomingAssignments[0].id).toBe('upcoming-001');
    expect(upcomingAssignments[0].homeTeam).toBe('Wave Riders');
    expect(upcomingAssignments[0].awayTeam).toBe('Coastal Crushers');
    expect(upcomingAssignments[0].status).toBe('upcoming');
    
    // Second upcoming assignment
    expect(upcomingAssignments[1].id).toBe('upcoming-002');
    expect(upcomingAssignments[1].homeTeam).toBe('Spike Masters');
    expect(upcomingAssignments[1].awayTeam).toBe('Net Ninjas');
    expect(upcomingAssignments[1].importance).toBe('high');
  });

  it('should refresh assignments when refreshAssignments is called', async () => {
    const { result } = renderHook(() => useCurrentAssignment());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    const initialLastUpdated = result.current.lastUpdated;

    // Wait a bit to ensure time difference
    await new Promise(resolve => setTimeout(resolve, 10));

    await act(async () => {
      result.current.refreshAssignments();
    });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.lastUpdated?.getTime()).toBeGreaterThan(
      initialLastUpdated?.getTime() || 0
    );
  });

  it('should update assignment status', async () => {
    const { result } = renderHook(() => useCurrentAssignment());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

    await act(async () => {
      result.current.updateAssignmentStatus('current-001', 'completed');
    });

    expect(consoleSpy).toHaveBeenCalledWith(
      'Updating assignment current-001 status to completed'
    );

    consoleSpy.mockRestore();
  });

  it('should handle error states gracefully', async () => {
    // Mock setTimeout to simulate error
    const originalSetTimeout = global.setTimeout;
    global.setTimeout = jest.fn().mockImplementation((callback) => {
      throw new Error('Network error');
    });

    const { result } = renderHook(() => useCurrentAssignment());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.error).toBeDefined();
    expect(result.current.currentAssignment).toBe(null);
    expect(result.current.upcomingAssignments).toEqual([]);

    // Restore original setTimeout
    global.setTimeout = originalSetTimeout;
  });

  it('should provide refresh and update functions', () => {
    const { result } = renderHook(() => useCurrentAssignment());

    expect(typeof result.current.refreshAssignments).toBe('function');
    expect(typeof result.current.updateAssignmentStatus).toBe('function');
  });

  it('should maintain consistent data structure', async () => {
    const { result } = renderHook(() => useCurrentAssignment());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    // Verify all assignments have required fields
    const allAssignments = [
      result.current.currentAssignment,
      ...result.current.upcomingAssignments
    ].filter(Boolean);

    allAssignments.forEach(assignment => {
      expect(assignment).toHaveProperty('id');
      expect(assignment).toHaveProperty('homeTeam');
      expect(assignment).toHaveProperty('awayTeam');
      expect(assignment).toHaveProperty('matchTime');
      expect(assignment).toHaveProperty('refereePosition');
      expect(assignment).toHaveProperty('status');
      expect(assignment).toHaveProperty('courtNumber');
      expect(assignment?.matchTime).toBeInstanceOf(Date);
    });
  });
});