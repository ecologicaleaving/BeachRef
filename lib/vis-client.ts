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
      const prize = extractAttribute('Prize')
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
        
        const detailedTournament = await fetchTournamentDetailByNumber(tournamentNumber, code)
        
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
        return await convertBasicTournamentToDetail(code)
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

// Final fallback: Use GetBeachTournamentList with Code filter (original direct approach)
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

// Step 1: Get tournament number from GetBeachTournamentList
async function getTournamentNumber(code: string): Promise<string | null> {
  try {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), VIS_API_CONFIG.timeout)

    const xmlBody = `<?xml version="1.0" encoding="utf-8"?>
<Requests>
  <Request Type="GetBeachTournamentList" 
           Fields="Code Name CountryCode StartDateMainDraw EndDateMainDraw Gender Type No">
    <Filter Code="${code}"/>
  </Request>
</Requests>`
    
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
      throw new VISApiError(`Failed to get tournament number: ${response.status}`, response.status)
    }

    const xmlText = await response.text()
    
    // Extract tournament number from response
    const tournamentRegex = /<BeachTournament\s+([^>]+)\/>/g
    const match = tournamentRegex.exec(xmlText)
    
    if (match) {
      const attributes = match[1]
      const noMatch = attributes.match(/No="([^"]*)"/)
      if (noMatch && noMatch[1]) {
        log({
          level: 'info',
          message: 'Successfully extracted tournament number',
          data: { code, tournamentNumber: noMatch[1] }
        })
        return noMatch[1]
      }
    }

    return null
  } catch (error) {
    log({
      level: 'warn',
      message: 'Failed to get tournament number',
      data: { code, error: error instanceof Error ? error.message : String(error) }
    })
    return null
  }
}

// Step 2: Get detailed tournament data using GetBeachTournament with tournament number
async function fetchTournamentDetailByNumber(tournamentNumber: string, code: string): Promise<TournamentDetail> {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), VIS_API_CONFIG.timeout)

  const xmlBody = `<?xml version="1.0" encoding="utf-8"?>
<Requests>
  <Request Type="GetBeachTournament" No="${tournamentNumber}">
  </Request>
</Requests>`
  
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
    throw new VISApiError(`GetBeachTournament failed: ${response.status}`, response.status)
  }

  const xmlText = await response.text()
  return parseEnhancedBeachTournamentResponse(xmlText, code)
}

// Convert basic tournament data to TournamentDetail format
async function convertBasicTournamentToDetail(code: string): Promise<TournamentDetail> {
  // Use the existing fallback mechanism
  return await fetchTournamentDetailViaList(code)
}

