/**
 * Tournament Timezone Mapping Utility
 * Maps tournament locations (city + country) to IANA timezone identifiers
 * Based on VIS API Tournament/Event location data
 */

import { DateTime } from "luxon";

/**
 * City+Country to IANA timezone mapping
 * Key format: "City|Country" or "City|CountryCode"
 */
const CITY_TIMEZONE_MAP: Record<string, string> = {
  // Italy
  "Rome|Italy": "Europe/Rome",
  "Roma|Italy": "Europe/Rome",
  "Milano|Italy": "Europe/Rome",
  "Milan|Italy": "Europe/Rome",
  "Jesolo|Italy": "Europe/Rome",
  "Rimini|Italy": "Europe/Rome",
  "Caorle|Italy": "Europe/Rome",
  "Lignano|Italy": "Europe/Rome",
  "Rome|IT": "Europe/Rome",
  "Roma|IT": "Europe/Rome",
  "Milano|IT": "Europe/Rome",
  "Milan|IT": "Europe/Rome",
  "Jesolo|IT": "Europe/Rome",
  "Rimini|IT": "Europe/Rome",
  "Caorle|IT": "Europe/Rome",
  "Lignano|IT": "Europe/Rome",

  // Brazil - Different regions
  "Rio de Janeiro|Brazil": "America/Sao_Paulo",
  "Rio|Brazil": "America/Sao_Paulo",
  "São Paulo|Brazil": "America/Sao_Paulo",
  "Sao Paulo|Brazil": "America/Sao_Paulo",
  "Brasília|Brazil": "America/Sao_Paulo",
  "Brasilia|Brazil": "America/Sao_Paulo",
  "Salvador|Brazil": "America/Bahia",
  "Fortaleza|Brazil": "America/Fortaleza",
  "Recife|Brazil": "America/Recife",
  "Manaus|Brazil": "America/Manaus",
  "Belém|Brazil": "America/Belem",
  "Belem|Brazil": "America/Belem",
  "Rio de Janeiro|BR": "America/Sao_Paulo",
  "Rio|BR": "America/Sao_Paulo",
  "São Paulo|BR": "America/Sao_Paulo",
  "Sao Paulo|BR": "America/Sao_Paulo",
  "Brasília|BR": "America/Sao_Paulo",
  "Brasilia|BR": "America/Sao_Paulo",
  "Salvador|BR": "America/Bahia",
  "Fortaleza|BR": "America/Fortaleza",

  // Qatar
  "Doha|Qatar": "Asia/Qatar",
  "Doha|QA": "Asia/Qatar",
  "Doha|QAT": "Asia/Qatar",

  // Germany
  "Berlin|Germany": "Europe/Berlin",
  "Munich|Germany": "Europe/Berlin",
  "München|Germany": "Europe/Berlin",
  "Hamburg|Germany": "Europe/Berlin",
  "Düsseldorf|Germany": "Europe/Berlin",
  "Berlin|DE": "Europe/Berlin",
  "Munich|DE": "Europe/Berlin",
  "München|DE": "Europe/Berlin",
  "Hamburg|DE": "Europe/Berlin",
  "Düsseldorf|DE": "Europe/Berlin",

  // France
  "Paris|France": "Europe/Paris",
  "Lyon|France": "Europe/Paris",
  "Marseille|France": "Europe/Paris",
  "Cannes|France": "Europe/Paris",
  "Nice|France": "Europe/Paris",
  "Paris|FR": "Europe/Paris",
  "Lyon|FR": "Europe/Paris",
  "Marseille|FR": "Europe/Paris",
  "Cannes|FR": "Europe/Paris",
  "Nice|FR": "Europe/Paris",

  // Spain
  "Madrid|Spain": "Europe/Madrid",
  "Barcelona|Spain": "Europe/Madrid",
  "Valencia|Spain": "Europe/Madrid",
  "Seville|Spain": "Europe/Madrid",
  "Madrid|ES": "Europe/Madrid",
  "Barcelona|ES": "Europe/Madrid",
  "Valencia|ES": "Europe/Madrid",
  "Seville|ES": "Europe/Madrid",

  // Netherlands
  "Amsterdam|Netherlands": "Europe/Amsterdam",
  "The Hague|Netherlands": "Europe/Amsterdam",
  "Rotterdam|Netherlands": "Europe/Amsterdam",
  "Amsterdam|NL": "Europe/Amsterdam",
  "The Hague|NL": "Europe/Amsterdam",
  "Rotterdam|NL": "Europe/Amsterdam",

  // Austria
  "Vienna|Austria": "Europe/Vienna",
  "Salzburg|Austria": "Europe/Vienna",
  "Innsbruck|Austria": "Europe/Vienna",
  "Baden|Austria": "Europe/Vienna",
  "Vienna|AT": "Europe/Vienna",
  "Salzburg|AT": "Europe/Vienna",
  "Innsbruck|AT": "Europe/Vienna",
  "Baden|AT": "Europe/Vienna",

  // Switzerland
  "Zurich|Switzerland": "Europe/Zurich",
  "Geneva|Switzerland": "Europe/Zurich",
  "Basel|Switzerland": "Europe/Zurich",
  "Gstaad|Switzerland": "Europe/Zurich",
  "Zurich|CH": "Europe/Zurich",
  "Geneva|CH": "Europe/Zurich",
  "Basel|CH": "Europe/Zurich",
  "Gstaad|CH": "Europe/Zurich",

  // Norway
  "Oslo|Norway": "Europe/Oslo",
  "Bergen|Norway": "Europe/Oslo",
  "Stavanger|Norway": "Europe/Oslo",
  "Oslo|NO": "Europe/Oslo",
  "Bergen|NO": "Europe/Oslo",
  "Stavanger|NO": "Europe/Oslo",

  // Poland
  "Warsaw|Poland": "Europe/Warsaw",
  "Krakow|Poland": "Europe/Warsaw",
  "Gdansk|Poland": "Europe/Warsaw",
  "Warsaw|PL": "Europe/Warsaw",
  "Krakow|PL": "Europe/Warsaw",
  "Gdansk|PL": "Europe/Warsaw",

  // Turkey
  "Istanbul|Turkey": "Europe/Istanbul",
  "Ankara|Turkey": "Europe/Istanbul",
  "Antalya|Turkey": "Europe/Istanbul",
  "Istanbul|TR": "Europe/Istanbul",
  "Ankara|TR": "Europe/Istanbul",
  "Antalya|TR": "Europe/Istanbul",

  // Japan
  "Tokyo|Japan": "Asia/Tokyo",
  "Osaka|Japan": "Asia/Tokyo",
  "Kyoto|Japan": "Asia/Tokyo",
  "Tokyo|JP": "Asia/Tokyo",
  "Osaka|JP": "Asia/Tokyo",
  "Kyoto|JP": "Asia/Tokyo",

  // Philippines
  "Manila|Philippines": "Asia/Manila",
  "Cebu|Philippines": "Asia/Manila",
  "Davao|Philippines": "Asia/Manila",
  "Boracay|Philippines": "Asia/Manila",
  "Manila|PH": "Asia/Manila",
  "Cebu|PH": "Asia/Manila",
  "Davao|PH": "Asia/Manila",
  "Boracay|PH": "Asia/Manila",

  // China
  "Beijing|China": "Asia/Shanghai",
  "Shanghai|China": "Asia/Shanghai",
  "Guangzhou|China": "Asia/Shanghai",
  "Shenzhen|China": "Asia/Shanghai",
  "Beijing|CN": "Asia/Shanghai",
  "Shanghai|CN": "Asia/Shanghai",
  "Guangzhou|CN": "Asia/Shanghai",
  "Shenzhen|CN": "Asia/Shanghai",

  // Singapore
  "Singapore|Singapore": "Asia/Singapore",
  "Singapore|SG": "Asia/Singapore",

  // Thailand
  "Bangkok|Thailand": "Asia/Bangkok",
  "Phuket|Thailand": "Asia/Bangkok",
  "Pattaya|Thailand": "Asia/Bangkok",
  "Bangkok|TH": "Asia/Bangkok",
  "Phuket|TH": "Asia/Bangkok",
  "Pattaya|TH": "Asia/Bangkok",

  // Indonesia
  "Jakarta|Indonesia": "Asia/Jakarta",
  "Bali|Indonesia": "Asia/Makassar",
  "Denpasar|Indonesia": "Asia/Makassar",
  "Jakarta|ID": "Asia/Jakarta",
  "Bali|ID": "Asia/Makassar",
  "Denpasar|ID": "Asia/Makassar",

  // Malaysia
  "Kuala Lumpur|Malaysia": "Asia/Kuala_Lumpur",
  "Kuala Lumpur|MY": "Asia/Kuala_Lumpur",

  // South Korea
  "Seoul|South Korea": "Asia/Seoul",
  "Busan|South Korea": "Asia/Seoul",
  "Seoul|KR": "Asia/Seoul",
  "Busan|KR": "Asia/Seoul",

  // UAE
  "Dubai|United Arab Emirates": "Asia/Dubai",
  "Abu Dhabi|United Arab Emirates": "Asia/Dubai",
  "Dubai|UAE": "Asia/Dubai",
  "Abu Dhabi|UAE": "Asia/Dubai",
  "Dubai|AE": "Asia/Dubai",
  "Abu Dhabi|AE": "Asia/Dubai",

  // Israel
  "Tel Aviv|Israel": "Asia/Jerusalem",
  "Jerusalem|Israel": "Asia/Jerusalem",
  "Tel Aviv|IL": "Asia/Jerusalem",
  "Jerusalem|IL": "Asia/Jerusalem",

  // Australia
  "Sydney|Australia": "Australia/Sydney",
  "Melbourne|Australia": "Australia/Melbourne",
  "Brisbane|Australia": "Australia/Brisbane",
  "Perth|Australia": "Australia/Perth",
  "Adelaide|Australia": "Australia/Adelaide",
  "Gold Coast|Australia": "Australia/Brisbane",
  "Sydney|AU": "Australia/Sydney",
  "Melbourne|AU": "Australia/Melbourne",
  "Brisbane|AU": "Australia/Brisbane",
  "Perth|AU": "Australia/Perth",
  "Adelaide|AU": "Australia/Adelaide",
  "Gold Coast|AU": "Australia/Brisbane",

  // Canada
  "Toronto|Canada": "America/Toronto",
  "Montreal|Canada": "America/Montreal",
  "Vancouver|Canada": "America/Vancouver",
  "Calgary|Canada": "America/Edmonton",
  "Ottawa|Canada": "America/Toronto",
  "Toronto|CA": "America/Toronto",
  "Montreal|CA": "America/Montreal",
  "Vancouver|CA": "America/Vancouver",
  "Calgary|CA": "America/Edmonton",
  "Ottawa|CA": "America/Toronto",

  // United States
  "New York|United States": "America/New_York",
  "Los Angeles|United States": "America/Los_Angeles",
  "Chicago|United States": "America/Chicago",
  "Miami|United States": "America/New_York",
  "San Francisco|United States": "America/Los_Angeles",
  "Las Vegas|United States": "America/Los_Angeles",
  "Phoenix|United States": "America/Phoenix",
  "Manhattan Beach|United States": "America/Los_Angeles",
  "Hermosa Beach|United States": "America/Los_Angeles",
  "Virginia Beach|United States": "America/New_York",
  "New York|USA": "America/New_York",
  "Los Angeles|USA": "America/Los_Angeles",
  "Chicago|USA": "America/Chicago",
  "Miami|USA": "America/New_York",
  "San Francisco|USA": "America/Los_Angeles",
  "Las Vegas|USA": "America/Los_Angeles",
  "Phoenix|USA": "America/Phoenix",
  "Manhattan Beach|USA": "America/Los_Angeles",
  "Hermosa Beach|USA": "America/Los_Angeles",
  "Virginia Beach|USA": "America/New_York",
  "New York|US": "America/New_York",
  "Los Angeles|US": "America/Los_Angeles",
  "Chicago|US": "America/Chicago",
  "Miami|US": "America/New_York",
  "San Francisco|US": "America/Los_Angeles",
  "Las Vegas|US": "America/Los_Angeles",
  "Phoenix|US": "America/Phoenix",
  "Manhattan Beach|US": "America/Los_Angeles",
  "Hermosa Beach|US": "America/Los_Angeles",
  "Virginia Beach|US": "America/New_York",

  // Mexico
  "Mexico City|Mexico": "America/Mexico_City",
  "Cancun|Mexico": "America/Cancun",
  "Guadalajara|Mexico": "America/Mexico_City",
  "Acapulco|Mexico": "America/Mexico_City",
  "Mexico City|MX": "America/Mexico_City",
  "Cancun|MX": "America/Cancun",
  "Guadalajara|MX": "America/Mexico_City",
  "Acapulco|MX": "America/Mexico_City",

  // Argentina
  "Buenos Aires|Argentina": "America/Argentina/Buenos_Aires",
  "Buenos Aires|AR": "America/Argentina/Buenos_Aires",

  // More European countries...
  "London|United Kingdom": "Europe/London",
  "London|UK": "Europe/London",
  "London|GB": "Europe/London",

  "Prague|Czech Republic": "Europe/Prague",
  "Prague|CZ": "Europe/Prague",

  "Budapest|Hungary": "Europe/Budapest",
  "Budapest|HU": "Europe/Budapest",

  "Stockholm|Sweden": "Europe/Stockholm",
  "Stockholm|SE": "Europe/Stockholm",

  "Helsinki|Finland": "Europe/Helsinki",
  "Helsinki|FI": "Europe/Helsinki",

  "Copenhagen|Denmark": "Europe/Copenhagen",
  "Copenhagen|DK": "Europe/Copenhagen",

  "Brussels|Belgium": "Europe/Brussels",
  "Brussels|BE": "Europe/Brussels",

  "Lisbon|Portugal": "Europe/Lisbon",
  "Espinho|Portugal": "Europe/Lisbon",
  "Lisbon|PT": "Europe/Lisbon",
  "Espinho|PT": "Europe/Lisbon",
};

