/**
 * @jest-environment jsdom
 */

import { renderHook, act } from '@testing-library/react'
import { useUserTabPreferences, isTabPreferencesSupported, getPreferenceDebugInfo } from '@/hooks/useUserTabPreferences'

// Mock localStorage
const localStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
}

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock
})

describe('useUserTabPreferences', () => {
  beforeEach(() => {
    localStorageMock.getItem.mockClear()
    localStorageMock.setItem.mockClear()
    localStorageMock.removeItem.mockClear()
    localStorageMock.clear.mockClear()
  })

  describe('initial state', () => {
    it('should initialize with default preferences when no stored data', () => {
      localStorageMock.getItem.mockReturnValue(null)
      
      const { result } = renderHook(() => useUserTabPreferences())
      
      expect(result.current.preferences.enableSmartDefaults).toBe(true)
      expect(result.current.preferences.defaultTab).toBeUndefined()
      expect(result.current.isSmartDefaultsEnabled).toBe(true)
      expect(result.current.userPreference).toBeUndefined()
    })

    it('should load stored preferences', () => {
      const storedPreferences = {
        defaultTab: 'schedule',
        enableSmartDefaults: false,
        lastUpdated: Date.now(),
        version: '1.0'
      }
      localStorageMock.getItem.mockReturnValue(JSON.stringify(storedPreferences))
      
      const { result } = renderHook(() => useUserTabPreferences())
      
      expect(result.current.preferences.defaultTab).toBe('schedule')
      expect(result.current.preferences.enableSmartDefaults).toBe(false)
      expect(result.current.userPreference).toBe('schedule')
    })

    it('should reset to defaults on version mismatch', () => {
      const oldVersionPreferences = {
        defaultTab: 'schedule',
        enableSmartDefaults: false,
        lastUpdated: Date.now(),
        version: '0.9' // Old version
      }
      localStorageMock.getItem.mockReturnValue(JSON.stringify(oldVersionPreferences))
      
      const { result } = renderHook(() => useUserTabPreferences())
      
      expect(result.current.preferences.enableSmartDefaults).toBe(true)
      expect(localStorageMock.setItem).toHaveBeenCalled()
    })

    it('should handle parsing errors gracefully', () => {
      localStorageMock.getItem.mockReturnValue('invalid json')
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation(() => {})
      
      const { result } = renderHook(() => useUserTabPreferences())
      
      expect(result.current.preferences.enableSmartDefaults).toBe(true)
      expect(consoleSpy).toHaveBeenCalledWith('Failed to load tab preferences:', expect.any(Error))
      
      consoleSpy.mockRestore()
    })
  })

  describe('setDefaultTab', () => {
    it('should set a specific tab as default and disable smart defaults', () => {
      localStorageMock.getItem.mockReturnValue(null)
      
      const { result } = renderHook(() => useUserTabPreferences())
      
      act(() => {
        result.current.setDefaultTab('schedule')
      })
      
      expect(result.current.preferences.defaultTab).toBe('schedule')
      expect(result.current.preferences.enableSmartDefaults).toBe(false)
      expect(result.current.userPreference).toBe('schedule')
      expect(localStorageMock.setItem).toHaveBeenCalled()
    })

    it('should enable smart defaults when setting to "smart"', () => {
      localStorageMock.getItem.mockReturnValue(null)
      
      const { result } = renderHook(() => useUserTabPreferences())
      
      act(() => {
        result.current.setDefaultTab('smart')
      })
      
      expect(result.current.preferences.defaultTab).toBe('smart')
      expect(result.current.preferences.enableSmartDefaults).toBe(true)
      expect(result.current.userPreference).toBeUndefined()
    })

    it('should warn on invalid tab IDs', () => {
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation(() => {})
      localStorageMock.getItem.mockReturnValue(null)
      
      const { result } = renderHook(() => useUserTabPreferences())
      
      act(() => {
        result.current.setDefaultTab('invalid' as any)
      })
      
      expect(consoleSpy).toHaveBeenCalledWith('Invalid tab ID: invalid')
      
      consoleSpy.mockRestore()
    })
  })

  describe('toggleSmartDefaults', () => {
    it('should enable smart defaults', () => {
      const storedPreferences = {
        defaultTab: 'schedule',
        enableSmartDefaults: false,
        lastUpdated: Date.now(),
        version: '1.0'
      }
      localStorageMock.getItem.mockReturnValue(JSON.stringify(storedPreferences))
      
      const { result } = renderHook(() => useUserTabPreferences())
      
      act(() => {
        result.current.toggleSmartDefaults(true)
      })
      
      expect(result.current.preferences.enableSmartDefaults).toBe(true)
      expect(result.current.preferences.defaultTab).toBe('smart')
    })

    it('should disable smart defaults', () => {
      localStorageMock.getItem.mockReturnValue(null)
      
      const { result } = renderHook(() => useUserTabPreferences())
      
      act(() => {
        result.current.toggleSmartDefaults(false)
      })
      
      expect(result.current.preferences.enableSmartDefaults).toBe(false)
    })
  })

  describe('resetPreferences', () => {
    it('should reset preferences to defaults', () => {
      const storedPreferences = {
        defaultTab: 'schedule',
        enableSmartDefaults: false,
        lastUpdated: Date.now(),
        version: '1.0'
      }
      localStorageMock.getItem.mockReturnValue(JSON.stringify(storedPreferences))
      
      const { result } = renderHook(() => useUserTabPreferences())
      
      act(() => {
        result.current.resetPreferences()
      })
      
      expect(result.current.preferences.enableSmartDefaults).toBe(true)
      expect(result.current.preferences.defaultTab).toBeUndefined()
      expect(localStorageMock.removeItem).toHaveBeenCalledWith('beachref-tab-preferences')
    })
  })

  describe('isTabSetAsDefault', () => {
    it('should return true when tab is set as default', () => {
      const storedPreferences = {
        defaultTab: 'schedule',
        enableSmartDefaults: false,
        lastUpdated: Date.now(),
        version: '1.0'
      }
      localStorageMock.getItem.mockReturnValue(JSON.stringify(storedPreferences))
      
      const { result } = renderHook(() => useUserTabPreferences())
      
      expect(result.current.isTabSetAsDefault('schedule')).toBe(true)
      expect(result.current.isTabSetAsDefault('overview')).toBe(false)
    })

    it('should return false when smart defaults are enabled', () => {
      localStorageMock.getItem.mockReturnValue(null)
      
      const { result } = renderHook(() => useUserTabPreferences())
      
      expect(result.current.isTabSetAsDefault('overview')).toBe(false)
    })
  })

  describe('localStorage error handling', () => {
    it('should handle localStorage setItem errors', () => {
      localStorageMock.getItem.mockReturnValue(null)
      localStorageMock.setItem.mockImplementation(() => {
        throw new Error('Storage quota exceeded')
      })
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation(() => {})
      
      const { result } = renderHook(() => useUserTabPreferences())
      
      act(() => {
        result.current.setDefaultTab('schedule')
      })
      
      expect(consoleSpy).toHaveBeenCalledWith('Failed to save tab preferences:', expect.any(Error))
      
      consoleSpy.mockRestore()
    })

    it('should handle localStorage removeItem errors', () => {
      localStorageMock.getItem.mockReturnValue(null)
      localStorageMock.removeItem.mockImplementation(() => {
        throw new Error('Storage error')
      })
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation(() => {})
      
      const { result } = renderHook(() => useUserTabPreferences())
      
      act(() => {
        result.current.resetPreferences()
      })
      
      expect(consoleSpy).toHaveBeenCalledWith('Failed to reset tab preferences:', expect.any(Error))
      
      consoleSpy.mockRestore()
    })
  })
})

