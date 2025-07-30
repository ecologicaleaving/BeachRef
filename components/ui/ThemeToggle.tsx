'use client';

import { FC } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel
} from '@/components/ui/dropdown-menu';
import { useResponsiveDesign } from '@/hooks/useResponsiveDesign';
import { 
  Sun, 
  Moon, 
  Monitor, 
  Contrast, 
  Eye, 
  Palette,
  Settings
} from 'lucide-react';
import { useTheme } from 'next-themes';

interface ThemeToggleProps {
  className?: string;
  variant?: 'button' | 'badge' | 'minimal';
  showLabel?: boolean;
}

export const ThemeToggle: FC<ThemeToggleProps> = ({
  className = '',
  variant = 'button',
  showLabel = false
}) => {
  const { theme, setTheme } = useTheme();
  const { isHighContrast, toggleHighContrast, screenSize } = useResponsiveDesign();

  const getThemeIcon = () => {
    switch (theme) {
      case 'dark':
        return <Moon className="h-4 w-4" />;
      case 'light':
        return <Sun className="h-4 w-4" />;
      default:
        return <Monitor className="h-4 w-4" />;
    }
  };

  const getThemeLabel = () => {
    const baseTheme = theme === 'dark' ? 'Dark' : theme === 'light' ? 'Light' : 'System';
    return isHighContrast ? `${baseTheme} (High Contrast)` : baseTheme;
  };

  if (variant === 'badge') {
    return (
      <Badge
        variant={isHighContrast ? 'default' : 'secondary'}
        className={`flex items-center gap-1 cursor-pointer touch-target ${className}`}
        onClick={toggleHighContrast}
      >
        {isHighContrast ? <Contrast className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
        {showLabel && (
          <span className="hidden sm:inline text-xs">
            {isHighContrast ? 'High Contrast' : 'Standard'}
          </span>
        )}
      </Badge>
    );
  }

  if (variant === 'minimal') {
    return (
      <Button
        variant="ghost"
        size="sm"
        onClick={toggleHighContrast}
        className={`touch-target ${className}`}
        aria-label={`Toggle high contrast mode. Currently ${isHighContrast ? 'enabled' : 'disabled'}`}
      >
        {isHighContrast ? <Contrast className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        {showLabel && screenSize !== 'mobile' && (
          <span className="ml-2 text-sm">
            {isHighContrast ? 'High Contrast' : 'Standard'}
          </span>
        )}
      </Button>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className={`touch-target ${className}`}
          aria-label="Theme and accessibility options"
        >
          <div className="flex items-center gap-2">
            {getThemeIcon()}
            {isHighContrast && <Contrast className="h-3 w-3" />}
            {showLabel && screenSize !== 'mobile' && (
              <span className="text-sm">{getThemeLabel()}</span>
            )}
          </div>
        </Button>
      </DropdownMenuTrigger>
      
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel className="flex items-center gap-2">
          <Palette className="h-4 w-4" />
          Display Settings
        </DropdownMenuLabel>
        
        <DropdownMenuSeparator />
        
        <DropdownMenuItem
          onClick={() => setTheme('light')}
          className="flex items-center gap-2 cursor-pointer"
        >
          <Sun className="h-4 w-4" />
          Light Mode
          {theme === 'light' && <Badge variant="outline" className="ml-auto text-xs">Active</Badge>}
        </DropdownMenuItem>
        
        <DropdownMenuItem
          onClick={() => setTheme('dark')}
          className="flex items-center gap-2 cursor-pointer"
        >
          <Moon className="h-4 w-4" />
          Dark Mode
          {theme === 'dark' && <Badge variant="outline" className="ml-auto text-xs">Active</Badge>}
        </DropdownMenuItem>
        
        <DropdownMenuItem
          onClick={() => setTheme('system')}
          className="flex items-center gap-2 cursor-pointer"
        >
          <Monitor className="h-4 w-4" />
          System Default
          {theme === 'system' && <Badge variant="outline" className="ml-auto text-xs">Active</Badge>}
        </DropdownMenuItem>
        
        <DropdownMenuSeparator />
        
        <DropdownMenuLabel className="text-xs text-muted-foreground">
          Tournament Accessibility
        </DropdownMenuLabel>
        
        <DropdownMenuItem
          onClick={toggleHighContrast}
          className="flex items-center gap-2 cursor-pointer"
        >
          <Contrast className="h-4 w-4" />
          <div className="flex-1">
            <div className="font-medium">High Contrast Mode</div>
            <div className="text-xs text-muted-foreground">
              Optimized for outdoor tournament viewing
            </div>
          </div>
          {isHighContrast && <Badge variant="default" className="text-xs">ON</Badge>}
        </DropdownMenuItem>
        
        <DropdownMenuSeparator />
        
        <div className="px-2 py-1.5 text-xs text-muted-foreground">
          <div className="flex items-center gap-1 mb-1">
            <Settings className="h-3 w-3" />
            Current Settings
          </div>
          <div className="text-xs">
            Theme: {getThemeLabel()}
          </div>
          {isHighContrast && (
            <div className="text-xs text-primary">
              High contrast enabled for better outdoor visibility
            </div>
          )}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

/**
 * Compact theme toggle for mobile navigation
 */
export const MobileThemeToggle: FC<{ className?: string }> = ({ className }) => {
  return (
    <ThemeToggle
      variant="minimal"
      className={className}
      showLabel={false}
    />
  );
};

/**
 * Theme toggle badge for status bars
 */
export const ThemeToggleBadge: FC<{ className?: string }> = ({ className }) => {
  return (
    <ThemeToggle
      variant="badge"
      className={className}
      showLabel={true}
    />
  );
};