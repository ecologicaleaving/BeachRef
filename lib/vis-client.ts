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

// Enhanced logging utility with structured data
function log(entry: Omit<LogEntry, 'timestamp'>): void {
  const timestamp = new Date().toISOString()
  const logData = entry.data ? JSON.stringify(entry.data, null, 2) : ''
  
  if (entry.level === 'error') {
    console.error(`${timestamp} [VIS-Client:ERROR] ${entry.message}`)
    if (logData) console.error('Error Data:', logData)
  } else if (entry.level === 'warn') {
    console.warn(`${timestamp} [VIS-Client:WARN] ${entry.message}`)
    if (logData) console.warn('Warning Data:', logData)
  } else {
    console.log(`${timestamp} [VIS-Client:INFO] ${entry.message}`)
    if (logData) console.log('Info Data:', logData)
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

// Build XML request for specific tournament details using GetBeachTournament endpoint
function buildVISTournamentDetailRequest(code: string): string {
  // Try the dedicated GetBeachTournament endpoint for more detailed data
  const xmlRequest = `<?xml version="1.0" encoding="utf-8"?>
<Requests>
  <Request Type="GetBeachTournament" 
           Fields="Code Name CountryCode StartDateMainDraw EndDateMainDraw Gender Type Venue City Prize Description Status Categories">
    <Filter Code="${code}"/>
  </Request>
</Requests>`

  return xmlRequest
}

// Fallback: Build XML request using tournament list endpoint (current approach)
function buildVISTournamentListFilterRequest(code: string): string {
  const xmlRequest = `<?xml version="1.0" encoding="utf-8"?>
<Requests>
  <Request Type="GetBeachTournamentList" 
           Fields="Code Name CountryCode StartDateMainDraw EndDateMainDraw Gender Type">
    <Filter Code="${code}"/>
  </Request>
</Requests>`

  return xmlRequest
}

// Parse enhanced tournament detail response with additional fields
function parseVISTournamentDetailResponse(xmlResponse: string, code: string): TournamentDetail | null {
  try {
    // Try to parse enhanced response first (GetBeachTournament)
    const enhancedTournament = parseEnhancedVISResponse(xmlResponse, code)
    if (enhancedTournament) {
      log({
        level: 'info',
        message: 'Successfully parsed enhanced tournament data',
        data: { code, hasVenue: !!enhancedTournament.venue, hasDescription: !!enhancedTournament.description }
      })
      return enhancedTournament
    }

    // Fallback to basic parsing (GetBeachTournamentList format)
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
      venue: undefined, // Not available in basic tournament list
      description: undefined // Not available in basic tournament list
    }
  } catch (error) {
    if (error instanceof VISApiError) {
      throw error
    }
    throw new VISApiError('Failed to parse tournament detail response', undefined, error)
  }
}

// Parse enhanced VIS response from GetBeachTournament endpoint
function parseEnhancedVISResponse(xmlResponse: string, code: string): TournamentDetail | null {
  try {
    // Look for BeachTournament elements with enhanced fields
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

      const tournamentCode = extractAttribute('Code')
      if (tournamentCode !== code) continue

      const name = extractAttribute('Name')
      const countryCode = extractAttribute('CountryCode')
      const startDate = extractAttribute('StartDateMainDraw')
      const endDate = extractAttribute('EndDateMainDraw')
      const gender = extractAttribute('Gender')
      const type = extractAttribute('Type')
      
      // Enhanced fields from GetBeachTournament
      const venue = extractAttribute('Venue')
      const city = extractAttribute('City')
      const description = extractAttribute('Description')
      const apiStatus = extractAttribute('Status')

      // Validate required fields
      if (tournamentCode && name && countryCode && startDate && endDate && gender && type) {
        // Map numeric gender codes to string values
        let genderValue: 'Men' | 'Women' | 'Mixed' | null = null;
        if (gender === '0') genderValue = 'Men';
        else if (gender === '1') genderValue = 'Women'; 
        else if (gender === '2') genderValue = 'Mixed';
        
        if (genderValue) {
          // Determine status
          const now = new Date()
          const startDateObj = new Date(startDate)
          const endDateObj = new Date(endDate)
          
          let status: 'upcoming' | 'live' | 'completed'
          if (apiStatus) {
            // Use API status if available
            switch (apiStatus.toLowerCase()) {
              case 'upcoming':
              case 'scheduled':
                status = 'upcoming'
                break
              case 'live':
              case 'ongoing':
              case 'in_progress':
                status = 'live'
                break
              case 'completed':
              case 'finished':
                status = 'completed'
                break
              default:
                // Fall back to date-based calculation
                status = now < startDateObj ? 'upcoming' : (now > endDateObj ? 'completed' : 'live')
            }
          } else {
            // Date-based status calculation
            status = now < startDateObj ? 'upcoming' : (now > endDateObj ? 'completed' : 'live')
          }

          // Build enhanced venue information
          let venueInfo = venue || undefined
          if (venue && city && venue !== city) {
            venueInfo = `${venue}, ${city}`
          } else if (city && !venue) {
            venueInfo = city
          }

          return {
            code: tournamentCode.trim(),
            name: name.trim(),
            countryCode: countryCode.trim().toUpperCase(),
            startDate,
            endDate,
            gender: genderValue,
            type: type.trim(),
            status,
            venue: venueInfo,
            description: description || undefined
          }
        }
      }
    }

    return null // No matching tournament found
  } catch (error) {
    log({
      level: 'warn',
      message: 'Failed to parse enhanced tournament response, falling back to basic parsing',
      data: { code, error: error instanceof Error ? error.message : String(error) }
    })
    return null
  }
}

