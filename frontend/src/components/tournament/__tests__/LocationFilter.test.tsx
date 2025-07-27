import { render, screen, fireEvent } from '@testing-library/react';
import { LocationFilter } from '../LocationFilter';
import '@testing-library/jest-dom';

describe('LocationFilter', () => {
  const mockOnLocationsChange = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders location filter with label', () => {
    render(
      <LocationFilter 
        selectedLocations={[]} 
        onLocationsChange={mockOnLocationsChange} 
      />
    );

    expect(screen.getByText('Locations')).toBeInTheDocument();
  });

  it('shows placeholder when no locations selected', () => {
    render(
      <LocationFilter 
        selectedLocations={[]} 
        onLocationsChange={mockOnLocationsChange} 
      />
    );

    expect(screen.getByText('Select locations')).toBeInTheDocument();
  });

  it('has search input for filtering locations when opened', async () => {
    render(
      <LocationFilter 
        selectedLocations={[]} 
        onLocationsChange={mockOnLocationsChange} 
      />
    );

    // Click the button to open the popover
    const selectButton = screen.getByText('Select locations');
    fireEvent.click(selectButton);

    // Now the search input should be visible
    expect(screen.getByPlaceholderText('Search or add location...')).toBeInTheDocument();
  });
});