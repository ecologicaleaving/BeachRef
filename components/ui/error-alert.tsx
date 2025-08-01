/**
 * Reusable Error Alert Component
 * 
 * Provides consistent error messaging across the application with support
 * for different error types, severities, and action buttons.
 * 
 * Features:
 * - Multiple error types with appropriate styling
 * - Customizable action buttons
 * - Accessibility compliance with proper ARIA labels
 * - Responsive design with mobile-first approach
 */

import React from 'react'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { 
  AlertTriangle, 
  Info, 
  Wifi, 
  Shield, 
  Database, 
  Clock, 
  RefreshCw 
} from 'lucide-react'
import { EnhancedVISApiError } from '@/lib/vis-error-handler'

export type ErrorAlertType = 'info' | 'warning' | 'error' | 'network' | 'authentication' | 'data' | 'timeout'

export interface ErrorAlertAction {
  label: string
  onClick: () => void
  variant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link'
  icon?: React.ReactNode
  disabled?: boolean
}

export interface ErrorAlertProps {
  type?: ErrorAlertType
  title?: string
  message: string
  error?: EnhancedVISApiError | Error
  actions?: ErrorAlertAction[]
  dismissible?: boolean
  onDismiss?: () => void
  className?: string
  showErrorDetails?: boolean
}

export default function ErrorAlert({
  type = 'error',
  title,
  message,
  error,
  actions = [],
  dismissible = false,
  onDismiss,
  className = '',
  showErrorDetails = false
}: ErrorAlertProps) {
  // Determine alert type based on error if available
  const enhancedError = error && 'category' in error ? error as EnhancedVISApiError : null
  const alertType = enhancedError?.category?.type || type

  // Get appropriate icon and variant
  const getAlertConfig = () => {
    switch (alertType) {
      case 'info':
        return {
          variant: 'default' as const,
          icon: <Info className="h-4 w-4" />,
          title: title || 'Information'
        }
      case 'network':
        return {
          variant: 'destructive' as const,
          icon: <Wifi className="h-4 w-4" />,
          title: title || 'Connection Issue'
        }
      case 'authentication':
        return {
          variant: 'default' as const,
          icon: <Shield className="h-4 w-4" />,
          title: title || 'Authentication Required'
        }
      case 'data':
        return {
          variant: 'destructive' as const,
          icon: <Database className="h-4 w-4" />,
          title: title || 'Data Error'
        }
      case 'timeout':
        return {
          variant: 'destructive' as const,
          icon: <Clock className="h-4 w-4" />,
          title: title || 'Request Timeout'
        }
      case 'warning':
        return {
          variant: 'destructive' as const,
          icon: <AlertTriangle className="h-4 w-4" />,
          title: title || 'Warning'
        }
      default:
        return {
          variant: 'destructive' as const,
          icon: <AlertTriangle className="h-4 w-4" />,
          title: title || 'Error'
        }
    }
  }

  const alertConfig = getAlertConfig()

  return (
    <Alert variant={alertConfig.variant} className={className}>
      {alertConfig.icon}
      <AlertTitle className="flex items-center justify-between">
        {alertConfig.title}
        {dismissible && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onDismiss}
            className="h-auto p-1 hover:bg-transparent"
            aria-label="Dismiss alert"
          >
            ✕
          </Button>
        )}
      </AlertTitle>
      <AlertDescription className="space-y-3">
        <p>{message}</p>
        
        {/* Enhanced error details for development */}
        {showErrorDetails && enhancedError && process.env.NODE_ENV === 'development' && (
          <details className="text-xs bg-muted p-2 rounded">
            <summary className="font-medium cursor-pointer">Technical Details</summary>
            <div className="mt-2 space-y-1 font-mono">
              <div><strong>Type:</strong> {enhancedError.category?.type}</div>
              <div><strong>Endpoint:</strong> {enhancedError.category?.endpoint}</div>
              <div><strong>Status Code:</strong> {enhancedError.statusCode}</div>
              <div><strong>Severity:</strong> {enhancedError.category?.severity}</div>
              <div><strong>Recoverable:</strong> {enhancedError.category?.recoverable ? 'Yes' : 'No'}</div>
              {enhancedError.context?.timestamp && (
                <div><strong>Timestamp:</strong> {enhancedError.context.timestamp}</div>
              )}
            </div>
          </details>
        )}

        {/* Action buttons */}
        {actions.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-3">
            {actions.map((action, index) => (
              <Button
                key={index}
                variant={action.variant || 'outline'}
                size="sm"
                onClick={action.onClick}
                disabled={action.disabled}
                className="min-h-[36px]"
              >
                {action.icon}
                {action.label}
              </Button>
            ))}
          </div>
        )}
      </AlertDescription>
    </Alert>
  )
}

/**
 * Predefined error alert configurations for common scenarios
 */
export const ErrorAlertPresets = {
  networkError: (onRetry?: () => void): ErrorAlertProps => ({
    type: 'network',
    message: 'Unable to connect to the server. Please check your internet connection.',
    actions: onRetry ? [{
      label: 'Retry',
      onClick: onRetry,
      icon: <RefreshCw className="mr-2 h-4 w-4" />
    }] : []
  }),

  authenticationRequired: (): ErrorAlertProps => ({
    type: 'authentication',
    message: 'Enhanced tournament details require authentication. Basic information is available below.',
    dismissible: true
  }),

  dataUnavailable: (onRetry?: () => void): ErrorAlertProps => ({
    type: 'data',
    message: 'Tournament data is currently unavailable. Please try again later.',
    actions: onRetry ? [{
      label: 'Try Again',
      onClick: onRetry,
      icon: <RefreshCw className="mr-2 h-4 w-4" />
    }] : []
  }),

  requestTimeout: (onRetry?: () => void): ErrorAlertProps => ({
    type: 'timeout',
    message: 'The request is taking longer than expected. Please try again.',
    actions: onRetry ? [{
      label: 'Retry',
      onClick: onRetry,
      icon: <RefreshCw className="mr-2 h-4 w-4" />
    }] : []
  }),

  partialDataAvailable: (): ErrorAlertProps => ({
    type: 'info',
    title: 'Limited Data Available',
    message: 'Some tournament details are unavailable, but basic information is shown below.',
    dismissible: true
  })
}