// Fetch specific tournament details from VIS API with enhanced GetBeachTournament integration
export async function fetchTournamentDetailFromVIS(code: string): Promise<TournamentDetail> {
  const startTime = Date.now()
  
  log({
    level: 'info',
    message: 'Starting enhanced tournament detail fetch with GetBeachTournament integration',
    data: { code, timestamp: new Date().toISOString() }
  })

  // Step 1: Get tournament number from GetBeachTournamentList
  try {
    log({
      level: 'info',
      message: 'Step 1: Getting tournament number from GetBeachTournamentList',
      data: { code }
    })
    
    const tournamentNumber = await getTournamentNumber(code)
    
    if (tournamentNumber) {
      // Step 2: Get detailed data using GetBeachTournament with tournament number
      try {
        log({
          level: 'info',
          message: 'Step 2: Fetching detailed data with GetBeachTournament endpoint',
          data: { code, tournamentNumber }
        })
        
        const detailedTournament = await fetchTournamentDetailByNumber(tournamentNumber)
        
        log({
          level: 'info',
          message: 'Enhanced tournament detail fetch successful',
          data: { 
            code,
            tournamentName: detailedTournament.name,
            hasEnhancedData: !!(detailedTournament.venue || detailedTournament.description),
            duration: Date.now() - startTime
          }
        })
        
        return detailedTournament
        
      } catch (detailError) {
        log({
          level: 'warn',
          message: 'GetBeachTournament detailed fetch failed, falling back to basic data',
          data: { 
            code,
            tournamentNumber,
            error: detailError instanceof Error ? detailError.message : String(detailError)
          }
        })
        
        // Fall back to basic tournament data from step 1
        return await fetchBasicTournamentDetail(code)
      }
    } else {
      log({
        level: 'warn',
        message: 'Could not get tournament number, using year-based search fallback',
        data: { code }
      })
      
      // Fallback to year-based search
      return await fetchTournamentDetailViaList(code)
    }
    
  } catch (error) {
    log({
      level: 'error',
      message: 'All tournament detail fetch approaches failed',
      data: { 
        code,
        error: error instanceof Error ? error.message : String(error),
        duration: Date.now() - startTime
      }
    })
    
    throw error instanceof VISApiError 
      ? error 
      : new VISApiError('Failed to fetch tournament details', undefined, error)
  }
}

