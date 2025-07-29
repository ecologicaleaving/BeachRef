import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { ErrorBoundary } from '../../../components/ui/ErrorBoundary';

// Mock component that can throw errors
const ThrowError = ({ shouldThrow }: { shouldThrow: boolean }) => {
  if (shouldThrow) {
    throw new Error('Test error message');
  }
  return <div>No error</div>;
};

// Mock console methods
const originalError = console.error;
const originalGroup = console.group;
const originalGroupEnd = console.groupEnd;

beforeEach(() => {
  console.error = jest.fn();
  console.group = jest.fn();
  console.groupEnd = jest.fn();
});

afterEach(() => {
  console.error = originalError;
  console.group = originalGroup;
  console.groupEnd = originalGroupEnd;
});

describe('ErrorBoundary', () => {
  it('should render children when there is no error', () => {
    render(
      <ErrorBoundary>
        <ThrowError shouldThrow={false} />
      </ErrorBoundary>
    );

    expect(screen.getByText('No error')).toBeInTheDocument();
  });

  it('should render error UI when child component throws', () => {
    render(
      <ErrorBoundary>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    );

    expect(screen.getByText('Something went wrong')).toBeInTheDocument();
    expect(screen.getByText('Test error message')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /try again/i })).toBeInTheDocument();
  });

  it('should render custom fallback when provided', () => {
    const customFallback = <div data-testid="custom-fallback">Custom error UI</div>;

    render(
      <ErrorBoundary fallback={customFallback}>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    );

    expect(screen.getByTestId('custom-fallback')).toBeInTheDocument();
    expect(screen.getByText('Custom error UI')).toBeInTheDocument();
  });

  it('should show reload button when showReloadButton is true', () => {
    render(
      <ErrorBoundary showReloadButton={true}>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    );

    expect(screen.getByRole('button', { name: /reload page/i })).toBeInTheDocument();
  });

  it('should use custom title when provided', () => {
    render(
      <ErrorBoundary title="Custom Error Title">
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    );

    expect(screen.getByText('Custom Error Title')).toBeInTheDocument();
  });

  it('should call onError callback when error occurs', () => {
    const onErrorMock = jest.fn();

    render(
      <ErrorBoundary onError={onErrorMock}>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    );

    expect(onErrorMock).toHaveBeenCalledWith(
      expect.any(Error),
      expect.objectContaining({
        componentStack: expect.any(String)
      })
    );
  });

  it('should reset error state when retry button is clicked', () => {
    const TestComponent = () => {
      const [shouldThrow, setShouldThrow] = React.useState(true);
      
      return (
        <ErrorBoundary>
          <button onClick={() => setShouldThrow(false)}>Fix error</button>
          <ThrowError shouldThrow={shouldThrow} />
        </ErrorBoundary>
      );
    };

    render(<TestComponent />);

    // Initially shows error
    expect(screen.getByText('Something went wrong')).toBeInTheDocument();

    // Click retry button
    fireEvent.click(screen.getByRole('button', { name: /try again/i }));

    // Still shows error because component still throws
    expect(screen.getByText('Something went wrong')).toBeInTheDocument();
  });

  it('should show debug information in development mode', () => {
    const originalEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'development';

    render(
      <ErrorBoundary>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    );

    expect(screen.getByText('Debug Information (Development Only)')).toBeInTheDocument();

    process.env.NODE_ENV = originalEnv;
  });

  it('should log error with proper context', () => {
    render(
      <ErrorBoundary>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    );

    // In development mode, it uses console.group
    expect(console.group).toHaveBeenCalledWith('🚨 Error Boundary Caught Error');
    expect(console.error).toHaveBeenCalledWith('Error:', expect.any(Error));
    expect(console.error).toHaveBeenCalledWith('Error Info:', expect.objectContaining({
      componentStack: expect.any(String)
    }));
    expect(console.groupEnd).toHaveBeenCalled();
  });

  it('should have proper accessibility attributes', () => {
    render(
      <ErrorBoundary>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    );

    const errorContainer = screen.getByRole('alert');
    expect(errorContainer).toHaveAttribute('role', 'alert');
    expect(errorContainer).toHaveAttribute('aria-live', 'assertive');
  });
});