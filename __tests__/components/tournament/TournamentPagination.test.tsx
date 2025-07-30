import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { TournamentPagination } from '@/components/tournament/TournamentPagination';
import { useResponsiveDesign } from '@/hooks/useResponsiveDesign';

// Mock the useResponsiveDesign hook
jest.mock('@/hooks/useResponsiveDesign');

const mockUseResponsiveDesign = useResponsiveDesign as jest.MockedFunction<typeof useResponsiveDesign>;

describe('TournamentPagination', () => {
  const mockOnPageChange = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseResponsiveDesign.mockReturnValue({
      screenSize: 'desktop',
      isHighContrast: false,
      isOffline: false,
      connectionQuality: 'fast',
      devicePixelRatio: 1,
      touchCapable: false,
      reducedMotion: false,
      toggleHighContrast: jest.fn(),
      setHighContrast: jest.fn(),
      testConnectionQuality: jest.fn(),
      isMobile: () => false,
      isTablet: () => false,
      isDesktop: () => true,
      getTouchTargetSize: () => 44,
      getOptimizedImageSize: (size: number) => size,
    });
  });

  describe('Desktop Behavior', () => {
    it('renders desktop numbered pagination correctly', () => {
      render(
        <TournamentPagination
          currentPage={3}
          totalPages={10}
          onPageChange={mockOnPageChange}
        />
      );

      // Check for numbered page buttons
      expect(screen.getByText('3')).toBeInTheDocument();
      expect(screen.getByText('Previous')).toBeInTheDocument();
      expect(screen.getByText('Next')).toBeInTheDocument();
      
      // Check page info display
      expect(screen.getByText('Page 3 of 10 (10 total)')).toBeInTheDocument();
    });

    it('handles page navigation correctly on desktop', async () => {
      render(
        <TournamentPagination
          currentPage={3}
          totalPages={10}
          onPageChange={mockOnPageChange}
        />
      );

      // Click on page 5
      const page5Button = screen.getByText('5');
      fireEvent.click(page5Button);

      await waitFor(() => {
        expect(mockOnPageChange).toHaveBeenCalledWith(5);
      });
    });

    it('disables previous button on first page', () => {
      render(
        <TournamentPagination
          currentPage={1}
          totalPages={10}
          onPageChange={mockOnPageChange}
        />
      );

      const previousButton = screen.getByLabelText(/go to previous page/i);
      expect(previousButton).toHaveClass('cursor-not-allowed', 'opacity-50');
      expect(previousButton).toHaveAttribute('aria-disabled', 'true');
    });

    it('disables next button on last page', () => {
      render(
        <TournamentPagination
          currentPage={10}
          totalPages={10}
          onPageChange={mockOnPageChange}
        />
      );

      const nextButton = screen.getByLabelText(/go to next page/i);
      expect(nextButton).toHaveClass('cursor-not-allowed', 'opacity-50');
      expect(nextButton).toHaveAttribute('aria-disabled', 'true');
    });
  });

  describe('Mobile Behavior', () => {
    beforeEach(() => {
      mockUseResponsiveDesign.mockReturnValue({
        screenSize: 'mobile',
        isHighContrast: false,
        isOffline: false,
        connectionQuality: 'fast',  
        devicePixelRatio: 1,
        touchCapable: true,
        reducedMotion: false,
        toggleHighContrast: jest.fn(),
        setHighContrast: jest.fn(),
        testConnectionQuality: jest.fn(),
        isMobile: () => true,
        isTablet: () => false,
        isDesktop: () => false,
        getTouchTargetSize: () => 48, // Enhanced touch targets for mobile
        getOptimizedImageSize: (size: number) => size,
      });
    });

    it('renders mobile controls with enhanced touch targets', () => {
      render(
        <TournamentPagination
          currentPage={3}
          totalPages={10}
          onPageChange={mockOnPageChange}
        />
      );

      // Check for mobile-specific elements
      expect(screen.getByText('Page 3 of 10')).toBeInTheDocument();
      expect(screen.getByText('10 pages total')).toBeInTheDocument();
      
      // Check for touch target classes
      const buttons = screen.getAllByRole('button');
      buttons.forEach(button => {
        expect(button).toHaveClass('touch-target-enhanced');
        expect(button).toHaveClass('min-h-[48px]');
      });
    });

    it('handles mobile navigation correctly', async () => {
      render(
        <TournamentPagination
          currentPage={3}
          totalPages={10}
          onPageChange={mockOnPageChange}
        />
      );

      // Click next button
      const nextButton = screen.getByRole('button', { name: /next/i });
      fireEvent.click(nextButton);

      await waitFor(() => {
        expect(mockOnPageChange).toHaveBeenCalledWith(4);
      });

      // Click previous button  
      const prevButton = screen.getByRole('button', { name: /prev/i });
      fireEvent.click(prevButton);

      await waitFor(() => {
        expect(mockOnPageChange).toHaveBeenCalledWith(2);
      });
    });

    it('shows text on mobile screens', () => {
      render(
        <TournamentPagination
          currentPage={3}
          totalPages={10}
          onPageChange={mockOnPageChange}
        />
      );

      // Check that mobile uses appropriate button text
      expect(screen.getByText('Prev')).toBeInTheDocument();
      expect(screen.getByText('Next')).toBeInTheDocument();
      expect(screen.getByText('Previous')).toBeInTheDocument();
    });
  });

  describe('Loading States', () => {
    it('shows loading state correctly', () => {
      render(
        <TournamentPagination
          currentPage={3}
          totalPages={10}
          onPageChange={mockOnPageChange}
          isLoading={true}
        />
      );

      expect(screen.getByText('Loading pages...')).toBeInTheDocument();
    });

    it('disables all controls when loading', () => {
      mockUseResponsiveDesign.mockReturnValue({
        screenSize: 'mobile',
        isHighContrast: false,
        isOffline: false,
        connectionQuality: 'fast',
        devicePixelRatio: 1,
        touchCapable: true,
        reducedMotion: false,
        toggleHighContrast: jest.fn(),
        setHighContrast: jest.fn(),
        testConnectionQuality: jest.fn(),
        isMobile: () => true,
        isTablet: () => false,
        isDesktop: () => false,
        getTouchTargetSize: () => 48,
        getOptimizedImageSize: (size: number) => size,
      });

      render(
        <TournamentPagination
          currentPage={3}
          totalPages={10}
          onPageChange={mockOnPageChange}
          isLoading={true}
        />
      );

      const buttons = screen.getAllByRole('button');
      buttons.forEach(button => {
        expect(button).toBeDisabled();
      });

      expect(screen.getByText('Loading...')).toBeInTheDocument();
    });
  });

  describe('Edge Cases', () => {
    it('does not render when totalPages is 1', () => {
      const { container } = render(
        <TournamentPagination
          currentPage={1}
          totalPages={1}
          onPageChange={mockOnPageChange}
        />
      );

      expect(container.firstChild).toBeNull();
    });

    it('does not render when totalPages is 0', () => {
      const { container } = render(
        <TournamentPagination
          currentPage={1}
          totalPages={0}
          onPageChange={mockOnPageChange}
        />
      );

      expect(container.firstChild).toBeNull();
    });

    it('handles large page numbers correctly', () => {
      render(
        <TournamentPagination
          currentPage={50}
          totalPages={100}
          onPageChange={mockOnPageChange}
        />
      );

      // Should show ellipsis for large ranges
      expect(screen.getByText('Page 50 of 100 (100 total)')).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('has proper ARIA labels', () => {
      render(
        <TournamentPagination
          currentPage={3}
          totalPages={10}
          onPageChange={mockOnPageChange}
        />
      );

      expect(screen.getByRole('navigation', { name: 'pagination' })).toBeInTheDocument();
    });

    it('marks current page as active', () => {
      render(
        <TournamentPagination
          currentPage={3}
          totalPages={10}
          onPageChange={mockOnPageChange}
        />
      );

      // Find the current page element (it might be a link or span)
      const currentPageElement = screen.getByText('3').closest('a');
      expect(currentPageElement).toHaveAttribute('aria-current', 'page');
    });

    it('has disabled state attributes when loading', () => {
      render(
        <TournamentPagination
          currentPage={3}
          totalPages={10}
          onPageChange={mockOnPageChange}
          isLoading={true}
        />
      );

      // Check specific elements that should have aria-disabled
      const previousButton = screen.getByLabelText(/go to previous page/i);
      const nextButton = screen.getByLabelText(/go to next page/i);
      
      expect(previousButton).toHaveAttribute('aria-disabled', 'true');
      expect(nextButton).toHaveAttribute('aria-disabled', 'true');
    });
  });
});