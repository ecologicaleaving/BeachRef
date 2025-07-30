'use client';

import { FC, useCallback, useEffect, useState, useMemo } from 'react';
import { 
  Tournament, 
  TournamentTableProps, 
  SortColumn, 
  SortConfig,
  FormattedTournament 
} from '@/lib/types';
import { TournamentTableSkeleton, TournamentCardSkeleton, TournamentProgressiveSkeleton } from '@/components/ui/TournamentSkeleton';
import { TournamentError } from '@/components/ui/ErrorMessage';
import { TournamentRow } from '@/components/tournament/TournamentRow';
import { getCountryName } from '@/lib/country-utils';
import {
  Table,
  TableBody,
  TableHead,
  TableHeader,
  TableRow as ShadcnTableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';

export const TournamentTable: FC<TournamentTableProps> = ({
  initialData = null,
  className = ''
}) => {
  const [tournaments, setTournaments] = useState<Tournament[]>(initialData || []);
  const [loading, setLoading] = useState<boolean>(initialData === null);
  const [error, setError] = useState<string | null>(null);
  const [sortConfig, setSortConfig] = useState<SortConfig | null>(null);
  const [screenSize, setScreenSize] = useState<'mobile' | 'tablet' | 'desktop'>('mobile');
  const [scrollIndicators, setScrollIndicators] = useState({ left: false, right: false });
  const [touchStart, setTouchStart] = useState<{ x: number; y: number } | null>(null);
  const [progressiveLoading, setProgressiveLoading] = useState<{
    step: number;
    steps: Array<{ label: string; completed: boolean; current: boolean }>;
  } | null>(null);
  const [isContentReady, setIsContentReady] = useState<boolean>(initialData !== null);
  const [viewPreference, setViewPreference] = useState<'table' | 'card' | 'auto'>('auto');

  // Handle responsive breakpoint detection with enhanced breakpoints
  useEffect(() => {
    const handleResize = () => {
      const width = window.innerWidth;
      if (width >= 1024) {
        setScreenSize('desktop');
      } else if (width >= 768) {
        setScreenSize('tablet');
      } else {
        setScreenSize('mobile');
      }
    };

    // Set initial state
    handleResize();
    
    // Add resize listener
    window.addEventListener('resize', handleResize);
    
    // Cleanup
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Handle scroll indicators for horizontal scrolling
  const handleTableScroll = useCallback((event: React.UIEvent<HTMLDivElement>) => {
    const container = event.currentTarget;
    const { scrollLeft, scrollWidth, clientWidth } = container;
    
    setScrollIndicators({
      left: scrollLeft > 0,
      right: scrollLeft < scrollWidth - clientWidth - 1
    });
  }, []);

  // Touch gesture handlers for swipe scrolling
  const handleTouchStart = useCallback((event: React.TouchEvent<HTMLDivElement>) => {
    const touch = event.touches[0];
    setTouchStart({
      x: touch.clientX,
      y: touch.clientY
    });
  }, []);

  const handleTouchMove = useCallback((event: React.TouchEvent<HTMLDivElement>) => {
    if (!touchStart) return;

    const touch = event.touches[0];
    const deltaX = touchStart.x - touch.clientX;
    const deltaY = touchStart.y - touch.clientY;

    // Prevent vertical scroll interference for horizontal swipes
    if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > 10) {
      event.preventDefault();
    }
  }, [touchStart]);

  const handleTouchEnd = useCallback(() => {
    setTouchStart(null);
  }, []);

  // Keyboard navigation for mobile cards
  const handleCardKeyDown = useCallback((event: React.KeyboardEvent, index: number) => {
    const cards = document.querySelectorAll('[role="row"][tabindex="0"]');
    let nextIndex = index;

    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault();
        nextIndex = Math.min(index + 1, cards.length - 1);
        break;
      case 'ArrowUp':
        event.preventDefault();
        nextIndex = Math.max(index - 1, 0);
        break;
      case 'Home':
        event.preventDefault();
        nextIndex = 0;
        break;
      case 'End':
        event.preventDefault();
        nextIndex = cards.length - 1;
        break;
      default:
        return;
    }

    if (nextIndex !== index) {
      (cards[nextIndex] as HTMLElement)?.focus();
    }
  }, []);

  // Format date for display
  const formatDate = useCallback((dateString: string): string => {
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) {
        return dateString; // Return original if invalid
      }
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
    } catch {
      return dateString;
    }
  }, []);


  // Format tournament data for display
  const formattedTournaments = useMemo((): FormattedTournament[] => {
    return tournaments.map(tournament => ({
      ...tournament,
      formattedStartDate: formatDate(tournament.startDate),
      formattedEndDate: formatDate(tournament.endDate),
      formattedGender: tournament.gender,
      countryName: getCountryName(tournament.countryCode)
    }));
  }, [tournaments, formatDate]);

  // Sorting function
  const sortTournaments = useCallback((
    tournaments: FormattedTournament[],
    config: SortConfig
  ): FormattedTournament[] => {
    return [...tournaments].sort((a, b) => {
      let aValue: any;
      let bValue: any;

      switch (config.column) {
        case 'name':
          aValue = a.name.toLowerCase();
          bValue = b.name.toLowerCase();
          break;
        case 'countryCode':
          aValue = a.countryName?.toLowerCase() || a.countryCode.toLowerCase();
          bValue = b.countryName?.toLowerCase() || b.countryCode.toLowerCase();
          break;
        case 'startDate':
          aValue = new Date(a.startDate).getTime();
          bValue = new Date(b.startDate).getTime();
          break;
        case 'endDate':
          aValue = new Date(a.endDate).getTime();
          bValue = new Date(b.endDate).getTime();
          break;
        case 'gender':
          aValue = a.gender;
          bValue = b.gender;
          break;
        case 'type':
          aValue = a.type.toLowerCase();
          bValue = b.type.toLowerCase();
          break;
        default:
          return 0;
      }

      if (aValue < bValue) {
        return config.direction === 'asc' ? -1 : 1;
      }
      if (aValue > bValue) {
        return config.direction === 'asc' ? 1 : -1;
      }
      return 0;
    });
  }, []);

  // Apply sorting to tournaments
  const sortedTournaments = useMemo(() => {
    if (!sortConfig) {
      return formattedTournaments;
    }
    return sortTournaments(formattedTournaments, sortConfig);
  }, [formattedTournaments, sortConfig, sortTournaments]);

  // Handle column sort
  const handleSort = useCallback((column: SortColumn) => {
    setSortConfig((prevConfig: SortConfig | null) => {
      if (prevConfig?.column === column) {
        // Toggle direction or clear sort
        if (prevConfig.direction === 'asc') {
          return { column, direction: 'desc' };
        } else {
          return null; // Clear sort
        }
      } else {
        // Set new column with ascending direction
        return { column, direction: 'asc' };
      }
    });
  }, []);

  // Fetch tournaments from API
  const fetchTournaments = useCallback(async () => {
    setLoading(true);
    setError(null);
    setIsContentReady(false);
    
    // Initialize progressive loading steps
    const initialSteps = [
      { label: 'Connecting to VIS API', completed: false, current: true },
      { label: 'Fetching tournament data', completed: false, current: false },
      { label: 'Processing results', completed: false, current: false },
      { label: 'Loading complete', completed: false, current: false }
    ];
    
    setProgressiveLoading({ step: 0, steps: initialSteps });
    
    try {
      // Step 1: Connecting to API
      await new Promise(resolve => setTimeout(resolve, 300)); // Brief delay for UX
      setProgressiveLoading(prev => prev ? {
        step: 1,
        steps: prev.steps.map((step, idx) => ({
          ...step,
          completed: idx === 0,
          current: idx === 1
        }))
      } : null);

      // Step 2: Fetching data
      const response = await fetch('/api/tournaments', {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'Cache-Control': 'no-cache'
        }
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          errorData.message || 
          `Failed to fetch tournaments: ${response.status} ${response.statusText}`
        );
      }

      // Step 3: Processing results
      setProgressiveLoading(prev => prev ? {
        step: 2,
        steps: prev.steps.map((step, idx) => ({
          ...step,
          completed: idx <= 1,
          current: idx === 2
        }))
      } : null);

      const data: Tournament[] = await response.json();
      await new Promise(resolve => setTimeout(resolve, 200)); // Brief processing delay

      // Step 4: Complete
      setProgressiveLoading(prev => prev ? {
        step: 3,
        steps: prev.steps.map((step, idx) => ({
          ...step,
          completed: idx <= 2,
          current: idx === 3
        }))
      } : null);

      setTournaments(data);
      setIsContentReady(true);
      
      // Final completion
      await new Promise(resolve => setTimeout(resolve, 200));
      setProgressiveLoading(prev => prev ? {
        step: 4,
        steps: prev.steps.map(step => ({ ...step, completed: true, current: false }))
      } : null);
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      setError(errorMessage);
      console.error('Failed to fetch tournaments:', err);
    } finally {
      setLoading(false);
      setProgressiveLoading(null);
    }
  }, []);

  // Retry handler
  const handleRetry = useCallback(() => {
    fetchTournaments();
  }, [fetchTournaments]);

  // Load tournaments on mount if no initial data
  useEffect(() => {
    if (initialData === null) {
      fetchTournaments();
    }
  }, [initialData, fetchTournaments]);

  // Render sort icon
  const renderSortIcon = useCallback((column: SortColumn) => {
    if (!sortConfig || sortConfig.column !== column) {
      return (
        <svg
          className="w-4 h-4 text-muted-foreground"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M8 9l4-4 4 4m0 6l-4 4-4-4"
          />
        </svg>
      );
    }

    return sortConfig.direction === 'asc' ? (
      <svg
        className="w-4 h-4 text-primary"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
        aria-hidden="true"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M8 15l4-4 4 4"
        />
      </svg>
    ) : (
      <svg
        className="w-4 h-4 text-primary"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
        aria-hidden="true"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M8 9l4 4 4-4"
        />
      </svg>
    );
  }, [sortConfig]);

  // Get ARIA sort attribute for table headers
  const getSortAttribute = useCallback((column: SortColumn): 'none' | 'ascending' | 'descending' => {
    if (!sortConfig || sortConfig.column !== column) {
      return 'none';
    }
    return sortConfig.direction === 'asc' ? 'ascending' : 'descending';
  }, [sortConfig]);

  // Column visibility based on screen size (priority system)
  // Memoized for performance since this is called multiple times per render
  const columnPriority = useMemo(() => ({
    'name': 1,        // Always visible
    'countryCode': 2, // Always visible
    'startDate': 3,   // Always visible
    'gender': 4,      // Visible on tablet+ (768px+)
    'endDate': 5,     // Visible on desktop+ (1024px+)
    'type': 6         // Visible on desktop+ (1024px+)
  }), []);

  const getColumnVisibility = useCallback((column: SortColumn) => {
    const priority = columnPriority[column as keyof typeof columnPriority];
    
    switch (screenSize) {
      case 'mobile':
        return priority <= 3; // Only essential columns (name, country, startDate)
      case 'tablet':
        return priority <= 4; // Essential + gender
      case 'desktop':
        return true; // All columns
      default:
        return true;
    }
  }, [screenSize, columnPriority]);

  // Determine effective view based on user preference and screen size
  const getEffectiveView = useCallback((): 'table' | 'card' => {
    if (viewPreference === 'auto') {
      return screenSize === 'mobile' ? 'card' : 'table';
    }
    return viewPreference;
  }, [viewPreference, screenSize]);

  const effectiveView = getEffectiveView();

  // Handle view preference change
  const handleViewChange = useCallback((view: 'table' | 'card' | 'auto') => {
    setViewPreference(view);
  }, []);

  // Render table header button with responsive visibility
  const renderHeaderButton = useCallback((
    column: SortColumn,
    label: string
  ) => {
    const isVisible = getColumnVisibility(column);
    
    return (
      <button
        onClick={() => handleSort(column)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            handleSort(column);
          }
        }}
        className={`
          items-center justify-between w-full text-left px-2 py-3
          font-medium text-muted-foreground hover:bg-muted/50 hover:text-foreground rounded-md
          focus:outline-none focus:ring-2 focus:ring-primary focus:bg-muted/50
          transition-colors duration-150 min-h-[44px]
          ${isVisible ? 'flex' : 'hidden'}
        `}
        aria-label={`Sort by ${label}`}
        aria-describedby={`sort-${column}-desc`}
      >
        <span className="truncate">{label}</span>
        {renderSortIcon(column)}
      </button>
    );
  }, [handleSort, renderSortIcon, getColumnVisibility]);

  if (loading) {
    return (
      <div className={className}>
        {progressiveLoading ? (
          <div className="bg-background rounded-lg shadow-sm border border-border p-6">
            <TournamentProgressiveSkeleton
              steps={progressiveLoading.steps}
              className="max-w-md mx-auto"
            />
          </div>
        ) : screenSize === 'mobile' ? (
          <TournamentCardSkeleton
            rows={8}
            className="bg-background rounded-lg shadow-sm border border-border p-4"
          />
        ) : (
          <TournamentTableSkeleton
            columns={6}
            rows={8}
            screenSize={screenSize}
            className="bg-background rounded-lg shadow-sm border border-border"
          />
        )}
      </div>
    );
  }

  if (error) {
    return (
      <div className={className}>
        <TournamentError
          error={error}
          onRetry={handleRetry}
          className="max-w-2xl mx-auto"
        />
      </div>
    );
  }

  if (!tournaments.length) {
    return (
      <div className={`text-center py-12 ${className}`}>
        <div className="text-muted-foreground">
          <svg
            className="mx-auto h-12 w-12 text-muted-foreground mb-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
            />
          </svg>
          <h3 className="text-lg font-medium text-foreground mb-2">No tournaments found</h3>
          <p className="text-muted-foreground mb-4">
            No tournament data is currently available for 2025.
          </p>
          <button
            onClick={handleRetry}
            className="inline-flex items-center px-4 py-2 text-sm font-medium text-primary bg-primary/10 border border-primary/20 rounded-md hover:bg-primary/20 focus:outline-none focus:ring-2 focus:ring-primary"
          >
            <svg
              className="w-4 h-4 mr-2"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
              />
            </svg>
            Refresh tournaments
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-background rounded-lg shadow-sm border border-border overflow-hidden transition-opacity duration-500 ${
      isContentReady ? 'opacity-100' : 'opacity-0'
    } ${className}`}>
      {/* View Toggle Controls - only show for tablet/desktop */}
      {(screenSize === 'tablet' || screenSize === 'desktop') && (
        <div className="px-4 py-3 bg-muted/20 border-b border-border">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium text-foreground">
              {sortedTournaments.length} Tournament{sortedTournaments.length !== 1 ? 's' : ''}
            </h3>
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground mr-2">View:</span>
              <Button
                variant={viewPreference === 'table' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => handleViewChange('table')}
                className="h-8 px-3 text-xs"
              >
                Table
              </Button>
              <Button
                variant={viewPreference === 'card' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => handleViewChange('card')}
                className="h-8 px-3 text-xs"
              >
                Cards
              </Button>
              <Button
                variant={viewPreference === 'auto' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => handleViewChange('auto')}
                className="h-8 px-3 text-xs"
              >
                Auto
              </Button>
            </div>
          </div>
        </div>
      )}
      {effectiveView === 'table' ? (
        /* Table Layout */
        <div 
          className="overflow-x-auto scrollbar-thin scrollbar-thumb-muted scrollbar-track-muted/50 hover:scrollbar-thumb-muted-foreground scroll-smooth touch-pan-x"
          onScroll={handleTableScroll}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          style={{ WebkitOverflowScrolling: 'touch' }}
        >
          <div className="relative">
            {/* Scroll indicator shadows */}
            <div className={`absolute inset-y-0 left-0 w-4 bg-gradient-to-r from-background to-transparent pointer-events-none z-10 transition-opacity duration-200 ${scrollIndicators.left ? 'opacity-100' : 'opacity-0'}`}></div>
            <div className={`absolute inset-y-0 right-0 w-4 bg-gradient-to-l from-background to-transparent pointer-events-none z-10 transition-opacity duration-200 ${scrollIndicators.right ? 'opacity-100' : 'opacity-0'}`}></div>
            
            <Table
              className="min-w-max"
              role="table"
              aria-label={`Beach volleyball tournaments for 2025. ${sortedTournaments.length} tournaments found.`}
            >
            <TableHeader className="bg-muted/50">
              <ShadcnTableRow role="row">
                {getColumnVisibility('name') && (
                  <TableHead
                    role="columnheader"
                    aria-sort={getSortAttribute('name')}
                    className="text-left"
                  >
                    {renderHeaderButton('name', 'Tournament Name')}
                  </TableHead>
                )}
                {getColumnVisibility('countryCode') && (
                  <TableHead
                    role="columnheader"
                    aria-sort={getSortAttribute('countryCode')}
                    className="text-left"
                  >
                    {renderHeaderButton('countryCode', 'Country')}
                  </TableHead>
                )}
                {getColumnVisibility('startDate') && (
                  <TableHead
                    role="columnheader"
                    aria-sort={getSortAttribute('startDate')}
                    className="text-left"
                  >
                    {renderHeaderButton('startDate', 'Start Date')}
                  </TableHead>
                )}
                {getColumnVisibility('gender') && (
                  <TableHead
                    role="columnheader"
                    aria-sort={getSortAttribute('gender')}
                    className="text-left"
                  >
                    {renderHeaderButton('gender', 'Gender')}
                  </TableHead>
                )}
                {getColumnVisibility('endDate') && (
                  <TableHead
                    role="columnheader"
                    aria-sort={getSortAttribute('endDate')}
                    className="text-left"
                  >
                    {renderHeaderButton('endDate', 'End Date')}
                  </TableHead>
                )}
                {getColumnVisibility('type') && (
                  <TableHead
                    role="columnheader"
                    aria-sort={getSortAttribute('type')}
                    className="text-left"
                  >
                    {renderHeaderButton('type', 'Type')}
                  </TableHead>
                )}
              </ShadcnTableRow>
            </TableHeader>
            <TableBody className="divide-y divide-border">
              {sortedTournaments.map((tournament, index) => (
                <TournamentRow
                  key={tournament.code}
                  tournament={tournament}
                  isDesktop={screenSize === 'desktop'}
                  screenSize={screenSize}
                  className={`transition-all duration-500 ${
                    isContentReady 
                      ? 'opacity-100 translate-y-0' 
                      : 'opacity-0 translate-y-2'
                  }`}
                  style={{ 
                    transitionDelay: isContentReady ? `${index * 50}ms` : '0ms'
                  }}
                />
              ))}
            </TableBody>
            </Table>
          </div>
        </div>
      ) : (
        /* Card Layout */
        <div role="table" aria-label={`Beach volleyball tournaments for 2025. ${sortedTournaments.length} tournaments found.`}>
          {/* Only show header for mobile (no view toggle controls) */}
          {screenSize === 'mobile' && (
            <div className="px-4 py-3 bg-muted/50 border-b border-border">
              <h3 className="text-sm font-medium text-foreground" id="tournaments-heading">
                {sortedTournaments.length} Tournament{sortedTournaments.length !== 1 ? 's' : ''}
              </h3>
              <div className="text-xs text-muted-foreground mt-1">
                Use arrow keys to navigate between tournaments
              </div>
            </div>
          )}
          <div className="p-4 space-y-4" role="rowgroup" aria-labelledby="tournaments-heading">
            {sortedTournaments.map((tournament, index) => (
              <TournamentRow
                key={tournament.code}
                tournament={tournament}
                isDesktop={false}
                screenSize="mobile" // Force card layout
                onKeyDown={(e) => handleCardKeyDown(e, index)}
                className={`transition-all duration-500 ${
                  isContentReady 
                    ? 'opacity-100 translate-y-0' 
                    : 'opacity-0 translate-y-2'
                }`}
                style={{ 
                  transitionDelay: isContentReady ? `${index * 50}ms` : '0ms'
                }}
              />
            ))}
          </div>
        </div>
      )}

      {/* Sort descriptions for screen readers */}
      <div className="sr-only">
        <div id="sort-name-desc">Click to sort tournaments by name</div>
        <div id="sort-countryCode-desc">Click to sort tournaments by country</div>
        <div id="sort-startDate-desc">Click to sort tournaments by start date</div>
        <div id="sort-endDate-desc">Click to sort tournaments by end date</div>
        <div id="sort-gender-desc">Click to sort tournaments by gender category</div>
        <div id="sort-type-desc">Click to sort tournaments by tournament type</div>
      </div>
    </div>
  );
};