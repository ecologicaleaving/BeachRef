import { render, screen, fireEvent } from '@testing-library/react';
import { DateRangeFilter } from '../DateRangeFilter';
import '@testing-library/jest-dom';

describe('DateRangeFilter', () => {
  const mockOnDateRangeChange = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders date range filter with label', () => {
    render(
      <DateRangeFilter 
        dateRange={{}} 
        onDateRangeChange={mockOnDateRangeChange} 
      />
    );

    expect(screen.getByText('Date Range')).toBeInTheDocument();
  });

  it('shows placeholder text when no dates selected', () => {
    render(
      <DateRangeFilter 
        dateRange={{}} 
        onDateRangeChange={mockOnDateRangeChange} 
      />
    );

    expect(screen.getByText('Pick date range')).toBeInTheDocument();
  });

  it('displays selected date range', () => {
    const dateRange = {
      start: new Date('2024-01-01'),
      end: new Date('2024-01-31')
    };

    render(
      <DateRangeFilter 
        dateRange={dateRange} 
        onDateRangeChange={mockOnDateRangeChange} 
      />
    );

    expect(screen.getByText('Jan 1, 2024')).toBeInTheDocument();
    expect(screen.getByText('Jan 31, 2024')).toBeInTheDocument();
  });

  it('displays start date only when end date is missing', () => {
    const dateRange = {
      start: new Date('2024-01-01')
    };

    render(
      <DateRangeFilter 
        dateRange={dateRange} 
        onDateRangeChange={mockOnDateRangeChange} 
      />
    );

    expect(screen.getByText('Jan 1, 2024')).toBeInTheDocument();
    expect(screen.getByText(/From: Jan 1, 2024/)).toBeInTheDocument();
  });

  it('calls onDateRangeChange when date inputs change', () => {
    render(
      <DateRangeFilter 
        dateRange={{}} 
        onDateRangeChange={mockOnDateRangeChange} 
      />
    );

    const startDateInput = screen.getByPlaceholderText('Start date');
    fireEvent.change(startDateInput, { target: { value: '2024-01-01' } });

    expect(mockOnDateRangeChange).toHaveBeenCalledWith({
      start: new Date('2024-01-01')
    });
  });

  it('has accessible date inputs', () => {
    render(
      <DateRangeFilter 
        dateRange={{}} 
        onDateRangeChange={mockOnDateRangeChange} 
      />
    );

    expect(screen.getByPlaceholderText('Start date')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('End date')).toBeInTheDocument();
  });

  it('clears individual dates when called', () => {
    const dateRange = {
      start: new Date('2024-01-01'),
      end: new Date('2024-01-31')
    };

    render(
      <DateRangeFilter 
        dateRange={dateRange} 
        onDateRangeChange={mockOnDateRangeChange} 
      />
    );

    const startInput = screen.getByPlaceholderText('Start date');
    fireEvent.change(startInput, { target: { value: '' } });

    expect(mockOnDateRangeChange).toHaveBeenCalledWith({
      end: new Date('2024-01-31')
    });
  });
});