'use client'

/**
 * Tab Error Boundary Component
 * 
 * Provides isolated error handling for individual tabs.
 * Prevents errors in one tab from affecting other tabs.
 * 
 * Features:
 * - Isolated error boundaries for each tab
 * - Graceful error fallback UI
 * - Error logging and monitoring
 * - Recovery mechanisms (try again functionality)
 * - Production error tracking
 */

import { Component, ErrorInfo, ReactNode } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { AlertTriangle, RefreshCw } from 'lucide-react'

interface TabErrorBoundaryProps {
  children: ReactNode
  tabName: string
  fallback?: ReactNode
}

interface TabErrorBoundaryState {
  hasError: boolean
  error?: Error
  errorInfo?: ErrorInfo
}

export class TabErrorBoundary extends Component<TabErrorBoundaryProps, TabErrorBoundaryState> {
  constructor(props: TabErrorBoundaryProps) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(error: Error): TabErrorBoundaryState {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error(`Error in ${this.props.tabName} tab:`, error, errorInfo)
    
    this.setState({
      hasError: true,
      error,
      errorInfo
    })
    
    // Log error to production logging if available
    if (typeof window !== 'undefined') {
      // Production error tracking
      if (window.gtag) {
        window.gtag('event', 'exception', {
          description: `Tab Error: ${this.props.tabName} - ${error.message}`,
          fatal: false
        })
      }
      
      // Console error for development
      console.group(`🚨 Tab Error Boundary: ${this.props.tabName}`)
      console.error('Error:', error)
      console.error('Error Info:', errorInfo)
      console.error('Component Stack:', errorInfo.componentStack)
      console.groupEnd()
    }
  }

  handleRetry = () => {
    this.setState({ 
      hasError: false, 
      error: undefined, 
      errorInfo: undefined 
    })
  }

  render() {
    if (this.state.hasError) {
      // Use custom fallback if provided
      if (this.props.fallback) {
        return this.props.fallback
      }

      // Default error UI
      return (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5" />
              Error Loading {this.props.tabName}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col items-center justify-center py-8 text-center space-y-4">
              <AlertTriangle className="h-12 w-12 text-yellow-500" />
              
              <div className="space-y-2">
                <h3 className="text-lg font-semibold">
                  Something went wrong in the {this.props.tabName} tab
                </h3>
                <p className="text-gray-600 max-w-md">
                  There was a problem loading the {this.props.tabName.toLowerCase()} content. 
                  Other tabs should still work normally.
                </p>
              </div>

              {/* Error details for development */}
              {process.env.NODE_ENV === 'development' && this.state.error && (
                <details className="text-left max-w-md">
                  <summary className="cursor-pointer text-sm text-gray-500 hover:text-gray-700">
                    Error Details (Development)
                  </summary>
                  <div className="mt-2 p-3 bg-gray-50 rounded text-xs font-mono text-gray-700 overflow-auto max-h-32">
                    <div className="font-bold">Error:</div>
                    <div className="mb-2">{this.state.error.message}</div>
                    <div className="font-bold">Stack:</div>
                    <div>{this.state.error.stack}</div>
                  </div>
                </details>
              )}
              
              <div className="flex gap-2">
                <Button 
                  onClick={this.handleRetry}
                  variant="outline"
                  className="min-h-[48px] flex items-center gap-2"
                >
                  <RefreshCw className="h-4 w-4" />
                  Try Again
                </Button>
                
                <Button 
                  onClick={() => window.location.reload()}
                  variant="ghost"
                  className="min-h-[48px]"
                >
                  Refresh Page
                </Button>
              </div>
              
              <p className="text-xs text-gray-500 mt-4">
                If this problem persists, try refreshing the page or contact support.
              </p>
            </div>
          </CardContent>
        </Card>
      )
    }

    return this.props.children
  }
}