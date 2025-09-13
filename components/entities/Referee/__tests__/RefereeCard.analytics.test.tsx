import React from 'react';
import { render, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { RefereeCard } from '../RefereeCard';
import { EventReferee } from '../../../../types/referee-v2';

// Mock the useRefereeAnalytics hook
jest.mock('../../../../hooks/useRefereeAnalytics', () => ({
  useRefereeAnalytics: jest.fn()
}));

// Mock AnalyticsService
jest.mock('../../../../services/AnalyticsService', () => ({
  AnalyticsService: {
    getInstance: jest.fn(() => ({
      aggregateRefereeAnalytics: jest.fn()
    }))
  }
}));

const mockReferee: EventReferee = {
  id: 'test-referee-123',
  noOfficial: 12345,
  firstName: 'Test',
  lastName: 'Referee',
  fullName: 'Test Referee',
  gender: 'M',
  federationCode: 'FIVB',
  birthdate: '1985-01-01',
  age: 38,
  type: 'Referee1',
  status: 'Active',
  theoryTest: 'Level 3',
  strongPoints: 'Leadership, Communication',
  assignments: []
};

describe('RefereeCard Analytics', () => {
  let queryClient: QueryClient;
  
  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false }
      }
    });
    jest.clearAllMocks();
  });

  afterEach(() => {
    queryClient.clear();
  });

  const renderWithProvider = (component: React.ReactElement) => {
    return render(
      <QueryClientProvider client={queryClient}>
        {component}
      </QueryClientProvider>
    );
  };

  it('should request analytics for specific referee ID when showStatistics is true', async () => {
    const { useRefereeAnalytics } = require('../../../../hooks/useRefereeAnalytics');
    
    // Mock the hook to return loading state
    useRefereeAnalytics.mockReturnValue({
      data: null,
      isLoading: true
    });

    renderWithProvider(
      <RefereeCard 
        referee={mockReferee} 
        showStatistics={true}
      />
    );

    await waitFor(() => {
      expect(useRefereeAnalytics).toHaveBeenCalledWith(
        { refereeIds: ['test-referee-123'] },
        {
          enabled: true,
          cacheStrategy: 'historical',
          enablePerformanceMonitoring: true
        }
      );
    });
  });

  it('should display loading state when analytics are loading', async () => {
    const { useRefereeAnalytics } = require('../../../../hooks/useRefereeAnalytics');
    
    useRefereeAnalytics.mockReturnValue({
      data: null,
      isLoading: true
    });

    const { getByText } = renderWithProvider(
      <RefereeCard 
        referee={mockReferee} 
        showStatistics={true}
      />
    );

    await waitFor(() => {
      expect(getByText('Loading stats...')).toBeTruthy();
    });
  });

  it('should display correct referee stats when analytics data is available', async () => {
    const { useRefereeAnalytics } = require('../../../../hooks/useRefereeAnalytics');
    
    const mockAnalyticsData = {
      data: [{
        referee_id: 'test-referee-123',
        total_assignments: 25,
        first_referee_count: 15,
        second_referee_count: 8,
        challenge_referee_count: 2,
        tournaments_worked: ['TOUR1', 'TOUR2', 'TOUR3'],
        completion_rate: 0.96,
        performance_score: 85
      }]
    };

    useRefereeAnalytics.mockReturnValue({
      data: mockAnalyticsData,
      isLoading: false
    });

    const { getByText } = renderWithProvider(
      <RefereeCard 
        referee={mockReferee} 
        showStatistics={true}
      />
    );

    await waitFor(() => {
      expect(getByText('25')).toBeTruthy(); // total assignments
      expect(getByText('3')).toBeTruthy(); // tournaments worked
      expect(getByText('96%')).toBeTruthy(); // completion rate
      expect(getByText('15')).toBeTruthy(); // first referee count
      expect(getByText('8')).toBeTruthy(); // second referee count
      expect(getByText('2')).toBeTruthy(); // challenge referee count
    });
  });

  it('should display warning when analytics data is for wrong referee', async () => {
    const { useRefereeAnalytics } = require('../../../../hooks/useRefereeAnalytics');
    
    const mockAnalyticsData = {
      data: [{
        referee_id: 'different-referee-456', // Wrong referee ID
        total_assignments: 185,
        first_referee_count: 185,
        second_referee_count: 0,
        challenge_referee_count: 0,
        tournaments_worked: ['TOUR1'],
        completion_rate: 1.0,
        performance_score: 100
      }]
    };

    useRefereeAnalytics.mockReturnValue({
      data: mockAnalyticsData,
      isLoading: false
    });

    const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();

    const { getByText } = renderWithProvider(
      <RefereeCard 
        referee={mockReferee} 
        showStatistics={true}
      />
    );

    await waitFor(() => {
      expect(getByText('Statistics unavailable')).toBeTruthy();
      expect(consoleSpy).toHaveBeenCalledWith(
        'RefereeCard: Analytics data mismatch for referee:', 
        'test-referee-123', 
        'Got data for:', 
        'different-referee-456'
      );
    });

    consoleSpy.mockRestore();
  });

  it('should not request analytics when showStatistics is false', () => {
    const { useRefereeAnalytics } = require('../../../../hooks/useRefereeAnalytics');
    
    useRefereeAnalytics.mockReturnValue({
      data: null,
      isLoading: false
    });

    renderWithProvider(
      <RefereeCard 
        referee={mockReferee} 
        showStatistics={false}
      />
    );

    expect(useRefereeAnalytics).toHaveBeenCalledWith(
      undefined, // No filters when showStatistics is false
      {
        enabled: false,
        cacheStrategy: 'historical',
        enablePerformanceMonitoring: true
      }
    );
  });
});