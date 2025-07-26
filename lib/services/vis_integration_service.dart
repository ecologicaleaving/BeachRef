import 'dart:async';
import 'dart:convert';
import 'package:flutter/foundation.dart';
import 'package:http/http.dart' as http;
import '../core/result.dart';
import '../core/errors/vis_error.dart';
import '../core/environment.dart';
import '../core/logging/logger_service.dart';
import '../core/compliance/fivb_compliance_validator.dart';
import '../data/models/tournament.dart';
import '../data/models/cache_metadata.dart';

class VisIntegrationService {
  static final VisIntegrationService _instance = VisIntegrationService._internal();
  factory VisIntegrationService([http.Client? httpClient]) => _instance.._httpClient = httpClient ?? http.Client();
  VisIntegrationService._internal();

  late http.Client _httpClient;
  final Map<String, CacheMetadata> _cacheMetadata = {};
  final Map<String, dynamic> _cachedData = {};
  final LoggerService _logger = LoggerService();
  final FIVBComplianceValidator _complianceValidator = FIVBComplianceValidator();
  
  DateTime? _lastApiCall;
  int _consecutiveFailures = 0;
  bool _circuitBreakerOpen = false;
  DateTime? _circuitBreakerOpenTime;
  
  // Rate limiting
  static const Duration _rateLimitInterval = Duration(seconds: 30);
  static const int _maxConsecutiveFailures = 5;
  static const Duration _circuitBreakerTimeout = Duration(seconds: 30);
  static const Duration _apiTimeout = Duration(seconds: 10);
  
  // Retry configuration
  static const List<Duration> _retryDelays = [
    Duration(seconds: 1),
    Duration(seconds: 2),
    Duration(seconds: 4),
    Duration(seconds: 8),
  ];

  String get _baseUrl => Environment.visApiBaseUrl;
  String get _apiKey => Environment.visApiKey;

  /// Initialize the VIS integration service
  void initialize() {
    _debugLog('VIS Integration Service initialized');
    _debugLog('Base URL: $_baseUrl');
    _debugLog('API Key configured: ${_apiKey.isNotEmpty}');
  }

  /// Health check to verify VIS connectivity
  Future<Result<HealthStatus, VisError>> healthCheck() async {
    final stopwatch = Stopwatch()..start();
    final correlationId = _logger.generateCorrelationId();
    
    try {
      _logger.info('Starting VIS health check', 
          correlationId: correlationId, component: 'VIS_SERVICE');
      
      // Check circuit breaker
      if (_isCircuitBreakerOpen()) {
        return const Error(VisConnectionError(
          'Circuit breaker is open',
          'Service temporarily unavailable due to consecutive failures',
        ));
      }

      // Make a simple request to verify connectivity
      final result = await _makeApiCall(
        endpoint: '/tournaments',
        method: 'GET',
        queryParams: {'limit': '1'},
      );

      stopwatch.stop();
      final responseTime = stopwatch.elapsedMilliseconds;

      return result.fold(
        (data) {
          _consecutiveFailures = 0;
          _circuitBreakerOpen = false;
          
          return Success(HealthStatus(
            isConnected: true,
            responseTimeMs: responseTime,
            lastCheckTime: DateTime.now(),
            status: ConnectionStatus.connected,
          ));
        },
        (error) {
          _handleFailure();
          
          return Error(VisConnectionError(
            'Health check failed',
            'Response time: ${responseTime}ms, Error: ${error.message}',
          ));
        },
      );
    } catch (e) {
      stopwatch.stop();
      _handleFailure();
      
      return Error(VisConnectionError(
        'Health check exception',
        'Unexpected error: $e',
      ));
    }
  }

