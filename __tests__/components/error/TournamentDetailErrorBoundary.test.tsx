/**
 * Tests for Tournament Detail Error Boundary Component
 * 
 * Comprehensive test suite covering error boundary functionality,
 * error recovery, retry mechanisms, and user experience.
 */

import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import '@testing-library/jest-dom'
import TournamentDetailErrorBoundary from '@/components/error/TournamentDetailErrorBoundary'
import { EnhancedVISApiError } from '@/lib/vis-error-handler'
import { VISApiError } from '@/lib/types'

// Mock the production logger
jest.mock('@/lib/production-logger', () => ({
  logUserExperienceError: jest.fn()
}))

// Mock console methods to avoid noise in tests
const mockConsoleError = jest.spyOn(console, 'error').mockImplementation(() => {})
const mockConsoleLog = jest.spyOn(console, 'log').mockImplementation(() => {})

// Test component that throws errors on demand
interface ThrowErrorProps {
  shouldThrow?: boolean
  errorToThrow?: Error
}

function ThrowError({ shouldThrow = false, errorToThrow }: ThrowErrorProps) {
  if (shouldThrow) {
    throw errorToThrow || new Error('Test error')
  }
  return <div data-testid="success-content">Content loaded successfully</div>
}

describe('TournamentDetailErrorBoundary', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  afterAll(() => {
    mockConsoleError.mockRestore()
    mockConsoleLog.mockRestore()
  })

  it('should render children when there are no errors', () => {
    render(
      <TournamentDetailErrorBoundary tournamentCode="TEST001">
        <ThrowError shouldThrow={false} />
      </TournamentDetailErrorBoundary>
    )

    expect(screen.getByTestId('success-content')).toBeInTheDocument()
  })

  it('should catch and handle basic errors', () => {
    const testError = new Error('Test error message')
    
    render(
      <TournamentDetailErrorBoundary tournamentCode="TEST001">
        <ThrowError shouldThrow={true} errorToThrow={testError} />
      </TournamentDetailErrorBoundary>
    )

    expect(screen.getByText('Something Went Wrong')).toBeInTheDocument()
    expect(screen.getByText(/We encountered an unexpected error/)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /try again/i })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /back to tournaments/i })).toBeInTheDocument()
  })

  it('should handle VIS API authentication errors specifically', () => {
    const authError = new VISApiError('Authentication required', 401) as EnhancedVISApiError
    authError.category = {
      type: 'authentication',
      endpoint: 'GetBeachTournament',
      recoverable: true,
      requiresFallback: true,
      severity: 'low'
    }
    authError.context = { timestamp: new Date().toISOString() }
    
    render(
      <TournamentDetailErrorBoundary tournamentCode="TEST001">
        <ThrowError shouldThrow={true} errorToThrow={authError} />
      </TournamentDetailErrorBoundary>
    )

    expect(screen.getByText('Limited Data Available')).toBeInTheDocument()
    expect(screen.getByText(/Some enhanced tournament details require authentication/)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /show basic data/i })).toBeInTheDocument()
  })

  it('should handle network errors with appropriate messaging', () => {
    const networkError = new TypeError('fetch failed') as EnhancedVISApiError
    networkError.category = {
      type: 'network',
      endpoint: 'GetBeachTournamentList',
      recoverable: true,
      requiresFallback: true,
      severity: 'high'
    }
    networkError.context = { timestamp: new Date().toISOString() }
    
    render(
      <TournamentDetailErrorBoundary tournamentCode="TEST001">
        <ThrowError shouldThrow={true} errorToThrow={networkError} />
      </TournamentDetailErrorBoundary>
    )

    expect(screen.getByText('Connection Issue')).toBeInTheDocument()
    expect(screen.getByText(/having trouble connecting to the tournament data service/)).toBeInTheDocument()
  })

  it('should handle timeout errors', () => {
    const timeoutError = new Error('Request timeout') as EnhancedVISApiError
    timeoutError.name = 'AbortError'
    timeoutError.category = {
      type: 'timeout',
      endpoint: 'GetBeachTournament',
      recoverable: true,
      requiresFallback: true,
      severity: 'medium'
    }
    timeoutError.context = { timestamp: new Date().toISOString() }
    
    render(
      <TournamentDetailErrorBoundary tournamentCode="TEST001">
        <ThrowError shouldThrow={true} errorToThrow={timeoutError} />
      </TournamentDetailErrorBoundary>
    )

    expect(screen.getByText('Request Timeout')).toBeInTheDocument()
    expect(screen.getByText(/taking longer than usual to load/)).toBeInTheDocument()
  })

  it('should handle data not found errors', () => {
    const notFoundError = new VISApiError('Tournament not found', 404) as EnhancedVISApiError
    notFoundError.category = {
      type: 'data',
      endpoint: 'GetBeachTournamentList',
      recoverable: false,
      requiresFallback: false,
      severity: 'medium'
    }
    notFoundError.context = { timestamp: new Date().toISOString() }
    
    render(
      <TournamentDetailErrorBoundary tournamentCode="TEST001">
        <ThrowError shouldThrow={true} errorToThrow={notFoundError} />
      </TournamentDetailErrorBoundary>
    )

    expect(screen.getByText('Tournament Not Found')).toBeInTheDocument()
    expect(screen.getByText(/could not be found/)).toBeInTheDocument()
  })

  it('should show retry functionality for recoverable errors', async () => {
    const recoverableError = new VISApiError('Server Error', 500) as EnhancedVISApiError
    recoverableError.category = {
      type: 'network',
      endpoint: 'GetBeachTournamentList',
      recoverable: true,
      requiresFallback: true,
      severity: 'high'
    }
    recoverableError.context = { timestamp: new Date().toISOString() }
    
    render(
      <TournamentDetailErrorBoundary tournamentCode="TEST001">
        <ThrowError shouldThrow={true} errorToThrow={recoverableError} />
      </TournamentDetailErrorBoundary>
    )

    // Should show retry button
    const retryButton = screen.getByRole('button', { name: /try again/i })
    expect(retryButton).toBeInTheDocument()

    // Click retry button
    fireEvent.click(retryButton)

    // Should show loading state
    await waitFor(() => {
      expect(screen.getByText(/retrying.../i)).toBeInTheDocument()
    })

    // The retry functionality sets a timeout, so we need to wait for it
    // and verify the retry state is properly managed
    expect(screen.getByText('Retrying... (Attempt 1)')).toBeInTheDocument()
  })

  it('should limit retry attempts to 3', () => {
    const retryableError = new VISApiError('Server Error', 500) as EnhancedVISApiError
    retryableError.category = {
      type: 'network',
      endpoint: 'GetBeachTournamentList',
      recoverable: true,
      requiresFallback: true,
      severity: 'high'
    }
    retryableError.context = { timestamp: new Date().toISOString() }
    
    render(
      <TournamentDetailErrorBoundary tournamentCode="TEST001">
        <ThrowError shouldThrow={true} errorToThrow={retryableError} />
      </TournamentDetailErrorBoundary>
    )

    const retryButton = screen.getByRole('button', { name: /try again/i })

    // First retry
    fireEvent.click(retryButton)
    expect(screen.getByText(/try again \(2 left\)/i)).toBeInTheDocument()

    // Second retry
    fireEvent.click(retryButton)
    expect(screen.getByText(/try again \(1 left\)/i)).toBeInTheDocument()

    // Third retry
    fireEvent.click(retryButton)
    expect(screen.getByText(/try again \(0 left\)/i)).toBeInTheDocument()

    // Button should be disabled after 3 retries
    expect(retryButton).toBeDisabled()
  })

  it('should not show retry button for non-recoverable errors', () => {
    const nonRecoverableError = new VISApiError('Bad Request', 400) as EnhancedVISApiError
    nonRecoverableError.category = {
      type: 'data',
      endpoint: 'GetBeachTournamentList',
      recoverable: false,
      requiresFallback: false,
      severity: 'medium'
    }
    nonRecoverableError.context = { timestamp: new Date().toISOString() }
    
    render(
      <TournamentDetailErrorBoundary tournamentCode="TEST001">
        <ThrowError shouldThrow={true} errorToThrow={nonRecoverableError} />
      </TournamentDetailErrorBoundary>
    )

    expect(screen.queryByRole('button', { name: /try again/i })).not.toBeInTheDocument()
    expect(screen.getByRole('link', { name: /back to tournaments/i })).toBeInTheDocument()
  })

  it('should show development error details in development mode', () => {
    const originalNodeEnv = process.env.NODE_ENV
    process.env.NODE_ENV = 'development'

    const testError = new VISApiError('Development error', 500) as EnhancedVISApiError
    testError.category = {
      type: 'network',
      endpoint: 'GetBeachTournamentList',
      recoverable: true,
      requiresFallback: true,
      severity: 'high'
    }
    testError.context = { timestamp: new Date().toISOString() }
    
    render(
      <TournamentDetailErrorBoundary tournamentCode="TEST001">
        <ThrowError shouldThrow={true} errorToThrow={testError} />
      </TournamentDetailErrorBoundary>
    )

    // Look for the development-specific content that should appear
    expect(screen.getByText('Developer Information')).toBeInTheDocument()

    process.env.NODE_ENV = originalNodeEnv
  })

  it('should maintain breadcrumb navigation during error states', () => {
    const testError = new Error('Test error')
    
    render(
      <TournamentDetailErrorBoundary tournamentCode="TEST001">
        <ThrowError shouldThrow={true} errorToThrow={testError} />
      </TournamentDetailErrorBoundary>
    )

    expect(screen.getByText('Tournaments')).toBeInTheDocument()
    expect(screen.getByText('Error')).toBeInTheDocument()
  })

  it('should log errors to production monitoring', () => {
    const { logUserExperienceError } = require('@/lib/production-logger')
    const testError = new Error('Test error')
    
    render(
      <TournamentDetailErrorBoundary tournamentCode="TEST001">
        <ThrowError shouldThrow={true} errorToThrow={testError} />
      </TournamentDetailErrorBoundary>
    )

    expect(logUserExperienceError).toHaveBeenCalledWith(
      'page_crash',
      'TEST001',
      expect.objectContaining({
        pathname: expect.any(String)
      })
    )
  })

  it('should show tournament code in error tracking information', () => {
    const testError = new VISApiError('Test error', 500) as EnhancedVISApiError
    testError.category = {
      type: 'network',
      endpoint: 'GetBeachTournamentList',
      recoverable: true,
      requiresFallback: true,
      severity: 'high'
    }
    testError.context = { timestamp: '2023-01-01T00:00:00Z' }
    
    render(
      <TournamentDetailErrorBoundary tournamentCode="TEST001">
        <ThrowError shouldThrow={true} errorToThrow={testError} />
      </TournamentDetailErrorBoundary>
    )

    expect(screen.getByText(/Tournament: TEST001/)).toBeInTheDocument()
    expect(screen.getByText(/Error occurred at:/)).toBeInTheDocument()
  })

  it('should provide proper accessibility attributes', () => {
    const testError = new Error('Test error')
    
    render(
      <TournamentDetailErrorBoundary tournamentCode="TEST001">
        <ThrowError shouldThrow={true} errorToThrow={testError} />
      </TournamentDetailErrorBoundary>
    )

    // Check for accessible error structure
    expect(screen.getByRole('button', { name: /try again/i })).toHaveAttribute('class', expect.stringContaining('min-h-[48px]'))
    expect(screen.getByRole('link', { name: /back to tournaments/i })).toHaveAttribute('class', expect.stringContaining('min-h-[48px]'))
  })
})