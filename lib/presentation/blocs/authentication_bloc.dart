import 'package:flutter/foundation.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:equatable/equatable.dart';
import '../../services/authentication_service.dart';
import '../../services/session_manager.dart';
import '../../data/models/user_profile.dart';
import '../../core/logging/logger_service.dart';
import '../../core/utils.dart';

// Events
abstract class AuthenticationEvent extends Equatable {
  const AuthenticationEvent();
  
  @override
  List<Object?> get props => [];
}

class AppStarted extends AuthenticationEvent {}

class LoginRequested extends AuthenticationEvent {
  final String email;
  final String password;
  final bool rememberMe;

  const LoginRequested({
    required this.email,
    required this.password,
    this.rememberMe = false,
  });

  @override
  List<Object?> get props => [email, password, rememberMe];
}

class LogoutRequested extends AuthenticationEvent {}

class SessionCheckRequested extends AuthenticationEvent {}

class TokenRefreshRequested extends AuthenticationEvent {}

// States
abstract class AuthenticationState extends Equatable {
  const AuthenticationState();
  
  @override
  List<Object?> get props => [];
}

class AuthenticationInitial extends AuthenticationState {
  const AuthenticationInitial();
}

class AuthenticationLoading extends AuthenticationState {
  const AuthenticationLoading();
}

class AuthenticationAuthenticated extends AuthenticationState {
  final UserProfile user;

  const AuthenticationAuthenticated({required this.user});

  @override
  List<Object?> get props => [user];
}

class AuthenticationUnauthenticated extends AuthenticationState {
  const AuthenticationUnauthenticated();
}

class AuthenticationError extends AuthenticationState {
  final String message;
  final String? details;

  const AuthenticationError({
    required this.message,
    this.details,
  });

  @override
  List<Object?> get props => [message, details];
}

// BLoC
class AuthenticationBloc extends Bloc<AuthenticationEvent, AuthenticationState> {
  final AuthenticationService _authService;
  final SessionManager _sessionManager;
  final LoggerService _logger;

  AuthenticationBloc({
    required AuthenticationService authService,
    required SessionManager sessionManager,
    LoggerService? logger,
  })  : _authService = authService,
        _sessionManager = sessionManager,
        _logger = logger ?? LoggerService(),
        super(AuthenticationInitial()) {
    
    on<AppStarted>(_onAppStarted);
    on<LoginRequested>(_onLoginRequested);
    on<LogoutRequested>(_onLogoutRequested);
    on<SessionCheckRequested>(_onSessionCheckRequested);
    on<TokenRefreshRequested>(_onTokenRefreshRequested);
  }

  Future<void> _onAppStarted(
    AppStarted event,
    Emitter<AuthenticationState> emit,
  ) async {
    final correlationId = _logger.generateCorrelationId();
    
    try {
      _logger.info(
        'App started - checking authentication state',
        correlationId: correlationId,
        component: 'AUTH_BLOC',
      );

      // Check if there's a valid session
      final sessionResult = await _sessionManager.getCurrentSession();
      
      await sessionResult.fold(
        (session) async {
          // Validate the session and get user profile
          final userResult = await _authService.getCurrentUser();
          
          userResult.fold(
            (user) {
              _logger.info(
                'Valid session found - user authenticated',
                correlationId: correlationId,
                data: {'userId': user.userId},
                component: 'AUTH_BLOC',
              );
              emit(AuthenticationAuthenticated(user: user));
            },
            (error) {
              _logger.warning(
                'Invalid session found - clearing session',
                correlationId: correlationId,
                data: {'error': error.message},
                component: 'AUTH_BLOC',
              );
              _sessionManager.clearSession();
              emit(AuthenticationUnauthenticated());
            },
          );
        },
        (error) {
          _logger.info(
            'No valid session found',
            correlationId: correlationId,
            component: 'AUTH_BLOC',
          );
          emit(AuthenticationUnauthenticated());
        },
      );
    } catch (e) {
      _logger.error(
        'Error during app startup authentication check',
        correlationId: correlationId,
        exception: e,
        component: 'AUTH_BLOC',
      );
      emit(AuthenticationUnauthenticated());
    }
  }

