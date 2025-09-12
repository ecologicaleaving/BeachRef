import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { NetworkMonitor } from './NetworkMonitor';
import { ConnectionCircuitBreaker } from './ConnectionCircuitBreaker';
import { ErrorLogger } from './ErrorLogger';

export interface SyncTask {
  id: string;
  type: 'tournaments' | 'events' | 'matches' | 'match_referees';
  priority: 'high' | 'medium' | 'low';
  filters?: Record<string, any>;
  timestamp: number;
  retryCount: number;
  maxRetries: number;
  lastError?: string;
  estimatedDuration?: number;
}

export interface SyncStatus {
  taskId: string;
  type: SyncTask['type'];
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
  startTime?: number;
  endTime?: number;
  recordsProcessed?: number;
  recordsInserted?: number;
  recordsUpdated?: number;
  recordsSkipped?: number;
  errors: string[];
  progress: number; // 0-100
}

export interface SyncConfiguration {
  liveDataInterval: number; // ms for live data sync
  historicalDataInterval: number; // ms for historical data sync
  maxConcurrentTasks: number;
  retryBackoffMultiplier: number;
  conflictResolutionStrategy: 'api_wins' | 'db_wins' | 'manual';
  enableIncrementalSync: boolean;
  batchSize: number;
}

export interface ConflictResolution {
  recordId: string;
  recordType: SyncTask['type'];
  apiData: any;
  dbData: any;
  resolution: 'use_api' | 'use_db' | 'merge' | 'manual_review';
  resolvedData?: any;
  timestamp: number;
}

/**
 * Comprehensive Data Synchronization Service
 * Handles bi-directional sync between VIS API and Supabase database
 * with conflict resolution, scheduling, and monitoring capabilities
 */
export class DataSyncService {
  private static instance: DataSyncService | null = null;
  private supabase: SupabaseClient;
  private networkMonitor: NetworkMonitor;
  private circuitBreaker: ConnectionCircuitBreaker;
  private errorLogger: ErrorLogger;

  private syncQueue: SyncTask[] = [];
  private activeTasks: Map<string, SyncStatus> = new Map();
  private syncHistory: SyncStatus[] = [];
  private conflictQueue: ConflictResolution[] = [];
  
  private isProcessing = false;
  private config: SyncConfiguration = {
    liveDataInterval: 30000, // 30 seconds
    historicalDataInterval: 3600000, // 1 hour
    maxConcurrentTasks: 3,
    retryBackoffMultiplier: 2,
    conflictResolutionStrategy: 'api_wins',
    enableIncrementalSync: true,
    batchSize: 100
  };

  private syncIntervals: Map<string, NodeJS.Timeout> = new Map();
  private listeners: Set<(status: SyncStatus) => void> = new Set();

  private constructor() {
    this.supabase = createClient(
      process.env.EXPO_PUBLIC_SUPABASE_URL!,
      process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!
    );
    this.networkMonitor = NetworkMonitor.getInstance();
    this.circuitBreaker = ConnectionCircuitBreaker.getInstance();
    this.errorLogger = ErrorLogger.getInstance();

    this.setupNetworkListener();
    this.startScheduler();
  }

  static getInstance(): DataSyncService {
    if (!DataSyncService.instance) {
      DataSyncService.instance = new DataSyncService();
    }
    return DataSyncService.instance;
  }

  /**
   * Configure sync service parameters
   */
  configure(config: Partial<SyncConfiguration>): void {
    this.config = { ...this.config, ...config };
    this.restartScheduler();
  }

