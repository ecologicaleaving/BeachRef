import { render, screen } from '@testing-library/react';
import { DataTable, type Column } from '../DataTable';

const mockData = [
  { id: 1, name: 'Test Item 1', status: 'active' },
  { id: 2, name: 'Test Item 2', status: 'inactive' },
];

const mockColumns: Column[] = [
  { key: 'name', header: 'Name' },
  { key: 'status', header: 'Status' },
];

describe('DataTable Component', () => {
  test('renders table with data', () => {
    render(
      <DataTable data={mockData} columns={mockColumns} />
    );
    
    expect(screen.getByText('Name')).toBeInTheDocument();
    expect(screen.getByText('Status')).toBeInTheDocument();
    expect(screen.getByText('Test Item 1')).toBeInTheDocument();
    expect(screen.getByText('Test Item 2')).toBeInTheDocument();
    expect(screen.getByText('active')).toBeInTheDocument();
    expect(screen.getByText('inactive')).toBeInTheDocument();
  });

  test('renders loading skeleton when loading', () => {
    render(
      <DataTable data={[]} columns={mockColumns} loading={true} />
    );
    
    // Should render skeleton instead of data
    expect(screen.queryByText('Test Item 1')).not.toBeInTheDocument();
  });

  test('renders error message when error occurs', () => {
    render(
      <DataTable 
        data={[]} 
        columns={mockColumns} 
        error="Failed to load data" 
      />
    );
    
    expect(screen.getAllByText('Failed to load data')[0]).toBeInTheDocument();
  });

  test('renders empty state when no data', () => {
    render(
      <DataTable data={[]} columns={mockColumns} />
    );
    
    expect(screen.getByText('No data available')).toBeInTheDocument();
  });

  test('renders custom empty message', () => {
    render(
      <DataTable 
        data={[]} 
        columns={mockColumns} 
        emptyMessage="Custom empty message" 
      />
    );
    
    expect(screen.getByText('Custom empty message')).toBeInTheDocument();
  });

  test('uses custom render function for columns', () => {
    const customColumns: Column[] = [
      { 
        key: 'name', 
        header: 'Name',
        render: (value) => <strong>{String(value)}</strong>
      },
      { key: 'status', header: 'Status' },
    ];
    
    render(
      <DataTable data={mockData} columns={customColumns} />
    );
    
    const strongElement = screen.getByText('Test Item 1');
    expect(strongElement.tagName).toBe('STRONG');
  });
});