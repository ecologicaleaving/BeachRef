import { render, screen } from '@testing-library/react';
import { TypeFilter } from '../TypeFilter';
import '@testing-library/jest-dom';

describe('TypeFilter', () => {
  const mockOnTypesChange = jest.fn();
  const mockOnSurfacesChange = jest.fn();
  const mockOnGendersChange = jest.fn();
  const mockOnStatusesChange = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders type filter sections', () => {
    render(
      <TypeFilter 
        selectedTypes={[]}
        selectedSurfaces={[]}
        selectedGenders={[]}
        selectedStatuses={[]}
        onTypesChange={mockOnTypesChange}
        onSurfacesChange={mockOnSurfacesChange}
        onGendersChange={mockOnGendersChange}
        onStatusesChange={mockOnStatusesChange}
      />
    );

    expect(screen.getByText('Tournament Types')).toBeInTheDocument();
  });

  it('displays tournament type options', () => {
    render(
      <TypeFilter 
        selectedTypes={[]}
        selectedSurfaces={[]}
        selectedGenders={[]}
        selectedStatuses={[]}
        onTypesChange={mockOnTypesChange}
        onSurfacesChange={mockOnSurfacesChange}
        onGendersChange={mockOnGendersChange}
        onStatusesChange={mockOnStatusesChange}
      />
    );

    expect(screen.getByText('World Tour')).toBeInTheDocument();
    expect(screen.getByText('Continental')).toBeInTheDocument();
  });
});