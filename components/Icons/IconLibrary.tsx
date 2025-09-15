/**
 * IconLibrary Component
 * Story 1.5: Outdoor-Optimized Iconography
 * 
 * Pre-configured icon components for common tournament referee app functions
 */

/* eslint-disable react/display-name */

import React from 'react';
import { Icon, IconProps } from './Icon';
import { StatusIcon, StatusIconProps } from './StatusIcon';
import { AccessibilityIcon } from './AccessibilityIcon';
import { IconSize, IconVariant } from '../../utils/icons';

// Common icon configurations with predefined props
export interface CommonIconProps extends Omit<IconProps, 'category' | 'name'> {
  size?: IconSize;
  variant?: IconVariant;
  isInteractive?: boolean;
}

/**
 * Navigation Icons - High-visibility icons for app navigation
 */
export const NavigationIcons = {
  Home: React.memo((props: CommonIconProps) => (
    <Icon 
      category="navigation" 
      name="home" 
      theme="highContrast"
      accessibilityLabel="Home"
      {...props} 
    />
  )),
  
  Tournaments: React.memo((props: CommonIconProps) => (
    <Icon 
      category="navigation" 
      name="tournaments" 
      theme="highContrast"
      accessibilityLabel="Tournaments"
      {...props} 
    />
  )),
  
  Assignments: React.memo((props: CommonIconProps) => (
    <Icon 
      category="navigation" 
      name="assignments" 
      theme="highContrast"
      accessibilityLabel="My Assignments"
      {...props} 
    />
  )),
  
  Schedule: React.memo((props: CommonIconProps) => (
    <Icon 
      category="navigation" 
      name="schedule" 
      theme="highContrast"
      accessibilityLabel="Schedule"
      {...props} 
    />
  )),
  
  Settings: React.memo((props: CommonIconProps) => (
    <Icon 
      category="navigation" 
      name="settings" 
      theme="highContrast"
      accessibilityLabel="Settings"
      {...props} 
    />
  )),
  
  Back: React.memo((props: CommonIconProps) => (
    <Icon 
      category="navigation" 
      name="back" 
      theme="highContrast"
      accessibilityLabel="Go back"
      isInteractive={true}
      {...props} 
    />
  )),
};

/**
 * Accessibility-Enhanced Navigation Icons
 * For users requiring enhanced accessibility support
 */
export const AccessibilityNavigationIcons = {
  Home: React.memo((props: CommonIconProps) => (
    <AccessibilityIcon 
      category="navigation" 
      name="home" 
      theme="accessibility"
      screenReaderDescription="Navigate to home screen"
      contextualHint="Returns to the main tournament overview"
      respectHighContrastMode={true}
      {...props} 
    />
  )),
  
  Tournaments: React.memo((props: CommonIconProps) => (
    <AccessibilityIcon 
      category="navigation" 
      name="tournaments" 
      theme="accessibility"
      screenReaderDescription="View tournaments list"
      contextualHint="Shows all available tournaments"
      respectHighContrastMode={true}
      {...props} 
    />
  )),
  
  Assignments: React.memo((props: CommonIconProps) => (
    <AccessibilityIcon 
      category="navigation" 
      name="assignments" 
      theme="accessibility"
      screenReaderDescription="View my referee assignments"
      contextualHint="Shows matches assigned to you"
      respectHighContrastMode={true}
      {...props} 
    />
  )),
};

/**
 * Action Icons - Interactive icons for user actions
 */
export const ActionIcons = {
  Edit: React.memo((props: CommonIconProps) => (
    <Icon 
      category="action" 
      name="edit" 
      theme="default"
      colorKey="accent"
      isInteractive={true}
      accessibilityLabel="Edit"
      {...props} 
    />
  )),
  
  Delete: React.memo((props: CommonIconProps) => (
    <Icon 
      category="action" 
      name="delete" 
      theme="default"
      colorKey="accent"
      isInteractive={true}
      accessibilityLabel="Delete"
      {...props} 
    />
  )),
  
  Add: React.memo((props: CommonIconProps) => (
    <Icon 
      category="action" 
      name="add" 
      theme="highContrast"
      isInteractive={true}
      accessibilityLabel="Add new item"
      {...props} 
    />
  )),
  
  Refresh: React.memo((props: CommonIconProps) => (
    <Icon 
      category="action" 
      name="refresh" 
      theme="default"
      colorKey="secondary"
      isInteractive={true}
      accessibilityLabel="Refresh data"
      {...props} 
    />
  )),
  
  Filter: React.memo((props: CommonIconProps) => (
    <Icon 
      category="action" 
      name="filter" 
      theme="default"
      colorKey="secondary"
      isInteractive={true}
      accessibilityLabel="Filter results"
      {...props} 
    />
  )),
  
  Search: React.memo((props: CommonIconProps) => (
    <Icon
      category="action"
      name="search"
      theme="default"
      colorKey="secondary"
      isInteractive={true}
      accessibilityLabel="Search"
      {...props}
    />
  )),

  Close: React.memo((props: CommonIconProps) => (
    <Icon
      category="action"
      name="close"
      theme="default"
      colorKey="secondary"
      isInteractive={true}
      accessibilityLabel="Close"
      {...props}
    />
  )),

  Profile: React.memo((props: CommonIconProps) => (
    <Icon
      category="action"
      name="profile"
      theme="default"
      colorKey="primary"
      isInteractive={true}
      accessibilityLabel="View Profile"
      {...props}
    />
  )),
};

