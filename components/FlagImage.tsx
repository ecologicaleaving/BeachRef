/**
 * FlagImage Component
 * Displays country flags from FIVB flag service with fallback handling
 */

import React, { useState, useEffect } from 'react';
import { Image, View, StyleSheet, ImageStyle, ViewStyle } from 'react-native';
import { getFlagConfig, validateFlagExists, FlagConfig } from '../services/FlagService';

export interface FlagImageProps {
  countryCode?: string;
  federationCode?: string;
  teamName?: string;
  size?: 'small' | 'medium' | 'large';
  style?: ImageStyle;
  containerStyle?: ViewStyle;
  fallbackCode?: string;
  showPlaceholder?: boolean;
}

/**
 * Size presets for flag display
 */
const FLAG_SIZES = {
  small: { width: 20, height: 14 },
  medium: { width: 28, height: 19 },
  large: { width: 36, height: 24 },
} as const;

/**
 * FlagImage component with FIVB flag service integration
 */
export const FlagImage: React.FC<FlagImageProps> = ({
  countryCode,
  federationCode,
  teamName,
  size = 'small',
  style,
  containerStyle,
  fallbackCode,
  showPlaceholder = true,
}) => {
  const [flagConfig, setFlagConfig] = useState<FlagConfig | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  // Use federationCode if provided, otherwise fallback to countryCode
  const code = federationCode || countryCode;

  useEffect(() => {
    loadFlag();
  }, [code, fallbackCode]);

  const loadFlag = async () => {
    if (!code) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setHasError(false);

    try {
      // Try primary code (federation or country)
      if (await validateFlagExists(code)) {
        const config = getFlagConfig(code, teamName);
        setFlagConfig(config);
        setIsLoading(false);
        return;
      }

      // Try fallback code if provided
      if (fallbackCode && await validateFlagExists(fallbackCode)) {
        const config = getFlagConfig(fallbackCode, teamName);
        setFlagConfig(config);
        setIsLoading(false);
        return;
      }

      // No valid flag found
      setFlagConfig(null);
      setHasError(true);
    } catch (error) {
      console.warn('FlagImage: Error loading flag for', code, error);
      setFlagConfig(null);
      setHasError(true);
    } finally {
      setIsLoading(false);
    }
  };

  const handleImageError = () => {
    console.warn('FlagImage: Failed to load flag image for', code);
    setHasError(true);
    setFlagConfig(null);
  };

  const sizeStyle = FLAG_SIZES[size];

  // Show placeholder if enabled and no flag or error
  if (showPlaceholder && (!flagConfig || hasError)) {
    return (
      <View
        style={[
          styles.placeholder,
          sizeStyle,
          containerStyle,
        ]}
      />
    );
  }

  // Don't render anything if no flag and placeholder disabled
  if (!flagConfig) {
    return null;
  }

  return (
    <View style={[styles.container, containerStyle]}>
      <Image
        source={{ uri: flagConfig.url }}
        style={[
          styles.flag,
          sizeStyle,
          style,
        ]}
        accessibilityLabel={flagConfig.alt}
        onError={handleImageError}
        resizeMode="contain"
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  flag: {
    borderRadius: 2,
    borderWidth: 0.5,
    borderColor: '#E5E7EB',
  },
  placeholder: {
    backgroundColor: '#F3F4F6',
    borderRadius: 2,
    borderWidth: 0.5,
    borderColor: '#E5E7EB',
  },
});

export default FlagImage;