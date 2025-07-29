import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { LoadingSpinner, LoadingSkeleton, TableLoadingSkeleton } from '@/components/ui/LoadingSpinner';

describe('LoadingSpinner', () => {
  it('renders with default props', () => {
    render(<LoadingSpinner />);
    
    const spinner = screen.getByRole('status');
    expect(spinner).toBeInTheDocument();
    expect(spinner).toHaveAttribute('aria-label', 'Loading...');
    expect(screen.getByText('Loading...')).toBeInTheDocument();
  });

  it('renders with custom label', () => {
    render(<LoadingSpinner label="Custom loading message" />);
    
    const spinner = screen.getByRole('status');
    expect(spinner).toHaveAttribute('aria-label', 'Custom loading message');
    expect(screen.getByText('Custom loading message')).toBeInTheDocument();
  });

  it('applies size classes correctly', () => {
    const { rerender } = render(<LoadingSpinner size="small" />);
    let spinnerDiv = screen.getByRole('status').querySelector('div');
    expect(spinnerDiv).toHaveClass('w-4', 'h-4');

    rerender(<LoadingSpinner size="medium" />);
    spinnerDiv = screen.getByRole('status').querySelector('div');
    expect(spinnerDiv).toHaveClass('w-8', 'h-8');

    rerender(<LoadingSpinner size="large" />);
    spinnerDiv = screen.getByRole('status').querySelector('div');
    expect(spinnerDiv).toHaveClass('w-12', 'h-12');
  });

  it('applies custom className', () => {
    render(<LoadingSpinner className="custom-class" />);
    
    const spinner = screen.getByRole('status');
    expect(spinner).toHaveClass('custom-class');
  });

  it('has proper accessibility attributes', () => {
    render(<LoadingSpinner />);
    
    const spinner = screen.getByRole('status');
    expect(spinner).toHaveAttribute('aria-live', 'polite');
    
    const spinnerIcon = spinner.querySelector('div');
    expect(spinnerIcon).toHaveAttribute('aria-hidden', 'true');
    
    const srText = screen.getByText('Loading...');
    expect(srText).toHaveClass('sr-only');
  });
});

describe('LoadingSkeleton', () => {
  it('renders default number of rows', () => {
    render(<LoadingSkeleton />);
    
    const skeleton = screen.getByRole('status');
    expect(skeleton).toBeInTheDocument();
    expect(skeleton).toHaveAttribute('aria-label', 'Loading tournament data');
    
    // Should render 5 skeleton rows by default
    const skeletonRows = skeleton.querySelectorAll('div[aria-hidden="true"]');
    expect(skeletonRows).toHaveLength(5);
  });

  it('renders custom number of rows', () => {
    render(<LoadingSkeleton rows={3} />);
    
    const skeleton = screen.getByRole('status');
    const skeletonRows = skeleton.querySelectorAll('div[aria-hidden="true"]');
    expect(skeletonRows).toHaveLength(3);
  });

  it('applies custom className', () => {
    render(<LoadingSkeleton className="custom-skeleton" />);
    
    const skeleton = screen.getByRole('status');
    expect(skeleton).toHaveClass('custom-skeleton');
  });

  it('has animate-pulse class', () => {
    render(<LoadingSkeleton />);
    
    const skeleton = screen.getByRole('status');
    expect(skeleton).toHaveClass('animate-pulse');
  });

  it('has proper accessibility for screen readers', () => {
    render(<LoadingSkeleton />);
    
    expect(screen.getByText('Loading tournament data')).toBeInTheDocument();
    expect(screen.getByText('Loading tournament data')).toHaveClass('sr-only');
  });
});

describe('TableLoadingSkeleton', () => {
  it('renders with default props', () => {
    render(<TableLoadingSkeleton />);
    
    const skeleton = screen.getByRole('status');
    expect(skeleton).toBeInTheDocument();
    expect(skeleton).toHaveAttribute('aria-label', 'Loading tournament table');
    expect(skeleton).toHaveClass('animate-pulse');
  });

  it('renders correct number of header columns', () => {
    render(<TableLoadingSkeleton columns={4} />);
    
    const skeleton = screen.getByRole('status');
    const headerSkeletons = skeleton.querySelectorAll('.grid.grid-cols-3.lg\\:grid-cols-6 > div');
    expect(headerSkeletons.length).toBeGreaterThan(0);
  });

  it('renders correct number of table rows', () => {
    render(<TableLoadingSkeleton rows={5} />);
    
    const skeleton = screen.getByRole('status');
    const tableRows = skeleton.querySelectorAll('.grid.grid-cols-3.lg\\:grid-cols-6.gap-4.p-4.border-b');
    expect(tableRows).toHaveLength(5);
  });

  it('applies custom className', () => {
    render(<TableLoadingSkeleton className="custom-table-skeleton" />);
    
    const skeleton = screen.getByRole('status');
    expect(skeleton).toHaveClass('custom-table-skeleton');
  });

  it('has proper responsive classes', () => {
    render(<TableLoadingSkeleton />);
    
    const skeleton = screen.getByRole('status');
    
    // Check for responsive grid classes
    const grids = skeleton.querySelectorAll('.grid-cols-3.lg\\:grid-cols-6');
    expect(grids.length).toBeGreaterThan(0);
    
    // Check for responsive hidden classes
    const hiddenElements = skeleton.querySelectorAll('.hidden.lg\\:block');
    expect(hiddenElements.length).toBeGreaterThan(0);
  });

  it('has proper screen reader support', () => {
    render(<TableLoadingSkeleton />);
    
    expect(screen.getByText('Loading tournament table')).toBeInTheDocument();
    expect(screen.getByText('Loading tournament table')).toHaveClass('sr-only');
    
    // All skeleton elements should be hidden from screen readers
    const skeleton = screen.getByRole('status');
    const hiddenElements = skeleton.querySelectorAll('[aria-hidden="true"]');
    expect(hiddenElements.length).toBeGreaterThan(0);
  });

  it('creates header and body sections', () => {
    render(<TableLoadingSkeleton />);
    
    const skeleton = screen.getByRole('status');
    
    // Header should have background
    const header = skeleton.querySelector('.bg-gray-50.rounded-t-lg');
    expect(header).toBeInTheDocument();
    
    // Body rows should have borders
    const bodyRows = skeleton.querySelectorAll('.border-b.border-gray-200');
    expect(bodyRows.length).toBeGreaterThan(0);
  });
});