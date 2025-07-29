'use client';

import { FC, useCallback, useEffect, useState, useMemo } from 'react';
import { 
  Tournament, 
  TournamentTableProps, 
  SortColumn, 
  SortConfig,
  FormattedTournament 
} from '@/lib/types';
import { TableLoadingSkeleton } from '@/components/ui/LoadingSpinner';
import { TournamentError } from '@/components/ui/ErrorMessage';
import { TournamentRow } from '@/components/tournament/TournamentRow';
import { getCountryName } from '@/lib/country-utils';

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
    setSortConfig(prevConfig => {
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
    
    try {
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

      const data: Tournament[] = await response.json();
      setTournaments(data);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      setError(errorMessage);
      console.error('Failed to fetch tournaments:', err);
    } finally {
      setLoading(false);
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
          className="w-4 h-4 text-gray-400"
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
        className="w-4 h-4 text-blue-600"
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
        className="w-4 h-4 text-blue-600"
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
    const priority = columnPriority[column];
    
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
          font-semibold text-gray-900 hover:bg-gray-100 rounded-md
          focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-gray-100
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
        <TableLoadingSkeleton
          columns={6}
          rows={8}
          className="bg-white rounded-lg shadow-sm border border-gray-200"
        />
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
        <div className="text-gray-500">
          <svg
            className="mx-auto h-12 w-12 text-gray-400 mb-4"
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
          <h3 className="text-lg font-medium text-gray-900 mb-2">No tournaments found</h3>
          <p className="text-gray-600 mb-4">
            No tournament data is currently available for 2025.
          </p>
          <button
            onClick={handleRetry}
            className="inline-flex items-center px-4 py-2 text-sm font-medium text-blue-600 bg-blue-50 border border-blue-200 rounded-md hover:bg-blue-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
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
    <div className={`bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden ${className}`}>
      {screenSize === 'desktop' || screenSize === 'tablet' ? (
        /* Table Layout for Desktop and Tablet */
        <div 
          className="overflow-x-auto scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100 hover:scrollbar-thumb-gray-400 scroll-smooth touch-pan-x"
          onScroll={handleTableScroll}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          style={{ WebkitOverflowScrolling: 'touch' }}
        >
          <div className="relative">
            {/* Scroll indicator shadows */}
            <div className={`absolute inset-y-0 left-0 w-4 bg-gradient-to-r from-white to-transparent pointer-events-none z-10 transition-opacity duration-200 ${scrollIndicators.left ? 'opacity-100' : 'opacity-0'}`}></div>
            <div className={`absolute inset-y-0 right-0 w-4 bg-gradient-to-l from-white to-transparent pointer-events-none z-10 transition-opacity duration-200 ${scrollIndicators.right ? 'opacity-100' : 'opacity-0'}`}></div>
            
            <table
              className="w-full min-w-max"
              role="table"
              aria-label={`Beach volleyball tournaments for 2025. ${sortedTournaments.length} tournaments found.`}
            >
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr role="row">
                {getColumnVisibility('name') && (
                  <th
                    role="columnheader"
                    aria-sort={getSortAttribute('name')}
                    className="text-left"
                  >
                    {renderHeaderButton('name', 'Tournament Name')}
                  </th>
                )}
                {getColumnVisibility('countryCode') && (
                  <th
                    role="columnheader"
                    aria-sort={getSortAttribute('countryCode')}
                    className="text-left"
                  >
                    {renderHeaderButton('countryCode', 'Country')}
                  </th>
                )}
                {getColumnVisibility('startDate') && (
                  <th
                    role="columnheader"
                    aria-sort={getSortAttribute('startDate')}
                    className="text-left"
                  >
                    {renderHeaderButton('startDate', 'Start Date')}
                  </th>
                )}
                {getColumnVisibility('gender') && (
                  <th
                    role="columnheader"
                    aria-sort={getSortAttribute('gender')}
                    className="text-left"
                  >
                    {renderHeaderButton('gender', 'Gender')}
                  </th>
                )}
                {getColumnVisibility('endDate') && (
                  <th
                    role="columnheader"
                    aria-sort={getSortAttribute('endDate')}
                    className="text-left"
                  >
                    {renderHeaderButton('endDate', 'End Date')}
                  </th>
                )}
                {getColumnVisibility('type') && (
                  <th
                    role="columnheader"
                    aria-sort={getSortAttribute('type')}
                    className="text-left"
                  >
                    {renderHeaderButton('type', 'Type')}
                  </th>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {sortedTournaments.map((tournament) => (
                <TournamentRow
                  key={tournament.code}
                  tournament={tournament}
                  isDesktop={screenSize === 'desktop'}
                  screenSize={screenSize}
                />
              ))}
            </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* Mobile Card Layout */
        <div role="table" aria-label={`Beach volleyball tournaments for 2025. ${sortedTournaments.length} tournaments found.`}>
          <div className="px-4 py-3 bg-gray-50 border-b border-gray-200">
            <h3 className="text-sm font-medium text-gray-900" id="tournaments-heading">
              {sortedTournaments.length} Tournament{sortedTournaments.length !== 1 ? 's' : ''}
            </h3>
            <div className="text-xs text-gray-500 mt-1">
              Use arrow keys to navigate between tournaments
            </div>
          </div>
          <div className="divide-y divide-gray-200" role="rowgroup" aria-labelledby="tournaments-heading">
            {sortedTournaments.map((tournament, index) => (
              <TournamentRow
                key={tournament.code}
                tournament={tournament}
                isDesktop={false}
                screenSize={screenSize}
                onKeyDown={(e) => handleCardKeyDown(e, index)}
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