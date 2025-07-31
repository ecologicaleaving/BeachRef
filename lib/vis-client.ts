import { Tournament, TournamentDetail, VISApiResponse, VISApiError } from './types'
import { VIS_API_CONFIG } from './constants'

interface RetryConfig {
  maxRetries: number
  baseDelay: number
  maxDelay: number
}

interface LogEntry {
  level: 'info' | 'warn' | 'error'
  message: string
  data?: unknown
  timestamp: string
  duration?: number
}

const RETRY_CONFIG: RetryConfig = {
  maxRetries: VIS_API_CONFIG.maxRetries,
  baseDelay: 1000,
  maxDelay: 10000
}

// Logging utility
function log(entry: Omit<LogEntry, 'timestamp'>): void {
  if (entry.level === 'error') {
    console.error(`[VIS-Client] ${entry.message}`, entry.data || '')
  } else if (entry.level === 'warn') {
    console.warn(`[VIS-Client] ${entry.message}`, entry.data || '')
  } else {
    console.log(`[VIS-Client] ${entry.message}`, entry.data || '')
  }
}

// Build XML request for tournament list
function buildVISTournamentRequest(year: number = 2025): string {
  const xmlRequest = `<?xml version="1.0" encoding="utf-8"?>
<Requests>
  <Request Type="GetBeachTournamentList" 
           Fields="Code Name CountryCode StartDateMainDraw EndDateMainDraw Gender Type">
    <Filter Year="${year}"/>
  </Request>
</Requests>`

  return xmlRequest
}

// Parse VIS XML response to Tournament objects
function parseVISResponse(xmlResponse: string): Tournament[] {
  try {
    const tournaments: Tournament[] = []
    
    // Use regex to extract BeachTournament elements since DOMParser is not available in Node.js
    const tournamentRegex = /<BeachTournament\s+([^>]+)\/>/g
    let match
    
    while ((match = tournamentRegex.exec(xmlResponse)) !== null) {
      const attributes = match[1]
      
      // Extract individual attributes using regex
      const extractAttribute = (attr: string): string | null => {
        const attrRegex = new RegExp(`${attr}="([^"]*)"`, 'i')
        const attrMatch = attributes.match(attrRegex)
        return attrMatch ? attrMatch[1] : null
      }

      const code = extractAttribute('Code')
      const name = extractAttribute('Name')
      const countryCode = extractAttribute('CountryCode')
      const startDate = extractAttribute('StartDateMainDraw')
      const endDate = extractAttribute('EndDateMainDraw')
      const gender = extractAttribute('Gender')
      const type = extractAttribute('Type')


      // Validate required fields and data integrity
      if (code && name && countryCode && startDate && endDate && gender && type) {
        // Map numeric gender codes to string values
        let genderValue: 'Men' | 'Women' | 'Mixed' | null = null;
        if (gender === '0') genderValue = 'Men';
        else if (gender === '1') genderValue = 'Women'; 
        else if (gender === '2') genderValue = 'Mixed';
        
        // Basic date validation - ensure dates are in reasonable format
        const isValidDate = (dateStr: string) => !isNaN(Date.parse(dateStr))
        
        if (genderValue && isValidDate(startDate) && isValidDate(endDate)) {
          tournaments.push({
            code: code.trim(),
            name: name.trim(),
            countryCode: countryCode.trim().toUpperCase(),
            startDate,
            endDate,
            gender: genderValue,
            type: type.trim()
          })
        }
      }
    }

    // Sort tournaments by start date
    tournaments.sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime())
    
    return tournaments
  } catch (error) {
    if (error instanceof VISApiError) {
      throw error
    }
    throw new VISApiError('Failed to parse VIS API response', undefined, error)
  }
}

// Calculate exponential backoff delay
function calculateBackoffDelay(attempt: number, config: RetryConfig): number {
  const delay = Math.min(
    config.baseDelay * Math.pow(2, attempt),
    config.maxDelay
  )
  return delay
}

