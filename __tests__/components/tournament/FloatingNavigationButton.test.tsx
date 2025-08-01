import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import { useRouter, useSearchParams } from 'next/navigation'
import FloatingNavigationButton from '@/components/tournament/FloatingNavigationButton'

// Mock Next.js navigation hooks
jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
  useSearchParams: jest.fn(),
}))

const mockPush = jest.fn()
const mockSearchParams = {
  get: jest.fn(),
}

describe('FloatingNavigationButton', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    ;(useRouter as jest.Mock).mockReturnValue({
      push: mockPush,
    })
    ;(useSearchParams as jest.Mock).mockReturnValue(mockSearchParams)
  })

  it('renders floating button with correct positioning', () => {
    mockSearchParams.get.mockReturnValue(null)
    
    render(<FloatingNavigationButton />)
    
    const button = screen.getByRole('button', { name: /return to tournament list/i })
    expect(button).toBeInTheDocument()
    expect(button.parentElement).toHaveClass('fixed', 'bottom-6', 'right-6', 'md:hidden', 'z-50')
  })

  it('has correct touch target size (48px minimum)', () => {
    mockSearchParams.get.mockReturnValue(null)
    
    render(<FloatingNavigationButton />)
    
    const button = screen.getByRole('button', { name: /return to tournament list/i })
    expect(button).toHaveClass('h-12', 'w-12') // 48px minimum
  })

  it('navigates to root path when no search params', () => {
    mockSearchParams.get.mockReturnValue(null)
    
    render(<FloatingNavigationButton />)
    
    const button = screen.getByRole('button', { name: /return to tournament list/i })
    fireEvent.click(button)
    
    expect(mockPush).toHaveBeenCalledWith('/')
  })

  it('preserves search parameters in navigation URL', () => {
    mockSearchParams.get.mockImplementation((key) => {
      switch (key) {
        case 'year': return '2024'
        case 'page': return '3'
        case 'gender': return 'women'
        case 'type': return '4star'
        default: return null
      }
    })
    
    render(<FloatingNavigationButton />)
    
    const button = screen.getByRole('button', { name: /return to tournament list/i })
    fireEvent.click(button)
    
    expect(mockPush).toHaveBeenCalledWith('/?year=2024&page=3&gender=women&type=4star')
  })

  it('preserves only non-null search parameters', () => {
    mockSearchParams.get.mockImplementation((key) => {
      switch (key) {
        case 'year': return '2024'
        case 'page': return null
        case 'gender': return 'women'
        case 'type': return null
        default: return null
      }
    })
    
    render(<FloatingNavigationButton />)
    
    const button = screen.getByRole('button', { name: /return to tournament list/i })
    fireEvent.click(button)
    
    expect(mockPush).toHaveBeenCalledWith('/?year=2024&gender=women')
  })

  it('has proper accessibility attributes', () => {
    mockSearchParams.get.mockReturnValue(null)
    
    render(<FloatingNavigationButton />)
    
    const button = screen.getByRole('button', { name: /return to tournament list/i })
    expect(button).toHaveAttribute('aria-label', 'Return to tournament list')
  })

  it('contains ArrowLeft icon', () => {
    mockSearchParams.get.mockReturnValue(null)
    
    render(<FloatingNavigationButton />)
    
    const icon = screen.getByRole('button').querySelector('svg')
    expect(icon).toBeInTheDocument()
  })
})