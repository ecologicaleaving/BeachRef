"use client"

import * as React from "react"
import { Calendar } from "lucide-react"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { cn } from "@/lib/utils"

interface YearSelectorProps {
  currentYear: number
  availableYears: Array<{
    year: number
    count: number
  }>
  onYearChange: (year: number) => void
  className?: string
  isLoading?: boolean
}

export const YearSelector: React.FC<YearSelectorProps> = ({
  currentYear,
  availableYears,
  onYearChange,
  className,
  isLoading = false
}) => {
  const handleValueChange = (value: string) => {
    const year = parseInt(value)
    if (!isNaN(year) && !isLoading) {
      onYearChange(year)
    }
  }

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Calendar className="h-4 w-4" />
        <span className="hidden sm:inline">Year:</span>
      </div>
      
      <Select
        value={currentYear.toString()}
        onValueChange={handleValueChange}
        disabled={isLoading}
      >
        <SelectTrigger className={cn(
          "w-[140px] sm:w-[160px]",
          isLoading && "cursor-not-allowed opacity-50"
        )}>
          <SelectValue placeholder="Select year" />
        </SelectTrigger>
        <SelectContent>
          {availableYears.map(({ year, count }) => (
            <SelectItem 
              key={year} 
              value={year.toString()}
              className="flex items-center justify-between"
            >
              <div className="flex items-center justify-between w-full">
                <span className="font-medium">{year}</span>
                <span className="text-xs text-muted-foreground ml-2">
                  {count} tournament{count !== 1 ? 's' : ''}
                </span>
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      
      {isLoading && (
        <div className="flex items-center text-xs text-muted-foreground">
          <span>Loading...</span>
        </div>
      )}
    </div>
  )
}