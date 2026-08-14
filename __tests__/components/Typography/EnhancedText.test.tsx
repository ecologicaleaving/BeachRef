/**
 * Enhanced Typography Components Tests
 * Tests for Story 1.3 hierarchical typography system
 */

import React from 'react';
import { render, screen } from '@testing-library/react-native';
import {
  Text,
  Title,
  Heading,
  Subheading,
  EnhancedBodyText,
  EnhancedCaption,
} from '../../../components/Typography';

// Mock typography utilities
jest.mock('../../../utils/typography', () => ({
  getResponsiveTypography: jest.fn((variant, options) => ({
    fontSize: 16,
    fontWeight: options?.emphasis === 'critical' ? 'bold' : 'normal',
    lineHeight: 24,
    letterSpacing: 0,
  })),
  getCriticalInfoTypography: jest.fn(() => ({
    fontSize: 20,
    fontWeight: 'bold',
    lineHeight: 28,
    letterSpacing: 0.3,
    minHeight: 44,
    minWidth: 44,
    paddingVertical: 8,
    paddingHorizontal: 8,
  })),
  getOptimizedLineHeight: jest.fn(() => 24),
  getOptimizedLetterSpacing: jest.fn(() => 0.1),
}));

describe('Enhanced Typography Components', () => {
  describe('Text Component', () => {
    it('should render with basic props', () => {
      render(<Text>Test content</Text>);
      expect(screen.getByText('Test content')).toBeTruthy();
    });

    it('should apply critical typography optimization when critical flag is true', () => {
      render(<Text critical>Critical text</Text>);
      expect(screen.getByText('Critical text')).toBeTruthy();
    });

    it('should handle emphasis levels', () => {
      render(<Text emphasis="critical">High priority text</Text>);
      expect(screen.getByText('High priority text')).toBeTruthy();
    });

    it('should handle hierarchy levels', () => {
      render(<Text hierarchy="primary">Primary information</Text>);
      expect(screen.getByText('Primary information')).toBeTruthy();
    });

    it('should apply color and backgroundColor props', () => {
      render(
        <Text color="textPrimary" backgroundColor="background">
          Styled text
        </Text>
      );
      expect(screen.getByText('Styled text')).toBeTruthy();
    });
  });

  describe('Title Component', () => {
    it('should render with default level 1', () => {
      render(<Title>Main Title</Title>);
      expect(screen.getByText('Main Title')).toBeTruthy();
    });

    it('should render with level 2', () => {
      render(<Title level={2}>Secondary Title</Title>);
      expect(screen.getByText('Secondary Title')).toBeTruthy();
    });

    it('should apply critical styling when critical prop is true', () => {
      render(<Title critical>Critical Title</Title>);
      expect(screen.getByText('Critical Title')).toBeTruthy();
    });

    it('should handle additional props', () => {
      render(
        <Title testID="title-component" accessible>
          Accessible Title
        </Title>
      );
      expect(screen.getByTestId('title-component')).toBeTruthy();
    });
  });

  describe('Heading Component', () => {
    it('should render with default medium emphasis', () => {
      render(<Heading>Section Heading</Heading>);
      expect(screen.getByText('Section Heading')).toBeTruthy();
    });

    it('should apply high emphasis', () => {
      render(<Heading emphasis="high">Important Heading</Heading>);
      expect(screen.getByText('Important Heading')).toBeTruthy();
    });

    it('should handle primary hierarchy', () => {
      render(<Heading hierarchy="primary">Primary Heading</Heading>);
      expect(screen.getByText('Primary Heading')).toBeTruthy();
    });

    it('should handle tertiary hierarchy', () => {
      render(<Heading hierarchy="tertiary">Tertiary Heading</Heading>);
      expect(screen.getByText('Tertiary Heading')).toBeTruthy();
    });
  });

  describe('Subheading Component', () => {
    it('should render with default medium emphasis', () => {
      render(<Subheading>Subheading Text</Subheading>);
      expect(screen.getByText('Subheading Text')).toBeTruthy();
    });

    it('should apply critical emphasis', () => {
      render(<Subheading emphasis="critical">Critical Subheading</Subheading>);
      expect(screen.getByText('Critical Subheading')).toBeTruthy();
    });

    it('should apply low emphasis', () => {
      render(<Subheading emphasis="low">Low Priority Subheading</Subheading>);
      expect(screen.getByText('Low Priority Subheading')).toBeTruthy();
    });
  });

  describe('EnhancedBodyText Component', () => {
    it('should render with default tertiary hierarchy', () => {
      render(<EnhancedBodyText>Body content</EnhancedBodyText>);
      expect(screen.getByText('Body content')).toBeTruthy();
    });

    it('should handle secondary hierarchy', () => {
      render(
        <EnhancedBodyText hierarchy="secondary">
          Secondary body content
        </EnhancedBodyText>
      );
      expect(screen.getByText('Secondary body content')).toBeTruthy();
    });

    it('should apply high emphasis', () => {
      render(
        <EnhancedBodyText emphasis="high">
          Important body content
        </EnhancedBodyText>
      );
      expect(screen.getByText('Important body content')).toBeTruthy();
    });
  });

  describe('EnhancedCaption Component', () => {
    it('should render with default low emphasis', () => {
      render(<EnhancedCaption>Caption text</EnhancedCaption>);
      expect(screen.getByText('Caption text')).toBeTruthy();
    });

    it('should apply urgent styling when urgent prop is true', () => {
      render(<EnhancedCaption urgent>Urgent caption</EnhancedCaption>);
      expect(screen.getByText('Urgent caption')).toBeTruthy();
    });

    it('should handle medium emphasis', () => {
      render(
        <EnhancedCaption emphasis="medium">
          Medium priority caption
        </EnhancedCaption>
      );
      expect(screen.getByText('Medium priority caption')).toBeTruthy();
    });

    it('should handle critical emphasis when urgent is false', () => {
      render(
        <EnhancedCaption emphasis="critical" urgent={false}>
          Critical caption
        </EnhancedCaption>
      );
      expect(screen.getByText('Critical caption')).toBeTruthy();
    });
  });

  describe('Accessibility', () => {
    it('should support accessibility props on all components', () => {
      const components = [
        <Title key="title" accessible accessibilityLabel="Title">Title</Title>,
        <Heading key="heading" accessible accessibilityLabel="Heading">Heading</Heading>,
        <Subheading key="subheading" accessible accessibilityLabel="Subheading">Subheading</Subheading>,
        <EnhancedBodyText key="body" accessible accessibilityLabel="Body">Body</EnhancedBodyText>,
        <EnhancedCaption key="caption" accessible accessibilityLabel="Caption">Caption</EnhancedCaption>,
      ];

      components.forEach(component => {
        const { unmount } = render(component);
        expect(screen.getByLabelText(component.props.accessibilityLabel)).toBeTruthy();
        unmount();
      });
    });

    it('should apply testID props correctly', () => {
      render(
        <>
          <Title testID="title-test">Title</Title>
          <Heading testID="heading-test">Heading</Heading>
          <Subheading testID="subheading-test">Subheading</Subheading>
          <EnhancedBodyText testID="body-test">Body</EnhancedBodyText>
          <EnhancedCaption testID="caption-test">Caption</EnhancedCaption>
        </>
      );

      expect(screen.getByTestId('title-test')).toBeTruthy();
      expect(screen.getByTestId('heading-test')).toBeTruthy();
      expect(screen.getByTestId('subheading-test')).toBeTruthy();
      expect(screen.getByTestId('body-test')).toBeTruthy();
      expect(screen.getByTestId('caption-test')).toBeTruthy();
    });
  });

  describe('Typography Hierarchy Integration', () => {
    it('should apply correct hierarchy levels to semantic components', () => {
      const { getByText } = render(
        <>
          <Title>Primary Title</Title>
          <Heading>Secondary Heading</Heading>
          <Subheading>Important Detail</Subheading>
          <EnhancedBodyText>Regular Content</EnhancedBodyText>
          <EnhancedCaption>Metadata</EnhancedCaption>
        </>
      );

      // All components should render successfully
      expect(getByText('Primary Title')).toBeTruthy();
      expect(getByText('Secondary Heading')).toBeTruthy();
      expect(getByText('Important Detail')).toBeTruthy();
      expect(getByText('Regular Content')).toBeTruthy();
      expect(getByText('Metadata')).toBeTruthy();
    });

    it('should handle nested typography components', () => {
      render(
        <EnhancedBodyText>
          Regular text with <EnhancedCaption>inline caption</EnhancedCaption>
        </EnhancedBodyText>
      );

      // `exact: false` perche' il testo del nodo padre e' COMPOSITO: i suoi
      // figli sono la stringa "Regular text with " piu' l'elemento
      // `<EnhancedCaption>`, quindi il testo che RNTL confronta e' l'intero
      // "Regular text with inline caption" e la corrispondenza esatta non
      // scatta (issue #111). Non e' un assert allargato: la stringa cercata e'
      // la stessa, cambia il modo di cercarla dentro un nodo che ne contiene
      // altre. Ed e' proprio la composizione che questo test verifica —
      // l'annidamento e' il suo oggetto.
      expect(screen.getByText('Regular text with', { exact: false })).toBeTruthy();
      expect(screen.getByText('inline caption')).toBeTruthy();
    });
  });

  describe('Styling Props', () => {
    it('should handle style prop override', () => {
      const customStyle = { marginTop: 20 };
      render(
        <Title style={customStyle}>Styled Title</Title>
      );
      expect(screen.getByText('Styled Title')).toBeTruthy();
    });

    it('should handle multiple style props', () => {
      render(
        <Heading 
          style={{ marginBottom: 10 }} 
          color="textSecondary"
        >
          Multi-styled Heading
        </Heading>
      );
      expect(screen.getByText('Multi-styled Heading')).toBeTruthy();
    });
  });
});