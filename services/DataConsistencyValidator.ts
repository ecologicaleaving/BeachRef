import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { ErrorLogger } from './ErrorLogger';
// The class is called NetworkStateManager; 'NetworkMonitor' was never exported
// by that module, so this import was undefined and NetworkMonitor.getInstance()
// threw on construction (#73 AC6).
import { NetworkStateManager as NetworkMonitor } from './NetworkStateManager';
import { VisApiClient } from './api/VisApiClient';
import { TournamentDTO, MatchDTO, EventDTO } from './DualReadService';
import * as crypto from 'crypto';

export interface ValidationResult {
  isValid: boolean;
  discrepancies: Discrepancy[];
  checksum: {
    database: string;
    api: string;
  };
  validationTime: number;
  recordsCompared: number;
}

export interface Discrepancy {
  type: 'missing_from_database' | 'missing_from_api' | 'data_mismatch' | 'structural_difference';
  entity: 'tournament' | 'event' | 'match' | 'referee_assignment';
  entityId: string;
  field?: string;
  databaseValue?: any;
  apiValue?: any;
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  detectedAt: string;
}

export interface ValidationConfiguration {
  entityTypes: ('tournaments' | 'events' | 'matches' | 'referee_assignments')[];
  checksumAlgorithm: 'md5' | 'sha1' | 'sha256';
  toleranceThreshold: number; // Percentage of acceptable discrepancies
  ignoreFields: string[]; // Fields to ignore in comparison (e.g., timestamps)
  deepValidation: boolean; // Whether to perform deep object comparison
  batchSize: number; // Number of records to process in each batch
  timeoutMs: number; // Validation timeout
}

export interface ValidationReport {
  validationId: string;
  timestamp: string;
  configuration: ValidationConfiguration;
  results: {
    tournaments?: ValidationResult;
    events?: ValidationResult;
    matches?: ValidationResult;
    refereeAssignments?: ValidationResult;
  };
  overallStatus: 'passed' | 'failed' | 'warning';
  summary: {
    totalDiscrepancies: number;
    criticalIssues: number;
    recordsValidated: number;
    validationDuration: number;
  };
  recommendations: string[];
}

export interface DriftDetectionConfig {
  enabled: boolean;
  scheduleIntervalMs: number; // How often to check for drift
  alertThreshold: number; // Percentage drift that triggers alert
  historicalWindowHours: number; // Time window to analyze drift trends
  autoCorrect: boolean; // Whether to attempt automatic correction
}

export interface DriftMetric {
  timestamp: string;
  entityType: string;
  discrepancyCount: number;
  discrepancyPercentage: number;
  trendDirection: 'increasing' | 'decreasing' | 'stable';
  severity: 'normal' | 'warning' | 'critical';
}

export class DataConsistencyValidator {
  private static instance: DataConsistencyValidator;
  private supabase: SupabaseClient;
  private visApiClient: VisApiClient;
  private errorLogger: ErrorLogger;
  private networkMonitor: NetworkMonitor;
  private config: ValidationConfiguration;
  private driftConfig: DriftDetectionConfig;
  private validationHistory: ValidationReport[] = [];
  private driftMetrics: DriftMetric[] = [];
  private scheduledValidationInterval?: TimerHandle;

  private constructor() {
    this.supabase = createClient(
      process.env.EXPO_PUBLIC_SUPABASE_URL!,
      process.env.EXPO_PUBLIC_SUPABASE_SERVICE_ROLE_KEY!
    );
    // VisApiClient has no static getInstance(): it is constructed with a config
    // (issue #73, same family as #43/#71). This constructor threw before it could
    // reach any of the validation logic.
    this.visApiClient = new VisApiClient({
      baseURL: process.env.EXPO_PUBLIC_VIS_API_BASE_URL || 'https://www.fivb.org/Vis2009/XmlRequest.asmx',
      timeout: parseInt(process.env.EXPO_PUBLIC_API_TIMEOUT || '10000', 10),
    } as any);
    this.errorLogger = ErrorLogger.getInstance();
    this.networkMonitor = NetworkMonitor.getInstance();

    // Default configuration
    this.config = {
      entityTypes: ['tournaments', 'events', 'matches', 'referee_assignments'],
      checksumAlgorithm: 'sha256',
      toleranceThreshold: 0.05, // 5% tolerance
      ignoreFields: ['created_at', 'updated_at', 'last_synced', 'sync_version'],
      deepValidation: true,
      batchSize: 100,
      timeoutMs: 300000 // 5 minutes
    };

    this.driftConfig = {
      enabled: false,
      scheduleIntervalMs: 3600000, // 1 hour
      alertThreshold: 0.10, // 10%
      historicalWindowHours: 24,
      autoCorrect: false
    };
  }

