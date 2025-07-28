import { useState, useEffect, useCallback, useMemo } from 'react';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Search, User, X, ChevronDown, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { RefereeSearchResponse } from '@/types/tournament.types';

interface RefereeFilterProps {
  selectedReferees: string[];
  onRefereesChange: (referees: string[]) => void;
  className?: string;
}

interface RefereeOption {
  name: string;
  country?: string;
  matchCount: number;
}

export function RefereeFilter({ selectedReferees, onRefereesChange, className }: RefereeFilterProps) {
  const [open, setOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [refereeOptions, setRefereeOptions] = useState<RefereeOption[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  // Search function
  const searchReferees = useCallback(async (query: string) => {
    if (!query.trim()) {
      setRefereeOptions([]);
      setIsLoading(false);
      setHasSearched(false);
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch(`/api/referees/search?q=${encodeURIComponent(query)}`);
      if (response.ok) {
        const data: RefereeSearchResponse = await response.json();
        setRefereeOptions(data.referees);
      } else {
        console.error('Failed to search referees:', response.statusText);
        setRefereeOptions([]);
      }
    } catch (error) {
      console.error('Error searching referees:', error);
      setRefereeOptions([]);
    } finally {
      setIsLoading(false);
      setHasSearched(true);
    }
  }, []);

  // Debounced search function
  const debouncedSearch = useMemo(() => {
    let timeoutId: NodeJS.Timeout;
    return (query: string) => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => searchReferees(query), 300);
    };
  }, [searchReferees]);

  // Search effect
  useEffect(() => {
    debouncedSearch(searchTerm);
  }, [searchTerm, debouncedSearch]);

  const handleRefereeToggle = (refereeName: string) => {
    const updatedReferees = selectedReferees.includes(refereeName)
      ? selectedReferees.filter(ref => ref !== refereeName)
      : [...selectedReferees, refereeName];
    
    onRefereesChange(updatedReferees);
  };

  const handleRemoveReferee = (refereeName: string) => {
    onRefereesChange(selectedReferees.filter(ref => ref !== refereeName));
  };

  const clearAllReferees = () => {
    onRefereesChange([]);
  };

  const formatRefereeDisplay = (referee: RefereeOption) => {
    return referee.country 
      ? `${referee.name} (${referee.country})`
      : referee.name;
  };

  return (
    <div className={cn('space-y-2', className)}>
      <label className="text-sm font-medium">Referees</label>
      
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            className={cn(
              'w-full justify-between text-left font-normal',
              selectedReferees.length === 0 && 'text-muted-foreground'
            )}
          >
            <div className="flex items-center">
              <User className="mr-2 h-4 w-4" />
              {selectedReferees.length === 0 ? (
                'Select referees'
              ) : (
                `${selectedReferees.length} referee${selectedReferees.length > 1 ? 's' : ''} selected`
              )}
            </div>
            <ChevronDown className="h-4 w-4 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-80 p-0" align="start">
          <div className="p-3 space-y-3">
            {/* Search input */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search referees..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
              {isLoading && (
                <Loader2 className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
              )}
            </div>

            {/* Referee list */}
            <div className="max-h-48 overflow-y-auto space-y-1">
              {isLoading ? (
                <div className="p-2 text-sm text-muted-foreground text-center">
                  Searching referees...
                </div>
              ) : refereeOptions.length > 0 ? (
                refereeOptions.map((referee) => (
                  <div
                    key={referee.name}
                    className="flex items-center space-x-2 p-2 hover:bg-muted rounded-sm cursor-pointer"
                    onClick={() => handleRefereeToggle(referee.name)}
                  >
                    <Checkbox
                      checked={selectedReferees.includes(referee.name)}
                      onChange={() => handleRefereeToggle(referee.name)}
                    />
                    <div className="flex-1 min-w-0">
                      <span className="text-sm">{formatRefereeDisplay(referee)}</span>
                      <span className="text-xs text-muted-foreground ml-2">
                        ({referee.matchCount} match{referee.matchCount !== 1 ? 'es' : ''})
                      </span>
                    </div>
                  </div>
                ))
              ) : hasSearched && searchTerm ? (
                <div className="p-2 text-sm text-muted-foreground text-center">
                  No referees found for "{searchTerm}"
                </div>
              ) : (
                <div className="p-2 text-sm text-muted-foreground text-center">
                  Start typing to search for referees...
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="flex justify-between border-t pt-3">
              <Button
                variant="outline"
                size="sm"
                onClick={clearAllReferees}
                disabled={selectedReferees.length === 0}
              >
                Clear All
              </Button>
              <Button
                size="sm"
                onClick={() => setOpen(false)}
              >
                Done ({selectedReferees.length})
              </Button>
            </div>
          </div>
        </PopoverContent>
      </Popover>

      {/* Selected referees display */}
      {selectedReferees.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {selectedReferees.map((refereeName) => (
            <Badge key={refereeName} variant="secondary" className="text-xs">
              {refereeName}
              <Button
                variant="ghost"
                size="sm"
                className="h-3 w-3 p-0 ml-1"
                onClick={() => handleRemoveReferee(refereeName)}
              >
                <X className="h-2 w-2" />
              </Button>
            </Badge>
          ))}
        </div>
      )}
    </div>
  );
}