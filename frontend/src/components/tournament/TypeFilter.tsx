import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Trophy, X, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Tournament } from '@/types/tournament.types';
import { TOURNAMENT_TYPES, TOURNAMENT_SURFACES, TOURNAMENT_GENDERS, TOURNAMENT_STATUSES } from '@/utils/filter.utils';

interface TypeFilterProps {
  selectedTypes: Tournament['level'][];
  selectedSurfaces: Tournament['surface'][];
  selectedGenders: Tournament['gender'][];
  selectedStatuses: Tournament['status'][];
  onTypesChange: (types: Tournament['level'][]) => void;
  onSurfacesChange: (surfaces: Tournament['surface'][]) => void;
  onGendersChange: (genders: Tournament['gender'][]) => void;
  onStatusesChange: (statuses: Tournament['status'][]) => void;
  className?: string;
}

export function TypeFilter({ 
  selectedTypes, 
  selectedSurfaces, 
  selectedGenders, 
  selectedStatuses,
  onTypesChange, 
  onSurfacesChange, 
  onGendersChange, 
  onStatusesChange,
  className 
}: TypeFilterProps) {
  const totalSelected = selectedTypes.length + selectedSurfaces.length + selectedGenders.length + selectedStatuses.length;

  const handleTypeToggle = (type: Tournament['level']) => {
    const updatedTypes = selectedTypes.includes(type)
      ? selectedTypes.filter(t => t !== type)
      : [...selectedTypes, type];
    onTypesChange(updatedTypes);
  };

  const handleSurfaceToggle = (surface: Tournament['surface']) => {
    const updatedSurfaces = selectedSurfaces.includes(surface)
      ? selectedSurfaces.filter(s => s !== surface)
      : [...selectedSurfaces, surface];
    onSurfacesChange(updatedSurfaces);
  };

  const handleGenderToggle = (gender: Tournament['gender']) => {
    const updatedGenders = selectedGenders.includes(gender)
      ? selectedGenders.filter(g => g !== gender)
      : [...selectedGenders, gender];
    onGendersChange(updatedGenders);
  };

  const handleStatusToggle = (status: Tournament['status']) => {
    const updatedStatuses = selectedStatuses.includes(status)
      ? selectedStatuses.filter(s => s !== status)
      : [...selectedStatuses, status];
    onStatusesChange(updatedStatuses);
  };

  const clearAllFilters = () => {
    onTypesChange([]);
    onSurfacesChange([]);
    onGendersChange([]);
    onStatusesChange([]);
  };

  const removeItem = (type: 'type' | 'surface' | 'gender' | 'status', value: string) => {
    switch (type) {
      case 'type':
        onTypesChange(selectedTypes.filter(t => t !== value));
        break;
      case 'surface':
        onSurfacesChange(selectedSurfaces.filter(s => s !== value));
        break;
      case 'gender':
        onGendersChange(selectedGenders.filter(g => g !== value));
        break;
      case 'status':
        onStatusesChange(selectedStatuses.filter(s => s !== value));
        break;
    }
  };

  return (
    <div className={cn('space-y-2', className)}>
      <label className="text-sm font-medium">Tournament Types</label>
      
      <Popover>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            className={cn(
              'w-full justify-between text-left font-normal',
              totalSelected === 0 && 'text-muted-foreground'
            )}
          >
            <div className="flex items-center">
              <Trophy className="mr-2 h-4 w-4" />
              {totalSelected === 0 ? (
                'Select tournament types'
              ) : (
                `${totalSelected} filter${totalSelected > 1 ? 's' : ''} selected`
              )}
            </div>
            <ChevronDown className="h-4 w-4 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-80 p-0" align="start">
          <div className="p-3 space-y-4">
            {/* Tournament Levels */}
            <div>
              <h4 className="text-sm font-medium mb-2">Tournament Level</h4>
              <div className="space-y-2">
                {TOURNAMENT_TYPES.map((type) => (
                  <div
                    key={type.value}
                    className="flex items-center space-x-2 p-1 hover:bg-muted rounded-sm cursor-pointer"
                    onClick={() => handleTypeToggle(type.value)}
                  >
                    <Checkbox
                      checked={selectedTypes.includes(type.value)}
                      onChange={() => handleTypeToggle(type.value)}
                    />
                    <span className="text-sm">{type.label}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Surface Types */}
            <div>
              <h4 className="text-sm font-medium mb-2">Surface</h4>
              <div className="space-y-2">
                {TOURNAMENT_SURFACES.map((surface) => (
                  <div
                    key={surface.value}
                    className="flex items-center space-x-2 p-1 hover:bg-muted rounded-sm cursor-pointer"
                    onClick={() => handleSurfaceToggle(surface.value)}
                  >
                    <Checkbox
                      checked={selectedSurfaces.includes(surface.value)}
                      onChange={() => handleSurfaceToggle(surface.value)}
                    />
                    <span className="text-sm">{surface.label}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Gender Categories */}
            <div>
              <h4 className="text-sm font-medium mb-2">Gender</h4>
              <div className="space-y-2">
                {TOURNAMENT_GENDERS.map((gender) => (
                  <div
                    key={gender.value}
                    className="flex items-center space-x-2 p-1 hover:bg-muted rounded-sm cursor-pointer"
                    onClick={() => handleGenderToggle(gender.value)}
                  >
                    <Checkbox
                      checked={selectedGenders.includes(gender.value)}
                      onChange={() => handleGenderToggle(gender.value)}
                    />
                    <span className="text-sm">{gender.label}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Status */}
            <div>
              <h4 className="text-sm font-medium mb-2">Status</h4>
              <div className="space-y-2">
                {TOURNAMENT_STATUSES.map((status) => (
                  <div
                    key={status.value}
                    className="flex items-center space-x-2 p-1 hover:bg-muted rounded-sm cursor-pointer"
                    onClick={() => handleStatusToggle(status.value)}
                  >
                    <Checkbox
                      checked={selectedStatuses.includes(status.value)}
                      onChange={() => handleStatusToggle(status.value)}
                    />
                    <span className="text-sm">{status.label}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Actions */}
            <div className="flex justify-between border-t pt-3">
              <Button
                variant="outline"
                size="sm"
                onClick={clearAllFilters}
                disabled={totalSelected === 0}
              >
                Clear All
              </Button>
              <div className="text-sm text-muted-foreground">
                {totalSelected} selected
              </div>
            </div>
          </div>
        </PopoverContent>
      </Popover>

      {/* Selected filters display */}
      {totalSelected > 0 && (
        <div className="flex flex-wrap gap-1">
          {selectedTypes.map((type) => (
            <Badge key={type} variant="secondary" className="text-xs">
              {type}
              <Button
                variant="ghost"
                size="sm"
                className="h-3 w-3 p-0 ml-1"
                onClick={() => removeItem('type', type)}
              >
                <X className="h-2 w-2" />
              </Button>
            </Badge>
          ))}
          {selectedSurfaces.map((surface) => (
            <Badge key={surface} variant="secondary" className="text-xs">
              {surface}
              <Button
                variant="ghost"
                size="sm"
                className="h-3 w-3 p-0 ml-1"
                onClick={() => removeItem('surface', surface)}
              >
                <X className="h-2 w-2" />
              </Button>
            </Badge>
          ))}
          {selectedGenders.map((gender) => (
            <Badge key={gender} variant="secondary" className="text-xs">
              {gender}
              <Button
                variant="ghost"
                size="sm"
                className="h-3 w-3 p-0 ml-1"
                onClick={() => removeItem('gender', gender)}
              >
                <X className="h-2 w-2" />
              </Button>
            </Badge>
          ))}
          {selectedStatuses.map((status) => (
            <Badge key={status} variant="secondary" className="text-xs">
              {status}
              <Button
                variant="ghost"
                size="sm"
                className="h-3 w-3 p-0 ml-1"
                onClick={() => removeItem('status', status)}
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