  public static getInstance(): DataConsistencyValidator {
    if (!DataConsistencyValidator.instance) {
      DataConsistencyValidator.instance = new DataConsistencyValidator();
    }
    return DataConsistencyValidator.instance;
  }

  /**
   * Configure the validation service
   */
  public configure(config: Partial<ValidationConfiguration>): void {
    this.config = { ...this.config, ...config };
    this.errorLogger.log('DataConsistencyValidator configured', { config: this.config });
  }

  /**
   * Configure drift detection
   */
  public configureDriftDetection(config: Partial<DriftDetectionConfig>): void {
    this.driftConfig = { ...this.driftConfig, ...config };
    
    if (this.driftConfig.enabled) {
      this.startScheduledValidation();
    } else {
      this.stopScheduledValidation();
    }
    
    this.errorLogger.log('Drift detection configured', { config: this.driftConfig });
  }

  /**
   * Perform comprehensive validation of all configured entity types
   */
  public async validateAll(): Promise<ValidationReport> {
    const validationId = crypto.randomUUID();
    const startTime = Date.now();

    this.errorLogger.log('Starting comprehensive validation', { validationId });

    const report: ValidationReport = {
      validationId,
      timestamp: new Date().toISOString(),
      configuration: { ...this.config },
      results: {},
      overallStatus: 'passed',
      summary: {
        totalDiscrepancies: 0,
        criticalIssues: 0,
        recordsValidated: 0,
        validationDuration: 0
      },
      recommendations: []
    };

    try {
      // Validate each entity type
      for (const entityType of this.config.entityTypes) {
        try {
          let result: ValidationResult;
          
          switch (entityType) {
            case 'tournaments':
              result = await this.validateTournaments();
              report.results.tournaments = result;
              break;
            case 'events':
              result = await this.validateEvents();
              report.results.events = result;
              break;
            case 'matches':
              result = await this.validateMatches();
              report.results.matches = result;
              break;
            case 'referee_assignments':
              result = await this.validateRefereeAssignments();
              report.results.refereeAssignments = result;
              break;
          }

          // Update summary
          if (result!) {
            report.summary.totalDiscrepancies += result.discrepancies.length;
            report.summary.recordsValidated += result.recordsCompared;
            report.summary.criticalIssues += result.discrepancies.filter(d => d.severity === 'critical').length;
          }
        } catch (error) {
          this.errorLogger.logError('Validation failed for entity type', error, { entityType, validationId });
          report.overallStatus = 'failed';
        }
      }

      // Determine overall status
      const failureThreshold = this.config.toleranceThreshold * report.summary.recordsValidated;
      if (report.summary.totalDiscrepancies > failureThreshold) {
        report.overallStatus = report.summary.criticalIssues > 0 ? 'failed' : 'warning';
      }

      // Generate recommendations
      report.recommendations = this.generateRecommendations(report);
      
      report.summary.validationDuration = Date.now() - startTime;

      // Store validation history
      this.validationHistory.push(report);
      this.pruneValidationHistory();

      // Update drift metrics
      this.updateDriftMetrics(report);

      this.errorLogger.log('Validation completed', { 
        validationId, 
        status: report.overallStatus,
        discrepancies: report.summary.totalDiscrepancies 
      });

      return report;
    } catch (error) {
      this.errorLogger.logError('Comprehensive validation failed', error, { validationId });
      report.overallStatus = 'failed';
      report.summary.validationDuration = Date.now() - startTime;
      throw error;
    }
  }

