/**
 * FIVB Flag Service
 * Provides country flag URLs from FIVB's flag service
 * 
 * Flag URL Pattern: https://www.fivb.org/Vis2009/Images/Flags/Small/XX.png
 * Where XX is the ISO 3166-1 alpha-2 code or 3-letter federation code
 */

export interface FlagConfig {
  url: string;
  alt: string;
  width: number;
  height: number;
}

/**
 * Federation code to country code mapping for special cases
 * For federations without direct country equivalents (ENG, NIR, SCO, WAL)
 */
const FEDERATION_TO_COUNTRY_MAP: Record<string, string> = {
  // Standard ISO conversions (3-letter to 2-letter)
  'AUS': 'AU',
  'BRA': 'BR',
  'CAN': 'CA',
  'CHN': 'CN',
  'FRA': 'FR',
  'GER': 'DE',
  'ITA': 'IT',
  'JPN': 'JP',
  'NED': 'NL',
  'NOR': 'NO',
  'POL': 'PL',
  'RUS': 'RU',
  'SWE': 'SE',
  'USA': 'US',
  
  // Special federation cases (use 3-letter code)
  'ENG': 'ENG', // England
  'NIR': 'NIR', // Northern Ireland
  'SCO': 'SCO', // Scotland
  'WAL': 'WAL', // Wales
};

/**
 * Convert federation code to appropriate flag code
 * @param federationCode - 3-letter federation code from VIS API
 * @returns 2-letter ISO code or 3-letter federation code for flag URL
 */
export function getFlagCode(federationCode: string): string {
  if (!federationCode) return '';
  
  const upperCode = federationCode.toUpperCase();
  
  // Check if we have a mapping
  if (FEDERATION_TO_COUNTRY_MAP[upperCode]) {
    return FEDERATION_TO_COUNTRY_MAP[upperCode];
  }
  
  // For unmapped codes, assume it's already a 2-letter ISO code
  if (upperCode.length === 2) {
    return upperCode;
  }
  
  // For 3-letter codes without mapping, use as-is
  return upperCode;
}

/**
 * Generate FIVB flag URL for a country/federation code
 * @param countryCode - Country or federation code (2 or 3 letters)
 * @returns Complete FIVB flag URL
 */
export function getFlagUrl(countryCode: string): string {
  if (!countryCode) return '';
  
  const flagCode = getFlagCode(countryCode);
  return `https://www.fivb.org/Vis2009/Images/Flags/Small/${flagCode}.png`;
}

/**
 * Generate complete flag configuration for React Native Image component
 * @param countryCode - Country or federation code
 * @param teamName - Optional team name for alt text
 * @returns Flag configuration object
 */
export function getFlagConfig(countryCode: string, teamName?: string): FlagConfig {
  const flagCode = getFlagCode(countryCode);
  const url = getFlagUrl(countryCode);
  
  return {
    url,
    alt: teamName ? `${teamName} flag` : `${flagCode} flag`,
    width: 16,
    height: 11,
  };
}

/**
 * Check if a flag URL is valid (exists on FIVB servers)
 * @param countryCode - Country or federation code
 * @returns Promise<boolean> - True if flag exists
 */
export async function validateFlagExists(countryCode: string): Promise<boolean> {
  try {
    const url = getFlagUrl(countryCode);
    const response = await fetch(url, { method: 'HEAD' });
    return response.ok;
  } catch {
    return false;
  }
}

/**
 * Get flag configuration with fallback handling
 * @param countryCode - Primary country code
 * @param fallbackCode - Optional fallback country code
 * @param teamName - Optional team name for alt text
 * @returns Flag configuration or null if no valid flag
 */
export async function getFlagConfigWithFallback(
  countryCode: string,
  fallbackCode?: string,
  teamName?: string
): Promise<FlagConfig | null> {
  // Try primary code
  if (countryCode && await validateFlagExists(countryCode)) {
    return getFlagConfig(countryCode, teamName);
  }
  
  // Try fallback code
  if (fallbackCode && await validateFlagExists(fallbackCode)) {
    return getFlagConfig(fallbackCode, teamName);
  }
  
  return null;
}