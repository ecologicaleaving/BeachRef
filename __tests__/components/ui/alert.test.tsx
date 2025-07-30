import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { AlertTriangle, AlertCircle, Info } from 'lucide-react';

describe('Alert Components', () => {
  it('renders Alert with default variant', () => {
    render(
      <Alert>
        <AlertTriangle className="h-4 w-4" />
        <AlertTitle>Test Title</AlertTitle>
        <AlertDescription>Test description</AlertDescription>
      </Alert>
    );
    
    const alert = screen.getByRole('alert');
    expect(alert).toBeInTheDocument();
    expect(alert).toHaveClass('relative', 'w-full', 'rounded-lg', 'border', 'p-4');
    expect(screen.getByText('Test Title')).toBeInTheDocument();
    expect(screen.getByText('Test description')).toBeInTheDocument();
  });

  it('renders Alert with destructive variant', () => {
    render(
      <Alert variant="destructive">
        <AlertTriangle className="h-4 w-4" />
        <AlertTitle>Error Title</AlertTitle>
        <AlertDescription>Error description</AlertDescription>
      </Alert>
    );
    
    const alert = screen.getByRole('alert');
    expect(alert).toHaveClass('border-destructive/50', 'text-destructive', 'bg-destructive/5');
  });

  it('renders Alert with warning variant', () => {
    render(
      <Alert variant="warning">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Warning Title</AlertTitle>
        <AlertDescription>Warning description</AlertDescription>
      </Alert>
    );
    
    const alert = screen.getByRole('alert');
    expect(alert).toHaveClass('border-accent/50', 'text-accent-foreground', 'bg-accent/10');
  });

  it('renders Alert with success variant', () => {
    render(
      <Alert variant="success">
        <Info className="h-4 w-4" />  
        <AlertTitle>Success Title</AlertTitle>
        <AlertDescription>Success description</AlertDescription>
      </Alert>
    );
    
    const alert = screen.getByRole('alert');
    expect(alert).toHaveClass('border-primary/50', 'text-primary', 'bg-primary/10');
  });

  it('applies custom className', () => {
    render(
      <Alert className="custom-class">
        <AlertTitle>Test</AlertTitle>
      </Alert>
    );
    
    const alert = screen.getByRole('alert');
    expect(alert).toHaveClass('custom-class');
  });

  it('renders AlertTitle with proper styling', () => {
    render(<AlertTitle>Test Title</AlertTitle>);
    
    const title = screen.getByText('Test Title');
    expect(title).toBeInTheDocument();
    expect(title).toHaveClass('mb-1', 'font-medium', 'leading-none', 'tracking-tight');
  });

  it('renders AlertDescription with proper styling', () => {
    render(<AlertDescription>Test Description</AlertDescription>);
    
    const description = screen.getByText('Test Description');
    expect(description).toBeInTheDocument();
    expect(description).toHaveClass('text-sm');
  });
});