  /**
   * Validate tournaments between database and API
   */
  public async validateTournaments(): Promise<ValidationResult> {
    const startTime = Date.now();
    const discrepancies: Discrepancy[] = [];

    try {
      // Fetch tournaments from database
      const { data: dbTournaments, error: dbError } = await this.supabase
        .from('tournaments')
        .select('*');

      if (dbError) {
        throw new Error(`Database query failed: ${dbError.message}`);
      }

      // Fetch tournaments from API
      const apiTournaments = await this.visApiClient.fetchBeachTournamentsThisYear();

      // Convert to comparable format
      const dbMap = new Map(dbTournaments?.map(t => [t.tournament_code, this.normalizeForComparison(t)]) || []);
      const apiMap = new Map((apiTournaments || []).map(t => [t.code, this.normalizeForComparison(t)]));

      // Check for missing tournaments
      for (const [code, tournament] of apiMap) {
        if (!dbMap.has(code)) {
          discrepancies.push({
            type: 'missing_from_database',
            entity: 'tournament',
            entityId: code,
            severity: 'high',
            description: `Tournament ${code} exists in API but not in database`,
            detectedAt: new Date().toISOString(),
            apiValue: tournament
          });
        }
      }

      for (const [code, tournament] of dbMap) {
        if (!apiMap.has(code)) {
          discrepancies.push({
            type: 'missing_from_api',
            entity: 'tournament',
            entityId: code,
            severity: 'medium',
            description: `Tournament ${code} exists in database but not in API`,
            detectedAt: new Date().toISOString(),
            databaseValue: tournament
          });
        }
      }

      // Compare existing tournaments
      for (const [code, dbTournament] of dbMap) {
        const apiTournament = apiMap.get(code);
        if (apiTournament) {
          const fieldDiscrepancies = this.compareObjects(dbTournament, apiTournament, code, 'tournament');
          discrepancies.push(...fieldDiscrepancies);
        }
      }

      // Generate checksums
      const dbChecksum = await this.generateChecksum(Array.from(dbMap.values()));
      const apiChecksum = await this.generateChecksum(Array.from(apiMap.values()));

      return {
        isValid: discrepancies.length === 0,
        discrepancies,
        checksum: {
          database: dbChecksum,
          api: apiChecksum
        },
        validationTime: Date.now() - startTime,
        recordsCompared: new Set([...dbMap.keys(), ...apiMap.keys()]).size
      };
    } catch (error) {
      this.errorLogger.logError('Tournament validation failed', error);
      throw error;
    }
  }

  /**
   * Validate events between database and API
   */
  public async validateEvents(): Promise<ValidationResult> {
    const startTime = Date.now();
    const discrepancies: Discrepancy[] = [];

    try {
      // Fetch events from database with tournament context
      const { data: dbEvents, error: dbError } = await this.supabase
        .from('events')
        .select('*, tournaments(tournament_code)');

      if (dbError) {
        throw new Error(`Database query failed: ${dbError.message}`);
      }

      // Fetch events from API (through tournaments)
      const tournaments = await this.visApiClient.fetchBeachTournamentsThisYear();
      const apiEvents: any[] = [];
      
      for (const tournament of tournaments || []) {
        // `tournamentCode` non esiste su `TournamentCore` — il campo si chiama
        // `code` (issue #94). Era `undefined` per OGNI torneo, quindi si
        // chiedevano al VIS gli eventi di un torneo senza codice, una volta per
        // torneo dell'anno, e anche la diagnostica dell'errore registrava
        // `tournamentCode: undefined`. Stessa famiglia dei membri fantasma
        // documentati in CLAUDE.md: il modulo non espone il nome che gli si
        // chiede, e nessuno se ne accorge perche' il risultato e' `undefined`
        // invece di un errore.
        const codiceTorneo = tournament.code;

        try {
          const events = await this.visApiClient.getEvents({ tournamentCode: codiceTorneo });
          apiEvents.push(...events);
        } catch (error) {
          this.errorLogger.logError('Failed to fetch events for tournament', error, {
            tournamentCode: codiceTorneo
          });
        }
      }

      // Convert to comparable format
      const dbMap = new Map(dbEvents?.map(e => [e.event_no, this.normalizeForComparison(e)]) || []);
      const apiMap = new Map(apiEvents.map(e => [e.eventNo, this.normalizeForComparison(e)]));

      // Perform comparison similar to tournaments
      this.compareEntityMaps(dbMap, apiMap, 'event', discrepancies);

      const dbChecksum = await this.generateChecksum(Array.from(dbMap.values()));
      const apiChecksum = await this.generateChecksum(Array.from(apiMap.values()));

      return {
        isValid: discrepancies.length === 0,
        discrepancies,
        checksum: {
          database: dbChecksum,
          api: apiChecksum
        },
        validationTime: Date.now() - startTime,
        recordsCompared: new Set([...dbMap.keys(), ...apiMap.keys()]).size
      };
    } catch (error) {
      this.errorLogger.logError('Event validation failed', error);
      throw error;
    }
  }

