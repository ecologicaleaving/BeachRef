/**
 * @jest-environment jsdom
 */

import { render } from '@testing-library/react';
import { axe } from 'jest-axe';
import { 
  calculateContrastRatio, 
  hslValueToRgb, 
  meetsWCAGAA,
  ENHANCED_DARK_COLORS 
} from '../../utils/accessibility/contrast-validation';

describe('Theme Contrast Accessibility - Story 5.1.1', () => {
  describe('WCAG 2.1 AA Contrast Validation', () => {
    it('should meet 4.5:1 contrast ratio for enhanced muted text on dark background', () => {
      const backgroundRgb = hslValueToRgb(ENHANCED_DARK_COLORS.background);
      const mutedForegroundRgb = hslValueToRgb(ENHANCED_DARK_COLORS.mutedForeground);
      
      const contrastRatio = calculateContrastRatio(mutedForegroundRgb, backgroundRgb);
      
      expect(contrastRatio).toBeGreaterThanOrEqual(4.5);
      expect(meetsWCAGAA(contrastRatio)).toBe(true);
    });

    it('should meet 4.5:1 contrast ratio for enhanced foreground on dark background', () => {
      const backgroundRgb = hslValueToRgb(ENHANCED_DARK_COLORS.background);
      const foregroundRgb = hslValueToRgb(ENHANCED_DARK_COLORS.foreground);
      
      const contrastRatio = calculateContrastRatio(foregroundRgb, backgroundRgb);
      
      expect(contrastRatio).toBeGreaterThanOrEqual(4.5);
      expect(meetsWCAGAA(contrastRatio)).toBe(true);
    });

    it('should meet 3:1 contrast ratio for enhanced primary color on dark background (large text)', () => {
      const backgroundRgb = hslValueToRgb(ENHANCED_DARK_COLORS.background);
      const primaryRgb = hslValueToRgb(ENHANCED_DARK_COLORS.primary);
      
      const contrastRatio = calculateContrastRatio(primaryRgb, backgroundRgb);
      
      expect(contrastRatio).toBeGreaterThanOrEqual(3.0);
      expect(meetsWCAGAA(contrastRatio, true)).toBe(true);
    });

    it('should meet 3:1 contrast ratio for enhanced accent color on dark background (large text)', () => {
      const backgroundRgb = hslValueToRgb(ENHANCED_DARK_COLORS.background);
      const accentRgb = hslValueToRgb(ENHANCED_DARK_COLORS.accent);
      
      const contrastRatio = calculateContrastRatio(accentRgb, backgroundRgb);
      
      expect(contrastRatio).toBeGreaterThanOrEqual(3.0);
      expect(meetsWCAGAA(contrastRatio, true)).toBe(true);
    });

    it('should provide sufficient border contrast for visual separation', () => {
      const backgroundRgb = hslValueToRgb(ENHANCED_DARK_COLORS.background);
      const borderRgb = hslValueToRgb(ENHANCED_DARK_COLORS.border);
      
      const contrastRatio = calculateContrastRatio(borderRgb, backgroundRgb);
      
      // Border elements need at least 3:1 contrast for UI components (WCAG 2.1 non-text contrast)
      expect(contrastRatio).toBeGreaterThanOrEqual(3.0);
    });

    it('should provide sufficient input background contrast', () => {
      const backgroundRgb = hslValueToRgb(ENHANCED_DARK_COLORS.background);
      const inputRgb = hslValueToRgb(ENHANCED_DARK_COLORS.input);
      
      const contrastRatio = calculateContrastRatio(inputRgb, backgroundRgb);
      
      // Input elements need at least 3:1 contrast for UI components (WCAG 2.1 non-text contrast)
      expect(contrastRatio).toBeGreaterThanOrEqual(3.0);
    });
  });

  describe('Dark Theme Component Accessibility', () => {
    // Mock CSS variables for testing
    beforeEach(() => {
      // Create a style element with our dark theme variables
      const style = document.createElement('style');
      style.textContent = `
        .dark {
          --background: 222.2 84% 4.9%;
          --foreground: 0 0% 98%;
          --muted-foreground: 0 0% 75%;
          --border: 215 20% 20%;
          --input: 215 25% 15%;
          --primary: 214 100% 55%;
          --accent: 19 91% 60%;
        }
      `;
      document.head.appendChild(style);
    });

    it('should render dark theme without accessibility violations', async () => {
      const TestComponent = () => (
        <div className="dark bg-background text-foreground p-4">
          <h1 className="text-foreground mb-4">Tournament Dashboard</h1>
          <p className="text-muted-foreground mb-2">Secondary text content</p>
          <button className="bg-primary text-primary-foreground px-4 py-2 rounded">
            Primary Action
          </button>
          <button className="bg-accent text-accent-foreground px-4 py-2 rounded ml-2">
            Accent Action
          </button>
          <div className="border border-border p-2 mt-4">
            <input 
              className="bg-input text-foreground border border-border p-2 w-full"
              placeholder="Search tournaments..."
              aria-label="Search tournaments"
            />
          </div>
        </div>
      );

      const { container } = render(<TestComponent />);
      const results = await axe(container);
      
      expect(results).toHaveNoViolations();
    });

    it('should render form elements with sufficient contrast', async () => {
      const FormComponent = () => (
        <div className="dark bg-background text-foreground p-4">
          <form>
            <label htmlFor="tournament-name" className="text-foreground block mb-2">
              Tournament Name
            </label>
            <input 
              id="tournament-name"
              className="bg-input text-foreground border border-border p-2 w-full mb-4"
              type="text"
              required
            />
            <label htmlFor="tournament-date" className="text-foreground block mb-2">
              Tournament Date
            </label>
            <input 
              id="tournament-date"
              className="bg-input text-foreground border border-border p-2 w-full mb-4"
              type="date"
              required
            />
            <button 
              type="submit"
              className="bg-primary text-primary-foreground px-4 py-2 rounded"
            >
              Create Tournament
            </button>
          </form>
        </div>
      );

      const { container } = render(<FormComponent />);
      const results = await axe(container);
      
      expect(results).toHaveNoViolations();
    });

    it('should render navigation elements with accessible focus indicators', async () => {
      const NavigationComponent = () => (
        <div className="dark bg-background text-foreground p-4">
          <nav aria-label="Main navigation">
            <ul className="flex space-x-4">
              <li>
                <a 
                  href="/tournaments" 
                  className="text-foreground hover:text-primary focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  Tournaments
                </a>
              </li>
              <li>
                <a 
                  href="/teams" 
                  className="text-foreground hover:text-primary focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  Teams
                </a>
              </li>
              <li>
                <a 
                  href="/matches" 
                  className="text-foreground hover:text-primary focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  Matches
                </a>
              </li>
            </ul>
          </nav>
        </div>
      );

      const { container } = render(<NavigationComponent />);
      const results = await axe(container);
      
      expect(results).toHaveNoViolations();
    });
  });

  describe('High Contrast Mode Validation', () => {
    it('should render high contrast dark mode without accessibility violations', async () => {
      const HighContrastComponent = () => (
        <div className="high-contrast dark bg-background text-foreground p-4">
          <h1 className="text-foreground mb-4">High Contrast Tournament View</h1>
          <p className="text-muted-foreground mb-2">Enhanced visibility for outdoor use</p>
          <button className="bg-primary text-primary-foreground px-4 py-2 rounded border-2 border-primary">
            Enhanced Action Button
          </button>
          <div className="border-2 border-border p-2 mt-4 shadow-lg">
            <input 
              className="bg-input text-foreground border-2 border-border p-2 w-full"
              placeholder="Enhanced search..."
              aria-label="Enhanced search for tournaments"
            />
          </div>
        </div>
      );

      const { container } = render(<HighContrastComponent />);
      const results = await axe(container);
      
      expect(results).toHaveNoViolations();
    });
  });

  describe('Focus Indicator Validation', () => {
    it('should have sufficient contrast for focus indicators', () => {
      // Test focus ring contrast (should be at least 3:1 for UI components)
      const backgroundRgb = hslValueToRgb(ENHANCED_DARK_COLORS.background);
      const primaryRgb = hslValueToRgb(ENHANCED_DARK_COLORS.primary);
      
      const focusContrastRatio = calculateContrastRatio(primaryRgb, backgroundRgb);
      
      expect(focusContrastRatio).toBeGreaterThanOrEqual(3.0);
    });
  });
});