// Sleep utility for retry delays
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

// Determine if error is retryable based on error type and status
function isRetryableError(error: unknown): boolean {
  if (error instanceof VISApiError) {
    // Don't retry on client errors (4xx), but retry on server errors (5xx) and network issues
    return !error.statusCode || error.statusCode >= 500
  }
  
  // Retry on network-related TypeErrors (fetch failures)
  if (error instanceof TypeError && error.message.includes('fetch')) {
    return true
  }
  
  // Retry on AbortError (timeout) as it might be temporary
  if (error instanceof Error && error.name === 'AbortError') {
    return true
  }
  
  return false
}

// Main function to fetch tournaments from VIS API
export async function fetchTournamentsFromVIS(year?: number): Promise<VISApiResponse> {
  const startTime = Date.now()
  let lastError: unknown
  const requestYear = year || 2025
  
  log({
    level: 'info',
    message: 'Starting VIS API request for tournament data',
    data: { year: requestYear }
  })

  for (let attempt = 0; attempt <= RETRY_CONFIG.maxRetries; attempt++) {
    try {
      // Create abort controller for timeout
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), VIS_API_CONFIG.timeout)

      const xmlBody = buildVISTournamentRequest(requestYear)
      
      log({
        level: 'info',
        message: `VIS API request attempt ${attempt + 1}/${RETRY_CONFIG.maxRetries + 1}`,
        data: { attempt, year: requestYear, xmlBody }
      })

      const response = await fetch(VIS_API_CONFIG.baseURL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/xml',
          'X-FIVB-App-ID': VIS_API_CONFIG.appId,
          'User-Agent': 'BeachRef-MVP/1.0'
        },
        body: xmlBody,
        signal: controller.signal
      })

      clearTimeout(timeoutId)

      if (!response.ok) {
        throw new VISApiError(
          `VIS API returned ${response.status}: ${response.statusText}`,
          response.status
        )
      }

      const xmlText = await response.text()
      let tournaments = parseVISResponse(xmlText)
      
      // Additional client-side filtering for precision
      if (year) {
        tournaments = tournaments.filter(tournament => {
          const tournamentYear = new Date(tournament.startDate).getFullYear()
          return tournamentYear === year
        })
      }
      
      const duration = Date.now() - startTime
      
      log({
        level: 'info',
        message: 'VIS API request successful',
        data: { 
          tournamentCount: tournaments.length,
          duration,
          attempt: attempt + 1,
          filteredByYear: year ? requestYear : null
        },
        duration
      })

      return {
        tournaments,
        totalCount: tournaments.length,
        lastUpdated: new Date().toISOString()
      }

    } catch (error) {
      // Handle timeout specifically
      if (error instanceof Error && error.name === 'AbortError') {
        lastError = new VISApiError('VIS API request timeout', undefined, error)
      }
      // Handle fetch errors
      else if (error instanceof TypeError) {
        lastError = new VISApiError('Network error connecting to VIS API', undefined, error)
      }
      // Keep VISApiError as is
      else if (error instanceof VISApiError) {
        lastError = error
      }
      // Handle other errors
      else {
        lastError = error
      }

      log({
        level: 'warn',
        message: `VIS API request attempt ${attempt + 1} failed`,
        data: { 
          attempt: attempt + 1,
          error: error instanceof Error ? error.message : String(error),
          willRetry: attempt < RETRY_CONFIG.maxRetries && isRetryableError(lastError)
        }
      })

      // Don't retry if this was the last attempt or error is not retryable
      if (attempt >= RETRY_CONFIG.maxRetries || !isRetryableError(lastError)) {
        break
      }

      // Wait before retrying
      const delay = calculateBackoffDelay(attempt, RETRY_CONFIG)
      log({
        level: 'info',
        message: `Retrying VIS API request in ${delay}ms`,
        data: { delay, nextAttempt: attempt + 2 }
      })
      
      await sleep(delay)
    }
  }

  // All attempts failed
  const duration = Date.now() - startTime
  log({
    level: 'error',
    message: 'All VIS API request attempts failed',
    data: { 
      attempts: RETRY_CONFIG.maxRetries + 1,
      duration,
      finalError: lastError instanceof Error ? lastError.message : String(lastError)
    },
    duration
  })

  throw lastError instanceof VISApiError 
    ? lastError 
    : new VISApiError('Failed to fetch tournaments from VIS API', undefined, lastError)
}

