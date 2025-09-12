import { serve } from 'std/http/server.ts';
import { VisClient } from './vis-client.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Match DTO interface based on BeachMatchCore type
interface MatchDTO {
  id: string;
  visNo: string;
  tournamentCode: string;
  matchCode: string;
  round: string;
  phaseCode?: string;
  status: 'SCHEDULED' | 'RUNNING' | 'FINISHED' | 'INTERRUPTED' | 'CANCELLED' | 'POSTPONED' | 'TBD';
  court: {
    courtNumber: string;
    courtName?: string;
    surface?: string;
    location?: string;
  };
  scheduledDateTime: string;
  actualStartTime?: string;
  actualEndTime?: string;
  team1: {
    teamNumber: 1;
    teamName: string;
    player1Name: string;
    player2Name: string;
    countryCode?: string;
    ranking?: number;
  };
  team2: {
    teamNumber: 2;
    teamName: string;
    player1Name: string;
    player2Name: string;
    countryCode?: string;
    ranking?: number;
  };
  result?: {
    team1Sets: number;
    team2Sets: number;
    setScores: number[];
    duration?: number;
    winner?: 1 | 2;
    forfeit?: boolean;
  };
  refereeAssignments: {
    refereeId: string;
    refereeName: string;
    function: string;
    federationCode?: string;
    status: 'ASSIGNED' | 'CONFIRMED' | 'DECLINED' | 'PENDING';
  }[];
  notes?: string;
  weather?: string;
  importance?: 'LOW' | 'MEDIUM' | 'HIGH' | 'FINAL';
}

// Tournament DTO interface based on TournamentCore type
interface TournamentDTO {
  id: string;
  visNo: string;
  code: string;
  name: string;
  title?: string;
  gender: 'M' | 'W' | 'MIXED';
  tournamentType: 'FIVB' | 'BPT' | 'CEV' | 'LOCAL';
  dates: {
    startDate: string;
    endDate: string;
    startDateQualification?: string;
    startDateMainDraw?: string;
  };
  status: 'UPCOMING' | 'ACTIVE' | 'COMPLETED' | 'CANCELLED';
  city?: string;
  country?: string;
  countryCode?: string;
  location?: string;
  NoEvent?: string; // For referee API calls
}

// Referee DTO interface compatible with referee dashboard components
interface RefereeDTO {
  id: string;
  visRefereeNo: string;
  firstName?: string;
  lastName?: string;
  gender?: 'M' | 'F';
  federation?: string;
  birthdate?: string;
  // Assignment integration fields
  assignments?: {
    matchId: string;
    matchCode: string;
    tournamentCode: string;
    function: 'FIRST' | 'SECOND' | 'CHALLENGE';
    status: 'ASSIGNED' | 'CONFIRMED' | 'DECLINED' | 'PENDING';
    scheduledDateTime?: string;
    court?: string;
  }[];
}

// Error types for structured error handling
enum ErrorType {
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  VIS_API_ERROR = 'VIS_API_ERROR',
  NETWORK_ERROR = 'NETWORK_ERROR',
  INTERNAL_ERROR = 'INTERNAL_ERROR',
  RATE_LIMIT_ERROR = 'RATE_LIMIT_ERROR',
}

interface ErrorContext {
  type: ErrorType;
  message: string;
  details?: any;
  timestamp: string;
}

/**
 * Map VIS GetEventList XML response to TournamentDTO array
 */
function parseVisTournamentsXml(xmlResponse: string): TournamentDTO[] {
  const tournaments: TournamentDTO[] = [];
  
  try {
    // Basic security validation - prevent processing potentially malicious XML
    if (xmlResponse.length > 10 * 1024 * 1024) { // 10MB limit
      throw new Error('XML response too large');
    }
    
    if (xmlResponse.includes('<!ENTITY') || xmlResponse.includes('<!DOCTYPE')) {
      throw new Error('XML contains potentially dangerous entities or doctype declarations');
    }
    
    // Simple XML parsing - extract Event elements
    const eventMatches = xmlResponse.match(/<Event[^>]*>(.*?)<\/Event>/gs);
    
    if (!eventMatches) {
      return tournaments;
    }

    for (const eventXml of eventMatches) {
      try {
        const tournament = parseVisTournamentEvent(eventXml);
        if (tournament) {
          tournaments.push(tournament);
        }
      } catch (error) {
        console.warn('Failed to parse tournament event:', error.message);
        // Continue processing other tournaments
      }
    }
  } catch (error) {
    console.error('Failed to parse VIS tournaments XML:', error);
    throw new Error(`Invalid VIS XML response: ${error.message}`);
  }

  return tournaments;
}

// Pre-compiled regex cache for XML tag parsing performance
const XML_TAG_REGEX_CACHE = new Map<string, RegExp>();

/**
 * Parse individual Event XML element to TournamentDTO
 */
function parseVisTournamentEvent(eventXml: string): TournamentDTO | null {
  const getValue = (tagName: string): string | undefined => {
    let regex = XML_TAG_REGEX_CACHE.get(tagName);
    if (!regex) {
      regex = new RegExp(`<${tagName}[^>]*>([^<]*)<\/${tagName}>`, 'i');
      XML_TAG_REGEX_CACHE.set(tagName, regex);
    }
    const match = eventXml.match(regex);
    return match?.[1]?.trim() || undefined;
  };

  const getNumberValue = (tagName: string): string | undefined => {
    const value = getValue(tagName);
    return value && !isNaN(Number(value)) ? value : undefined;
  };

  // Extract required fields
  const visNo = getNumberValue('No');
  const code = getValue('Code');
  const name = getValue('Name') || getValue('Title');

  if (!visNo || !code || !name) {
    // Skip tournaments missing required fields
    return null;
  }

  // Extract dates
  const startDate = getValue('StartDate');
  const endDate = getValue('EndDate');
  const startDateQualification = getValue('StartDateQualification');
  const startDateMainDraw = getValue('StartDateMainDraw');

  // Validate and normalize gender
  const rawGender = getValue('Gender');
  let gender: 'M' | 'W' | 'MIXED' = 'M';
  if (rawGender === 'W' || rawGender === 'F') {
    gender = 'W';
  } else if (rawGender === 'MIXED' || rawGender === 'X') {
    gender = 'MIXED';
  }

  // Determine tournament type from code or name
  let tournamentType: 'FIVB' | 'BPT' | 'CEV' | 'LOCAL' = 'LOCAL';
  if (code.includes('FIVB') || name.includes('FIVB')) {
    tournamentType = 'FIVB';
  } else if (code.includes('BPT') || name.includes('Beach Pro Tour')) {
    tournamentType = 'BPT';
  } else if (code.includes('CEV') || name.includes('CEV')) {
    tournamentType = 'CEV';
  }

  // Determine status based on dates with defensive parsing
  let status: 'UPCOMING' | 'ACTIVE' | 'COMPLETED' | 'CANCELLED' = 'UPCOMING';
  if (startDate && endDate) {
    try {
      const now = new Date();
      const start = new Date(startDate);
      const end = new Date(endDate);
      
      // Validate parsed dates are valid
      if (!isNaN(start.getTime()) && !isNaN(end.getTime())) {
        if (now >= start && now <= end) {
          status = 'ACTIVE';
        } else if (now > end) {
          status = 'COMPLETED';
        }
      }
    } catch (error) {
      console.warn(`Failed to parse tournament dates for ${code}:`, error);
      // Keep default UPCOMING status
    }
  }

  return {
    id: `tournament-${visNo}`,
    visNo,
    code,
    name,
    title: getValue('Title'),
    gender,
    tournamentType,
    dates: {
      startDate: startDate || '', // Don't default to current date - leave empty if unknown
      endDate: endDate || '',
      startDateQualification,
      startDateMainDraw,
    },
    status,
    city: getValue('City'),
    country: getValue('Country'),
    countryCode: getValue('CountryCode'),
    location: getValue('Location'),
    NoEvent: getValue('NoEvent'),
  };
}

