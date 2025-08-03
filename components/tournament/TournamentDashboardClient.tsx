/**
 * Client-side wrapper for temporal tournament dashboard functionality
 * Handles interactive state management for timeline navigation
 */

'use client';

import { useState } from 'react';
import { ActiveTournamentsSection } from './ActiveTournamentsSection';
import { TournamentTimelineNavigator } from './TournamentTimelineNavigator';
import { TemporalTournamentDisplay } from './TemporalTournamentDisplay';
import { TournamentTableWithPagination } from './TournamentTableWithPagination';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { PaginatedTournamentResponse } from '@/lib/types';

interface TournamentDashboardClientProps {
  initialYear: number;
  initialPage: number;
  initialView: string;
  initialRange: number;
  initialData: PaginatedTournamentResponse | null;
  error: string | null;
}

export function TournamentDashboardClient({
  initialYear,
  initialPage,
  initialView,
  initialRange,
  initialData,
  error
}: TournamentDashboardClientProps) {
  // Client-side state for interactive components
  const [range, setRange] = useState(initialRange);
  const [currentDate, setCurrentDate] = useState(new Date());

  return (
    <>
      {/* Active Tournaments Section - Always visible at top */}
      <ActiveTournamentsSection 
        currentDate={currentDate}
        className="mb-8"
      />
      
      {/* Main Tournament Display with Tabs */}
      <Tabs defaultValue={initialView} className="w-full">
        <TabsList className="grid w-full grid-cols-2 mb-6">
          <TabsTrigger value="timeline" className="touch-target">Timeline View</TabsTrigger>
          <TabsTrigger value="year" className="touch-target">Year View</TabsTrigger>
        </TabsList>
        
        <TabsContent value="timeline" className="space-y-6">
          {/* Timeline Navigation */}
          <TournamentTimelineNavigator 
            currentDate={currentDate}
            range={range}
            onRangeChange={setRange}
            onDateChange={setCurrentDate}
          />
          
          {/* Temporal Tournament Display */}
          <TemporalTournamentDisplay 
            filter="timeline"
            range={range}
            currentDate={currentDate}
          />
        </TabsContent>
        
        <TabsContent value="year" className="space-y-6">
          {error ? (
            <div className="mb-6 p-6 border border-destructive/50 bg-destructive/10 rounded-lg text-center">
              <div className="text-destructive font-medium mb-2">
                Failed to load tournaments
              </div>
              <div className="text-sm text-muted-foreground">
                {error}
              </div>
            </div>
          ) : (
            <TournamentTableWithPagination 
              className="w-full"
              initialData={initialData}
              initialYear={initialYear}
              initialPage={initialPage}
            />
          )}
        </TabsContent>
      </Tabs>
    </>
  );
}