import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { TournamentCard } from './TournamentCard';
import { TournamentFilters } from './TournamentFilters';
import { useFilteredTournaments } from '@/hooks/useFilteredTournaments';
import { FilterErrorBoundary } from '@/components/common/FilterErrorBoundary';
import type { TournamentQueryParams, Tournament } from '@/types/tournament.types';
import { ArrowUpDown, Calendar, MapPin, Trophy, Grid3X3, Table2 } from 'lucide-react';
import { formatDateRange } from '@/utils/format';
import { getStatusVariant, transformTournamentForCard, PAGE_SIZE_OPTIONS } from '@/utils/tournament.utils';

interface TournamentListProps {
  params: TournamentQueryParams;
  onParamsChange: (params: TournamentQueryParams) => void;
}

export function TournamentList({ params, onParamsChange }: TournamentListProps) {
  const navigate = useNavigate();
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('table');
  const [sortField, setSortField] = useState<keyof Tournament | 'dates'>('dates');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

  const { data, isLoading, error, isError } = useFilteredTournaments(params);

  const handleSort = (field: keyof Tournament | 'dates') => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const handlePageChange = (page: number) => {
    onParamsChange({ ...params, page });
  };

  const handlePageSizeChange = (limit: number) => {
    onParamsChange({ ...params, limit, page: 1 });
  };

  const handleTournamentClick = (tournamentId: string) => {
    navigate(`/tournaments/${tournamentId}`);
  };

  // Transform tournaments for TournamentCard component
  const transformedTournaments = useMemo(() => {
    if (!data?.tournaments) return [];
    return data.tournaments.map(transformTournamentForCard);
  }, [data?.tournaments]);

  const SortButton = ({ field, children }: { field: keyof Tournament | 'dates'; children: React.ReactNode }) => (
    <Button
      variant="ghost"
      size="sm"
      onClick={() => handleSort(field)}
      className="h-auto p-1 font-medium"
    >
      {children}
      <ArrowUpDown className="ml-1 h-3 w-3" />
    </Button>
  );

  if (isError) {
    return (
      <Alert variant="destructive">
        <AlertDescription>
          {error instanceof Error ? error.message : 'Failed to load tournaments. Please try again.'}
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-4">
      {/* Filters */}
      <FilterErrorBoundary>
        <TournamentFilters resultCount={data?.pagination.total} />
      </FilterErrorBoundary>
      
      {/* View Mode Controls */}
      <div className="flex justify-between items-center">
        <div className="text-sm text-muted-foreground">
          {isLoading ? (
            <Skeleton className="h-4 w-32" />
          ) : (
            `${data?.pagination.total || 0} tournaments found`
          )}
        </div>
        
        <div className="flex gap-2">
          <Button
            variant={viewMode === 'grid' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setViewMode('grid')}
          >
            <Grid3X3 className="h-4 w-4 mr-1" />
            Grid
          </Button>
          <Button
            variant={viewMode === 'table' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setViewMode('table')}
          >
            <Table2 className="h-4 w-4 mr-1" />
            Table
          </Button>
        </div>
      </div>

      {/* Loading State */}
      {isLoading && (
        <div className="space-y-4">
          {viewMode === 'grid' ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {Array.from({ length: 6 }).map((_, i) => (
                <Card key={i} className="p-4">
                  <Skeleton className="h-6 w-3/4 mb-2" />
                  <Skeleton className="h-4 w-1/2 mb-4" />
                  <Skeleton className="h-4 w-2/3 mb-2" />
                  <Skeleton className="h-4 w-1/2" />
                </Card>
              ))}
            </div>
          ) : (
            <div className="space-y-2">
              {Array.from({ length: 10 }).map((_, i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Content */}
      {!isLoading && data && (
        <>
          {viewMode === 'grid' ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {transformedTournaments.map((tournament) => (
                <TournamentCard key={tournament.id} tournament={tournament} />
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>
                        <SortButton field="name">Tournament</SortButton>
                      </TableHead>
                      <TableHead>
                        <SortButton field="status">Status</SortButton>
                      </TableHead>
                      <TableHead>
                        <SortButton field="dates">
                          <Calendar className="h-4 w-4 mr-1" />
                          Dates
                        </SortButton>
                      </TableHead>
                      <TableHead>
                        <SortButton field="location">
                          <MapPin className="h-4 w-4 mr-1" />
                          Location
                        </SortButton>
                      </TableHead>
                      <TableHead>
                        <SortButton field="level">
                          <Trophy className="h-4 w-4 mr-1" />
                          Level
                        </SortButton>
                      </TableHead>
                      <TableHead>Matches</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.tournaments.map((tournament) => (
                      <TableRow 
                        key={tournament.id} 
                        className="cursor-pointer hover:bg-muted/50"
                        onClick={() => handleTournamentClick(tournament.id)}
                      >
                        <TableCell>
                          <div>
                            <div className="font-medium">{tournament.name}</div>
                            <div className="text-sm text-muted-foreground">
                              {tournament.surface} • {tournament.gender}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant={getStatusVariant(tournament.status)}>
                            {tournament.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {formatDateRange(
                            tournament.dates.start.toISOString(),
                            tournament.dates.end.toISOString()
                          )}
                        </TableCell>
                        <TableCell>
                          <div>
                            <div>{tournament.location.city}</div>
                            <div className="text-sm text-muted-foreground">
                              {tournament.location.country}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>{tournament.level}</TableCell>
                        <TableCell>{tournament.matchCount}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}

          {/* Pagination */}
          {data.pagination.totalPages > 1 && (
            <div className="flex justify-center items-center space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handlePageChange(data.pagination.page - 1)}
                disabled={data.pagination.page <= 1}
              >
                Previous
              </Button>
              
              <span className="text-sm text-muted-foreground">
                Page {data.pagination.page} of {data.pagination.totalPages}
              </span>
              
              <Button
                variant="outline"
                size="sm"
                onClick={() => handlePageChange(data.pagination.page + 1)}
                disabled={data.pagination.page >= data.pagination.totalPages}
              >
                Next
              </Button>
            </div>
          )}

          {/* Page Size Selector */}
          <div className="flex justify-center">
            <div className="flex items-center space-x-2 text-sm">
              <span>Show</span>
              <select
                value={params.limit || 10}
                onChange={(e: React.ChangeEvent<HTMLSelectElement>) => handlePageSizeChange(parseInt(e.target.value))}
                className="border rounded px-2 py-1"
              >
                {PAGE_SIZE_OPTIONS.map(size => (
                  <option key={size} value={size}>{size}</option>
                ))}
              </select>
              <span>per page</span>
            </div>
          </div>
        </>
      )}

      {/* Empty State */}
      {!isLoading && data && data.tournaments.length === 0 && (
        <Card className="p-8 text-center">
          <div className="text-muted-foreground">
            <Trophy className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <h3 className="text-lg font-medium mb-2">No tournaments found</h3>
            <p>Try adjusting your search criteria or filters.</p>
          </div>
        </Card>
      )}
    </div>
  );
}