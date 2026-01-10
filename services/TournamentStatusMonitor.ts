import { BeachMatch } from '../types/match';
import { supabase } from './supabase';

/**
 * Tournament progress tracking data
 */
export interface TournamentProgress {
  tournamentNo: string;
  totalMatches: number;
  completedMatches: number;
  inProgressMatches: number;
  scheduledMatches: number;
  completionPercentage: number;
  estimatedCompletionDate?: Date;
  lastUpdateTime: Date;
}

/**
 * Schedule change detection result
 */
export interface ScheduleChangeResult {
  tournamentNo: string;
  changedMatches: {
    matchNo: string;
    changes: {
      date?: { old: string; new: string };
      time?: { old: string; new: string };
      court?: { old: string; new: string };
    };
  }[];
  changeCount: number;
  significantChanges: number; // Changes > 2 hours
  lastDetected: Date;
}

/**
 * Court assignment change tracking
 */
export interface CourtAssignmentChange {
  tournamentNo: string;
  matchNo: string;
  oldCourt?: string;
  newCourt: string;
  changeType: 'assignment' | 'reassignment' | 'emergency';
  timestamp: Date;
  priority: 'high' | 'normal' | 'low';
}

/**
 * Tournament event categories
 */
export enum TournamentEventCategory {
  CRITICAL = 'CRITICAL',           // Tournament cancellation, postponement
  SCHEDULE_MAJOR = 'SCHEDULE_MAJOR', // Schedule changes > 2 hours  
  SCHEDULE_MINOR = 'SCHEDULE_MINOR', // Schedule changes < 2 hours
  COURT_CHANGE = 'COURT_CHANGE',   // Court assignment changes
  PROGRESSION = 'PROGRESSION',     // Tournament completion progress
  INFORMATIONAL = 'INFORMATIONAL'  // General tournament updates
}

/**
 * Tournament Status Monitoring Service
 * Enhanced monitoring for tournament schedule changes, court assignments, and progression
 */
export class TournamentStatusMonitor {
  private static tournamentProgressCache = new Map<string, TournamentProgress>();
  private static scheduleChangeCache = new Map<string, ScheduleChangeResult>();
  private static courtChangeHistory = new Map<string, CourtAssignmentChange[]>();
  private static syncStatusMap = new Map<string, Date>();

  /**
   * Monitor tournament schedule changes by comparing current data with cached data
   */
  static async detectScheduleChanges(
    tournamentNo: string, 
    currentMatches: BeachMatch[]
  ): Promise<ScheduleChangeResult> {
    try {
      const cached = this.scheduleChangeCache.get(tournamentNo);
      const changedMatches: ScheduleChangeResult['changedMatches'] = [];
      let significantChanges = 0;

      if (cached) {
        // Compare with cached data to detect changes
        for (const currentMatch of currentMatches) {
          const changes: any = {};
          let hasChanges = false;

          // For this implementation, we'll assume we have previous match data
          // In a real implementation, this would come from previous API calls or database
          const previousMatch = await this.getPreviousMatchData(currentMatch.No);
          
          if (previousMatch) {
            // Detect date changes
            if (previousMatch.LocalDate !== currentMatch.LocalDate) {
              changes.date = { 
                old: previousMatch.LocalDate, 
                new: currentMatch.LocalDate 
              };
              hasChanges = true;
            }

            // Detect time changes
            if (previousMatch.LocalTime !== currentMatch.LocalTime) {
              changes.time = { 
                old: previousMatch.LocalTime, 
                new: currentMatch.LocalTime 
              };
              hasChanges = true;
              
              // Check if it's a significant change (> 2 hours)
              if (this.isSignificantTimeChange(previousMatch.LocalTime, currentMatch.LocalTime)) {
                significantChanges++;
              }
            }

            // Detect court changes
            if (previousMatch.Court !== currentMatch.Court) {
              changes.court = { 
                old: previousMatch.Court, 
                new: currentMatch.Court 
              };
              hasChanges = true;
            }

            if (hasChanges) {
              changedMatches.push({
                matchNo: currentMatch.NoInTournament,
                changes
              });
            }
          }
        }
      }

      const result: ScheduleChangeResult = {
        tournamentNo,
        changedMatches,
        changeCount: changedMatches.length,
        significantChanges,
        lastDetected: new Date()
      };

      // Cache the result
      this.scheduleChangeCache.set(tournamentNo, result);
      
      
      return result;
      
    } catch (error) {
      // console.error(`Error detecting schedule changes for tournament ${tournamentNo}:`, error);
      return {
        tournamentNo,
        changedMatches: [],
        changeCount: 0,
        significantChanges: 0,
        lastDetected: new Date()
      };
    }
  }

