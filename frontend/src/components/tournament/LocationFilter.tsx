import { useState } from 'react';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Search, MapPin, X, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';

// Common tournament locations - in a real app, this would come from an API
const COMMON_LOCATIONS = [
  'Brazil', 'United States', 'Italy', 'Germany', 'Australia',
  'Japan', 'France', 'Spain', 'Netherlands', 'Poland',
  'China', 'Russia', 'Turkey', 'Canada', 'Argentina',
  'Rio de Janeiro', 'Los Angeles', 'Rome', 'Berlin', 'Sydney',
  'Tokyo', 'Paris', 'Barcelona', 'Amsterdam', 'Warsaw'
];

interface LocationFilterProps {
  selectedLocations: string[];
  onLocationsChange: (locations: string[]) => void;
  className?: string;
}

export function LocationFilter({ selectedLocations, onLocationsChange, className }: LocationFilterProps) {
  const [open, setOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  const filteredLocations = COMMON_LOCATIONS.filter(location =>
    location.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleLocationToggle = (location: string) => {
    const updatedLocations = selectedLocations.includes(location)
      ? selectedLocations.filter(loc => loc !== location)
      : [...selectedLocations, location];
    
    onLocationsChange(updatedLocations);
  };

  const handleAddCustomLocation = () => {
    if (searchTerm && !selectedLocations.includes(searchTerm)) {
      onLocationsChange([...selectedLocations, searchTerm]);
      setSearchTerm('');
    }
  };

  const handleRemoveLocation = (location: string) => {
    onLocationsChange(selectedLocations.filter(loc => loc !== location));
  };

  const clearAllLocations = () => {
    onLocationsChange([]);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddCustomLocation();
    }
  };

  return (
    <div className={cn('space-y-2', className)}>
      <label className="text-sm font-medium">Locations</label>
      
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            className={cn(
              'w-full justify-between text-left font-normal',
              selectedLocations.length === 0 && 'text-muted-foreground'
            )}
          >
            <div className="flex items-center">
              <MapPin className="mr-2 h-4 w-4" />
              {selectedLocations.length === 0 ? (
                'Select locations'
              ) : (
                `${selectedLocations.length} location${selectedLocations.length > 1 ? 's' : ''} selected`
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
                placeholder="Search or add location..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onKeyPress={handleKeyPress}
                className="pl-10"
              />
              {searchTerm && !COMMON_LOCATIONS.includes(searchTerm) && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="absolute right-1 top-1/2 transform -translate-y-1/2 h-6 px-2 text-xs"
                  onClick={handleAddCustomLocation}
                >
                  Add
                </Button>
              )}
            </div>

            {/* Location list */}
            <div className="max-h-48 overflow-y-auto space-y-1">
              {filteredLocations.map((location) => (
                <div
                  key={location}
                  className="flex items-center space-x-2 p-2 hover:bg-muted rounded-sm cursor-pointer"
                  onClick={() => handleLocationToggle(location)}
                >
                  <Checkbox
                    checked={selectedLocations.includes(location)}
                    onChange={() => handleLocationToggle(location)}
                  />
                  <span className="text-sm">{location}</span>
                </div>
              ))}
              {filteredLocations.length === 0 && searchTerm && (
                <div className="p-2 text-sm text-muted-foreground text-center">
                  No locations found. Press Enter to add "{searchTerm}"
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="flex justify-between border-t pt-3">
              <Button
                variant="outline"
                size="sm"
                onClick={clearAllLocations}
                disabled={selectedLocations.length === 0}
              >
                Clear All
              </Button>
              <Button
                size="sm"
                onClick={() => setOpen(false)}
              >
                Done ({selectedLocations.length})
              </Button>
            </div>
          </div>
        </PopoverContent>
      </Popover>

      {/* Selected locations display */}
      {selectedLocations.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {selectedLocations.map((location) => (
            <Badge key={location} variant="secondary" className="text-xs">
              {location}
              <Button
                variant="ghost"
                size="sm"
                className="h-3 w-3 p-0 ml-1"
                onClick={() => handleRemoveLocation(location)}
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