/**
 * Country utilities for flag display and country code handling
 * Supports both 2-letter ISO codes and 3-letter FIVB/volleyball codes
 */

/**
 * Enhanced country code to name mapping
 * Includes common volleyball tournament countries and various code formats
 */
export const COUNTRY_NAMES: Record<string, string> = {
  // Major volleyball countries
  'BRA': 'Brazil',
  'BR': 'Brazil',
  'USA': 'United States',
  'US': 'United States',
  'GER': 'Germany', 
  'DE': 'Germany',
  'ITA': 'Italy',
  'IT': 'Italy',
  'FRA': 'France',
  'FR': 'France',
  'AUS': 'Australia',
  'AU': 'Australia',
  'NED': 'Netherlands',
  'NL': 'Netherlands',
  'CAN': 'Canada',
  'CA': 'Canada',
  'JPN': 'Japan',
  'JP': 'Japan',
  'CHN': 'China',
  'CN': 'China',
  'POL': 'Poland',
  'PL': 'Poland',
  'RUS': 'Russia',
  'RU': 'Russia',
  'ESP': 'Spain',
  'ES': 'Spain',
  'NOR': 'Norway',
  'NO': 'Norway',
  'SWE': 'Sweden',
  'SE': 'Sweden',
  'FIN': 'Finland',
  'FI': 'Finland',
  'DEN': 'Denmark',
  'DK': 'Denmark',
  'SUI': 'Switzerland',
  'CH': 'Switzerland',
  'AUT': 'Austria',
  'AT': 'Austria',
  'BEL': 'Belgium',
  'BE': 'Belgium',
  'POR': 'Portugal',
  'PT': 'Portugal',
  'GRE': 'Greece',
  'GR': 'Greece',
  'TUR': 'Turkey',
  'TR': 'Turkey',
  'CZE': 'Czech Republic',
  'CZ': 'Czech Republic',
  'SVK': 'Slovakia',
  'SK': 'Slovakia',
  'HUN': 'Hungary',
  'HU': 'Hungary',
  'CRO': 'Croatia',
  'HR': 'Croatia',
  'SLO': 'Slovenia',
  'SI': 'Slovenia',
  'SRB': 'Serbia',
  'RS': 'Serbia',
  'UKR': 'Ukraine',
  'UA': 'Ukraine',
  'LAT': 'Latvia',
  'LV': 'Latvia',
  'LTU': 'Lithuania',
  'LT': 'Lithuania',
  'EST': 'Estonia',
  'EE': 'Estonia',
  'ARG': 'Argentina',
  'AR': 'Argentina',
  'CHI': 'Chile',
  'CL': 'Chile',
  'PER': 'Peru',
  'PE': 'Peru',
  'COL': 'Colombia',
  'CO': 'Colombia',
  'VEN': 'Venezuela',
  'VE': 'Venezuela',
  'MEX': 'Mexico',
  'MX': 'Mexico',
  'KOR': 'South Korea',
  'KR': 'South Korea',
  'THA': 'Thailand',
  'TH': 'Thailand',
  'MAS': 'Malaysia',
  'MY': 'Malaysia',
  'IND': 'India',
  'IN': 'India',
  'PHI': 'Philippines',
  'PH': 'Philippines',
  'INA': 'Indonesia',
  'ID': 'Indonesia',
  'VIE': 'Vietnam',
  'VN': 'Vietnam',
  'SIN': 'Singapore',
  'SG': 'Singapore',
  'EGY': 'Egypt',
  'EG': 'Egypt',
  'RSA': 'South Africa',
  'ZA': 'South Africa',
  'MAR': 'Morocco',
  'MA': 'Morocco',
  'TUN': 'Tunisia',
  'TN': 'Tunisia',
  'ALG': 'Algeria',
  'DZ': 'Algeria',
  'ISR': 'Israel',
  'IL': 'Israel',
  'UAE': 'United Arab Emirates',
  'AE': 'United Arab Emirates',
  'QAT': 'Qatar',
  'QA': 'Qatar',
  'KUW': 'Kuwait',
  'KW': 'Kuwait',
  'JOR': 'Jordan',
  'JO': 'Jordan',
  'LEB': 'Lebanon',
  'LB': 'Lebanon',
  'GBR': 'United Kingdom',
  'GB': 'United Kingdom',
  'IRL': 'Ireland',
  'IE': 'Ireland',
  'ISL': 'Iceland',
  'IS': 'Iceland'
};

/**
 * 3-letter to 2-letter country code mapping for flag services
 * Maps FIVB/volleyball codes to ISO 2-letter codes used by flag services
 */
