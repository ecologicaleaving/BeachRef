import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { TableSkeleton } from '@/components/common/SkeletonLayouts';
import { ErrorDisplay } from '@/components/common/ErrorBoundary';

export interface Column<T = Record<string, unknown>> {
  key: string;
  header: string;
  render?: (value: unknown, row: T) => React.ReactNode;
  className?: string;
  sortable?: boolean;
}

interface DataTableProps<T = Record<string, unknown>> {
  data: T[];
  columns: Column<T>[];
  loading?: boolean;
  error?: string;
  onRetry?: () => void;
  emptyMessage?: string;
  className?: string;
}

export function DataTable<T extends Record<string, unknown>>({
  data,
  columns,
  loading = false,
  error,
  onRetry,
  emptyMessage = "No data available",
  className = ""
}: DataTableProps<T>) {
  // Loading state
  if (loading) {
    return <TableSkeleton rows={5} />;
  }

  // Error state
  if (error) {
    return (
      <ErrorDisplay
        title="Failed to load data"
        message={error}
        onRetry={onRetry}
      />
    );
  }

  // Empty state
  if (!data || data.length === 0) {
    return (
      <div className="border border-border rounded-lg p-8 text-center">
        <p className="text-muted-foreground">{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div className={`border border-border rounded-lg overflow-hidden ${className}`}>
      <Table>
        <TableHeader>
          <TableRow>
            {columns.map((column) => (
              <TableHead key={column.key} className={column.className}>
                {column.header}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.map((row, index) => (
            <TableRow key={index}>
              {columns.map((column) => (
                <TableCell key={column.key} className={column.className}>
                  {column.render 
                    ? column.render(row[column.key], row)
                    : String(row[column.key] ?? '')
                  }
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

// Status badge helper for tournaments
export function StatusBadge({ status }: { status: string }) {
  const getVariant = (status: string) => {
    switch (status.toLowerCase()) {
      case 'live':
      case 'ongoing':
        return 'live';
      case 'completed':
      case 'finished':
        return 'completed';
      case 'upcoming':
      case 'scheduled':
      default:
        return 'upcoming';
    }
  };

  const variant = getVariant(status);
  
  return (
    <Badge 
      variant={variant === 'live' ? 'destructive' : 
              variant === 'completed' ? 'secondary' : 'outline'}
      className={
        variant === 'live' ? 'badge-live' :
        variant === 'completed' ? 'badge-completed' :
        'badge-upcoming'
      }
    >
      {status}
    </Badge>
  );
}