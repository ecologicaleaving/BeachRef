/**
 * API Response Validation Service
 * Part of API Client Response Types Optimization Refactoring
 * Provides type-safe response validation and transformation
 */

import {
  ApiResponse,
  ApiSuccessResponse,
  ApiErrorResponse,
  ValidationResult,
  ValidationError,
  ResponseValidator,
  TournamentResponseDTO,
  MatchResponseDTO,
  RefereeResponseDTO,
  ApiError
} from '../../types/api-responses';
import { ErrorClassifier, ErrorSeverity, ErrorCategory } from '../error/ErrorClassifier';

/**
 * Main response validation service
 */
export class ResponseValidator {
  /**
   * Validate that a response conforms to the base API response structure
   */
  static validateBaseResponse(data: unknown): ValidationResult<any> {
    const errors: ValidationError[] = [];

    if (typeof data !== 'object' || data === null) {
      errors.push({
        path: 'root',
        message: 'Response must be an object',
        value: data
      });
      return { isValid: false, errors };
    }

    const response = data as Record<string, unknown>;

    // Check required fields
    if (typeof response.success !== 'boolean') {
      errors.push({
        path: 'success',
        message: 'Success field must be boolean',
        value: response.success
      });
    }

    if (typeof response.timestamp !== 'string') {
      errors.push({
        path: 'timestamp',
        message: 'Timestamp field must be string',
        value: response.timestamp
      });
    }

    // Validate success/error structure
    if (response.success === true) {
      if (!('data' in response)) {
        errors.push({
          path: 'data',
          message: 'Success response must contain data field',
          value: undefined
        });
      }
      if ('error' in response) {
        errors.push({
          path: 'error',
          message: 'Success response should not contain error field',
          value: response.error
        });
      }
    } else if (response.success === false) {
      if (!('error' in response) || !response.error) {
        errors.push({
          path: 'error',
          message: 'Error response must contain error field',
          value: response.error
        });
      } else if (!this.validateErrorStructure(response.error)) {
        errors.push({
          path: 'error',
          message: 'Invalid error structure',
          value: response.error
        });
      }
    }

    return {
      isValid: errors.length === 0,
      data: errors.length === 0 ? response : undefined,
      errors
    };
  }

  /**
   * Validate API error structure
   */
  private static validateErrorStructure(error: unknown): boolean {
    if (typeof error !== 'object' || error === null) return false;

    const err = error as Record<string, unknown>;
    return (
      typeof err.code === 'string' &&
      typeof err.message === 'string'
    );
  }

  /**
   * Create a typed response validator
   */
  static createValidator<T>(
    dataValidator: (data: unknown) => ValidationResult<T>
  ): ResponseValidator<T> {
    return (data: unknown) => {
      // First validate base response structure
      const baseValidation = this.validateBaseResponse(data);
      if (!baseValidation.isValid) {
        return baseValidation as ValidationResult<T>;
      }

      const response = baseValidation.data as any;

      // If it's an error response, return it as valid
      if (!response.success) {
        return {
          isValid: true,
          data: response as T,
          errors: []
        };
      }

      // Validate the data field for success responses
      const dataValidation = dataValidator(response.data);
      if (!dataValidation.isValid) {
        return dataValidation;
      }

      return {
        isValid: true,
        data: response as T,
        errors: []
      };
    };
  }

  /**
   * Tournament list validator
   */
  static validateTournamentList: ResponseValidator<TournamentResponseDTO[]> =
    ResponseValidator.createValidator((data: unknown) => {
      const errors: ValidationError[] = [];

      if (!Array.isArray(data)) {
        errors.push({
          path: 'tournaments',
          message: 'Tournament data must be an array',
          value: data
        });
        return { isValid: false, errors };
      }

      const validTournaments: TournamentResponseDTO[] = [];

      data.forEach((item, index) => {
        const validation = ResponseValidator.validateTournament(item);
        if (validation.isValid && validation.data) {
          validTournaments.push(validation.data);
        } else {
          validation.errors.forEach(error => {
            errors.push({
              path: `tournaments[${index}].${error.path}`,
              message: error.message,
              value: error.value
            });
          });
        }
      });

      return {
        isValid: errors.length === 0,
        data: validTournaments,
        errors
      };
    });

