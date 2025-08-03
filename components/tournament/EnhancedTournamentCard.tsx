/**
 * Enhanced Tournament Card Component for Story 5.2
 * Tournament cards with temporal status indicators and enhanced visual styling
 */

'use client';

import { Tournament } from '@/lib/types';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { MapPin, Calendar, Users, ExternalLink } from 'lucide-react';
import { cn } from '@/lib/utils';
import { calculateTournamentTemporalStatus } from '@/utils/temporal-filtering';
import Link from 'next/link';

interface EnhancedTournamentCardProps {
  tournament: Tournament;
  variant: 'active' | 'upcoming' | 'past';
  showTemporalStatus?: boolean;
  showActions?: boolean;
  className?: string;
}

export function EnhancedTournamentCard({ 
  tournament, 
  variant, 
  showTemporalStatus = false,
  showActions = true,
  className 
}: EnhancedTournamentCardProps) {
  const temporalStatus = calculateTournamentTemporalStatus(tournament);
  
  const variantStyles = {
    active: "border-l-4 border-l-destructive bg-destructive/5 shadow-md",
    upcoming: "border-l-4 border-l-blue-500 bg-blue-500/5", 
    past: "border-l-4 border-l-muted-foreground bg-muted/20"
  };

  const badgeVariants = {
    active: 'destructive' as const,
    upcoming: 'default' as const,
    past: 'outline' as const
  };

  const formatDate = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric',
        year: 'numeric'
      });
    } catch {
      return dateString;
    }
  };

  const getPriorityIndicator = () => {
    if (variant === 'active') {
      return (
        <div className="absolute top-2 right-2">
          <div className="w-3 h-3 bg-destructive rounded-full animate-pulse"></div>
        </div>
      );
    }
    return null;
  };

  return (
    <Card className={cn(
      "tournament-card hover:shadow-lg transition-all duration-200 cursor-pointer relative",
      "hover:scale-[1.02] group",
      variantStyles[variant],
      className
    )}>
      {getPriorityIndicator()}
      
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <CardTitle className="text-lg leading-tight group-hover:text-primary transition-colors">
            {tournament.name}
          </CardTitle>
          {showTemporalStatus && (
            <Badge 
              variant={badgeVariants[variant]}
              className={cn(
                "text-xs shrink-0",
                variant === 'active' && "animate-pulse"
              )}
            >
              {temporalStatus.displayText}
            </Badge>
          )}
        </div>
        
        <div className="flex items-center text-sm text-muted-foreground">
          <MapPin className="h-4 w-4 mr-1 shrink-0" />
          <span className="truncate">{tournament.countryCode}</span>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-3">
        {/* Tournament Details */}
        <div className="space-y-2 text-sm">
          <div className="flex items-center justify-between">
            <div className="flex items-center text-muted-foreground">
              <Calendar className="h-3 w-3 mr-1" />
              <span>Dates:</span>
            </div>
            <span className="text-right text-xs">
              {formatDate(tournament.startDate)} - {formatDate(tournament.endDate)}
            </span>
          </div>
          
          <div className="flex items-center justify-between">
            <div className="flex items-center text-muted-foreground">
              <Users className="h-3 w-3 mr-1" />
              <span>Category:</span>
            </div>
            <Badge variant="outline" className="text-xs">
              {tournament.gender} {tournament.type}
            </Badge>
          </div>

          {tournament.code && (
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Code:</span>
              <code className="text-xs bg-muted px-1 py-0.5 rounded font-mono">
                {tournament.code}
              </code>
            </div>
          )}
        </div>

        {/* Actions */}
        {showActions && (
          <div className="flex gap-2 pt-2 border-t border-border">
            <Button 
              size="sm" 
              variant="outline" 
              className="flex-1 touch-target text-xs"
              asChild
            >
              <Link href={`/tournament/${tournament.code}`}>
                <ExternalLink className="h-3 w-3 mr-1" />
                View Details
              </Link>
            </Button>
            
            {variant === 'active' && (
              <Button 
                size="sm" 
                variant="default" 
                className="touch-target text-xs bg-destructive hover:bg-destructive/90"
                asChild
              >
                <Link href={`/tournament/${tournament.code}/live`}>
                  Watch Live
                </Link>
              </Button>
            )}
          </div>
        )}

        {/* Temporal Status Bar */}
        {showTemporalStatus && (
          <div className="flex items-center gap-2 pt-2 border-t border-border">
            <div className={cn(
              "h-1 flex-1 rounded-full",
              variant === 'active' && "bg-destructive animate-pulse",
              variant === 'upcoming' && "bg-blue-500",
              variant === 'past' && "bg-muted-foreground"
            )} />
            <span className="text-xs text-muted-foreground">
              Priority: {temporalStatus.priority}
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}