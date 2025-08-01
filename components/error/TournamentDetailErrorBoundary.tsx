'use client'

/**
 * Tournament Detail Error Boundary Component
 * 
 * Provides comprehensive error boundary functionality specifically for tournament
 * detail pages. Handles VIS API errors gracefully, provides retry mechanisms,
 * and maintains navigation context during error states.
 * 
 * Features:
 * - Graceful error recovery with retry functionality
 * - User-friendly error messages based on error type
 * - Navigation preservation during error states
 * - Production error reporting and logging
 * - Accessibility-compliant error states
 */

import React, { Component, ErrorInfo, ReactNode } from 'react'
import { EnhancedVISApiError } from '@/lib/vis-error-handler'
import { logUserExperienceError } from '@/lib/production-logger'
import TournamentErrorFallback from './TournamentErrorFallback'

interface Props {
  children: ReactNode
  tournamentCode?: string
  fallbackComponent?: React.ComponentType<ErrorFallbackProps>
}

interface State {
  hasError: boolean
  error: Error | null
  errorInfo: ErrorInfo | null
  retryCount: number
  isRetrying: boolean
}

export interface ErrorFallbackProps {
  error: Error | null
  errorInfo?: ErrorInfo | null
  onRetry: () => void
  retryCount: number
  isRetrying: boolean
  tournamentCode?: string
}

export default class TournamentDetailErrorBoundary extends Component<Props, State> {
  private retryTimeoutId: NodeJS.Timeout | null = null

  constructor(props: Props) {
    super(props)
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      retryCount: 0,
      isRetrying: false
    }
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    // Update state so the next render will show the fallback UI
    return {
      hasError: true,
      error,
      isRetrying: false
    }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Log error for production monitoring
    console.error('[Tournament Error Boundary] Caught error:', {
      error: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack,
      tournamentCode: this.props.tournamentCode,
      timestamp: new Date().toISOString()
    })

    // Enhanced error logging for VIS API errors
    if (this.isVISApiError(error)) {
      const enhancedError = error as EnhancedVISApiError
      console.error('[Tournament Error Boundary] VIS API Error Details:', {
        errorType: enhancedError.category?.type,
        endpoint: enhancedError.category?.endpoint,
        statusCode: enhancedError.statusCode,
        recoverable: enhancedError.category?.recoverable,
        severity: enhancedError.category?.severity
      })
    }

    // Log user experience error for monitoring
    logUserExperienceError(
      'page_crash',
      this.props.tournamentCode,
      {
        userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : undefined,
        pathname: typeof window !== 'undefined' ? window.location.pathname : undefined
      }
    )

    this.setState({
      error,
      errorInfo,
      hasError: true
    })
  }

  handleRetry = () => {
    if (this.state.retryCount >= 3) {
      console.warn('[Tournament Error Boundary] Maximum retries reached')
      return
    }

    this.setState(prevState => ({
      isRetrying: true,
      retryCount: prevState.retryCount + 1
    }))

    // Clear any existing retry timeout
    if (this.retryTimeoutId) {
      clearTimeout(this.retryTimeoutId)
    }

    // Retry after a short delay
    this.retryTimeoutId = setTimeout(() => {
      console.log(`[Tournament Error Boundary] Retry #${this.state.retryCount + 1} for tournament ${this.props.tournamentCode}`)
      
      this.setState({
        hasError: false,
        error: null,
        errorInfo: null,
        isRetrying: false
      })
    }, 1000)
  }

  componentWillUnmount() {
    if (this.retryTimeoutId) {
      clearTimeout(this.retryTimeoutId)
    }
  }

  private isVISApiError(error: Error): boolean {
    return error.name === 'VISApiError' || 'category' in error
  }

  private getErrorSeverity(error: Error): 'low' | 'medium' | 'high' | 'critical' {
    if (this.isVISApiError(error)) {
      const enhancedError = error as EnhancedVISApiError
      return enhancedError.category?.severity || 'medium'
    }
    return 'high'
  }

  private isRecoverableError(error: Error): boolean {
    if (this.isVISApiError(error)) {
      const enhancedError = error as EnhancedVISApiError
      return enhancedError.category?.recoverable || false
    }
    // Non-VIS API errors are generally not recoverable in this context
    return false
  }

  render() {
    if (this.state.hasError) {
      const FallbackComponent = this.props.fallbackComponent || TournamentErrorFallback
      
      return (
        <FallbackComponent
          error={this.state.error}
          errorInfo={this.state.errorInfo}
          onRetry={this.handleRetry}
          retryCount={this.state.retryCount}
          isRetrying={this.state.isRetrying}
          tournamentCode={this.props.tournamentCode}
        />
      )
    }

    return this.props.children
  }
}

/**
 * Hook version of the error boundary for functional components
 * Note: This is a placeholder - React doesn't support error boundaries as hooks yet
 * This is here for future compatibility when React adds this feature
 */
export function useTournamentErrorBoundary() {
  return {
    // Future implementation when React supports error boundary hooks
    captureError: (error: Error) => {
      console.error('[Tournament Error Hook] Error captured:', error)
    }
  }
}