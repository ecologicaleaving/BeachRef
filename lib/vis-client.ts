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

// Fetch specific tournament details from VIS API
export async function fetchTournamentDetailFromVIS(code: string): Promise<TournamentDetail> {
  const startTime = Date.now()
  let lastError: unknown
  
  log({
    level: 'info',
    message: 'Starting VIS API request for tournament detail',
    data: { code }
  })

  for (let attempt = 0; attempt <= RETRY_CONFIG.maxRetries; attempt++) {
    try {
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), VIS_API_CONFIG.timeout)

      const xmlBody = buildVISTournamentDetailRequest(code)
      
      log({
        level: 'info',
        message: `VIS API tournament detail attempt ${attempt + 1}/${RETRY_CONFIG.maxRetries + 1}`,
        data: { attempt, code, xmlBody }
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
      const tournament = parseVISTournamentDetailResponse(xmlText, code)
      
      if (!tournament) {
        throw new VISApiError(`Tournament with code ${code} not found`, 404)
      }
      
      const duration = Date.now() - startTime
      
      log({
        level: 'info',
        message: 'VIS API tournament detail request successful',
        data: { 
          code,
          tournamentName: tournament.name,
          duration,
          attempt: attempt + 1
        },
        duration
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
        message: `VIS API tournament detail attempt ${attempt + 1} failed`,
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
      log({
        level: 'info',
        message: `Retrying VIS API tournament detail request in ${delay}ms`,
        data: { delay, nextAttempt: attempt + 2 }
      })
      
      await sleep(delay)
    }
  }

  const duration = Date.now() - startTime
  log({
    level: 'error',
    message: 'All VIS API tournament detail attempts failed',
    data: { 
      code,
      attempts: RETRY_CONFIG.maxRetries + 1,
      duration,
      finalError: lastError instanceof Error ? lastError.message : String(lastError)
    },
    duration
  })

  throw lastError instanceof VISApiError 
    ? lastError 
    : new VISApiError('Failed to fetch tournament detail from VIS API', undefined, lastError)
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
           Fields="Code Name No">
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
    const extractAttribute = (xml: string, elementName: string, attributeName: string): string | null => {
      const regex = new RegExp(`<${elementName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}[^>]*${attributeName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}="([^"]*)"[^>]*>`, 'i')
      const match = xml.match(regex)
      return match ? match[1].trim() : null
    }

    // Extract basic tournament information - CRITICAL: Fix name parsing issue
    const code = extractElement(xmlData, 'Code') || ''
    const name = extractElement(xmlData, 'Name') || extractElement(xmlData, 'Title') || ''
    const countryCode = extractElement(xmlData, 'CountryCode') || ''
    const countryName = extractElement(xmlData, 'CountryName') || ''
    const startDate = extractElement(xmlData, 'StartDateMainDraw') || extractElement(xmlData, 'StartDate') || ''
    const endDate = extractElement(xmlData, 'EndDateMainDraw') || extractElement(xmlData, 'EndDate') || ''
    const gender = extractElement(xmlData, 'Gender') || ''
    const type = extractElement(xmlData, 'Type') || ''

    // Enhanced fields from GetBeachTournament
    const title = extractElement(xmlData, 'Title') || name
    const venue = extractElement(xmlData, 'Venue') || ''
    const city = extractElement(xmlData, 'City') || ''
    const season = extractElement(xmlData, 'Season') || ''
    const federationCode = extractElement(xmlData, 'FederationCode') || ''
    const organizerCode = extractElement(xmlData, 'OrganizerCode') || ''
    const tournamentNumber = extractElement(xmlData, 'No') || ''

    // Competition structure
    const nbTeamsMainDraw = extractElement(xmlData, 'NbTeamsMainDraw')
    const nbTeamsQualification = extractElement(xmlData, 'NbTeamsQualification')
    const nbTeamsFromQualification = extractElement(xmlData, 'NbTeamsFromQualification')
    const nbWildCards = extractElement(xmlData, 'NbWildCards')
    const matchFormat = extractElement(xmlData, 'MatchFormat')
    const matchPointsMethod = extractElement(xmlData, 'MatchPointsMethod')

    // Detailed dates
    const endDateQualification = extractElement(xmlData, 'EndDateQualification')
    const preliminaryInquiryMainDraw = extractElement(xmlData, 'PreliminaryInquiryMainDraw')
    const deadline = extractElement(xmlData, 'Deadline')

    // Points system
    const entryPointsTemplateNo = extractElement(xmlData, 'EntryPointsTemplateNo')
    const seedPointsTemplateNo = extractElement(xmlData, 'SeedPointsTemplateNo')
    const earnedPointsTemplateNo = extractElement(xmlData, 'EarnedPointsTemplateNo')
    const entryPointsDayOffset = extractElement(xmlData, 'EntryPointsDayOffset')

    // Administration
    const version = extractElement(xmlData, 'Version')
    const isVisManagedStr = extractElement(xmlData, 'IsVisManaged')
    const isFreeEntranceStr = extractElement(xmlData, 'IsFreeEntrance')
    const webSite = extractElement(xmlData, 'WebSite')
    const buyTicketsUrl = extractElement(xmlData, 'BuyTicketsUrl')

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
  const startTime = Date.now()
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
  try {
    log({
      level: 'info',
      message: 'Starting enhanced tournament detail fetch with two-step process',
      data: { code }
    })

    // Step 1: Get tournament number from existing data
    const tournamentNumber = await getTournamentNumber(code)
    
    // Step 2: Fetch enhanced data using GetBeachTournament
    const enhancedDetail = await fetchTournamentDetailByNumber(tournamentNumber)
    return enhancedDetail
    
  } catch (error) {
    log({
      level: 'warn',
      message: 'Enhanced tournament fetch failed, falling back to basic data',
      data: { code, error: error instanceof Error ? error.message : 'Unknown error' }
    })
    
    // Fallback: Use basic tournament detail function
    return await fetchBasicTournamentDetail(code)
  }
}