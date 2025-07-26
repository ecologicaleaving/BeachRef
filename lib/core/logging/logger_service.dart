import 'dart:convert';
import 'package:flutter/foundation.dart';
import '../environment.dart';

class LoggerService {
  static final LoggerService _instance = LoggerService._internal();
  factory LoggerService() => _instance;
  LoggerService._internal();

  int _correlationIdCounter = 0;

  /// Generate a new correlation ID for tracking related operations
  String generateCorrelationId() {
    _correlationIdCounter++;
    final timestamp = DateTime.now().millisecondsSinceEpoch;
    return 'corr_${timestamp}_$_correlationIdCounter';
  }

  /// Log info message with structured data
  void info(
    String message, {
    String? correlationId,
    Map<String, dynamic>? data,
    String? component,
  }) {
    _log(LogLevel.info, message, correlationId, data, component);
  }

  /// Log warning message with structured data
  void warning(
    String message, {
    String? correlationId,
    Map<String, dynamic>? data,
    String? component,
  }) {
    _log(LogLevel.warning, message, correlationId, data, component);
  }

  /// Log error message with structured data
  void error(
    String message, {
    String? correlationId,
    Map<String, dynamic>? data,
    String? component,
    Object? exception,
    StackTrace? stackTrace,
  }) {
    final errorData = <String, dynamic>{
      if (data != null) ...data,
      if (exception != null) 'exception': exception.toString(),
      if (stackTrace != null && kDebugMode) 'stackTrace': stackTrace.toString(),
    };
    
    _log(LogLevel.error, message, correlationId, errorData, component);
  }

  /// Log debug message (only in debug mode)
  void debug(
    String message, {
    String? correlationId,
    Map<String, dynamic>? data,
    String? component,
  }) {
    if (kDebugMode) {
      _log(LogLevel.debug, message, correlationId, data, component);
    }
  }

  /// Log VIS API call with request/response details
  void logApiCall({
    required String method,
    required String endpoint,
    required int statusCode,
    required int responseTimeMs,
    String? correlationId,
    Map<String, String>? headers,
    String? error,
  }) {
    final sanitizedHeaders = _sanitizeHeaders(headers);
    
    final logData = {
      'method': method,
      'endpoint': endpoint,
      'statusCode': statusCode,
      'responseTimeMs': responseTimeMs,
      if (sanitizedHeaders.isNotEmpty) 'headers': sanitizedHeaders,
      if (error != null) 'error': error,
    };

    if (statusCode >= 200 && statusCode < 300) {
      _log(LogLevel.info, 'VIS API call successful',
          correlationId,
          logData,
          'VIS_API');
    } else {
      _log(LogLevel.error, 'VIS API call failed',
          correlationId,
          logData,
          'VIS_API');
    }
  }

  /// Log user action with sanitized data
  void logUserAction(
    String action, {
    String? userId,
    String? correlationId,
    Map<String, dynamic>? metadata,
  }) {
    final sanitizedUserId = userId != null ? _sanitizePII(userId) : null;
    final sanitizedMetadata = metadata != null ? _sanitizeData(metadata) : null;
    
    _log(LogLevel.info, 'User action: $action',
        correlationId,
        {
          if (sanitizedUserId != null) 'userId': sanitizedUserId,
          if (sanitizedMetadata != null) ...sanitizedMetadata,
        },
        'USER_ACTION');
  }

  /// Internal logging method
  void _log(
    LogLevel level,
    String message,
    String? correlationId,
    Map<String, dynamic>? data,
    String? component,
  ) {
    final timestamp = DateTime.now().toIso8601String();
    final logEntry = {
      'timestamp': timestamp,
      'level': level.name,
      'message': message,
      'component': component ?? 'SYSTEM',
      'environment': Environment.environment,
      if (correlationId != null) 'correlationId': correlationId,
      if (data != null && data.isNotEmpty) 'data': _sanitizeData(data),
    };

    final logJson = jsonEncode(logEntry);
    
    // In debug mode, use debugPrint for better formatting
    if (kDebugMode) {
      debugPrint('[$level] [$component] $message');
      if (data != null && data.isNotEmpty) {
        debugPrint('  Data: ${jsonEncode(_sanitizeData(data))}');
      }
      if (correlationId != null) {
        debugPrint('  CorrelationId: $correlationId');
      }
    } else {
      // In production, output structured JSON
      debugPrint(logJson);
    }
  }

  /// Sanitize headers to remove sensitive information
  Map<String, String> _sanitizeHeaders(Map<String, String>? headers) {
    if (headers == null) return {};
    
    final sanitized = <String, String>{};
    const sensitiveHeaders = {'authorization', 'x-api-key', 'cookie', 'x-auth-token'};
    
    for (final entry in headers.entries) {
      final key = entry.key.toLowerCase();
      if (sensitiveHeaders.contains(key)) {
        sanitized[entry.key] = '[REDACTED]';
      } else {
        sanitized[entry.key] = entry.value;
      }
    }
    
    return sanitized;
  }

  /// Sanitize data to remove PII and sensitive information
  Map<String, dynamic> _sanitizeData(Map<String, dynamic> data) {
    final sanitized = <String, dynamic>{};
    const sensitiveKeys = {
      'password', 'token', 'secret', 'key', 'authorization',
      'email', 'phone', 'address', 'ssn', 'credit_card'
    };
    
    for (final entry in data.entries) {
      final key = entry.key.toLowerCase();
      if (sensitiveKeys.any((sensitive) => key.contains(sensitive))) {
        sanitized[entry.key] = '[REDACTED]';
      } else if (entry.value is Map<String, dynamic>) {
        sanitized[entry.key] = _sanitizeData(entry.value);
      } else if (entry.value is List) {
        sanitized[entry.key] = _sanitizeList(entry.value);
      } else {
        sanitized[entry.key] = entry.value;
      }
    }
    
    return sanitized;
  }

  /// Sanitize list data
  List<dynamic> _sanitizeList(List<dynamic> list) {
    return list.map((item) {
      if (item is Map<String, dynamic>) {
        return _sanitizeData(item);
      } else if (item is List) {
        return _sanitizeList(item);
      } else {
        return item;
      }
    }).toList();
  }

  /// Sanitize PII data
  String _sanitizePII(String data) {
    // For user IDs, show first 3 characters followed by asterisks
    if (data.length <= 3) return '[REDACTED]';
    return '${data.substring(0, 3)}${'*' * (data.length - 3)}';
  }

  /// Clear any buffered logs (if implemented in the future)
  void flush() {
    // Implementation for flushing logs to external service
    // For now, this is a no-op as we're using debugPrint
  }
}

enum LogLevel {
  debug,
  info,
  warning,
  error,
}