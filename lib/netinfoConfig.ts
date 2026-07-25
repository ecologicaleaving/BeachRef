/**
 * Centralised NetInfo configuration (issue #36).
 *
 * On web, `@react-native-community/netinfo` defaults to probing reachability
 * with `HEAD /` (see `internal/defaultConfiguration.web.ts`). That points the
 * connectivity check at the site's prerendered HTML document — the heaviest
 * response the origin serves — and it fires during app boot, competing with
 * the first render and with the first VIS API call.
 *
 * Point it at the smallest static file on the origin instead. `favicon.ico` is
 * always present, is a few hundred bytes, is same-origin (no CORS) and returns
 * 200, which is what NetInfo's default `reachabilityTest` asserts.
 *
 * This module must be imported before anything else touches NetInfo, so it is
 * the first import of `app/_layout.tsx`.
 */
import NetInfo from '@react-native-community/netinfo';
import { Platform } from 'react-native';

let configured = false;

export function configureNetInfo(): void {
  if (configured) return;
  configured = true;

  if (Platform.OS !== 'web') return;

  try {
    NetInfo.configure({
      reachabilityUrl: '/favicon.ico',
      reachabilityMethod: 'HEAD',
      reachabilityTest: async (response: Response) => response.status === 200,
      // Keep the default cadence but avoid a tight retry loop on a cold start.
      reachabilityShortTimeout: 5 * 1000,
      reachabilityLongTimeout: 60 * 1000,
      reachabilityRequestTimeout: 15 * 1000,
    });
  } catch (error) {
    // Never let a diagnostics tweak break app boot.
    console.warn('[NetInfo] configuration skipped:', error);
  }
}

configureNetInfo();
