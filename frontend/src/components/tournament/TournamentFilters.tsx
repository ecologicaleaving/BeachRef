import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { DateRangeFilter } from './DateRangeFilter';
import { LocationFilter } from './LocationFilter';
import { TypeFilter } from './TypeFilter';
import { RefereeFilter } from './RefereeFilter';
import { useFilters } from '@/hooks/useFilters';
import { Search, Filter, X, ChevronDown, ChevronUp } from 'lucide-react';
import { cn } from '@/lib/utils';
import { buildFilterSummary } from '@/utils/filter.utils';

interface TournamentFiltersProps {
  resultCount?: number;
  className?: string;
}

export function TournamentFilters({ resultCount, className }: TournamentFiltersProps) {
  const [showAdvanced, setShowAdvanced] = useState(false);
  const {
    filters,
    updateSearch,
    updateDateRange,
    updateLocations,
    updateTypes,
    updateSurface,
    updateGender,
    updateStatuses,
    updateReferees,
    clearFilters,
    hasActiveFilters,
    activeFilterCount
  } = useFilters();

  const filterSummary = buildFilterSummary(filters);

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    updateSearch(e.target.value);
  };

  return (
    <Card className={cn('w-full', className)}>
      <CardContent className="p-4">
        <div className="space-y-4">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4" />
              <span className="font-medium">Filters</span>
              {hasActiveFilters && (
                <Badge variant="secondary" className="text-xs">
                  {activeFilterCount}
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-2">
              {resultCount !== undefined && (
                <span className="text-sm text-muted-foreground">
                  {resultCount} tournament{resultCount !== 1 ? 's' : ''}
                </span>
              )}
              {hasActiveFilters && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={clearFilters}
                  className="text-xs"
                >
                  <X className="h-3 w-3 mr-1" />
                  Clear All
                </Button>
              )}
            </div>
          </div>

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search tournaments..."
              value={filters.search || ''}
              onChange={handleSearchChange}
              className="pl-10"
            />
          </div>

          {/* Quick filters row */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <DateRangeFilter
              dateRange={filters.dateRange}
              onDateRangeChange={updateDateRange}
            />
            <LocationFilter
              selectedLocations={filters.locations || []}
              onLocationsChange={updateLocations}
            />
            <RefereeFilter
              selectedReferees={filters.referees || []}
              onRefereesChange={updateReferees}
            />
            <TypeFilter
              selectedTypes={filters.types || []}
              selectedSurfaces={filters.surface ? [filters.surface] : []}
              selectedGenders={filters.gender ? [filters.gender] : []}
              selectedStatuses={filters.statuses || []}
              onTypesChange={updateTypes}
              onSurfacesChange={(surfaces) => updateSurface(surfaces[0])}
              onGendersChange={(genders) => updateGender(genders[0])}
              onStatusesChange={updateStatuses}
            />
          </div>

          {/* Advanced filters toggle */}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="w-full justify-center"
          >
            {showAdvanced ? (
              <>
                <ChevronUp className="h-4 w-4 mr-2" />
                Hide Advanced Filters
              </>
            ) : (
              <>
                <ChevronDown className="h-4 w-4 mr-2" />
                Advanced Filters
              </>
            )}
          </Button>

          {/* Advanced filters */}
          {showAdvanced && (
            <div className="space-y-4 pt-4 border-t">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {/* Additional filter options can be added here */}
                <div className="text-sm text-muted-foreground">
                  Additional filters will be available in future updates.
                </div>
              </div>
            </div>
          )}

          {/* Active filters summary */}
          {hasActiveFilters && filterSummary.length > 0 && (
            <div className="space-y-2">
              <div className="text-sm font-medium">Active Filters:</div>
              <div className="flex flex-wrap gap-1">
                {filterSummary.map((summary, index) => (
                  <Badge key={index} variant="outline" className="text-xs">
                    {summary}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Filter tips */}
          {!hasActiveFilters && (
            <div className="text-sm text-muted-foreground bg-muted/50 p-3 rounded-md">
              <strong>Filter Tips:</strong>
              <ul className="list-disc list-inside mt-1 space-y-1">
                <li>Use the search box to find tournaments by name</li>
                <li>Select date ranges to find upcoming or past tournaments</li>
                <li>Filter by multiple locations to compare tournaments</li>
                <li>Search for specific referees to see their tournament assignments</li>
                <li>Combine filters for more specific results</li>
              </ul>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}