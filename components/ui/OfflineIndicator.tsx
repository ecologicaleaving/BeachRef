'use client';

import { FC, useEffect, useState } from 'react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useOfflineState } from '@/hooks/useResponsiveDesign';
import { Wifi, WifiOff, Signal, SignalLow, Loader2 } from 'lucide-react';

interface OfflineIndicatorProps {
  className?: string;
  showDetails?: boolean;
  onRetry?: () => void;
}

export const OfflineIndicator: FC<OfflineIndicatorProps> = ({
  className = '',
  showDetails = false,
  onRetry
}) => {
  const { isOffline, connectionQuality, lastOnlineTime, testConnectionQuality } = useOfflineState();
  const [isTestingConnection, setIsTestingConnection] = useState(false);

  const handleTestConnection = async () => {
    setIsTestingConnection(true);
    try {
      await testConnectionQuality();
      if (onRetry) {
        onRetry();
      }
    } finally {
      setIsTestingConnection(false);
    }
  };

  const getConnectionIcon = () => {
    if (isOffline) {
      return <WifiOff className="h-4 w-4" />;
    }
    
    switch (connectionQuality) {
      case 'fast':
        return <Wifi className="h-4 w-4" />;
      case 'slow':
        return <SignalLow className="h-4 w-4" />;
      default:
        return <Signal className="h-4 w-4" />;
    }
  };

  const getConnectionText = () => {
    if (isOffline) {
      return 'Offline';
    }
    
    switch (connectionQuality) {
      case 'fast':
        return 'Online (Fast)';
      case 'slow':
        return 'Online (Slow)';
      default:
        return 'Online';
    }
  };

  const getConnectionBadgeVariant = () => {
    if (isOffline) {
      return 'destructive';
    }
    
    switch (connectionQuality) {
      case 'fast':
        return 'default';
      case 'slow':
        return 'secondary';
      default:
        return 'outline';
    }
  };

  const formatLastOnlineTime = () => {
    if (!lastOnlineTime) return 'Unknown';
    
    const now = new Date();
    const diff = now.getTime() - lastOnlineTime.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(minutes / 60);
    
    if (minutes < 1) {
      return 'Just now';
    } else if (minutes < 60) {
      return `${minutes}m ago`;
    } else {
      return `${hours}h ago`;
    }
  };

  // Don't show indicator if online with fast connection and no details requested
  if (!isOffline && connectionQuality === 'fast' && !showDetails) {
    return null;
  }

  return (
    <div className={className}>
      {/* Compact badge indicator */}
      {!showDetails && (
        <Badge
          variant={getConnectionBadgeVariant()}
          className="flex items-center gap-1 text-xs"
        >
          {getConnectionIcon()}
          <span className="hidden sm:inline">{getConnectionText()}</span>
        </Badge>
      )}

      {/* Detailed offline state */}
      {showDetails && (isOffline || connectionQuality === 'slow') && (
        <Alert 
          variant={isOffline ? 'destructive' : 'default'} 
          className="mb-4"
        >
          {getConnectionIcon()}
          <AlertDescription>
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <p className="font-medium mb-1">
                  {isOffline ? 'No Internet Connection' : 'Slow Connection Detected'}
                </p>
                <p className="text-sm">
                  {isOffline 
                    ? 'Tournament data may be outdated. Some features may not work properly.'
                    : 'Tournament venue networks can be slow. Data loading may take longer than usual.'
                  }
                </p>
                {isOffline && lastOnlineTime && (
                  <p className="text-xs mt-2 opacity-75">
                    Last online: {formatLastOnlineTime()}
                  </p>
                )}
              </div>
              
              {onRetry && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleTestConnection}
                  disabled={isTestingConnection}
                  className="flex-shrink-0 touch-target"
                >
                  {isTestingConnection ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Testing...
                    </>
                  ) : (
                    <>
                      <Signal className="h-4 w-4 mr-2" />
                      {isOffline ? 'Retry Connection' : 'Test Speed'}
                    </>
                  )}
                </Button>
              )}
            </div>
          </AlertDescription>
        </Alert>
      )}

      {/* Connection quality info for tournament day usage */}
      {showDetails && !isOffline && connectionQuality === 'fast' && (
        <div className="text-xs text-muted-foreground mb-2 flex items-center gap-2">
          <Wifi className="h-3 w-3" />
          <span>Connection quality: Good for tournament usage</span>
        </div>
      )}
    </div>
  );
};

/**
 * Floating connection status indicator for persistent display
 */
export const FloatingOfflineIndicator: FC<{ onRetry?: () => void }> = ({ onRetry }) => {
  const { isOffline, connectionQuality } = useOfflineState();
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Show indicator when offline or slow connection
    setIsVisible(isOffline || connectionQuality === 'slow');
  }, [isOffline, connectionQuality]);

  if (!isVisible) return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 z-50 md:left-auto md:right-4 md:w-auto">
      <OfflineIndicator 
        showDetails={true}
        onRetry={onRetry}
        className="animate-slide-up"
      />
    </div>
  );
};