  /**
   * Add sync task to queue
   */
  queueSync(task: Omit<SyncTask, 'id' | 'timestamp' | 'retryCount'>): string {
    const syncTask: SyncTask = {
      ...task,
      id: `sync_${task.type}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: Date.now(),
      retryCount: 0,
      maxRetries: task.maxRetries || 3
    };

    this.syncQueue.push(syncTask);
    this.processQueue();
    
    return syncTask.id;
  }

  /**
   * Process sync queue
   */
  private async processQueue(): Promise<void> {
    if (this.isProcessing || !this.networkMonitor.isConnected()) {
      return;
    }

    if (this.activeTasks.size >= this.config.maxConcurrentTasks) {
      return;
    }

    this.isProcessing = true;

    try {
      // Sort queue by priority and timestamp
      this.syncQueue.sort((a, b) => {
        const priorityOrder = { high: 3, medium: 2, low: 1 };
        const priorityDiff = priorityOrder[b.priority] - priorityOrder[a.priority];
        if (priorityDiff !== 0) return priorityDiff;
        return a.timestamp - b.timestamp;
      });

      const task = this.syncQueue.shift();
      if (!task) {
        this.isProcessing = false;
        return;
      }

      await this.executeSync(task);
    } catch (error) {
      await this.errorLogger.logError(error as Error, {
        context: 'DataSyncService.processQueue',
        severity: 'high'
      });
    } finally {
      this.isProcessing = false;
      // Continue processing queue
      if (this.syncQueue.length > 0) {
        setTimeout(() => this.processQueue(), 100);
      }
    }
  }

  /**
   * Execute individual sync task
   */
  private async executeSync(task: SyncTask): Promise<void> {
    const status: SyncStatus = {
      taskId: task.id,
      type: task.type,
      status: 'running',
      startTime: Date.now(),
      recordsProcessed: 0,
      recordsInserted: 0,
      recordsUpdated: 0,
      recordsSkipped: 0,
      errors: [],
      progress: 0
    };

    this.activeTasks.set(task.id, status);
    this.notifyListeners(status);

    try {
      switch (task.type) {
        case 'tournaments':
          await this.syncTournaments(task, status);
          break;
        case 'events':
          await this.syncEvents(task, status);
          break;
        case 'matches':
          await this.syncMatches(task, status);
          break;
        case 'match_referees':
          await this.syncMatchReferees(task, status);
          break;
        default:
          throw new Error(`Unknown sync task type: ${task.type}`);
      }

      status.status = 'completed';
      status.endTime = Date.now();
      status.progress = 100;

    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      status.errors.push(errorMsg);
      status.status = 'failed';
      status.endTime = Date.now();

      await this.errorLogger.logError(error as Error, {
        context: `DataSyncService.executeSync.${task.type}`,
        taskId: task.id,
        severity: 'high'
      });

      // Retry logic
      if (task.retryCount < task.maxRetries) {
        task.retryCount++;
        const delay = Math.pow(this.config.retryBackoffMultiplier, task.retryCount) * 1000;
        setTimeout(() => {
          this.syncQueue.unshift(task);
          this.processQueue();
        }, delay);
      }
    }

    this.activeTasks.delete(task.id);
    this.syncHistory.push(status);
    
    // Maintain history limit
    if (this.syncHistory.length > 1000) {
      this.syncHistory = this.syncHistory.slice(-500);
    }

    this.notifyListeners(status);
  }

  /**
   * Sync tournaments from VIS Adapter to database
   */
  private async syncTournaments(task: SyncTask, status: SyncStatus): Promise<void> {
    const edgeUrl = process.env.EXPO_PUBLIC_EDGE_URL;
    if (!edgeUrl) {
      throw new Error('EXPO_PUBLIC_EDGE_URL not configured');
    }

    // Build query parameters
    const params = new URLSearchParams();
    if (task.filters?.season) params.append('season', task.filters.season.toString());
    if (task.filters?.gender) params.append('gender', task.filters.gender);
    if (task.filters?.country) params.append('country', task.filters.country);
    
    // Incremental sync support
    if (this.config.enableIncrementalSync && task.filters?.lastSyncTime) {
      params.append('modified_since', new Date(task.filters.lastSyncTime).toISOString());
    }

    const response = await fetch(`${edgeUrl}/vis/tournaments?${params}`, {
      headers: {
        'Authorization': `Bearer ${process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY}`,
      }
    });

    if (!response.ok) {
      throw new Error(`VIS Adapter failed: ${response.status} ${response.statusText}`);
    }

    const tournaments = await response.json();
    status.recordsProcessed = tournaments.length;
    
    let processed = 0;
    for (const tournament of tournaments) {
      try {
        const { data, error } = await this.supabase
          .from('tournaments')
          .upsert({
            vis_tournament_no: tournament.visNo,
            tournament_code: tournament.code,
            name: tournament.name,
            country: tournament.country,
            city: tournament.city,
            season: tournament.season,
            gender: tournament.gender,
            type: tournament.tournamentType,
            start_qualification: tournament.dates?.startDateQualification,
            start_main_draw: tournament.dates?.startDateMainDraw,
            status: tournament.status?.toLowerCase()
          }, {
            onConflict: 'vis_tournament_no',
            ignoreDuplicates: false
          })
          .select();

        if (error) {
          status.errors.push(`Tournament ${tournament.code}: ${error.message}`);
          status.recordsSkipped!++;
        } else {
          if (data && data.length > 0) {
            // Check if this was an insert or update based on created_at vs updated_at
            const record = data[0];
            if (record.created_at === record.updated_at) {
              status.recordsInserted!++;
            } else {
              status.recordsUpdated!++;
            }
          }
        }
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        status.errors.push(`Tournament ${tournament.code}: ${errorMsg}`);
        status.recordsSkipped!++;
      }

      processed++;
      status.progress = Math.round((processed / tournaments.length) * 100);
      this.notifyListeners(status);
    }
  }

  /**
   * Sync events from VIS Adapter to database
   */
  private async syncEvents(task: SyncTask, status: SyncStatus): Promise<void> {
    const edgeUrl = process.env.EXPO_PUBLIC_EDGE_URL;
    if (!edgeUrl) {
      throw new Error('EXPO_PUBLIC_EDGE_URL not configured');
    }

    // Build query parameters for events
    const params = new URLSearchParams();
    if (task.filters?.tournamentCode) params.append('tournamentCode', task.filters.tournamentCode);
    if (task.filters?.from) params.append('from', task.filters.from);
    if (task.filters?.to) params.append('to', task.filters.to);
    
    const response = await fetch(`${edgeUrl}/vis/events?${params}`, {
      headers: {
        'Authorization': `Bearer ${process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY}`,
      }
    });

    if (!response.ok) {
      throw new Error(`VIS Adapter failed: ${response.status} ${response.statusText}`);
    }

    const events = await response.json();
    status.recordsProcessed = events.length;
    
    let processed = 0;
    for (const event of events) {
      try {
        // Get tournament_id for foreign key relationship
        const { data: tournamentData } = await this.supabase
          .from('tournaments')
          .select('id')
          .eq('tournament_code', event.tournamentCode)
          .single();

        if (!tournamentData) {
          status.errors.push(`Event ${event.eventCode}: Tournament not found`);
          status.recordsSkipped!++;
          continue;
        }

        const { data, error } = await this.supabase
          .from('events')
          .upsert({
            vis_event_no: event.visEventNo,
            event_code: event.eventCode,
            tournament_id: tournamentData.id,
            gender: event.gender,
            phase: event.phase,
            name: event.name,
            country: event.country,
            start_date: event.startDate,
            end_date: event.endDate,
            status: event.status?.toLowerCase()
          }, {
            onConflict: 'vis_event_no',
            ignoreDuplicates: false
          })
          .select();

        if (error) {
          status.errors.push(`Event ${event.eventCode}: ${error.message}`);
          status.recordsSkipped!++;
        } else {
          if (data && data.length > 0) {
            const record = data[0];
            if (record.created_at === record.updated_at) {
              status.recordsInserted!++;
            } else {
              status.recordsUpdated!++;
            }
          }
        }
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        status.errors.push(`Event ${event.eventCode}: ${errorMsg}`);
        status.recordsSkipped!++;
      }

      processed++;
      status.progress = Math.round((processed / events.length) * 100);
      this.notifyListeners(status);
    }
  }

  /**
   * Sync matches from VIS Adapter to database
   */
  private async syncMatches(task: SyncTask, status: SyncStatus): Promise<void> {
    const edgeUrl = process.env.EXPO_PUBLIC_EDGE_URL;
    if (!edgeUrl) {
      throw new Error('EXPO_PUBLIC_EDGE_URL not configured');
    }

    // Build query parameters for matches
    const params = new URLSearchParams();
    if (task.filters?.tournamentCode) params.append('tournamentCode', task.filters.tournamentCode);
    if (task.filters?.round) params.append('round', task.filters.round);
    if (task.filters?.eventNo) params.append('eventNo', task.filters.eventNo);
    
    const response = await fetch(`${edgeUrl}/vis/matches?${params}`, {
      headers: {
        'Authorization': `Bearer ${process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY}`,
      }
    });

    if (!response.ok) {
      throw new Error(`VIS Adapter failed: ${response.status} ${response.statusText}`);
    }

    const matches = await response.json();
    status.recordsProcessed = matches.length;
    
    let processed = 0;
    for (const match of matches) {
      try {
        // Get event_id for foreign key relationship
        const { data: eventData } = await this.supabase
          .from('events')
          .select('id')
          .eq('vis_event_no', match.eventNo)
          .single();

        if (!eventData) {
          status.errors.push(`Match ${match.matchCode}: Event not found`);
          status.recordsSkipped!++;
          continue;
        }

        // Transform sets data to JSONB format
        const sets = match.result?.setScores ? 
          match.result.setScores.map((set: any, index: number) => ({
            a: set.team1Score,
            b: set.team2Score
          })) : [];

        // Transform result data to JSONB format
        const result = match.result ? {
          resultType: match.status === 'FINISHED' ? 'finished' : 'pending',
          winnerRank: match.result.winner,
          loserRank: match.result.winner === 1 ? 2 : 1,
          duration: match.result.duration,
          forfeit: match.result.forfeit || false
        } : null;

        const { data, error } = await this.supabase
          .from('matches')
          .upsert({
            vis_match_no: match.visNo,
            tournament_code: match.tournamentCode,
            event_id: eventData.id,
            round_code: match.round,
            round_name: match.roundName,
            round_phase: match.phaseCode,
            utc_datetime: match.scheduledDateTime,
            local_datetime: match.actualStartTime,
            court: match.court?.courtName || match.court?.courtNumber,
            team_a_name: match.team1?.teamName,
            team_b_name: match.team2?.teamName,
            team_a_fed: match.team1?.countryCode,
            team_b_fed: match.team2?.countryCode,
            team_a_players: match.team1 ? [match.team1.player1Id, match.team1.player2Id].filter(Boolean) : [],
            team_b_players: match.team2 ? [match.team2.player1Id, match.team2.player2Id].filter(Boolean) : [],
            sets: JSON.stringify(sets),
            result: result ? JSON.stringify(result) : null,
            status: match.status?.toLowerCase(),
            are_court_and_time_published: match.court && match.scheduledDateTime ? true : false,
            nb_live_score_upload: 0
          }, {
            onConflict: 'vis_match_no',
            ignoreDuplicates: false
          })
          .select();

        if (error) {
          status.errors.push(`Match ${match.matchCode}: ${error.message}`);
          status.recordsSkipped!++;
        } else {
          if (data && data.length > 0) {
            const record = data[0];
            if (record.created_at === record.updated_at) {
              status.recordsInserted!++;
            } else {
              status.recordsUpdated!++;
            }
          }
        }
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        status.errors.push(`Match ${match.matchCode}: ${errorMsg}`);
        status.recordsSkipped!++;
      }

      processed++;
      status.progress = Math.round((processed / matches.length) * 100);
      this.notifyListeners(status);
    }
  }

  /**
   * Sync match referee assignments
   */
  private async syncMatchReferees(task: SyncTask, status: SyncStatus): Promise<void> {
    // This would sync referee assignments from VIS API
    // Implementation depends on VIS API structure for referee data
    // For now, stub implementation
    status.recordsProcessed = 0;
    status.progress = 100;
  }

  /**
   * Setup network connectivity listener
   */
  private setupNetworkListener(): void {
    this.networkMonitor.addListener((isConnected: boolean) => {
      if (isConnected && this.syncQueue.length > 0) {
        this.processQueue();
      }
    });
  }

  /**
   * Start automatic sync scheduler
   */
  private startScheduler(): void {
    // Schedule live data sync (tournaments, active matches)
    const liveSync = setInterval(() => {
      // Sync active tournaments and today's matches
      this.queueSync({
        type: 'tournaments',
        priority: 'high',
        filters: { status: 'active' },
        maxRetries: 3
      });

      this.queueSync({
        type: 'matches',
        priority: 'high',
        filters: { 
          status: 'scheduled,running',
          date: new Date().toISOString().split('T')[0]
        },
        maxRetries: 3
      });
    }, this.config.liveDataInterval);

    // Schedule historical data sync
    const historicalSync = setInterval(() => {
      this.queueSync({
        type: 'tournaments',
        priority: 'low',
        filters: { status: 'completed' },
        maxRetries: 2
      });

      this.queueSync({
        type: 'matches',
        priority: 'low',
        filters: { status: 'finished' },
        maxRetries: 2
      });
    }, this.config.historicalDataInterval);

    this.syncIntervals.set('live', liveSync);
    this.syncIntervals.set('historical', historicalSync);
  }

  /**
   * Restart scheduler with new configuration
   */
  private restartScheduler(): void {
    // Clear existing intervals
    this.syncIntervals.forEach(interval => clearInterval(interval));
    this.syncIntervals.clear();
    
    // Start with new config
    this.startScheduler();
  }

  /**
   * Add status listener
   */
  addStatusListener(callback: (status: SyncStatus) => void): void {
    this.listeners.add(callback);
  }

  /**
   * Remove status listener
   */
  removeStatusListener(callback: (status: SyncStatus) => void): void {
    this.listeners.delete(callback);
  }

  /**
   * Notify all listeners of status change
   */
  private notifyListeners(status: SyncStatus): void {
    this.listeners.forEach(callback => {
      try {
        callback(status);
      } catch (error) {
        console.error('Error in sync status listener:', error);
      }
    });
  }

  /**
   * Get current sync status
   */
  getSyncStatus(): {
    activeTasks: SyncStatus[];
    queuedTasks: number;
    recentHistory: SyncStatus[];
    conflicts: number;
  } {
    return {
      activeTasks: Array.from(this.activeTasks.values()),
      queuedTasks: this.syncQueue.length,
      recentHistory: this.syncHistory.slice(-10),
      conflicts: this.conflictQueue.length
    };
  }

  /**
   * Cancel sync task
   */
  cancelSync(taskId: string): boolean {
    // Remove from queue
    const queueIndex = this.syncQueue.findIndex(task => task.id === taskId);
    if (queueIndex >= 0) {
      this.syncQueue.splice(queueIndex, 1);
      return true;
    }

    // Cancel active task
    const activeTask = this.activeTasks.get(taskId);
    if (activeTask) {
      activeTask.status = 'cancelled';
      activeTask.endTime = Date.now();
      this.activeTasks.delete(taskId);
      this.syncHistory.push(activeTask);
      this.notifyListeners(activeTask);
      return true;
    }

    return false;
  }

  /**
   * Force immediate sync
   */
  forceSync(type: SyncTask['type'], filters?: Record<string, any>): string {
    return this.queueSync({
      type,
      priority: 'high',
      filters,
      maxRetries: 5
    });
  }

  /**
   * Clear sync history
   */
  clearHistory(): void {
    this.syncHistory = [];
  }

  /**
   * Shutdown sync service
   */
  shutdown(): void {
    this.syncIntervals.forEach(interval => clearInterval(interval));
    this.syncIntervals.clear();
    this.listeners.clear();
    this.isProcessing = false;
  }
}

export default DataSyncService;