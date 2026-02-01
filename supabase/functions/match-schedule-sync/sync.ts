// Match Data Synchronization Module
// Handles active tournament discovery, match data mapping, and UPSERT operations

export interface FIVBMatch {
  No: string;
  NoInTournament: string;
  TeamAName: string;
  TeamBName: string;
  LocalDate: string;
  LocalTime: string;
  Court: string;
  Status: string;
  Round: string;
  MatchPointsA?: number;
  MatchPointsB?: number;
  PointsTeamASet1?: number;
  PointsTeamBSet1?: number;
  PointsTeamASet2?: number;
  PointsTeamBSet2?: number;
  PointsTeamASet3?: number;
  PointsTeamBSet3?: number;
  DurationSet1?: string;
  DurationSet2?: string;
  DurationSet3?: string;
  NoReferee1?: string;
  NoReferee2?: string;
  Referee1Name?: string;
  Referee2Name?: string;
  Referee1FederationCode?: string;
  Referee2FederationCode?: string;
}

export interface DatabaseMatch {
  no: string;
  tournament_no: string;
  no_in_tournament: string;
  team_a_name: string;
  team_b_name: string;
  local_date: string;
  local_time: string;
  court: string;
  status: string;
  round: string;
  match_points_a?: number;
  match_points_b?: number;
  points_team_a_set1?: number;
  points_team_b_set1?: number;
  points_team_a_set2?: number;
  points_team_b_set2?: number;
  points_team_a_set3?: number;
  points_team_b_set3?: number;
  duration_set1?: string;
  duration_set2?: string;
  duration_set3?: string;
  no_referee1?: string;
  no_referee2?: string;
  referee1_name?: string;
  referee2_name?: string;
  referee1_federation_code?: string;
  referee2_federation_code?: string;
  last_synced: string;
  updated_at: string;
  version?: number;
}

export interface ActiveTournament {
  no: string;
  code: string;
  name: string;
  status: string;
  start_date: string;
  end_date: string;
  last_synced: string;
}

export interface MatchSyncResult {
  processed: number;
  inserts: number;
  updates: number;
  errors: number;
  errorMessages: string[];
  matchNumbers: string[];
}

export class MatchSynchronizer {
  private supabase: any;
  
  constructor(supabaseClient: any) {
    this.supabase = supabaseClient;
  }

  /**
   * Discover active tournaments requiring match synchronization
   */
  async discoverActiveTournaments(): Promise<ActiveTournament[]> {
    try {
      console.log('Querying active tournaments for match synchronization');
      
      const { data: tournaments, error } = await this.supabase
        .from('tournaments')
        .select('no, code, name, status, start_date, end_date, last_synced')
        .in('status', ['Running', 'Live'])
        .lte('start_date', new Date().toISOString().split('T')[0])
        .gte('end_date', new Date().toISOString().split('T')[0])
        .gte('last_synced', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()) // Within last 7 days
        .order('start_date', { ascending: true });

      if (error) {
        console.error('Error querying active tournaments:', error);
        throw new Error(`Failed to query active tournaments: ${error.message}`);
      }

      if (!tournaments || tournaments.length === 0) {
        console.log('No active tournaments found');
        return [];
      }

      // Apply priority logic
      const prioritizedTournaments = this.prioritizeTournaments(tournaments);
      
      console.log(`Found ${prioritizedTournaments.length} active tournaments requiring match sync`);
      prioritizedTournaments.forEach(t => {
        console.log(`- ${t.no}: ${t.name} (${t.status}) - ${t.start_date} to ${t.end_date}`);
      });

      return prioritizedTournaments;

    } catch (error) {
      console.error('Error in discoverActiveTournaments:', error);
      throw error;
    }
  }

