# shadcn/ui Components Usage Guide

This document provides usage examples for the shadcn/ui components installed in the BeachRef project.

## Components Installed

- **Pagination**: For paginating through tournament data
- **Select**: For dropdowns and selection inputs

## Pagination Component

Import and use the pagination component for tournament data:

```tsx
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination"

// Example usage in a tournament list
function TournamentPagination({ currentPage, totalPages }: { currentPage: number, totalPages: number }) {
  return (
    <Pagination>
      <PaginationContent>
        <PaginationItem>
          <PaginationPrevious 
            href={currentPage > 1 ? `/tournaments?page=${currentPage - 1}` : "#"} 
          />
        </PaginationItem>
        
        {/* Show first page */}
        {currentPage > 2 && (
          <PaginationItem>
            <PaginationLink href="/tournaments?page=1">1</PaginationLink>
          </PaginationItem>
        )}
        
        {/* Show ellipsis if there are pages between first and current-1 */}
        {currentPage > 3 && (
          <PaginationItem>
            <PaginationEllipsis />
          </PaginationItem>
        )}
        
        {/* Show previous page if not on first page */}
        {currentPage > 1 && (
          <PaginationItem>
            <PaginationLink href={`/tournaments?page=${currentPage - 1}`}>
              {currentPage - 1}
            </PaginationLink>
          </PaginationItem>
        )}
        
        {/* Current page */}
        <PaginationItem>
          <PaginationLink href={`/tournaments?page=${currentPage}`} isActive>
            {currentPage}
          </PaginationLink>
        </PaginationItem>
        
        {/* Show next page if not on last page */}
        {currentPage < totalPages && (
          <PaginationItem>
            <PaginationLink href={`/tournaments?page=${currentPage + 1}`}>
              {currentPage + 1}
            </PaginationLink>
          </PaginationItem>
        )}
        
        {/* Show ellipsis if there are pages between current+1 and last */}
        {currentPage < totalPages - 2 && (
          <PaginationItem>
            <PaginationEllipsis />
          </PaginationItem>
        )}
        
        {/* Show last page */}
        {currentPage < totalPages - 1 && (
          <PaginationItem>
            <PaginationLink href={`/tournaments?page=${totalPages}`}>
              {totalPages}
            </PaginationLink>
          </PaginationItem>
        )}
        
        <PaginationItem>
          <PaginationNext 
            href={currentPage < totalPages ? `/tournaments?page=${currentPage + 1}` : "#"} 
          />
        </PaginationItem>
      </PaginationContent>
    </Pagination>
  )
}
```

## Select Component

Import and use the select component for filtering and options:

```tsx
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

// Example: Country filter for tournaments
function TournamentCountryFilter({ onCountryChange }: { onCountryChange: (country: string) => void }) {
  return (
    <Select onValueChange={onCountryChange}>
      <SelectTrigger className="w-[200px]">
        <SelectValue placeholder="Select country" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="all">All Countries</SelectItem>
        <SelectItem value="brazil">Brazil</SelectItem>
        <SelectItem value="usa">United States</SelectItem>
        <SelectItem value="norway">Norway</SelectItem>
        <SelectItem value="canada">Canada</SelectItem>
        <SelectItem value="australia">Australia</SelectItem>
      </SelectContent>
    </Select>
  )
}

// Example: Tournament status filter
function TournamentStatusFilter({ onStatusChange }: { onStatusChange: (status: string) => void }) {
  return (
    <Select onValueChange={onStatusChange}>
      <SelectTrigger className="w-[180px]">
        <SelectValue placeholder="Tournament status" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="all">All Statuses</SelectItem>
        <SelectItem value="scheduled">Scheduled</SelectItem>
        <SelectItem value="running">Running</SelectItem>
        <SelectItem value="finished">Finished</SelectItem>
        <SelectItem value="cancelled">Cancelled</SelectItem>
      </SelectContent>
    </Select>
  )
}

// Example: Page size selector
function PageSizeSelector({ pageSize, onPageSizeChange }: { 
  pageSize: number, 
  onPageSizeChange: (size: string) => void 
}) {
  return (
    <div className="flex items-center space-x-2">
      <span className="text-sm">Show:</span>
      <Select value={pageSize.toString()} onValueChange={onPageSizeChange}>
        <SelectTrigger className="w-20">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="10">10</SelectItem>
          <SelectItem value="20">20</SelectItem>
          <SelectItem value="50">50</SelectItem>
          <SelectItem value="100">100</SelectItem>
        </SelectContent>
      </Select>
      <span className="text-sm">per page</span>
    </div>
  )
}
```

## Integration with Tournament Table

These components can be integrated with the existing tournament table for Story 2.2:

```tsx
// Example of how to integrate pagination with tournament display
import { TournamentTable } from "@/components/tournament/TournamentTable"
import { TournamentPagination } from "./TournamentPagination" // Custom component using pagination
import { TournamentFilters } from "./TournamentFilters" // Custom component using select

function TournamentPage() {
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)
  const [countryFilter, setCountryFilter] = useState("all")
  const [statusFilter, setStatusFilter] = useState("all")

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex gap-4 items-center">
        <TournamentCountryFilter onCountryChange={setCountryFilter} />
        <TournamentStatusFilter onStatusChange={setStatusFilter} />
        <PageSizeSelector pageSize={pageSize} onPageSizeChange={(size) => setPageSize(Number(size))} />
      </div>

      {/* Tournament Table */}
      <TournamentTable 
        filters={{ country: countryFilter, status: statusFilter }}
        pagination={{ page: currentPage, size: pageSize }}
      />

      {/* Pagination */}
      <TournamentPagination 
        currentPage={currentPage} 
        totalPages={Math.ceil(totalTournaments / pageSize)} 
      />
    </div>
  )
}
```

## Dependencies Installed

The following dependencies were automatically installed:

- `@radix-ui/react-select`: ^2.2.5

The pagination component uses existing dependencies already in the project (lucide-react icons and button variants).

Both components follow the shadcn/ui design system and integrate seamlessly with the existing Tailwind CSS configuration and component structure.