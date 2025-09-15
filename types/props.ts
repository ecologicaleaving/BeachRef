/**
 * Standardized Component Props
 * Part of Component Prop Interface Standardization Refactoring
 * Provides consistent prop interfaces across all components
 */

import { ViewStyle, TextStyle, AccessibilityRole } from 'react-native';
import { TouchableOpacityProps, ViewProps, TextProps as RNTextProps } from 'react-native';

// ================================
// Base Common Props
// ================================

/**
 * Common interactive props for touchable components
 */
export interface BaseInteractiveProps {
  onPress?: () => void;
  onPressIn?: () => void;
  onPressOut?: () => void;
  onLongPress?: () => void;
  disabled?: boolean;
  loading?: boolean;
}

/**
 * Common styling props for visual components
 */
export interface BaseStyleProps {
  style?: ViewStyle;
  containerStyle?: ViewStyle;
  textStyle?: TextStyle;
}

/**
 * Common accessibility props for all components
 */
export interface BaseAccessibilityProps {
  accessibilityLabel?: string;
  accessibilityHint?: string;
  accessibilityRole?: AccessibilityRole;
  testID?: string;
}

/**
 * Common variant and theming props
 */
export interface BaseVariantProps {
  variant?: ComponentVariant;
  size?: ComponentSize;
  theme?: ComponentTheme;
}

/**
 * Common state props for components with loading/error states
 */
export interface BaseStateProps {
  loading?: boolean;
  error?: boolean;
  success?: boolean;
  disabled?: boolean;
}

// ================================
// Standardized Enums
// ================================

export type ComponentVariant =
  | 'primary'
  | 'secondary'
  | 'accent'
  | 'success'
  | 'warning'
  | 'error'
  | 'info'
  | 'neutral';

export type ComponentSize = 'small' | 'medium' | 'large' | 'xlarge';

export type ComponentTheme = 'light' | 'dark' | 'default' | 'highContrast';

// ================================
// Composite Base Interfaces
// ================================

/**
 * Complete base props for interactive components (buttons, cards, etc.)
 */
export interface BaseComponentProps extends
  BaseInteractiveProps,
  BaseStyleProps,
  BaseAccessibilityProps,
  BaseVariantProps,
  BaseStateProps {
}

/**
 * Base props for display-only components (text, icons, badges, etc.)
 */
export interface BaseDisplayProps extends
  BaseStyleProps,
  BaseAccessibilityProps,
  BaseVariantProps,
  BaseStateProps {
}

/**
 * Base props for container components (views, cards, sections, etc.)
 */
export interface BaseContainerProps extends
  BaseInteractiveProps,
  BaseStyleProps,
  BaseAccessibilityProps,
  BaseVariantProps {
  children?: React.ReactNode;
  fullWidth?: boolean;
  padding?: ComponentSize | number;
  margin?: ComponentSize | number;
}

// ================================
// Specific Component Prop Types
// ================================

/**
 * Props for button-like components
 */
export interface ButtonProps extends BaseComponentProps {
  children: React.ReactNode;
  fullWidth?: boolean;
  icon?: string;
  iconPosition?: 'left' | 'right';
  type?: 'solid' | 'outline' | 'ghost' | 'link';
}

/**
 * Props for text components
 */
export interface TextProps extends BaseDisplayProps {
  children: React.ReactNode;
  numberOfLines?: number;
  ellipsizeMode?: 'head' | 'middle' | 'tail' | 'clip';
  weight?: 'normal' | 'medium' | 'semibold' | 'bold';
  align?: 'left' | 'center' | 'right' | 'justify';
}

/**
 * Props for icon components
 */
export interface IconProps extends BaseDisplayProps {
  name: string;
  color?: string;
  backgroundColor?: string;
  rounded?: boolean;
}

/**
 * Props for card components
 */
export interface CardProps extends BaseContainerProps {
  elevated?: boolean;
  bordered?: boolean;
  rounded?: boolean;
  header?: React.ReactNode;
  footer?: React.ReactNode;
}

/**
 * Props for badge/status components
 */
export interface BadgeProps extends BaseDisplayProps {
  text?: string;
  count?: number;
  dot?: boolean;
  position?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left';
}

/**
 * Props for input components
 */
export interface InputProps extends BaseComponentProps {
  value?: string;
  defaultValue?: string;
  placeholder?: string;
  onChangeText?: (text: string) => void;
  onFocus?: () => void;
  onBlur?: () => void;
  multiline?: boolean;
  maxLength?: number;
  keyboardType?: 'default' | 'numeric' | 'email-address' | 'phone-pad';
  autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters';
  autoCorrect?: boolean;
  secureTextEntry?: boolean;
}