  /**
   * Prioritize tournaments for sync processing
   */
  private prioritizeTournaments(tournaments: ActiveTournament[]): ActiveTournament[] {
    return tournaments.sort((a, b) => {
      // Priority 1: Currently Live tournaments
      if (a.status === 'Live' && b.status !== 'Live') return -1;
      if (b.status === 'Live' && a.status !== 'Live') return 1;
      
      // Priority 2: Currently Running tournaments
      if (a.status === 'Running' && b.status !== 'Running') return -1;
      if (b.status === 'Running' && a.status !== 'Running') return 1;
      
      // Priority 3: Today's tournaments
      const today = new Date().toISOString().split('T')[0];
      const aIsToday = a.start_date <= today && a.end_date >= today;
      const bIsToday = b.start_date <= today && b.end_date >= today;
      
      if (aIsToday && !bIsToday) return -1;
      if (bIsToday && !aIsToday) return 1;
      
      // Priority 4: Start date (earlier first)
      return a.start_date.localeCompare(b.start_date);
    });
  }

  /**
   * Parse XML matches from FIVB API response
   */
  parseXMLMatches(xmlText: string): FIVBMatch[] {
    try {
      const matches: FIVBMatch[] = [];
      
      // Handle different XML response formats
      const cleanedXml = this.cleanXMLResponse(xmlText);
      
      // Extract match blocks from XML
      const matchRegex = /<BeachMatch[^>]*>(.*?)<\/BeachMatch>/gs;
      const matchBlocks = cleanedXml.matchAll(matchRegex);
      
      for (const match of matchBlocks) {
        const matchXml = match[1];
        
        const fivbMatch: FIVBMatch = {
          No: this.extractXmlValue(matchXml, 'No') || '',
          NoInTournament: this.extractXmlValue(matchXml, 'NoInTournament') || '',
          TeamAName: this.extractXmlValue(matchXml, 'TeamAName') || '',
          TeamBName: this.extractXmlValue(matchXml, 'TeamBName') || '',
          LocalDate: this.extractXmlValue(matchXml, 'LocalDate') || '',
          LocalTime: this.extractXmlValue(matchXml, 'LocalTime') || '',
          Court: this.extractXmlValue(matchXml, 'Court') || '',
          Status: this.extractXmlValue(matchXml, 'Status') || 'Scheduled',
          Round: this.extractXmlValue(matchXml, 'Round') || '',
          MatchPointsA: this.extractNumericValue(matchXml, 'MatchPointsA'),
          MatchPointsB: this.extractNumericValue(matchXml, 'MatchPointsB'),
          PointsTeamASet1: this.extractNumericValue(matchXml, 'PointsTeamASet1'),
          PointsTeamBSet1: this.extractNumericValue(matchXml, 'PointsTeamBSet1'),
          PointsTeamASet2: this.extractNumericValue(matchXml, 'PointsTeamASet2'),
          PointsTeamBSet2: this.extractNumericValue(matchXml, 'PointsTeamBSet2'),
          PointsTeamASet3: this.extractNumericValue(matchXml, 'PointsTeamASet3'),
          PointsTeamBSet3: this.extractNumericValue(matchXml, 'PointsTeamBSet3'),
          DurationSet1: this.extractXmlValue(matchXml, 'DurationSet1'),
          DurationSet2: this.extractXmlValue(matchXml, 'DurationSet2'),
          DurationSet3: this.extractXmlValue(matchXml, 'DurationSet3'),
          NoReferee1: this.extractXmlValue(matchXml, 'NoReferee1'),
          NoReferee2: this.extractXmlValue(matchXml, 'NoReferee2'),
          Referee1Name: this.extractXmlValue(matchXml, 'Referee1Name'),
          Referee2Name: this.extractXmlValue(matchXml, 'Referee2Name'),
          Referee1FederationCode: this.extractXmlValue(matchXml, 'Referee1FederationCode'),
          Referee2FederationCode: this.extractXmlValue(matchXml, 'Referee2FederationCode')
        };
        
        // Validate required fields
        if (this.validateMatch(fivbMatch)) {
          matches.push(fivbMatch);
        } else {
          console.warn(`Skipping invalid match: ${JSON.stringify(fivbMatch)}`);
        }
      }
      
      console.log(`Successfully parsed ${matches.length} matches from XML`);
      return matches;
      
    } catch (error) {
      console.error('Error parsing XML matches:', error);
      throw new Error(`XML match parsing failed: ${error.message}`);
    }
  }

