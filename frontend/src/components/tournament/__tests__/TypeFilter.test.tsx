import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
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

  it('displays tournament type options when popover is opened', async () => {
    const user = userEvent.setup();
    
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

    // Click the trigger button to open the popover
    const triggerButton = screen.getByRole('button', { name: /select tournament types/i });
    await user.click(triggerButton);

    expect(screen.getByText('World Tour')).toBeInTheDocument();
    expect(screen.getByText('Continental')).toBeInTheDocument();
  });
});