// Build XML request for specific tournament details
function buildVISTournamentDetailRequest(code: string): string {
  const xmlRequest = `<?xml version="1.0" encoding="utf-8"?>
<Requests>
  <Request Type="GetBeachTournamentList" 
           Fields="Code Name CountryCode StartDateMainDraw EndDateMainDraw Gender Type">
    <Filter Code="${code}"/>
  </Request>
</Requests>`

  return xmlRequest
}

// Parse tournament detail response (extends basic parsing)
function parseVISTournamentDetailResponse(xmlResponse: string, code: string): TournamentDetail | null {
  try {
    const tournaments = parseVISResponse(xmlResponse)
    const tournament = tournaments.find(t => t.code === code)
    
    if (!tournament) {
      return null
    }

    // Determine status based on dates
    const now = new Date()
    const startDate = new Date(tournament.startDate)
    const endDate = new Date(tournament.endDate)
    
    let status: 'upcoming' | 'live' | 'completed'
    if (now < startDate) {
      status = 'upcoming'
    } else if (now > endDate) {
      status = 'completed'
    } else {
      status = 'live'
    }

    return {
      ...tournament,
      status,
      venue: undefined, // VIS API doesn't provide venue info in basic request
      description: undefined // VIS API doesn't provide description in basic request
    }
  } catch (error) {
    if (error instanceof VISApiError) {
      throw error
    }
    throw new VISApiError('Failed to parse tournament detail response', undefined, error)
  }
}

// Fetch specific tournament details from VIS API with failover strategy
export async function fetchTournamentDetailFromVIS(code: string): Promise<TournamentDetail> {
  const startTime = Date.now()
  
  log({
    level: 'info',
    message: 'Starting VIS API request for tournament detail',
    data: { code }
  })

  // First, try the direct tournament code approach
  try {
    return await fetchTournamentDetailDirect(code)
  } catch (error) {
    log({
      level: 'warn',
      message: 'Direct tournament detail request failed, trying fallback approach',
      data: { 
        code,
        error: error instanceof Error ? error.message : String(error)
      }
    })
    
    // Fallback: Use the working tournament list API and filter client-side
    return await fetchTournamentDetailViaList(code)
  }
}

