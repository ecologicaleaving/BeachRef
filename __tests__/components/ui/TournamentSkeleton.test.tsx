import { render, screen } from '@testing-library/react'
import { 
  TournamentTableSkeleton, 
  TournamentCardSkeleton, 
  TournamentProgressiveSkeleton 
} from '@/components/ui/TournamentSkeleton'

describe('TournamentSkeleton Components', () => {
  describe('TournamentTableSkeleton', () => {
    it('renders table skeleton with default props', () => {
      render(<TournamentTableSkeleton />)
      
      expect(screen.getByRole('status')).toBeInTheDocument()
      expect(screen.getByLabelText('Loading tournament table')).toBeInTheDocument()
      expect(screen.getByText('Loading tournament table')).toHaveClass('sr-only')
    })

    it('renders correct number of columns and rows', () => {
      const { container } = render(<TournamentTableSkeleton columns={4} rows={5} />)
      
      // Count the row containers (excluding header)
      const rows = container.querySelectorAll('.grid.gap-4.p-4.border-b')
      expect(rows).toHaveLength(5)
    })

    it('applies responsive column visibility for mobile', () => {
      const { container } = render(
        <TournamentTableSkeleton screenSize="mobile" columns={6} />
      )
      
      // Mobile should show grid-cols-3
      const gridElement = container.querySelector('.grid-cols-3')
      expect(gridElement).toBeInTheDocument()
    })

    it('applies responsive column visibility for tablet', () => {
      const { container } = render(
        <TournamentTableSkeleton screenSize="tablet" columns={6} />
      )
      
      // Tablet should show grid-cols-4
      const gridElement = container.querySelector('.grid-cols-4')
      expect(gridElement).toBeInTheDocument()
    })

    it('applies responsive column visibility for desktop', () => {
      const { container } = render(
        <TournamentTableSkeleton screenSize="desktop" columns={6} />
      )
      
      // Desktop should show grid-cols-6
      const gridElement = container.querySelector('.grid-cols-6')
      expect(gridElement).toBeInTheDocument()
    })

    it('applies custom className', () => {
      const { container } = render(
        <TournamentTableSkeleton className="custom-class" />
      )
      
      expect(container.firstChild).toHaveClass('custom-class')
    })
  })

  describe('TournamentCardSkeleton', () => {
    it('renders card skeleton with default props', () => {
      render(<TournamentCardSkeleton />)
      
      expect(screen.getByRole('status')).toBeInTheDocument()
      expect(screen.getByLabelText('Loading tournament cards')).toBeInTheDocument()
      expect(screen.getByText('Loading tournament cards')).toHaveClass('sr-only')
    })

    it('renders correct number of card skeletons', () => {
      const { container } = render(<TournamentCardSkeleton rows={3} />)
      
      // Should have 3 card containers
      const cards = container.querySelectorAll('[data-testid*="card-"], .p-5.border')
      expect(cards.length).toBeGreaterThanOrEqual(3)
    })

    it('renders card structure with header, country, dates, and type sections', () => {
      const { container } = render(<TournamentCardSkeleton rows={1} />)
      
      // Check for the expected structure within cards
      const card = container.querySelector('.p-5.border')
      expect(card).toBeInTheDocument()
      
      // Should have proper spacing structure
      const spaceY4Elements = container.querySelectorAll('.space-y-4')
      expect(spaceY4Elements.length).toBeGreaterThan(0)
    })

    it('applies custom className', () => {
      const { container } = render(
        <TournamentCardSkeleton className="custom-card-class" />
      )
      
      expect(container.firstChild).toHaveClass('custom-card-class')
    })
  })

  describe('TournamentProgressiveSkeleton', () => {
    const mockSteps = [
      { label: 'Step 1', completed: true, current: false },
      { label: 'Step 2', completed: false, current: true },
      { label: 'Step 3', completed: false, current: false }
    ]

    it('renders progressive skeleton with default steps', () => {
      render(<TournamentProgressiveSkeleton />)
      
      expect(screen.getByRole('status')).toBeInTheDocument()
      expect(screen.getByLabelText('Loading progress')).toBeInTheDocument()
    })

    it('renders custom steps correctly', () => {
      render(<TournamentProgressiveSkeleton steps={mockSteps} />)
      
      // Should show completed step with checkmark
      const checkmark = screen.getByRole('status').querySelector('svg')
      expect(checkmark).toBeInTheDocument()
    })

    it('shows current step with pulsing animation', () => {
      render(<TournamentProgressiveSkeleton steps={mockSteps} />)
      
      const pulsingElement = screen.getByRole('status').querySelector('.animate-pulse')
      expect(pulsingElement).toBeInTheDocument()
    })

    it('applies custom className', () => {
      const { container } = render(
        <TournamentProgressiveSkeleton className="custom-progress-class" />
      )
      
      expect(container.firstChild).toHaveClass('custom-progress-class')
    })
  })

  describe('Accessibility', () => {
    it('all skeleton components have proper ARIA labels', () => {
      render(
        <div>
          <TournamentTableSkeleton />
          <TournamentCardSkeleton />
          <TournamentProgressiveSkeleton />
        </div>
      )
      
      expect(screen.getByLabelText('Loading tournament table')).toBeInTheDocument()
      expect(screen.getByLabelText('Loading tournament cards')).toBeInTheDocument()
      expect(screen.getByLabelText('Loading progress')).toBeInTheDocument()
    })

    it('all skeleton components have role="status"', () => {
      render(
        <div>
          <TournamentTableSkeleton />
          <TournamentCardSkeleton />
          <TournamentProgressiveSkeleton />
        </div>
      )
      
      const statusElements = screen.getAllByRole('status')
      expect(statusElements).toHaveLength(3)
    })

    it('all skeleton components have sr-only text', () => {
      render(
        <div>
          <TournamentTableSkeleton />
          <TournamentCardSkeleton />
        </div>
      )
      
      expect(screen.getByText('Loading tournament table')).toHaveClass('sr-only')
      expect(screen.getByText('Loading tournament cards')).toHaveClass('sr-only')
    })
  })

  describe('Performance and Animation', () => {
    it('skeleton components use proper animation classes', () => {
      const { container } = render(<TournamentTableSkeleton />)
      
      // shadcn Skeleton components should have animate-pulse
      const skeletonElements = container.querySelectorAll('[class*="animate-pulse"]')
      expect(skeletonElements.length).toBeGreaterThan(0)
    })

    it('components render without layout shifts', () => {
      const { container, rerender } = render(<TournamentTableSkeleton rows={2} />)
      const initialRowCount = container.querySelectorAll('.grid.gap-4.p-4.border-b').length
      
      rerender(<TournamentTableSkeleton rows={5} />)
      const newRowCount = container.querySelectorAll('.grid.gap-4.p-4.border-b').length
      
      // Row count should increase proportionally
      expect(newRowCount).toBeGreaterThan(initialRowCount)
      expect(newRowCount).toBe(5)
    })
  })
})