  /**
   * Track tournament progression based on match statuses
   */
  static calculateTournamentProgress(
    tournamentNo: string, 
    matches: BeachMatch[]
  ): TournamentProgress {
    const totalMatches = matches.length;
    let completedMatches = 0;
    let inProgressMatches = 0;
    let scheduledMatches = 0;

    for (const match of matches) {
      const status = match.Status?.toLowerCase();
      
      if (status === 'finished' || status === 'completed') {
        completedMatches++;
      } else if (status === 'live' || status === 'inprogress' || status === 'running') {
        inProgressMatches++;
      } else {
        scheduledMatches++;
      }
    }

    const completionPercentage = totalMatches > 0 
      ? Math.round((completedMatches / totalMatches) * 100)
      : 0;

    // Estimate completion date based on current progress and remaining matches
    const estimatedCompletionDate = this.estimateCompletionDate(
      matches, 
      completedMatches, 
      scheduledMatches + inProgressMatches
    );

    const progress: TournamentProgress = {
      tournamentNo,
      totalMatches,
      completedMatches,
      inProgressMatches,
      scheduledMatches,
      completionPercentage,
      estimatedCompletionDate,
      lastUpdateTime: new Date()
    };

    // Cache the progress
    this.tournamentProgressCache.set(tournamentNo, progress);
    
    
    return progress;
  }

  /**
   * Track court assignment changes
   */
  static trackCourtAssignmentChanges(
    tournamentNo: string, 
    oldMatches: BeachMatch[], 
    newMatches: BeachMatch[]
  ): CourtAssignmentChange[] {
    const courtChanges: CourtAssignmentChange[] = [];

    try {
      for (const newMatch of newMatches) {
        const oldMatch = oldMatches.find(m => m.No === newMatch.No);
        
        if (oldMatch && oldMatch.Court !== newMatch.Court) {
          const change: CourtAssignmentChange = {
            tournamentNo,
            matchNo: newMatch.NoInTournament,
            oldCourt: oldMatch.Court,
            newCourt: newMatch.Court,
            changeType: this.determineCourtChangeType(oldMatch, newMatch),
            timestamp: new Date(),
            priority: this.determineCourtChangePriority(oldMatch, newMatch)
          };

          courtChanges.push(change);
        }
      }

      // Store in history
      if (courtChanges.length > 0) {
        const existing = this.courtChangeHistory.get(tournamentNo) || [];
        existing.push(...courtChanges);
        
        // Keep only last 100 changes per tournament
        if (existing.length > 100) {
          existing.splice(0, existing.length - 100);
        }
        
        this.courtChangeHistory.set(tournamentNo, existing);
        
      }

      return courtChanges;
      
    } catch (error) {
      // console.error(`Error tracking court assignment changes for tournament ${tournamentNo}:`, error);
      return [];
    }
  }

  /**
   * Categorize tournament events based on type and significance
   */
  static categorizeEvent(
    eventType: string,
    oldValue: any,
    newValue: any,
    context?: any
  ): TournamentEventCategory {
    // Critical events
    if (newValue === 'Cancelled' || newValue === 'Postponed') {
      return TournamentEventCategory.CRITICAL;
    }

    // Schedule changes
    if (eventType === 'time' && oldValue && newValue) {
      if (this.isSignificantTimeChange(oldValue, newValue)) {
        return TournamentEventCategory.SCHEDULE_MAJOR;
      } else {
        return TournamentEventCategory.SCHEDULE_MINOR;
      }
    }

    if (eventType === 'date') {
      return TournamentEventCategory.SCHEDULE_MAJOR;
    }

    // Court changes
    if (eventType === 'court') {
      return TournamentEventCategory.COURT_CHANGE;
    }

    // Tournament progression
    if (eventType === 'status' && (newValue === 'Finished' || newValue === 'Running')) {
      return TournamentEventCategory.PROGRESSION;
    }

    return TournamentEventCategory.INFORMATIONAL;
  }

  /**
   * Integrate with sync_status table for tournament change tracking
   */
  static async updateSyncStatus(tournamentNo: string, changeType: string): Promise<void> {
    try {
      const timestamp = new Date();
      
      // Update in-memory tracking
      this.syncStatusMap.set(tournamentNo, timestamp);

      // Update database sync_status table
      await supabase
        .from('sync_status')
        .upsert({
          tournament_no: tournamentNo,
          change_type: changeType,
          last_sync: timestamp.toISOString(),
          sync_source: 'tournament_status_monitor'
        });

      
    } catch (error) {
      // console.error(`Error updating sync status for tournament ${tournamentNo}:`, error);
    }
  }

  /**
   * Get tournament progress from cache
   */
  static getTournamentProgress(tournamentNo: string): TournamentProgress | null {
    return this.tournamentProgressCache.get(tournamentNo) || null;
  }

