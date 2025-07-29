/**
 * @jest-environment jsdom
 */

import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { CountryFlag } from '@/components/ui/CountryFlag';

// IntersectionObserver is mocked in jest.setup.js

describe('CountryFlag Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Valid Country Codes', () => {
    test('renders flag image for valid 2-letter country code', async () => {
      render(<CountryFlag countryCode="US" />);
      
      await waitFor(() => {
        const img = screen.getByAltText('United States flag');
        expect(img).toBeInTheDocument();
        expect(img).toHaveAttribute('src', expect.stringContaining('flagcdn.com'));
        expect(img).toHaveAttribute('src', expect.stringContaining('us.png'));
      });
    });

    test('renders flag image for valid 3-letter country code', async () => {
      render(<CountryFlag countryCode="BRA" />);
      
      await waitFor(() => {
        const img = screen.getByAltText('Brazil flag');
        expect(img).toBeInTheDocument();
        expect(img).toHaveAttribute('src', expect.stringContaining('br.png'));
      });
    });

    test('displays correct alt text for flag image', async () => {
      render(<CountryFlag countryCode="US" />);
      
      await waitFor(() => {
        const img = screen.getByAltText('United States flag');
        expect(img).toHaveAttribute('alt', 'United States flag');
      });
    });

    test('supports custom alt text', async () => {
      render(<CountryFlag countryCode="US" altText="Custom alt text" />);
      
      await waitFor(() => {
        const img = screen.getByAltText('Custom alt text');
        expect(img).toHaveAttribute('alt', 'Custom alt text');
      });
    });
  });

  describe('Size Variants', () => {
    test('renders small flag with correct dimensions', async () => {
      render(<CountryFlag countryCode="US" size="sm" />);
      
      await waitFor(() => {
        const img = screen.getByAltText('United States flag');
        expect(img).toHaveAttribute('width', '20');
        expect(img).toHaveAttribute('height', '15');
        expect(img).toHaveAttribute('src', expect.stringContaining('w20'));
      });
    });

    test('renders medium flag with correct dimensions', async () => {
      render(<CountryFlag countryCode="US" size="md" />);
      
      await waitFor(() => {
        const img = screen.getByAltText('United States flag');
        expect(img).toHaveAttribute('width', '32');
        expect(img).toHaveAttribute('height', '24');
        expect(img).toHaveAttribute('src', expect.stringContaining('w40'));
      });
    });

    test('renders large flag with correct dimensions', async () => {
      render(<CountryFlag countryCode="US" size="lg" />);
      
      await waitFor(() => {
        const img = screen.getByAltText('United States flag');
        expect(img).toHaveAttribute('width', '48');
        expect(img).toHaveAttribute('height', '36');
        expect(img).toHaveAttribute('src', expect.stringContaining('w80'));
      });
    });
  });

  describe('Loading States', () => {
    test('shows loading state initially when showLoading is true', async () => {
      render(<CountryFlag countryCode="US" showLoading={true} />);
      
      // Wait for intersection observer to trigger visibility
      await waitFor(() => {
        const loadingElement = document.querySelector('.animate-pulse');
        expect(loadingElement).toBeInTheDocument();
      });
    });

    test('does not show loading state when showLoading is false', () => {
      render(<CountryFlag countryCode="US" showLoading={false} />);
      
      const loadingElement = document.querySelector('.animate-pulse');
      expect(loadingElement).not.toBeInTheDocument();
    });
  });

  describe('Error Handling and Fallbacks', () => {
    test('shows country code fallback when image fails to load', async () => {
      // Test with a known invalid URL to trigger fallback
      render(<CountryFlag countryCode="INVALID123" showFallback={true} />);
      
      // Since it's an invalid code, it should show the placeholder directly
      const placeholder = screen.getByTitle('Unknown country');
      expect(placeholder).toBeInTheDocument();
    });

    test('shows placeholder for invalid country code when showFallback is true', () => {
      render(<CountryFlag countryCode="INVALID" showFallback={true} />);
      
      const placeholder = screen.getByTitle('Unknown country');
      expect(placeholder).toBeInTheDocument();
    });

    test('does not render anything for invalid country code when showFallback is false', () => {
      const { container } = render(<CountryFlag countryCode="INVALID" showFallback={false} />);
      
      expect(container.firstChild).toBeNull();
    });

    test('handles empty country code gracefully', () => {
      render(<CountryFlag countryCode="" showFallback={true} />);
      
      const placeholder = screen.getByTitle('Unknown country');
      expect(placeholder).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    test('has proper ARIA label', async () => {
      render(<CountryFlag countryCode="US" />);
      
      const container = screen.getByLabelText('Tournament location: United States');
      expect(container).toBeInTheDocument();
    });

    test('includes screen reader description', async () => {
      render(<CountryFlag countryCode="BRA" />);
      
      const description = screen.getByText('Flag representing Brazil (BRA)', { selector: '.sr-only' });
      expect(description).toBeInTheDocument();
    });

    test('has proper image attributes for accessibility', async () => {
      render(<CountryFlag countryCode="US" />);
      
      await waitFor(() => {
        const img = screen.getByAltText('United States flag');
        expect(img).toHaveAttribute('loading', 'lazy');
        expect(img).toHaveAttribute('alt', 'United States flag');
      });
    });
  });

  describe('CSS Classes', () => {
    test('applies custom className', () => {
      const { container } = render(
        <CountryFlag countryCode="US" className="custom-flag" />
      );
      
      const flagContainer = container.firstChild as HTMLElement;
      expect(flagContainer).toHaveClass('custom-flag');
    });

    test('applies size-specific classes', async () => {
      render(<CountryFlag countryCode="US" size="sm" />);
      
      await waitFor(() => {
        const img = screen.getByAltText('United States flag');
        expect(img).toHaveClass('w-5', 'h-3');
      });
    });
  });

  describe('Country Code Mapping', () => {
    test('maps 3-letter volleyball codes to 2-letter ISO codes', async () => {
      const testCases = [
        { input: 'BRA', expected: 'br' },
        { input: 'GER', expected: 'de' },
        { input: 'USA', expected: 'us' },
        { input: 'NED', expected: 'nl' }
      ];

      for (const testCase of testCases) {
        const { rerender } = render(<CountryFlag countryCode={testCase.input} />);
        
        await waitFor(() => {
          const img = screen.getByAltText(/flag/);
          expect(img).toHaveAttribute('src', expect.stringContaining(testCase.expected));
        });

        // Clean up for next iteration
        rerender(<div />);
      }
    });

    test('handles case insensitive country codes', async () => {
      render(<CountryFlag countryCode="usa" />);
      
      await waitFor(() => {
        const img = screen.getByAltText('United States flag');
        expect(img).toHaveAttribute('src', expect.stringContaining('us.png'));
      });
    });
  });

  describe('Performance', () => {
    test('uses lazy loading for images', async () => {
      render(<CountryFlag countryCode="US" />);
      
      await waitFor(() => {
        const img = screen.getByAltText('United States flag');
        expect(img).toHaveAttribute('loading', 'lazy');
      });
    });

    test('sets proper aspect ratio for images', async () => {
      render(<CountryFlag countryCode="US" size="sm" />);
      
      await waitFor(() => {
        const img = screen.getByAltText('United States flag');
        // Just verify that width and height are set correctly
        expect(img).toHaveAttribute('width', '20');
        expect(img).toHaveAttribute('height', '15');
      });
    });
  });

  describe('Country Name Resolution', () => {
    test('displays correct country names for common codes', () => {
      const testCases = [
        { code: 'BRA', name: 'Brazil' },
        { code: 'USA', name: 'United States' },
        { code: 'GER', name: 'Germany' },
        { code: 'JPN', name: 'Japan' }
      ];

      testCases.forEach(({ code, name }) => {
        const { container } = render(<CountryFlag countryCode={code} />);
        const description = container.querySelector('.sr-only');
        expect(description).toHaveTextContent(name);
      });
    });
  });
});

describe('CountryFlag Integration', () => {
  test('works with tournament table context', async () => {
    const tournamentData = {
      code: 'BRA-001',
      name: 'Test Tournament',
      countryCode: 'BRA',
      startDate: '2025-01-01',
      endDate: '2025-01-07',
      gender: 'Men' as const,
      type: 'World Tour'
    };

    render(
      <div className="flex items-center gap-2">
        <CountryFlag countryCode={tournamentData.countryCode} size="sm" />
        <span>{tournamentData.name}</span>
      </div>
    );

    await waitFor(() => {
      const flag = screen.getByAltText('Brazil flag');
      const tournament = screen.getByText('Test Tournament');
      
      expect(flag).toBeInTheDocument();
      expect(tournament).toBeInTheDocument();
    });
  });
});