/**
 * Country-only fallback timezone mapping
 */
const COUNTRY_TIMEZONE_MAP: Record<string, string> = {
  "Italy": "Europe/Rome",
  "IT": "Europe/Rome",
  "ITA": "Europe/Rome",

  "Brazil": "America/Sao_Paulo", // Default to São Paulo timezone
  "BR": "America/Sao_Paulo",
  "BRA": "America/Sao_Paulo",

  "Germany": "Europe/Berlin",
  "DE": "Europe/Berlin",
  "DEU": "Europe/Berlin",

  "France": "Europe/Paris",
  "FR": "Europe/Paris",
  "FRA": "Europe/Paris",

  "Spain": "Europe/Madrid",
  "ES": "Europe/Madrid",
  "ESP": "Europe/Madrid",

  "Qatar": "Asia/Qatar",
  "QA": "Asia/Qatar",
  "QAT": "Asia/Qatar",

  "Netherlands": "Europe/Amsterdam",
  "NL": "Europe/Amsterdam",
  "NLD": "Europe/Amsterdam",

  "Austria": "Europe/Vienna",
  "AT": "Europe/Vienna",
  "AUT": "Europe/Vienna",

  "Switzerland": "Europe/Zurich",
  "CH": "Europe/Zurich",
  "CHE": "Europe/Zurich",

  "Norway": "Europe/Oslo",
  "NO": "Europe/Oslo",
  "NOR": "Europe/Oslo",

  "Poland": "Europe/Warsaw",
  "PL": "Europe/Warsaw",
  "POL": "Europe/Warsaw",

  "Turkey": "Europe/Istanbul",
  "TR": "Europe/Istanbul",
  "TUR": "Europe/Istanbul",

  "Japan": "Asia/Tokyo",
  "JP": "Asia/Tokyo",
  "JPN": "Asia/Tokyo",

  "Philippines": "Asia/Manila",
  "PH": "Asia/Manila",
  "PHL": "Asia/Manila",

  "China": "Asia/Shanghai",
  "CN": "Asia/Shanghai",
  "CHN": "Asia/Shanghai",

  "Singapore": "Asia/Singapore",
  "SG": "Asia/Singapore",
  "SGP": "Asia/Singapore",

  "Thailand": "Asia/Bangkok",
  "TH": "Asia/Bangkok",
  "THA": "Asia/Bangkok",

  "Indonesia": "Asia/Jakarta",
  "ID": "Asia/Jakarta",
  "IDN": "Asia/Jakarta",

  "Malaysia": "Asia/Kuala_Lumpur",
  "MY": "Asia/Kuala_Lumpur",
  "MYS": "Asia/Kuala_Lumpur",

  "South Korea": "Asia/Seoul",
  "Korea": "Asia/Seoul",
  "KR": "Asia/Seoul",
  "KOR": "Asia/Seoul",

  "United Arab Emirates": "Asia/Dubai",
  "UAE": "Asia/Dubai",
  "AE": "Asia/Dubai",

  "Israel": "Asia/Jerusalem",
  "IL": "Asia/Jerusalem",
  "ISR": "Asia/Jerusalem",

  "Australia": "Australia/Sydney", // Default to Sydney
  "AU": "Australia/Sydney",
  "AUS": "Australia/Sydney",

  "Canada": "America/Toronto", // Default to Toronto
  "CA": "America/Toronto",
  "CAN": "America/Toronto",

  "United States": "America/New_York", // Default to Eastern
  "USA": "America/New_York",
  "US": "America/New_York",

  "Mexico": "America/Mexico_City",
  "MX": "America/Mexico_City",
  "MEX": "America/Mexico_City",

  "Argentina": "America/Argentina/Buenos_Aires",
  "AR": "America/Argentina/Buenos_Aires",
  "ARG": "America/Argentina/Buenos_Aires",

  "United Kingdom": "Europe/London",
  "UK": "Europe/London",
  "GB": "Europe/London",

  "Czech Republic": "Europe/Prague",
  "CZ": "Europe/Prague",

  "Hungary": "Europe/Budapest",
  "HU": "Europe/Budapest",

  "Sweden": "Europe/Stockholm",
  "SE": "Europe/Stockholm",

  "Finland": "Europe/Helsinki",
  "FI": "Europe/Helsinki",

  "Denmark": "Europe/Copenhagen",
  "DK": "Europe/Copenhagen",

  "Belgium": "Europe/Brussels",
  "BE": "Europe/Brussels",

  "Portugal": "Europe/Lisbon",
  "PT": "Europe/Lisbon",
};

