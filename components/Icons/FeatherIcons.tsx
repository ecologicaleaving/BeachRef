/**
 * @fileoverview Standardized Feather Icons configuration for BeachRef
 * Provides consistent, professional icon usage across the application
 */

import React from 'react';
import { Text, Platform } from 'react-native';
import { Feather } from './vectorIconSets';
import { colors, designTokens } from '../../theme/tokens';

// Platform-aware Icon wrapper to avoid web font timeouts
export const Icon: React.FC<{
  name: keyof typeof Feather.glyphMap;
  size?: number;
  color?: string;
  style?: any;
  fallback?: string;
}> = ({ name, size = 24, color = '#000', style, fallback }) => {
  if (Platform.OS === 'web') {
    // Minimal, font-free fallback for web dev to avoid font timeouts
    let webFallback = fallback || '⬤';

    // Map specific icons to better emoji fallbacks
    const fallbackMap: { [key: string]: string } = {
      'calendar': '📅',
      'users': '👥',
      'shield': '🛡️',
      'home': '🏠',
      'arrow-left': '←',
      'refresh-cw': '↻',
      'clock': '🕒',
      'filter': '⚙️',
      'search': '🔍',
      'settings': '⚙️',
      'check': '✓',
      'alert-triangle': '⚠️',
      'alert-circle': '❌',
      'chevron-up': '▲',
      'chevron-down': '▼',
      'chevron-right': '▶',
      'menu': '☰',
      'x': '✕',
      'info': 'ℹ️',
      'award': '🏅',
      'star': '⭐',
      'map-pin': '📍',
      'flag': '🚩',
      'wifi': '📶',
      'wifi-off': '📵',
      'edit': '✏️',
      'save': '💾',
      'plus': '+',
      'minus': '-',
      'eye': '👁️',
      'eye-off': '🙈',
      'activity': '📊',
      'target': '🎯',
      'bell': '🔔',
      'mail': '📧',
      'phone': '📞',
      'globe': '🌐',
    };

    webFallback = fallbackMap[name] || webFallback;

    return (
      <Text aria-label={name} style={[{ fontSize: size, color }, style]}>
        {webFallback}
      </Text>
    );
  }
  return <Feather name={name} size={size} color={color} style={style} />;
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
  secondary: colors.textSecondary || designTokens.neutrals.textSecondary,
  muted: designTokens.neutrals.textSecondary,
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

// Helper function to get size and color values
const getIconProps = (size: keyof typeof IconSizes | number, color: keyof typeof IconColors | string) => ({
  size: typeof size === 'number' ? size : IconSizes[size],
  color: typeof color === 'string' && color in IconColors ? IconColors[color as keyof typeof IconColors] : color
});

// Navigation icons
export const HomeIcon: React.FC<IconProps> = ({ size = 'medium', color = 'white', style }) => (
  <Icon
    name="home"
    {...getIconProps(size, color)}
    style={style}
  />
);

export const BackIcon: React.FC<IconProps> = ({ size = 'medium', color = 'white', style }) => (
  <Icon
    name="arrow-left"
    {...getIconProps(size, color)}
    style={style}
  />
);

export const RefreshIcon: React.FC<IconProps> = ({ size = 'medium', color = 'white', style }) => (
  <Icon
    name="refresh-cw"
    {...getIconProps(size, color)}
    style={style}
  />
);

export const MenuIcon: React.FC<IconProps> = ({ size = 'medium', color = 'white', style }) => (
  <Icon
    name="menu"
    {...getIconProps(size, color)}
    style={style}
  />
);

export const CloseIcon: React.FC<IconProps> = ({ size = 'medium', color = 'white', style }) => (
  <Icon
    name="x"
    {...getIconProps(size, color)}
    style={style}
  />
);

// Tournament/Content icons
export const CalendarIcon: React.FC<IconProps> = ({ size = 'small', color = 'secondary', style }) => (
  <Icon
    name="calendar"
    {...getIconProps(size, color)}
    style={style}
  />
);

export const ScheduleIcon: React.FC<IconProps> = ({ size = 'medium', color = 'secondary', style }) => (
  <Icon
    name="calendar"
    {...getIconProps(size, color)}
    style={style}
  />
);

export const ClockIcon: React.FC<IconProps> = ({ size = 'medium', color = 'secondary', style }) => (
  <Icon
    name="clock"
    {...getIconProps(size, color)}
    style={style}
  />
);

export const PlayersIcon: React.FC<IconProps> = ({ size = 'medium', color = 'secondary', style }) => (
  <Icon
    name="users"
    {...getIconProps(size, color)}
    style={style}
  />
);

export const OfficialsIcon: React.FC<IconProps> = ({ size = 'medium', color = 'secondary', style }) => (
  <Icon
    name="shield"
    {...getIconProps(size, color)}
    style={style}
  />
);

export const LocationIcon: React.FC<IconProps> = ({ size = 'small', color = 'secondary', style }) => (
  <Icon
    name="map-pin"
    {...getIconProps(size, color)}
    style={style}
  />
);

export const FlagIcon: React.FC<IconProps> = ({ size = 'small', color = 'secondary', style }) => (
  <Icon
    name="flag"
    {...getIconProps(size, color)}
    style={style}
  />
);

// Action icons
export const FilterIcon: React.FC<IconProps> = ({ size = 'medium', color = 'secondary', style }) => (
  <Icon
    name="filter"
    {...getIconProps(size, color)}
    style={style}
  />
);

export const SearchIcon: React.FC<IconProps> = ({ size = 'medium', color = 'secondary', style }) => (
  <Icon
    name="search"
    {...getIconProps(size, color)}
    style={style}
  />
);

export const SettingsIcon: React.FC<IconProps> = ({ size = 'medium', color = 'secondary', style }) => (
  <Icon
    name="settings"
    {...getIconProps(size, color)}
    style={style}
  />
);

export const EditIcon: React.FC<IconProps> = ({ size = 'medium', color = 'secondary', style }) => (
  <Icon
    name="edit"
    {...getIconProps(size, color)}
    style={style}
  />
);

export const SaveIcon: React.FC<IconProps> = ({ size = 'medium', color = 'secondary', style }) => (
  <Icon
    name="save"
    {...getIconProps(size, color)}
    style={style}
  />
);

export const PlusIcon: React.FC<IconProps> = ({ size = 'medium', color = 'secondary', style }) => (
  <Icon
    name="plus"
    {...getIconProps(size, color)}
    style={style}
  />
);

export const MinusIcon: React.FC<IconProps> = ({ size = 'medium', color = 'secondary', style }) => (
  <Icon
    name="minus"
    {...getIconProps(size, color)}
    style={style}
  />
);

export const EyeIcon: React.FC<IconProps> = ({ size = 'medium', color = 'secondary', style }) => (
  <Icon
    name="eye"
    {...getIconProps(size, color)}
    style={style}
  />
);

export const EyeOffIcon: React.FC<IconProps> = ({ size = 'medium', color = 'secondary', style }) => (
  <Icon
    name="eye-off"
    {...getIconProps(size, color)}
    style={style}
  />
);

// Status icons
export const CheckIcon: React.FC<IconProps> = ({ size = 'medium', color = 'success', style }) => (
  <Icon
    name="check"
    {...getIconProps(size, color)}
    style={style}
  />
);

export const AlertIcon: React.FC<IconProps> = ({ size = 'medium', color = 'warning', style }) => (
  <Icon
    name="alert-triangle"
    {...getIconProps(size, color)}
    style={style}
  />
);

export const ErrorIcon: React.FC<IconProps> = ({ size = 'medium', color = 'error', style }) => (
  <Icon
    name="alert-circle"
    {...getIconProps(size, color)}
    style={style}
  />
);

export const InfoIcon: React.FC<IconProps> = ({ size = 'medium', color = 'secondary', style }) => (
  <Icon
    name="info"
    {...getIconProps(size, color)}
    style={style}
  />
);

export const StarIcon: React.FC<IconProps> = ({ size = 'medium', color = 'warning', style }) => (
  <Icon
    name="star"
    {...getIconProps(size, color)}
    style={style}
  />
);

export const AwardIcon: React.FC<IconProps> = ({ size = 'medium', color = 'secondary', style }) => (
  <Icon
    name="award"
    {...getIconProps(size, color)}
    style={style}
  />
);

export const ActivityIcon: React.FC<IconProps> = ({ size = 'medium', color = 'secondary', style }) => (
  <Icon
    name="activity"
    {...getIconProps(size, color)}
    style={style}
  />
);

export const TargetIcon: React.FC<IconProps> = ({ size = 'medium', color = 'secondary', style }) => (
  <Icon
    name="target"
    {...getIconProps(size, color)}
    style={style}
  />
);

// Navigation direction icons
export const ChevronUpIcon: React.FC<IconProps> = ({ size = 'small', color = 'secondary', style }) => (
  <Icon
    name="chevron-up"
    {...getIconProps(size, color)}
    style={style}
  />
);

export const ChevronDownIcon: React.FC<IconProps> = ({ size = 'small', color = 'secondary', style }) => (
  <Icon
    name="chevron-down"
    {...getIconProps(size, color)}
    style={style}
  />
);

export const ChevronRightIcon: React.FC<IconProps> = ({ size = 'small', color = 'secondary', style }) => (
  <Icon
    name="chevron-right"
    {...getIconProps(size, color)}
    style={style}
  />
);

// Connectivity icons
export const WifiIcon: React.FC<IconProps> = ({ size = 'small', color = 'success', style }) => (
  <Icon
    name="wifi"
    {...getIconProps(size, color)}
    style={style}
  />
);

export const WifiOffIcon: React.FC<IconProps> = ({ size = 'small', color = 'error', style }) => (
  <Icon
    name="wifi-off"
    {...getIconProps(size, color)}
    style={style}
  />
);

export const BellIcon: React.FC<IconProps> = ({ size = 'medium', color = 'secondary', style }) => (
  <Icon
    name="bell"
    {...getIconProps(size, color)}
    style={style}
  />
);

export const MailIcon: React.FC<IconProps> = ({ size = 'medium', color = 'secondary', style }) => (
  <Icon
    name="mail"
    {...getIconProps(size, color)}
    style={style}
  />
);

export const PhoneIcon: React.FC<IconProps> = ({ size = 'medium', color = 'secondary', style }) => (
  <Icon
    name="phone"
    {...getIconProps(size, color)}
    style={style}
  />
);

export const GlobeIcon: React.FC<IconProps> = ({ size = 'medium', color = 'secondary', style }) => (
  <Icon
    name="globe"
    {...getIconProps(size, color)}
    style={style}
  />
);

// Export default as Icon for backward compatibility
export default Icon;