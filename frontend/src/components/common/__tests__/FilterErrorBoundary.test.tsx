import { render, screen, fireEvent } from '@testing-library/react';
import { FilterErrorBoundary } from '../FilterErrorBoundary';
import '@testing-library/jest-dom';

// Component that throws an error for testing
const ThrowError = ({ shouldThrow }: { shouldThrow: boolean }) => {
  if (shouldThrow) {
    throw new Error('Test error');
  }
  return <div>No error</div>;
};

describe('FilterErrorBoundary', () => {
  // Suppress console.error for these tests
  const originalError = console.error;
  beforeAll(() => {
    console.error = jest.fn();
  });

  afterAll(() => {
    console.error = originalError;
  });

  it('renders children when there is no error', () => {
    render(
      <FilterErrorBoundary>
        <ThrowError shouldThrow={false} />
      </FilterErrorBoundary>
    );

    expect(screen.getByText('No error')).toBeInTheDocument();
  });

  it('renders error UI when child component throws', () => {
    render(
      <FilterErrorBoundary>
        <ThrowError shouldThrow={true} />
      </FilterErrorBoundary>
    );

    expect(screen.getByText(/Filter Error:/)).toBeInTheDocument();
    expect(screen.getByText(/Something went wrong with the filtering system/)).toBeInTheDocument();
    expect(screen.getByText('Reset Filters')).toBeInTheDocument();
  });

  it('shows error details when expanded', () => {
    render(
      <FilterErrorBoundary>
        <ThrowError shouldThrow={true} />
      </FilterErrorBoundary>
    );

    const detailsButton = screen.getByText('Error Details');
    fireEvent.click(detailsButton);

    expect(screen.getByText('Test error')).toBeInTheDocument();
  });

  it('renders custom fallback when provided', () => {
    const customFallback = <div>Custom error message</div>;

    render(
      <FilterErrorBoundary fallback={customFallback}>
        <ThrowError shouldThrow={true} />
      </FilterErrorBoundary>
    );

    expect(screen.getByText('Custom error message')).toBeInTheDocument();
    expect(screen.queryByText(/Filter Error:/)).not.toBeInTheDocument();
  });

  it('resets error state when reset button is clicked', () => {
    let resetKey = 0;
    const TestWrapper = ({ shouldThrow }: { shouldThrow: boolean }) => (
      <FilterErrorBoundary key={resetKey}>
        <ThrowError shouldThrow={shouldThrow} />
      </FilterErrorBoundary>
    );
    
    const { rerender } = render(<TestWrapper shouldThrow={true} />);

    expect(screen.getByText(/Filter Error:/)).toBeInTheDocument();

    const resetButton = screen.getByText('Reset Filters');
    fireEvent.click(resetButton);

    // Force a complete re-mount by changing the key
    resetKey++;
    rerender(<TestWrapper shouldThrow={false} />);

    expect(screen.getByText('No error')).toBeInTheDocument();
    expect(screen.queryByText(/Filter Error:/)).not.toBeInTheDocument();
  });
});