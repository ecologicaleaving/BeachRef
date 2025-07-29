'use client';

import { FC, memo } from 'react';
import { Tournament } from '@/lib/types';
import { CountryFlag } from '@/components/ui/CountryFlag';
import { getCountryName } from '@/lib/country-utils';

export interface TournamentRowProps {
  /** Tournament data to display */
  tournament: Tournament;
  /** Whether this is a desktop view (affects layout) */
  isDesktop?: boolean;
  /** Screen size for responsive column visibility */
  screenSize?: 'mobile' | 'tablet' | 'desktop';
  /** Additional CSS classes */
  className?: string;
  /** Keyboard event handler for mobile cards */
  // eslint-disable-next-line no-unused-vars
  onKeyDown?: (event: React.KeyboardEvent) => void;
}

/**
 * TournamentRow Component
 * 
 * Renders a single tournament row with integrated country flag display
 * Supports both desktop table row and mobile card layouts
 */
const TournamentRowComponent: FC<TournamentRowProps> = ({
  tournament,
  isDesktop = false,
  screenSize = 'mobile',
  className = '',
  onKeyDown
}) => {
  // Format date for display
  const formatDate = (dateString: string): string => {
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
  };

  const formattedStartDate = formatDate(tournament.startDate);
  const formattedEndDate = formatDate(tournament.endDate);
  const countryName = getCountryName(tournament.countryCode);

  // Column visibility based on screen size (matching parent component logic)
  const getColumnVisibility = (column: string) => {
    const columnPriority = {
      'name': 1,        // Always visible
      'countryCode': 2, // Always visible
      'startDate': 3,   // Always visible
      'gender': 4,      // Visible on tablet+ (768px+)
      'endDate': 5,     // Visible on desktop+ (1024px+)
      'type': 6         // Visible on desktop+ (1024px+)
    };

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
  };

  // Gender badge styling
  const getGenderBadgeClasses = (gender: string) => {
    const baseClasses = 'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium';
    switch (gender) {
      case 'Men':
        return `${baseClasses} bg-blue-100 text-blue-800`;
      case 'Women':
        return `${baseClasses} bg-pink-100 text-pink-800`;
      case 'Mixed':
        return `${baseClasses} bg-purple-100 text-purple-800`;
      default:
        return `${baseClasses} bg-gray-100 text-gray-800`;
    }
  };

  if (isDesktop || screenSize === 'tablet') {
    // Desktop/Tablet table row layout with responsive columns
    return (
      <tr
        className={`hover:bg-gray-50 transition-colors duration-150 ${className}`}
        role="row"
      >
        {/* Tournament Name - Always visible */}
        {getColumnVisibility('name') && (
          <td className="px-3 py-4 text-sm">
            <div className="font-medium text-gray-900 max-w-xs truncate" title={tournament.name}>
              {tournament.name}
            </div>
            <div className="text-xs text-gray-500 mt-1">{tournament.code}</div>
          </td>
        )}

        {/* Country with Flag - Always visible */}
        {getColumnVisibility('countryCode') && (
          <td className="px-3 py-4 text-sm text-gray-900">
            <div className="flex items-center gap-2">
              <CountryFlag 
                countryCode={tournament.countryCode}
                size="sm"
                className="flex-shrink-0"
                showFallback={true}
              />
              <span className="font-medium truncate">{countryName}</span>
              <span className="ml-2 text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded flex-shrink-0">
                {tournament.countryCode}
              </span>
            </div>
          </td>
        )}

        {/* Start Date - Always visible */}
        {getColumnVisibility('startDate') && (
          <td className="px-3 py-4 text-sm text-gray-900 whitespace-nowrap">
            {formattedStartDate}
          </td>
        )}

        {/* Gender - Visible on tablet+ */}
        {getColumnVisibility('gender') && (
          <td className="px-3 py-4 text-sm">
            <span className={getGenderBadgeClasses(tournament.gender)}>
              {tournament.gender}
            </span>
          </td>
        )}

        {/* End Date - Visible on desktop+ */}
        {getColumnVisibility('endDate') && (
          <td className="px-3 py-4 text-sm text-gray-900 whitespace-nowrap">
            {formattedEndDate}
          </td>
        )}

        {/* Type - Visible on desktop+ */}
        {getColumnVisibility('type') && (
          <td className="px-3 py-4 text-sm text-gray-900 max-w-xs truncate" title={tournament.type}>
            {tournament.type}
          </td>
        )}
      </tr>
    );
  }

  // Mobile card layout with touch-friendly design and accessibility
  return (
    <div 
      className={`p-5 hover:bg-gray-50 transition-colors duration-150 active:bg-gray-100 focus:ring-2 focus:ring-blue-500 focus:ring-inset focus:outline-none ${className}`}
      role="row"
      aria-label={`Tournament: ${tournament.name}, ${countryName}, ${formattedStartDate} to ${formattedEndDate}, ${tournament.gender}, ${tournament.type}`}
      tabIndex={0}
      onKeyDown={onKeyDown}
    >
      {/* Header with name and gender badge */}
      <div className="flex items-start justify-between gap-3 min-h-[44px]">
        <div className="flex-1 min-w-0">
          <h4 className="text-base font-medium text-gray-900 leading-snug" title={tournament.name}>
            {tournament.name}
          </h4>
          <p className="text-sm text-gray-500 mt-1">{tournament.code}</p>
        </div>
        <span className={`${getGenderBadgeClasses(tournament.gender)} flex-shrink-0`}>
          {tournament.gender}
        </span>
      </div>
      
      {/* Country with flag */}
      <div className="mt-4 flex items-center gap-3 min-h-[44px]">
        <CountryFlag 
          countryCode={tournament.countryCode}
          size="md"
          className="flex-shrink-0"
          showFallback={true}
        />
        <div className="flex-1 min-w-0">
          <span className="font-medium text-gray-900 text-base">{countryName}</span>
          <span className="ml-3 text-sm text-gray-500 bg-gray-100 px-2 py-1 rounded">
            {tournament.countryCode}
          </span>
        </div>
      </div>

      {/* Dates */}
      <div className="mt-4 flex items-center justify-between text-sm text-gray-600 min-h-[44px]">
        <div>
          <span className="text-gray-500">Start:</span>
          <span className="ml-2 font-medium">{formattedStartDate}</span>
        </div>
        <div>
          <span className="text-gray-500">End:</span>
          <span className="ml-2 font-medium">{formattedEndDate}</span>
        </div>
      </div>
      
      {/* Tournament type */}
      <div className="mt-3 py-2 text-sm text-gray-600 border-t border-gray-100" title={tournament.type}>
        <span className="text-gray-500">Type:</span>
        <span className="ml-2 font-medium">{tournament.type}</span>
      </div>
    </div>
  );
};

// Memoize component to prevent unnecessary re-renders when tournament data hasn't changed
export const TournamentRow = memo(TournamentRowComponent);

