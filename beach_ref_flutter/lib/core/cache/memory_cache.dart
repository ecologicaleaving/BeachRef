/// LRU in-memory cache (Level 1)
class MemoryCache {
  final int maxEntries;
  final _cache = <String, _CacheEntry>{};

  MemoryCache({this.maxEntries = 500});

  T? get<T>(String key) {
    final entry = _cache[key];
    if (entry == null) return null;

    if (entry.isExpired) {
      _cache.remove(key);
      return null;
    }

    // Move to end (most recently used)
    _cache.remove(key);
    _cache[key] = entry;

    return entry.value as T?;
  }

  void set(String key, dynamic value, Duration ttl) {
    // Evict LRU if at capacity
    while (_cache.length >= maxEntries) {
      _cache.remove(_cache.keys.first);
    }

    _cache[key] = _CacheEntry(
      value: value,
      expiresAt: DateTime.now().add(ttl),
    );
  }

  void remove(String key) {
    _cache.remove(key);
  }

  void clear() {
    _cache.clear();
  }

  bool containsKey(String key) {
    final entry = _cache[key];
    if (entry == null) return false;
    if (entry.isExpired) {
      _cache.remove(key);
      return false;
    }
    return true;
  }

  int get size => _cache.length;
}

class _CacheEntry {
  final dynamic value;
  final DateTime expiresAt;

  _CacheEntry({required this.value, required this.expiresAt});

  bool get isExpired => DateTime.now().isAfter(expiresAt);
}
