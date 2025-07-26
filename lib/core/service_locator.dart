import 'package:get_it/get_it.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import 'package:http/http.dart' as http;
import '../services/interfaces/i_authentication_service.dart';
import '../services/authentication_service.dart';
import '../services/session_manager.dart';
import '../services/vis_integration_service.dart';
import '../core/logging/logger_service.dart';

/// Service locator for dependency injection
/// Provides singleton and factory registrations for services
class ServiceLocator {
  static final GetIt _getIt = GetIt.instance;
  
  static GetIt get instance => _getIt;

  /// Initialize all services with production dependencies
  static Future<void> init() async {
    // Core services
    _getIt.registerSingleton<LoggerService>(LoggerService());
    _getIt.registerSingleton<http.Client>(http.Client());
    
    // Session manager with dependencies
    _getIt.registerSingleton<SessionManager>(
      SessionManager(logger: _getIt<LoggerService>()),
    );

    // VIS integration service
    _getIt.registerSingleton<VisIntegrationService>(
      VisIntegrationService(
        httpClient: _getIt<http.Client>(),
        logger: _getIt<LoggerService>(),
      ),
    );

    // Authentication service - uses IAuthenticationService interface
    _getIt.registerFactory<IAuthenticationService>(
      () => AuthenticationService(
        supabaseClient: Supabase.instance.client,
        logger: _getIt<LoggerService>(),
        sessionManager: _getIt<SessionManager>(),
      ),
    );

    // Register concrete implementation for tests that need it
    _getIt.registerFactory<AuthenticationService>(
      () => AuthenticationService(
        supabaseClient: Supabase.instance.client,
        logger: _getIt<LoggerService>(),
        sessionManager: _getIt<SessionManager>(),
      ),
    );
  }

  /// Reset all services (useful for testing)
  static Future<void> reset() async {
    await _getIt.reset();
  }

  /// Get service by type
  static T get<T extends Object>() {
    return _getIt.get<T>();
  }

  /// Register a service (useful for testing)
  static void register<T extends Object>(T instance) {
    if (_getIt.isRegistered<T>()) {
      _getIt.unregister<T>();
    }
    _getIt.registerSingleton<T>(instance);
  }

  /// Register a factory (useful for testing)
  static void registerFactory<T extends Object>(T Function() factory) {
    if (_getIt.isRegistered<T>()) {
      _getIt.unregister<T>();
    }
    _getIt.registerFactory<T>(factory);
  }

  /// Check if service is registered
  static bool isRegistered<T extends Object>() {
    return _getIt.isRegistered<T>();
  }
}