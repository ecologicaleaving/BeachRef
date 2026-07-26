/**
 * Issue #71.
 *
 * `/analytics-dashboard` and `/analytics-settings` were blank pages. Both mount
 * `useAnalyticsSettings`, which called `LocalStorageManager.getInstance()` — a
 * static that does not exist — *during render*, so the component tree threw
 * before producing anything.
 *
 * Underneath that there was a second failure, of the kind issue #65 warned
 * about: even with a `LocalStorageManager` instance in hand, the hook called
 * `getItem`/`setItem`, which that class does not have either (its API is
 * `get`/`set(key, data, ttl)`/`delete`). Fixing only the first would have
 * traded a red error for a quieter blank page.
 *
 * These tests fail on both counts against the pre-fix hook:
 * the first two throw `LocalStorageManager.getInstance is not a function`;
 * the persistence test additionally proves settings reach storage.
 */

import { renderHook, waitFor, act } from '@testing-library/react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAnalyticsSettings } from '../../hooks/useAnalyticsSettings';

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);

describe('useAnalyticsSettings (issue #71)', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
    jest.clearAllMocks();
  });

  it('mounts without throwing and settles with settings', async () => {
    const { result } = renderHook(() => useAnalyticsSettings());

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.settings).not.toBeNull();
    expect(result.current.error).toBeNull();
  });

  it('writes the defaults to storage on first use', async () => {
    const { result } = renderHook(() => useAnalyticsSettings());

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    const stored = await AsyncStorage.getItem('@BeachRef:analytics_settings');
    expect(stored).toBeTruthy();
    expect(JSON.parse(stored as string)).toMatchObject({
      theme: 'auto',
      exportFormat: 'csv',
    });
  });

  it('persists an update and reads it back on the next mount', async () => {
    const first = renderHook(() => useAnalyticsSettings());
    await waitFor(() => expect(first.result.current.isLoading).toBe(false));

    await act(async () => {
      await first.result.current.updateSettings({ theme: 'dark' });
    });

    const second = renderHook(() => useAnalyticsSettings());
    await waitFor(() => expect(second.result.current.isLoading).toBe(false));

    expect(second.result.current.settings?.theme).toBe('dark');
  });
});