export const COUNTRY_CODE_MAP: Record<string, string> = {
  'BRA': 'br',
  'USA': 'us', 
  'GER': 'de',
  'ITA': 'it',
  'FRA': 'fr',
  'AUS': 'au',
  'NED': 'nl',
  'CAN': 'ca',
  'JPN': 'jp',
  'CHN': 'cn',
  'POL': 'pl',
  'RUS': 'ru',
  'ESP': 'es',
  'NOR': 'no',
  'SWE': 'se',
  'FIN': 'fi',
  'DEN': 'dk',
  'SUI': 'ch',
  'AUT': 'at',
  'BEL': 'be',
  'POR': 'pt',
  'GRE': 'gr',
  'TUR': 'tr',
  'CZE': 'cz',
  'SVK': 'sk',
  'HUN': 'hu',
  'CRO': 'hr',
  'SLO': 'si',
  'SRB': 'rs',
  'UKR': 'ua',
  'LAT': 'lv',
  'LTU': 'lt',
  'EST': 'ee',
  'ARG': 'ar',
  'CHI': 'cl',
  'PER': 'pe',
  'COL': 'co',
  'VEN': 've',
  'MEX': 'mx',
  'KOR': 'kr',
  'THA': 'th',
  'MAS': 'my',
  'IND': 'in',
  'PHI': 'ph',
  'INA': 'id',
  'VIE': 'vn',
  'SIN': 'sg',
  'EGY': 'eg',
  'RSA': 'za',
  'MAR': 'ma',
  'TUN': 'tn',
  'ALG': 'dz',
  'ISR': 'il',
  'UAE': 'ae',
  'QAT': 'qa',
  'KUW': 'kw',
  'JOR': 'jo',
  'LEB': 'lb',
  'GBR': 'gb',
  'IRL': 'ie',
  'ISL': 'is'
};

/**
 * Get country name from country code
 * Supports both 2-letter and 3-letter country codes
 * @param countryCode - Country code (2 or 3 letters)
 * @returns Full country name or the original code if not found
 */
export function getCountryName(countryCode: string): string {
  if (!countryCode || typeof countryCode !== 'string') {
    return countryCode || '';
  }
  
  const normalizedCode = countryCode.toUpperCase().trim();
  return COUNTRY_NAMES[normalizedCode] || countryCode;
}

/**
 * Normalize country code to 2-letter lowercase for flag services
 * @param countryCode - Input country code (2 or 3 letters)
 * @returns 2-letter lowercase country code for flag URLs
 */
export function normalizeCountryCodeForFlag(countryCode: string): string {
  if (!countryCode || typeof countryCode !== 'string') {
    return '';
  }
  
  const normalizedCode = countryCode.toUpperCase().trim();
  
  // If it's already a 2-letter code, return lowercase
  if (normalizedCode.length === 2) {
    return normalizedCode.toLowerCase();
  }
  
  // If it's a 3-letter code, map to 2-letter
  if (normalizedCode.length === 3) {
    return COUNTRY_CODE_MAP[normalizedCode] || normalizedCode.slice(0, 2).toLowerCase();
  }
  
  // Fallback: take first 2 characters
  return normalizedCode.slice(0, 2).toLowerCase();
}

/**
 * Validate country code format
 * @param code - Country code to validate
 * @returns true if code appears to be valid format
 */
export function validateCountryCode(code: string): boolean {
  if (!code || typeof code !== 'string') {
    return false;
  }
  
  const trimmedCode = code.trim();
  
  // Valid: 2-letter or 3-letter codes with only alphabetic characters
  return /^[A-Za-z]{2,3}$/.test(trimmedCode);
}

/**
 * Generate flag URL from country code
 * @param countryCode - Country code (2 or 3 letters)
 * @param size - Flag size (w20, w40, w80) - default w20
 * @returns Flag URL or empty string for invalid codes
 */
export function generateFlagUrl(countryCode: string, size: string = 'w20'): string {
  if (!validateCountryCode(countryCode)) {
    return '';
  }
  
  const flagCode = normalizeCountryCodeForFlag(countryCode);
  if (!flagCode) {
    return '';
  }
  
  return `https://flagcdn.com/${size}/${flagCode}.png`;
}

/**
 * Generate local flag asset path
 * @param countryCode - Country code (2 or 3 letters)
 * @returns Local flag asset path
 */
export function getLocalFlagPath(countryCode: string): string {
  if (!validateCountryCode(countryCode)) {
    return '';
  }
  
  const flagCode = normalizeCountryCodeForFlag(countryCode);
  if (!flagCode) {
    return '';
  }
  
  return `/flags/${flagCode}.png`;
}

/**
 * Check if country code is supported by the mapping
 * @param countryCode - Country code to check
 * @returns true if country is in our mapping
 */
export function isCountrySupported(countryCode: string): boolean {
  if (!countryCode || typeof countryCode !== 'string') {
    return false;
  }
  
  const normalizedCode = countryCode.toUpperCase().trim();
  return normalizedCode in COUNTRY_NAMES;
}