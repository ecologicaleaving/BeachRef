/**
 * Context-Sensitive Display Component
 * Dynamic information display based on referee's current assignment status
 */

import React from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import { designTokens } from '../../theme/tokens';
import { Assignment} from '../../types/assignments';
import { InformationPriority } from './InformationArchitecture';

// Context-sensitive display logic based on assignment status
export type RefereeContext = 
  | 'no-assignment'      // No current assignment
  | 'upcoming'           // Assignment upcoming (>30 mins)
  | 'preparing'          // Assignment soon (5-30 mins)
  | 'active'             // Currently refereeing
  | 'break'              // Between assignments
  | 'completed'          // Assignment completed
  | 'emergency';         // Emergency situation

interface ContextSensitiveDisplayProps {
  context: RefereeContext;
  assignment?: Assignment;
  children: React.ReactNode;
  priority?: InformationPriority;
  adaptiveLayout?: boolean;
  style?: ViewStyle;
}

export const ContextSensitiveDisplay: React.FC<ContextSensitiveDisplayProps> = ({
  context,
  _assignment,
  children,
  priority = 'secondary',
  adaptiveLayout = true,
  style,
}) => {
  const contextStyles = [
    styles.baseDisplay,
    styles[context],
    styles[`${priority}Context`],
    adaptiveLayout && styles.adaptive,
    style,
  ];

  return (
    <View style={contextStyles}>
      {children}
    </View>
  );
};

// Context Detector Hook
export const useRefereeContext = (
  currentAssignment?: Assignment,
  upcomingAssignments: Assignment[] = []
): RefereeContext => {
  return React.useMemo(() => {
    // Emergency context (highest priority)
    if (currentAssignment?.status === 'emergency' || 
        upcomingAssignments.some(a => a.status === 'emergency')) {
      return 'emergency';
    }

    // Active assignment context
    if (currentAssignment?.status === 'active' || 
        currentAssignment?.status === 'in-progress') {
      return 'active';
    }

    // Preparing context (assignment soon)
    if (currentAssignment) {
      const now = new Date();
      const assignmentTime = new Date(currentAssignment.matchTime);
      const minutesUntil = (assignmentTime.getTime() - now.getTime()) / (1000 * 60);
      
      if (minutesUntil <= 30 && minutesUntil > 0) {
        return 'preparing';
      }
    }

    // Upcoming context
    if (currentAssignment?.status === 'confirmed' || 
        currentAssignment?.status === 'assigned') {
      return 'upcoming';
    }

    // Completed context
    if (currentAssignment?.status === 'completed') {
      return 'completed';
    }

    // Break context (recently completed, next assignment exists)
    if (!currentAssignment && upcomingAssignments.length > 0) {
      return 'break';
    }

    // Default: no assignment
    return 'no-assignment';
  }, [currentAssignment, upcomingAssignments]);
};

// Context-Aware Information Priority
interface ContextAwareInfoProps {
  context: RefereeContext;
  primaryInfo?: React.ReactNode;
  secondaryInfo?: React.ReactNode;
  tertiaryInfo?: React.ReactNode;
  emergencyInfo?: React.ReactNode;
}

export const ContextAwareInfo: React.FC<ContextAwareInfoProps> = ({
  context,
  primaryInfo,
  secondaryInfo,
  tertiaryInfo,
  emergencyInfo,
}) => {
  // Determine information priority based on context
  const getDisplayInfo = () => {
    switch (context) {
      case 'emergency':
        return emergencyInfo || primaryInfo;
      
      case 'active':
      case 'preparing':
        return primaryInfo;
      
      case 'upcoming':
      case 'break':
        return secondaryInfo || primaryInfo;
      
      case 'completed':
      case 'no-assignment':
      default:
        return tertiaryInfo || secondaryInfo || primaryInfo;
    }
  };

  const displayInfo = getDisplayInfo();

  return (
    <ContextSensitiveDisplay context={context}>
      {displayInfo}
    </ContextSensitiveDisplay>
  );
};

