import { render, screen, fireEvent } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { Header } from '../Header';

const renderHeader = () => {
  return render(
    <BrowserRouter>
      <Header />
    </BrowserRouter>
  );
};

describe('Header Component', () => {
  test('renders VisConnect logo/title', () => {
    renderHeader();
    expect(screen.getByText('VisConnect')).toBeInTheDocument();
  });

  test('renders navigation link to tournaments', () => {
    renderHeader();
    expect(screen.getByText('Tournaments')).toBeInTheDocument();
  });

  test('shows mobile menu button on small screens', () => {
    renderHeader();
    const menuButton = screen.getByLabelText('Toggle mobile menu');
    expect(menuButton).toBeInTheDocument();
  });

  test('toggles mobile menu when button is clicked', () => {
    renderHeader();
    const menuButton = screen.getByLabelText('Toggle mobile menu');
    
    // Mobile menu should be initially closed
    expect(screen.queryByRole('navigation', { name: /mobile/i })).not.toBeInTheDocument();
    
    // Click to open menu
    fireEvent.click(menuButton);
    
    // Mobile menu should now be visible (check for multiple tournaments links)
    expect(screen.getAllByText('Tournaments').length).toBeGreaterThan(1);
  });

  test('has proper accessibility attributes', () => {
    renderHeader();
    const menuButton = screen.getByLabelText('Toggle mobile menu');
    expect(menuButton).toHaveAttribute('aria-label', 'Toggle mobile menu');
  });
});