// ================================
// Domain-Specific Props
// ================================

/**
 * Props for referee-related components
 */
export interface RefereeComponentProps extends BaseComponentProps {
  refereeId?: string;
  assignmentStatus?: 'assigned' | 'unassigned' | 'available' | 'busy';
  showStatus?: boolean;
}

/**
 * Props for tournament-related components
 */
export interface TournamentComponentProps extends BaseComponentProps {
  tournamentId?: string | number;
  tournamentCode?: string;
  showDetails?: boolean;
  compact?: boolean;
}

/**
 * Props for match-related components
 */
export interface MatchComponentProps extends BaseComponentProps {
  matchId?: string | number;
  courtNumber?: string | number;
  matchStatus?: 'scheduled' | 'live' | 'completed' | 'cancelled';
  showScore?: boolean;
  showTime?: boolean;
}

/**
 * Props for status indicator components
 */
export interface StatusComponentProps extends BaseDisplayProps {
  status: string;
  statusType?: 'success' | 'warning' | 'error' | 'info' | 'neutral';
  animated?: boolean;
  pulsing?: boolean;
}

// ================================
// Layout Props
// ================================

/**
 * Props for layout components (lists, grids, etc.)
 */
export interface LayoutProps extends BaseContainerProps {
  direction?: 'row' | 'column';
  justify?: 'flex-start' | 'flex-end' | 'center' | 'space-between' | 'space-around' | 'space-evenly';
  align?: 'flex-start' | 'flex-end' | 'center' | 'stretch' | 'baseline';
  wrap?: boolean;
  gap?: ComponentSize | number;
}

/**
 * Props for list item components
 */
export interface ListItemProps extends BaseComponentProps {
  leading?: React.ReactNode;
  trailing?: React.ReactNode;
  subtitle?: string;
  description?: string;
  divider?: boolean;
}

// ================================
// Form Props
// ================================

/**
 * Props for form field components
 */
export interface FormFieldProps extends InputProps {
  label?: string;
  required?: boolean;
  helperText?: string;
  errorText?: string;
  leftIcon?: string;
  rightIcon?: string;
  onIconPress?: () => void;
}

/**
 * Props for form validation
 */
export interface ValidationProps {
  rules?: ValidationRule[];
  validateOnChange?: boolean;
  validateOnBlur?: boolean;
}

export interface ValidationRule {
  required?: boolean;
  minLength?: number;
  maxLength?: number;
  pattern?: RegExp;
  custom?: (value: any) => boolean | string;
  message?: string;
}

// ================================
// Animation Props
// ================================

/**
 * Props for animated components
 */
export interface AnimationProps {
  animated?: boolean;
  animationType?: 'fade' | 'slide' | 'scale' | 'spring' | 'bounce';
  animationDuration?: number;
  animationDelay?: number;
  loop?: boolean;
}

// ================================
// Extended React Native Props
// ================================

/**
 * Enhanced TouchableOpacity props with standardized additions
 */
export interface TouchableProps extends
  Omit<TouchableOpacityProps, keyof BaseComponentProps>,
  BaseComponentProps {
}

/**
 * Enhanced View props with standardized additions
 */
export interface ViewComponentProps extends
  Omit<ViewProps, keyof BaseContainerProps>,
  BaseContainerProps {
}

/**
 * Enhanced Text props with standardized additions
 */
export interface TextComponentProps extends
  Omit<RNTextProps, keyof TextProps>,
  TextProps {
}

// ================================
// Utility Types
// ================================

/**
 * Extract only the style-related props from a component props interface
 */
export type StylePropsOnly<T> = Pick<T, Extract<keyof T, keyof BaseStyleProps>>;

/**
 * Extract only the interactive props from a component props interface
 */
export type InteractivePropsOnly<T> = Pick<T, Extract<keyof T, keyof BaseInteractiveProps>>;

/**
 * Make all props optional except specified required ones
 */
export type OptionalExcept<T, K extends keyof T> = Partial<T> & Pick<T, K>;

/**
 * Component props with children required
 */
export type WithChildren<T> = T & { children: React.ReactNode };

/**
 * Component props with optional children
 */
export type WithOptionalChildren<T> = T & { children?: React.ReactNode };

// ================================
// Default Prop Values
// ================================

/**
 * Default values for common props
 */
export const DEFAULT_PROPS = {
  size: 'medium' as ComponentSize,
  variant: 'primary' as ComponentVariant,
  theme: 'default' as ComponentTheme,
  disabled: false,
  loading: false,
  animated: false,
  fullWidth: false,
} as const;

/**
 * Default accessibility props
 */
export const DEFAULT_ACCESSIBILITY = {
  accessibilityRole: 'button' as AccessibilityRole,
} as const;