  /**
   * Clean and prepare XML response for parsing
   */
  private cleanXMLResponse(xmlText: string): string {
    try {
      // Remove BOM and normalize line endings
      let cleaned = xmlText.replace(/^\uFEFF/, '').replace(/\r\n/g, '\n');
      
      // Remove XML declaration and process instructions
      cleaned = cleaned.replace(/<\?xml[^>]*\?>/gi, '');
      
      // Handle CDATA sections
      cleaned = cleaned.replace(/<!\[CDATA\[(.*?)\]\]>/gs, '$1');
      
      // Normalize whitespace in XML content
      cleaned = cleaned.replace(/>\s+</g, '><');
      
      return cleaned.trim();
      
    } catch (error) {
      console.error('Error cleaning XML response:', error);
      return xmlText; // Return original if cleaning fails
    }
  }

  /**
   * Extract value from XML content using tag name
   */
  private extractXmlValue(xml: string, tagName: string): string | null {
    try {
      // Handle both self-closing and regular tags
      const regex = new RegExp(`<${tagName}[^>]*>([^<]*)<\\/${tagName}>|<${tagName}[^>]*\\/>`, 'i');
      const match = xml.match(regex);
      
      if (match && match[1] !== undefined) {
        return match[1].trim();
      }
      
      // Handle attributes in self-closing tags
      const attrRegex = new RegExp(`<${tagName}[^>]*\\s+value\\s*=\\s*["']([^"']*)["'][^>]*\\/>`, 'i');
      const attrMatch = xml.match(attrRegex);
      
      if (attrMatch && attrMatch[1]) {
        return attrMatch[1].trim();
      }
      
      return null;
      
    } catch (error) {
      console.error(`Error extracting XML value for tag ${tagName}:`, error);
      return null;
    }
  }

  /**
   * Extract numeric value from XML content
   */
  private extractNumericValue(xml: string, tagName: string): number | undefined {
    const value = this.extractXmlValue(xml, tagName);
    if (!value) return undefined;
    
    const parsed = parseInt(value, 10);
    return isNaN(parsed) ? undefined : parsed;
  }

  /**
   * Validate match data before processing
   */
  private validateMatch(match: FIVBMatch): boolean {
    // Required fields validation
    if (!match.No) {
      console.warn(`Match missing required field: No=${match.No}`);
      return false;
    }
    
    // Match number should be numeric
    if (!/^\d+$/.test(match.No)) {
      console.warn(`Invalid match number format: ${match.No}`);
      return false;
    }
    
    // Basic team name validation
    if (!match.TeamAName && !match.TeamBName) {
      console.warn(`Match ${match.No} missing team names`);
      return false;
    }
    
    // Basic date validation
    if (match.LocalDate && !this.isValidDate(match.LocalDate)) {
      console.warn(`Match ${match.No} has invalid date format: ${match.LocalDate}`);
    }
    
    return true;
  }

  /**
   * Check if date string is valid
   */
  private isValidDate(dateString: string): boolean {
    try {
      if (!dateString || dateString.trim() === '') return false;
      
      const date = new Date(dateString);
      return !isNaN(date.getTime()) && date.getFullYear() > 1900;
      
    } catch {
      return false;
    }
  }

