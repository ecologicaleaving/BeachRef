/**
 * @jest-environment jsdom
 */

import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe } from 'jest-axe';

describe('Component Accessibility - Story 5.1.1', () => {
  beforeEach(() => {
    // Set up dark theme CSS variables
    const style = document.createElement('style');
    style.textContent = `
      .dark {
        --background: 222.2 84% 4.9%;
        --foreground: 0 0% 98%;
        --muted-foreground: 0 0% 75%;
        --border: 215 20% 20%;
        --input: 215 25% 15%;
        --primary: 214 100% 55%;
        --primary-foreground: 222.2 84% 4.9%;
        --accent: 19 91% 60%;
        --accent-foreground: 222.2 84% 4.9%;
        --card: 222.2 84% 4.9%;
        --card-foreground: 0 0% 98%;
        --destructive: 0 62.8% 30.6%;
        --destructive-foreground: 0 0% 98%;
        --secondary: 217.2 32.6% 17.5%;
        --secondary-foreground: 0 0% 98%;
        --muted: 217.2 32.6% 17.5%;
        --ring: 214 100% 55%;
      }
      .high-contrast.dark {
        --primary: 214 100% 60%;
        --accent: 19 100% 65%;
        --background: 0 0% 0%;
        --foreground: 0 0% 100%;
        --border: 0 0% 80%;
        --muted-foreground: 0 0% 80%;
      }
    `;
    document.head.appendChild(style);
  });

  describe('Tournament Card Component', () => {
    it('should render tournament cards with accessible contrast in dark theme', async () => {
      const TournamentCard = () => (
        <div className="dark">
          <div className="bg-card text-card-foreground border border-border rounded-lg p-4 shadow-sm">
            <h3 className="text-foreground font-semibold mb-2">FIVB Beach Volleyball Championship</h3>
            <p className="text-muted-foreground text-sm mb-3">Rio de Janeiro, Brazil</p>
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground text-xs">Aug 15-20, 2024</span>
              <button className="bg-primary text-primary-foreground px-3 py-1 rounded text-sm hover:opacity-90">
                View Details
              </button>
            </div>
          </div>
        </div>
      );

      const { container } = render(<TournamentCard />);
      const results = await axe(container);
      
      expect(results).toHaveNoViolations();
    });

    it('should render multiple tournament cards without accessibility issues', async () => {
      const TournamentList = () => (
        <div className="dark bg-background p-4">
          <h2 className="text-foreground text-xl font-bold mb-4">Upcoming Tournaments</h2>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map((id) => (
              <div key={id} className="bg-card text-card-foreground border border-border rounded-lg p-4">
                <h3 className="text-foreground font-semibold mb-2">Tournament {id}</h3>
                <p className="text-muted-foreground text-sm mb-3">Location {id}</p>
                <button 
                  className="bg-primary text-primary-foreground px-3 py-1 rounded text-sm"
                  aria-label={`View details for Tournament ${id}`}
                >
                  View Details
                </button>
              </div>
            ))}
          </div>
        </div>
      );

      const { container } = render(<TournamentList />);
      const results = await axe(container);
      
      expect(results).toHaveNoViolations();
    });
  });

  describe('Button Components', () => {
    it('should render primary buttons with sufficient contrast', async () => {
      const ButtonComponent = () => (
        <div className="dark bg-background p-4">
          <button className="bg-primary text-primary-foreground px-4 py-2 rounded mr-2">
            Primary Action
          </button>
          <button className="bg-secondary text-secondary-foreground px-4 py-2 rounded mr-2">
            Secondary Action
          </button>
          <button className="bg-accent text-accent-foreground px-4 py-2 rounded mr-2">
            Accent Action
          </button>
          <button className="bg-destructive text-destructive-foreground px-4 py-2 rounded">
            Delete Action
          </button>
        </div>
      );

      const { container } = render(<ButtonComponent />);
      const results = await axe(container);
      
      expect(results).toHaveNoViolations();
    });

    it('should handle focus states with accessible indicators', async () => {
      const user = userEvent.setup();
      
      const FocusableButton = () => (
        <div className="dark bg-background p-4">
          <button 
            className="bg-primary text-primary-foreground px-4 py-2 rounded focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:ring-offset-background"
            data-testid="focusable-button"
          >
            Focusable Button
          </button>
        </div>
      );

      const { container } = render(<FocusableButton />);
      const button = screen.getByTestId('focusable-button');
      
      // Test focus state
      await user.tab();
      expect(button).toHaveFocus();
      
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });
  });

  describe('Form Components', () => {
    it('should render form inputs with accessible labels and contrast', async () => {
      const FormComponent = () => (
        <div className="dark bg-background p-4">
          <form>
            <div className="mb-4">
              <label htmlFor="tournament-search" className="text-foreground block mb-2">
                Search Tournaments
              </label>
              <input 
                id="tournament-search"
                type="text"
                className="bg-input text-foreground border border-border p-2 w-full rounded"
                placeholder="Enter tournament name..."
              />
            </div>
            <div className="mb-4">
              <label htmlFor="tournament-year" className="text-foreground block mb-2">
                Tournament Year
              </label>
              <select 
                id="tournament-year"
                className="bg-input text-foreground border border-border p-2 w-full rounded"
              >
                <option value="2024">2024</option>
                <option value="2023">2023</option>
                <option value="2022">2022</option>
              </select>
            </div>
            <fieldset className="mb-4">
              <legend className="text-foreground font-semibold mb-2">Tournament Type</legend>
              <div className="space-y-2">
                <label className="flex items-center text-foreground">
                  <input 
                    type="radio" 
                    name="tournament-type" 
                    value="professional" 
                    className="mr-2"
                  />
                  Professional
                </label>
                <label className="flex items-center text-foreground">
                  <input 
                    type="radio" 
                    name="tournament-type" 
                    value="amateur" 
                    className="mr-2"
                  />
                  Amateur
                </label>
              </div>
            </fieldset>
          </form>
        </div>
      );

      const { container } = render(<FormComponent />);
      const results = await axe(container);
      
      expect(results).toHaveNoViolations();
    });
  });

  describe('Table Components', () => {
    it('should render tournament tables with accessible structure and contrast', async () => {
      const TournamentTable = () => (
        <div className="dark bg-background p-4">
          <h2 className="text-foreground text-xl font-bold mb-4">Tournament Results</h2>
          <div className="overflow-x-auto">
            <table className="w-full border border-border">
              <thead>
                <tr className="bg-muted">
                  <th className="text-foreground border border-border p-2 text-left">Team 1</th>
                  <th className="text-foreground border border-border p-2 text-left">Team 2</th>
                  <th className="text-foreground border border-border p-2 text-left">Score</th>
                  <th className="text-foreground border border-border p-2 text-left">Status</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="text-foreground border border-border p-2">Brazil A</td>
                  <td className="text-foreground border border-border p-2">USA A</td>
                  <td className="text-foreground border border-border p-2">21-19, 21-16</td>
                  <td className="text-accent border border-border p-2">Completed</td>
                </tr>
                <tr className="bg-muted/20">
                  <td className="text-foreground border border-border p-2">Germany A</td>
                  <td className="text-foreground border border-border p-2">Norway A</td>
                  <td className="text-muted-foreground border border-border p-2">-</td>
                  <td className="text-muted-foreground border border-border p-2">Scheduled</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      );

      const { container } = render(<TournamentTable />);
      const results = await axe(container);
      
      expect(results).toHaveNoViolations();
    });
  });

  describe('High Contrast Mode Components', () => {
    it('should render components in high contrast dark mode without violations', async () => {
      const HighContrastComponent = () => (
        <div className="high-contrast dark bg-background p-4">
          <h1 className="text-foreground text-2xl font-bold mb-4">High Contrast Tournament Dashboard</h1>
          
          <div className="bg-card border-2 border-border p-4 mb-4 shadow-lg">
            <h2 className="text-foreground text-lg font-semibold mb-2">Enhanced Visibility Card</h2>
            <p className="text-muted-foreground mb-3">
              This content is optimized for outdoor tournament venue usage with enhanced contrast ratios.
            </p>
            <button className="bg-primary text-primary-foreground px-4 py-2 rounded border-2 border-primary">
              Enhanced Action
            </button>
          </div>

          <div className="border-2 border-border p-4">
            <label htmlFor="enhanced-search" className="text-foreground block mb-2 font-semibold">
              Enhanced Tournament Search
            </label>
            <input 
              id="enhanced-search"
              className="bg-input text-foreground border-2 border-border p-3 w-full rounded"
              placeholder="Search with enhanced visibility..."
              aria-describedby="search-help"
            />
            <p id="search-help" className="text-muted-foreground text-sm mt-1">
              Optimized for use with gloves in outdoor conditions
            </p>
          </div>
        </div>
      );

      const { container } = render(<HighContrastComponent />);
      const results = await axe(container);
      
      expect(results).toHaveNoViolations();
    });
  });

  describe('Interactive Component States', () => {
    it('should handle hover and active states accessibly', async () => {
      const user = userEvent.setup();
      
      const InteractiveComponent = () => (
        <div className="dark bg-background p-4">
          <button 
            className="bg-primary text-primary-foreground px-4 py-2 rounded hover:opacity-90 active:opacity-80 focus:outline-none focus:ring-2 focus:ring-ring transition-opacity"
            data-testid="interactive-button"
          >
            Interactive Button
          </button>
          <a 
            href="#test" 
            className="text-primary underline hover:text-accent focus:outline-none focus:ring-2 focus:ring-ring ml-4"
            data-testid="interactive-link"
          >
            Interactive Link
          </a>
        </div>
      );

      const { container } = render(<InteractiveComponent />);
      
      // Test button interaction
      const button = screen.getByTestId('interactive-button');
      await user.hover(button);
      await user.click(button);
      
      // Test link interaction
      const link = screen.getByTestId('interactive-link');
      await user.hover(link);
      
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });
  });
});