  /**
   * Validate matches between database and API
   */
  public async validateMatches(): Promise<ValidationResult> {
    const startTime = Date.now();
    const discrepancies: Discrepancy[] = [];

    try {
      // Fetch matches from database
      const { data: dbMatches, error: dbError } = await this.supabase
        .from('matches')
        .select('*, events(event_no, tournaments(tournament_code))');

      if (dbError) {
        throw new Error(`Database query failed: ${dbError.message}`);
      }

      // Fetch matches from API
      const apiMatches: any[] = [];
      const tournaments = await this.visApiClient.fetchBeachTournamentsThisYear();
      
      for (const tournament of tournaments || []) {
        try {
          const matches = await this.visApiClient.fetchMatchesForTournament(tournament.visNo);
          apiMatches.push(...matches);
        } catch (error) {
          this.errorLogger.logError('Failed to fetch matches for tournament', error, { 
            tournamentCode: tournament.tournamentCode 
          });
        }
      }

      // Convert to comparable format using match_no as key
      const dbMap = new Map(dbMatches?.map(m => [m.match_no, this.normalizeForComparison(m)]) || []);
      const apiMap = new Map(apiMatches.map(m => [m.matchNo, this.normalizeForComparison(m)]));

      this.compareEntityMaps(dbMap, apiMap, 'match', discrepancies);

      const dbChecksum = await this.generateChecksum(Array.from(dbMap.values()));
      const apiChecksum = await this.generateChecksum(Array.from(apiMap.values()));

      return {
        isValid: discrepancies.length === 0,
        discrepancies,
        checksum: {
          database: dbChecksum,
          api: apiChecksum
        },
        validationTime: Date.now() - startTime,
        recordsCompared: new Set([...dbMap.keys(), ...apiMap.keys()]).size
      };
    } catch (error) {
      this.errorLogger.logError('Match validation failed', error);
      throw error;
    }
  }