// Direct tournament detail fetch (original approach)
// eslint-disable-next-line no-unused-vars
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

  // Try different years to find the tournament - broader range for debugging
  const yearsToTry = [2025, 2024, 2023]

  for (const year of yearsToTry) {
    try {
      log({
        level: 'info',
        message: `Searching for tournament ${code} in year ${year}`,
        data: { code, year }
      })

      const response = await fetchTournamentsFromVIS(year)
      
      log({
        level: 'info',
        message: `DEBUG - Got ${response.tournaments.length} tournaments for year ${year}`,
        data: { 
          code, 
          year,
          totalTournaments: response.tournaments.length,
          firstFewCodes: response.tournaments.slice(0, 5).map(t => t.code)
        }
      })
      
      const tournament = response.tournaments.find(t => t.code === code)
      
      if (tournament) {
        log({
          level: 'info',
          message: `FOUND tournament ${code} in year ${year}`,
          data: { code, year, tournament }
        })
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

// Final fallback: Use GetBeachTournamentList with Code filter (original direct approach)
// eslint-disable-next-line no-unused-vars
async function fetchTournamentDetailViaListFilter(code: string): Promise<TournamentDetail> {
  let lastError: unknown
  
  log({
    level: 'info',
    message: 'Using GetBeachTournamentList filter approach as final fallback',
    data: { code }
  })
  
  for (let attempt = 0; attempt <= RETRY_CONFIG.maxRetries; attempt++) {
    try {
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), VIS_API_CONFIG.timeout)

      const xmlBody = buildVISTournamentListFilterRequest(code)
      
      log({
        level: 'info',
        message: `GetBeachTournamentList filter attempt ${attempt + 1}/${RETRY_CONFIG.maxRetries + 1}`,
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
        throw new VISApiError(
          `VIS API GetBeachTournamentList filter returned ${response.status}: ${response.statusText}`,
          response.status
        )
      }

      const xmlText = await response.text()
      const tournament = parseVISTournamentDetailResponse(xmlText, code)
      
      if (!tournament) {
        throw new VISApiError(`Tournament with code ${code} not found via list filter`, 404)
      }
      
      log({
        level: 'info',
        message: 'GetBeachTournamentList filter approach successful',
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
        message: `GetBeachTournamentList filter attempt ${attempt + 1} failed`,
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
    : new VISApiError('Failed to fetch tournament via GetBeachTournamentList filter', undefined, lastError)
}

// NEW: Two-step VIS API integration for enhanced tournament data

// Step 1: Get tournament number from existing GetBeachTournamentList data
export async function getTournamentNumber(code: string): Promise<string> {
  log({
    level: 'info',
    message: 'Getting tournament number for enhanced data',
    data: { code }
  })

  try {
    // Use existing tournament list functionality to get the tournament with the 'No' field
    const xmlRequest = `<?xml version="1.0" encoding="utf-8"?>
<Requests>
  <Request Type="GetBeachTournamentList" 
           Fields="Code Name CountryCode StartDateMainDraw EndDateMainDraw Gender Type No">
    <Filter Code="${code}"/>
  </Request>
</Requests>`

    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), VIS_API_CONFIG.timeout)
    const response = await fetch(VIS_API_CONFIG.baseURL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/xml',
        'X-FIVB-App-ID': VIS_API_CONFIG.appId,
        'User-Agent': 'BeachRef-MVP/1.0'
      },
      body: xmlRequest,
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
    
    // Extract tournament number using regex
    const tournamentRegex = /<BeachTournament\s+([^>]+)\/>/g
    const match = tournamentRegex.exec(xmlText)
    
    if (match) {
      const attributes = match[1]
      const noMatch = attributes.match(/No="([^"]*)"/i)
      if (noMatch && noMatch[1]) {
        const tournamentNumber = noMatch[1]
        log({
          level: 'info',
          message: 'Successfully extracted tournament number',
          data: { code, tournamentNumber }
        })
        return tournamentNumber
      }
    }

    log({
      level: 'warn',
      message: 'Tournament number not found - tournament may not exist',
      data: { code, xmlResponse: xmlText.substring(0, 500) }
    })
    throw new VISApiError(`Tournament number not found for code ${code}`, 404)

  } catch (error) {
    log({
      level: 'error',
      message: 'Failed to get tournament number',
      data: { code, error: error instanceof Error ? error.message : String(error) }
    })
    throw error instanceof VISApiError ? error : new VISApiError('Failed to get tournament number', undefined, error)
  }
}

// Step 2: Fetch detailed tournament data using GetBeachTournament endpoint
export async function fetchTournamentDetailByNumber(tournamentNo: string): Promise<TournamentDetail> {
  const startTime = Date.now()
  let lastError: unknown
  
  log({
    level: 'info',
    message: 'Starting GetBeachTournament request for enhanced data',
    data: { tournamentNo }
  })

  for (let attempt = 0; attempt <= RETRY_CONFIG.maxRetries; attempt++) {
    try {
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), VIS_API_CONFIG.timeout)

      const xmlBody = `<?xml version="1.0" encoding="utf-8"?>
<VISA>
  <Request>
    <RequestMessage>
      <Type>GetBeachTournament</Type>
      <No>${tournamentNo}</No>
    </RequestMessage>
  </Request>
</VISA>`
      
      log({
        level: 'info',
        message: `GetBeachTournament attempt ${attempt + 1}/${RETRY_CONFIG.maxRetries + 1}`,
        data: { attempt, tournamentNo, xmlBody }
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
          `GetBeachTournament API returned ${response.status}: ${response.statusText}`,
          response.status
        )
      }

      const xmlText = await response.text()
      
      // DEBUG: Log the actual XML response to understand the structure
      log({
        level: 'info',
        message: 'DEBUG - Raw XML response from GetBeachTournament',
        data: { 
          tournamentNo,
          xmlLength: xmlText.length,
          xmlSnippet: xmlText.substring(0, 500) + (xmlText.length > 500 ? '...' : ''),
          xmlFull: xmlText
        }
      })
      
      const tournament = parseEnhancedBeachTournamentResponse(xmlText)
      
      const duration = Date.now() - startTime
      
      log({
        level: 'info',
        message: 'GetBeachTournament request successful',
        data: { 
          tournamentNo,
          tournamentName: tournament.name,
          duration,
          attempt: attempt + 1
        },
        duration
      })

      return tournament

    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        lastError = new VISApiError('GetBeachTournament request timeout', undefined, error)
      } else if (error instanceof TypeError) {
        lastError = new VISApiError('Network error connecting to GetBeachTournament API', undefined, error)
      } else if (error instanceof VISApiError) {
        lastError = error
      } else {
        lastError = error
      }

      log({
        level: 'warn',
        message: `GetBeachTournament attempt ${attempt + 1} failed`,
        data: { 
          attempt: attempt + 1,
          tournamentNo,
          error: error instanceof Error ? error.message : String(error),
          willRetry: attempt < RETRY_CONFIG.maxRetries && isRetryableError(lastError)
        }
      })

      if (attempt >= RETRY_CONFIG.maxRetries || !isRetryableError(lastError)) {
        break
      }

      const delay = calculateBackoffDelay(attempt, RETRY_CONFIG)
      log({
        level: 'info',
        message: `Retrying GetBeachTournament request in ${delay}ms`,
        data: { delay, nextAttempt: attempt + 2 }
      })
      
      await sleep(delay)
    }
  }

  const duration = Date.now() - startTime
  log({
    level: 'error',
    message: 'All GetBeachTournament attempts failed',
    data: { 
      tournamentNo,
      attempts: RETRY_CONFIG.maxRetries + 1,
      duration,
      finalError: lastError instanceof Error ? lastError.message : String(lastError)
    },
    duration
  })

  throw lastError instanceof VISApiError 
    ? lastError 
    : new VISApiError('Failed to fetch enhanced tournament data from GetBeachTournament API', undefined, lastError)
}

