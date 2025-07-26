import 'package:flutter_test/flutter_test.dart';
import 'package:beachref/core/utils.dart';

void main() {
  group('AppUtils Tests', () {
    group('formatDateTime', () {
      test('should format DateTime correctly', () {
        final dateTime = DateTime(2024, 1, 15, 14, 30);
        final formatted = AppUtils.formatDateTime(dateTime);
        expect(formatted, equals('15/01/2024 14:30'));
      });
      
      test('should pad single digits with zeros', () {
        final dateTime = DateTime(2024, 1, 5, 9, 5);
        final formatted = AppUtils.formatDateTime(dateTime);
        expect(formatted, equals('05/01/2024 09:05'));
      });
    });
    
    group('isValidEmail', () {
      test('should return true for valid emails', () {
        expect(AppUtils.isValidEmail('test@example.com'), isTrue);
        expect(AppUtils.isValidEmail('user.name+tag@domain.co.uk'), isTrue);
      });
      
      test('should return false for invalid emails', () {
        expect(AppUtils.isValidEmail('invalid.email'), isFalse);
        expect(AppUtils.isValidEmail('test@'), isFalse);
        expect(AppUtils.isValidEmail('@domain.com'), isFalse);
        expect(AppUtils.isValidEmail(''), isFalse);
      });
    });
  });
}