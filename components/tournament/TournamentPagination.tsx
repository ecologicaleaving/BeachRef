"use client"

import * as React from "react"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination"
import { cn } from "@/lib/utils"
import { useResponsiveDesign } from "@/hooks/useResponsiveDesign"

interface TournamentPaginationProps {
  currentPage: number
  totalPages: number
  onPageChange: (page: number) => void
  className?: string
  isLoading?: boolean
}

// Generate page numbers for desktop pagination
function generatePageNumbers(currentPage: number, totalPages: number): number[] {
  const pages: number[] = []
  const maxVisible = 5
  
  if (totalPages <= maxVisible) {
    // Show all pages if total is small
    for (let i = 1; i <= totalPages; i++) {
      pages.push(i)
    }
  } else {
    // Show smart pagination with ellipsis logic
    const start = Math.max(1, currentPage - 2)
    const end = Math.min(totalPages, currentPage + 2)
    
    // Always show first page
    if (start > 1) {
      pages.push(1)
      if (start > 2) {
        pages.push(-1) // Ellipsis marker
      }
    }
    
    // Show pages around current
    for (let i = start; i <= end; i++) {
      pages.push(i)
    }
    
    // Always show last page
    if (end < totalPages) {
      if (end < totalPages - 1) {
        pages.push(-1) // Ellipsis marker
      }
      pages.push(totalPages)
    }
  }
  
  return pages
}

export const TournamentPagination: React.FC<TournamentPaginationProps> = ({
  currentPage,
  totalPages,
  onPageChange,
  className,
  isLoading = false
}) => {
  const { screenSize, getTouchTargetSize } = useResponsiveDesign()
  const touchTargetSize = getTouchTargetSize()

  // Don't render if only one page or no pages
  if (totalPages <= 1) {
    return null
  }

  const handlePrevious = () => {
    if (currentPage > 1 && !isLoading) {
      onPageChange(currentPage - 1)
    }
  }

  const handleNext = () => {
    if (currentPage < totalPages && !isLoading) {
      onPageChange(currentPage + 1)
    }
  }

  const handlePageClick = (page: number) => {
    if (page !== currentPage && !isLoading && page > 0) {
      onPageChange(page)
    }
  }

  if (screenSize === 'mobile') {
    // Mobile: Custom prev/next buttons with enhanced touch targets
    return (
      <div className={cn("flex items-center justify-between gap-4 py-4", className)}>
        <Button
          variant="outline"
          size="lg"
          className="touch-target-enhanced min-h-[48px] min-w-[80px] gap-2"
          onClick={handlePrevious}
          disabled={currentPage <= 1 || isLoading}
          style={{ minHeight: `${touchTargetSize}px` }}
        >
          <ChevronLeft className="h-4 w-4" />
          <span className="hidden sm:inline">Previous</span>
          <span className="sm:hidden">Prev</span>
        </Button>
        
        <div className="flex flex-col items-center gap-1">
          <span className="text-sm font-medium">
            Page {currentPage} of {totalPages}
          </span>
          <span className="text-xs text-muted-foreground">
            {isLoading ? "Loading..." : `${totalPages} pages total`}
          </span>
        </div>
        
        <Button
          variant="outline"
          size="lg"
          className="touch-target-enhanced min-h-[48px] min-w-[80px] gap-2"
          onClick={handleNext}
          disabled={currentPage >= totalPages || isLoading}
          style={{ minHeight: `${touchTargetSize}px` }}
        >
          <span>Next</span>
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    )
  }

  // Desktop: Use shadcn Pagination component with numbered pages
  const pageNumbers = generatePageNumbers(currentPage, totalPages)

  return (
    <div className={cn("flex items-center justify-between gap-4 py-4", className)}>
      <div className="text-sm text-muted-foreground">
        {isLoading ? (
          "Loading pages..."
        ) : (
          `Page ${currentPage} of ${totalPages} (${totalPages} total)`
        )}
      </div>
      
      <Pagination>
        <PaginationContent>
          <PaginationItem>
            <PaginationPrevious 
              onClick={handlePrevious}
              className={cn(
                "cursor-pointer",
                (currentPage <= 1 || isLoading) && "cursor-not-allowed opacity-50"
              )}
              aria-disabled={currentPage <= 1 || isLoading}
            />
          </PaginationItem>
          
          {pageNumbers.map((page, index) => (
            <PaginationItem key={index}>
              {page === -1 ? (
                <span className="flex h-9 w-9 items-center justify-center text-muted-foreground">
                  ...
                </span>
              ) : (
                <PaginationLink 
                  onClick={() => handlePageClick(page)}
                  isActive={page === currentPage}
                  className={cn(
                    "cursor-pointer",
                    isLoading && "cursor-not-allowed opacity-50"
                  )}
                  aria-disabled={isLoading}
                >
                  {page}
                </PaginationLink>
              )}
            </PaginationItem>
          ))}
          
          <PaginationItem>
            <PaginationNext 
              onClick={handleNext}
              className={cn(
                "cursor-pointer",
                (currentPage >= totalPages || isLoading) && "cursor-not-allowed opacity-50"
              )}
              aria-disabled={currentPage >= totalPages || isLoading}
            />
          </PaginationItem>
        </PaginationContent>
      </Pagination>
    </div>
  )
}