/**
 * Map VIS GetBeachMatchList XML response to MatchDTO array
 */
function parseVisMatchesXml(xmlResponse: string): MatchDTO[] {
  const matches: MatchDTO[] = [];
  
  try {
    // Basic security validation - prevent processing potentially malicious XML
    if (xmlResponse.length > 10 * 1024 * 1024) { // 10MB limit
      throw new Error('XML response too large');
    }
    
    if (xmlResponse.includes('<!ENTITY') || xmlResponse.includes('<!DOCTYPE')) {
      throw new Error('XML contains potentially dangerous entities or doctype declarations');
    }
    
    // Simple XML parsing - extract Match elements
    const matchMatches = xmlResponse.match(/<Match[^>]*>(.*?)<\/Match>/gs);
    
    if (!matchMatches) {
      return matches;
    }

    for (const matchXml of matchMatches) {
      try {
        const match = parseVisMatchEvent(matchXml);
        if (match) {
          matches.push(match);
        }
      } catch (error) {
        console.warn('Failed to parse match event:', error.message);
        // Continue processing other matches
      }
    }
  } catch (error) {
    console.error('Failed to parse VIS matches XML:', error);
    throw new Error(`Invalid VIS XML response: ${error.message}`);
  }

  return matches;
}

/**
 * Parse individual Match XML element to MatchDTO
 */
function parseVisMatchEvent(matchXml: string): MatchDTO | null {
  const getValue = (tagName: string): string | undefined => {
    let regex = XML_TAG_REGEX_CACHE.get(tagName);
    if (!regex) {
      regex = new RegExp(`<${tagName}[^>]*>([^<]*)<\/${tagName}>`, 'i');
      XML_TAG_REGEX_CACHE.set(tagName, regex);
    }
    const match = matchXml.match(regex);
    return match?.[1]?.trim() || undefined;
  };

  const getNumberValue = (tagName: string): string | undefined => {
    const value = getValue(tagName);
    return value && !isNaN(Number(value)) ? value : undefined;
  };

  // Extract required fields
  const visNo = getNumberValue('No');
  const tournamentCode = getValue('TournamentCode');
  const matchCode = getValue('Code');

  if (!visNo || !tournamentCode || !matchCode) {
    // Skip matches missing required fields
    return null;
  }

  // Extract match details
  const round = getValue('Round') || 'UNKNOWN';
  const phaseCode = getValue('Phase');
  const court = getValue('Court') || 'Unknown';
  const utcDateTime = getValue('UTCDateTime');
  const localDateTime = getValue('LocalDateTime');
  
  // Extract team data
  const team1Name = getValue('Team1');
  const team2Name = getValue('Team2');
  
  if (!team1Name || !team2Name) {
    console.warn(`Match ${matchCode} missing team data`);
    return null;
  }

  // Parse team names to extract player names (assuming format "Player1/Player2")
  const parseTeamPlayers = (teamName: string) => {
    const parts = teamName.split('/');
    return {
      player1Name: parts[0]?.trim() || teamName,
      player2Name: parts[1]?.trim() || '',
    };
  };

  const team1Players = parseTeamPlayers(team1Name);
  const team2Players = parseTeamPlayers(team2Name);

  // Map VIS match status
  const rawStatus = getValue('Status');
  let status: MatchDTO['status'] = 'SCHEDULED';
  
  if (rawStatus) {
    const statusLower = rawStatus.toLowerCase().trim();
    switch (statusLower) {
      case 'running':
      case 'live':
      case 'in_progress':
        status = 'RUNNING';
        break;
      case 'finished':
      case 'completed':
      case 'final':
        status = 'FINISHED';
        break;
      case 'interrupted':
      case 'suspended':
        status = 'INTERRUPTED';
        break;
      case 'cancelled':
      case 'canceled':
        status = 'CANCELLED';
        break;
      case 'postponed':
      case 'delayed':
        status = 'POSTPONED';
        break;
      case 'tbd':
      case 'to_be_determined':
        status = 'TBD';
        break;
    }
  }

  // Parse sets and result if available
  let result: MatchDTO['result'] | undefined;
  const setsData = getValue('Sets');
  const resultData = getValue('Result');
  
  if (setsData || resultData) {
    try {
      // Parse sets format like "21-19,19-21,15-13"
      const setScores: number[] = [];
      let team1Sets = 0;
      let team2Sets = 0;
      
      if (setsData) {
        const sets = setsData.split(',');
        for (const set of sets) {
          const scores = set.trim().split('-');
          if (scores.length === 2) {
            const score1 = parseInt(scores[0]);
            const score2 = parseInt(scores[1]);
            // Validate reasonable score ranges (beach volleyball scores)
            if (!isNaN(score1) && !isNaN(score2) && 
                score1 >= 0 && score1 <= 50 && 
                score2 >= 0 && score2 <= 50) {
              setScores.push(score1, score2);
              if (score1 > score2) team1Sets++;
              else if (score2 > score1) team2Sets++;
            }
          }
        }
      }

      if (setScores.length > 0) {
        result = {
          team1Sets,
          team2Sets,
          setScores,
          winner: team1Sets > team2Sets ? 1 : team2Sets > team1Sets ? 2 : undefined,
          forfeit: false, // Would need additional data to determine
        };
      }
    } catch (error) {
      console.warn(`Failed to parse match result for ${matchCode}:`, error);
      // Continue without result data
    }
  }

  // Parse referee assignments from Referees field if available
  const refereeAssignments: MatchDTO['refereeAssignments'] = [];
  const refereesData = getValue('Referees');
  
  if (refereesData) {
    try {
      // Parse referee format: "John Doe (FIRST), Jane Smith (SECOND)"
      const refereeMatches = refereesData.match(/([^(]+)\s*\(([^)]+)\)/g);
      if (refereeMatches) {
        refereeMatches.forEach((match, index) => {
          const parts = match.match(/([^(]+)\s*\(([^)]+)\)/);
          if (parts && parts[1] && parts[2]) {
            const refereeName = parts[1].trim();
            let function_ = parts[2].trim().toUpperCase();
            
            // Normalize referee function names
            switch (function_) {
              case '1ST':
              case 'FIRST':
              case '1':
                function_ = 'FIRST';
                break;
              case '2ND':
              case 'SECOND':
              case '2':
                function_ = 'SECOND';
                break;
              case 'CHALLENGE':
              case 'CHALLENGE REFEREE':
              case 'CR':
                function_ = 'CHALLENGE';
                break;
            }
            
            // Only add if we have valid name and function
            if (refereeName && function_) {
              refereeAssignments.push({
                refereeId: `ref-${visNo}-${index}`,
                refereeName,
                function: function_,
                federationCode: undefined, // Could be extracted from more detailed referee data
                status: 'ASSIGNED',
              });
            }
          }
        });
      }
    } catch (error) {
      console.warn(`Failed to parse referee assignments for ${matchCode}:`, error);
      // Continue without referee assignments
    }
  }

  // Determine match importance
  const roundLower = round.toLowerCase();
  let importance: MatchDTO['importance'] = 'MEDIUM';
  
  if (roundLower.includes('final') && !roundLower.includes('semi')) {
    importance = 'FINAL';
  } else if (roundLower.includes('semifinal') || roundLower.includes('semi-final')) {
    importance = 'HIGH';
  } else if (roundLower.includes('quarterfinal') || roundLower.includes('quarter-final') || 
             roundLower.includes('bronze') || roundLower.includes('medal')) {
    importance = 'HIGH';
  } else if (roundLower.includes('pool') || roundLower.includes('group')) {
    importance = 'LOW';
  }

  return {
    id: `match-${visNo}`,
    visNo,
    tournamentCode,
    matchCode,
    round,
    phaseCode,
    status,
    court: {
      courtNumber: court,
      courtName: court,
    },
    scheduledDateTime: utcDateTime || localDateTime || '',
    actualStartTime: status === 'RUNNING' || status === 'FINISHED' ? utcDateTime : undefined,
    actualEndTime: status === 'FINISHED' ? utcDateTime : undefined,
    team1: {
      teamNumber: 1,
      teamName: team1Name,
      player1Name: team1Players.player1Name,
      player2Name: team1Players.player2Name,
    },
    team2: {
      teamNumber: 2,
      teamName: team2Name,
      player1Name: team2Players.player1Name,
      player2Name: team2Players.player2Name,
    },
    result,
    refereeAssignments,
    importance,
  };
}