describe('isTabPreferencesSupported', () => {
  it('should return true when localStorage is available', () => {
    expect(isTabPreferencesSupported()).toBe(true)
  })

  it('should return false when localStorage throws', () => {
    const originalLocalStorage = window.localStorage
    
    // Mock localStorage to throw
    Object.defineProperty(window, 'localStorage', {
      get: () => {
        throw new Error('localStorage not available')
      }
    })
    
    expect(isTabPreferencesSupported()).toBe(false)
    
    // Restore
    Object.defineProperty(window, 'localStorage', {
      value: originalLocalStorage
    })
  })
})

describe('getPreferenceDebugInfo', () => {
  it('should return debug information', () => {
    const preferences = {
      defaultTab: 'schedule',
      enableSmartDefaults: false,
      lastUpdated: Date.now(),
      version: '1.0'
    }
    localStorageMock.getItem.mockReturnValue(JSON.stringify(preferences))
    
    const debugInfo = getPreferenceDebugInfo()
    
    expect(debugInfo.storageSupported).toBe(true)
    expect(debugInfo.hasStoredPreferences).toBe(true)
    expect(debugInfo.currentPreferences).toEqual(preferences)
  })

  it('should handle missing stored preferences', () => {
    localStorageMock.getItem.mockReturnValue(null)
    
    const debugInfo = getPreferenceDebugInfo()
    
    expect(debugInfo.hasStoredPreferences).toBe(false)
    expect(debugInfo.currentPreferences).toBeUndefined()
  })
})