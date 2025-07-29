import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { jest } from '@jest/globals';
import '@testing-library/jest-dom';
import { ErrorMessage, TournamentError } from '@/components/ui/ErrorMessage';

describe('ErrorMessage', () => {
  const defaultProps = {
    message: 'Test error message'
  };

  it('renders with default props', () => {
    render(<ErrorMessage {...defaultProps} />);
    
    const alert = screen.getByRole('alert');
    expect(alert).toBeInTheDocument();
    expect(alert).toHaveAttribute('aria-live', 'assertive');
    
    expect(screen.getByText('Something went wrong')).toBeInTheDocument();
    expect(screen.getByText('Test error message')).toBeInTheDocument();
  });

  it('renders with custom title', () => {
    render(<ErrorMessage {...defaultProps} title="Custom Error Title" />);
    
    expect(screen.getByText('Custom Error Title')).toBeInTheDocument();
  });

  it('renders with different severity levels', () => {
    const { rerender } = render(<ErrorMessage {...defaultProps} severity="error" />);
    let alert = screen.getByRole('alert');
    expect(alert).toHaveClass('border-red-200', 'bg-red-50', 'text-red-800');

    rerender(<ErrorMessage {...defaultProps} severity="warning" />);
    alert = screen.getByRole('alert');
    expect(alert).toHaveClass('border-yellow-200', 'bg-yellow-50', 'text-yellow-800');

    rerender(<ErrorMessage {...defaultProps} severity="info" />);
    alert = screen.getByRole('alert');
    expect(alert).toHaveClass('border-blue-200', 'bg-blue-50', 'text-blue-800');
  });

  it('displays retry button when onRetry is provided', () => {
    const onRetry = jest.fn();
    render(<ErrorMessage {...defaultProps} onRetry={onRetry} />);
    
    const retryButton = screen.getByRole('button', { name: 'Try again' });
    expect(retryButton).toBeInTheDocument();
    
    fireEvent.click(retryButton);
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it('uses custom retry label', () => {
    const onRetry = jest.fn();
    render(<ErrorMessage {...defaultProps} onRetry={onRetry} retryLabel="Retry Now" />);
    
    expect(screen.getByRole('button', { name: 'Retry Now' })).toBeInTheDocument();
  });

  it('does not display retry button when onRetry is not provided', () => {
    render(<ErrorMessage {...defaultProps} />);
    
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('renders children content', () => {
    render(
      <ErrorMessage {...defaultProps}>
        <div>Additional error details</div>
      </ErrorMessage>
    );
    
    expect(screen.getByText('Additional error details')).toBeInTheDocument();
  });

  it('applies custom className', () => {
    render(<ErrorMessage {...defaultProps} className="custom-error" />);
    
    const alert = screen.getByRole('alert');
    expect(alert).toHaveClass('custom-error');
  });

  it('displays correct icons for different severities', () => {
    const { rerender } = render(<ErrorMessage {...defaultProps} severity="error" />);
    let iconContainer = screen.getByRole('alert').querySelector('.text-red-500');
    expect(iconContainer).toBeInTheDocument();
    expect(iconContainer?.querySelector('svg')).toBeInTheDocument();

    rerender(<ErrorMessage {...defaultProps} severity="warning" />);
    iconContainer = screen.getByRole('alert').querySelector('.text-yellow-500');
    expect(iconContainer).toBeInTheDocument();
    expect(iconContainer?.querySelector('svg')).toBeInTheDocument();

    rerender(<ErrorMessage {...defaultProps} severity="info" />);
    iconContainer = screen.getByRole('alert').querySelector('.text-blue-500');
    expect(iconContainer).toBeInTheDocument();
    expect(iconContainer?.querySelector('svg')).toBeInTheDocument();
  });

  it('has proper button styling for different severities', () => {
    const onRetry = jest.fn();
    const { rerender } = render(
      <ErrorMessage {...defaultProps} onRetry={onRetry} severity="error" />
    );
    let button = screen.getByRole('button');
    expect(button).toHaveClass('bg-red-600', 'hover:bg-red-700', 'focus:ring-red-500');

    rerender(<ErrorMessage {...defaultProps} onRetry={onRetry} severity="warning" />);
    button = screen.getByRole('button');
    expect(button).toHaveClass('bg-yellow-600', 'hover:bg-yellow-700', 'focus:ring-yellow-500');

    rerender(<ErrorMessage {...defaultProps} onRetry={onRetry} severity="info" />);
    button = screen.getByRole('button');
    expect(button).toHaveClass('bg-blue-600', 'hover:bg-blue-700', 'focus:ring-blue-500');
  });

  it('has proper accessibility attributes', () => {
    render(<ErrorMessage {...defaultProps} />);
    
    const alert = screen.getByRole('alert');
    expect(alert).toHaveAttribute('aria-live', 'assertive');
    
    const icon = alert.querySelector('svg');
    expect(icon).toHaveAttribute('aria-hidden', 'true');
  });
});

describe('TournamentError', () => {
  it('renders with string error', () => {
    render(<TournamentError error="fetch connection failed" />);
    
    expect(screen.getByText('Connection Error')).toBeInTheDocument();
    expect(screen.getByText(/unable to connect to the tournament service/i)).toBeInTheDocument();
  });

  it('renders with Error object', () => {
    const error = new Error('Fetch failed');
    render(<TournamentError error={error} />);
    
    expect(screen.getByText('Error Loading Tournaments')).toBeInTheDocument();
    expect(screen.getByText(/tournament data temporarily unavailable/i)).toBeInTheDocument();
  });

  it('categorizes network errors correctly', () => {
    render(<TournamentError error="fetch failed" />);
    
    expect(screen.getByText('Connection Error')).toBeInTheDocument();
    expect(screen.getByText(/unable to connect to the tournament service/i)).toBeInTheDocument();
  });

  it('categorizes timeout errors correctly', () => {
    render(<TournamentError error="Request timeout exceeded" />);
    
    expect(screen.getByText('Request Timeout')).toBeInTheDocument();
    expect(screen.getByText(/request took too long to complete/i)).toBeInTheDocument();
  });

  it('categorizes 404 errors correctly', () => {
    render(<TournamentError error="404 not found" />);
    
    expect(screen.getByText('Data Not Available')).toBeInTheDocument();
    expect(screen.getByText(/tournament data is currently unavailable/i)).toBeInTheDocument();
  });

  it('shows generic error for unknown error types', () => {
    render(<TournamentError error="Unknown server error" />);
    
    expect(screen.getByText('Error Loading Tournaments')).toBeInTheDocument();
    expect(screen.getByText(/tournament data temporarily unavailable/i)).toBeInTheDocument();
  });

  it('displays retry button with correct label', () => {
    const onRetry = jest.fn();
    render(<TournamentError error="Test error" onRetry={onRetry} />);
    
    const retryButton = screen.getByRole('button', { name: 'Reload tournaments' });
    expect(retryButton).toBeInTheDocument();
    
    fireEvent.click(retryButton);
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it('shows technical details in expandable section', () => {
    const errorMessage = 'Detailed error message for debugging';
    render(<TournamentError error={errorMessage} />);
    
    const detailsElement = screen.getByText('Technical details');
    expect(detailsElement).toBeInTheDocument();
    
    // Should show error message in code block
    expect(screen.getByText(errorMessage)).toBeInTheDocument();
  });

  it('applies custom className', () => {
    render(<TournamentError error="Test error" className="custom-tournament-error" />);
    
    const alert = screen.getByRole('alert');
    expect(alert).toHaveClass('custom-tournament-error');
  });

  it('has proper severity based on error type', () => {
    const { rerender } = render(<TournamentError error="fetch failed" />);
    let alert = screen.getByRole('alert');
    expect(alert).toHaveClass('border-red-200'); // error severity

    rerender(<TournamentError error="Request timeout" />);
    alert = screen.getByRole('alert');
    expect(alert).toHaveClass('border-yellow-200'); // warning severity

    rerender(<TournamentError error="404 not found" />);
    alert = screen.getByRole('alert');
    expect(alert).toHaveClass('border-blue-200'); // info severity
  });

  it('extracts message from Error object', () => {
    const error = new Error('Custom error message');
    render(<TournamentError error={error} />);
    
    // Should show the error message in technical details
    expect(screen.getByText('Custom error message')).toBeInTheDocument();
  });

  it('has expandable technical details', () => {
    render(<TournamentError error="Test error message" />);
    
    const summary = screen.getByText('Technical details');
    expect(summary).toBeInTheDocument();
    expect(summary.tagName.toLowerCase()).toBe('summary');
    
    const details = summary.closest('details');
    expect(details).toBeInTheDocument();
    
    const codeBlock = screen.getByText('Test error message');
    expect(codeBlock.tagName.toLowerCase()).toBe('code');
  });
});