  Future<void> _onLoginRequested(
    LoginRequested event,
    Emitter<AuthenticationState> emit,
  ) async {
    final correlationId = _logger.generateCorrelationId();
    
    emit(AuthenticationLoading());

    try {
      _logger.info(
        'Login requested',
        correlationId: correlationId,
        data: {'email': event.email, 'rememberMe': event.rememberMe},
        component: 'AUTH_BLOC',
      );

      final result = await _authService.signInWithCredentials(
        email: event.email,
        password: event.password,
        rememberMe: event.rememberMe,
      );

      result.fold(
        (user) {
          _logger.info(
            'Login successful',
            correlationId: correlationId,
            data: {'userId': user.userId},
            component: 'AUTH_BLOC',
          );
          emit(AuthenticationAuthenticated(user: user));
        },
        (error) {
          _logger.warning(
            'Login failed',
            correlationId: correlationId,
            data: {'error': error.message},
            component: 'AUTH_BLOC',
          );
          emit(AuthenticationError(
            message: getUserFriendlyErrorMessage(error.message),
            details: error.details,
          ));
        },
      );
    } catch (e) {
      _logger.error(
        'Unexpected error during login',
        correlationId: correlationId,
        exception: e,
        component: 'AUTH_BLOC',
      );
      emit(const AuthenticationError(
        message: 'An unexpected error occurred. Please try again.',
      ));
    }
  }

  Future<void> _onLogoutRequested(
    LogoutRequested event,
    Emitter<AuthenticationState> emit,
  ) async {
    final correlationId = _logger.generateCorrelationId();

    try {
      _logger.info(
        'Logout requested',
        correlationId: correlationId,
        component: 'AUTH_BLOC',
      );

      await _authService.signOut();

      _logger.info(
        'Logout successful',
        correlationId: correlationId,
        component: 'AUTH_BLOC',
      );

      emit(AuthenticationUnauthenticated());
    } catch (e) {
      _logger.error(
        'Error during logout',
        correlationId: correlationId,
        exception: e,
        component: 'AUTH_BLOC',
      );
      
      // Even if logout fails, clear the local state
      emit(AuthenticationUnauthenticated());
    }
  }

  Future<void> _onSessionCheckRequested(
    SessionCheckRequested event,
    Emitter<AuthenticationState> emit,
  ) async {
    final correlationId = _logger.generateCorrelationId();

    try {
      final userResult = await _authService.getCurrentUser();
      
      userResult.fold(
        (user) {
          if (state is! AuthenticationAuthenticated) {
            _logger.info(
              'Session check - user authenticated',
              correlationId: correlationId,
              data: {'userId': user.userId},
              component: 'AUTH_BLOC',
            );
            emit(AuthenticationAuthenticated(user: user));
          }
        },
        (error) {
          _logger.warning(
            'Session check failed - session invalid',
            correlationId: correlationId,
            data: {'error': error.message},
            component: 'AUTH_BLOC',
          );
          emit(AuthenticationUnauthenticated());
        },
      );
    } catch (e) {
      _logger.error(
        'Error during session check',
        correlationId: correlationId,
        exception: e,
        component: 'AUTH_BLOC',
      );
      emit(AuthenticationUnauthenticated());
    }
  }

  Future<void> _onTokenRefreshRequested(
    TokenRefreshRequested event,
    Emitter<AuthenticationState> emit,
  ) async {
    final correlationId = _logger.generateCorrelationId();

    try {
      final result = await _authService.refreshToken();
      
      result.fold(
        (user) {
          _logger.info(
            'Token refresh successful',
            correlationId: correlationId,
            data: {'userId': user.userId},
            component: 'AUTH_BLOC',
          );
          emit(AuthenticationAuthenticated(user: user));
        },
        (error) {
          _logger.warning(
            'Token refresh failed',
            correlationId: correlationId,
            data: {'error': error.message},
            component: 'AUTH_BLOC',
          );
          emit(AuthenticationUnauthenticated());
        },
      );
    } catch (e) {
      _logger.error(
        'Error during token refresh',
        correlationId: correlationId,
        exception: e,
        component: 'AUTH_BLOC',
      );
      emit(AuthenticationUnauthenticated());
    }
  }

  @visibleForTesting
  String getUserFriendlyErrorMessage(String errorMessage) {
    // Convert technical error messages to user-friendly ones
    final lowerError = errorMessage.toLowerCase();
    
    if (lowerError.contains('invalid') && lowerError.contains('credential')) {
      return 'Invalid email or password. Please check your credentials and try again.';
    }
    
    if (lowerError.contains('network') || lowerError.contains('connection')) {
      return 'Network error. Please check your internet connection and try again.';
    }
    
    if (lowerError.contains('timeout')) {
      return 'Request timed out. Please try again.';
    }
    
    if (lowerError.contains('rate limit') || lowerError.contains('too many')) {
      return 'Too many login attempts. Please wait a moment and try again.';
    }
    
    if (lowerError.contains('maintenance') || lowerError.contains('unavailable')) {
      return 'Authentication service is temporarily unavailable. Please try again later.';
    }
    
    // Default user-friendly message
    return 'Login failed. Please check your credentials and try again.';
  }
}