  /**
   * Single tournament validator
   */
  static validateTournament(data: unknown): ValidationResult<TournamentResponseDTO> {
    const errors: ValidationError[] = [];

    if (typeof data !== 'object' || data === null) {
      errors.push({
        path: 'root',
        message: 'Tournament must be an object',
        value: data
      });
      return { isValid: false, errors };
    }

    const tournament = data as Record<string, unknown>;

    // Required fields
    if (!tournament.id && !tournament.No) {
      errors.push({
        path: 'id',
        message: 'Tournament must have id or No field',
        value: tournament.id
      });
    }

    if (typeof tournament.name !== 'string' && typeof tournament.Name !== 'string') {
      errors.push({
        path: 'name',
        message: 'Tournament must have name or Name field',
        value: tournament.name || tournament.Name
      });
    }

    // Validate gender if present
    if (tournament.gender && !['M', 'W', 'X'].includes(tournament.gender as string)) {
      errors.push({
        path: 'gender',
        message: 'Gender must be M, W, or X',
        value: tournament.gender
      });
    }

    if (errors.length === 0) {
      // Transform to standardized format
      const standardized: TournamentResponseDTO = {
        id: tournament.id || tournament.No,
        name: (tournament.name || tournament.Name) as string,
        code: tournament.code || tournament.Code,
        location: {
          city: tournament.city || tournament.City,
          country: tournament.country || tournament.Country,
          countryCode: tournament.countryCode || tournament.CountryCode
        },
        dates: {
          start: tournament.startDate || tournament.StartDate,
          end: tournament.endDate || tournament.EndDate
        },
        type: tournament.type || tournament.Type,
        gender: tournament.gender || tournament.Gender,
        status: tournament.status || tournament.Status,
        visNo: tournament.visNo,
        // Preserve original fields for backward compatibility
        ...tournament
      } as TournamentResponseDTO;

      return {
        isValid: true,
        data: standardized,
        errors: []
      };
    }

    return { isValid: false, errors };
  }

  /**
   * Match list validator
   */
  static validateMatchList: ResponseValidator<MatchResponseDTO[]> =
    ResponseValidator.createValidator((data: unknown) => {
      const errors: ValidationError[] = [];

      if (!Array.isArray(data)) {
        errors.push({
          path: 'matches',
          message: 'Match data must be an array',
          value: data
        });
        return { isValid: false, errors };
      }

      const validMatches: MatchResponseDTO[] = [];

      data.forEach((item, index) => {
        const validation = ResponseValidator.validateMatch(item);
        if (validation.isValid && validation.data) {
          validMatches.push(validation.data);
        } else {
          validation.errors.forEach(error => {
            errors.push({
              path: `matches[${index}].${error.path}`,
              message: error.message,
              value: error.value
            });
          });
        }
      });

      return {
        isValid: errors.length === 0,
        data: validMatches,
        errors
      };
    });

