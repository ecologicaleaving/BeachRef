import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { HomePage } from '../HomePage';

const renderHomePage = () => {
  return render(
    <BrowserRouter>
      <HomePage />
    </BrowserRouter>
  );
};

describe('HomePage Component', () => {
  test('renders welcome message', () => {
    renderHomePage();
    expect(screen.getByText('Welcome to VisConnect')).toBeInTheDocument();
  });

  test('renders main description', () => {
    renderHomePage();
    expect(screen.getByText(/Your gateway to FIVB volleyball tournament data/)).toBeInTheDocument();
  });

  test('renders tournament data card', () => {
    renderHomePage();
    expect(screen.getByText('Tournament Data')).toBeInTheDocument();
    expect(screen.getByText(/Browse current and upcoming volleyball tournaments/)).toBeInTheDocument();
  });

  test('renders match results card', () => {
    renderHomePage();
    expect(screen.getByText('Match Results')).toBeInTheDocument();
    expect(screen.getByText(/Access detailed match results/)).toBeInTheDocument();
  });

  test('has working link to tournaments page', () => {
    renderHomePage();
    const tournamentsLink = screen.getByRole('link', { name: 'View Tournaments' });
    expect(tournamentsLink).toHaveAttribute('href', '/tournaments');
  });

  test('shows coming soon for match results', () => {
    renderHomePage();
    const comingSoonButton = screen.getByText('Coming Soon');
    expect(comingSoonButton).toBeDisabled();
  });

  test('renders footer information', () => {
    renderHomePage();
    expect(screen.getByText(/Data provided by the FIVB Volleyball Information System/)).toBeInTheDocument();
  });

  test('has responsive layout classes', () => {
    renderHomePage();
    const container = screen.getByText('Welcome to VisConnect').closest('div')?.parentElement;
    expect(container).toHaveClass('container', 'mx-auto');
  });
});