/**
 * Tournament location data from VIS API
 */
export interface TournamentLocation {
  city?: string;
  country?: string;
  countryCode?: string;
  venue?: string;
  name?: string;
}

/**
 * Result of timezone detection with confidence level
 */
export interface TimezoneDetectionResult {
  timezone: string;
  confidence: 'high' | 'medium' | 'low';
  source: 'city_country' | 'city_only' | 'country_only' | 'fallback';
  detectedFrom: string;
}

/**
 * Detect tournament timezone based on location data
 *
 * @param location - Tournament location data
 * @returns Timezone detection result
 */
export function detectTournamentTimezone(location: TournamentLocation): TimezoneDetectionResult {
  const { city, country, countryCode, venue, name } = location;

  // Normalize inputs
  const normalizedCity = (city || venue || "").trim();
  const normalizedCountry = (country || countryCode || "").trim();

  // High confidence: City + Country match
  if (normalizedCity && normalizedCountry) {
    const cityCountryKey = `${normalizedCity}|${normalizedCountry}`;
    const timezone = CITY_TIMEZONE_MAP[cityCountryKey];

    if (timezone) {
      return {
        timezone,
        confidence: 'high',
        source: 'city_country',
        detectedFrom: cityCountryKey
      };
    }

    // Try with different country formats
    if (country && countryCode) {
      const altKey = `${normalizedCity}|${countryCode}`;
      const altTimezone = CITY_TIMEZONE_MAP[altKey];

      if (altTimezone) {
        return {
          timezone: altTimezone,
          confidence: 'high',
          source: 'city_country',
          detectedFrom: altKey
        };
      }
    }
  }

  // Medium confidence: Country only
  if (normalizedCountry) {
    const timezone = COUNTRY_TIMEZONE_MAP[normalizedCountry];

    if (timezone) {
      return {
        timezone,
        confidence: 'medium',
        source: 'country_only',
        detectedFrom: normalizedCountry
      };
    }
  }

  // Low confidence: Tournament name-based heuristics
  if (name) {
    const lowerName = name.toLowerCase();

    // Brazil-specific tournament name checks
    if (lowerName.includes('brazil') || lowerName.includes('rio') || lowerName.includes('copacabana')) {
      return {
        timezone: 'America/Sao_Paulo',
        confidence: 'low',
        source: 'city_only',
        detectedFrom: `tournament_name:${name}`
      };
    }

    // Italy-specific tournament name checks
    if (lowerName.includes('italy') || lowerName.includes('rome') || lowerName.includes('milan')) {
      return {
        timezone: 'Europe/Rome',
        confidence: 'low',
        source: 'city_only',
        detectedFrom: `tournament_name:${name}`
      };
    }

    // Qatar-specific tournament name checks
    if (lowerName.includes('qatar') || lowerName.includes('doha')) {
      return {
        timezone: 'Asia/Qatar',
        confidence: 'low',
        source: 'city_only',
        detectedFrom: `tournament_name:${name}`
      };
    }
  }

  // Fallback to UTC
  return {
    timezone: 'UTC',
    confidence: 'low',
    source: 'fallback',
    detectedFrom: 'no_location_data'
  };
}

