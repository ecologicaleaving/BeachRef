import React from 'react';
import { render, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { TournamentList } from '../entities/Tournament/TournamentList';
import { useTournaments } from '../../hooks/useTournaments';

// Mock the hooks
jest.mock('../../hooks/useTournaments');
jest.mock('../../hooks/useNetworkStatus', () => ({
  useNetworkStatus: () => ({ isOffline: false, isConnected: true, isInitialized: true }),
}));
jest.mock('../../hooks/useOfflineStatus', () => ({
  useIsOfflineData: () => false,
}));
jest.mock('../../hooks/useDataFreshness', () => ({
  useDataFreshness: () => ({ lastUpdated: Date.now(), isStale: false }),
}));
jest.mock('../../hooks/useSyncManager', () => ({
  useAutoSync: () => {},
}));
jest.mock('../../hooks/useStorageManager', () => ({
  useStorageMonitoring: () => ({
    shouldShowAlert: false,
    alertMessage: '',
    dismissAlert: () => {},
    currentUsage: 0,
  }),
}));

// Mock components that might cause issues
jest.mock('../offline', () => ({
  NetworkStatus: () => null,
  OfflineBanner: () => null,
}));
jest.mock('../DataFreshness', () => ({
  DataFreshness: () => null,
}));
jest.mock('../SyncStatus', () => ({
  SyncStatus: () => null,
}));
jest.mock('../StorageAlert', () => ({
  StorageAlert: () => null,
}));
jest.mock('../tournament/TournamentStatusIndicator', () => ({
  TournamentStatusLegend: () => null,
}));
jest.mock('../Icons/IconLibrary', () => ({
  ActionIcons: { Tournament: () => null },
  UtilityIcons: { Refresh: () => null },
}));
jest.mock('../entities/Tournament/TournamentCard', () => ({
  TournamentCard: ({ tournament, onPress }: any) => {
    const React = require('react');
    const { Pressable, Text } = require('react-native');
    return React.createElement(Pressable, { onPress: () => onPress?.(tournament) },
      React.createElement(Text, {}, tournament.name)
    );
  },
}));

const mockUseTournaments = useTournaments as jest.MockedFunction<typeof useTournaments>;

const mockTournament = {
  id: '1',
  visNo: 'VIS001',
  code: 'FIVB2024M001',
  name: 'Test Tournament',
  gender: 'M' as const,
  tournamentType: 'FIVB' as const,
  dates: {
    startDate: '2024-01-01',
    endDate: '2024-01-07',
  },
  status: 'ACTIVE' as const,
  city: 'Test City',
  country: 'Test Country',
};

describe('TournamentList Migration', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });

    mockUseTournaments.mockReturnValue({
      data: [mockTournament],
      isLoading: false,
      isRefetching: false,
      error: null,
      source: 'database' as const,
      performance: { queryTime: 100, fallbackUsed: false },
      config: { enableRealTimeUpdates: true },
      forceRefresh: jest.fn(),
      clearCache: jest.fn(),
      setReadStrategy: jest.fn(),
      enableRealTime: jest.fn(),
      disableRealTime: jest.fn(),
      // Additional TanStack Query properties
      status: 'success' as const,
      fetchStatus: 'idle' as const,
      isSuccess: true,
      isError: false,
      isFetching: false,
      isInitialLoading: false,
      dataUpdatedAt: Date.now(),
      errorUpdatedAt: 0,
      failureCount: 0,
      failureReason: null,
      isFetched: true,
      isFetchedAfterMount: true,
      isPlaceholderData: false,
      isPending: false,
      isStale: false,
      refetch: jest.fn(),
      remove: jest.fn(),
    } as any);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should render tournaments using useTournaments hook', async () => {
    const mockOnPress = jest.fn();

    const { getByText } = render(
      React.createElement(QueryClientProvider, { client: queryClient },
        React.createElement(TournamentList, {
          onTournamentPress: mockOnPress,
        })
      )
    );

    await waitFor(() => {
      expect(getByText('Test Tournament')).toBeTruthy();
    });
  });

  it('should handle loading state from hook', () => {
    mockUseTournaments.mockReturnValue({
      data: [],
      isLoading: true,
      isRefetching: false,
      error: null,
      source: 'database' as const,
      performance: { queryTime: 0, fallbackUsed: false },
      config: { enableRealTimeUpdates: true },
      forceRefresh: jest.fn(),
      clearCache: jest.fn(),
      setReadStrategy: jest.fn(),
      enableRealTime: jest.fn(),
      disableRealTime: jest.fn(),
    } as any);

    const mockOnPress = jest.fn();

    const { getByText } = render(
      React.createElement(QueryClientProvider, { client: queryClient },
        React.createElement(TournamentList, {
          onTournamentPress: mockOnPress,
        })
      )
    );

    expect(getByText('Loading tournaments...')).toBeTruthy();
  });

  it('should handle error state from hook', () => {
    mockUseTournaments.mockReturnValue({
      data: [],
      isLoading: false,
      isRefetching: false,
      error: new Error('Test error'),
      source: 'database' as const,
      performance: { queryTime: 0, fallbackUsed: false },
      config: { enableRealTimeUpdates: true },
      forceRefresh: jest.fn(),
      clearCache: jest.fn(),
      setReadStrategy: jest.fn(),
      enableRealTime: jest.fn(),
      disableRealTime: jest.fn(),
    } as any);

    const mockOnPress = jest.fn();

    const { getByText } = render(
      React.createElement(QueryClientProvider, { client: queryClient },
        React.createElement(TournamentList, {
          onTournamentPress: mockOnPress,
        })
      )
    );

    expect(getByText('Test error')).toBeTruthy();
  });

  it('should call useTournaments with correct filters', () => {
    const mockOnPress = jest.fn();

    render(
      React.createElement(QueryClientProvider, { client: queryClient },
        React.createElement(TournamentList, {
          onTournamentPress: mockOnPress,
          filterByStatus: 'live',
        })
      )
    );

    expect(mockUseTournaments).toHaveBeenCalledWith(
      { status: 'ACTIVE' },
      {
        enableRealTimeUpdates: true,
        enablePerformanceMonitoring: true,
      }
    );
  });
});