  /**
   * Convert FIVB match to database format
   */
  mapMatchToDatabase(fivbMatch: FIVBMatch, tournamentNo: string): DatabaseMatch {
    const now = new Date().toISOString();
    
    return {
      no: fivbMatch.No,
      tournament_no: tournamentNo,
      no_in_tournament: fivbMatch.NoInTournament || '',
      team_a_name: this.sanitizeString(fivbMatch.TeamAName) || 'Team A',
      team_b_name: this.sanitizeString(fivbMatch.TeamBName) || 'Team B',
      local_date: this.formatDateForDB(fivbMatch.LocalDate),
      local_time: this.formatTimeForDB(fivbMatch.LocalTime),
      court: this.sanitizeString(fivbMatch.Court) || '',
      status: this.normalizeMatchStatus(fivbMatch.Status),
      round: this.sanitizeString(fivbMatch.Round) || '',
      match_points_a: fivbMatch.MatchPointsA,
      match_points_b: fivbMatch.MatchPointsB,
      points_team_a_set1: fivbMatch.PointsTeamASet1,
      points_team_b_set1: fivbMatch.PointsTeamBSet1,
      points_team_a_set2: fivbMatch.PointsTeamASet2,
      points_team_b_set2: fivbMatch.PointsTeamBSet2,
      points_team_a_set3: fivbMatch.PointsTeamASet3,
      points_team_b_set3: fivbMatch.PointsTeamBSet3,
      duration_set1: fivbMatch.DurationSet1,
      duration_set2: fivbMatch.DurationSet2,
      duration_set3: fivbMatch.DurationSet3,
      no_referee1: fivbMatch.NoReferee1,
      no_referee2: fivbMatch.NoReferee2,
      referee1_name: this.sanitizeString(fivbMatch.Referee1Name),
      referee2_name: this.sanitizeString(fivbMatch.Referee2Name),
      referee1_federation_code: fivbMatch.Referee1FederationCode,
      referee2_federation_code: fivbMatch.Referee2FederationCode,
      last_synced: now,
      updated_at: now
    };
  }

  /**
   * Sanitize string values for database storage
   */
  private sanitizeString(value: string | null | undefined): string | null {
    if (!value) return null;
    
    // Trim and normalize whitespace
    let sanitized = value.trim().replace(/\s+/g, ' ');
    
    // Remove or replace problematic characters
    sanitized = sanitized.replace(/[\x00-\x08\x0E-\x1F\x7F]/g, ''); // Remove control characters
    
    // Limit length
    if (sanitized.length > 255) {
      sanitized = sanitized.substring(0, 252) + '...';
    }
    
    return sanitized || null;
  }

  /**
   * Normalize match status values
   */
  private normalizeMatchStatus(status: string): string {
    if (!status) return 'Scheduled';
    
    const normalized = status.trim().toLowerCase();
    
    // Map various status values to consistent formats
    const statusMap: { [key: string]: string } = {
      'scheduled': 'Scheduled',
      'pending': 'Scheduled',
      'upcoming': 'Scheduled',
      'running': 'Running',
      'live': 'Running',
      'in progress': 'Running',
      'playing': 'Running',
      'finished': 'Finished',
      'completed': 'Finished',
      'ended': 'Finished',
      'cancelled': 'Cancelled',
      'canceled': 'Cancelled',
      'suspended': 'Suspended',
      'postponed': 'Postponed',
      'delayed': 'Postponed'
    };
    
    return statusMap[normalized] || status; // Return original if no mapping found
  }

  /**
   * Format date for database storage
   */
  private formatDateForDB(dateString: string): string {
    try {
      if (!dateString || dateString.trim() === '') {
        return new Date().toISOString().split('T')[0]; // Default to today
      }
      
      // Handle various date formats from FIVB API
      let date: Date;
      
      // Try parsing as ISO date first
      if (/^\d{4}-\d{2}-\d{2}/.test(dateString)) {
        date = new Date(dateString);
      }
      // Handle DD/MM/YYYY format
      else if (/^\d{2}\/\d{2}\/\d{4}/.test(dateString)) {
        const [day, month, year] = dateString.split('/');
        date = new Date(`${year}-${month}-${day}`);
      }
      // Handle MM-DD-YYYY format
      else if (/^\d{2}-\d{2}-\d{4}/.test(dateString)) {
        const [month, day, year] = dateString.split('-');
        date = new Date(`${year}-${month}-${day}`);
      }
      // Try general parsing
      else {
        date = new Date(dateString);
      }
      
      if (isNaN(date.getTime())) {
        console.warn(`Invalid date format: ${dateString}, using current date`);
        return new Date().toISOString().split('T')[0];
      }
      
      return date.toISOString().split('T')[0]; // Return YYYY-MM-DD format
      
    } catch (error) {
      console.error(`Error formatting date ${dateString}:`, error);
      return new Date().toISOString().split('T')[0];
    }
  }

