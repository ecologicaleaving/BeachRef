import { useEffect, useRef, MutableRefObject } from 'react'
import { Platform } from 'react-native'

const SCRIPT_ID_PREFIX = 'ga4-script-'
const CONSENT_DEFAULTS = { analytics_storage: 'granted' }

declare global {
  interface Window {
    dataLayer?: IArguments[]
    gtag?: (...args: unknown[]) => void
    __ga4?: {
      measurementId?: string
      initialized?: boolean
      consentSet?: boolean
    }
  }
}

function ensureGtagStub() {
  if (!window.dataLayer) {
    window.dataLayer = []
  }

  if (typeof window.gtag !== 'function') {
    window.gtag = function gtag() {
      window.dataLayer?.push(arguments as unknown as IArguments)
    }
  }

  if (!window.__ga4?.consentSet) {
    window.gtag?.('consent', 'default', CONSENT_DEFAULTS)
    window.__ga4 = {
      ...(window.__ga4 ?? {}),
      consentSet: true,
    }
  }
}

function initializeAnalytics(measurementId: string) {
  ensureGtagStub()

  window.gtag?.('js', new Date())
  window.gtag?.('config', measurementId, {
    send_page_view: false,
    debug_mode: __DEV__,
  })

  window.__ga4 = {
    ...(window.__ga4 ?? {}),
    initialized: true,
    measurementId,
  }
}

function loadGaScript(measurementId: string, onReady: () => void) {
  const scriptId = `${SCRIPT_ID_PREFIX}${measurementId}`
  let script = document.getElementById(scriptId) as HTMLScriptElement | null

  const finishInit = () => {
    if (!window.__ga4?.initialized) {
      initializeAnalytics(measurementId)
    }
    onReady()
  }

  if (script) {
    if (window.__ga4?.initialized) {
      onReady()
      return
    }

    const handleLoad = () => {
      script?.removeEventListener('load', handleLoad)
      finishInit()
    }

    script.addEventListener('load', handleLoad)

    if (script.dataset.gaLoaded === 'true') {
      finishInit()
    }

    return () => script?.removeEventListener('load', handleLoad)
  }

  script = document.createElement('script')
  script.id = scriptId
  script.async = true
  script.src = `https://www.googletagmanager.com/gtag/js?id=${measurementId}`

  const handleLoad = () => {
    script?.removeEventListener('load', handleLoad)
    script?.setAttribute('data-ga-loaded', 'true')
    finishInit()
  }

  script.addEventListener('load', handleLoad)
  script.addEventListener('error', (error) => {
    if (__DEV__) {
      console.warn('[Analytics] Failed to load GA4 script', error)
    }
  }, { once: true })

  document.head.appendChild(script)

  return () => script?.removeEventListener('load', handleLoad)
}

function trackPageView(pathname: string, lastTrackedRef: MutableRefObject<string | null>) {
  if (typeof window === 'undefined' || typeof window.gtag !== 'function') {
    return
  }

  if (!window.__ga4?.initialized) {
    return
  }

  const path = pathname || '/'
  const location = window.location.href
  const cacheKey = `${path}|${location}`

  if (lastTrackedRef.current === cacheKey) {
    return
  }

  window.gtag('event', 'page_view', {
    page_path: path,
    page_location: location,
    page_title: document.title,
    debug_mode: __DEV__,
  })

  lastTrackedRef.current = cacheKey
}

export function useAnalytics(pathname: string | undefined) {
  const lastTrackedRef = useRef<string | null>(null)
  const measurementId = (process.env.EXPO_PUBLIC_GA_ID || process.env.EXPO_PUBLIC_ANALYTICS_ID)?.trim?.()
  const scriptCleanupRef = useRef<(() => void) | null>(null)

  useEffect(() => {
    if (Platform.OS !== 'web') {
      return
    }

    if (!measurementId) {
      if (__DEV__) {
        console.warn('[Analytics] EXPO_PUBLIC_GA_ID is not set; GA4 disabled')
      }
      return
    }

    ensureGtagStub()

    if (window.__ga4?.initialized && window.__ga4.measurementId === measurementId) {
      return
    }

    scriptCleanupRef.current?.()
    scriptCleanupRef.current = loadGaScript(measurementId, () => {
      trackPageView(pathname ?? '/', lastTrackedRef)
    })

    return () => {
      scriptCleanupRef.current?.()
      scriptCleanupRef.current = null
    }
  }, [measurementId])

  useEffect(() => {
    if (Platform.OS !== 'web' || !measurementId) {
      return
    }

    if (window.__ga4?.initialized) {
      trackPageView(pathname ?? '/', lastTrackedRef)
      return
    }

    const script = document.getElementById(`${SCRIPT_ID_PREFIX}${measurementId}`)
    if (!script) {
      return
    }

    const handleReady = () => trackPageView(pathname ?? '/', lastTrackedRef)
    script.addEventListener('load', handleReady)

    return () => {
      script.removeEventListener('load', handleReady)
    }
  }, [measurementId, pathname])
}
