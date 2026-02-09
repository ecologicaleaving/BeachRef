import 'package:flutter_test/flutter_test.dart';
import 'package:beach_ref_flutter/core/cache/memory_cache.dart';

void main() {
  group('MemoryCache', () {
    late MemoryCache cache;

    setUp(() {
      cache = MemoryCache(maxEntries: 5);
    });

    test('get returns null for missing key', () {
      expect(cache.get<String>('missing'), isNull);
    });

    test('set and get returns stored value', () {
      cache.set('key1', 'value1', const Duration(minutes: 5));
      expect(cache.get<String>('key1'), 'value1');
    });

    test('expired entries are removed on get', () async {
      cache.set('key1', 'value1', const Duration(milliseconds: 1));
      await Future.delayed(const Duration(milliseconds: 10));
      expect(cache.get<String>('key1'), isNull);
    });

    test('LRU eviction when at capacity', () {
      for (var i = 0; i < 6; i++) {
        cache.set('key$i', 'value$i', const Duration(minutes: 5));
      }
      // key0 should be evicted (LRU)
      expect(cache.get<String>('key0'), isNull);
      // key5 should exist
      expect(cache.get<String>('key5'), 'value5');
    });

    test('accessing a key promotes it (LRU update)', () {
      for (var i = 0; i < 5; i++) {
        cache.set('key$i', 'value$i', const Duration(minutes: 5));
      }
      // Access key0 to promote it
      cache.get<String>('key0');
      // Add new entry - should evict key1 (now the LRU)
      cache.set('key5', 'value5', const Duration(minutes: 5));
      expect(cache.get<String>('key0'), 'value0'); // promoted, still here
      expect(cache.get<String>('key1'), isNull); // evicted
    });

    test('remove removes a key', () {
      cache.set('key1', 'value1', const Duration(minutes: 5));
      cache.remove('key1');
      expect(cache.get<String>('key1'), isNull);
    });

    test('clear removes all entries', () {
      cache.set('a', 1, const Duration(minutes: 5));
      cache.set('b', 2, const Duration(minutes: 5));
      cache.clear();
      expect(cache.size, 0);
    });

    test('containsKey returns correct values', () {
      cache.set('exists', true, const Duration(minutes: 5));
      expect(cache.containsKey('exists'), isTrue);
      expect(cache.containsKey('missing'), isFalse);
    });
  });
}
