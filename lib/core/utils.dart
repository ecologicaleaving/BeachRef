import 'package:flutter/foundation.dart';

class AppUtils {
  static void debugLog(String message) {
    if (kDebugMode) {
      debugPrint('[BeachRef] $message');
    }
  }
  
  static String formatDateTime(DateTime dateTime) {
    return '${dateTime.day.toString().padLeft(2, '0')}/'
           '${dateTime.month.toString().padLeft(2, '0')}/'
           '${dateTime.year} '
           '${dateTime.hour.toString().padLeft(2, '0')}:'
           '${dateTime.minute.toString().padLeft(2, '0')}';
  }
  
  static bool isValidEmail(String email) {
    return RegExp(r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$').hasMatch(email);
  }
}

/// Convert technical error messages into user-friendly messages
String getUserFriendlyErrorMessage(String technicalMessage) {
  final lowerMessage = technicalMessage.toLowerCase();
  
  if (lowerMessage.contains('credential') || lowerMessage.contains('password') || lowerMessage.contains('authentication')) {
    return 'Invalid email or password. Please check your credentials and try again.';
  }
  
  if (lowerMessage.contains('network') || lowerMessage.contains('connection')) {
    return 'Network connection error. Please check your internet connection and try again.';
  }
  
  if (lowerMessage.contains('timeout')) {
    return 'Request timed out. Please try again.';
  }
  
  if (lowerMessage.contains('server') || lowerMessage.contains('service')) {
    return 'Service temporarily unavailable. Please try again later.';
  }
  
  if (lowerMessage.contains('session') || lowerMessage.contains('expired')) {
    return 'Your session has expired. Please sign in again.';
  }
  
  // Default fallback
  return 'An unexpected error occurred. Please try again.';
}