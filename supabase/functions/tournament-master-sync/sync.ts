// Tournament Data Synchronization Module
// Handles mapping, validation, and UPSERT operations for tournament data

export interface FIVBTournament {
  No: string;
  Code: string;
  Name: string;
  StartDate: string;
  EndDate: string;
  Status: string;
  Location: string;
  Category?: string;
  Gender?: string;
  Surface?: string;
}

export interface DatabaseTournament {
  no: string;
  code: string;
  name: string;
  start_date: string;
  end_date: string;
  status: string;
  location: string;
  last_synced: string;
  updated_at: string;
  version?: number;
}

export interface SyncBatchResult {
  processed: number;
  inserts: number;
  updates: number;
  errors: number;
  errorMessages: string[];
  tournamentNumbers: string[];
}

export class TournamentSynchronizer {
  private supabase: any;
  
  constructor(supabaseClient: any) {
    this.supabase = supabaseClient;
  }

  /**
   * Parse XML tournaments from FIVB API response
   */
  parseXMLTournaments(xmlText: string): FIVBTournament[] {
    try {
      const tournaments: FIVBTournament[] = [];
      
      // Handle different XML response formats
      const cleanedXml = this.cleanXMLResponse(xmlText);
      
      // Extract tournament blocks from XML
      const tournamentRegex = /<Tournament[^>]*>(.*?)<\/Tournament>/gs;
      const matches = cleanedXml.matchAll(tournamentRegex);
      
      for (const match of matches) {
        const tournamentXml = match[1];
        
        const tournament: FIVBTournament = {
          No: this.extractXmlValue(tournamentXml, 'No') || '',
          Code: this.extractXmlValue(tournamentXml, 'Code') || '',
          Name: this.extractXmlValue(tournamentXml, 'Name') || '',
          StartDate: this.extractXmlValue(tournamentXml, 'StartDate') || '',
          EndDate: this.extractXmlValue(tournamentXml, 'EndDate') || '',
          Status: this.extractXmlValue(tournamentXml, 'Status') || 'Unknown',
          Location: this.extractXmlValue(tournamentXml, 'Location') || '',
          Category: this.extractXmlValue(tournamentXml, 'Category') || undefined,
          Gender: this.extractXmlValue(tournamentXml, 'Gender') || undefined,
          Surface: this.extractXmlValue(tournamentXml, 'Surface') || undefined
        };
        
        // Validate required fields
        if (this.validateTournament(tournament)) {
          tournaments.push(tournament);
        } else {
          console.warn(`Skipping invalid tournament: ${JSON.stringify(tournament)}`);
        }
      }
      
      console.log(`Successfully parsed ${tournaments.length} tournaments from XML`);
      return tournaments;
      
    } catch (error) {
      console.error('Error parsing XML tournaments:', error);
      throw new Error(`XML parsing failed: ${error.message}`);
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
   * Validate tournament data before processing
   */
  private validateTournament(tournament: FIVBTournament): boolean {
    // Required fields validation
    if (!tournament.No || !tournament.Code) {
      console.warn(`Tournament missing required fields: No=${tournament.No}, Code=${tournament.Code}`);
      return false;
    }
    
    // Tournament number should be numeric
    if (!/^\d+$/.test(tournament.No)) {
      console.warn(`Invalid tournament number format: ${tournament.No}`);
      return false;
    }
    
    // Basic date validation
    if (tournament.StartDate && !this.isValidDate(tournament.StartDate)) {
      console.warn(`Invalid start date format: ${tournament.StartDate}`);
    }
    
    if (tournament.EndDate && !this.isValidDate(tournament.EndDate)) {
      console.warn(`Invalid end date format: ${tournament.EndDate}`);
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
   * Convert FIVB tournament to database format
   */
  mapTournamentToDatabase(fivbTournament: FIVBTournament): DatabaseTournament {
    const now = new Date().toISOString();
    
    return {
      no: fivbTournament.No,
      code: fivbTournament.Code,
      name: this.sanitizeString(fivbTournament.Name) || 'Unnamed Tournament',
      start_date: this.formatDateForDB(fivbTournament.StartDate),
      end_date: this.formatDateForDB(fivbTournament.EndDate),
      status: this.normalizeStatus(fivbTournament.Status),
      location: this.sanitizeString(fivbTournament.Location) || 'Unknown Location',
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
    
    // Limit length (tournament names shouldn't be excessively long)
    if (sanitized.length > 255) {
      sanitized = sanitized.substring(0, 252) + '...';
    }
    
    return sanitized || null;
  }

  /**
   * Normalize tournament status values
   */
  private normalizeStatus(status: string): string {
    if (!status) return 'Unknown';
    
    const normalized = status.trim().toLowerCase();
    
    // Map various status values to consistent formats
    const statusMap: { [key: string]: string } = {
      'running': 'Running',
      'live': 'Running',
      'active': 'Running',
      'in progress': 'Running',
      'finished': 'Finished',
      'completed': 'Finished',
      'ended': 'Finished',
      'upcoming': 'Upcoming',
      'scheduled': 'Upcoming',
      'pending': 'Upcoming',
      'cancelled': 'Cancelled',
      'canceled': 'Cancelled',
      'suspended': 'Suspended',
      'postponed': 'Postponed'
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
   * Process tournaments in batches with optimized UPSERT
   */
  async processTournamentBatch(tournaments: FIVBTournament[], batchSize: number = 50): Promise<SyncBatchResult> {
    const result: SyncBatchResult = {
      processed: 0,
      inserts: 0,
      updates: 0,
      errors: 0,
      errorMessages: [],
      tournamentNumbers: []
    };

    try {
      // Process tournaments in chunks
      for (let i = 0; i < tournaments.length; i += batchSize) {
        const batch = tournaments.slice(i, i + batchSize);
        const batchResult = await this.processSingleBatch(batch);
        
        result.processed += batchResult.processed;
        result.inserts += batchResult.inserts;
        result.updates += batchResult.updates;
        result.errors += batchResult.errors;
        result.errorMessages.push(...batchResult.errorMessages);
        result.tournamentNumbers.push(...batchResult.tournamentNumbers);
      }
      
      console.log(`Batch processing complete: ${result.processed} processed, ${result.inserts} inserted, ${result.updates} updated, ${result.errors} errors`);
      
    } catch (error) {
      console.error('Error in batch processing:', error);
      result.errors += tournaments.length;
      result.errorMessages.push(`Batch processing error: ${error.message}`);
    }

    return result;
  }

  /**
   * Process a single batch of tournaments
   */
  private async processSingleBatch(tournaments: FIVBTournament[]): Promise<SyncBatchResult> {
    const result: SyncBatchResult = {
      processed: 0,
      inserts: 0,
      updates: 0,
      errors: 0,
      errorMessages: [],
      tournamentNumbers: []
    };

    try {
      // Convert FIVB tournaments to database format
      const dbTournaments: DatabaseTournament[] = tournaments.map(t => this.mapTournamentToDatabase(t));
      
      // Get existing tournaments to determine inserts vs updates
      const existingNumbers = tournaments.map(t => t.No);
      const { data: existingTournaments, error: queryError } = await this.supabase
        .from('tournaments')
        .select('no')
        .in('no', existingNumbers);
      
      if (queryError) {
        console.warn('Could not query existing tournaments, assuming all are inserts:', queryError);
      }
      
      const existingSet = new Set((existingTournaments || []).map((t: any) => t.no));
      
      // Perform batch upsert operation
      const { error} = await this.supabase
        .from('tournaments')
        .upsert(dbTournaments, { 
          onConflict: 'no',
          count: 'exact'
        });

      if (error) {
        console.error('Database upsert error:', error);
        result.errors = tournaments.length;
        result.errorMessages.push(`Batch upsert failed: ${error.message}`);
        return result;
      }

      // Calculate inserts vs updates
      for (const tournament of tournaments) {
        if (existingSet.has(tournament.No)) {
          result.updates++;
        } else {
          result.inserts++;
        }
        result.tournamentNumbers.push(tournament.No);
      }
      
      result.processed = tournaments.length;
      console.log(`Batch upsert successful: ${result.processed} tournaments processed`);
      
    } catch (error) {
      console.error('Error processing tournament batch:', error);
      result.errors = tournaments.length;
      result.errorMessages.push(`Batch processing error: ${error.message}`);
    }

    return result;
  }

  /**
   * Clean up stale tournament data
   */
  async cleanupStaleTournaments(maxAge: number = 90): Promise<number> {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - maxAge);
      
      const { error, count} = await this.supabase
        .from('tournaments')
        .delete({ count: 'exact' })
        .lt('last_synced', cutoffDate.toISOString());
      
      if (error) {
        console.error('Error cleaning up stale tournaments:', error);
        return 0;
      }
      
      console.log(`Cleaned up ${count || 0} stale tournaments`);
      return count || 0;
      
    } catch (error) {
      console.error('Error in cleanupStaleTournaments:', error);
      return 0;
    }
  }

  /**
   * Get synchronization statistics
   */
  async getSyncStatistics(): Promise<{
    totalTournaments: number;
    recentlyUpdated: number;
    oldestSync: string | null;
    newestSync: string | null;
    statusBreakdown: { [status: string]: number };
  }> {
    try {
      // Get total count
      const { count: totalCount } = await this.supabase
        .from('tournaments')
        .select('*', { count: 'exact', head: true });
      
      // Get recently updated count (last 24 hours)
      const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      const { count: recentCount } = await this.supabase
        .from('tournaments')
        .select('*', { count: 'exact', head: true })
        .gte('last_synced', oneDayAgo);
      
      // Get sync date range
      const { data: syncDates } = await this.supabase
        .from('tournaments')
        .select('last_synced')
        .order('last_synced', { ascending: true })
        .limit(1);
      
      const { data: newestSyncData } = await this.supabase
        .from('tournaments')
        .select('last_synced')
        .order('last_synced', { ascending: false })
        .limit(1);
      
      // Get status breakdown
      const { data: statusData } = await this.supabase
        .from('tournaments')
        .select('status')
        .not('status', 'is', null);
      
      const statusBreakdown: { [status: string]: number } = {};
      (statusData || []).forEach((row: any) => {
        const status = row.status || 'Unknown';
        statusBreakdown[status] = (statusBreakdown[status] || 0) + 1;
      });
      
      return {
        totalTournaments: totalCount || 0,
        recentlyUpdated: recentCount || 0,
        oldestSync: syncDates?.[0]?.last_synced || null,
        newestSync: newestSyncData?.[0]?.last_synced || null,
        statusBreakdown
      };
      
    } catch (error) {
      console.error('Error getting sync statistics:', error);
      return {
        totalTournaments: 0,
        recentlyUpdated: 0,
        oldestSync: null,
        newestSync: null,
        statusBreakdown: {}
      };
    }
  }
}