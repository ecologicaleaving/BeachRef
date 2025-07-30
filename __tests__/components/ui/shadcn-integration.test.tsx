import { render, screen } from '@testing-library/react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import ShadcnTest from '@/components/ui/ShadcnTest'

describe('shadcn/ui Integration', () => {
  describe('Button Component', () => {
    it('renders button with default variant', () => {
      render(<Button>Test Button</Button>)
      expect(screen.getByRole('button')).toBeInTheDocument()
      expect(screen.getByText('Test Button')).toBeInTheDocument()
    })

    it('renders button with different variants', () => {
      render(
        <div>
          <Button variant="default">Default</Button>
          <Button variant="secondary">Secondary</Button>
          <Button variant="outline">Outline</Button>
          <Button variant="ghost">Ghost</Button>
        </div>
      )
      
      expect(screen.getByText('Default')).toBeInTheDocument()
      expect(screen.getByText('Secondary')).toBeInTheDocument()
      expect(screen.getByText('Outline')).toBeInTheDocument()
      expect(screen.getByText('Ghost')).toBeInTheDocument()
    })
  })

  describe('Card Component', () => {
    it('renders card with all parts', () => {
      render(
        <Card>
          <CardHeader>
            <CardTitle>Test Title</CardTitle>
            <CardDescription>Test Description</CardDescription>
          </CardHeader>
          <CardContent>Test Content</CardContent>
        </Card>
      )
      
      expect(screen.getByText('Test Title')).toBeInTheDocument()
      expect(screen.getByText('Test Description')).toBeInTheDocument()
      expect(screen.getByText('Test Content')).toBeInTheDocument()
    })
  })

  describe('Badge Component', () => {
    it('renders badge with different variants', () => {
      render(
        <div>
          <Badge>Default Badge</Badge>
          <Badge variant="secondary">Secondary Badge</Badge>
          <Badge variant="outline">Outline Badge</Badge>
          <Badge variant="destructive">Destructive Badge</Badge>
        </div>
      )
      
      expect(screen.getByText('Default Badge')).toBeInTheDocument()
      expect(screen.getByText('Secondary Badge')).toBeInTheDocument()
      expect(screen.getByText('Outline Badge')).toBeInTheDocument()
      expect(screen.getByText('Destructive Badge')).toBeInTheDocument()
    })
  })

  describe('Table Component', () => {
    it('renders table with header and body', () => {
      render(
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Header 1</TableHead>
              <TableHead>Header 2</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableRow>
              <TableCell>Cell 1</TableCell>
              <TableCell>Cell 2</TableCell>
            </TableRow>
          </TableBody>
        </Table>
      )
      
      expect(screen.getByText('Header 1')).toBeInTheDocument()
      expect(screen.getByText('Header 2')).toBeInTheDocument()
      expect(screen.getByText('Cell 1')).toBeInTheDocument()
      expect(screen.getByText('Cell 2')).toBeInTheDocument()
    })
  })

  describe('FIVB Theme Integration', () => {
    it('renders ShadcnTest component with FIVB theme', () => {
      render(<ShadcnTest />)
      
      expect(screen.getByText('shadcn/ui Integration Test')).toBeInTheDocument()
      expect(screen.getByText('Primary (FIVB Blue)')).toBeInTheDocument()
      expect(screen.getByText('FIVB Beach Volleyball World Tour')).toBeInTheDocument()
    })

    it('applies FIVB color classes correctly', () => {
      render(<Button>FIVB Button</Button>)
      const button = screen.getByRole('button')
      
      // Button should have primary styling classes
      expect(button).toHaveClass('bg-primary', 'text-primary-foreground')
    })
  })

  describe('TypeScript Integration', () => {
    it('components accept proper TypeScript props', () => {
      // This test ensures TypeScript compilation works
      const buttonProps = {
        variant: 'secondary' as const,
        size: 'lg' as const,
        onClick: () => {},
        disabled: false
      }
      
      render(<Button {...buttonProps}>TypeScript Button</Button>)
      expect(screen.getByText('TypeScript Button')).toBeInTheDocument()
    })
  })
})