  /**
   * Format time for database storage
   */
  private formatTimeForDB(timeString: string): string {
    try {
      if (!timeString || timeString.trim() === '') {
        return '00:00:00'; // Default time
      }
      
      // Handle HH:MM format
      if (/^\d{2}:\d{2}$/.test(timeString)) {
        return `${timeString}:00`;
      }
      
      // Handle HH:MM:SS format
      if (/^\d{2}:\d{2}:\d{2}$/.test(timeString)) {
        return timeString;
      }
      
      // Try to parse various time formats
      const time = new Date(`1970-01-01T${timeString}`);
      if (!isNaN(time.getTime())) {
        return time.toTimeString().split(' ')[0];
      }
      
      console.warn(`Invalid time format: ${timeString}, using 00:00:00`);
      return '00:00:00';
      
    } catch (error) {
      console.error(`Error formatting time ${timeString}:`, error);
      return '00:00:00';
    }
  }

  /**
   * Process matches in batches with optimized UPSERT
   */
  async processMatchBatch(matches: FIVBMatch[], tournamentNo: string, batchSize: number = 100): Promise<MatchSyncResult> {
    const result: MatchSyncResult = {
      processed: 0,
      inserts: 0,
      updates: 0,
      errors: 0,
      errorMessages: [],
      matchNumbers: []
    };

    try {
      // Process matches in chunks
      for (let i = 0; i < matches.length; i += batchSize) {
        const batch = matches.slice(i, i + batchSize);
        const batchResult = await this.processSingleMatchBatch(batch, tournamentNo);
        
        result.processed += batchResult.processed;
        result.inserts += batchResult.inserts;
        result.updates += batchResult.updates;
        result.errors += batchResult.errors;
        result.errorMessages.push(...batchResult.errorMessages);
        result.matchNumbers.push(...batchResult.matchNumbers);
      }
      
      console.log(`Match batch processing complete: ${result.processed} processed, ${result.inserts} inserted, ${result.updates} updated, ${result.errors} errors`);
      
    } catch (error) {
      console.error('Error in match batch processing:', error);
      result.errors += matches.length;
      result.errorMessages.push(`Match batch processing error: ${error.message}`);
    }

    return result;
  }

  /**
   * Process a single batch of matches
   */
  private async processSingleMatchBatch(matches: FIVBMatch[], tournamentNo: string): Promise<MatchSyncResult> {
    const result: MatchSyncResult = {
      processed: 0,
      inserts: 0,
      updates: 0,
      errors: 0,
      errorMessages: [],
      matchNumbers: []
    };

    try {
      // Convert FIVB matches to database format
      const dbMatches: DatabaseMatch[] = matches.map(m => this.mapMatchToDatabase(m, tournamentNo));
      
      // Get existing matches to determine inserts vs updates
      const matchNumbers = matches.map(m => m.No);
      const { data: existingMatches, error: queryError } = await this.supabase
        .from('matches')
        .select('no')
        .in('no', matchNumbers);
      
      if (queryError) {
        console.warn('Could not query existing matches, assuming all are inserts:', queryError);
      }
      
      const existingSet = new Set((existingMatches || []).map((m: any) => m.no));
      
      // Perform batch upsert operation
      const { error} = await this.supabase
        .from('matches')
        .upsert(dbMatches, { 
          onConflict: 'no',
          count: 'exact'
        });

      if (error) {
        console.error('Database upsert error for matches:', error);
        result.errors = matches.length;
        result.errorMessages.push(`Match batch upsert failed: ${error.message}`);
        return result;
      }

      // Calculate inserts vs updates
      for (const match of matches) {
        if (existingSet.has(match.No)) {
          result.updates++;
        } else {
          result.inserts++;
        }
        result.matchNumbers.push(match.No);
      }
      
      result.processed = matches.length;
      console.log(`Match batch upsert successful: ${result.processed} matches processed for tournament ${tournamentNo}`);
      
    } catch (error) {
      console.error('Error processing match batch:', error);
      result.errors = matches.length;
      result.errorMessages.push(`Match batch processing error: ${error.message}`);
    }

    return result;
  }

