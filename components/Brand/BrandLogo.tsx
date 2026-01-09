/**
 * Brand Logo Component
 * FIVB Professional Referee Tool Logo
 * Optimized for mobile display and outdoor visibility
 */

import React from 'react';
import { Image, View, StyleSheet, ImageStyle, ViewStyle } from 'react-native';
import { brandAssets, getBrandAsset } from '../../assets/brand';

export interface BrandLogoProps {
  variant?: 'primary' | 'symbol';
  theme?: 'light' | 'dark';
  size?: 'small' | 'medium' | 'large' | number;
  style?: ViewStyle;
  imageStyle?: ImageStyle;
}

export const BrandLogo: React.FC<BrandLogoProps> = ({
  variant = 'primary',
  theme = 'light',
  size = 'medium',
  style,
  imageStyle,
}) => {
  // Get asset based on variant and theme
  const asset = brandAssets.logo[variant][theme];
  getBrandAsset(asset);

  // Calculate dimensions based on size
  const getDimensions = () => {
    if (typeof size === 'number') {
      return {
        width: size,
        height: variant === 'primary' ? size * 0.3 : size,
      };
    }

    switch (size) {
      case 'small':
        return variant === 'primary' 
          ? { width: 120, height: 36 }
          : { width: 32, height: 32 };
      case 'large':
        return variant === 'primary'
          ? { width: 280, height: 84 }
          : { width: 80, height: 80 };
      default: // medium
        return variant === 'primary'
          ? { width: 200, height: 60 }
          : { width: 56, height: 56 };
    }
  };

  const dimensions = getDimensions();

  return (
    <View style={[styles.container, style]}>
      <Image
        source={asset}
        style={[
          styles.image,
          dimensions,
          imageStyle,
        ]}
        resizeMode="contain"
        accessibilityLabel={`FIVB ${variant} logo`}
        accessibilityRole="image"
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  image: {
    // Base image styles
  },
});

BrandLogo.displayName = 'BrandLogo';