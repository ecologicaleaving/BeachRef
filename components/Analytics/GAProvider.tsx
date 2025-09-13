import { useEffect, Fragment } from 'react';
import { Platform } from 'react-native';
import { usePathname } from 'expo-router';

declare global {
  interface Window { gtag?: (...args: any[]) => void }
}

export function GAProvider() {
  const pathname = usePathname();

  const measurementId = process.env.EXPO_PUBLIC_ANALYTICS_ID;
  const enableAnalytics = process.env.EXPO_PUBLIC_ENABLE_ANALYTICS === 'true';
  const gitBranch = process.env.EXPO_PUBLIC_GIT_BRANCH;
  const requiredBranch = process.env.EXPO_PUBLIC_ANALYTICS_BRANCH || 'master';

  const enabled =
    Platform.OS === 'web' &&
    Boolean(measurementId) &&
    enableAnalytics &&
    gitBranch === requiredBranch;

  // Track page views on route change
  useEffect(() => {
    if (!enabled) return;
    try {
      if (typeof window !== 'undefined' && typeof window.gtag === 'function') {
        window.gtag('event', 'page_view', {
          page_path: pathname || '/',
        });
      }
    } catch {}
  }, [enabled, pathname]);

  return <Fragment />;
}

