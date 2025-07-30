import { renderHook, act } from '@testing-library/react';
import { useResponsiveDesign, useOfflineState } from '@/hooks/useResponsiveDesign';

// Mock fetch for connection quality testing
global.fetch = jest.fn();

describe('useResponsiveDesign', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Reset window size
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: 1024,
    });
    Object.defineProperty(window, 'innerHeight', {
      writable: true,
      configurable: true,
      value: 768,
    });
    Object.defineProperty(window, 'devicePixelRatio', {
      writable: true,
      configurable: true,
      value: 1,
    });
    // Reset localStorage mock
    localStorage.clear();
  });

  it('should initialize with correct default values', () => {
    const { result } = renderHook(() => useResponsiveDesign());

    expect(result.current.screenSize).toBe('desktop'); // 1024px width
    expect(result.current.isHighContrast).toBe(false);
    expect(result.current.touchCapable).toBe(false);
    expect(result.current.devicePixelRatio).toBe(1);
  });

  it('should detect mobile screen size correctly', () => {
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: 500,
    });

    const { result } = renderHook(() => useResponsiveDesign());
    expect(result.current.screenSize).toBe('mobile');
  });

  it('should detect tablet screen size correctly', () => {
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: 800,
    });
    Object.defineProperty(window, 'innerHeight', {
      writable: true,
      configurable: true,
      value: 600,
    });

    const { result } = renderHook(() => useResponsiveDesign());
    expect(result.current.screenSize).toBe('tablet');
  });

  it('should provide correct touch target size', () => {
    const { result } = renderHook(() => useResponsiveDesign());
    const touchTargetSize = result.current.getTouchTargetSize();
    
    expect(touchTargetSize).toBeGreaterThanOrEqual(44);
  });

  it('should handle high contrast toggle', () => {
    const { result } = renderHook(() => useResponsiveDesign());
    
    act(() => {
      result.current.toggleHighContrast();
    });
    
    expect(result.current.isHighContrast).toBe(true);
  });

  it('should restore high contrast preference from localStorage', () => {
    // Clear any existing setup
    localStorage.clear();
    // Set up localStorage value before rendering hook
    localStorage.setItem('beachref-high-contrast', 'true');
    
    const { result } = renderHook(() => useResponsiveDesign());
    
    // High contrast should be enabled based on localStorage
    expect(result.current.isHighContrast).toBe(true);
  });

  it('should provide utility functions', () => {
    const { result } = renderHook(() => useResponsiveDesign());
    
    expect(typeof result.current.isMobile).toBe('function');
    expect(typeof result.current.isTablet).toBe('function');
    expect(typeof result.current.isDesktop).toBe('function');
    expect(typeof result.current.getOptimizedImageSize).toBe('function');
  });

  it('should detect high DPI displays correctly', () => {
    Object.defineProperty(window, 'devicePixelRatio', {
      writable: true,
      configurable: true,
      value: 2,
    });

    const { result } = renderHook(() => useResponsiveDesign());
    expect(result.current.devicePixelRatio).toBe(2);
  });

  it('should respond to resize events', async () => {
    const { result, waitForNextUpdate } = renderHook(() => useResponsiveDesign());
    
    // Initial desktop size
    expect(result.current.screenSize).toBe('desktop');
    
    // Simulate window resize to mobile
    act(() => {
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 500,
      });
      window.dispatchEvent(new Event('resize'));
    });

    // Wait for the hook to update
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 0));
    });

    expect(result.current.screenSize).toBe('mobile');
  });
});

describe('useOfflineState', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    fetch.mockClear();
    Object.defineProperty(navigator, 'onLine', {
      writable: true,
      value: true,
    });
  });

  it('should initialize with correct online state', () => {
    const { result } = renderHook(() => useOfflineState());
    
    expect(result.current.isOffline).toBe(false);
  });

  it('should initialize with offline state when navigator is offline', () => {
    Object.defineProperty(navigator, 'onLine', {
      writable: true,
      value: false,
    });

    const { result } = renderHook(() => useOfflineState());
    
    expect(result.current.isOffline).toBe(true);
    expect(result.current.connectionQuality).toBe('offline');
  });

  it('should test connection quality when online', async () => {
    const mockFetch = fetch as jest.MockedFunction<typeof fetch>;
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
    } as Response);

    const { result } = renderHook(() => useOfflineState());
    
    await act(async () => {
      const quality = await result.current.testConnectionQuality();
      // The connection quality depends on timing, so accept both fast and slow
      expect(['fast', 'slow']).toContain(quality);
    });
  });

  it('should detect slow connection', async () => {
    // Mock slow response
    fetch.mockImplementationOnce(() => 
      new Promise(resolve => 
        setTimeout(() => resolve({ ok: true, status: 200 }), 3000)
      )
    );

    const { result } = renderHook(() => useOfflineState());
    
    await act(async () => {
      const quality = await result.current.testConnectionQuality();
      expect(quality).toBe('slow');
    });
  });

  it('should handle network errors gracefully', async () => {
    fetch.mockRejectedValueOnce(new Error('Network error'));

    const { result } = renderHook(() => useOfflineState());
    
    await act(async () => {
      const quality = await result.current.testConnectionQuality();
      expect(quality).toBe('slow');
    });
  });

  it('should respond to online events', async () => {
    const { result } = renderHook(() => useOfflineState());
    
    // Simulate going offline
    await act(async () => {
      Object.defineProperty(navigator, 'onLine', {
        writable: true,
        value: false,
      });
      window.dispatchEvent(new Event('offline'));
      await new Promise(resolve => setTimeout(resolve, 0));
    });
    
    expect(result.current.isOffline).toBe(true);
    
    // Simulate going back online
    await act(async () => {
      Object.defineProperty(navigator, 'onLine', {
        writable: true,
        value: true,
      });
      window.dispatchEvent(new Event('online'));
      await new Promise(resolve => setTimeout(resolve, 0));
    });
    
    expect(result.current.isOffline).toBe(false);
  });
});