  /**
   * Validate referee assignments between database and API
   */
  public async validateRefereeAssignments(): Promise<ValidationResult> {
    const startTime = Date.now();
    const discrepancies: Discrepancy[] = [];

    try {
      // Fetch referee assignments from database
      const { data: dbAssignments, error: dbError } = await this.supabase
        .from('match_referees')
        .select('*, matches(match_no)');

      if (dbError) {
        throw new Error(`Database query failed: ${dbError.message}`);
      }

      // Fetch referee assignments from API (part of match data)
      const apiAssignments: any[] = [];
      const tournaments = await this.visApiClient.fetchBeachTournamentsThisYear();
      
      for (const tournament of tournaments || []) {
        try {
          const matches = await this.visApiClient.fetchMatchesForTournament(tournament.visNo);
          for (const match of matches || []) {
            if (match.referees && match.referees.length > 0) {
              for (const referee of match.referees) {
                apiAssignments.push({
                  matchNo: match.matchNo,
                  refereeId: referee.id,
                  ...referee
                });
              }
            }
          }
        } catch (error) {
          this.errorLogger.logError('Failed to fetch referee assignments for tournament', error, { 
            tournamentCode: tournament.tournamentCode 
          });
        }
      }

      // Create composite keys for assignments (match_no + referee_id)
      const dbMap = new Map(dbAssignments?.map(a => [
        `${a.matches?.match_no}_${a.referee_id}`, 
        this.normalizeForComparison(a)
      ]) || []);
      const apiMap = new Map(apiAssignments.map(a => [
        `${a.matchNo}_${a.refereeId}`, 
        this.normalizeForComparison(a)
      ]));

      this.compareEntityMaps(dbMap, apiMap, 'referee_assignment', discrepancies);

      const dbChecksum = await this.generateChecksum(Array.from(dbMap.values()));
      const apiChecksum = await this.generateChecksum(Array.from(apiMap.values()));

      return {
        isValid: discrepancies.length === 0,
        discrepancies,
        checksum: {
          database: dbChecksum,
          api: apiChecksum
        },
        validationTime: Date.now() - startTime,
        recordsCompared: new Set([...dbMap.keys(), ...apiMap.keys()]).size
      };
    } catch (error) {
      this.errorLogger.logError('Referee assignment validation failed', error);
      throw error;
    }
  }

  /**
   * Get drift detection metrics for a specific time window
   */
  public getDriftMetrics(hoursBack: number = 24): DriftMetric[] {
    const cutoffTime = new Date(Date.now() - hoursBack * 60 * 60 * 1000);
    return this.driftMetrics.filter(metric => 
      new Date(metric.timestamp) >= cutoffTime
    );
  }

  /**
   * Get validation history
   */
  public getValidationHistory(limit: number = 10): ValidationReport[] {
    return this.validationHistory.slice(-limit);
  }

  /**
   * Start scheduled validation for drift detection
   */
  private startScheduledValidation(): void {
    this.stopScheduledValidation(); // Clear any existing interval
    
    this.scheduledValidationInterval = setInterval(async () => {
      try {
        await this.validateAll();
      } catch (error) {
        this.errorLogger.logError('Scheduled validation failed', error);
      }
    }, this.driftConfig.scheduleIntervalMs);

    this.errorLogger.log('Scheduled validation started', { 
      intervalMs: this.driftConfig.scheduleIntervalMs 
    });
  }

  /**
   * Stop scheduled validation
   */
  private stopScheduledValidation(): void {
    if (this.scheduledValidationInterval) {
      clearInterval(this.scheduledValidationInterval);
      this.scheduledValidationInterval = undefined;
      this.errorLogger.log('Scheduled validation stopped');
    }
  }

  /**
   * Compare two entity maps and populate discrepancies
   */
  private compareEntityMaps(
    dbMap: Map<string, any>,
    apiMap: Map<string, any>,
    entityType: string,
    discrepancies: Discrepancy[]
  ): void {
    // Check for missing entities
    for (const [id, entity] of apiMap) {
      if (!dbMap.has(id)) {
        discrepancies.push({
          type: 'missing_from_database',
          entity: entityType as any,
          entityId: id,
          severity: 'high',
          description: `${entityType} ${id} exists in API but not in database`,
          detectedAt: new Date().toISOString(),
          apiValue: entity
        });
      }
    }

    for (const [id, entity] of dbMap) {
      if (!apiMap.has(id)) {
        discrepancies.push({
          type: 'missing_from_api',
          entity: entityType as any,
          entityId: id,
          severity: 'medium',
          description: `${entityType} ${id} exists in database but not in API`,
          detectedAt: new Date().toISOString(),
          databaseValue: entity
        });
      }
    }

    // Compare existing entities
    for (const [id, dbEntity] of dbMap) {
      const apiEntity = apiMap.get(id);
      if (apiEntity) {
        const fieldDiscrepancies = this.compareObjects(dbEntity, apiEntity, id, entityType);
        discrepancies.push(...fieldDiscrepancies);
      }
    }
  }