  /// Retrieve tournament data from VIS API
  Future<Result<List<Tournament>, VisError>> getTournaments({
    int limit = 50,
    String? filter,
  }) async {
    try {
      _debugLog('Fetching tournaments (limit: $limit, filter: $filter)');
      
      // Check circuit breaker
      if (_isCircuitBreakerOpen()) {
        return Error(VisConnectionError(
          'Circuit breaker is open',
          'Service temporarily unavailable',
        ));
      }

      // Check cache first
      final cacheKey = 'tournaments_${limit}_${filter ?? 'all'}';
      final cachedResult = _getCachedData<List<Tournament>>(cacheKey);
      if (cachedResult != null) {
        _debugLog('Returning cached tournament data');
        return Success(cachedResult);
      }

      // Make API call with retry logic
      final result = await _makeApiCallWithRetry(
        endpoint: '/tournaments',
        method: 'GET',
        queryParams: {
          'limit': limit.toString(),
          if (filter != null) 'filter': filter,
        },
      );

      return result.fold(
        (data) {
          try {
            final tournamentsData = data['tournaments'] as List;
            final tournaments = <Tournament>[];
            
            // Validate each tournament against FIVB compliance
            for (final tournamentJson in tournamentsData) {
              final validationResult = _complianceValidator.validateTournamentData(
                tournamentJson as Map<String, dynamic>
              );
              
              if (validationResult.isError) {
                _logger.warning(
                  'FIVB data validation failed for tournament',
                  component: 'VIS_SERVICE',
                  data: {'tournamentId': tournamentJson['id']},
                );
                // Skip invalid tournaments but continue processing others
                continue;
              }
              
              tournaments.add(Tournament.fromJson(tournamentJson));
            }
            
            // Cache the result
            _setCachedData(cacheKey, tournaments, Duration(minutes: 5));
            
            _consecutiveFailures = 0;
            return Success(tournaments);
          } catch (e) {
            return Error(VisDataValidationError(
              'Failed to parse tournament data',
              'Parsing error: $e',
            ));
          }
        },
        (error) => Error(error),
      );
    } catch (e) {
      _handleFailure();
      return Error(VisConnectionError(
        'Tournament retrieval failed',
        'Unexpected error: $e',
      ));
    }
  }

  /// Make API call with retry logic
  Future<Result<Map<String, dynamic>, VisError>> _makeApiCallWithRetry({
    required String endpoint,
    required String method,
    Map<String, String>? queryParams,
    Map<String, dynamic>? body,
    int attempt = 0,
  }) async {
    final result = await _makeApiCall(
      endpoint: endpoint,
      method: method,
      queryParams: queryParams,
      body: body,
    );

    return result.fold(
      (data) => Success(data),
      (error) async {
        // Don't retry on client errors (4xx)
        if (error is VisAuthenticationError || 
            error is VisDataValidationError ||
            attempt >= _retryDelays.length) {
          return Error(error);
        }

        // Wait before retry
        await Future.delayed(_retryDelays[attempt]);
        
        _debugLog('Retrying API call (attempt ${attempt + 1})');
        return _makeApiCallWithRetry(
          endpoint: endpoint,
          method: method,
          queryParams: queryParams,
          body: body,
          attempt: attempt + 1,
        );
      },
    );
  }

  /// Make API call to VIS endpoint
  Future<Result<Map<String, dynamic>, VisError>> _makeApiCall({
    required String endpoint,
    required String method,
    Map<String, String>? queryParams,
    Map<String, dynamic>? body,
  }) async {
    final stopwatch = Stopwatch()..start();
    final correlationId = _logger.generateCorrelationId();
    
    try {
      // FIVB compliance validation
      final complianceResult = _complianceValidator.validateApiCall(
        endpoint: endpoint,
        method: method,
      );
      if (complianceResult.isError) {
        return Error(complianceResult.error);
      }

      // Rate limiting check
      final rateLimitResult = _checkRateLimit();
      if (rateLimitResult != null) {
        return Error(rateLimitResult);
      }

      // Build URL
      final uri = Uri.parse('$_baseUrl$endpoint');
      final uriWithParams = queryParams != null
          ? uri.replace(queryParameters: queryParams)
          : uri;

      // Prepare headers
      final headers = {
        'Content-Type': 'application/json',
        'User-Agent': 'BeachRef/1.0',
        'X-FIVB-App-ID': Environment.fivbAppId,
        if (_apiKey.isNotEmpty) 'Authorization': 'Bearer $_apiKey',
      };

      _debugLog('Making $method request to: $uriWithParams');
      _lastApiCall = DateTime.now();

      // Make the request
      late http.Response response;
      
      switch (method.toUpperCase()) {
        case 'GET':
          response = await _httpClient.get(uriWithParams, headers: headers)
              .timeout(_apiTimeout);
          break;
        case 'POST':
          response = await _httpClient.post(
            uriWithParams,
            headers: headers,
            body: body != null ? jsonEncode(body) : null,
          ).timeout(_apiTimeout);
          break;
        default:
          throw ArgumentError('Unsupported HTTP method: $method');
      }

      _debugLog('Response status: ${response.statusCode}');
      
      stopwatch.stop();
      
      // Record API call for FIVB compliance
      _complianceValidator.recordApiCall(
        endpoint: endpoint,
        method: method,
        statusCode: response.statusCode,
        responseTimeMs: stopwatch.elapsedMilliseconds,
        correlationId: correlationId,
      );

      // Handle response
      return _handleResponse(response);
      
    } on TimeoutException {
      return Error(VisTimeoutError(
        'Request timeout',
        'API call to $endpoint timed out after ${_apiTimeout.inSeconds}s',
      ));
    } catch (e) {
      return Error(VisConnectionError(
        'API call failed',
        'Error making request to $endpoint: $e',
      ));
    }
  }