  /**
   * Get recent court assignment changes
   */
  static getCourtAssignmentHistory(
    tournamentNo: string, 
    limit: number = 10
  ): CourtAssignmentChange[] {
    const history = this.courtChangeHistory.get(tournamentNo) || [];
    return history
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, limit);
  }

  /**
   * Get schedule change results
   */
  static getScheduleChangeResult(tournamentNo: string): ScheduleChangeResult | null {
    return this.scheduleChangeCache.get(tournamentNo) || null;
  }

  /**
   * Clear cached data for a tournament
   */
  static clearTournamentCache(tournamentNo: string): void {
    this.tournamentProgressCache.delete(tournamentNo);
    this.scheduleChangeCache.delete(tournamentNo);
    this.courtChangeHistory.delete(tournamentNo);
    this.syncStatusMap.delete(tournamentNo);
  }

  /**
   * Get monitoring statistics
   */
  static getMonitoringStats(): {
    tournamentProgress: number;
    scheduleChanges: number;
    courtChanges: number;
    syncStatus: number;
  } {
    return {
      tournamentProgress: this.tournamentProgressCache.size,
      scheduleChanges: this.scheduleChangeCache.size,
      courtChanges: Array.from(this.courtChangeHistory.values()).reduce((sum, arr) => sum + arr.length, 0),
      syncStatus: this.syncStatusMap.size,
    };
  }

  /**
   * Cleanup all monitoring data
   */
  static cleanup(): void {
    this.tournamentProgressCache.clear();
    this.scheduleChangeCache.clear();
    this.courtChangeHistory.clear();
    this.syncStatusMap.clear();
  }

  // Private helper methods

  /**
   * Get previous match data from cache or database
   */
  private static async getPreviousMatchData(matchNo: string): Promise<BeachMatch | null> {
    try {
      // Try to get from cache first (most recent data)
      const cached = await supabase
        .from('matches')
        .select('*')
        .eq('no', matchNo)
        .order('updated_at', { ascending: false })
        .limit(1)
        .single();

      if (cached.data) {
        // Convert database format to BeachMatch format
        return {
          No: cached.data.no,
          NoInTournament: cached.data.no_in_tournament,
          LocalDate: cached.data.local_date,
          LocalTime: cached.data.local_time,
          Court: cached.data.court,
          Status: cached.data.status,
          // Add other necessary fields based on BeachMatch interface
        } as BeachMatch;
      }

      return null;
    } catch (error) {
      // console.error(`Error fetching previous match data for ${matchNo}:`, error);
      return null;
    }
  }

  /**
   * Determine if a time change is significant (> 2 hours)
   */
  private static isSignificantTimeChange(oldTime: string, newTime: string): boolean {
    try {
      const oldDate = new Date(`2000-01-01T${oldTime}`);
      const newDate = new Date(`2000-01-01T${newTime}`);
      const diffHours = Math.abs(newDate.getTime() - oldDate.getTime()) / (1000 * 60 * 60);
      return diffHours >= 2;
    } catch (error) {
      return false;
    }
  }

  /**
   * Estimate completion date based on match progress
   */
  private static estimateCompletionDate(
    matches: BeachMatch[],
    completedMatches: number,
    remainingMatches: number
  ): Date | undefined {
    if (remainingMatches === 0) {
      return new Date(); // Tournament is complete
    }

    try {
      // Find the latest scheduled match date
      const latestMatch = matches
        .filter(m => m.LocalDate && m.Status?.toLowerCase() !== 'finished')
        .sort((a, b) => new Date(b.LocalDate).getTime() - new Date(a.LocalDate).getTime())[0];

      if (latestMatch) {
        return new Date(latestMatch.LocalDate);
      }

      // Fallback: estimate based on current date + remaining matches
      const estimatedDays = Math.ceil(remainingMatches / 10); // Assume 10 matches per day
      const completion = new Date();
      completion.setDate(completion.getDate() + estimatedDays);
      return completion;
      
    } catch (error) {
      return undefined;
    }
  }

  /**
   * Determine court change type
   */
  private static determineCourtChangeType(
    oldMatch: BeachMatch,
    newMatch: BeachMatch
  ): 'assignment' | 'reassignment' | 'emergency' {
    if (!oldMatch.Court) {
      return 'assignment';
    }

    // Check if match is soon (within 2 hours) - would be emergency
    const matchTime = new Date(`${newMatch.LocalDate}T${newMatch.LocalTime}`);
    const now = new Date();
    const hoursUntilMatch = (matchTime.getTime() - now.getTime()) / (1000 * 60 * 60);

    if (hoursUntilMatch < 2 && hoursUntilMatch > 0) {
      return 'emergency';
    }

    return 'reassignment';
  }

  /**
   * Determine court change priority
   */
  private static determineCourtChangePriority(
    oldMatch: BeachMatch,
    newMatch: BeachMatch
  ): 'high' | 'normal' | 'low' {
    // Emergency changes are high priority
    if (this.determineCourtChangeType(oldMatch, newMatch) === 'emergency') {
      return 'high';
    }

    // Live or in-progress matches are high priority
    const status = newMatch.Status?.toLowerCase();
    if (status === 'live' || status === 'inprogress') {
      return 'high';
    }

    // Scheduled matches are normal priority
    if (status === 'scheduled') {
      return 'normal';
    }

    return 'low';
  }
}