/**
 * Map VIS referee XML response to RefereeDTO array
 */
function parseVisRefereesXml(xmlResponse: string): RefereeDTO[] {
  const referees: RefereeDTO[] = [];
  
  try {
    // Basic security validation - prevent processing potentially malicious XML
    if (xmlResponse.length > 10 * 1024 * 1024) { // 10MB limit
      throw new Error('XML response too large');
    }
    
    if (xmlResponse.includes('<!ENTITY') || xmlResponse.includes('<!DOCTYPE')) {
      throw new Error('XML contains potentially dangerous entities or doctype declarations');
    }
    
    // Simple XML parsing - extract Referee elements
    const refereeMatches = xmlResponse.match(/<Referee[^>]*>(.*?)<\/Referee>/gs);
    
    if (!refereeMatches) {
      return referees;
    }

    for (const refereeXml of refereeMatches) {
      try {
        const referee = parseVisRefereeElement(refereeXml);
        if (referee) {
          referees.push(referee);
        }
      } catch (error) {
        console.warn('Failed to parse referee element:', error.message);
        // Continue processing other referees
      }
    }
  } catch (error) {
    console.error('Failed to parse VIS referees XML:', error);
    throw new Error(`Invalid VIS XML response: ${error.message}`);
  }

  return referees;
}

/**
 * Parse individual Referee XML element to RefereeDTO
 */
function parseVisRefereeElement(refereeXml: string): RefereeDTO | null {
  const getValue = (tagName: string): string | undefined => {
    let regex = XML_TAG_REGEX_CACHE.get(tagName);
    if (!regex) {
      regex = new RegExp(`<${tagName}[^>]*>([^<]*)<\/${tagName}>`, 'i');
      XML_TAG_REGEX_CACHE.set(tagName, regex);
    }
    const match = refereeXml.match(regex);
    return match?.[1]?.trim() || undefined;
  };

  const getNumberValue = (tagName: string): string | undefined => {
    const value = getValue(tagName);
    return value && !isNaN(Number(value)) ? value : undefined;
  };

  // Extract required fields
  const visRefereeNo = getNumberValue('No') || getNumberValue('RefereeNo');
  
  if (!visRefereeNo) {
    // Skip referees missing required ID
    return null;
  }

  // Extract and normalize names
  const fullName = getValue('Name') || getValue('FullName') || '';
  const firstName = getValue('FirstName');
  const lastName = getValue('LastName');
  
  // Parse name if not provided separately
  let parsedFirstName = firstName;
  let parsedLastName = lastName;
  
  if (!firstName && !lastName && fullName) {
    const nameParts = fullName.trim().split(/\s+/);
    if (nameParts.length >= 2) {
      parsedFirstName = nameParts[0];
      parsedLastName = nameParts.slice(1).join(' ');
    } else if (nameParts.length === 1) {
      parsedLastName = nameParts[0];
    }
  }

  // Validate and normalize gender
  const rawGender = getValue('Gender') || getValue('Sex');
  let gender: 'M' | 'F' | undefined;
  if (rawGender === 'M' || rawGender === 'Male' || rawGender === '1') {
    gender = 'M';
  } else if (rawGender === 'F' || rawGender === 'Female' || rawGender === 'W' || rawGender === '2') {
    gender = 'F';
  }

  // Extract federation/country code
  const federation = getValue('Federation') || getValue('Country') || getValue('NOC');

  // Extract and validate birthdate
  const rawBirthdate = getValue('Birthdate') || getValue('DateOfBirth') || getValue('DOB');
  let birthdate: string | undefined;
  if (rawBirthdate) {
    // Validate date format (YYYY-MM-DD expected)
    const dateMatch = rawBirthdate.match(/(\d{4})-(\d{2})-(\d{2})/);
    if (dateMatch) {
      birthdate = rawBirthdate;
    } else {
      // Try to parse other common formats
      const altMatch = rawBirthdate.match(/(\d{2})\/(\d{2})\/(\d{4})/);
      if (altMatch) {
        birthdate = `${altMatch[3]}-${altMatch[1].padStart(2, '0')}-${altMatch[2].padStart(2, '0')}`;
      }
    }
  }

  return {
    id: `referee-${visRefereeNo}`,
    visRefereeNo,
    firstName: parsedFirstName,
    lastName: parsedLastName,
    gender,
    federation,
    birthdate,
    assignments: [], // Will be populated during assignment integration
  };
}