// Enhanced XML parsing for GetBeachTournament response
export function parseEnhancedBeachTournamentResponse(xmlData: string): TournamentDetail {
  try {
    log({
      level: 'info',
      message: 'Parsing enhanced tournament data from GetBeachTournament response',
      data: { xmlLength: xmlData.length }
    })

    // Helper function to extract XML element value (improved regex safety)
    const extractElement = (xml: string, elementName: string): string | null => {
      const escapedElementName = elementName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
      const regex = new RegExp(`<${escapedElementName}[^>]*>([^<]*)</${escapedElementName}>`, 'i')
      const match = xml.match(regex)
      return match ? match[1].trim() : null
    }

    // Helper function to extract XML attribute (improved regex safety)
    const extractAttribute = (xml: string, attributeName: string): string | null => {
      const escapedAttributeName = attributeName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
      const regex = new RegExp(`${escapedAttributeName}="([^"]*)"`, 'i')
      const match = xml.match(regex)
      return match ? match[1].trim() : null
    }

    // DEBUG: Log XML structure to understand format
    log({
      level: 'info',
      message: 'DEBUG - Analyzing XML structure for parsing strategy',
      data: {
        xmlLength: xmlData.length,
        hasBeachTournamentElement: xmlData.includes('<BeachTournament'),
        xmlSample: xmlData.substring(0, 300)
      }
    })

    // Try to extract data - first check if it's attribute-based (like in GetBeachTournamentList)
    let code = extractAttribute(xmlData, 'Code') || extractElement(xmlData, 'Code') || ''
    let name = extractAttribute(xmlData, 'Name') || extractElement(xmlData, 'Name') || extractAttribute(xmlData, 'Title') || extractElement(xmlData, 'Title') || ''
    let countryCode = extractAttribute(xmlData, 'CountryCode') || extractElement(xmlData, 'CountryCode') || ''
    let countryName = extractAttribute(xmlData, 'CountryName') || extractElement(xmlData, 'CountryName') || ''
    let startDate = extractAttribute(xmlData, 'StartDateMainDraw') || extractElement(xmlData, 'StartDateMainDraw') || extractAttribute(xmlData, 'StartDate') || extractElement(xmlData, 'StartDate') || ''
    let endDate = extractAttribute(xmlData, 'EndDateMainDraw') || extractElement(xmlData, 'EndDateMainDraw') || extractAttribute(xmlData, 'EndDate') || extractElement(xmlData, 'EndDate') || ''
    let gender = extractAttribute(xmlData, 'Gender') || extractElement(xmlData, 'Gender') || ''
    let type = extractAttribute(xmlData, 'Type') || extractElement(xmlData, 'Type') || ''

    // Enhanced fields from GetBeachTournament
    const title = extractAttribute(xmlData, 'Title') || extractElement(xmlData, 'Title') || name
    const venue = extractAttribute(xmlData, 'Venue') || extractElement(xmlData, 'Venue') || extractAttribute(xmlData, 'DefaultVenue') || extractElement(xmlData, 'DefaultVenue') || ''
    const city = extractAttribute(xmlData, 'City') || extractElement(xmlData, 'City') || extractAttribute(xmlData, 'DefaultCity') || extractElement(xmlData, 'DefaultCity') || ''
    const season = extractAttribute(xmlData, 'Season') || extractElement(xmlData, 'Season') || ''
    const federationCode = extractAttribute(xmlData, 'FederationCode') || extractElement(xmlData, 'FederationCode') || ''
    const organizerCode = extractAttribute(xmlData, 'OrganizerCode') || extractElement(xmlData, 'OrganizerCode') || ''
    const tournamentNumber = extractAttribute(xmlData, 'No') || extractElement(xmlData, 'No') || ''

    // DEBUG: Log extracted values
    log({
      level: 'info',
      message: 'DEBUG - Extracted values from XML',
      data: {
        code, name, countryCode, startDate, endDate, gender, type,
        title, venue, city, season, federationCode, organizerCode, tournamentNumber
      }
    })

    // Competition structure
    const nbTeamsMainDraw = extractAttribute(xmlData, 'NbTeamsMainDraw') || extractElement(xmlData, 'NbTeamsMainDraw')
    const nbTeamsQualification = extractAttribute(xmlData, 'NbTeamsQualification') || extractElement(xmlData, 'NbTeamsQualification')
    const nbTeamsFromQualification = extractAttribute(xmlData, 'NbTeamsFromQualification') || extractElement(xmlData, 'NbTeamsFromQualification')
    const nbWildCards = extractAttribute(xmlData, 'NbWildCards') || extractElement(xmlData, 'NbWildCards')
    const matchFormat = extractAttribute(xmlData, 'MatchFormat') || extractElement(xmlData, 'MatchFormat') || extractAttribute(xmlData, 'DefaultMatchFormat') || extractElement(xmlData, 'DefaultMatchFormat')
    const matchPointsMethod = extractAttribute(xmlData, 'MatchPointsMethod') || extractElement(xmlData, 'MatchPointsMethod')

    // Detailed dates
    const endDateQualification = extractAttribute(xmlData, 'EndDateQualification') || extractElement(xmlData, 'EndDateQualification')
    const preliminaryInquiryMainDraw = extractAttribute(xmlData, 'PreliminaryInquiryMainDraw') || extractElement(xmlData, 'PreliminaryInquiryMainDraw')
    const deadline = extractAttribute(xmlData, 'Deadline') || extractElement(xmlData, 'Deadline')

    // Points system
    const entryPointsTemplateNo = extractAttribute(xmlData, 'EntryPointsTemplateNo') || extractElement(xmlData, 'EntryPointsTemplateNo')
    const seedPointsTemplateNo = extractAttribute(xmlData, 'SeedPointsTemplateNo') || extractElement(xmlData, 'SeedPointsTemplateNo')
    const earnedPointsTemplateNo = extractAttribute(xmlData, 'EarnedPointsTemplateNo') || extractElement(xmlData, 'EarnedPointsTemplateNo') || extractAttribute(xmlData, 'NoTemplateEarnedPoints') || extractElement(xmlData, 'NoTemplateEarnedPoints')
    const entryPointsDayOffset = extractAttribute(xmlData, 'EntryPointsDayOffset') || extractElement(xmlData, 'EntryPointsDayOffset')

    // Administration
    const version = extractAttribute(xmlData, 'Version') || extractElement(xmlData, 'Version')
    const isVisManagedStr = extractAttribute(xmlData, 'IsVisManaged') || extractElement(xmlData, 'IsVisManaged')
    const isFreeEntranceStr = extractAttribute(xmlData, 'IsFreeEntrance') || extractElement(xmlData, 'IsFreeEntrance')
    const webSite = extractAttribute(xmlData, 'WebSite') || extractElement(xmlData, 'WebSite')
    const buyTicketsUrl = extractAttribute(xmlData, 'BuyTicketsUrl') || extractElement(xmlData, 'BuyTicketsUrl')

    // Map gender codes to string values
    let genderValue: 'Men' | 'Women' | 'Mixed' = 'Mixed'
    if (gender === '0') genderValue = 'Men'
    else if (gender === '1') genderValue = 'Women'
    else if (gender === '2') genderValue = 'Mixed'

    // Calculate enhanced tournament status using phase dates
    const now = new Date()
    const tournamentStart = new Date(startDate)
    const tournamentEnd = new Date(endDate)
    const mainDrawEnd = endDateQualification ? new Date(endDateQualification) : tournamentEnd

    let status: 'upcoming' | 'live' | 'completed' = 'upcoming'
    if (now < tournamentStart) {
      status = 'upcoming'
    } else if (now >= tournamentStart && now <= mainDrawEnd) {
      status = 'live'
    } else {
      status = 'completed'
    }

    const tournament: TournamentDetail = {
      code,
      name,
      countryCode: countryCode.toUpperCase(),
      startDate,
      endDate,
      gender: genderValue,
      type,
      status,
      title,
      countryName,
      venue,
      city,
      season,
      tournamentNumber
    }

    // Add competition structure if data exists
    if (nbTeamsMainDraw || nbTeamsQualification || matchFormat || matchPointsMethod) {
      tournament.competitionStructure = {
        ...(nbTeamsMainDraw && { nbTeamsMainDraw: parseInt(nbTeamsMainDraw) }),
        ...(nbTeamsQualification && { nbTeamsQualification: parseInt(nbTeamsQualification) }),
        ...(nbTeamsFromQualification && { nbTeamsFromQualification: parseInt(nbTeamsFromQualification) }),
        ...(nbWildCards && { nbWildCards: parseInt(nbWildCards) }),
        ...(matchFormat && { matchFormat }),
        ...(matchPointsMethod && { matchPointsMethod })
      }
    }

    // Add detailed dates if data exists
    if (endDateQualification || preliminaryInquiryMainDraw || deadline) {
      tournament.dates = {
        startDate,
        ...(endDate && { endDateMainDraw: endDate }),
        ...(endDateQualification && { endDateQualification }),
        ...(preliminaryInquiryMainDraw && { preliminaryInquiryMainDraw }),
        ...(deadline && { deadline })
      }
    }

    // Add points system if data exists
    if (entryPointsTemplateNo || seedPointsTemplateNo || earnedPointsTemplateNo) {
      tournament.pointsSystem = {
        ...(entryPointsTemplateNo && { entryPointsTemplateNo }),
        ...(seedPointsTemplateNo && { seedPointsTemplateNo }),
        ...(earnedPointsTemplateNo && { earnedPointsTemplateNo }),
        ...(entryPointsDayOffset && { entryPointsDayOffset })
      }
    }

    // Add administration if data exists
    if (version || isVisManagedStr || isFreeEntranceStr || webSite || buyTicketsUrl || federationCode || organizerCode) {
      tournament.administration = {
        ...(version && { version }),
        ...(isVisManagedStr !== null && { isVisManaged: isVisManagedStr === 'true' || isVisManagedStr === '1' }),
        ...(isFreeEntranceStr !== null && { isFreeEntrance: isFreeEntranceStr === 'true' || isFreeEntranceStr === '1' }),
        ...(webSite && { webSite }),
        ...(buyTicketsUrl && { buyTicketsUrl }),
        ...(federationCode && { federationCode }),
        ...(organizerCode && { organizerCode })
      }
    }

    log({
      level: 'info',
      message: 'Successfully parsed enhanced tournament data',
      data: { 
        code,
        name,
        hasVenue: !!venue,
        hasCompetitionStructure: !!tournament.competitionStructure,
        hasDetailedDates: !!tournament.dates,
        hasPointsSystem: !!tournament.pointsSystem,
        hasAdministration: !!tournament.administration
      }
    })

    return tournament

  } catch (error) {
    log({
      level: 'error',
      message: 'Failed to parse enhanced tournament data',
      data: { error: error instanceof Error ? error.message : String(error), xmlLength: xmlData.length }
    })
    throw new VISApiError('Failed to parse enhanced tournament response', undefined, error)
  }
}

