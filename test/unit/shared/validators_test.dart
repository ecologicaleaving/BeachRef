import 'package:flutter_test/flutter_test.dart';
import 'package:beachref/shared/validators.dart';

void main() {
  group('Validators Tests', () {
    group('email', () {
      test('should return null for valid emails', () {
        expect(Validators.email('test@example.com'), isNull);
        expect(Validators.email('user.name+tag@domain.co.uk'), isNull);
      });
      
      test('should return error message for invalid emails', () {
        expect(Validators.email('invalid.email'), equals('Enter a valid email address'));
        expect(Validators.email('test@'), equals('Enter a valid email address'));
        expect(Validators.email('@domain.com'), equals('Enter a valid email address'));
      });
      
      test('should return error message for empty email', () {
        expect(Validators.email(''), equals('Email is required'));
        expect(Validators.email(null), equals('Email is required'));
      });
    });
    
    group('required', () {
      test('should return null for non-empty values', () {
        expect(Validators.required('test'), isNull);
        expect(Validators.required('  test  '), isNull);
      });
      
      test('should return error message for empty values', () {
        expect(Validators.required(''), equals('This field is required'));
        expect(Validators.required('   '), equals('This field is required'));
        expect(Validators.required(null), equals('This field is required'));
      });
      
      test('should use custom field name in error message', () {
        expect(Validators.required('', 'Username'), equals('Username is required'));
      });
    });
    
    group('minLength', () {
      test('should return null for values meeting minimum length', () {
        expect(Validators.minLength('12345', 5), isNull);
        expect(Validators.minLength('123456', 5), isNull);
      });
      
      test('should return error message for values below minimum length', () {
        expect(Validators.minLength('1234', 5), equals('This field must be at least 5 characters'));
        expect(Validators.minLength(null, 5), equals('This field must be at least 5 characters'));
      });
      
      test('should use custom field name in error message', () {
        expect(Validators.minLength('123', 5, 'Password'), equals('Password must be at least 5 characters'));
      });
    });
  });
}