// Parse enhanced GetBeachTournament response with full tournament details
function parseEnhancedBeachTournamentResponse(xmlResponse: string, code: string): TournamentDetail {
  try {
    // Look for BeachTournament element with all attributes
    const tournamentRegex = /<BeachTournament\s+([^>]+)\/>/g
    const match = tournamentRegex.exec(xmlResponse)
    
    if (!match) {
      throw new VISApiError(`No tournament data found in GetBeachTournament response for ${code}`, 404)
    }

    const attributes = match[1]
    
    // Extract individual attributes using regex helper
    const extractAttribute = (attr: string): string | null => {
      const attrRegex = new RegExp(`${attr}="([^"]*)"`, 'i')
      const attrMatch = attributes.match(attrRegex)
      return attrMatch ? attrMatch[1] : null
    }

    // Extract basic required fields
    const tournamentCode = extractAttribute('Code')
    const name = extractAttribute('Name')
    const title = extractAttribute('Title')
    const countryCode = extractAttribute('CountryCode')
    const countryName = extractAttribute('CountryName')
    const startDate = extractAttribute('StartDate')
    const endDateMainDraw = extractAttribute('EndDateMainDraw')
    const gender = extractAttribute('Gender')
    const type = extractAttribute('Type')

    // Debug logging to track name parsing
    log({
      level: 'info',
      message: 'Parsing GetBeachTournament response fields',
      data: { 
        code,
        extractedName: name,
        extractedTitle: title,
        extractedCountryName: countryName,
        extractedCountryCode: countryCode
      }
    })

    // Validate essential fields
    if (!tournamentCode || !name || !countryCode || !startDate || !endDateMainDraw || !gender || !type) {
      throw new VISApiError(`Missing essential tournament data fields for ${code}`, 400)
    }

    // Map numeric gender codes
    let genderValue: 'Men' | 'Women' | 'Mixed'
    switch (gender) {
      case '0': genderValue = 'Men'; break
      case '1': genderValue = 'Women'; break
      case '2': genderValue = 'Mixed'; break
      default: throw new VISApiError(`Invalid gender code: ${gender}`, 400)
    }

    // Extract enhanced venue information
    const defaultVenue = extractAttribute('DefaultVenue')
    const defaultCity = extractAttribute('DefaultCity')
    let venue: string | undefined
    if (defaultVenue && defaultCity && defaultVenue !== defaultCity) {
      venue = `${defaultVenue}, ${defaultCity}`
    } else if (defaultVenue) {
      venue = defaultVenue
    } else if (defaultCity) {
      venue = defaultCity
    }

    // Determine tournament status
    const statusCode = extractAttribute('Status')
    let status: 'upcoming' | 'live' | 'completed'
    const now = new Date()
    const startDateObj = new Date(startDate)
    const endDateObj = new Date(endDateMainDraw)
    
    // Use date-based calculation (could be enhanced with status code mapping)
    if (now < startDateObj) {
      status = 'upcoming'
    } else if (now > endDateObj) {
      status = 'completed'
    } else {
      status = 'live'
    }

    // Build enhanced tournament detail object
    const tournamentDetail: TournamentDetail = {
      // Basic Tournament interface fields
      code: tournamentCode.trim(),
      name: name.trim(),  // This should be "AUS NT Thompsons Beach"
      countryCode: countryCode.trim().toUpperCase(),
      startDate,
      endDate: endDateMainDraw,
      gender: genderValue,
      type: type.trim(),
      
      // Enhanced TournamentDetail fields
      venue,
      status,
      title: title || undefined,
      countryName: countryName || undefined,
      season: extractAttribute('Season') || undefined,
      federationCode: extractAttribute('FederationCode') || undefined,
      organizerCode: extractAttribute('OrganizerCode') || undefined,
      tournamentNumber: extractAttribute('No') || undefined,
      
      // Competition structure
      competitionStructure: {
        nbTeamsMainDraw: parseInt(extractAttribute('NbTeamsMainDraw') || '0') || undefined,
        nbTeamsQualification: parseInt(extractAttribute('NbTeamsQualification') || '0') || undefined,
        nbTeamsFromQualification: parseInt(extractAttribute('NbTeamsFromQualification') || '0') || undefined,
        nbWildCards: parseInt(extractAttribute('NbWildCards') || '0') || undefined,
        matchFormat: extractAttribute('DefaultMatchFormat') || undefined,
        matchPointsMethod: extractAttribute('MatchPointsMethod') || undefined,
      },
      
      // Extended dates
      dates: {
        startDate,
        endDateMainDraw,
        endDateQualification: extractAttribute('EndDateQualification') || undefined,
        preliminaryInquiryMainDraw: extractAttribute('PreliminaryInquiryMainDraw') || undefined,
        deadline: extractAttribute('Deadline') || undefined,
      },
      
      // Points system
      pointsSystem: {
        entryPointsTemplateNo: extractAttribute('EntryPointsTemplateNo') || undefined,
        seedPointsTemplateNo: extractAttribute('SeedPointsTemplateNo') || undefined,
        earnedPointsTemplateNo: extractAttribute('NoTemplateEarnedPoints') || undefined,
        entryPointsDayOffset: extractAttribute('EntryPointsDayOffset') || undefined,
      },
      
      // Administration
      administration: {
        version: extractAttribute('Version') || undefined,
        isVisManaged: extractAttribute('IsVisManaged') === '1',
        isFreeEntrance: extractAttribute('IsFreeEntrance') === '1',
        webSite: extractAttribute('WebSite') || undefined,
        buyTicketsUrl: extractAttribute('BuyTicketsUrl') || undefined,
      }
    }

    log({
      level: 'info',
      message: 'Successfully parsed enhanced GetBeachTournament response',
      data: {
        code,
        name: tournamentDetail.name,
        hasVenue: !!tournamentDetail.venue,
        hasTitle: !!tournamentDetail.title,
        hasCompetitionStructure: !!tournamentDetail.competitionStructure?.nbTeamsMainDraw,
        season: tournamentDetail.season
      }
    })

    return tournamentDetail

  } catch (error) {
    if (error instanceof VISApiError) {
      throw error
    }
    throw new VISApiError('Failed to parse GetBeachTournament response', undefined, error)
  }
}