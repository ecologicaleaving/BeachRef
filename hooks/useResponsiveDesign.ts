import { useState, useEffect, useCallback } from 'react';

export type ScreenSize = 'mobile' | 'tablet' | 'desktop';
export type ConnectionQuality = 'fast' | 'slow' | 'offline';

interface ResponsiveDesignState {
  screenSize: ScreenSize;
  isHighContrast: boolean;
  isOffline: boolean;
  connectionQuality: ConnectionQuality;
  devicePixelRatio: number;
  touchCapable: boolean;
  reducedMotion: boolean;
}

interface ResponsiveDesignActions {
  toggleHighContrast: () => void;
  setHighContrast: (enabled: boolean) => void;
  testConnectionQuality: () => Promise<ConnectionQuality>;
  isMobile: () => boolean;
  isTablet: () => boolean;
  isDesktop: () => boolean;
  getTouchTargetSize: () => number;
  getOptimizedImageSize: (baseSize: number) => number;
}

export type UseResponsiveDesignReturn = ResponsiveDesignState & ResponsiveDesignActions;

/**
 * Enhanced responsive design hook with mobile-first patterns,
 * tournament venue considerations, and accessibility features
 */
export const useResponsiveDesign = (): UseResponsiveDesignReturn => {
  const [screenSize, setScreenSize] = useState<ScreenSize>('mobile');
  const [isHighContrast, setIsHighContrast] = useState<boolean>(false);
  const [isOffline, setIsOffline] = useState<boolean>(false);
  const [connectionQuality, setConnectionQuality] = useState<ConnectionQuality>('offline');
  const [devicePixelRatio, setDevicePixelRatio] = useState<number>(1);
  const [touchCapable, setTouchCapable] = useState<boolean>(false);
  const [reducedMotion, setReducedMotion] = useState<boolean>(false);

  // Test connection quality for tournament venue networks
  const testConnectionQuality = useCallback(async (): Promise<ConnectionQuality> => {
    if (!navigator.onLine) {
      return 'offline';
    }

    try {
      const start = Date.now();
      await fetch('/api/health', { 
        method: 'HEAD',
        cache: 'no-cache',
        // Add timeout for tournament venue networks
        signal: AbortSignal.timeout(5000)
      });
      const duration = Date.now() - start;
      
      // Tournament venue networks are often slow, adjust thresholds
      return duration > 2000 ? 'slow' : 'fast';
    } catch (error) {
      // If fetch fails, assume slow connection rather than offline
      return 'slow';
    }
  }, []);

  // Enhanced breakpoint detection with tournament-specific considerations
  useEffect(() => {
    const handleResize = () => {
      const width = window.innerWidth;
      const height = window.innerHeight;
      const dpr = window.devicePixelRatio || 1;
      
      // Consider device pixel ratio for high-DPI tournament displays
      const effectiveWidth = width * dpr;
      
      // Update device pixel ratio
      setDevicePixelRatio(dpr);
      
      // Enhanced breakpoint logic for tournament usage
      if (width >= 1024 || (width >= 768 && height >= 1024)) {
        // Desktop or large tablet in portrait mode
        setScreenSize('desktop');
      } else if (width >= 768 && height >= 600) {
        // Standard tablet size with adequate height
        setScreenSize('tablet');
      } else {
        // Mobile or small tablet - optimize for one-handed usage
        setScreenSize('mobile');
      }
    };

    // Touch capability detection
    const detectTouchCapability = () => {
      const hasTouch = 'ontouchstart' in window || 
                       navigator.maxTouchPoints > 0 || 
                       // @ts-ignore - checking for older browsers
                       navigator.msMaxTouchPoints > 0;
      setTouchCapable(hasTouch);
    };

    // Reduced motion preference detection
    const detectReducedMotion = () => {
      const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      setReducedMotion(prefersReducedMotion);
    };

    // Initial setup
    handleResize();
    detectTouchCapability();
    detectReducedMotion();
    
    // Add resize listener
    window.addEventListener('resize', handleResize);
    
    // Listen for reduced motion changes
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    const handleMotionChange = (e: MediaQueryListEvent) => setReducedMotion(e.matches);
    mediaQuery.addEventListener('change', handleMotionChange);
    
    return () => {
      window.removeEventListener('resize', handleResize);
      mediaQuery.removeEventListener('change', handleMotionChange);
    };
  }, []);

  // Network state monitoring with tournament venue considerations
  useEffect(() => {
    const handleOnline = async () => {
      setIsOffline(false);
      // Test connection quality when coming back online
      const quality = await testConnectionQuality();
      setConnectionQuality(quality);
    };
    
    const handleOffline = () => {
      setIsOffline(true);
      setConnectionQuality('offline');
    };

    // Initial connection test
    if (navigator.onLine) {
      testConnectionQuality().then(setConnectionQuality);
    } else {
      setIsOffline(true);
      setConnectionQuality('offline');
    }
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    // Periodic connection quality testing for tournament venues
    const intervalId = setInterval(async () => {
      if (navigator.onLine && !isOffline) {
        const quality = await testConnectionQuality();
        setConnectionQuality(quality);
      }
    }, 30000); // Test every 30 seconds
    
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      clearInterval(intervalId);
    };
  }, [isOffline, testConnectionQuality]);

  // High contrast theme management with localStorage persistence
  useEffect(() => {
    // Load saved preference
    const saved = localStorage.getItem('beachref-high-contrast');
    if (saved !== null) {
      setIsHighContrast(JSON.parse(saved));
    } else {
      // Check system preference for high contrast
      const prefersHighContrast = window.matchMedia('(prefers-contrast: high)').matches;
      setIsHighContrast(prefersHighContrast);
    }
  }, []);

  // Apply high contrast class to document
  useEffect(() => {
    if (isHighContrast) {
      document.documentElement.classList.add('high-contrast');
    } else {
      document.documentElement.classList.remove('high-contrast');
    }
    
    // Save preference
    localStorage.setItem('beachref-high-contrast', JSON.stringify(isHighContrast));
  }, [isHighContrast]);

  // Action functions
  const toggleHighContrast = useCallback(() => {
    setIsHighContrast(prev => !prev);
  }, []);

  const setHighContrastMode = useCallback((enabled: boolean) => {
    setIsHighContrast(enabled);
  }, []);

  const isMobile = useCallback(() => screenSize === 'mobile', [screenSize]);
  const isTablet = useCallback(() => screenSize === 'tablet', [screenSize]);
  const isDesktop = useCallback(() => screenSize === 'desktop', [screenSize]);

  // Get optimized touch target size for tournament glove usage
  const getTouchTargetSize = useCallback(() => {
    // Base size: 44px (Apple HIG minimum)
    // Enhanced for tournament gloves: 48px+
    const baseSize = 44;
    const gloveEnhanced = touchCapable ? 48 : baseSize;
    
    // Scale for high DPI displays
    return Math.max(gloveEnhanced, baseSize * Math.min(devicePixelRatio, 2));
  }, [touchCapable, devicePixelRatio]);

  // Get optimized image size based on device capabilities
  const getOptimizedImageSize = useCallback((baseSize: number) => {
    // Scale for device pixel ratio but cap for mobile data usage
    if (screenSize === 'mobile' && connectionQuality === 'slow') {
      return baseSize; // Don't scale for slow mobile connections
    }
    
    return Math.min(baseSize * devicePixelRatio, baseSize * 2);
  }, [screenSize, connectionQuality, devicePixelRatio]);

  return {
    // State
    screenSize,
    isHighContrast,
    isOffline,
    connectionQuality,
    devicePixelRatio,
    touchCapable,
    reducedMotion,
    
    // Actions
    toggleHighContrast,
    setHighContrast: setHighContrastMode,
    testConnectionQuality,
    isMobile,
    isTablet,
    isDesktop,
    getTouchTargetSize,
    getOptimizedImageSize,
  };
};

