/**
 * Brand Asset Management System
 * Scalable asset loading for multiple screen densities
 * Professional Referee Tool Visual Identity
 */

import { Platform, PixelRatio } from 'react-native';

export interface BrandAsset {
  uri: string;
  width: number;
  height: number;
  scale: number;
}

export interface BrandAssetSet {
  '@1x': BrandAsset;
  '@2x': BrandAsset;
  '@3x': BrandAsset;
}

/**
 * FIVB Brand Asset Registry
 * Professional referee tool visual identity elements
 * 
 * NOTE: In development, these are placeholder references.
 * In production, replace with actual FIVB-approved brand assets.
 */
export const brandAssets = {
  logo: {
    primary: {
      // Using React Native's default icon as placeholder
      light: require('../../assets/images/icon.png'),
      dark: require('../../assets/images/icon.png'),
    },
    symbol: {
      light: require('../../assets/images/icon.png'),
      dark: require('../../assets/images/icon.png'),
    }
  },
  splash: {
    background: require('../../assets/images/splash-icon.png'),
    logo: require('../../assets/images/icon.png'),
  },
  icons: {
    app: {
      ios: require('../../assets/images/icon.png'),
      android: require('../../assets/images/icon.png'),
    }
  }
} as const;

/**
 * Get appropriate asset for current device pixel ratio
 */
export function getBrandAsset(assetPath: any): BrandAsset {
  const scale = PixelRatio.get();
  
  // For React Native, assets are automatically selected based on @2x, @3x naming
  // This function provides metadata and fallback logic
  return {
    uri: assetPath,
    width: 200, // Default width - will be overridden by actual asset dimensions
    height: 60, // Default height - will be overridden by actual asset dimensions  
    scale: scale,
  };
}

/**
 * Brand Asset Loading Configuration
 * Optimized for mobile performance
 */
export const assetConfig = {
  // Prefetch critical assets for performance
  prefetchAssets: [
    brandAssets.logo.primary.light,
    brandAssets.logo.primary.dark,
    brandAssets.logo.symbol.light,
    brandAssets.logo.symbol.dark,
  ],
  
  // Asset loading priorities
  priorities: {
    critical: ['logo.primary', 'logo.symbol'],
    high: ['splash.logo', 'icons.app'],
    normal: ['splash.background'],
  },
  
  // Performance optimization settings
  caching: {
    maxCacheSize: 50 * 1024 * 1024, // 50MB cache limit
    cacheDuration: 7 * 24 * 60 * 60 * 1000, // 7 days
  },
} as const;

/**
 * Preload critical brand assets
 */
export async function preloadBrandAssets(): Promise<void> {
  try {
    const prefetchPromises = assetConfig.prefetchAssets.map(asset => {
      // In Expo/React Native, assets are bundled, but we can still prefetch
      // This is more relevant for remote assets
      return Promise.resolve(asset);
    });
    
    await Promise.all(prefetchPromises);
    // console.log('✅ Brand assets preloaded successfully');
  } catch (error) {
    // console.warn('⚠️ Failed to preload some brand assets:', error);
  }
}

/**
 * Get brand asset with responsive sizing
 */
export function getResponsiveBrandAsset(
  assetKey: keyof typeof brandAssets.logo.primary,
  maxWidth: number = 200
): BrandAsset {
  const asset = brandAssets.logo.primary[assetKey];
  const scale = PixelRatio.get();
  
  return {
    uri: asset,
    width: Math.min(maxWidth * scale, maxWidth),
    height: Math.min((maxWidth * 0.3) * scale, maxWidth * 0.3), // Maintain aspect ratio
    scale: scale,
  };
}

/**
 * Brand asset validation
 */
export function validateBrandAssets(): boolean {
  const requiredAssets = [
    'logo.primary.light',
    'logo.primary.dark', 
    'logo.symbol.light',
    'logo.symbol.dark',
    'splash.background',
    'splash.logo',
  ];
  
  // In production, implement actual asset existence validation
  // For now, assume all assets exist since they're bundled
  // console.log('✅ All required brand assets are available');
  return true;
}