import 'package:flutter_test/flutter_test.dart';
import 'package:mockito/mockito.dart';
import 'package:beachref/services/authentication_service.dart';
import 'package:beachref/services/session_manager.dart';
import 'package:beachref/services/vis_integration_service.dart';
import 'package:beachref/core/logging/logger_service.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:http/http.dart' as http;

/// Centralized test service registry for dependency injection
/// Provides consistent mock services across all test suites
class TestServiceLocator {
  static final TestServiceLocator _instance = TestServiceLocator._internal();
  factory TestServiceLocator() => _instance;
  TestServiceLocator._internal();

  final Map<Type, dynamic> _services = {};
  final Map<Type, dynamic> _mocks = {};

  /// Register a service implementation for testing
  void register<T>(T service) {
    _services[T] = service;
  }

  /// Register a mock for a service
  void registerMock<T>(Mock mock) {
    _mocks[T] = mock;
  }

  /// Get a registered service or mock
  T get<T>() {
    if (_mocks.containsKey(T)) {
      return _mocks[T] as T;
    }
    if (_services.containsKey(T)) {
      return _services[T] as T;
    }
    throw Exception('Service of type $T not registered in TestServiceLocator');
  }

  /// Check if a service is registered
  bool isRegistered<T>() {
    return _services.containsKey(T) || _mocks.containsKey(T);
  }

  /// Clear all registered services (for test isolation)
  void reset() {
    _services.clear();
    _mocks.clear();
  }

  /// Setup default test services with proper mocking
  void setupDefaultTestServices() {
    reset();
    
    // Register mock storage services
    final mockStorage = MockFlutterSecureStorage();
    registerMock<FlutterSecureStorage>(mockStorage);
    
    // Register mock HTTP client
    final mockHttpClient = MockClient();
    registerMock<http.Client>(mockHttpClient);
    
    // Register mock logger
    final mockLogger = MockLoggerService();
    registerMock<LoggerService>(mockLogger);
    
    // Register services with dependency injection
    final sessionManager = SessionManager(
      storage: mockStorage,
      logger: mockLogger,
    );
    register<SessionManager>(sessionManager);
    
    final visService = VisIntegrationService(
      httpClient: mockHttpClient,
      logger: mockLogger,
    );
    register<VisIntegrationService>(visService);
  }
}

/// Mock classes for testing
class MockFlutterSecureStorage extends Mock implements FlutterSecureStorage {}
class MockClient extends Mock implements http.Client {}
class MockLoggerService extends Mock implements LoggerService {
  @override
  String generateCorrelationId() => 'test-correlation-id';
}