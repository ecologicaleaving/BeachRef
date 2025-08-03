'use client';

import { useState } from 'react';
import { TournamentTableWithPagination } from '@/components/tournament/TournamentTableWithPagination';
import { ActiveTournamentsSection } from '@/components/tournament/ActiveTournamentsSection';
import { TournamentTimelineNavigator } from '@/components/tournament/TournamentTimelineNavigator';
import { TemporalTournamentDisplay } from '@/components/tournament/TemporalTournamentDisplay';
import { ThemeToggle } from '@/components/ui/ThemeToggle';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { PaginatedTournamentResponse } from '@/lib/types';

interface PageProps {
  searchParams: {
    year?: string;
    page?: string;
    limit?: string;
    view?: string;
    range?: string;
  };
}

export default function Home({ searchParams }: PageProps) {
  // Parse URL parameters for initial state
  const year = parseInt(searchParams.year || '2025');
  const page = parseInt(searchParams.page || '1');
  const view = searchParams.view || 'timeline';
  const initialRange = parseInt(searchParams.range || '20');
  
  // Client-side state for interactive components
  const [range, setRange] = useState(initialRange);
  const [currentDate, setCurrentDate] = useState(new Date());
  
  // No SSR data fetching - let client handle it
  const initialData: PaginatedTournamentResponse | null = null;
  const error: string | null = null;
  
  return (
    <main className="container mx-auto mobile-padding tablet-padding desktop-padding py-8">
      <div className="max-w-7xl mx-auto">
        {/* Header with theme toggle */}
        <div className="flex items-center justify-between mb-6 sm:mb-8">
          <div className="flex-1">
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-foreground mb-2 sm:mb-4">
              Beach Volleyball Tournaments {year}
            </h1>
          </div>
          <div className="flex-shrink-0 ml-4">
            <ThemeToggle showLabel={false} />
          </div>
        </div>
        
        {/* Description with responsive text */}
        <div className="text-center mb-6 sm:mb-8">
          <p className="text-sm sm:text-base lg:text-lg text-muted-foreground max-w-2xl mx-auto">
            Browse and explore FIVB beach volleyball tournaments. 
            View active tournaments, navigate through timeline, or browse by year.
          </p>
        </div>

        {/* Active Tournaments Section - Always visible at top */}
        <ActiveTournamentsSection 
          currentDate={currentDate}
          className="mb-8"
        />
        
        {/* Main Tournament Display with Tabs */}
        <Tabs defaultValue={view} className="w-full">
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
                initialYear={year}
                initialPage={page}
              />
            )}
          </TabsContent>
        </Tabs>
        
        <footer className="text-center text-xs sm:text-sm text-muted-foreground mt-8 pt-6 sm:pt-8 border-t border-border">
          <p className="mb-2">
            Tournament data provided by FIVB VIS (Volleyball Information System)
          </p>
          <p className="text-xs text-muted-foreground/75">
            Data is updated every 5 minutes • Last updated: {new Date().toLocaleString()}
          </p>
          <p className="text-xs text-muted-foreground/50 mt-2">
            Optimized for tournament referee usage • Mobile-first design
          </p>
        </footer>
      </div>
    </main>
  )
}

// Enable dynamic rendering to support search params
export const dynamic = 'force-dynamic'