/**
 * VIS API Configuration Utility
 * Provides the correct baseUrl based on platform (web vs native)
 *
 * Web: Uses Netlify serverless function proxy to avoid CORS issues
 * Native: Direct connection to VIS API
 */

import { Platform } from 'react-native';

// Direct VIS API endpoint (used on native platforms)
const VIS_API_DIRECT = 'https://www.fivb.org/Vis2009/XmlRequest.asmx';

// Netlify proxy endpoint (used on web platform)
const VIS_API_PROXY = '/.netlify/functions/vis-api-proxy';

/**
 * Get the appropriate VIS API baseUrl for the current platform
 *
 * @returns The correct baseUrl to use for VIS API requests
 */
export function getVisApiBaseUrl(): string {
  // TEMP: Force direct API for local testing (may have CORS issues)
  // TODO: Use netlify dev for proper local testing
  return VIS_API_DIRECT;

  // For web platform, use the Netlify proxy to avoid CORS
  // if (Platform.OS === 'web') {
  //   return VIS_API_PROXY;
  // }

  // For native platforms (iOS, Android), use direct connection
  // return VIS_API_DIRECT;
}

/**
 * Check if running on web platform
 */
export function isWebPlatform(): boolean {
  return Platform.OS === 'web';
}

/**
 * Check if running on native platform
 */
export function isNativePlatform(): boolean {
  return Platform.OS === 'ios' || Platform.OS === 'android';
}
