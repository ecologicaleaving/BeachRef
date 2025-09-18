/**
 * Assignment Navigation Utilities
 * Handles navigation between assignment screens and result entry
 */

import { Router } from 'expo-router';
import { Assignment } from '../types/assignments';

export interface NavigationContext {
  sourceScreen: string;
  returnPath?: string;
  metadata?: Record<string, any>;
}

export class AssignmentNavigationHelper {
  private static instance: AssignmentNavigationHelper;
  private router?: Router;
  private navigationStack: NavigationContext[] = [];

  private constructor() {}

  static getInstance(): AssignmentNavigationHelper {
    if (!AssignmentNavigationHelper.instance) {
      AssignmentNavigationHelper.instance = new AssignmentNavigationHelper();
    }
    return AssignmentNavigationHelper.instance;
  }

  setRouter(router: Router) {
    this.router = router;
  }

  // Navigate to assignment details with context
  navigateToAssignmentDetails(assignment: Assignment, context?: NavigationContext) {
    if (!this.router) {
      // console.warn('AssignmentNavigationHelper: Router not initialized');
      return;
    }

    this.pushContext(context || { sourceScreen: 'my-assignments' });

    this.router.push({
      pathname: '/assignment-detail',
      params: {
        assignmentData: JSON.stringify(assignment),
        sourceScreen: context?.sourceScreen || 'my-assignments',
        returnPath: context?.returnPath,
        metadata: context?.metadata ? JSON.stringify(context.metadata) : undefined,
      },
    });
  }

  // Navigate to result entry for completed assignments
  navigateToResultEntry(assignment: Assignment, context?: NavigationContext) {
    if (!this.router) {
      // console.warn('AssignmentNavigationHelper: Router not initialized');
      return;
    }

    if (assignment.status !== 'completed' && assignment.status !== 'current') {
      // console.warn('AssignmentNavigationHelper: Cannot enter results for non-completed assignments');
      return;
    }

    this.pushContext(context || { sourceScreen: 'my-assignments' });

    this.router.push({
      pathname: '/match-results',
      params: {
        assignmentData: JSON.stringify(assignment),
        mode: 'entry',
        sourceScreen: context?.sourceScreen || 'my-assignments',
        returnPath: context?.returnPath,
        metadata: context?.metadata ? JSON.stringify(context.metadata) : undefined,
      },
    });
  }

  // Navigate to assignment preparation/management
  navigateToAssignmentManagement(assignment: Assignment, context?: NavigationContext) {
    if (!this.router) {
      // console.warn('AssignmentNavigationHelper: Router not initialized');
      return;
    }

    this.pushContext(context || { sourceScreen: 'my-assignments' });

    // For now, we'll use a modal approach rather than navigation
    // This would typically open the AssignmentStatusManager modal
  }

  // Navigate to My Assignments with specific filters
  navigateToMyAssignments(filters?: {
    status?: string;
    date?: string;
    court?: number;
    highlightAssignment?: string;
  }) {
    if (!this.router) {
      // console.warn('AssignmentNavigationHelper: Router not initialized');
      return;
    }

    const params: Record<string, string> = {};
    if (filters?.status) params.status = filters.status;
    if (filters?.date) params.date = filters.date;
    if (filters?.court) params.court = filters.court.toString();
    if (filters?.highlightAssignment) params.highlight = filters.highlightAssignment;

    this.router.push({
      pathname: '/my-assignments',
      params,
    });
  }

  // Navigate back to previous screen in context
  navigateBack() {
    if (!this.router) {
      // console.warn('AssignmentNavigationHelper: Router not initialized');
      return;
    }

    const context = this.popContext();
    
    if (context?.returnPath) {
      this.router.push(context.returnPath);
    } else {
      this.router.back();
    }
  }

  // Get current navigation context
  getCurrentContext(): NavigationContext | null {
    return this.navigationStack.length > 0 
      ? this.navigationStack[this.navigationStack.length - 1] 
      : null;
  }

  // Handle assignment action based on status and context
  handleAssignmentAction(
    assignment: Assignment, 
    action: 'details' | 'results' | 'manage' | 'prepare',
    context?: NavigationContext
  ) {
    switch (action) {
      case 'details':
        this.navigateToAssignmentDetails(assignment, context);
        break;
      
      case 'results':
        this.navigateToResultEntry(assignment, context);
        break;
      
      case 'manage':
      case 'prepare':
        this.navigateToAssignmentManagement(assignment, context);
        break;
      
      default:
        // console.warn('AssignmentNavigationHelper: Unknown action:', action);
    }
  }

  // Generate deep link for assignment sharing
  generateAssignmentDeepLink(assignment: Assignment): string {
    const baseUrl = 'vistest://assignment';
    const params = new URLSearchParams({
      id: assignment.id,
      court: assignment.courtNumber.toString(),
      time: assignment.matchTime.toISOString(),
    });
    
    return `${baseUrl}?${params.toString()}`;
  }

  // Parse assignment from navigation parameters
  static parseAssignmentFromParams(params: Record<string, string>): Assignment | null {
    try {
      if (params.assignmentData) {
        return JSON.parse(params.assignmentData) as Assignment;
      }
    } catch (error) {
      // console.error('AssignmentNavigationHelper: Failed to parse assignment data:', error);
    }
    return null;
  }

  // Parse context from navigation parameters
  static parseContextFromParams(params: Record<string, string>): NavigationContext | null {
    try {
      const context: NavigationContext = {
        sourceScreen: params.sourceScreen || 'unknown',
      };
      
      if (params.returnPath) {
        context.returnPath = params.returnPath;
      }
      
      if (params.metadata) {
        context.metadata = JSON.parse(params.metadata);
      }
      
      return context;
    } catch (error) {
      // console.error('AssignmentNavigationHelper: Failed to parse context:', error);
      return { sourceScreen: 'unknown' };
    }
  }

  // Private methods for context management
  private pushContext(context: NavigationContext) {
    this.navigationStack.push(context);
    
    // Keep stack size manageable
    if (this.navigationStack.length > 10) {
      this.navigationStack = this.navigationStack.slice(-10);
    }
  }

  private popContext(): NavigationContext | null {
    return this.navigationStack.pop() || null;
  }

  // Clear navigation history (useful for deep resets)
  clearNavigationHistory() {
    this.navigationStack = [];
  }
}

// Convenience functions for common operations
export const assignmentNavigation = AssignmentNavigationHelper.getInstance();

export const navigateToAssignmentDetails = (assignment: Assignment, context?: NavigationContext) => {
  assignmentNavigation.navigateToAssignmentDetails(assignment, context);
};

export const navigateToResultEntry = (assignment: Assignment, context?: NavigationContext) => {
  assignmentNavigation.navigateToResultEntry(assignment, context);
};

export const navigateToAssignmentManagement = (assignment: Assignment, context?: NavigationContext) => {
  assignmentNavigation.navigateToAssignmentManagement(assignment, context);
};

export const handleAssignmentAction = (
  assignment: Assignment,
  action: 'details' | 'results' | 'manage' | 'prepare',
  context?: NavigationContext
) => {
  assignmentNavigation.handleAssignmentAction(assignment, action, context);
};