// Time-Sensitive Content Display
interface TimeSensitiveContentProps {
  assignment?: Assignment;
  children: React.ReactNode;
  urgencyThreshold?: number; // minutes
  style?: ViewStyle;
}

export const TimeSensitiveContent: React.FC<TimeSensitiveContentProps> = ({
  assignment,
  children,
  urgencyThreshold = 15,
  style,
}) => {
  const [isUrgent, setIsUrgent] = React.useState(false);

  React.useEffect(() => {
    if (!assignment) {
      setIsUrgent(false);
      return;
    }

    const checkUrgency = () => {
      const now = new Date();
      const assignmentTime = new Date(assignment.matchTime);
      const minutesUntil = (assignmentTime.getTime() - now.getTime()) / (1000 * 60);
      
      setIsUrgent(minutesUntil <= urgencyThreshold && minutesUntil > 0);
    };

    checkUrgency();
    const interval = setInterval(checkUrgency, 60000); // Check every minute

    return () => clearInterval(interval);
  }, [assignment, urgencyThreshold]);

  return (
    <View style={[
      styles.timeSensitive,
      isUrgent && styles.urgent,
      style,
    ]}>
      {children}
    </View>
  );
};

const styles = StyleSheet.create({
  // Base Display
  baseDisplay: {
    borderRadius: 8,
    padding: designTokens.spacing.md,
    marginVertical: designTokens.spacing.xs,
  },

  // Context-Based Styling
  'no-assignment': {
    backgroundColor: designTokens.brandColors.primaryLight,
    borderWidth: 2,
    borderColor: designTokens.colors.textSecondary,
    borderStyle: 'dashed',
    opacity: 0.8,
  },

  upcoming: {
    backgroundColor: designTokens.colors.background,
    borderWidth: 1,
    borderColor: designTokens.statusColors.upcoming,
    shadowColor: designTokens.statusColors.upcoming,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },

  preparing: {
    backgroundColor: designTokens.brandColors.accentLight,
    borderWidth: 2,
    borderColor: designTokens.colors.warning,
    shadowColor: designTokens.colors.warning,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 6,
  },

  active: {
    backgroundColor: designTokens.colors.background,
    borderWidth: 3,
    borderColor: designTokens.statusColors.current,
    shadowColor: designTokens.statusColors.current,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 8,
  },

  break: {
    backgroundColor: designTokens.brandColors.secondaryLight,
    borderWidth: 1,
    borderColor: designTokens.colors.secondary,
    opacity: 0.9,
  },

  completed: {
    backgroundColor: designTokens.brandColors.primaryLight,
    borderWidth: 1,
    borderColor: designTokens.statusColors.completed,
    opacity: 0.7,
  },

  emergency: {
    backgroundColor: designTokens.colors.background,
    borderWidth: 3,
    borderColor: designTokens.colors.error,
    shadowColor: designTokens.colors.error,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 12,
  },

  // Priority Context Adjustments
  primaryContext: {
    padding: designTokens.spacing.lg,
    marginVertical: designTokens.spacing.md,
  },

  secondaryContext: {
    padding: designTokens.spacing.md,
    marginVertical: designTokens.spacing.sm,
  },

  tertiaryContext: {
    padding: designTokens.spacing.sm,
    marginVertical: designTokens.spacing.xs,
  },

  // Adaptive Layout
  adaptive: {
    minHeight: designTokens.iconTokens.accessibility.minimumTouchTarget,
    justifyContent: 'center',
  },

  // Time-Sensitive Content
  timeSensitive: {
    borderRadius: 8,
    overflow: 'hidden',
  },

  urgent: {
    backgroundColor: designTokens.colors.background,
    borderWidth: 2,
    borderColor: designTokens.colors.error,
    shadowColor: designTokens.colors.error,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 6,
  },
});