// Direct tournament detail fetch (original approach)
async function fetchTournamentDetailDirect(code: string): Promise<TournamentDetail> {
  let lastError: unknown
  
  for (let attempt = 0; attempt <= RETRY_CONFIG.maxRetries; attempt++) {
    try {
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), VIS_API_CONFIG.timeout)

      const xmlBody = buildVISTournamentDetailRequest(code)
      
      log({
        level: 'info',
        message: `VIS API direct tournament detail attempt ${attempt + 1}/${RETRY_CONFIG.maxRetries + 1}`,
        data: { attempt, code }
      })

      const response = await fetch(VIS_API_CONFIG.baseURL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/xml',
          'X-FIVB-App-ID': VIS_API_CONFIG.appId,
          'User-Agent': 'BeachRef-MVP/1.0'
        },
        body: xmlBody,
        signal: controller.signal
      })

      clearTimeout(timeoutId)

      if (!response.ok) {
        // Enhanced error logging for 401 issues
        const errorBody = await response.text().catch(() => 'Unable to read error body')
        const errorDetails = {
          status: response.status,
          statusText: response.statusText,
          headers: Object.fromEntries(response.headers.entries()),
          body: errorBody,
          requestHeaders: {
            'Content-Type': 'application/xml',
            'X-FIVB-App-ID': VIS_API_CONFIG.appId,
            'User-Agent': 'BeachRef-MVP/1.0'
          },
          url: VIS_API_CONFIG.baseURL,
          code: code
        }
        
        log({
          level: 'error',
          message: `VIS API direct tournament detail request failed with ${response.status}`,
          data: errorDetails
        })
        
        throw new VISApiError(
          `VIS API returned ${response.status}: ${response.statusText} - ${errorBody}`,
          response.status
        )
      }

      const xmlText = await response.text()
      const tournament = parseVISTournamentDetailResponse(xmlText, code)
      
      if (!tournament) {
        throw new VISApiError(`Tournament with code ${code} not found`, 404)
      }
      
      log({
        level: 'info',
        message: 'VIS API direct tournament detail request successful',
        data: { 
          code,
          tournamentName: tournament.name,
          attempt: attempt + 1
        }
      })

      return tournament

    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        lastError = new VISApiError('VIS API request timeout', undefined, error)
      } else if (error instanceof TypeError) {
        lastError = new VISApiError('Network error connecting to VIS API', undefined, error)
      } else if (error instanceof VISApiError) {
        lastError = error
      } else {
        lastError = error
      }

      log({
        level: 'warn',
        message: `VIS API direct tournament detail attempt ${attempt + 1} failed`,
        data: { 
          attempt: attempt + 1,
          code,
          error: error instanceof Error ? error.message : String(error),
          willRetry: attempt < RETRY_CONFIG.maxRetries && isRetryableError(lastError)
        }
      })

      if (attempt >= RETRY_CONFIG.maxRetries || !isRetryableError(lastError)) {
        break
      }

      const delay = calculateBackoffDelay(attempt, RETRY_CONFIG)
      await sleep(delay)
    }
  }

  throw lastError instanceof VISApiError 
    ? lastError 
    : new VISApiError('Failed to fetch tournament detail directly from VIS API', undefined, lastError)
}

// Fallback: Fetch tournament detail via tournament list API
async function fetchTournamentDetailViaList(code: string): Promise<TournamentDetail> {
  log({
    level: 'info',
    message: 'Using fallback approach: fetching tournament via list API',
    data: { code }
  })

  // Try different years to find the tournament
  const currentYear = new Date().getFullYear()
  const yearsToTry = [currentYear, currentYear + 1, currentYear - 1, currentYear - 2]

  for (const year of yearsToTry) {
    try {
      log({
        level: 'info',
        message: `Searching for tournament ${code} in year ${year}`,
        data: { code, year }
      })

      const response = await fetchTournamentsFromVIS(year)
      const tournament = response.tournaments.find(t => t.code === code)
      
      if (tournament) {
        // Convert Tournament to TournamentDetail
        const now = new Date()
        const startDate = new Date(tournament.startDate)
        const endDate = new Date(tournament.endDate)
        
        let status: 'upcoming' | 'live' | 'completed'
        if (now < startDate) {
          status = 'upcoming'
        } else if (now > endDate) {
          status = 'completed'
        } else {
          status = 'live'
        }

        const tournamentDetail: TournamentDetail = {
          ...tournament,
          status,
          venue: undefined,
          description: undefined
        }

        log({
          level: 'info',
          message: 'Tournament found via fallback list API',
          data: { 
            code,
            tournamentName: tournament.name,
            year,
            status
          }
        })

        return tournamentDetail
      }
    } catch (error) {
      log({
        level: 'warn',
        message: `Failed to search for tournament in year ${year}`,
        data: { 
          code,
          year,
          error: error instanceof Error ? error.message : String(error)
        }
      })
      // Continue to next year
    }
  }

  throw new VISApiError(`Tournament with code ${code} not found in any year`, 404)
}