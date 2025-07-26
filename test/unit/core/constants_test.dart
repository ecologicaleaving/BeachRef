import 'package:flutter_test/flutter_test.dart';
import 'package:beachref/core/constants.dart';

void main() {
  group('AppConstants Tests', () {
    test('should have correct app metadata', () {
      expect(AppConstants.appName, equals('BeachRef'));
      expect(AppConstants.appVersion, equals('1.0.0'));
    });
    
    test('should have correct API configuration', () {
      expect(AppConstants.apiTimeoutSeconds, equals(30));
      expect(AppConstants.visSyncIntervalSeconds, equals(30));
    });
    
    test('should have correct UI constants', () {  
      expect(AppConstants.defaultPadding, equals(16.0));
      expect(AppConstants.defaultBorderRadius, equals(8.0));
    });
    
    test('should have correct routes', () {
      expect(AppConstants.homeRoute, equals('/'));
    });
  });
}