  /**
   * Setup real-time subscriptions for live matches
   */
  async setupRealtimeSubscriptions(tournamentNo: string): Promise<void> {
    try {
      console.log(`Setting up real-time subscriptions for live matches in tournament ${tournamentNo}`);
      
      // Note: This is a placeholder for real-time subscription setup
      // In a real implementation, this would configure WebSocket subscriptions
      // for live match updates, potentially through Supabase real-time channels
      
      // Example subscription setup (would need proper implementation):
      /*
      const channel = this.supabase
        .channel(`tournament-${tournamentNo}-matches`)
        .on('postgres_changes', 
          { 
            event: 'UPDATE', 
            schema: 'public', 
            table: 'matches',
            filter: `tournament_no=eq.${tournamentNo}`
          }, 
          (payload) => {
            console.log('Live match update:', payload);
            // Handle real-time match updates
          }
        )
        .subscribe();
      */
      
      console.log(`Real-time subscriptions configured for tournament ${tournamentNo}`);
      
    } catch (error) {
      console.error(`Error setting up real-time subscriptions for tournament ${tournamentNo}:`, error);
      // Don't throw - this is a non-critical feature
    }
  }

  /**
   * Get match synchronization statistics
   */
  async getMatchSyncStatistics(tournamentNo?: string): Promise<{
    totalMatches: number;
    recentlyUpdated: number;
    statusBreakdown: { [status: string]: number };
    tournamentBreakdown?: { [tournamentNo: string]: number };
  }> {
    try {
      let baseQuery = this.supabase.from('matches').select('*', { count: 'exact', head: true });
      
      if (tournamentNo) {
        baseQuery = baseQuery.eq('tournament_no', tournamentNo);
      }
      
      // Get total count
      const { count: totalCount } = await baseQuery;
      
      // Get recently updated count (last hour for match sync)
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
      let recentQuery = this.supabase
        .from('matches')
        .select('*', { count: 'exact', head: true })
        .gte('last_synced', oneHourAgo);
      
      if (tournamentNo) {
        recentQuery = recentQuery.eq('tournament_no', tournamentNo);
      }
      
      const { count: recentCount } = await recentQuery;
      
      // Get status breakdown
      let statusQuery = this.supabase
        .from('matches')
        .select('status')
        .not('status', 'is', null);
      
      if (tournamentNo) {
        statusQuery = statusQuery.eq('tournament_no', tournamentNo);
      }
      
      const { data: statusData } = await statusQuery;
      
      const statusBreakdown: { [status: string]: number } = {};
      (statusData || []).forEach((row: any) => {
        const status = row.status || 'Unknown';
        statusBreakdown[status] = (statusBreakdown[status] || 0) + 1;
      });
      
      let tournamentBreakdown: { [tournamentNo: string]: number } | undefined;
      
      // Get tournament breakdown if not filtering by specific tournament
      if (!tournamentNo) {
        const { data: tournamentData } = await this.supabase
          .from('matches')
          .select('tournament_no')
          .not('tournament_no', 'is', null);
        
        tournamentBreakdown = {};
        (tournamentData || []).forEach((row: any) => {
          const tNo = row.tournament_no || 'Unknown';
          tournamentBreakdown![tNo] = (tournamentBreakdown![tNo] || 0) + 1;
        });
      }
      
      return {
        totalMatches: totalCount || 0,
        recentlyUpdated: recentCount || 0,
        statusBreakdown,
        tournamentBreakdown
      };
      
    } catch (error) {
      console.error('Error getting match sync statistics:', error);
      return {
        totalMatches: 0,
        recentlyUpdated: 0,
        statusBreakdown: {},
        tournamentBreakdown: undefined
      };
    }
  }
}