/**
 * Normalize referee function names to standard format
 */
function normalizeRefereeFunction(rawFunction: string): 'FIRST' | 'SECOND' | 'CHALLENGE' {
  const function_ = rawFunction.trim().toUpperCase();
  
  switch (function_) {
    case '1ST':
    case 'FIRST':
    case '1':
    case 'REFEREE 1':
    case 'R1':
      return 'FIRST';
    case '2ND':
    case 'SECOND':
    case '2':
    case 'REFEREE 2':
    case 'R2':
      return 'SECOND';
    case 'CR':
    case 'CHALLENGE':
    case 'CHALLENGE REFEREE':
    case 'CHALLENGE_REFEREE':
      return 'CHALLENGE';
    default:
      // Default to FIRST for unknown functions
      return 'FIRST';
  }
}

// In-memory cache with TTL
interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
}

class MemoryCache<T> {
  private cache = new Map<string, CacheEntry<T>>();
  private readonly defaultTTL = 30 * 60 * 1000; // 30 minutes

  set(key: string, data: T, ttl = this.defaultTTL): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl,
    });
  }

  get(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry) {
      return null;
    }

    if (Date.now() - entry.timestamp > entry.ttl) {
      this.cache.delete(key);
      return null;
    }

    return entry.data;
  }

  has(key: string): boolean {
    return this.get(key) !== null;
  }

  delete(key: string): void {
    this.cache.delete(key);
  }

  clear(): void {
    this.cache.clear();
  }

  getStats() {
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys()),
    };
  }
}

// Global cache instances
const tournamentCache = new MemoryCache<TournamentDTO[]>();
const matchCache = new MemoryCache<MatchDTO[]>();
const refereeCache = new MemoryCache<RefereeDTO[]>();

/**
 * Extract client IP with better fallback handling
 * Supports various proxy configurations and CDN environments
 */
function getClientIp(req: Request): string {
  // Check standard proxy headers in order of preference
  const forwardedFor = req.headers.get('x-forwarded-for');
  if (forwardedFor) {
    // x-forwarded-for can contain multiple IPs, use the first (original client)
    return forwardedFor.split(',')[0].trim();
  }
  
  const realIp = req.headers.get('x-real-ip');
  if (realIp) {
    return realIp.trim();
  }
  
  // Fallback for direct connections (development) and Cloudflare
  const cfConnectingIp = req.headers.get('cf-connecting-ip');
  if (cfConnectingIp) {
    return cfConnectingIp.trim();
  }
  
  return 'unknown';
}

/**
 * Calculate dynamic TTL for match data based on match status
 */
function getMatchCacheTTL(matches: MatchDTO[]): number {
  // Check if any matches are active (RUNNING or SCHEDULED)
  const hasActiveMatches = matches.some(match => 
    match.status === 'RUNNING' || match.status === 'SCHEDULED'
  );
  
  if (hasActiveMatches) {
    return 30 * 1000; // 30 seconds for active matches
  }
  
  // All matches are finished/cancelled/interrupted
  return 30 * 60 * 1000; // 30 minutes for completed matches
}

// Rate limiting
interface RateLimitEntry {
  requests: number;
  resetTime: number;
}

class RateLimiter {
  private clients = new Map<string, RateLimitEntry>();
  private readonly maxRequests = 60; // requests per window
  private readonly windowMs = 60 * 1000; // 1 minute

  isAllowed(clientId: string): { allowed: boolean; retryAfter?: number } {
    const now = Date.now();
    let entry = this.clients.get(clientId);

    if (!entry || now >= entry.resetTime) {
      entry = {
        requests: 0,
        resetTime: now + this.windowMs,
      };
      this.clients.set(clientId, entry);
    }

    entry.requests++;

    if (entry.requests > this.maxRequests) {
      const retryAfter = Math.ceil((entry.resetTime - now) / 1000);
      return { allowed: false, retryAfter };
    }

    return { allowed: true };
  }

  cleanup(): void {
    const now = Date.now();
    for (const [clientId, entry] of this.clients.entries()) {
      if (now >= entry.resetTime) {
        this.clients.delete(clientId);
      }
    }
  }

  getStats() {
    return {
      activeClients: this.clients.size,
      maxRequests: this.maxRequests,
      windowMs: this.windowMs,
    };
  }
}

// Global rate limiter instance
const rateLimiter = new RateLimiter();