  /**
   * Compare two objects and return discrepancies
   */
  private compareObjects(
    dbObject: any, 
    apiObject: any, 
    entityId: string, 
    entityType: string
  ): Discrepancy[] {
    const discrepancies: Discrepancy[] = [];
    
    if (!this.config.deepValidation) {
      // Simple comparison
      if (JSON.stringify(dbObject) !== JSON.stringify(apiObject)) {
        discrepancies.push({
          type: 'data_mismatch',
          entity: entityType as any,
          entityId,
          severity: 'medium',
          description: `Data mismatch detected in ${entityType} ${entityId}`,
          detectedAt: new Date().toISOString(),
          databaseValue: dbObject,
          apiValue: apiObject
        });
      }
      return discrepancies;
    }

    // Deep field comparison.
    //
    // Si confronta l'INTERSEZIONE dei campi, dopo aver ricondotto i nomi a una
    // forma comune (issue #94).
    //
    // I due lati sono due rappresentazioni diverse della stessa entita': il
    // database usa snake_case (`start_date`, `tournament_code`), l'API camelCase
    // (`startDate`, `code`). Unire i due insiemi di chiavi e confrontarle per
    // nome produceva DUE discordanze fasulle per ogni coppia di nomi diversi —
    // `{apiValue: undefined, databaseValue: "2024-01-01"}` e la sua speculare —
    // su OGNI record. Un torneo identico su entrambi i lati veniva riportato
    // come sei discordanze, di cui due "critical".
    //
    // Un campo presente da un lato solo e' una differenza di rappresentazione,
    // non una deriva dei dati: e' il livello di mappatura a doverla assorbire, e
    // finche' non esiste non ha senso segnalarla una volta per record. Cio' che
    // questo validatore deve trovare — valori che divergono fra le due fonti —
    // vive tutto nell'intersezione.
    const canonico = (chiave: string): string =>
      chiave.replace(/_([a-z0-9])/g, (_intero, lettera: string) => lettera.toUpperCase());

    const indicizza = (obj: any): Map<string, { campo: string; valore: any }> => {
      const indice = new Map<string, { campo: string; valore: any }>();
      for (const campo of Object.keys(obj)) {
        if (this.config.ignoreFields.includes(campo)) continue;
        indice.set(canonico(campo), { campo, valore: obj[campo] });
      }
      return indice;
    };

    const indiceDb = indicizza(dbObject);
    const indiceApi = indicizza(apiObject);

    for (const [chiave, voceDb] of indiceDb) {
      const voceApi = indiceApi.get(chiave);
      if (!voceApi) {
        continue;
      }

      const field = voceDb.campo;
      const dbValue = voceDb.valore;
      const apiValue = voceApi.valore;

      if (dbValue !== apiValue) {
        const severity = this.determineSeverity(field, dbValue, apiValue);
        discrepancies.push({
          type: 'data_mismatch',
          entity: entityType as any,
          entityId,
          field,
          severity,
          description: `Field '${field}' mismatch in ${entityType} ${entityId}`,
          detectedAt: new Date().toISOString(),
          databaseValue: dbValue,
          apiValue: apiValue
        });
      }
    }

    return discrepancies;
  }

  /**
   * Normalize an object for comparison by removing ignored fields and standardizing format
   */
  private normalizeForComparison(obj: any): any {
    const normalized = { ...obj };
    
    // Remove ignored fields
    for (const field of this.config.ignoreFields) {
      delete normalized[field];
    }

    // Sort object keys for consistent comparison
    const sortedKeys = Object.keys(normalized).sort();
    const sortedObj: any = {};
    for (const key of sortedKeys) {
      sortedObj[key] = normalized[key];
    }

    return sortedObj;
  }

  /**
   * Generate checksum for an array of objects
   */
  private async generateChecksum(data: any[]): Promise<string> {
    const sortedData = data.sort((a, b) => JSON.stringify(a).localeCompare(JSON.stringify(b)));
    const dataString = JSON.stringify(sortedData);
    
    const hash = crypto.createHash(this.config.checksumAlgorithm);
    hash.update(dataString);
    return hash.digest('hex');
  }

