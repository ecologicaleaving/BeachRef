/**
 * @fileoverview Stable Tournament Domain Model v2
 * Replaces fragile 99-field Tournament interface with immutable, type-safe domain models
 * Part of EPIC-007 Data Architecture Restructuration
 */

/**
 * Tournament type classification based on VIS API data
 */
export enum TournamentType {
  /** FIVB official tournaments */
  FIVB = 'FIVB',
  /** Beach Pro Tour tournaments */
  BPT = 'BPT', 
  /** CEV (European) tournaments */
  CEV = 'CEV',
  /** Local/National tournaments */
  LOCAL = 'LOCAL'
}

/**
 * Gender classification for tournaments
 */
export enum GenderType {
  /** Men's tournament */
  M = 'M',
  /** Women's tournament */
  W = 'W', 
  /** Mixed gender tournament */
  MIXED = 'MIXED'
}

/**
 * Tournament lifecycle status
 */
export enum TournamentStatus {
  /** Tournament is scheduled but not started */
  UPCOMING = 'UPCOMING',
  /** Tournament is currently active */
  ACTIVE = 'ACTIVE',
  /** Tournament has completed */
  COMPLETED = 'COMPLETED',
  /** Tournament has been cancelled */
  CANCELLED = 'CANCELLED'
}

/**
 * Structured tournament dates for better date handling
 */
export interface TournamentDates {
  /** Tournament start date in ISO format */
  readonly startDate: string;
  /** Tournament end date in ISO format */
  readonly endDate: string;
  /** Qualification start date if applicable */
  readonly startDateQualification?: string;
  /** Main draw start date if applicable */
  readonly startDateMainDraw?: string;
  /** Qualification end date if applicable */
  readonly endDateQualification?: string;
  /** Main draw end date if applicable */
  readonly endDateMainDraw?: string;
}

/**
 * Base interface for all VIS data entities
 */
export interface VisEntity {
  /** Immutable entity ID generated from VIS data */
  readonly id: string;
  /** Original VIS API number for reference */
  readonly visNo: string;
  /** Entity version for cache invalidation */
  readonly version: number;
  /** Last updated timestamp */
  readonly lastUpdated: string;
}

/**
 * Core Tournament domain model - immutable and type-safe
 * Replaces the unstable 99-field Tournament interface
 */
export interface TournamentCore extends VisEntity {
  /** Tournament code (e.g., "FIVB2024M001") */
  readonly code: string;
  
  /** Tournament name */
  readonly name: string;
  
  /** Tournament title (may include sponsor/location info) */
  readonly title?: string;
  
  /** Tournament gender classification */
  readonly gender: GenderType;
  
  /** Tournament type classification */
  readonly tournamentType: TournamentType;
  
  /** Structured tournament dates */
  readonly dates: TournamentDates;
  
  /** Current tournament status */
  readonly status: TournamentStatus;
  
  /** Host city */
  readonly city?: string;
  
  /** Host country */
  readonly country?: string;
  
  /** Country code (ISO 2-letter) */
  readonly countryCode?: string;
  
  /** Venue/location name */
  readonly location?: string;
  
  /** Number of courts */
  readonly courts?: number;
  
  /** Prize money information */
  readonly prizeMoney?: string;
  
  /** Currency for prize money */
  readonly currency?: string;
  
  /** Tournament website */
  readonly website?: string;
  
  /** Parent event number for multi-tournament events */
  readonly parentEventNo?: string;
  
  /** Tournament series information */
  readonly series?: string;
  
  /** Tournament category */
  readonly category?: string;
}

/**
 * Generates stable, immutable ID for tournaments
 * Format: {visNo}_{code}_{gender}_{type}
 * 
 * @param visNo - VIS API tournament number
 * @param code - Tournament code
 * @param gender - Tournament gender
 * @param tournamentType - Tournament type
 * @returns Stable tournament ID
 */
export function generateTournamentId(
  visNo: string,
  code: string,
  gender: GenderType,
  tournamentType: TournamentType
): string {
  const cleanCode = code.replace(/[^a-zA-Z0-9]/g, '');
  return `${visNo}_${cleanCode}_${gender}_${tournamentType}`.toLowerCase();
}

/**
 * Type guard to check if an object is a valid TournamentCore
 * 
 * @param obj - Object to validate
 * @returns True if object is valid TournamentCore
 */
export function isTournamentCore(obj: any): obj is TournamentCore {
  try {
    if (!obj || typeof obj !== 'object') {
      return false;
    }
    
    // Check required string fields
    if (typeof obj.id !== 'string') return false;
    if (typeof obj.visNo !== 'string') return false;
    if (typeof obj.code !== 'string') return false;
    if (typeof obj.name !== 'string') return false;
    
    // Check enums
    if (!Object.values(GenderType).includes(obj.gender)) return false;
    if (!Object.values(TournamentType).includes(obj.tournamentType)) return false;
    if (!Object.values(TournamentStatus).includes(obj.status)) return false;
    
    // Check dates object
    if (!obj.dates || typeof obj.dates !== 'object') return false;
    if (typeof obj.dates.startDate !== 'string') return false;
    if (typeof obj.dates.endDate !== 'string') return false;
    
    return true;
  } catch (error) {
    return false;
  }
}

/**
 * Maps VIS API tournament type to TournamentType enum
 * 
 * @param visType - VIS API tournament type
 * @returns Mapped TournamentType
 */
export function mapVisTournamentType(visType?: string): TournamentType {
  if (!visType) return TournamentType.LOCAL;
  
  const type = visType.toUpperCase();
  if (type.includes('FIVB')) return TournamentType.FIVB;
  if (type.includes('BPT') || type.includes('BEACH PRO TOUR')) return TournamentType.BPT;
  if (type.includes('CEV')) return TournamentType.CEV;
  
  return TournamentType.LOCAL;
}

/**
 * Maps VIS API status to TournamentStatus enum
 * 
 * @param visStatus - VIS API status
 * @returns Mapped TournamentStatus
 */
export function mapVisTournamentStatus(visStatus?: string): TournamentStatus {
  if (!visStatus) return TournamentStatus.UPCOMING;
  
  const status = visStatus.toLowerCase();
  if (status.includes('active') || status.includes('running')) return TournamentStatus.ACTIVE;
  if (status.includes('completed') || status.includes('finished')) return TournamentStatus.COMPLETED;
  if (status.includes('cancelled') || status.includes('canceled')) return TournamentStatus.CANCELLED;
  
  return TournamentStatus.UPCOMING;
}