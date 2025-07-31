'use client';

import { FC, memo } from 'react';
import { Tournament } from '@/lib/types';
import { CountryFlag } from '@/components/ui/CountryFlag';
import { getCountryName } from '@/lib/country-utils';
import { TableRow, TableCell } from '@/components/ui/table';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useResponsiveDesign } from '@/hooks/useResponsiveDesign';

export interface TournamentRowProps {
  /** Tournament data to display */
  tournament: Tournament;
  /** Whether this is a desktop view (affects layout) */
  isDesktop?: boolean;
  /** Screen size for responsive column visibility */
  screenSize?: 'mobile' | 'tablet' | 'desktop';
  /** Additional CSS classes */
  className?: string;
  /** Inline styles for animations */
  style?: React.CSSProperties;
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
  style,
  onKeyDown
}) => {
  // Enhanced responsive design with tournament glove considerations
  const { 
    touchCapable, 
    getTouchTargetSize, 
    getOptimizedImageSize,
    isHighContrast 
  } = useResponsiveDesign();
  
  const touchTargetSize = getTouchTargetSize();

  // Navigation handler for keyboard and click events
  const handleNavigation = (event?: React.KeyboardEvent) => {
    if (event && event.key !== 'Enter' && event.key !== ' ') {
      return;
    }
    
    if (event) {
      event.preventDefault();
    }
    
    // Use standard navigation for App Router compatibility
    window.location.href = `/tournament/${tournament.code}`;
  };
  
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

  // Gender badge styling using shadcn Badge variants
  const getGenderBadgeVariant = (gender: string): 'default' | 'secondary' | 'outline' => {
    switch (gender) {
      case 'Men':
        return 'default'; // FIVB blue
      case 'Women':
        return 'secondary'; // Muted
      case 'Mixed':
        return 'outline'; // Outlined
      default:
        return 'secondary';
    }
  };

  if (isDesktop || screenSize === 'tablet') {
    // Desktop/Tablet table row layout with responsive columns
    return (
      <TableRow
        className={`hover:bg-muted/50 transition-colors duration-150 cursor-pointer focus:bg-muted focus:outline-none focus:ring-2 focus:ring-primary focus:ring-inset ${className}`}
        style={style}
        role="row"
        tabIndex={0}
        onClick={() => handleNavigation()}
        onKeyDown={handleNavigation}
        aria-label={`Tournament: ${tournament.name}, ${getCountryName(tournament.countryCode)}, ${formatDate(tournament.startDate)}`}
      >
        {/* Tournament Name - Always visible */}
        {getColumnVisibility('name') && (
          <TableCell className="text-sm">
            <div className="font-medium text-foreground max-w-xs truncate" title={tournament.name}>
              {tournament.name}
            </div>
            <div className="text-xs text-muted-foreground mt-1">{tournament.code}</div>
          </TableCell>
        )}

        {/* Country with Flag - Always visible */}
        {getColumnVisibility('countryCode') && (
          <TableCell className="text-sm text-foreground">
            <div className="flex items-center gap-2">
              <CountryFlag 
                countryCode={tournament.countryCode}
                size="sm"
                className="flex-shrink-0"
                showFallback={true}
              />
              <span className="font-medium truncate">{countryName}</span>
              <span className="ml-2 text-xs text-muted-foreground bg-muted px-2 py-1 rounded flex-shrink-0">
                {tournament.countryCode}
              </span>
            </div>
          </TableCell>
        )}

        {/* Start Date - Always visible */}
        {getColumnVisibility('startDate') && (
          <TableCell className="text-sm text-foreground whitespace-nowrap">
            {formattedStartDate}
          </TableCell>
        )}

        {/* Gender - Visible on tablet+ */}
        {getColumnVisibility('gender') && (
          <TableCell className="text-sm">
            <Badge variant={getGenderBadgeVariant(tournament.gender)}>
              {tournament.gender}
            </Badge>
          </TableCell>
        )}

        {/* End Date - Visible on desktop+ */}
        {getColumnVisibility('endDate') && (
          <TableCell className="text-sm text-foreground whitespace-nowrap">
            {formattedEndDate}
          </TableCell>
        )}

        {/* Type - Visible on desktop+ */}
        {getColumnVisibility('type') && (
          <TableCell className="text-sm text-foreground max-w-xs truncate" title={tournament.type}>
            {tournament.type}
          </TableCell>
        )}
      </TableRow>
    );
  }

  // Mobile card layout with enhanced touch targets for tournament glove usage
  return (
    <Card 
      className={`hover:bg-muted/50 transition-colors duration-150 active:bg-muted focus:ring-2 focus:ring-primary focus:ring-inset focus:outline-none cursor-pointer touch-target-enhanced ${className} ${
        isHighContrast ? 'border-2' : ''
      }`}
      style={{ 
        ...style,
        minHeight: `${touchTargetSize}px`,
        padding: touchCapable ? '20px' : '16px'
      }}
      role="row"
      aria-label={`Tournament: ${tournament.name}, ${countryName}, ${formattedStartDate} to ${formattedEndDate}, ${tournament.gender}, ${tournament.type}`}
      tabIndex={0}
      onClick={() => handleNavigation()}
      onKeyDown={onKeyDown || handleNavigation}
    >
      <CardHeader className="pb-3" style={{ paddingBottom: touchCapable ? '16px' : '12px' }}>
        {/* Header with name and gender badge - enhanced touch targets */}
        <div 
          className="flex items-start justify-between gap-3"
          style={{ minHeight: `${touchTargetSize}px` }}
        >
          <div className="flex-1 min-w-0">
            <CardTitle 
              className={`text-base font-medium leading-snug ${
                isHighContrast ? 'font-semibold' : ''
              }`} 
              title={tournament.name}
            >
              {tournament.name}
            </CardTitle>
            <CardDescription className="mt-1">
              {tournament.code}
            </CardDescription>
          </div>
          <Badge 
            variant={getGenderBadgeVariant(tournament.gender)} 
            className={`flex-shrink-0 touch-target ${
              isHighContrast ? 'border font-medium' : ''
            }`}
            style={{ 
              minHeight: `${Math.max(touchTargetSize - 12, 32)}px`,
              minWidth: `${Math.max(touchTargetSize - 12, 60)}px`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            {tournament.gender}
          </Badge>
        </div>
      </CardHeader>
      
      <CardContent 
        className="pt-0 space-y-4" 
        style={{ paddingTop: 0, gap: touchCapable ? '20px' : '16px' }}
      >
        {/* Country with flag - enhanced touch area */}
        <div 
          className="flex items-center gap-3 touch-target"
          style={{ minHeight: `${touchTargetSize}px` }}
        >
          <CountryFlag 
            countryCode={tournament.countryCode}
            size={touchCapable ? "lg" : "md"}
            className="flex-shrink-0"
            showFallback={true}
          />
          <div className="flex-1 min-w-0">
            <span className={`font-medium text-foreground text-base ${
              isHighContrast ? 'font-semibold' : ''
            }`}>
              {countryName}
            </span>
            <span className={`ml-3 text-sm text-muted-foreground bg-muted px-2 py-1 rounded ${
              isHighContrast ? 'border font-medium' : ''
            }`}>
              {tournament.countryCode}
            </span>
          </div>
        </div>

        {/* Dates - enhanced for readability and touch */}
        <div 
          className="flex items-center justify-between text-sm text-muted-foreground touch-target"
          style={{ minHeight: `${touchTargetSize}px` }}
        >
          <div className="flex-1">
            <span className="text-muted-foreground">Start:</span>
            <span className={`ml-2 font-medium text-foreground ${
              isHighContrast ? 'font-semibold' : ''
            }`}>
              {formattedStartDate}
            </span>
          </div>
          <div className="flex-1 text-right">
            <span className="text-muted-foreground">End:</span>
            <span className={`ml-2 font-medium text-foreground ${
              isHighContrast ? 'font-semibold' : ''
            }`}>
              {formattedEndDate}
            </span>
          </div>
        </div>
      </CardContent>
      
      <CardFooter 
        className="pt-0"
        style={{ paddingBottom: touchCapable ? '24px' : '20px' }}
      >
        {/* Tournament type - enhanced for touch and high contrast */}
        <div 
          className={`w-full pt-3 text-sm text-muted-foreground touch-target ${
            isHighContrast ? 'border-t-2' : 'border-t'
          } border-border`}
          style={{ minHeight: `${touchTargetSize}px` }}
          title={tournament.type}
        >
          <div className="flex items-center">
            <span className="text-muted-foreground">Type:</span>
            <span className={`ml-2 font-medium text-foreground ${
              isHighContrast ? 'font-semibold' : ''
            }`}>
              {tournament.type}
            </span>
          </div>
        </div>
      </CardFooter>
    </Card>
  );
};

// Memoize component to prevent unnecessary re-renders when tournament data hasn't changed
export const TournamentRow = memo(TournamentRowComponent);