  /// Handle HTTP response
  Result<Map<String, dynamic>, VisError> _handleResponse(http.Response response) {
    try {
      switch (response.statusCode) {
        case 200:
        case 201:
          final data = jsonDecode(response.body) as Map<String, dynamic>;
          return Success(data);
        
        case 401:
          return Error(VisAuthenticationError(
            'Authentication failed',
            'Invalid API credentials',
          ));
        
        case 429:
          return Error(VisRateLimitError(
            'Rate limit exceeded',
            'Too many requests to VIS API',
          ));
        
        case 503:
          return Error(VisMaintenanceError(
            'VIS API maintenance',
            'Service temporarily unavailable',
          ));
        
        default:
          return Error(VisConnectionError(
            'HTTP error ${response.statusCode}',
            'Response: ${response.body}',
          ));
      }
    } catch (e) {
      return Error(VisDataValidationError(
        'Response parsing failed',
        'Error parsing JSON response: $e',
      ));
    }
  }

  /// Check rate limiting constraints
  VisRateLimitError? _checkRateLimit() {
    if (_lastApiCall != null) {
      final timeSinceLastCall = DateTime.now().difference(_lastApiCall!);
      if (timeSinceLastCall < _rateLimitInterval) {
        final waitTime = _rateLimitInterval - timeSinceLastCall;
        return VisRateLimitError(
          'Rate limit violation',
          'Must wait ${waitTime.inSeconds}s before next API call',
        );
      }
    }
    return null;
  }

  /// Handle API call failure
  void _handleFailure() {
    _consecutiveFailures++;
    if (_consecutiveFailures >= _maxConsecutiveFailures) {
      _circuitBreakerOpen = true;
      _circuitBreakerOpenTime = DateTime.now();
      _debugLog('Circuit breaker opened due to consecutive failures');
    }
  }

  /// Check if circuit breaker is open
  bool _isCircuitBreakerOpen() {
    if (!_circuitBreakerOpen) return false;
    
    if (_circuitBreakerOpenTime != null) {
      final timeSinceOpen = DateTime.now().difference(_circuitBreakerOpenTime!);
      if (timeSinceOpen >= _circuitBreakerTimeout) {
        _circuitBreakerOpen = false;
        _circuitBreakerOpenTime = null;
        _consecutiveFailures = 0;
        _debugLog('Circuit breaker closed after timeout');
        return false;
      }
    }
    
    return true;
  }

  /// Get cached data
  T? _getCachedData<T>(String key) {
    final metadata = _cacheMetadata[key];
    if (metadata == null || metadata.needsRefresh) {
      return null;
    }
    return _cachedData[key] as T?;
  }

  /// Set cached data
  void _setCachedData<T>(String key, T data, Duration expiration) {
    final now = DateTime.now();
    _cacheMetadata[key] = CacheMetadata(
      key: key,
      lastSync: now,
      expiresAt: now.add(expiration),
      isValid: true,
    );
    _cachedData[key] = data;
  }

  /// Clear cache
  void clearCache() {
    _cacheMetadata.clear();
    _cachedData.clear();
    _debugLog('Cache cleared');
  }

  /// Reset service state (for testing)
  void resetState() {
    clearCache();
    _lastApiCall = null;
    _consecutiveFailures = 0;
    _circuitBreakerOpen = false;
    _circuitBreakerOpenTime = null;
    _complianceValidator.clearHistory();
  }

  /// Get FIVB compliance statistics
  Map<String, dynamic> getComplianceStats() {
    return _complianceValidator.getComplianceStats();
  }

  /// Generate FIVB usage report
  Map<String, dynamic> generateUsageReport({
    DateTime? startDate,
    DateTime? endDate,
  }) {
    return _complianceValidator.generateUsageReport(
      startDate: startDate,
      endDate: endDate,
    );
  }

  /// Debug logging
  void _debugLog(String message) {
    if (kDebugMode) {
      debugPrint('[VIS Service] $message');
    }
  }

  /// Dispose resources
  void dispose() {
    _httpClient.close();
    clearCache();
  }
}

/// Health status model
class HealthStatus {
  final bool isConnected;
  final int responseTimeMs;
  final DateTime lastCheckTime;
  final ConnectionStatus status;
  final String? errorMessage;

  const HealthStatus({
    required this.isConnected,
    required this.responseTimeMs,
    required this.lastCheckTime,
    required this.status,
    this.errorMessage,
  });

  @override
  String toString() {
    return 'HealthStatus(connected: $isConnected, responseTime: ${responseTimeMs}ms, status: $status)';
  }
}

enum ConnectionStatus {
  connected,
  connecting,
  disconnected,
  unknown,
}