  /**
   * Single match validator
   */
  static validateMatch(data: unknown): ValidationResult<MatchResponseDTO> {
    const errors: ValidationError[] = [];

    if (typeof data !== 'object' || data === null) {
      errors.push({
        path: 'root',
        message: 'Match must be an object',
        value: data
      });
      return { isValid: false, errors };
    }

    const match = data as Record<string, unknown>;

    // Required fields validation
    if (!match.id && !match.MatchNo && !match.matchNo) {
      errors.push({
        path: 'id',
        message: 'Match must have id, MatchNo, or matchNo field',
        value: match.id
      });
    }

    // Validate status
    const validStatuses = ['scheduled', 'live', 'warmup', 'completed', 'cancelled', 'postponed'];
    const status = match.status || match.Status || 'scheduled';
    if (typeof status === 'string' && !validStatuses.includes(status)) {
      errors.push({
        path: 'status',
        message: `Invalid match status: ${status}`,
        value: status
      });
    }

    if (errors.length === 0) {
      // Transform to standardized format
      const standardized: MatchResponseDTO = {
        id: match.id || match.MatchNo || match.matchNo,
        eventNo: match.eventNo || match.EventNo,
        matchNo: match.matchNo || match.MatchNo,
        courtNo: match.courtNo || match.CourtNo || match.Court,
        status: (status as MatchResponseDTO['status']) || 'scheduled',
        teams: {
          teamA: this.extractTeamInfo(match, 'A'),
          teamB: this.extractTeamInfo(match, 'B')
        },
        timing: {
          scheduled: match.scheduledTime || match.ScheduledTime,
          actual: match.actualTime || match.ActualTime,
          duration: match.duration ? Number(match.duration) : undefined
        },
        referees: this.extractRefereeAssignments(match),
        metadata: {
          round: match.round || match.Round,
          phase: match.phase || match.Phase,
          importance: this.determineMatchImportance(match)
        }
      };

      return {
        isValid: true,
        data: standardized,
        errors: []
      };
    }

    return { isValid: false, errors };
  }

  /**
   * Extract team information from match data
   */
  private static extractTeamInfo(match: Record<string, unknown>, side: 'A' | 'B'): any {
    const teamKey = `Team${side}`;
    const team = match[teamKey] || match[`team${side}`] || {};

    if (typeof team === 'string') {
      return { name: team };
    }

    if (typeof team === 'object' && team !== null) {
      return {
        id: (team as any).id,
        name: (team as any).name || (team as any).Name || `Team ${side}`,
        players: (team as any).players || [],
        country: (team as any).country || (team as any).Country,
        seed: (team as any).seed ? Number((team as any).seed) : undefined
      };
    }

    return { name: `Team ${side}` };
  }

  /**
   * Extract referee assignments from match data
   */
  private static extractRefereeAssignments(match: Record<string, unknown>): any[] {
    const referees = match.referees || match.Referees || [];
    if (!Array.isArray(referees)) return [];

    return referees.map((ref: any) => ({
      refereeId: ref.id || ref.refereeId || ref.RefereeId,
      role: ref.role || ref.Role || 'R1',
      name: ref.name || ref.Name,
      status: ref.status || ref.Status || 'assigned'
    }));
  }

  /**
   * Determine match importance based on various factors
   */
  private static determineMatchImportance(match: Record<string, unknown>): 'normal' | 'important' | 'final' {
    const round = (match.round || match.Round || '').toString().toLowerCase();
    const phase = (match.phase || match.Phase || '').toString().toLowerCase();

    if (round.includes('final') || phase.includes('final')) {
      return 'final';
    }

    if (round.includes('semi') || phase.includes('semi') ||
        round.includes('quarter') || phase.includes('quarter')) {
      return 'important';
    }

    return 'normal';
  }

  /**
   * Referee list validator
   */
  static validateRefereeList: ResponseValidator<RefereeResponseDTO[]> =
    ResponseValidator.createValidator((data: unknown) => {
      const errors: ValidationError[] = [];

      if (!Array.isArray(data)) {
        errors.push({
          path: 'referees',
          message: 'Referee data must be an array',
          value: data
        });
        return { isValid: false, errors };
      }

      const validReferees: RefereeResponseDTO[] = [];

      data.forEach((item, index) => {
        const validation = ResponseValidator.validateReferee(item);
        if (validation.isValid && validation.data) {
          validReferees.push(validation.data);
        } else {
          validation.errors.forEach(error => {
            errors.push({
              path: `referees[${index}].${error.path}`,
              message: error.message,
              value: error.value
            });
          });
        }
      });

      return {
        isValid: errors.length === 0,
        data: validReferees,
        errors
      };
    });