// Periodic cleanup to prevent memory leaks - run every 5 minutes
setInterval(() => {
  try {
    rateLimiter.cleanup();
    // Clean up expired XML regex cache if it gets too large (> 100 entries)
    if (XML_TAG_REGEX_CACHE.size > 100) {
      XML_TAG_REGEX_CACHE.clear();
      console.log('XML regex cache cleared due to size limit');
    }
  } catch (error) {
    console.warn('Periodic cleanup failed:', error);
  }
}, 5 * 60 * 1000);

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const path = url.pathname;

    // Initialize VIS client with environment variables
    const visApiUrl = Deno.env.get('VIS_API_URL');
    const visApiHeaders = Deno.env.get('VIS_API_HEADERS');
    
    if (!visApiUrl) {
      console.warn('VIS_API_URL environment variable not set');
    }

    let parsedHeaders = {};
    if (visApiHeaders) {
      try {
        parsedHeaders = JSON.parse(visApiHeaders);
      } catch (error) {
        console.warn('Invalid VIS_API_HEADERS JSON format, using empty headers');
      }
    }

    const visClient = visApiUrl ? new VisClient({
      baseUrl: visApiUrl,
      headers: parsedHeaders,
      timeoutMs: 10000,
    }) : null;

    // Health check endpoint
    if (path === '/health') {
      let visConnectivity = false;
      
      if (visClient) {
        try {
          visConnectivity = await visClient.testConnection();
        } catch (error) {
          console.error('Health check VIS connectivity failed:', error);
        }
      }

      return new Response(
        JSON.stringify({
          status: 'healthy',
          service: 'vis-adapter',
          timestamp: new Date().toISOString(),
          vis_connectivity: visConnectivity,
          environment: {
            vis_api_configured: !!visApiUrl,
          },
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        }
      );
    }

    // Tournament endpoint
    if (path === '/vis/tournaments' && req.method === 'GET') {
      return handleTournamentsRequest(req, visClient);
    }

    // Matches endpoint
    if (path === '/vis/matches' && req.method === 'GET') {
      return handleMatchesRequest(req, visClient);
    }

    // Referees endpoint
    if (path === '/vis/referees' && req.method === 'GET') {
      return handleRefereesRequest(req, visClient);
    }

    // Route handling for different HTTP methods
    if (req.method === 'GET') {
      return handleGetRequest(req, path);
    }

    if (req.method === 'POST') {
      return handlePostRequest(req, path);
    }

    // Method not allowed
    return new Response(
      JSON.stringify({
        error: 'Method not allowed',
        method: req.method,
        path: path,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 405,
      }
    );

  } catch (error) {
    const errorContext = classifyError(error);
    console.error('VIS Adapter Error:', errorContext);
    
    return new Response(
      JSON.stringify({
        error: errorContext.type,
        message: errorContext.message,
        details: errorContext.details,
        timestamp: errorContext.timestamp,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: getErrorStatusCode(errorContext.type),
      }
    );
  }
});

async function handleGetRequest(req: Request, path: string): Promise<Response> {
  // Basic GET endpoint - will be expanded in later stories
  return new Response(
    JSON.stringify({
      message: 'VIS Adapter GET endpoint',
      path: path,
      timestamp: new Date().toISOString(),
    }),
    {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    }
  );
}

async function handlePostRequest(req: Request, path: string): Promise<Response> {
  // Basic POST endpoint - will be expanded in later stories
  return new Response(
    JSON.stringify({
      message: 'VIS Adapter POST endpoint',
      path: path,
      timestamp: new Date().toISOString(),
    }),
    {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    }
  );
}

/**
 * Handle tournaments request with caching and rate limiting
 */