/**
 * Hook for offline state management with tournament venue considerations
 */
export const useOfflineState = () => {
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const [connectionQuality, setConnectionQuality] = useState<ConnectionQuality>('offline');
  const [lastOnlineTime, setLastOnlineTime] = useState<Date | null>(null);

  const testConnectionQuality = useCallback(async (): Promise<ConnectionQuality> => {
    if (!navigator.onLine) return 'offline';

    try {
      const start = Date.now();
      await fetch('/api/health', { 
        method: 'HEAD',
        cache: 'no-cache',
        signal: AbortSignal.timeout(5000)
      });
      const duration = Date.now() - start;
      
      return duration > 2000 ? 'slow' : 'fast';
    } catch {
      return 'slow';
    }
  }, []);

  useEffect(() => {
    const handleOnline = async () => {
      setIsOffline(false);
      setLastOnlineTime(new Date());
      const quality = await testConnectionQuality();
      setConnectionQuality(quality);
    };
    
    const handleOffline = () => {
      setIsOffline(true);
      setConnectionQuality('offline');
    };

    // Initial state
    if (navigator.onLine) {
      handleOnline();
    }
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [testConnectionQuality]);

  return {
    isOffline,
    connectionQuality,
    lastOnlineTime,
    testConnectionQuality,
  };
};