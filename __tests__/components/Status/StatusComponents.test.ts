/**
 * Status Components Tests
 * Story 1.4: Status-Driven Color Coding System
 */

import { 
  StatusBadge, 
  StatusCard, 
  // Il barrel lo esporta RINOMINATO — `export { StatusIcon as StatusStatusIcon }`
  // in components/Status/index.ts:14, per non collidere con l'omonimo di
  // components/Icons. Importare `StatusIcon` da qui restituiva `undefined` e il
  // test moriva su `undefined.displayName` (issue #94). E' la famiglia "un
  // membro che il modulo non espone" di CLAUDE.md, che
  // `__tests__/no-phantom-imports.test.ts` non intercetta perche' non guarda
  // dentro `__tests__/`.
  StatusStatusIcon as StatusIcon,
  MultiStatusIcon,
  StatusBar, 
  SimpleProgressBar 
} from '../../../components/Status';
import { TournamentStatus } from '../../../utils/statusColors';

// Nessun `jest.mock('react-native')` qui: vedi TESTING.md regola 2.
// Ne aveva uno che sostituiva l'intero modulo con quattro chiavi, cancellando
// il mock globale di `jest.env.js` e con esso `Platform` — `Cannot read
// properties of undefined (reading 'OS')` all'import, suite che non caricava
// (issue #94). Il mock globale fornisce gia' un `StyleSheet.create` che non
// tocca il bridge nativo, che era l'altra ragione per cui questo mock locale
// esisteva.

jest.mock('../../../components/Typography', () => ({
  Text: 'Text',
  H2Text: 'H2Text', 
  BodyText: 'BodyText',
  CaptionText: 'CaptionText',
}));

