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
 * Federation code to country code mapping for FIVB flag service
 * Maps 3-letter federation codes to 2-letter ISO codes or 3-letter special codes
 */
const FEDERATION_TO_COUNTRY_MAP: Record<string, string> = {
  // Standard ISO conversions (3-letter to 2-letter)
  'ARG': 'AR',  // Argentina
  'AUS': 'AU',  // Australia
  'AUT': 'AT',  // Austria
  'BEL': 'BE',  // Belgium
  'BRA': 'BR',  // Brazil
  'CAN': 'CA',  // Canada
  'CHI': 'CL',  // Chile
  'CHN': 'CN',  // China
  'COL': 'CO',  // Colombia
  'CRO': 'HR',  // Croatia
  'CZE': 'CZ',  // Czech Republic
  'DEN': 'DK',  // Denmark
  'ESP': 'ES',  // Spain
  'EST': 'EE',  // Estonia
  'FIN': 'FI',  // Finland
  'FRA': 'FR',  // France
  'GER': 'DE',  // Germany
  'GRE': 'GR',  // Greece
  'HUN': 'HU',  // Hungary
  'INA': 'ID',  // Indonesia
  'IRL': 'IE',  // Ireland
  'ISR': 'IL',  // Israel
  'ITA': 'IT',  // Italy
  'JPN': 'JP',  // Japan
  'KOR': 'KR',  // South Korea
  'LAT': 'LV',  // Latvia
  'LTU': 'LT',  // Lithuania
  'MEX': 'MX',  // Mexico
  'NED': 'NL',  // Netherlands
  'NOR': 'NO',  // Norway
  'NZL': 'NZ',  // New Zealand
  'POL': 'PL',  // Poland
  'POR': 'PT',  // Portugal
  'ROU': 'RO',  // Romania
  'RUS': 'RU',  // Russia
  'SLO': 'SI',  // Slovenia
  'SUI': 'CH',  // Switzerland
  'SVK': 'SK',  // Slovakia
  'SWE': 'SE',  // Sweden
  'TUR': 'TR',  // Turkey
  'UKR': 'UA',  // Ukraine
  'USA': 'US',  // United States
  'VEN': 'VE',  // Venezuela
  
  // Additional common federation codes
  'BUL': 'BG',  // Bulgaria
  'GEO': 'GE',  // Georgia
  'MLD': 'MD',  // Moldova
  'AZE': 'AZ',  // Azerbaijan
  'ALB': 'AL',  // Albania
  'ARM': 'AM',  // Armenia
  'BLR': 'BY',  // Belarus
  'BIH': 'BA',  // Bosnia and Herzegovina
  'LVA': 'LV',  // Latvia (alternative code)
  'MDA': 'MD',  // Moldova (alternative code)
  'MKD': 'MK',  // North Macedonia
  'MNE': 'ME',  // Montenegro
  'SRB': 'RS',  // Serbia
  'SVN': 'SI',  // Slovenia (alternative code)
  'KAZ': 'KZ',  // Kazakhstan
  'KGZ': 'KG',  // Kyrgyzstan
  'TJK': 'TJ',  // Tajikistan
  'TKM': 'TM',  // Turkmenistan
  'UZB': 'UZ',  // Uzbekistan
  'AFG': 'AF',  // Afghanistan
  'BGD': 'BD',  // Bangladesh
  'BTN': 'BT',  // Bhutan
  'BRN': 'BN',  // Brunei
  'KHM': 'KH',  // Cambodia
  'LAO': 'LA',  // Laos
  'MDV': 'MV',  // Maldives
  'MMR': 'MM',  // Myanmar
  'NPL': 'NP',  // Nepal
  'PAK': 'PK',  // Pakistan
  'LKA': 'LK',  // Sri Lanka
  'TLS': 'TL',  // Timor-Leste
  'VNM': 'VN',  // Vietnam
  'YEM': 'YE',  // Yemen
  
  // Missing flags reported by user
  'URU': 'UY',  // Uruguay
  'CUB': 'CU',  // Cuba
  'CRC': 'CR',  // Costa Rica
  'QAT': 'QA',  // Qatar
  'PAR': 'PY',  // Paraguay
  'EGY': 'EG',  // Egypt
  'GHA': 'GH',  // Ghana
  'GUA': 'GT',  // Guatemala
  'RSA': 'ZA',  // South Africa
  'ALG': 'DZ',  // Algeria
  'PUR': 'PR',  // Puerto Rico
  'TUN': 'TN',  // Tunisia
  'VAN': 'VU',  // Vanuatu
  'THA': 'TH',  // Thailand
  'DOM': 'DO',  // Dominican Republic
  'PER': 'PE',  // Peru
  'RWA': 'RW',  // Rwanda

  // Additional missing flags (2025-10-29)
  'NAM': 'NA',  // Namibia
  'BOT': 'BW',  // Botswana
  'MOZ': 'MZ',  // Mozambique
  'NCA': 'NI',  // Nicaragua
  'ESA': 'SV',  // El Salvador
  'PAN': 'PA',  // Panama
  'HON': 'HN',  // Honduras
  'BIZ': 'BZ',  // Belize

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
 * Cache for validated flags to avoid repeated network requests
 */
const flagValidationCache = new Map<string, boolean>();

/**
 * Known problematic federation codes that don't have flags
 * Comprehensive list to prevent network requests
 */
const KNOWN_MISSING_FLAGS = new Set([
  'FAR',  // Faroe Islands (special territory, may not have standard flag)
  // Most other codes now have proper ISO mappings above
]); // Comprehensive list to prevent network requests

/**
 * Known working flag codes that exist on FIVB servers
 * Static whitelist to avoid network requests entirely
 */
const KNOWN_WORKING_FLAGS = new Set([
  'US', 'BR', 'IT', 'FR', 'DE', 'ES', 'PT', 'NL', 'BE', 'CH', 'AT', 'PL', 'CZ', 'SK',
  'HU', 'SI', 'RO', 'BG', 'GR', 'TR', 'FI', 'SE', 'NO', 'DK', 'IS', 'IE', 'GB',
  'RU', 'CN', 'JP', 'KR', 'AU', 'NZ', 'CA', 'MX', 'AR', 'CL', 'PE', 'CO', 'VE',
  'EC', 'BO', 'UY', 'PY', 'EG', 'MA', 'DZ', 'TN', 'KE', 'GH', 'NG', 'ZA',
  'IN', 'TH', 'MY', 'SG', 'PH', 'ID', 'VN', 'BD', 'LK', 'IR', 'IQ', 'SA', 'AE',
  'IL', 'JO', 'LB', 'SY', 'QA', 'KW', 'BH', 'OM', 'YE', 'UZ', 'KZ', 'KG', 'TJ',
  // Additional ISO codes from new federation mappings
  'GE', 'MD', 'AZ', 'AL', 'AM', 'BY', 'BA', 'LV', 'MK', 'ME', 'RS', 'TM',
  'AF', 'BT', 'BN', 'KH', 'LA', 'MV', 'MM', 'NP', 'PK', 'TL', 'UA', 'HR', 'EE', 'LT',
  // Missing flags reported by user - ISO codes
  'CU', 'CR', 'GT', 'PR', 'VU', 'DO', 'RW',  // Cuba, Costa Rica, Guatemala, Puerto Rico, Vanuatu, Dominican Republic, Rwanda
  // Additional flags (2025-10-29) - ISO codes
  'NA', 'BW', 'MZ', 'NI', 'SV', 'PA', 'HN', 'BZ',  // Namibia, Botswana, Mozambique, Nicaragua, El Salvador, Panama, Honduras, Belize
  // Special codes that work
  'ENG',  // England
]);

/**
 * Check if a flag URL is valid (exists on FIVB servers)
 * Uses static whitelist to avoid network requests entirely for performance
 * @param countryCode - Country or federation code
 * @returns Promise<boolean> - True if flag exists
 */
export async function validateFlagExists(countryCode: string): Promise<boolean> {
  if (!countryCode) return false;
  
  const cacheKey = countryCode.toUpperCase();
  
  // Check cache first (for any previously validated codes)
  if (flagValidationCache.has(cacheKey)) {
    return flagValidationCache.get(cacheKey)!;
  }
  
  // Check known missing flags first (fastest path)
  if (KNOWN_MISSING_FLAGS.has(cacheKey)) {
    flagValidationCache.set(cacheKey, false);
    return false;
  }
  
  // Check known working flags (static whitelist)
  if (KNOWN_WORKING_FLAGS.has(cacheKey)) {
    flagValidationCache.set(cacheKey, true);
    return true;
  }
  
  // For any unknown codes, try to convert federation codes to ISO
  const convertedCode = FEDERATION_TO_COUNTRY_MAP[cacheKey];
  if (convertedCode && KNOWN_WORKING_FLAGS.has(convertedCode)) {
    flagValidationCache.set(cacheKey, true);
    return true;
  }
  
  // **PRODUCTION SAFETY**: Don't make network requests for unknown codes
  // This prevents the 404 spam we're seeing
  if (process.env.NODE_ENV === 'production' || process.env.NODE_ENV === 'development') {
    // Assume unknown codes don't exist to avoid network requests
    flagValidationCache.set(cacheKey, false);
    KNOWN_MISSING_FLAGS.add(cacheKey);
    return false;
  }
  
  // Only in test environments, make actual network requests
  try {
    const url = getFlagUrl(countryCode);
    const response = await fetch(url, { 
      method: 'HEAD',
      cache: 'force-cache',
      signal: AbortSignal.timeout(1000) // Short timeout
    });
    
    const exists = response.ok;
    flagValidationCache.set(cacheKey, exists);
    
    if (!exists) {
      KNOWN_MISSING_FLAGS.add(cacheKey);
    } else {
      KNOWN_WORKING_FLAGS.add(cacheKey);
    }
    
    return exists;
  } catch {
    flagValidationCache.set(cacheKey, false);
    KNOWN_MISSING_FLAGS.add(cacheKey);
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