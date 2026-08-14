/**
 * Icon Component Tests
 * Story 1.5: Outdoor-Optimized Iconography
 */

import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { TouchableOpacity } from 'react-native';
import { Icon } from '../../../components/Icons/Icon';

describe('Icon Component', () => {
  it('should render with basic props', () => {
    const { getByRole } = render(
      <Icon category="navigation" name="home" />
    );
    
    const icon = getByRole('image');
    expect(icon).toBeTruthy();
  });

  it('should support all icon variants', () => {
    const variants = ['filled', 'outlined', 'rounded'] as const;
    
    variants.forEach(variant => {
      const { getByRole } = render(
        <Icon 
          category="navigation" 
          name="home" 
          variant={variant}
          testID={`icon-${variant}`}
        />
      );
      
      const icon = getByRole('image');
      expect(icon).toBeTruthy();
    });
  });

  it('should use button role and handle press for interactive icons', () => {
    const mockOnPress = jest.fn();
    const { getByRole } = render(
      <Icon
        category="action"
        name="edit"
        isInteractive={true}
        onPress={mockOnPress}
      />
    );
    
    const button = getByRole('button');
    fireEvent.press(button);
    expect(mockOnPress).toHaveBeenCalled();
  });

  it('should apply proper accessibility labels', () => {
    const { getByRole } = render(
      <Icon
        category="navigation"
        name="home"
        accessibilityLabel="Home screen"
      />
    );
    
    const icon = getByRole('image');
    expect(icon.props.accessibilityLabel).toBe('Home screen');
  });

  it('should provide default accessibility labels when none provided', () => {
    const { getByRole } = render(
      <Icon category="navigation" name="home" />
    );
    
    const icon = getByRole('image');
    expect(icon.props.accessibilityLabel).toBe('navigation home icon');
  });

  it('should support emergency styling', () => {
    const { getByRole } = render(
      <Icon
        category="status"
        name="emergency"
        isEmergency={true}
        testID="emergency-icon"
      />
    );
    
    const icon = getByRole('image');
    expect(icon).toBeTruthy();
  });

  it('should apply custom styles', () => {
    const customStyle = { marginTop: 10 };
    const { getByRole } = render(
      <Icon
        category="navigation"
        name="home"
        style={customStyle}
      />
    );
    
    const icon = getByRole('image');
    expect(icon).toBeTruthy();
  });

  it('should support different sizes', () => {
    const sizes = ['small', 'medium', 'large'] as const;
    
    sizes.forEach(size => {
      const { getByRole } = render(
        <Icon 
          category="navigation" 
          name="home" 
          size={size}
          testID={`icon-${size}`}
        />
      );
      
      const icon = getByRole('image');
      expect(icon).toBeTruthy();
    });
  });

  it('should support different themes', () => {
    const themes = ['default', 'status', 'highContrast', 'accessibility'] as const;
    
    themes.forEach(theme => {
      const { getByRole } = render(
        <Icon 
          category="navigation" 
          name="home" 
          theme={theme}
          testID={`icon-${theme}`}
        />
      );
      
      const icon = getByRole('image');
      expect(icon).toBeTruthy();
    });
  });

  it('should provide accessibility hints for interactive icons', () => {
    const { getByRole } = render(
      <Icon
        category="action"
        name="edit"
        isInteractive={true}
        onPress={() => {}}
        accessibilityHint="Edit item details"
      />
    );
    
    const button = getByRole('button');
    expect(button.props.accessibilityHint).toBe('Edit item details');
  });

  it('should support testID for testing', () => {
    const { getByTestId } = render(
      <Icon
        category="navigation"
        name="home"
        testID="home-icon"
      />
    );
    
    const icon = getByTestId('home-icon');
    expect(icon).toBeTruthy();
  });

  // `activeOpacity` vive sul componente `TouchableOpacity`, non sul nodo host
  // che `getByRole` restituisce — cercarla li' dava `undefined` (issue #111).
  // `UNSAFE_getByType` e' dichiaratamente un'API di dettaglio implementativo,
  // ed e' l'attrezzo giusto proprio perche' cio' che questo test verifica *e'*
  // un dettaglio implementativo: l'opacita' al tocco non e' osservabile
  // dall'albero renderizzato. Il comportamento vero — che l'icona interattiva
  // risponda al tocco — e' gia' coperto da
  // 'should use button role and handle press for interactive icons'.
  it('should handle touch opacity for interactive icons', () => {
    const mockOnPress = jest.fn();
    const { UNSAFE_getByType } = render(
      <Icon
        category="action"
        name="edit"
        isInteractive={true}
        onPress={mockOnPress}
      />
    );

    expect(UNSAFE_getByType(TouchableOpacity).props.activeOpacity).toBe(0.7);
  });
});