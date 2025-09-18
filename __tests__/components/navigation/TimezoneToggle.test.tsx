/**
 * Tests for TimezoneToggle Component
 * Phase 3 UI Implementation - Navigation Component Tests
 */

import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { TimezoneToggle } from '../../../components/navigation/TimezoneToggle';
import { TournamentStorageService } from '../../../services/TournamentStorageService';

// Mock dependencies
jest.mock('../../../services/TournamentStorageService', () => ({
  TournamentStorageService: {
    getUserPreferences: jest.fn(),
    saveUserPreferences: jest.fn(),
  },
}));

jest.mock('../../../components/Icons/MaterialCommunityIcons', () => ({
  Icon: ({ name, testID }: any) => {
    const { Text } = require('react-native');
    return <Text testID={testID || `icon-${name}`}>{name}</Text>;
  },
}));

const mockGetUserPreferences = TournamentStorageService.getUserPreferences as jest.MockedFunction<typeof TournamentStorageService.getUserPreferences>;
const mockSaveUserPreferences = TournamentStorageService.saveUserPreferences as jest.MockedFunction<typeof TournamentStorageService.saveUserPreferences>;

describe('TimezoneToggle Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    // Mock Intl.DateTimeFormat for consistent timezone testing
    global.Intl.DateTimeFormat = jest.fn(() => ({
      resolvedOptions: () => ({ timeZone: 'America/New_York' }),
    })) as any;

    // Default mock responses
    mockGetUserPreferences.mockResolvedValue({
      selectedCourt: undefined,
      notificationsEnabled: true,
      lastAppVersion: '1.0.0',
      onboardingCompleted: true,
      timezoneDisplayMode: 'user',
    });

    mockSaveUserPreferences.mockResolvedValue();
  });

  describe('Smart Conditional Rendering', () => {
    it('should not render when user and tournament timezones are the same', async () => {
      const { queryByTestId } = render(
        <TimezoneToggle
          tournamentTimezone="America/New_York" // Same as mocked user timezone
          visible={true}
        />
      );

      // Wait for async timezone detection to complete
      await waitFor(() => {
        expect(queryByTestId('timezone-toggle-container')).toBeNull();
      });
    });

    it('should render when user and tournament timezones are different', async () => {
      const { queryByTestId } = render(
        <TimezoneToggle
          tournamentTimezone="Europe/Rome" // Different from mocked user timezone
          visible={true}
        />
      );

      await waitFor(() => {
        expect(queryByTestId('timezone-toggle-container')).toBeTruthy();
      });
    });

    it('should not render when visible prop is false', () => {
      const { queryByTestId } = render(
        <TimezoneToggle
          tournamentTimezone="Europe/Rome"
          visible={false}
        />
      );

      expect(queryByTestId('timezone-toggle-container')).toBeNull();
    });
  });

  describe('Timezone Preference Management', () => {
    it('should load existing timezone preference from storage', async () => {
      mockGetUserPreferences.mockResolvedValue({
        selectedCourt: undefined,
        notificationsEnabled: true,
        lastAppVersion: '1.0.0',
        onboardingCompleted: true,
        timezoneDisplayMode: 'local', // User prefers local time
      });

      const { getByRole } = render(
        <TimezoneToggle
          tournamentTimezone="Europe/Rome"
          visible={true}
        />
      );

      await waitFor(() => {
        const switchElement = getByRole('switch');
        expect(switchElement.props.accessibilityState.checked).toBe(true);
      });
    });

    it('should save timezone preference when toggled', async () => {
      const onPreferenceChange = jest.fn();

      const { getByRole } = render(
        <TimezoneToggle
          tournamentTimezone="Europe/Rome"
          visible={true}
          onTimezonePreferenceChange={onPreferenceChange}
        />
      );

      await waitFor(() => {
        const switchElement = getByRole('switch');
        expect(switchElement).toBeTruthy();
      });

      const switchElement = getByRole('switch');
      fireEvent(switchElement, 'valueChange', true);

      await waitFor(() => {
        expect(mockSaveUserPreferences).toHaveBeenCalledWith({
          selectedCourt: undefined,
          notificationsEnabled: true,
          lastAppVersion: '1.0.0',
          onboardingCompleted: true,
          timezoneDisplayMode: 'local',
        });

        expect(onPreferenceChange).toHaveBeenCalledWith(true);
      });
    });

    it('should revert toggle state if save fails', async () => {
      mockSaveUserPreferences.mockRejectedValue(new Error('Storage error'));

      const { getByRole } = render(
        <TimezoneToggle
          tournamentTimezone="Europe/Rome"
          visible={true}
        />
      );

      await waitFor(() => {
        const switchElement = getByRole('switch');
        expect(switchElement.props.accessibilityState.checked).toBe(false);
      });

      const switchElement = getByRole('switch');
      fireEvent(switchElement, 'valueChange', true);

      await waitFor(() => {
        // Should revert to original state
        expect(switchElement.props.accessibilityState.checked).toBe(false);
      });
    });
  });

  describe('Accessibility Features', () => {
    it('should have proper accessibility labels and hints', async () => {
      const { getByRole } = render(
        <TimezoneToggle
          tournamentTimezone="Europe/Rome"
          visible={true}
        />
      );

      await waitFor(() => {
        const switchElement = getByRole('switch');
        expect(switchElement.props.accessibilityLabel).toContain('Timezone display mode');
        expect(switchElement.props.accessibilityHint).toContain('Tap to switch between');
      });
    });

    it('should update accessibility state when toggled', async () => {
      const { getByRole } = render(
        <TimezoneToggle
          tournamentTimezone="Europe/Rome"
          visible={true}
        />
      );

      await waitFor(() => {
        const switchElement = getByRole('switch');
        expect(switchElement.props.accessibilityState.checked).toBe(false);
      });

      const switchElement = getByRole('switch');
      fireEvent(switchElement, 'valueChange', true);

      await waitFor(() => {
        expect(switchElement.props.accessibilityState.checked).toBe(true);
      });
    });

    it('should have minimum touch target size', async () => {
      const { getByTestId } = render(
        <TimezoneToggle
          tournamentTimezone="Europe/Rome"
          visible={true}
        />
      );

      await waitFor(() => {
        const container = getByTestId('timezone-toggle-container');
        expect(container.props.style).toEqual(
          expect.objectContaining({
            minHeight: 52, // Minimum touch target
          })
        );
      });
    });
  });

  describe('Performance Considerations', () => {
    it('should render loading state quickly', () => {
      const { getByText } = render(
        <TimezoneToggle
          tournamentTimezone="Europe/Rome"
          visible={true}
        />
      );

      expect(getByText('Detecting timezone...')).toBeTruthy();
    });

    it('should handle timezone detection errors gracefully', async () => {
      mockGetUserPreferences.mockRejectedValue(new Error('Storage error'));

      const { getByText } = render(
        <TimezoneToggle
          tournamentTimezone="Europe/Rome"
          visible={true}
        />
      );

      await waitFor(() => {
        expect(getByText('Timezone detection failed')).toBeTruthy();
      });
    });

    it('should complete timezone detection under 200ms target', async () => {
      const startTime = Date.now();

      const { queryByText } = render(
        <TimezoneToggle
          tournamentTimezone="Europe/Rome"
          visible={true}
        />
      );

      await waitFor(() => {
        expect(queryByText('Detecting timezone...')).toBeNull();
      });

      const endTime = Date.now();
      const duration = endTime - startTime;

      // Should complete initialization well under 200ms
      expect(duration).toBeLessThan(200);
    });
  });

  describe('Error Handling', () => {
    it('should show error state when timezone detection fails', async () => {
      // Mock Intl.DateTimeFormat to throw an error
      global.Intl.DateTimeFormat = jest.fn(() => {
        throw new Error('Timezone error');
      }) as any;

      const { getByText } = render(
        <TimezoneToggle
          tournamentTimezone="Europe/Rome"
          visible={true}
        />
      );

      await waitFor(() => {
        expect(getByText('Timezone detection failed')).toBeTruthy();
      });
    });

    it('should handle missing tournament timezone gracefully', async () => {
      const { queryByTestId } = render(
        <TimezoneToggle
          tournamentTimezone={undefined}
          visible={true}
        />
      );

      await waitFor(() => {
        // Should still render because UTC !== user timezone
        expect(queryByTestId('timezone-toggle-container')).toBeTruthy();
      });
    });
  });

  describe('Integration with Tournament Context', () => {
    it('should display correct timezone labels', async () => {
      const { getByText } = render(
        <TimezoneToggle
          tournamentTimezone="Europe/Rome"
          visible={true}
        />
      );

      await waitFor(() => {
        expect(getByText('My Time')).toBeTruthy();
        expect(getByText('Your timezone (America/New_York)')).toBeTruthy();
      });
    });

    it('should switch to local time display when toggled', async () => {
      const { getByRole, getByText } = render(
        <TimezoneToggle
          tournamentTimezone="Europe/Rome"
          visible={true}
        />
      );

      await waitFor(() => {
        const switchElement = getByRole('switch');
        fireEvent(switchElement, 'valueChange', true);
      });

      await waitFor(() => {
        expect(getByText('Local Time')).toBeTruthy();
        expect(getByText('Tournament timezone (Europe/Rome)')).toBeTruthy();
      });
    });

    it('should show timezone indicator message', async () => {
      const { getByText } = render(
        <TimezoneToggle
          tournamentTimezone="Europe/Rome"
          visible={true}
        />
      );

      await waitFor(() => {
        expect(getByText('Times shown in your timezone')).toBeTruthy();
      });
    });
  });
});