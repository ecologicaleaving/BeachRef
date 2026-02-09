import 'dart:developer' as developer;
import 'package:dio/dio.dart';
import 'package:flutter/foundation.dart';

/// Dio interceptor for dev-mode API logging and metrics
class ApiLoggerInterceptor extends Interceptor {
  final _metrics = _ApiMetrics();
  DateTime _lastReportTime = DateTime.now();
  static const _reportInterval = Duration(minutes: 5);

  @override
  void onRequest(RequestOptions options, RequestInterceptorHandler handler) {
    if (!kDebugMode) return handler.next(options);

    options.extra['_startTime'] = DateTime.now().millisecondsSinceEpoch;
    handler.next(options);
  }

  @override
  void onResponse(Response response, ResponseInterceptorHandler handler) {
    if (!kDebugMode) return handler.next(response);

    final startTime = response.requestOptions.extra['_startTime'] as int?;
    final duration = startTime != null
        ? DateTime.now().millisecondsSinceEpoch - startTime
        : 0;

    final body = response.requestOptions.data?.toString() ?? '';
    final endpoint = _extractEndpoint(body);
    final fieldCount = _countFields(body);
    final responseSize = response.data?.toString().length ?? 0;

    _metrics.record(endpoint, duration, responseSize, fieldCount);

    developer.log(
      '[$endpoint] ${duration}ms | ${_formatBytes(responseSize)} | $fieldCount fields',
      name: 'VIS-API',
    );

    if (responseSize > 50 * 1024) {
      developer.log(
        'WARNING: Large payload ($responseSize bytes) for $endpoint',
        name: 'VIS-API',
      );
    }

    if (fieldCount > 20) {
      developer.log(
        'WARNING: High field count ($fieldCount) for $endpoint',
        name: 'VIS-API',
      );
    }

    // Periodic report
    if (DateTime.now().difference(_lastReportTime) > _reportInterval) {
      _logReport();
      _lastReportTime = DateTime.now();
    }

    handler.next(response);
  }

  @override
  void onError(DioException err, ErrorInterceptorHandler handler) {
    if (kDebugMode) {
      final body = err.requestOptions.data?.toString() ?? '';
      final endpoint = _extractEndpoint(body);
      developer.log(
        'ERROR [$endpoint] ${err.message}',
        name: 'VIS-API',
      );
    }
    handler.next(err);
  }

  void _logReport() {
    final report = _metrics.report();
    developer.log(report, name: 'VIS-API-REPORT');
  }

  String _extractEndpoint(String body) {
    final match = RegExp(r'Type="([^"]+)"').firstMatch(body);
    return match?.group(1) ?? 'Unknown';
  }

  int _countFields(String body) {
    final match = RegExp(r'Fields="([^"]+)"').firstMatch(body);
    if (match == null) return 0;
    return match.group(1)!.split(' ').length;
  }

  String _formatBytes(int bytes) {
    if (bytes < 1024) return '${bytes}B';
    if (bytes < 1024 * 1024) return '${(bytes / 1024).toStringAsFixed(1)}KB';
    return '${(bytes / (1024 * 1024)).toStringAsFixed(1)}MB';
  }
}

class _ApiMetrics {
  final _calls = <String, List<_CallRecord>>{};

  void record(String endpoint, int durationMs, int responseSize, int fieldCount) {
    _calls.putIfAbsent(endpoint, () => []).add(
      _CallRecord(durationMs, responseSize, fieldCount),
    );
  }

  String report() {
    final buf = StringBuffer('=== VIS API Report ===\n');
    var totalCalls = 0;

    for (final entry in _calls.entries) {
      final records = entry.value;
      totalCalls += records.length;
      final avgDuration = records.isEmpty
          ? 0
          : records.map((r) => r.durationMs).reduce((a, b) => a + b) ~/ records.length;
      final avgSize = records.isEmpty
          ? 0
          : records.map((r) => r.responseSize).reduce((a, b) => a + b) ~/ records.length;

      buf.writeln('  ${entry.key}: ${records.length} calls, avg ${avgDuration}ms, avg ${avgSize}B');
    }

    buf.writeln('Total calls: $totalCalls');
    return buf.toString();
  }
}

class _CallRecord {
  final int durationMs;
  final int responseSize;
  final int fieldCount;
  _CallRecord(this.durationMs, this.responseSize, this.fieldCount);
}
