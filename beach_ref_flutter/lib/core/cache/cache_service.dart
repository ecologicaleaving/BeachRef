import 'dart:convert';
import 'package:hive/hive.dart';
import 'memory_cache.dart';

/// Multi-level cache: Memory -> Hive -> API
///
/// BANDWIDTH-CONSCIOUS design:
/// - Stale-while-revalidate ONLY if data is within 20% of expiry
/// - Long TTLs for static data (events: 6h, tournament nos: 7d)
/// - Short TTLs only for actively-watched live matches
/// - No background refetch if data is still fresh
/// - Proper serialization/deserialization for Hive persistence
class CacheService {
  CacheService._();

  static final instance = CacheService._();

  final _memory = MemoryCache(maxEntries: 500);
  Box? _hiveBox;

  // Metrics
  int _hits = 0;
  int _misses = 0;
  int _apiCalls = 0;

  Future<void> init() async {
    _hiveBox = await Hive.openBox('cache_entries_v4');
  }

  /// Get from cache. If miss, call [fetcher] and cache the result.
  ///
  /// [deserializer] is required for complex types (List<T>, custom objects)
  /// to reconstruct from JSON. Without it, only primitive types survive
  /// Hive serialization.
  Future<T> getOrFetch<T>({
    required String key,
    required Future<T> Function() fetcher,
    required Duration ttl,
    T Function(dynamic json)? deserializer,
  }) async {
    // Level 1: Memory (stores actual Dart objects - always works)
    final memResult = _memory.get<T>(key);
    if (memResult != null) {
      _hits++;
      return memResult;
    }

    // Level 2: Hive (stores JSON strings - needs deserialization)
    final hiveResult = _getFromHive<T>(key, deserializer);
    if (hiveResult != null) {
      _hits++;
      _memory.set(key, hiveResult.data, ttl);

      // Only revalidate in background if near expiry (>80% of TTL elapsed)
      if (hiveResult.isNearExpiry) {
        _revalidateInBackground(key, fetcher, ttl);
      }

      return hiveResult.data;
    }

    // Level 3: API call (cache miss)
    _misses++;
    _apiCalls++;
    final freshData = await fetcher();
    _memory.set(key, freshData, ttl);
    _saveToHive(key, freshData, ttl);
    return freshData;
  }

  /// Get cached value or null (no fetch).
  T? getCached<T>(String key, {T Function(dynamic json)? deserializer}) {
    final memResult = _memory.get<T>(key);
    if (memResult != null) return memResult;
    final hiveResult = _getFromHive<T>(key, deserializer);
    return hiveResult?.data;
  }

  /// Save to both memory and Hive.
  void set(String key, dynamic value, Duration ttl) {
    _memory.set(key, value, ttl);
    _saveToHive(key, value, ttl);
  }

  void remove(String key) {
    _memory.remove(key);
    _hiveBox?.delete(key);
  }

  void clear() {
    _memory.clear();
    _hiveBox?.clear();
  }

  double get hitRate {
    final total = _hits + _misses;
    return total == 0 ? 0 : _hits / total;
  }

  int get apiCallCount => _apiCalls;

  // ──────────────────────────────────────────────
  // Adaptive TTL - CONSERVATIVE to minimize API calls
  // ──────────────────────────────────────────────

  /// TTL strategy — minimize API calls:
  /// - events: 6h (list of all tournaments, ~108KB, barely changes)
  /// - tournament_nos: 7d (Event→Tournament mapping, never changes)
  /// - match: 5min (single match detail, on-demand only)
  /// - live: 5s (live score polling for active matches)
  /// - matchlist: DYNAMIC — determined by _smartMatchListTtl() in provider
  ///   - Has live matches → 30s
  ///   - All finished → 7 days
  ///   - All scheduled → 1 hour
  static Duration adaptiveTtl(String dataType, [String? status]) {
    switch (dataType) {
      case 'events':
        return const Duration(hours: 6);
      case 'tournament_nos':
        return const Duration(days: 7);
      case 'match':
        return const Duration(minutes: 5);
      case 'live':
        return const Duration(seconds: 5);
      default:
        return const Duration(minutes: 5);
    }
  }

  // ──────────────────────────────────────────────
  // Hive helpers with proper deserialization
  // ──────────────────────────────────────────────

  _HiveResult<T>? _getFromHive<T>(
      String key, T Function(dynamic json)? deserializer) {
    if (_hiveBox == null) return null;

    final raw = _hiveBox!.get(key);
    if (raw == null) return null;

    try {
      final entry = raw is Map
          ? Map<String, dynamic>.from(raw)
          : jsonDecode(raw as String) as Map<String, dynamic>;
      final expiresAt = DateTime.parse(entry['_expiresAt'] as String);
      final createdAt = entry['_createdAt'] != null
          ? DateTime.parse(entry['_createdAt'] as String)
          : expiresAt.subtract(const Duration(hours: 1));

      final now = DateTime.now();

      if (now.isAfter(expiresAt)) {
        _hiveBox!.delete(key);
        return null;
      }

      final data = entry['_data'];
      T? result;

      // Try direct type match first (works for primitives)
      if (data is T) {
        result = data;
      } else if (deserializer != null) {
        // Use explicit deserializer for complex types (List<T>, custom objects)
        result = deserializer(data);
      } else {
        // Last resort: try casting
        result = data as T?;
      }

      if (result == null) return null;

      // Calculate if near expiry (>80% of TTL elapsed)
      final totalTtl = expiresAt.difference(createdAt);
      final elapsed = now.difference(createdAt);
      final isNearExpiry =
          elapsed.inMilliseconds > totalTtl.inMilliseconds * 0.8;

      return _HiveResult(data: result, isNearExpiry: isNearExpiry);
    } catch (_) {
      _hiveBox!.delete(key);
      return null;
    }
  }

  void _saveToHive(String key, dynamic value, Duration ttl) {
    if (_hiveBox == null) return;

    final now = DateTime.now();
    final entry = {
      '_data': value,
      '_createdAt': now.toIso8601String(),
      '_expiresAt': now.add(ttl).toIso8601String(),
    };

    try {
      _hiveBox!.put(key, jsonEncode(entry));
    } catch (_) {
      // Hive write failure - ignore, memory cache still works
    }
  }

  void _revalidateInBackground<T>(
    String key,
    Future<T> Function() fetcher,
    Duration ttl,
  ) {
    _apiCalls++;
    Future.microtask(() async {
      try {
        final freshData = await fetcher();
        _memory.set(key, freshData, ttl);
        _saveToHive(key, freshData, ttl);
      } catch (_) {
        // Background revalidation failed - stale data still served
      }
    });
  }
}

class _HiveResult<T> {
  final T data;
  final bool isNearExpiry;
  const _HiveResult({required this.data, required this.isNearExpiry});
}
