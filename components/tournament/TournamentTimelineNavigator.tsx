/**
 * Tournament Timeline Navigator Component for Story 5.2
 * Provides ±20 day timeline navigation with date range controls
 */

'use client';

import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar, ChevronLeft, ChevronRight, RotateCcw } from 'lucide-react';
import { cn } from '@/lib/utils';

interface TournamentTimelineNavigatorProps {
  currentDate: Date;
  range: number;
  onRangeChange: (range: number) => void;
  onDateChange?: (date: Date) => void;
  className?: string;
}

export function TournamentTimelineNavigator({ 
  currentDate, 
  range, 
  onRangeChange,
  onDateChange,
  className 
}: TournamentTimelineNavigatorProps) {
  const [viewMode, setViewMode] = useState<'timeline' | 'year' | 'all'>('timeline');

  const handleGoToToday = () => {
    onDateChange?.(new Date());
  };

  const handleDateNavigation = (direction: 'prev' | 'next') => {
    const newDate = new Date(currentDate);
    const daysToMove = Math.max(1, Math.floor(range / 4)); // Move by 1/4 of the range
    
    if (direction === 'prev') {
      newDate.setDate(newDate.getDate() - daysToMove);
    } else {
      newDate.setDate(newDate.getDate() + daysToMove);
    }
    
    onDateChange?.(newDate);
  };

  const formatDateRange = () => {
    const startDate = new Date(currentDate);
    startDate.setDate(startDate.getDate() - range);
    
    const endDate = new Date(currentDate);
    endDate.setDate(endDate.getDate() + range);
    
    const formatOptions: Intl.DateTimeFormatOptions = { 
      month: 'short', 
      day: 'numeric',
      year: currentDate.getFullYear() !== new Date().getFullYear() ? 'numeric' : undefined
    };
    
    return `${startDate.toLocaleDateString('en-US', formatOptions)} - ${endDate.toLocaleDateString('en-US', formatOptions)}`;
  };

  const isToday = (date: Date) => {
    const today = new Date();
    return date.toDateString() === today.toDateString();
  };

  return (
    <Card className={cn("bg-card border border-border", className)}>
      <CardContent className="p-4">
        <div className="flex flex-col space-y-4">
          {/* Header with timeline info */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-muted-foreground" />
              <span className="font-medium text-foreground">Timeline View</span>
              <Badge variant="outline" className="text-xs">
                ±{range} tournaments
              </Badge>
            </div>
            
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <span>Viewing: {formatDateRange()}</span>
            </div>
          </div>

          {/* Controls */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            {/* Date Navigation */}
            <div className="flex items-center gap-2">
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => handleDateNavigation('prev')}
                className="touch-target"
              >
                <ChevronLeft className="h-4 w-4" />
                <span className="sr-only">Previous period</span>
              </Button>
              
              <Button 
                variant={isToday(currentDate) ? "default" : "outline"}
                size="sm"
                onClick={handleGoToToday}
                className="touch-target flex items-center gap-1"
              >
                <RotateCcw className="h-4 w-4" />
                Today
              </Button>
              
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => handleDateNavigation('next')}
                className="touch-target"
              >
                <ChevronRight className="h-4 w-4" />
                <span className="sr-only">Next period</span>
              </Button>
            </div>

            {/* Range and View Mode Controls */}
            <div className="flex items-center gap-2">
              <Select 
                value={viewMode} 
                onValueChange={(value: 'timeline' | 'year' | 'all') => setViewMode(value)}
              >
                <SelectTrigger className="w-32 touch-target">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="timeline">Timeline</SelectItem>
                  <SelectItem value="year">Year View</SelectItem>
                  <SelectItem value="all">All</SelectItem>
                </SelectContent>
              </Select>

              <Select 
                value={range.toString()} 
                onValueChange={(val) => onRangeChange(parseInt(val))}
              >
                <SelectTrigger className="w-36 touch-target">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="5">±5 tournaments</SelectItem>
                  <SelectItem value="10">±10 tournaments</SelectItem>
                  <SelectItem value="20">±20 tournaments</SelectItem>
                  <SelectItem value="30">±30 tournaments</SelectItem>
                  <SelectItem value="50">±50 tournaments</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Current date indicator */}
          <div className="flex items-center justify-center">
            <div className="flex items-center gap-2 px-3 py-1 bg-muted/50 rounded-full text-xs text-muted-foreground">
              <div className="w-2 h-2 bg-primary rounded-full animate-pulse"></div>
              <span>Viewing from {currentDate.toLocaleDateString('en-US', { 
                weekday: 'short',
                month: 'short', 
                day: 'numeric',
                year: 'numeric'
              })}</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}