async function handleTournamentsRequest(req: Request, visClient: VisClient | null): Promise<Response> {
  try {
    // Rate limiting
    const clientIp = getClientIp(req);
    const rateLimitResult = rateLimiter.isAllowed(clientIp);
    
    if (!rateLimitResult.allowed) {
      return new Response(
        JSON.stringify({
          error: ErrorType.RATE_LIMIT_ERROR,
          message: 'Rate limit exceeded',
          retryAfter: rateLimitResult.retryAfter,
          timestamp: new Date().toISOString(),
        }),
        {
          headers: { 
            ...corsHeaders, 
            'Content-Type': 'application/json',
            'Retry-After': rateLimitResult.retryAfter?.toString() || '60',
          },
          status: 429,
        }
      );
    }

    // Parse and validate query parameters
    const url = new URL(req.url);
    const season = url.searchParams.get('season');
    const gender = url.searchParams.get('gender');

    // Validate parameters
    if (season && (!season.match(/^\d{4}$/) || parseInt(season) < 2020 || parseInt(season) > 2030)) {
      return new Response(
        JSON.stringify({
          error: ErrorType.VALIDATION_ERROR,
          message: 'Invalid season parameter. Must be a 4-digit year between 2020-2030',
          timestamp: new Date().toISOString(),
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400,
        }
      );
    }

    if (gender && !['M', 'W', 'MIXED'].includes(gender)) {
      return new Response(
        JSON.stringify({
          error: ErrorType.VALIDATION_ERROR,
          message: 'Invalid gender parameter. Must be one of: M, W, MIXED',
          timestamp: new Date().toISOString(),
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400,
        }
      );
    }

    // Generate cache key
    const cacheKey = `tournaments:${season || 'all'}:${gender || 'all'}`;
    
    // Check cache first
    let tournaments = tournamentCache.get(cacheKey);
    let cacheHit = false;
    
    if (tournaments) {
      cacheHit = true;
      console.log(`Cache hit for ${cacheKey}`);
    } else {
      // Cache miss - fetch from VIS API
      if (!visClient) {
        return new Response(
          JSON.stringify({
            error: ErrorType.INTERNAL_ERROR,
            message: 'VIS API not configured',
            timestamp: new Date().toISOString(),
          }),
          {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 500,
          }
        );
      }

      console.log(`Cache miss for ${cacheKey} - fetching from VIS API`);

      // Build VIS API request
      let fields = 'No Code Name Country Gender Season Type StartDate EndDate';
      if (season) {
        fields += ' Title City Location';
      }

      const xmlRequest = `<Request Type="GetEventList" Fields="${fields}"${season ? ` Season="${season}"` : ''}${gender ? ` Gender="${gender}"` : ''} />`;

      // Call VIS API
      const visResponse = await visClient.makeRequest(xmlRequest);
      
      // Parse VIS response to tournaments
      tournaments = parseVisTournamentsXml(visResponse);

      // Apply client-side filtering if needed
      if (season) {
        const seasonNum = parseInt(season);
        tournaments = tournaments.filter(t => {
          const startYear = new Date(t.dates.startDate).getFullYear();
          return startYear === seasonNum;
        });
      }

      if (gender && gender !== 'MIXED') {
        tournaments = tournaments.filter(t => t.gender === gender);
      }

      // Cache the results
      tournamentCache.set(cacheKey, tournaments);
    }

    // Response headers
    const responseHeaders = {
      ...corsHeaders,
      'Content-Type': 'application/json',
      'Cache-Control': 'public, max-age=1800', // 30 minutes
      'X-Cache': cacheHit ? 'HIT' : 'MISS',
      'X-Cache-Key': cacheKey,
      'Last-Modified': new Date().toUTCString(),
    };

    return new Response(
      JSON.stringify({
        data: tournaments,
        meta: {
          count: tournaments.length,
          cached: cacheHit,
          cacheKey: cacheKey,
          timestamp: new Date().toISOString(),
        },
      }),
      {
        headers: responseHeaders,
        status: 200,
      }
    );

  } catch (error) {
    console.error('Tournament request error:', error);
    
    const errorContext = classifyError(error);
    return new Response(
      JSON.stringify({
        error: errorContext.type,
        message: errorContext.message,
        details: errorContext.details,
        timestamp: errorContext.timestamp,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: getErrorStatusCode(errorContext.type),
      }
    );
  }
}

/**
 * Handle matches request with caching and rate limiting
 */
async function handleMatchesRequest(req: Request, visClient: VisClient | null): Promise<Response> {
  try {
    // Rate limiting
    const clientIp = getClientIp(req);
    const rateLimitResult = rateLimiter.isAllowed(clientIp);
    
    if (!rateLimitResult.allowed) {
      return new Response(
        JSON.stringify({
          error: ErrorType.RATE_LIMIT_ERROR,
          message: 'Rate limit exceeded',
          retryAfter: rateLimitResult.retryAfter,
          timestamp: new Date().toISOString(),
        }),
        {
          headers: { 
            ...corsHeaders, 
            'Content-Type': 'application/json',
            'Retry-After': rateLimitResult.retryAfter?.toString() || '60',
          },
          status: 429,
        }
      );
    }

    // Parse and validate query parameters
    const url = new URL(req.url);
    const tournamentCode = url.searchParams.get('tournamentCode');
    const round = url.searchParams.get('round');

    // Validate required tournamentCode parameter
    if (!tournamentCode) {
      return new Response(
        JSON.stringify({
          error: ErrorType.VALIDATION_ERROR,
          message: 'Tournament code parameter is required',
          timestamp: new Date().toISOString(),
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400,
        }
      );
    }

    // Validate tournament code format
    if (!tournamentCode.match(/^[A-Z0-9]{3,20}$/i)) {
      return new Response(
        JSON.stringify({
          error: ErrorType.VALIDATION_ERROR,
          message: 'Invalid tournament code format. Must be 3-20 alphanumeric characters',
          timestamp: new Date().toISOString(),
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400,
        }
      );
    }

    // Validate round parameter if provided
    if (round && !round.match(/^[A-Z0-9_]{1,50}$/i)) {
      return new Response(
        JSON.stringify({
          error: ErrorType.VALIDATION_ERROR,
          message: 'Invalid round parameter format. Must be 1-50 alphanumeric characters and underscores',
          timestamp: new Date().toISOString(),
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400,
        }
      );
    }

    // Generate cache key
    const cacheKey = `matches:${tournamentCode}:${round || 'all'}`;
    
    // Check cache first
    let matches = matchCache.get(cacheKey);
    let cacheHit = false;
    
    if (matches) {
      cacheHit = true;
      console.log(`Cache hit for ${cacheKey}`);
    } else {
      // Cache miss - fetch from VIS API
      if (!visClient) {
        return new Response(
          JSON.stringify({
            error: ErrorType.INTERNAL_ERROR,
            message: 'VIS API not configured',
            timestamp: new Date().toISOString(),
          }),
          {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 500,
          }
        );
      }

      console.log(`Cache miss for ${cacheKey} - fetching from VIS API`);

      // Build VIS API request
      const fields = 'No Code TournamentCode Court UTCDateTime LocalDateTime Team1 Team2 Sets Result Status Round Phase Referees';
      const xmlRequest = `<Request Type="GetBeachMatchList" Fields="${fields}" TournamentCode="${tournamentCode}"${round ? ` Round="${round}"` : ''} />`;

      // Call VIS API
      const visResponse = await visClient.makeRequest(xmlRequest);
      
      // Parse VIS response to matches
      matches = parseVisMatchesXml(visResponse);

      // Apply additional filtering if needed
      if (round) {
        matches = matches.filter(match => 
          match.round.toLowerCase().includes(round.toLowerCase()) ||
          match.phaseCode?.toLowerCase().includes(round.toLowerCase())
        );
      }

      // Cache the results with dynamic TTL
      const cacheTTL = getMatchCacheTTL(matches);
      matchCache.set(cacheKey, matches, cacheTTL);
      console.log(`Cached ${matches.length} matches with TTL ${cacheTTL}ms`);
    }

    // Calculate dynamic cache control based on match status
    let maxAge = 1800; // 30 minutes default
    const hasActiveMatches = matches.some(match => 
      match.status === 'RUNNING' || match.status === 'SCHEDULED'
    );
    if (hasActiveMatches) {
      maxAge = 30; // 30 seconds for active matches
    }

    // Response headers
    const responseHeaders = {
      ...corsHeaders,
      'Content-Type': 'application/json',
      'Cache-Control': `public, max-age=${maxAge}`,
      'X-Cache': cacheHit ? 'HIT' : 'MISS',
      'X-Cache-Key': cacheKey,
      'X-Match-Status': hasActiveMatches ? 'ACTIVE' : 'COMPLETED',
      'Last-Modified': new Date().toUTCString(),
    };

    return new Response(
      JSON.stringify({
        data: matches,
        meta: {
          tournamentCode,
          round: round || null,
          count: matches.length,
          cached: cacheHit,
          cacheKey: cacheKey,
          hasActiveMatches,
          cacheTTL: hasActiveMatches ? 30000 : 1800000,
          timestamp: new Date().toISOString(),
        },
      }),
      {
        headers: responseHeaders,
        status: 200,
      }
    );

  } catch (error) {
    console.error('Matches request error:', error);
    
    const errorContext = classifyError(error);
    return new Response(
      JSON.stringify({
        error: errorContext.type,
        message: errorContext.message,
        details: errorContext.details,
        timestamp: errorContext.timestamp,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: getErrorStatusCode(errorContext.type),
      }
    );
  }
}

/**
 * Handle referees request with caching and rate limiting
 */
async function handleRefereesRequest(req: Request, visClient: VisClient | null): Promise<Response> {
  try {
    // Rate limiting
    const clientIp = getClientIp(req);
    const rateLimitResult = rateLimiter.isAllowed(clientIp);
    
    if (!rateLimitResult.allowed) {
      return new Response(
        JSON.stringify({
          error: 'Rate limit exceeded',
          message: `Too many requests. Please try again in ${Math.ceil(rateLimitResult.retryAfter / 1000)} seconds`,
          retryAfter: rateLimitResult.retryAfter,
          requestsRemaining: rateLimitResult.remaining,
        }),
        {
          headers: { 
            ...corsHeaders, 
            'Content-Type': 'application/json',
            'X-RateLimit-Limit': rateLimitResult.limit.toString(),
            'X-RateLimit-Remaining': rateLimitResult.remaining.toString(),
            'X-RateLimit-Reset': Math.ceil(rateLimitResult.resetTime / 1000).toString(),
          },
          status: 429,
        }
      );
    }

    // Input validation and parameter extraction
    const url = new URL(req.url);
    const country = url.searchParams.get('country');
    const tournamentCode = url.searchParams.get('tournamentCode');
    const status = url.searchParams.get('status');

    // Validate country parameter
    if (country && !/^[A-Z]{3}$/.test(country)) {
      return new Response(
        JSON.stringify({
          error: 'Validation error',
          message: 'Country parameter must be a 3-letter code (e.g., ITA, GER, USA)',
          parameter: 'country',
          value: country,
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400,
        }
      );
    }

    // Validate tournament code parameter
    if (tournamentCode && (tournamentCode.length < 3 || tournamentCode.length > 50)) {
      return new Response(
        JSON.stringify({
          error: 'Validation error',
          message: 'Tournament code must be between 3 and 50 characters',
          parameter: 'tournamentCode',
          value: tournamentCode,
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400,
        }
      );
    }

    // Validate status parameter
    const validStatuses = ['ASSIGNED', 'CONFIRMED', 'DECLINED', 'PENDING'];
    if (status && !validStatuses.includes(status)) {
      return new Response(
        JSON.stringify({
          error: 'Validation error',
          message: `Status parameter must be one of: ${validStatuses.join(', ')}`,
          parameter: 'status',
          value: status,
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400,
        }
      );
    }

    // Generate cache key based on filtering parameters
    const cacheKey = `referees:${country || 'all'}:${tournamentCode || 'all'}:${status || 'all'}`;
    
    // Check cache first
    const cached = refereeCache.get(cacheKey);
    if (cached) {
      console.log(`Cache hit for referees request: ${cacheKey}`);
      return new Response(
        JSON.stringify({
          data: cached,
          cached: true,
          timestamp: new Date().toISOString(),
          cacheKey,
        }),
        {
          headers: { 
            ...corsHeaders, 
            'Content-Type': 'application/json',
            'Cache-Control': 'public, max-age=300', // 5 minutes
          },
          status: 200,
        }
      );
    }

    // Check if VIS client is available
    if (!visClient) {
      return new Response(
        JSON.stringify({
          error: 'VIS API client not configured',
          message: 'VIS_API_URL environment variable not set',
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 503,
        }
      );
    }

    console.log(`Fetching referee data from VIS API for filters - Country: ${country || 'all'}, Tournament: ${tournamentCode || 'all'}, Status: ${status || 'all'}`);

    // Build VIS XML request for referee data
    const xmlRequest = buildVisRefereeRequest(country, tournamentCode);
    
    // Make VIS API call
    const visResponse = await visClient.makeRequest(xmlRequest);
    
    // Parse VIS response to referee DTOs
    let referees = parseVisRefereesXml(visResponse);
    
    // Integrate assignment data
    referees = await integrateRefereeAssignments(referees, visClient, tournamentCode);
    
    // Apply client-side filtering for status if needed
    if (status) {
      referees = referees.filter(referee => 
        referee.assignments?.some(assignment => assignment.status === status)
      );
    }

    // Determine cache TTL - 5min for assignment data, 2hours for profile data
    const hasAssignmentFilter = tournamentCode || status;
    const cacheTTL = hasAssignmentFilter ? 5 * 60 * 1000 : 2 * 60 * 60 * 1000; // 5min or 2hours

    // Cache the result
    refereeCache.set(cacheKey, referees, cacheTTL);

    console.log(`Successfully processed ${referees.length} referees from VIS API`);

    return new Response(
      JSON.stringify({
        data: referees,
        cached: false,
        timestamp: new Date().toISOString(),
        count: referees.length,
        filters: { country, tournamentCode, status },
        cacheTTL: cacheTTL / 1000, // Return TTL in seconds
      }),
      {
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json',
          'Cache-Control': `public, max-age=${Math.floor(cacheTTL / 1000)}`,
        },
        status: 200,
      }
    );

  } catch (error) {
    const errorContext = classifyError(error);
    console.error('Referee endpoint error:', errorContext);
    
    return new Response(
      JSON.stringify({
        error: errorContext.type,
        message: errorContext.message,
        details: errorContext.details,
        timestamp: errorContext.timestamp,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: getErrorStatusCode(errorContext.type),
      }
    );
  }
}

/**
 * Build VIS XML request for referee data
 */
function buildVisRefereeRequest(country?: string | null, tournamentCode?: string | null): string {
  // Build VIS XML request based on filtering parameters
  let xmlRequest = `<?xml version="1.0" encoding="UTF-8"?>
<Request>
  <Method>GetRefereeList</Method>`;

  if (country) {
    xmlRequest += `
  <Country>${country}</Country>`;
  }

  if (tournamentCode) {
    xmlRequest += `
  <TournamentCode>${tournamentCode}</TournamentCode>`;
  }

  xmlRequest += `
</Request>`;

  return xmlRequest;
}

/**
 * Integrate referee assignment data from matches
 * This function populates the assignments field for each referee
 */
async function integrateRefereeAssignments(
  referees: RefereeDTO[], 
  visClient: VisClient | null, 
  tournamentCode?: string | null
): Promise<RefereeDTO[]> {
  if (!visClient) {
    return referees; // Return referees without assignment integration if no VIS client
  }

  try {
    // If tournament code is provided, get matches for that tournament
    // Otherwise, get recent matches for assignment extraction
    let matches: MatchDTO[] = [];
    
    if (tournamentCode) {
      // Build request for specific tournament matches
      const xmlRequest = `<?xml version="1.0" encoding="UTF-8"?>
<Request>
  <Method>GetBeachMatchList</Method>
  <TournamentCode>${tournamentCode}</TournamentCode>
</Request>`;
      
      const visResponse = await visClient.makeRequest(xmlRequest);
      matches = parseVisMatchesXml(visResponse);
    }

    // Create a map of referee ID to referee for quick lookup
    const refereeMap = new Map<string, RefereeDTO>();
    referees.forEach(referee => {
      refereeMap.set(referee.visRefereeNo, referee);
      referee.assignments = []; // Initialize assignments array
    });

    // Process matches to extract referee assignments
    matches.forEach(match => {
      if (match.refereeAssignments && match.refereeAssignments.length > 0) {
        match.refereeAssignments.forEach(assignment => {
          const referee = refereeMap.get(assignment.refereeId);
          if (referee) {
            // Create assignment record
            const assignmentRecord = {
              matchId: match.id,
              matchCode: match.matchCode,
              tournamentCode: match.tournamentCode,
              function: normalizeRefereeFunction(assignment.function) as 'FIRST' | 'SECOND' | 'CHALLENGE',
              status: assignment.status as 'ASSIGNED' | 'CONFIRMED' | 'DECLINED' | 'PENDING',
              scheduledDateTime: match.scheduledDateTime,
              court: match.court?.courtNumber || match.court?.courtName,
            };

            if (!referee.assignments) {
              referee.assignments = [];
            }
            referee.assignments.push(assignmentRecord);
          }
        });
      }
    });

    // Sort assignments by scheduled time (most recent first)
    referees.forEach(referee => {
      if (referee.assignments) {
        referee.assignments.sort((a, b) => {
          if (!a.scheduledDateTime) return 1;
          if (!b.scheduledDateTime) return -1;
          return new Date(b.scheduledDateTime).getTime() - new Date(a.scheduledDateTime).getTime();
        });
      }
    });

    return referees;

  } catch (error) {
    console.warn('Failed to integrate referee assignments:', error);
    // Return referees without assignment integration on error
    return referees;
  }
}

/**
 * Extract referee assignments from existing match data
 * This provides a fallback method to get assignment data
 */
function extractRefereeAssignmentsFromMatches(
  referees: RefereeDTO[], 
  cachedMatches: MatchDTO[]
): RefereeDTO[] {
  // Create a map of referee names to referee objects for quick lookup
  const refereeNameMap = new Map<string, RefereeDTO>();
  referees.forEach(referee => {
    const fullName = `${referee.firstName || ''} ${referee.lastName || ''}`.trim();
    if (fullName) {
      refereeNameMap.set(fullName.toLowerCase(), referee);
    }
    referee.assignments = []; // Initialize assignments array
  });

  // Process cached matches to extract assignments
  cachedMatches.forEach(match => {
    if (match.refereeAssignments && match.refereeAssignments.length > 0) {
      match.refereeAssignments.forEach(assignment => {
        const refereeName = assignment.refereeName.toLowerCase();
        const referee = refereeNameMap.get(refereeName);
        
        if (referee) {
          const assignmentRecord = {
            matchId: match.id,
            matchCode: match.matchCode,
            tournamentCode: match.tournamentCode,
            function: normalizeRefereeFunction(assignment.function) as 'FIRST' | 'SECOND' | 'CHALLENGE',
            status: assignment.status as 'ASSIGNED' | 'CONFIRMED' | 'DECLINED' | 'PENDING',
            scheduledDateTime: match.scheduledDateTime,
            court: match.court?.courtNumber || match.court?.courtName,
          };

          if (!referee.assignments) {
            referee.assignments = [];
          }
          referee.assignments.push(assignmentRecord);
        }
      });
    }
  });

  return referees;
}

/**
 * Invalidate referee cache entries for assignment updates
 * This should be called when match assignments are updated
 */
function invalidateRefereeCacheForAssignments(tournamentCode?: string): void {
  const keysToInvalidate: string[] = [];
  
  // Use proper cache API to get keys
  const cacheStats = refereeCache.getStats();
  const allKeys = cacheStats.keys;
  
  // Collect all cache keys that could be affected by assignment changes
  allKeys.forEach(key => {
    // Invalidate any cache entries related to the tournament or with assignment filters
    if (tournamentCode) {
      if (key.includes(tournamentCode) || key.includes(':ASSIGNED') || key.includes(':CONFIRMED') || 
          key.includes(':DECLINED') || key.includes(':PENDING')) {
        keysToInvalidate.push(key);
      }
    } else {
      // If no specific tournament, invalidate all entries with status filters
      if (key.includes(':ASSIGNED') || key.includes(':CONFIRMED') || 
          key.includes(':DECLINED') || key.includes(':PENDING')) {
        keysToInvalidate.push(key);
      }
    }
  });

  // Remove the affected cache entries using proper API
  keysToInvalidate.forEach(key => {
    refereeCache.delete(key);
  });

  if (keysToInvalidate.length > 0) {
    console.log(`Invalidated ${keysToInvalidate.length} referee cache entries for assignment updates`);
  }
}

/**
 * Get cache performance metrics for monitoring
 */
function getRefereeCachePerformance(): {
  totalEntries: number;
  hitRate: number;
  profileEntries: number;
  assignmentEntries: number;
} {
  const cacheStats = refereeCache.getStats();
  const totalEntries = cacheStats.size;
  let profileEntries = 0;
  let assignmentEntries = 0;

  cacheStats.keys.forEach(key => {
    // Assignment-related entries have tournament codes or status filters
    if (key.includes(':') && (key.includes('all:all:') === false || key.includes('ASSIGNED') || 
        key.includes('CONFIRMED') || key.includes('DECLINED') || key.includes('PENDING'))) {
      assignmentEntries++;
    } else {
      profileEntries++;
    }
  });

  return {
    totalEntries,
    hitRate: 0, // Would need request tracking to calculate actual hit rate
    profileEntries,
    assignmentEntries,
  };
}

/**
 * Classify errors for structured error handling
 */
function classifyError(error: any): ErrorContext {
  const timestamp = new Date().toISOString();

  // VIS API specific errors
  if (error.message?.includes('VIS API Error')) {
    return {
      type: ErrorType.VIS_API_ERROR,
      message: error.message,
      details: { originalError: error.toString() },
      timestamp,
    };
  }

  // Network related errors
  if (error.message?.includes('HTTP') || 
      error.name === 'AbortError' || 
      error.message?.includes('fetch') ||
      error.message?.includes('network') ||
      error.code === 'NETWORK_ERROR') {
    return {
      type: ErrorType.NETWORK_ERROR,
      message: error.message || 'Network request failed',
      details: { originalError: error.toString() },
      timestamp,
    };
  }

  // Validation errors
  if (error.message?.includes('validation') || error.message?.includes('invalid')) {
    return {
      type: ErrorType.VALIDATION_ERROR,
      message: error.message,
      details: { originalError: error.toString() },
      timestamp,
    };
  }

  // Default to internal error
  return {
    type: ErrorType.INTERNAL_ERROR,
    message: error.message || 'An unexpected error occurred',
    details: { originalError: error.toString() },
    timestamp,
  };
}

/**
 * Get appropriate HTTP status code for error type
 */
function getErrorStatusCode(errorType: ErrorType): number {
  switch (errorType) {
    case ErrorType.VALIDATION_ERROR:
      return 400;
    case ErrorType.RATE_LIMIT_ERROR:
      return 429; // Too Many Requests
    case ErrorType.VIS_API_ERROR:
      return 502; // Bad Gateway
    case ErrorType.NETWORK_ERROR:
      return 503; // Service Unavailable
    case ErrorType.INTERNAL_ERROR:
    default:
      return 500;
  }
}