  /**
   * Determine severity of a field mismatch
   */
  private determineSeverity(field: string, dbValue: any, apiValue: any): 'low' | 'medium' | 'high' | 'critical' {
    // Critical fields that affect core functionality
    const criticalFields = ['tournament_code', 'event_no', 'match_no', 'status', 'start_date'];
    if (criticalFields.includes(field)) {
      return 'critical';
    }

    // High impact fields
    const highImpactFields = ['name', 'venue', 'court_no', 'result'];
    if (highImpactFields.includes(field)) {
      return 'high';
    }

    // Medium impact for structural differences
    if (typeof dbValue !== typeof apiValue) {
      return 'medium';
    }

    return 'low';
  }

  /**
   * Generate recommendations based on validation results
   */
  private generateRecommendations(report: ValidationReport): string[] {
    const recommendations: string[] = [];
    
    if (report.summary.criticalIssues > 0) {
      recommendations.push('CRITICAL: Immediate attention required - core data integrity compromised');
      recommendations.push('Consider rolling back to API-only mode until issues are resolved');
    }

    if (report.summary.totalDiscrepancies > report.summary.recordsValidated * 0.1) {
      recommendations.push('High discrepancy rate detected - review sync process configuration');
    }

    const missingFromDb = Object.values(report.results).reduce((count, result) => 
      count + (result?.discrepancies.filter(d => d.type === 'missing_from_database').length || 0), 0
    );

    if (missingFromDb > 0) {
      recommendations.push(`${missingFromDb} records missing from database - schedule full sync`);
    }

    if (report.summary.validationDuration > this.config.timeoutMs * 0.8) {
      recommendations.push('Validation taking too long - consider reducing batch size or scope');
    }

    if (recommendations.length === 0) {
      recommendations.push('Data consistency looks good - continue monitoring');
    }

    return recommendations;
  }

  /**
   * Update drift metrics based on validation results
   */
  private updateDriftMetrics(report: ValidationReport): void {
    const timestamp = new Date().toISOString();

    for (const [entityType, result] of Object.entries(report.results)) {
      if (!result) continue;

      const discrepancyPercentage = result.recordsCompared > 0 ? 
        result.discrepancies.length / result.recordsCompared : 0;

      // Determine trend by comparing with recent metrics
      const recentMetrics = this.driftMetrics
        .filter(m => m.entityType === entityType)
        .slice(-3);

      let trendDirection: 'increasing' | 'decreasing' | 'stable' = 'stable';
      if (recentMetrics.length > 0) {
        const avgRecent = recentMetrics.reduce((sum, m) => sum + m.discrepancyPercentage, 0) / recentMetrics.length;
        if (discrepancyPercentage > avgRecent * 1.2) {
          trendDirection = 'increasing';
        } else if (discrepancyPercentage < avgRecent * 0.8) {
          trendDirection = 'decreasing';
        }
      }

      const metric: DriftMetric = {
        timestamp,
        entityType,
        discrepancyCount: result.discrepancies.length,
        discrepancyPercentage,
        trendDirection,
        severity: discrepancyPercentage > this.driftConfig.alertThreshold ? 'critical' :
                 discrepancyPercentage > this.driftConfig.alertThreshold * 0.5 ? 'warning' : 'normal'
      };

      this.driftMetrics.push(metric);
    }

    // Prune old metrics
    const cutoffTime = new Date(Date.now() - this.driftConfig.historicalWindowHours * 60 * 60 * 1000);
    this.driftMetrics = this.driftMetrics.filter(m => new Date(m.timestamp) >= cutoffTime);
  }

  /**
   * Prune old validation history to prevent memory leaks
   */
  private pruneValidationHistory(): void {
    const maxHistory = 50;
    if (this.validationHistory.length > maxHistory) {
      this.validationHistory = this.validationHistory.slice(-maxHistory);
    }
  }

  /**
   * Cleanup resources
   */
  public destroy(): void {
    this.stopScheduledValidation();
    this.validationHistory = [];
    this.driftMetrics = [];
    this.errorLogger.log('DataConsistencyValidator destroyed');
  }
}

export default DataConsistencyValidator;