// Fallback function using basic tournament detail (existing implementation)
async function fetchBasicTournamentDetail(code: string): Promise<TournamentDetail> {
  let lastError: unknown
  
  log({
    level: 'info',
    message: 'Fallback: Using basic tournament detail fetch',
    data: { code }
  })

  for (let attempt = 0; attempt <= RETRY_CONFIG.maxRetries; attempt++) {
    try {
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), VIS_API_CONFIG.timeout)

      const xmlBody = buildVISTournamentDetailRequest(code)
      
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
      const tournament = parseVISTournamentDetailResponse(xmlText, code)
      
      if (!tournament) {
        throw new VISApiError(`Tournament with code ${code} not found`, 404)
      }
      
      return tournament

    } catch (error) {
      lastError = error
      if (attempt >= RETRY_CONFIG.maxRetries || !isRetryableError(lastError)) {
        break
      }
      await sleep(calculateBackoffDelay(attempt, RETRY_CONFIG))
    }
  }

  throw lastError instanceof VISApiError 
    ? lastError 
    : new VISApiError('Failed to fetch basic tournament detail', undefined, lastError)
}

// Enhanced fetchTournamentDetailFromVIS with two-step process and comprehensive fallback
export async function fetchTournamentDetailFromVISEnhanced(code: string): Promise<TournamentDetail> {
  log({
    level: 'info',
    message: 'Starting tournament detail fetch',
    data: { code }
  })

  // Use the reliable basic tournament list approach that we know works
  // This is the same approach used by the home page API that returns proper data
  return await fetchTournamentDetailViaList(code)
}