  /**
   * Single referee validator
   */
  static validateReferee(data: unknown): ValidationResult<RefereeResponseDTO> {
    const errors: ValidationError[] = [];

    if (typeof data !== 'object' || data === null) {
      errors.push({
        path: 'root',
        message: 'Referee must be an object',
        value: data
      });
      return { isValid: false, errors };
    }

    const referee = data as Record<string, unknown>;

    // Required fields
    if (!referee.id && !referee.RefereeId) {
      errors.push({
        path: 'id',
        message: 'Referee must have id or RefereeId field',
        value: referee.id
      });
    }

    if (typeof referee.name !== 'string' &&
        typeof referee.Name !== 'string' &&
        !referee.firstName && !referee.FirstName) {
      errors.push({
        path: 'name',
        message: 'Referee must have name, Name, or firstName field',
        value: referee.name
      });
    }

    if (errors.length === 0) {
      const standardized: RefereeResponseDTO = {
        id: referee.id || referee.RefereeId,
        name: referee.name || referee.Name ||
              `${referee.firstName || referee.FirstName} ${referee.lastName || referee.LastName}`.trim(),
        firstName: referee.firstName || referee.FirstName,
        lastName: referee.lastName || referee.LastName,
        federation: referee.federation || referee.Federation,
        country: referee.country || referee.Country,
        level: referee.level || referee.Level,
        availability: {
          status: (referee.status as any) || 'available'
        }
      };

      return {
        isValid: true,
        data: standardized,
        errors: []
      };
    }

    return { isValid: false, errors };
  }

  /**
   * Transform raw response to typed API response
   */
  static transformRawResponse<T>(
    rawResponse: Response,
    data: unknown,
    validator?: ResponseValidator<T>
  ): ApiResponse<T> {
    const timestamp = new Date().toISOString();
    const requestId = rawResponse.headers.get('x-request-id') || undefined;

    // Handle HTTP errors
    if (!rawResponse.ok) {
      const error: ApiError = {
        code: `HTTP_${rawResponse.status}`,
        message: rawResponse.statusText || 'Request failed',
        status: rawResponse.status,
        retryable: rawResponse.status >= 500 && rawResponse.status < 600
      };

      return {
        success: false,
        error,
        timestamp,
        requestId
      };
    }

    // Validate response if validator provided
    if (validator) {
      const validation = validator(data);
      if (!validation.isValid) {
        const error: ApiError = {
          code: 'VALIDATION_ERROR',
          message: 'Response validation failed',
          details: {
            validationErrors: validation.errors
          },
          retryable: false
        };

        return {
          success: false,
          error,
          timestamp,
          requestId
        };
      }

      return {
        success: true,
        data: validation.data!,
        timestamp,
        requestId
      };
    }

    // Return without validation
    return {
      success: true,
      data: data as T,
      timestamp,
      requestId
    };
  }

  /**
   * Handle and classify API errors
   */
  static handleApiError(error: unknown, context?: Record<string, any>): ApiErrorResponse {
    let apiError: ApiError;

    if (error instanceof Error) {
      const errorDetails = ErrorClassifier.classify(error, context);

      apiError = {
        code: errorDetails.category.toUpperCase(),
        message: errorDetails.userMessage,
        details: {
          technical: errorDetails.technicalMessage,
          recoverable: errorDetails.recoverable,
          correlationId: errorDetails.correlationId
        },
        retryable: errorDetails.recoverable
      };
    } else {
      apiError = {
        code: 'UNKNOWN_ERROR',
        message: 'An unexpected error occurred',
        details: { originalError: error },
        retryable: false
      };
    }

    return {
      success: false,
      error: apiError,
      timestamp: new Date().toISOString()
    };
  }
}