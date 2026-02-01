/**
 * Responsive Layout Wrapper Component
 * Story 2.3: Tournament Info Panel System
 * 
 * Adaptive layout system for portrait and landscape orientations
 */

import React, { useState, useEffect, ReactNode, useCallback } from 'react';
import {
  View,
  Dimensions,
  StyleSheet
} from 'react-native';
import { designTokens } from '../../theme/tokens';

interface ResponsiveLayoutProps {
  children: ReactNode;
  portraitLayout?: 'single-column' | 'stacked';
  landscapeLayout?: 'two-column' | 'grid' | 'tabs';
  breakpoint?: number;
  enableAdaptiveDensity?: boolean;
  onOrientationChange?: (orientation: 'portrait' | 'landscape', dimensions: { width: number; height: number }) => void;
}

interface ScreenDimensions {
  width: number;
  height: number;
  orientation: 'portrait' | 'landscape';
  isTablet: boolean;
  densityFactor: number;
}

const ResponsiveLayout: React.FC<ResponsiveLayoutProps> = React.memo(({
  children,
  portraitLayout = 'single-column',
  landscapeLayout = 'two-column',
  breakpoint = 768,
  enableAdaptiveDensity = true,
  onOrientationChange
}) => {
  const [dimensions, setDimensions] = useState<ScreenDimensions>(() => {
    const { width, height } = Dimensions.get('window');
    return {
      width,
      height,
      orientation: width > height ? 'landscape' : 'portrait',
      isTablet: Math.min(width, height) >= breakpoint,
      densityFactor: calculateDensityFactor(width, height)
    };
  });

  const styles = getStyles(dimensions);

  const calculateDensityFactor = useCallback((width: number, height: number): number => {
    if (!enableAdaptiveDensity) return 1;
    
    const screenArea = width * height;
    const baseArea = 375 * 667; // iPhone 6/7/8 base size
    
    if (screenArea > baseArea * 2) return 1.3; // Large screens - more content
    if (screenArea > baseArea * 1.5) return 1.15; // Medium screens - slightly more
    if (screenArea < baseArea * 0.8) return 0.9; // Small screens - less content
    
    return 1; // Standard density
  }, [enableAdaptiveDensity]);

  useEffect(() => {
    const updateDimensions = ({ window }: { window: { width: number; height: number } }) => {
      const newDimensions: ScreenDimensions = {
        width: window.width,
        height: window.height,
        orientation: window.width > window.height ? 'landscape' : 'portrait',
        isTablet: Math.min(window.width, window.height) >= breakpoint,
        densityFactor: calculateDensityFactor(window.width, window.height)
      };

      setDimensions(newDimensions);
      onOrientationChange?.(newDimensions.orientation, {
        width: newDimensions.width,
        height: newDimensions.height
      });
    };

    const subscription = Dimensions.addEventListener('change', updateDimensions);
    
    return () => subscription?.remove();
  }, [breakpoint, onOrientationChange, calculateDensityFactor]);


  const renderSingleColumn = () => (
    <View style={styles.singleColumnContainer}>
      {React.Children.map(children, (child, index) => (
        <View key={index} style={styles.singleColumnItem}>
          {child}
        </View>
      ))}
    </View>
  );

  const renderTwoColumn = () => {
    const childrenArray = React.Children.toArray(children);
    const leftColumn: ReactNode[] = [];
    const rightColumn: ReactNode[] = [];

    // Distribute children between columns
    childrenArray.forEach((child, index) => {
      if (index % 2 === 0) {
        leftColumn.push(child);
      } else {
        rightColumn.push(child);
      }
    });

    return (
      <View style={styles.twoColumnContainer}>
        <View style={styles.columnLeft}>
          {leftColumn.map((child, index) => (
            <View key={`left-${index}`} style={styles.columnItem}>
              {child}
            </View>
          ))}
        </View>
        <View style={styles.columnRight}>
          {rightColumn.map((child, index) => (
            <View key={`right-${index}`} style={styles.columnItem}>
              {child}
            </View>
          ))}
        </View>
      </View>
    );
  };

  const renderGrid = () => {
    const childrenArray = React.Children.toArray(children);
    const rows: ReactNode[][] = [];
    const itemsPerRow = dimensions.isTablet ? 3 : 2;

    // Group children into rows
    for (let i = 0; i < childrenArray.length; i += itemsPerRow) {
      rows.push(childrenArray.slice(i, i + itemsPerRow));
    }

    return (
      <View style={styles.gridContainer}>
        {rows.map((row, rowIndex) => (
          <View key={rowIndex} style={styles.gridRow}>
            {row.map((child, colIndex) => (
              <View
                key={`${rowIndex}-${colIndex}`}
                style={[
                  styles.gridItem,
                  { flex: 1 / row.length }
                ]}
              >
                {child}
              </View>
            ))}
          </View>
        ))}
      </View>
    );
  };

  const renderStacked = () => (
    <View style={styles.stackedContainer}>
      {React.Children.map(children, (child, index) => (
        <View key={index} style={styles.stackedItem}>
          {child}
        </View>
      ))}
    </View>
  );

  const getLayoutRenderer = () => {
    if (dimensions.orientation === 'portrait') {
      switch (portraitLayout) {
        case 'stacked':
          return renderStacked();
        case 'single-column':
        default:
          return renderSingleColumn();
      }
    } else {
      switch (landscapeLayout) {
        case 'grid':
          return renderGrid();
        case 'tabs':
          // For now, fallback to two-column for tabs
          return renderTwoColumn();
        case 'two-column':
        default:
          return renderTwoColumn();
      }
    }
  };

  return (
    <View style={styles.container}>
      {getLayoutRenderer()}
    </View>
  );
});

