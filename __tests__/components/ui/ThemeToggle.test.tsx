import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { ThemeToggle, MobileThemeToggle, ThemeToggleBadge } from '@/components/ui/ThemeToggle';

// Mock the useTheme hook from next-themes
jest.mock('next-themes', () => ({
  useTheme: jest.fn(),
}));

// Mock the useResponsiveDesign hook
jest.mock('@/hooks/useResponsiveDesign', () => ({
  useResponsiveDesign: jest.fn(),
}));

const mockUseTheme = require('next-themes').useTheme;
const mockUseResponsiveDesign = require('@/hooks/useResponsiveDesign').useResponsiveDesign;

describe('ThemeToggle', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Default mocks
    mockUseTheme.mockReturnValue({
      theme: 'light',
      setTheme: jest.fn(),
    });
    
    mockUseResponsiveDesign.mockReturnValue({
      isHighContrast: false,
      toggleHighContrast: jest.fn(),
      screenSize: 'desktop',
    });
  });

  it('should render dropdown menu button by default', () => {
    render(<ThemeToggle />);
    
    const button = screen.getByRole('button');
    expect(button).toBeInTheDocument();
    expect(button).toHaveAttribute('aria-label', 'Theme and accessibility options');
  });

  it('should show current theme icon', () => {
    mockUseTheme.mockReturnValue({
      theme: 'dark',
      setTheme: jest.fn(),
    });

    render(<ThemeToggle />);
    
    // The Moon icon should be present for dark theme
    const moonIcon = screen.getByRole('button').querySelector('svg');
    expect(moonIcon).toBeInTheDocument();
  });

  it('should show high contrast indicator when enabled', () => {
    mockUseResponsiveDesign.mockReturnValue({
      isHighContrast: true,
      toggleHighContrast: jest.fn(),
      screenSize: 'desktop',
    });

    render(<ThemeToggle />);
    
    const button = screen.getByRole('button');
    expect(button.querySelector('svg')).toBeInTheDocument(); // High contrast icon
  });

  it('should show label when showLabel is true', () => {
    mockUseResponsiveDesign.mockReturnValue({
      isHighContrast: true,
      toggleHighContrast: jest.fn(),
      screenSize: 'desktop',
    });

    render(<ThemeToggle showLabel={true} />);
    
    expect(screen.getByText(/High Contrast/)).toBeInTheDocument();
  });

  it('should render dropdown trigger with proper accessibility', () => {
    render(<ThemeToggle />);
    
    const button = screen.getByRole('button');
    expect(button).toHaveAttribute('aria-label', 'Theme and accessibility options');
    expect(button).toHaveAttribute('aria-haspopup', 'menu');
  });
});

describe('MobileThemeToggle', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    mockUseTheme.mockReturnValue({
      theme: 'light',
      setTheme: jest.fn(),
    });
    
    mockUseResponsiveDesign.mockReturnValue({
      isHighContrast: false,
      toggleHighContrast: jest.fn(),
      screenSize: 'mobile',
    });
  });

  it('should render minimal variant without label', () => {
    render(<MobileThemeToggle />);
    
    const button = screen.getByRole('button');
    expect(button).toBeInTheDocument();
    expect(button).toHaveAttribute('aria-label', expect.stringContaining('Toggle high contrast mode'));
  });

  it('should call toggleHighContrast when clicked', () => {
    const mockToggleHighContrast = jest.fn();
    mockUseResponsiveDesign.mockReturnValue({
      isHighContrast: false,
      toggleHighContrast: mockToggleHighContrast,
      screenSize: 'mobile',
    });

    render(<MobileThemeToggle />);
    
    const button = screen.getByRole('button');
    fireEvent.click(button);
    
    expect(mockToggleHighContrast).toHaveBeenCalled();
  });
});

describe('ThemeToggleBadge', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    mockUseTheme.mockReturnValue({
      theme: 'light',
      setTheme: jest.fn(),
    });
    
    mockUseResponsiveDesign.mockReturnValue({
      isHighContrast: false,
      toggleHighContrast: jest.fn(),
      screenSize: 'desktop',
    });
  });

  it('should render as badge variant', () => {
    render(<ThemeToggleBadge />);
    
    const badge = screen.getByText('Standard');
    expect(badge).toBeInTheDocument();
    // Badge component doesn't have role="button", but should have cursor-pointer class
    expect(badge.closest('.cursor-pointer')).toBeTruthy();
  });

  it('should show high contrast text when enabled', () => {
    mockUseResponsiveDesign.mockReturnValue({
      isHighContrast: true,
      toggleHighContrast: jest.fn(),
      screenSize: 'desktop',
    });

    render(<ThemeToggleBadge />);
    
    expect(screen.getByText('High Contrast')).toBeInTheDocument();
  });

  it('should call toggleHighContrast when clicked', () => {
    const mockToggleHighContrast = jest.fn();
    mockUseResponsiveDesign.mockReturnValue({
      isHighContrast: false,
      toggleHighContrast: mockToggleHighContrast,
      screenSize: 'desktop',
    });

    render(<ThemeToggleBadge />);
    
    const badge = screen.getByText('Standard').closest('.cursor-pointer');
    fireEvent.click(badge);
    
    expect(mockToggleHighContrast).toHaveBeenCalled();
  });

  it('should use different badge variant based on high contrast state', () => {
    // Test standard state
    render(<ThemeToggleBadge />);
    let badge = screen.getByText('Standard').closest('.cursor-pointer');
    expect(badge).toBeTruthy();
    
    // Test high contrast state
    mockUseResponsiveDesign.mockReturnValue({
      isHighContrast: true,
      toggleHighContrast: jest.fn(),
      screenSize: 'desktop',
    });
    
    const { rerender } = render(<ThemeToggleBadge />);
    rerender(<ThemeToggleBadge />);
    
    badge = screen.getByText('High Contrast').closest('.cursor-pointer');
    expect(badge).toBeTruthy();
  });
});