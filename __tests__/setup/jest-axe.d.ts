/**
 * Type declarations for jest-axe accessibility testing
 * Story 5.1.1 - Dark Theme Accessibility Enhancement
 */

declare global {
  namespace jest {
    interface Matchers<R> {
      toHaveNoViolations(): R;
    }
  }
}

export {};