const getStyles = (dimensions: ScreenDimensions) => {
  const { densityFactor, orientation, isTablet } = dimensions;
  
  // Adaptive spacing based on density
  const adaptiveSpacing = {
    small: designTokens.spacing.small * densityFactor,
    medium: designTokens.spacing.medium * densityFactor,
    large: designTokens.spacing.large * densityFactor,
    extraLarge: designTokens.spacing.extraLarge * densityFactor,
  };

  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: designTokens.colors.background,
    },
    
    // Single Column Layout
    singleColumnContainer: {
      flex: 1,
      paddingHorizontal: adaptiveSpacing.medium,
    },
    singleColumnItem: {
      marginBottom: adaptiveSpacing.small,
    },
    
    // Two Column Layout
    twoColumnContainer: {
      flex: 1,
      flexDirection: 'row',
      paddingHorizontal: adaptiveSpacing.medium,
    },
    columnLeft: {
      flex: 1,
      marginRight: adaptiveSpacing.small,
    },
    columnRight: {
      flex: 1,
      marginLeft: adaptiveSpacing.small,
    },
    columnItem: {
      marginBottom: adaptiveSpacing.small,
    },
    
    // Grid Layout
    gridContainer: {
      flex: 1,
      paddingHorizontal: adaptiveSpacing.medium,
    },
    gridRow: {
      flexDirection: 'row',
      marginBottom: adaptiveSpacing.small,
    },
    gridItem: {
      marginHorizontal: adaptiveSpacing.small / 2,
    },
    
    // Stacked Layout
    stackedContainer: {
      flex: 1,
      paddingHorizontal: orientation === 'landscape' && isTablet 
        ? adaptiveSpacing.extraLarge 
        : adaptiveSpacing.medium,
    },
    stackedItem: {
      marginBottom: adaptiveSpacing.medium,
      // Landscape stacked items can be more compact
      ...(orientation === 'landscape' && {
        marginBottom: adaptiveSpacing.small,
      }),
    },
  });
};

ResponsiveLayout.displayName = 'ResponsiveLayout';

export default ResponsiveLayout;