/**
 * Convert local tournament time to UTC using detected timezone
 *
 * @param localDate - Local date string (YYYY-MM-DD)
 * @param localTime - Local time string (HH:mm or HH:mm:ss)
 * @param tournamentLocation - Tournament location data
 * @returns UTC ISO string or null if conversion fails
 */
export function convertTournamentTimeToUTC(
  localDate: string,
  localTime: string,
  tournamentLocation: TournamentLocation
): { utcIso: string; detection: TimezoneDetectionResult } | null {
  try {
    // Ensure time format includes seconds
    const normalizedTime = /^\d{2}:\d{2}$/.test(localTime) ? `${localTime}:00` : localTime;

    // Detect timezone
    const detection = detectTournamentTimezone(tournamentLocation);

    // Parse local date/time in detected timezone
    const localDateTime = DateTime.fromISO(`${localDate}T${normalizedTime}`, {
      zone: detection.timezone
    });

    if (!localDateTime.isValid) {
      console.error('Invalid local date/time:', { localDate, localTime, timezone: detection.timezone });
      return null;
    }

    // Convert to UTC
    const utcDateTime = localDateTime.toUTC();

    return {
      utcIso: utcDateTime.toISO(),
      detection
    };

  } catch (error) {
    console.error('Error converting tournament time to UTC:', error);
    return null;
  }
}

