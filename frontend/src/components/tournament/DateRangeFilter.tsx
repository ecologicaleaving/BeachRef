import { useState } from 'react';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { CalendarIcon, X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface DateRangeFilterProps {
  dateRange?: { start?: Date; end?: Date };
  onDateRangeChange: (dateRange: { start?: Date; end?: Date }) => void;
  className?: string;
}

export function DateRangeFilter({ dateRange, onDateRangeChange, className }: DateRangeFilterProps) {
  const [open, setOpen] = useState(false);

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const handleDateSelect = (selectedDate: Date | undefined, type: 'start' | 'end') => {
    if (!selectedDate) return;

    const newDateRange = { ...dateRange };
    newDateRange[type] = selectedDate;

    // Validate date range
    if (newDateRange.start && newDateRange.end && newDateRange.start > newDateRange.end) {
      // If start date is after end date, adjust accordingly
      if (type === 'start') {
        newDateRange.end = selectedDate;
      } else {
        newDateRange.start = selectedDate;
      }
    }

    onDateRangeChange(newDateRange);
  };

  const handleDateInputChange = (value: string, type: 'start' | 'end') => {
    if (!value) {
      const newDateRange = { ...dateRange };
      delete newDateRange[type];
      onDateRangeChange(newDateRange);
      return;
    }

    const date = new Date(value);
    if (!isNaN(date.getTime())) {
      handleDateSelect(date, type);
    }
  };

  const clearDateRange = () => {
    onDateRangeChange({});
  };

  const hasDateRange = dateRange?.start || dateRange?.end;

  return (
    <div className={cn('space-y-2', className)}>
      <label className="text-sm font-medium">Date Range</label>
      
      <div className="flex flex-col space-y-2">
        {/* Date inputs for direct entry */}
        <div className="grid grid-cols-2 gap-2">
          <div>
            <Input
              type="date"
              placeholder="Start date"
              value={dateRange?.start ? dateRange.start.toISOString().split('T')[0] : ''}
              onChange={(e) => handleDateInputChange(e.target.value, 'start')}
              className="text-sm"
            />
          </div>
          <div>
            <Input
              type="date"
              placeholder="End date"
              value={dateRange?.end ? dateRange.end.toISOString().split('T')[0] : ''}
              onChange={(e) => handleDateInputChange(e.target.value, 'end')}
              className="text-sm"
            />
          </div>
        </div>

        {/* Calendar picker */}
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className={cn(
                'justify-start text-left font-normal',
                !hasDateRange && 'text-muted-foreground'
              )}
            >
              <CalendarIcon className="mr-2 h-4 w-4" />
              {hasDateRange ? (
                <span className="flex items-center gap-2">
                  {dateRange?.start && formatDate(dateRange.start)}
                  {dateRange?.start && dateRange?.end && ' - '}
                  {dateRange?.end && formatDate(dateRange.end)}
                  <div
                    className="h-4 w-4 p-0 ml-2 cursor-pointer hover:bg-gray-100 rounded"
                    onClick={(e) => {
                      e.stopPropagation();
                      clearDateRange();
                    }}
                  >
                    <X className="h-3 w-3" />
                  </div>
                </span>
              ) : (
                'Pick date range'
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <div className="p-3 space-y-3">
              <div className="text-sm font-medium">Select Date Range</div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <div className="text-xs text-muted-foreground mb-1">Start Date</div>
                  <Calendar
                    mode="single"
                    selected={dateRange?.start}
                    onSelect={(date: Date | undefined) => handleDateSelect(date, 'start')}
                    disabled={(date: Date) => 
                      (date > new Date() && !dateRange?.end) || // Future dates only allowed if end date is set
                      !!(dateRange?.end && date > dateRange.end)
                    }
                    className="rounded-md border"
                  />
                </div>
                <div>
                  <div className="text-xs text-muted-foreground mb-1">End Date</div>
                  <Calendar
                    mode="single"
                    selected={dateRange?.end}
                    onSelect={(date: Date | undefined) => handleDateSelect(date, 'end')}
                    disabled={(date: Date) => 
                      !!(dateRange?.start && date < dateRange.start)
                    }
                    className="rounded-md border"
                  />
                </div>
              </div>
              <div className="flex justify-between">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={clearDateRange}
                  disabled={!hasDateRange}
                >
                  Clear
                </Button>
                <Button
                  size="sm"
                  onClick={() => setOpen(false)}
                >
                  Done
                </Button>
              </div>
            </div>
          </PopoverContent>
        </Popover>

        {/* Active filter indicator */}
        {hasDateRange && (
          <div className="flex flex-wrap gap-1">
            {dateRange?.start && (
              <Badge variant="secondary" className="text-xs">
                From: {formatDate(dateRange.start)}
                <div
                  className="h-3 w-3 p-0 ml-1 cursor-pointer hover:bg-gray-100 rounded inline-flex items-center justify-center"
                  onClick={() => handleDateInputChange('', 'start')}
                >
                  <X className="h-2 w-2" />
                </div>
              </Badge>
            )}
            {dateRange?.end && (
              <Badge variant="secondary" className="text-xs">
                To: {formatDate(dateRange.end)}
                <div
                  className="h-3 w-3 p-0 ml-1 cursor-pointer hover:bg-gray-100 rounded inline-flex items-center justify-center"
                  onClick={() => handleDateInputChange('', 'end')}
                >
                  <X className="h-2 w-2" />
                </div>
              </Badge>
            )}
          </div>
        )}
      </div>
    </div>
  );
}