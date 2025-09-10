/**
 * @fileoverview Standardized MaterialCommunityIcons configuration for BeachRef
 * Provides consistent icon usage across the application with predefined sizes and colors
 */

import React from 'react';
import { Text, Platform } from 'react-native';
import { MaterialCommunityIcons as MCIcons } from '@expo/vector-icons';
import { colors } from '../../theme/tokens';

// Platform-aware Icon wrapper to avoid web font timeouts
export const Icon: React.FC<{ name: string; size?: number; color?: string; style?: any }> = ({ name, size = 24, color = '#000', style }) => {
  if (Platform.OS === 'web') {
    // Minimal, font-free fallback for web dev to avoid 6000ms font timeouts
    const fallback = name?.toLowerCase().includes('volleyball') ? '🏐' : '⬤';
    return (
      <Text aria-label={name} style={[{ fontSize: size, color }, style]}>
        {fallback}
      </Text>
    );
  }
  return <MCIcons name={name as any} size={size} color={color} style={style} />;
};

// Standard icon sizes
export const IconSizes = {
  xs: 12,
  small: 16,
  medium: 20,
  large: 24,
  xl: 32,
  xxl: 48,
} as const;

// Common icon colors
export const IconColors = {
  primary: colors.primary || '#FF6B35',
  secondary: colors.textSecondary || '#6B7280',
  muted: '#9CA3AF',
  white: '#FFFFFF',
  success: colors.success || '#10B981',
  error: colors.error || '#EF4444',
  warning: '#F59E0B',
} as const;

// Predefined icon components for common use cases
interface IconProps {
  size?: keyof typeof IconSizes | number;
  color?: keyof typeof IconColors | string;
  style?: any;
}

// Navigation icons
export const HomeIcon: React.FC<IconProps> = ({ size = 'medium', color = 'white', style }) => (
  <Icon 
    name="home-outline" 
    size={typeof size === 'number' ? size : IconSizes[size]} 
    color={typeof color === 'string' && color in IconColors ? IconColors[color as keyof typeof IconColors] : color}
    style={style}
  />
);

export const BackIcon: React.FC<IconProps> = ({ size = 'medium', color = 'white', style }) => (
  <Icon 
    name="arrow-left" 
    size={typeof size === 'number' ? size : IconSizes[size]} 
    color={typeof color === 'string' && color in IconColors ? IconColors[color as keyof typeof IconColors] : color}
    style={style}
  />
);

export const RefreshIcon: React.FC<IconProps> = ({ size = 'medium', color = 'white', style }) => (
  <Icon 
    name="refresh" 
    size={typeof size === 'number' ? size : IconSizes[size]} 
    color={typeof color === 'string' && color in IconColors ? IconColors[color as keyof typeof IconColors] : color}
    style={style}
  />
);

// Content icons
export const CalendarIcon: React.FC<IconProps> = ({ size = 'small', color = 'secondary', style }) => (
  <Icon 
    name="calendar-outline" 
    size={typeof size === 'number' ? size : IconSizes[size]} 
    color={typeof color === 'string' && color in IconColors ? IconColors[color as keyof typeof IconColors] : color}
    style={style}
  />
);

export const ClockIcon: React.FC<IconProps> = ({ size = 'medium', color = 'secondary', style }) => (
  <Icon 
    name="clock-outline" 
    size={typeof size === 'number' ? size : IconSizes[size]} 
    color={typeof color === 'string' && color in IconColors ? IconColors[color as keyof typeof IconColors] : color}
    style={style}
  />
);

export const VolleyballIcon: React.FC<IconProps> = ({ size = 'large', color = 'white', style }) => (
  <Icon 
    name="volleyball" 
    size={typeof size === 'number' ? size : IconSizes[size]} 
    color={typeof color === 'string' && color in IconColors ? IconColors[color as keyof typeof IconColors] : color}
    style={style}
  />
);

// Action icons  
export const FilterIcon: React.FC<IconProps> = ({ size = 'medium', color = 'secondary', style }) => (
  <Icon 
    name="filter-outline" 
    size={typeof size === 'number' ? size : IconSizes[size]} 
    color={typeof color === 'string' && color in IconColors ? IconColors[color as keyof typeof IconColors] : color}
    style={style}
  />
);

export const SearchIcon: React.FC<IconProps> = ({ size = 'medium', color = 'secondary', style }) => (
  <Icon 
    name="magnify" 
    size={typeof size === 'number' ? size : IconSizes[size]} 
    color={typeof color === 'string' && color in IconColors ? IconColors[color as keyof typeof IconColors] : color}
    style={style}
  />
);

export const SettingsIcon: React.FC<IconProps> = ({ size = 'medium', color = 'secondary', style }) => (
  <Icon 
    name="cog-outline" 
    size={typeof size === 'number' ? size : IconSizes[size]} 
    color={typeof color === 'string' && color in IconColors ? IconColors[color as keyof typeof IconColors] : color}
    style={style}
  />
);

// Status icons
export const CheckIcon: React.FC<IconProps> = ({ size = 'medium', color = 'success', style }) => (
  <Icon 
    name="check" 
    size={typeof size === 'number' ? size : IconSizes[size]} 
    color={typeof color === 'string' && color in IconColors ? IconColors[color as keyof typeof IconColors] : color}
    style={style}
  />
);

export const AlertIcon: React.FC<IconProps> = ({ size = 'medium', color = 'warning', style }) => (
  <Icon 
    name="alert-outline" 
    size={typeof size === 'number' ? size : IconSizes[size]} 
    color={typeof color === 'string' && color in IconColors ? IconColors[color as keyof typeof IconColors] : color}
    style={style}
  />
);

export const ErrorIcon: React.FC<IconProps> = ({ size = 'medium', color = 'error', style }) => (
  <Icon 
    name="alert-circle-outline" 
    size={typeof size === 'number' ? size : IconSizes[size]} 
    color={typeof color === 'string' && color in IconColors ? IconColors[color as keyof typeof IconColors] : color}
    style={style}
  />
);

// Navigation direction icons
export const ChevronUpIcon: React.FC<IconProps> = ({ size = 'small', color = 'secondary', style }) => (
  <Icon 
    name="chevron-up" 
    size={typeof size === 'number' ? size : IconSizes[size]} 
    color={typeof color === 'string' && color in IconColors ? IconColors[color as keyof typeof IconColors] : color}
    style={style}
  />
);

export const ChevronDownIcon: React.FC<IconProps> = ({ size = 'small', color = 'secondary', style }) => (
  <Icon 
    name="chevron-down" 
    size={typeof size === 'number' ? size : IconSizes[size]} 
    color={typeof color === 'string' && color in IconColors ? IconColors[color as keyof typeof IconColors] : color}
    style={style}
  />
);

export const ChevronRightIcon: React.FC<IconProps> = ({ size = 'small', color = 'secondary', style }) => (
  <Icon 
    name="chevron-right" 
    size={typeof size === 'number' ? size : IconSizes[size]} 
    color={typeof color === 'string' && color in IconColors ? IconColors[color as keyof typeof IconColors] : color}
    style={style}
  />
);

// Export default as Icon for backward compatibility
export default Icon;