/**
 * Status Icons - Tournament and match status indicators
 */
export const StatusIcons = {
  Current: React.memo((props: Omit<StatusIconProps, 'status'>) => (
    <StatusIcon status="current" {...props} />
  )),
  
  Upcoming: React.memo((props: Omit<StatusIconProps, 'status'>) => (
    <StatusIcon status="upcoming" {...props} />
  )),
  
  Completed: React.memo((props: Omit<StatusIconProps, 'status'>) => (
    <StatusIcon status="completed" {...props} />
  )),
  
  Cancelled: React.memo((props: Omit<StatusIconProps, 'status'>) => (
    <StatusIcon status="cancelled" {...props} />
  )),
  
  Emergency: React.memo((props: Omit<StatusIconProps, 'status'>) => (
    <StatusIcon status="emergency" isEmergency={true} {...props} />
  )),
};

/**
 * Communication Icons - Alerts, notifications, messages
 */
export const CommunicationIcons = {
  Alert: React.memo((props: CommonIconProps) => (
    <Icon 
      category="communication" 
      name="alert" 
      theme="highContrast"
      colorKey="accent"
      accessibilityLabel="Alert"
      {...props} 
    />
  )),
  
  Notification: React.memo((props: CommonIconProps) => (
    <Icon 
      category="communication" 
      name="notification" 
      theme="default"
      colorKey="accent"
      accessibilityLabel="Notification"
      {...props} 
    />
  )),
  
  Message: React.memo((props: CommonIconProps) => (
    <Icon 
      category="communication" 
      name="message" 
      theme="default"
      colorKey="secondary"
      accessibilityLabel="Message"
      {...props} 
    />
  )),
};

/**
 * Data Icons - Information display and organization
 */
export const DataIcons = {
  List: React.memo((props: CommonIconProps) => (
    <Icon 
      category="data" 
      name="list" 
      theme="default"
      colorKey="secondary"
      accessibilityLabel="List view"
      {...props} 
    />
  )),
  
  Grid: React.memo((props: CommonIconProps) => (
    <Icon 
      category="data" 
      name="grid" 
      theme="default"
      colorKey="secondary"
      accessibilityLabel="Grid view"
      {...props} 
    />
  )),
  
  Details: React.memo((props: CommonIconProps) => (
    <Icon 
      category="data" 
      name="details" 
      theme="default"
      colorKey="secondary"
      accessibilityLabel="View details"
      {...props} 
    />
  )),
  
  Stats: React.memo((props: CommonIconProps) => (
    <Icon 
      category="data" 
      name="stats" 
      theme="default"
      colorKey="secondary"
      accessibilityLabel="Statistics"
      {...props} 
    />
  )),
};

/**
 * Utility Icons - Helper functions and settings
 */
export const UtilityIcons = {
  Help: React.memo((props: CommonIconProps) => (
    <Icon 
      category="utility" 
      name="help" 
      theme="default"
      colorKey="muted"
      accessibilityLabel="Help"
      {...props} 
    />
  )),
  
  Info: React.memo((props: CommonIconProps) => (
    <Icon 
      category="utility" 
      name="info" 
      theme="default"
      colorKey="secondary"
      accessibilityLabel="Information"
      {...props} 
    />
  )),
  
  External: React.memo((props: CommonIconProps) => (
    <Icon 
      category="utility" 
      name="external" 
      theme="default"
      colorKey="secondary"
      accessibilityLabel="Open external link"
      {...props} 
    />
  )),
};

// Set display names for better debugging
Object.entries(NavigationIcons).forEach(([key, Component]) => {
  Component.displayName = `NavigationIcon.${key}`;
});

Object.entries(AccessibilityNavigationIcons).forEach(([key, Component]) => {
  Component.displayName = `AccessibilityNavigationIcon.${key}`;
});

Object.entries(ActionIcons).forEach(([key, Component]) => {
  Component.displayName = `ActionIcon.${key}`;
});

Object.entries(StatusIcons).forEach(([key, Component]) => {
  Component.displayName = `StatusIcon.${key}`;
});

Object.entries(CommunicationIcons).forEach(([key, Component]) => {
  Component.displayName = `CommunicationIcon.${key}`;
});

Object.entries(DataIcons).forEach(([key, Component]) => {
  Component.displayName = `DataIcon.${key}`;
});

Object.entries(UtilityIcons).forEach(([key, Component]) => {
  Component.displayName = `UtilityIcon.${key}`;
});

export default {
  NavigationIcons,
  AccessibilityNavigationIcons,
  ActionIcons,
  StatusIcons,
  CommunicationIcons,
  DataIcons,
  UtilityIcons,
};