/**
 * Convert UTC time to user's local timezone
 *
 * @param utcIso - UTC ISO string
 * @param userTimezone - User's timezone (defaults to browser timezone)
 * @returns Local time formatted as HH:mm
 */
export function convertUTCToUserTime(utcIso: string, userTimezone?: string): string {
  try {
    const userTz = userTimezone || Intl.DateTimeFormat().resolvedOptions().timeZone;

    const utcDateTime = DateTime.fromISO(utcIso, { zone: 'utc' });

    if (!utcDateTime.isValid) {
      console.error('Invalid UTC ISO string:', utcIso);
      return DateTime.fromISO(utcIso).toFormat('HH:mm'); // Fallback
    }

    const localDateTime = utcDateTime.setZone(userTz);
    return localDateTime.toFormat('HH:mm');

  } catch (error) {
    console.error('Error converting UTC to user time:', error);
    return DateTime.fromISO(utcIso).toFormat('HH:mm'); // Fallback
  }
}

/**
 * Complete timezone conversion: Tournament local time → UTC → User time
 * This is the main function for "My Time" calculation
 *
 * @param localDate - Tournament local date (YYYY-MM-DD)
 * @param localTime - Tournament local time (HH:mm or HH:mm:ss)
 * @param tournamentLocation - Tournament location data
 * @param userTimezone - User's timezone (optional, defaults to browser)
 * @returns User's local time as HH:mm with timezone detection info
 */
export function calculateMyTime(
  localDate: string,
  localTime: string,
  tournamentLocation: TournamentLocation,
  userTimezone?: string
): {
  myTime: string;
  utcTime: string;
  detection: TimezoneDetectionResult
} | null {
  try {
    // Step 1: Convert tournament local time to UTC
    const utcResult = convertTournamentTimeToUTC(localDate, localTime, tournamentLocation);

    if (!utcResult) {
      return null;
    }

    // Step 2: Convert UTC to user's time
    const myTime = convertUTCToUserTime(utcResult.utcIso, userTimezone);

    return {
      myTime,
      utcTime: utcResult.utcIso,
      detection: utcResult.detection
    };

  } catch (error) {
    console.error('Error calculating My Time:', error);
    return null;
  }
}