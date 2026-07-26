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
 * Fabbrica per le voci di libreria che non hanno bisogno di configurazione
 * particolare (issue #49).
 *
 * 36 nomi erano gia' referenziati dai componenti — `ActionIcons.Submit`,
 * `UtilityIcons.Warning`, `DataIcons.Location`, ... — ma non esistevano in questi
 * oggetti. In TypeScript erano 88 TS2339; a runtime sarebbero stati `undefined`
 * passati come tipo di elemento a React, cioe' lo stesso schermo bianco della
 * issue #71. I componenti che li usano oggi non sono raggiungibili da nessuna
 * rotta, quindi il crash non e' mai avvenuto: la libreria e' completata qui
 * perche' la lacuna resti chiusa se e quando lo diventeranno.
 */
const libraryIcon = (
  category: IconProps['category'],
  name: string,
  accessibilityLabel: string,
  extra?: Partial<IconProps>
) =>
  React.memo((props: CommonIconProps) => (
    <Icon
      category={category}
      name={name}
      theme="default"
      colorKey="secondary"
      accessibilityLabel={accessibilityLabel}
      {...extra}
      {...props}
    />
  ));

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

  Tournament: React.memo((props: CommonIconProps) => (
    <Icon
      category="navigation"
      name="tournaments"
      theme="default"
      colorKey="primary"
      accessibilityLabel="Tournament"
      {...props}
    />
  )),

  // Issue #49 — voci gia' referenziate dai componenti ma mai definite.
  Alert: libraryIcon('action', 'alert', 'Alert'),
  Assignment: libraryIcon('action', 'assignment', 'Assignment'),
  ChevronRight: libraryIcon('action', 'chevron-right', 'Next'),
  Contact: libraryIcon('action', 'contact', 'Contact'),
  Fast: libraryIcon('action', 'fast', 'Fast'),
  History: libraryIcon('action', 'history', 'History'),
  LiveScore: libraryIcon('action', 'live-score', 'Live score'),
  Match: libraryIcon('action', 'match', 'Match'),
  Minus: libraryIcon('action', 'minus', 'Decrease', { isInteractive: true }),
  Phone: libraryIcon('action', 'phone', 'Phone'),
  Player: libraryIcon('action', 'player', 'Player'),
  Plus: libraryIcon('action', 'plus', 'Increase', { isInteractive: true }),
  Referee: libraryIcon('action', 'referee', 'Referee'),
  Results: libraryIcon('action', 'results', 'Results'),
  Serve: libraryIcon('action', 'serve', 'Serve'),
  Stats: libraryIcon('action', 'stats', 'Statistics'),
  Submit: libraryIcon('action', 'submit', 'Submit', { isInteractive: true }),
  Team: libraryIcon('action', 'team', 'Team'),
  Undo: libraryIcon('action', 'undo', 'Undo', { isInteractive: true }),
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

  // Issue #49 — voci gia' referenziate dai componenti ma mai definite.
  Emergency: libraryIcon('data', 'emergency', 'Emergency'),
  Health: libraryIcon('data', 'health', 'Health'),
  Info: libraryIcon('data', 'info', 'Information'),
  Location: libraryIcon('data', 'location', 'Location'),
  Organization: libraryIcon('data', 'organization', 'Organization'),
  Person: libraryIcon('data', 'person', 'Person'),
  Phone: libraryIcon('data', 'phone', 'Phone'),
  Time: libraryIcon('data', 'time', 'Time'),
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

  // Issue #49 — voci gia' referenziate dai componenti ma mai definite.
  Activity: libraryIcon('utility', 'activity', 'Activity'),
  Check: libraryIcon('utility', 'check', 'Confirmed'),
  ChevronDown: libraryIcon('utility', 'chevron-down', 'Expand'),
  Close: libraryIcon('utility', 'close', 'Close', { isInteractive: true }),
  Refresh: libraryIcon('utility', 'refresh', 'Refresh', { isInteractive: true }),
  Security: libraryIcon('utility', 'security', 'Security'),
  Settings: libraryIcon('utility', 'settings', 'Settings', { isInteractive: true }),
  Warning: libraryIcon('utility', 'warning', 'Warning'),
  Weather: libraryIcon('utility', 'weather', 'Weather'),
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