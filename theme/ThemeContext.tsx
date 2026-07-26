/**
 * Theme Context Provider
 * Provides design tokens and high-contrast mode management
 */

import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ThemeContextType } from '../types/theme';
import { designTokens, validateAllContrasts } from './tokens';

// Exported because `components/Foundation/ContrastControls.tsx` consumes the
// context directly with `useContext(ThemeContext)`. Without the `export` the
// import resolved to `undefined` and the component crashed on render (#71).
export const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

const HIGH_CONTRAST_STORAGE_KEY = '@RefereeApp:HighContrastMode';

interface ThemeProviderProps {
  children: React.ReactNode;
}

export function ThemeProvider({ children }: ThemeProviderProps) {
  const [isHighContrastMode, setIsHighContrastMode] = useState(false);

  // Load high contrast preference on mount
  useEffect(() => {
    loadHighContrastPreference();
    // Validate contrast ratios in development
    if (__DEV__) {
      validateAllContrasts();
    }
  }, []);

  const loadHighContrastPreference = async () => {
    try {
      const stored = await AsyncStorage.getItem(HIGH_CONTRAST_STORAGE_KEY);
      if (stored !== null) {
        setIsHighContrastMode(JSON.parse(stored));
      }
    } catch (error) {
      console.warn('Failed to load high contrast preference:', error);
    }
  };

  const toggleHighContrast = useCallback(async () => {
    try {
      const newMode = !isHighContrastMode;
      setIsHighContrastMode(newMode);
      await AsyncStorage.setItem(HIGH_CONTRAST_STORAGE_KEY, JSON.stringify(newMode));
    } catch (error) {
      console.error('Failed to save high contrast preference:', error);
    }
  }, [isHighContrastMode]);

  const contextValue: ThemeContextType = {
    tokens: designTokens,
    isHighContrastMode,
    toggleHighContrast,
  };

  return (
    <ThemeContext.Provider value={contextValue}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme(): ThemeContextType {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}

// Convenience hooks for specific token types
export function useColors() {
  const { tokens } = useTheme();
  return tokens.colors;
}

export function useTypography() {
  const { tokens } = useTheme();
  return tokens.typography;
}

export function useSpacing() {
  const { tokens } = useTheme();
  return tokens.spacing;
}

export function useContrast() {
  const { tokens } = useTheme();
  return tokens.contrast;
}