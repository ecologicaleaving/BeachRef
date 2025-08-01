'use client'

/**
 * Tournament Error Fallback Component
 * 
 * Provides user-friendly error fallback UI for tournament detail pages.
 * Handles different error scenarios with appropriate messaging and actions.
 * 
 * Features:
 * - Context-aware error messages based on error type
 * - Retry functionality with loading states
 * - Graceful degradation messaging
 * - Accessible error states with proper ARIA labels
 * - Navigation preservation during errors
 */

import React from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Breadcrumb, BreadcrumbList, BreadcrumbItem, BreadcrumbLink, BreadcrumbSeparator, BreadcrumbPage } from '@/components/ui/breadcrumb'
import { Skeleton } from '@/components/ui/skeleton'
import { 
  AlertTriangle, 
  RefreshCw, 
  Wifi, 
  Shield, 
  Database, 
  Clock,
  ArrowLeft,
  Info
} from 'lucide-react'
import { ErrorFallbackProps } from './TournamentDetailErrorBoundary'
import { EnhancedVISApiError } from '@/lib/vis-error-handler'

export default function TournamentErrorFallback({
  error,
  errorInfo,
  onRetry,
  retryCount,
  isRetrying,
  tournamentCode
}: ErrorFallbackProps) {
  const enhancedError = error && 'category' in error ? error as EnhancedVISApiError : null
  const errorType = enhancedError?.category?.type || 'unknown'
  const severity = enhancedError?.category?.severity || 'medium'
  const isAuthentication = errorType === 'authentication' && enhancedError?.statusCode === 401

  // Get appropriate icon based on error type
  const getErrorIcon = () => {
    switch (errorType) {
      case 'network':
        return <Wifi className="h-12 w-12 text-orange-500" />
      case 'authentication':
      case 'authorization':
        return <Shield className="h-12 w-12 text-blue-500" />
      case 'data':
        return <Database className="h-12 w-12 text-yellow-500" />
      case 'timeout':
        return <Clock className="h-12 w-12 text-orange-500" />
      default:
        return <AlertTriangle className="h-12 w-12 text-red-500" />
    }
  }

  // Get user-friendly error message
  const getErrorMessage = () => {
    if (isAuthentication) {
      return {
        title: "Limited Data Available",
        description: "Some enhanced tournament details require authentication. Basic tournament information is shown below.",
        type: "info" as const
      }
    }

    switch (errorType) {
      case 'network':
        return {
          title: "Connection Issue",
          description: "We're having trouble connecting to the tournament data service. Please check your internet connection and try again.",
          type: "warning" as const
        }
      case 'timeout':
        return {
          title: "Request Timeout",
          description: "The tournament data is taking longer than usual to load. This might be due to high server load.",
          type: "warning" as const
        }
      case 'data':
        return {
          title: "Tournament Not Found",
          description: enhancedError?.statusCode === 404 
            ? "The requested tournament could not be found. It may have been removed or the code may be incorrect."
            : "There was an issue retrieving the tournament data.",
          type: "error" as const
        }
      case 'authorization':
        return {
          title: "Access Restricted",
          description: "You don't have permission to access this tournament's detailed information.",
          type: "warning" as const
        }
      default:
        return {
          title: "Something Went Wrong",
          description: "We encountered an unexpected error while loading the tournament details. Our team has been notified.",
          type: "error" as const
        }
    }
  }

  const errorMessage = getErrorMessage()
  const canRetry = enhancedError?.category?.recoverable !== false && retryCount < 3 && !isAuthentication
  const showPartialData = isAuthentication

  if (isRetrying) {
    return (
      <div className="container mx-auto px-4 py-6 space-y-6">
        {/* Breadcrumb */}
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink href="/">Tournaments</BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage>Loading...</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>

        {/* Loading state */}
        <div className="space-y-4">
          <Skeleton className="h-32 w-full" />
          <div className="text-center">
            <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4 text-primary" />
            <p className="text-muted-foreground">Retrying... (Attempt {retryCount + 1})</p>
          </div>
          <Skeleton className="h-64 w-full" />
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-6 space-y-6">
      {/* Breadcrumb */}
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink href="/">Tournaments</BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>
              {isAuthentication ? 'Limited Data' : 'Error'}
            </BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      {/* Error display */}
      <Card>
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            {getErrorIcon()}
          </div>
          <CardTitle className="text-2xl">{errorMessage.title}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <Alert variant={errorMessage.type === 'info' ? 'default' : 'destructive'}>
            {errorMessage.type === 'info' && <Info className="h-4 w-4" />}
            {errorMessage.type !== 'info' && <AlertTriangle className="h-4 w-4" />}
            <AlertTitle>
              {errorMessage.type === 'info' ? 'Information' : 'Error Details'}
            </AlertTitle>
            <AlertDescription>{errorMessage.description}</AlertDescription>
          </Alert>

          {/* Authentication error - show partial data option */}
          {showPartialData && (
            <Alert>
              <Info className="h-4 w-4" />
              <AlertTitle>Partial Data Available</AlertTitle>
              <AlertDescription>
                Basic tournament information is available using public data sources. 
                Enhanced details like venue information and competition structure require authentication.
              </AlertDescription>
            </Alert>
          )}

          {/* Development error details */}
          {process.env.NODE_ENV === 'development' && error && (
            <Alert variant="outline">
              <AlertTitle>Developer Information</AlertTitle>
              <AlertDescription className="mt-2 space-y-2">
                <details className="text-sm">
                  <summary className="font-medium cursor-pointer">Error Details</summary>
                  <div className="mt-2 space-y-1 text-xs font-mono bg-muted p-2 rounded">
                    <div><strong>Message:</strong> {error.message}</div>
                    {enhancedError && (
                      <>
                        <div><strong>Type:</strong> {enhancedError.category?.type}</div>
                        <div><strong>Endpoint:</strong> {enhancedError.category?.endpoint}</div>
                        <div><strong>Status:</strong> {enhancedError.statusCode}</div>
                        <div><strong>Severity:</strong> {enhancedError.category?.severity}</div>
                        <div><strong>Recoverable:</strong> {enhancedError.category?.recoverable ? 'Yes' : 'No'}</div>
                      </>
                    )}
                  </div>
                </details>
              </AlertDescription>
            </Alert>
          )}

          {/* Action buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            {canRetry && (
              <Button 
                onClick={onRetry}
                variant="default"
                className="min-h-[48px] px-6"
                disabled={retryCount >= 3}
              >
                <RefreshCw className="mr-2 h-4 w-4" />
                {retryCount > 0 ? `Try Again (${3 - retryCount} left)` : 'Try Again'}
              </Button>
            )}
            
            <Button 
              variant="outline" 
              asChild
              className="min-h-[48px] px-6"
            >
              <a href="/">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Tournaments
              </a>
            </Button>

            {/* Show partial data button for authentication errors */}
            {showPartialData && tournamentCode && (
              <Button 
                variant="secondary"
                asChild
                className="min-h-[48px] px-6"
              >
                <a href={`/tournament/${tournamentCode}?fallback=true`}>
                  <Database className="mr-2 h-4 w-4" />
                  Show Basic Data
                </a>
              </Button>
            )}
          </div>

          {/* Error tracking information */}
          {enhancedError?.context?.timestamp && (
            <div className="text-center">
              <p className="text-xs text-muted-foreground">
                Error occurred at: {new Date(enhancedError.context.timestamp).toLocaleString()}
              </p>
              {tournamentCode && (
                <p className="text-xs text-muted-foreground mt-1">
                  Tournament: {tournamentCode} | Attempts: {retryCount + 1}
                </p>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}