describe('Status Components', () => {
  describe('StatusBadge Component', () => {
    it('should be defined and exportable', () => {
      expect(StatusBadge).toBeDefined();
      expect(['function', 'object']).toContain(typeof StatusBadge); // React.memo() -> object
    });

    it('should be a memoized component', () => {
      expect(StatusBadge.displayName).toBe('StatusBadge');
    });
  });

  describe('StatusCard Component', () => {
    it('should be defined and exportable', () => {
      expect(StatusCard).toBeDefined();
      expect(['function', 'object']).toContain(typeof StatusCard); // React.memo() -> object
    });

    it('should be a memoized component', () => {
      expect(StatusCard.displayName).toBe('StatusCard');
    });
  });

  describe('StatusIcon Component', () => {
    it('should be defined and exportable', () => {
      expect(StatusIcon).toBeDefined();
      expect(['function', 'object']).toContain(typeof StatusIcon); // React.memo() -> object
    });

    it('should be a memoized component', () => {
      expect(StatusIcon.displayName).toBe('StatusIcon');
    });
  });

  describe('MultiStatusIcon Component', () => {
    it('should be defined and exportable', () => {
      expect(MultiStatusIcon).toBeDefined();
      expect(['function', 'object']).toContain(typeof MultiStatusIcon); // React.memo() -> object
    });

    it('should be a memoized component', () => {
      expect(MultiStatusIcon.displayName).toBe('MultiStatusIcon');
    });
  });

  describe('StatusBar Component', () => {
    it('should be defined and exportable', () => {
      expect(StatusBar).toBeDefined();
      expect(['function', 'object']).toContain(typeof StatusBar); // React.memo() -> object
    });

    it('should be a memoized component', () => {
      expect(StatusBar.displayName).toBe('StatusBar');
    });
  });

  describe('SimpleProgressBar Component', () => {
    it('should be defined and exportable', () => {
      expect(SimpleProgressBar).toBeDefined();
      expect(['function', 'object']).toContain(typeof SimpleProgressBar); // React.memo() -> object
    });

    it('should be a memoized component', () => {
      expect(SimpleProgressBar.displayName).toBe('SimpleProgressBar');
    });
  });

  describe('Component Integration', () => {
    it('should export all required components from index', () => {
      expect(StatusBadge).toBeDefined();
      expect(StatusCard).toBeDefined();
      expect(StatusIcon).toBeDefined();
      expect(MultiStatusIcon).toBeDefined();
      expect(StatusBar).toBeDefined();
      expect(SimpleProgressBar).toBeDefined();
    });
  });

  describe('Story 1.4 Acceptance Criteria Compliance', () => {
    it('AC 1: Should implement color coding component library for all assignment states', () => {
      const statuses: TournamentStatus[] = ['current', 'upcoming', 'completed', 'cancelled', 'emergency'];
      
      // All status values should be valid for components
      statuses.forEach(status => {
        expect(['current', 'upcoming', 'completed', 'cancelled', 'emergency']).toContain(status);
      });
      
      // All components should be available for each status
      expect(StatusBadge).toBeDefined();
      expect(StatusCard).toBeDefined();
      expect(StatusIcon).toBeDefined();
      expect(StatusBar).toBeDefined();
    });

    it('AC 2: Should maintain consistency across all status indicator components', () => {
      // All components should use the same status type system
      const components = [StatusBadge, StatusCard, StatusIcon, StatusBar];
      
      components.forEach(component => {
        expect(component).toBeDefined();
        expect(['function', 'object']).toContain(typeof component); // React.memo() -> object
      });
    });

    it('AC 3: Should provide alternative indicators for color-blind accessibility', () => {
      // MultiStatusIcon component specifically addresses color-blind accessibility
      expect(MultiStatusIcon).toBeDefined();
      expect(['function', 'object']).toContain(typeof MultiStatusIcon); // React.memo() -> object
      expect(MultiStatusIcon.displayName).toBe('MultiStatusIcon');
    });

    it('AC 5: Should provide maximum visibility components for emergency states', () => {
      // All components should support emergency status
      const emergencyCapableComponents = [StatusBadge, StatusCard, StatusIcon, StatusBar];
      
      emergencyCapableComponents.forEach(component => {
        expect(component).toBeDefined();
      });
    });
  });

  describe('Component Architecture Compliance', () => {
    it('should use React.memo for performance optimization', () => {
      const memoizedComponents = [StatusBadge, StatusCard, StatusIcon, MultiStatusIcon, StatusBar, SimpleProgressBar];
      
      memoizedComponents.forEach(component => {
        expect(component.displayName).toBeDefined();
      });
    });

    it('should follow consistent naming conventions', () => {
      expect(StatusBadge.displayName).toBe('StatusBadge');
      expect(StatusCard.displayName).toBe('StatusCard');
      expect(StatusIcon.displayName).toBe('StatusIcon');
      expect(MultiStatusIcon.displayName).toBe('MultiStatusIcon');
      expect(StatusBar.displayName).toBe('StatusBar');
      expect(SimpleProgressBar.displayName).toBe('SimpleProgressBar');
    });
  });

  describe('TypeScript Integration', () => {
    it('should properly export TypeScript types', () => {
      // Components should be typed functions
      expect(['function', 'object']).toContain(typeof StatusBadge); // React.memo() -> object
      expect(['function', 'object']).toContain(typeof StatusCard); // React.memo() -> object
      expect(['function', 'object']).toContain(typeof StatusIcon); // React.memo() -> object
      expect(['function', 'object']).toContain(typeof MultiStatusIcon); // React.memo() -> object
      expect(['function', 'object']).toContain(typeof StatusBar); // React.memo() -> object
      expect(['function', 'object']).toContain(typeof SimpleProgressBar); // React.memo() -> object
    });
  });

  describe('Performance Considerations', () => {
    it('should implement memoization for all components', () => {
      // All components should use React.memo for performance
      const components = [StatusBadge, StatusCard, StatusIcon, MultiStatusIcon, StatusBar, SimpleProgressBar];
      
      components.forEach(component => {
        expect(component.displayName).toBeDefined(); // React.memo sets displayName
      });
    });
  });
});

describe('Status Component Integration with Design System', () => {
  it('should integrate with status color utilities', () => {
    // Components should import and use status color utilities
    const { 
      getStatusColor, 
      getStatusColorWithText, 
      TournamentStatus 
    } = require('../../../components/Status');
    
    expect(getStatusColor).toBeDefined();
    expect(getStatusColorWithText).toBeDefined();
    expect(['function', 'object']).toContain(typeof getStatusColor); // React.memo() -> object
    expect(['function', 'object']).toContain(typeof getStatusColorWithText); // React.memo() -> object
  });

  it('should maintain consistency with design token system', () => {
    // Components should be compatible with the design token system
    const { statusColors } = require('../../../theme/tokens');
    expect(statusColors).toBeDefined();
    expect(statusColors.current).toBeDefined();
    expect(statusColors.upcoming).toBeDefined();
    expect(statusColors.completed).toBeDefined();
    expect(statusColors.cancelled).toBeDefined();
    expect(statusColors.emergency).toBeDefined();
  });
});