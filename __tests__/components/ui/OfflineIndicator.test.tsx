import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { OfflineIndicator, FloatingOfflineIndicator } from '@/components/ui/OfflineIndicator';

// Mock the useOfflineState hook
jest.mock('@/hooks/useResponsiveDesign', () => ({
  useOfflineState: jest.fn(),
}));

const mockUseOfflineState = require('@/hooks/useResponsiveDesign').useOfflineState;

describe('OfflineIndicator', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should not render when online with fast connection and no details', () => {
    mockUseOfflineState.mockReturnValue({
      isOffline: false,
      connectionQuality: 'fast',
      lastOnlineTime: new Date(),
      testConnectionQuality: jest.fn(),
    });

    const { container } = render(<OfflineIndicator />);
    expect(container.firstChild).toBeNull();
  });

  it('should render badge when offline', () => {
    mockUseOfflineState.mockReturnValue({
      isOffline: true,
      connectionQuality: 'offline',
      lastOnlineTime: new Date(),
      testConnectionQuality: jest.fn(),
    });

    render(<OfflineIndicator />);
    expect(screen.getByText('Offline')).toBeInTheDocument();
  });

  it('should render badge when connection is slow', () => {
    mockUseOfflineState.mockReturnValue({
      isOffline: false,
      connectionQuality: 'slow',
      lastOnlineTime: new Date(),
      testConnectionQuality: jest.fn(),
    });

    render(<OfflineIndicator />);
    expect(screen.getByText(/Online \(Slow\)/)).toBeInTheDocument();
  });

  it('should show detailed offline alert when showDetails is true and offline', () => {
    mockUseOfflineState.mockReturnValue({
      isOffline: true,
      connectionQuality: 'offline',
      lastOnlineTime: new Date(Date.now() - 300000), // 5 minutes ago
      testConnectionQuality: jest.fn(),
    });

    render(<OfflineIndicator showDetails={true} />);
    
    expect(screen.getByText('No Internet Connection')).toBeInTheDocument();
    expect(screen.getByText(/Tournament data may be outdated/)).toBeInTheDocument();
    expect(screen.getByText(/Last online:/)).toBeInTheDocument();
  });

  it('should show detailed slow connection alert when showDetails is true and slow', () => {
    mockUseOfflineState.mockReturnValue({
      isOffline: false,
      connectionQuality: 'slow',
      lastOnlineTime: new Date(),
      testConnectionQuality: jest.fn(),
    });

    render(<OfflineIndicator showDetails={true} />);
    
    expect(screen.getByText('Slow Connection Detected')).toBeInTheDocument();
    expect(screen.getByText(/Tournament venue networks can be slow/)).toBeInTheDocument();
  });

  it('should handle retry button click', async () => {
    const mockTestConnection = jest.fn().mockResolvedValue('fast');
    const mockOnRetry = jest.fn();
    
    mockUseOfflineState.mockReturnValue({
      isOffline: true,
      connectionQuality: 'offline',
      lastOnlineTime: new Date(),
      testConnectionQuality: mockTestConnection,
    });

    render(<OfflineIndicator showDetails={true} onRetry={mockOnRetry} />);
    
    const retryButton = screen.getByText('Retry Connection');
    fireEvent.click(retryButton);

    await waitFor(() => {
      expect(mockTestConnection).toHaveBeenCalled();
      expect(mockOnRetry).toHaveBeenCalled();
    });
  });

  it('should show testing state when retry is clicked', async () => {
    const mockTestConnection = jest.fn().mockImplementation(
      () => new Promise(resolve => setTimeout(() => resolve('fast'), 100))
    );
    
    mockUseOfflineState.mockReturnValue({
      isOffline: true,
      connectionQuality: 'offline',
      lastOnlineTime: new Date(),
      testConnectionQuality: mockTestConnection,
    });

    render(<OfflineIndicator showDetails={true} onRetry={jest.fn()} />);
    
    const retryButton = screen.getByText('Retry Connection');
    fireEvent.click(retryButton);

    expect(screen.getByText('Testing...')).toBeInTheDocument();
    
    await waitFor(() => {
      expect(mockTestConnection).toHaveBeenCalled();
    });
  });

  it('should format last online time correctly', () => {
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
    
    mockUseOfflineState.mockReturnValue({
      isOffline: true,
      connectionQuality: 'offline',
      lastOnlineTime: fiveMinutesAgo,
      testConnectionQuality: jest.fn(),
    });

    render(<OfflineIndicator showDetails={true} />);
    
    expect(screen.getByText('Last online: 5m ago')).toBeInTheDocument();
  });

  it('should show "Just now" for recent connections', () => {
    const justNow = new Date(Date.now() - 30000); // 30 seconds ago
    
    mockUseOfflineState.mockReturnValue({
      isOffline: true,
      connectionQuality: 'offline',
      lastOnlineTime: justNow,
      testConnectionQuality: jest.fn(),
    });

    render(<OfflineIndicator showDetails={true} />);
    
    expect(screen.getByText('Last online: Just now')).toBeInTheDocument();
  });
});

describe('FloatingOfflineIndicator', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should not render when online with fast connection', () => {
    mockUseOfflineState.mockReturnValue({
      isOffline: false,
      connectionQuality: 'fast',
      lastOnlineTime: new Date(),
      testConnectionQuality: jest.fn(),
    });

    const { container } = render(<FloatingOfflineIndicator />);
    expect(container.firstChild).toBeNull();
  });

  it('should render when offline', () => {
    mockUseOfflineState.mockReturnValue({
      isOffline: true,
      connectionQuality: 'offline',
      lastOnlineTime: new Date(),
      testConnectionQuality: jest.fn(),
    });

    render(<FloatingOfflineIndicator />);
    
    expect(screen.getByText('No Internet Connection')).toBeInTheDocument();
  });

  it('should render when connection is slow', () => {
    mockUseOfflineState.mockReturnValue({
      isOffline: false,
      connectionQuality: 'slow',
      lastOnlineTime: new Date(),
      testConnectionQuality: jest.fn(),
    });

    render(<FloatingOfflineIndicator />);
    
    expect(screen.getByText('Slow Connection Detected')).toBeInTheDocument();
  });

  it('should have fixed positioning classes', () => {
    mockUseOfflineState.mockReturnValue({
      isOffline: true,
      connectionQuality: 'offline',
      lastOnlineTime: new Date(),
      testConnectionQuality: jest.fn(),
    });

    const { container } = render(<FloatingOfflineIndicator />);
    const floatingElement = container.firstChild;
    
    expect(floatingElement).toHaveClass('fixed', 'bottom-4', 'left-4', 'right-4', 'z-50');
  });
});