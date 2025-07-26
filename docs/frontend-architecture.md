# BeachRef Frontend Architecture Document

## Change Log
| Date | Version | Description | Author |
|------|---------|-------------|---------|
| 2025-07-26 | 1.0 | Initial Flutter-specific frontend architecture | BMad Master |

## Template and Framework Selection

**Framework Decision:** Flutter 3.16.0+ with Dart 3.2.0+
**Target Platform:** Web-first with mobile capability  
**No Starter Template:** Building from scratch with complete control over implementation
**Deployment:** Vercel hosting for Flutter Web builds

The project uses Flutter as specified in the main architecture document, providing cross-platform capability while starting with web deployment. This aligns with the UI-first development approach and enables future mobile expansion using the same codebase.

## Frontend Tech Stack

| Category | Technology | Version | Purpose | Rationale |
|----------|------------|---------|---------|-----------|
| Framework | Flutter | 3.16.0+ | Cross-platform UI framework | Cross-platform web/mobile, single codebase |
| Language | Dart | 3.2.0+ | Primary development language | Flutter's native language, null safety |
| State Management | flutter_bloc | 8.1.0+ | Application state management | Industry standard, testable, scalable |
| UI Library | Material 3 | Built-in | UI components and theming | Modern Material Design, accessibility |
| Routing | go_router | 12.0.0+ | Declarative routing | Flutter team recommended, type-safe |
| Build Tool | Flutter SDK | 3.16.0+ | Build and development tooling | Official Flutter tooling |
| Styling | Custom Theme + Material 3 | Built-in | High-contrast referee theme | Sunlight-readable, FIVB branding |
| Testing | flutter_test + mockito | Built-in + 5.4.0+ | Widget and unit testing | Official Flutter testing + mocking |
| Component Library | Custom Components | N/A | Referee-optimized widgets | Sunlight-readable, beach-specific |
| Form Handling | Built-in + validators | Built-in | Form validation | Simple, no external dependencies |
| Animation | Built-in Flutter Animations | Built-in | Purposeful micro-interactions | Performance-optimized, hardware accelerated |
| Dev Tools | Flutter Inspector + DevTools | Built-in | Development and debugging | Official Flutter development tools |
| **Backend Integration** | supabase_flutter | 2.0.0+ | Supabase client with real-time | Seamless auth, real-time subscriptions |
| **Network State** | connectivity_plus | 5.0.0+ | Network status detection | Critical for offline-first approach |
| **Secure Storage** | flutter_secure_storage | 9.0.0+ | Token and session storage | Enhanced security for JWT tokens |

## Project Structure

```
beachref/
├── lib/
│   ├── main.dart                              # App entry + Supabase init
│   ├── app/
│   │   ├── app.dart                           # Material App setup
│   │   ├── router.dart                        # GoRouter with auth
│   │   └── theme.dart                         # Referee theme
│   ├── core/
│   │   ├── constants.dart                     # All constants in one place
│   │   ├── exceptions.dart                    # All custom exceptions
│   │   └── utils.dart                         # Shared utilities
│   ├── data/
│   │   ├── models/
│   │   │   ├── tournament.dart                # Tournament model + JSON
│   │   │   ├── match.dart                     # Match model + JSON
│   │   │   └── user.dart                      # User model + JSON
│   │   ├── services/
│   │   │   ├── supabase_service.dart         # All Supabase operations
│   │   │   ├── cache_service.dart            # SQLite + Hive caching
│   │   │   ├── auth_service.dart             # Google Auth + sessions
│   │   │   └── sync_service.dart             # Background sync
│   │   └── repositories/
│   │       ├── tournament_repository.dart     # Tournament CRUD
│   │       ├── user_repository.dart          # User operations
│   │       └── cache_repository.dart         # Cache management
│   ├── presentation/
│   │   ├── blocs/
│   │   │   ├── auth_bloc.dart                # Auth state management
│   │   │   ├── tournament_bloc.dart          # Tournament state
│   │   │   └── app_bloc.dart                 # Global app state
│   │   ├── pages/
│   │   │   ├── login_page.dart               # Google login
│   │   │   ├── dashboard_page.dart           # Main dashboard
│   │   │   ├── tournaments_page.dart         # Tournament list + filters
│   │   │   ├── tournament_detail_page.dart   # Tournament details
│   │   │   ├── match_detail_page.dart        # Match results
│   │   │   └── profile_page.dart             # User settings
│   │   └── widgets/
│   │       ├── referee_card.dart             # Core tournament card
│   │       ├── high_contrast_button.dart     # Sunlight-optimized button
│   │       ├── filter_bar.dart               # Tournament filters
│   │       ├── loading_widget.dart           # Loading states
│   │       └── error_widget.dart             # Error handling
│   └── shared/
│       ├── extensions.dart                    # Dart extensions
│       └── validators.dart                    # Form validation
├── test/
│   ├── unit/                                  # Service & repository tests
│   ├── widget/                                # Widget tests
│   └── fixtures/                              # Test data
├── integration_test/
│   └── app_test.dart                          # E2E critical flows
└── pubspec.yaml
```

**Architecture Rationale:** Simplified but strong structure with clear separation between data, presentation, and business logic. Services handle all external dependencies, BLoCs manage state, and widgets focus on UI rendering. This provides 80% of clean architecture benefits with 40% of the complexity.

## Component Standards

### Component Template

```dart
// lib/presentation/widgets/referee_card.dart
import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import '../../data/models/tournament.dart';
import '../../core/constants.dart';

class RefereeCard extends StatelessWidget {
  final Tournament tournament;
  final VoidCallback? onTap;
  final bool isBookmarked;
  final VoidCallback? onBookmark;

  const RefereeCard({
    super.key,
    required this.tournament,
    this.onTap,
    this.isBookmarked = false,
    this.onBookmark,
  });

  @override
  Widget build(BuildContext context) {
    return Card(
      elevation: AppConstants.cardElevation,
      margin: const EdgeInsets.symmetric(
        horizontal: AppConstants.paddingMedium,
        vertical: AppConstants.paddingSmall,
      ),
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(AppConstants.borderRadius),
        child: Padding(
          padding: const EdgeInsets.all(AppConstants.paddingMedium),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              _buildHeader(),
              const SizedBox(height: AppConstants.spacingSmall),
              _buildDetails(),
              const SizedBox(height: AppConstants.spacingSmall),
              _buildActions(),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildHeader() {
    return Row(
      children: [
        Expanded(
          child: Text(
            tournament.name,
            style: const TextStyle(
              fontSize: 18,
              fontWeight: FontWeight.bold,
              color: AppConstants.primaryColor,
            ),
            maxLines: 2,
            overflow: TextOverflow.ellipsis,
          ),
        ),
        if (onBookmark != null)
          IconButton(
            onPressed: onBookmark,
            icon: Icon(
              isBookmarked ? Icons.bookmark : Icons.bookmark_border,
              color: isBookmarked 
                ? AppConstants.accentColor 
                : AppConstants.textSecondary,
            ),
          ),
      ],
    );
  }

  Widget _buildDetails() {
    return Column(
      children: [
        _buildDetailRow(Icons.location_on, tournament.location),
        _buildDetailRow(Icons.calendar_today, tournament.formattedDates),
        _buildDetailRow(Icons.emoji_events, tournament.competitionLevel),
      ],
    );
  }

  Widget _buildDetailRow(IconData icon, String text) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 2),
      child: Row(
        children: [
          Icon(icon, size: 16, color: AppConstants.textSecondary),
          const SizedBox(width: 8),
          Expanded(
            child: Text(
              text,
              style: const TextStyle(
                color: AppConstants.textSecondary,
                fontSize: 14,
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildActions() {
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: [
        Chip(
          label: Text(tournament.status),
          backgroundColor: _getStatusColor(),
          labelStyle: const TextStyle(
            color: Colors.white,
            fontWeight: FontWeight.w600,
          ),
        ),
        Text(
          '${tournament.matchCount} matches',
          style: const TextStyle(
            color: AppConstants.textSecondary,
            fontSize: 12,
          ),
        ),
      ],
    );
  }

  Color _getStatusColor() {
    switch (tournament.status.toLowerCase()) {
      case 'live':
        return AppConstants.successColor;
      case 'upcoming':
        return AppConstants.warningColor;
      case 'completed':
        return AppConstants.textSecondary;
      default:
        return AppConstants.primaryColor;
    }
  }
}
```

### Naming Conventions

**File Naming:**
- **Pages:** `dashboard_page.dart`, `tournaments_page.dart`
- **Widgets:** `referee_card.dart`, `filter_bar.dart`
- **Services:** `auth_service.dart`, `supabase_service.dart`
- **Models:** `tournament.dart`, `match.dart`, `user.dart`
- **BLoCs:** `auth_bloc.dart`, `tournament_bloc.dart`

**Class Naming:**
- **Widgets:** `RefereeCard`, `HighContrastButton`, `FilterBar`
- **Pages:** `DashboardPage`, `TournamentsPage`, `LoginPage`
- **Services:** `AuthService`, `SupabaseService`, `CacheService`
- **Models:** `Tournament`, `Match`, `User`
- **BLoCs:** `AuthBloc`, `TournamentBloc`, `AppBloc`

**Variable Naming:**
- **Booleans:** `isBookmarked`, `isLoading`, `hasError`
- **Collections:** `tournaments`, `matches`, `bookmarks`
- **Functions:** `onTap`, `onBookmark`, `onRefresh`
- **Constants:** `AppConstants.primaryColor`, `AppConstants.paddingLarge`

## State Management

### Store Structure

```
lib/presentation/blocs/
├── auth_bloc.dart                 # Authentication state
├── tournament_bloc.dart           # Tournament data and filtering
└── app_bloc.dart                  # Global app state (connectivity, sync)
```

### State Management Template

```dart
// lib/presentation/blocs/tournament_bloc.dart
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:equatable/equatable.dart';
import '../../data/models/tournament.dart';
import '../../data/repositories/tournament_repository.dart';

// Events
abstract class TournamentEvent extends Equatable {
  const TournamentEvent();
  @override
  List<Object?> get props => [];
}

class LoadTournaments extends TournamentEvent {
  final Map<String, dynamic>? filters;
  const LoadTournaments({this.filters});
  @override
  List<Object?> get props => [filters];
}

class RefreshTournaments extends TournamentEvent {}

class BookmarkTournament extends TournamentEvent {
  final String tournamentId;
  const BookmarkTournament(this.tournamentId);
  @override
  List<Object> get props => [tournamentId];
}

// States
abstract class TournamentState extends Equatable {
  const TournamentState();
  @override
  List<Object?> get props => [];
}

class TournamentInitial extends TournamentState {}
class TournamentLoading extends TournamentState {}

class TournamentLoaded extends TournamentState {
  final List<Tournament> tournaments;
  final List<String> bookmarkedIds;
  final Map<String, dynamic>? activeFilters;

  const TournamentLoaded({
    required this.tournaments,
    required this.bookmarkedIds,
    this.activeFilters,
  });

  @override
  List<Object?> get props => [tournaments, bookmarkedIds, activeFilters];

  TournamentLoaded copyWith({
    List<Tournament>? tournaments,
    List<String>? bookmarkedIds,
    Map<String, dynamic>? activeFilters,
  }) {
    return TournamentLoaded(
      tournaments: tournaments ?? this.tournaments,
      bookmarkedIds: bookmarkedIds ?? this.bookmarkedIds,
      activeFilters: activeFilters ?? this.activeFilters,
    );
  }
}

class TournamentError extends TournamentState {
  final String message;
  final bool canRetry;

  const TournamentError({
    required this.message,
    this.canRetry = true,
  });

  @override
  List<Object> get props => [message, canRetry];
}

// BLoC Implementation
class TournamentBloc extends Bloc<TournamentEvent, TournamentState> {
  final TournamentRepository _repository;

  TournamentBloc({required TournamentRepository repository})
      : _repository = repository,
        super(TournamentInitial()) {
    on<LoadTournaments>(_onLoadTournaments);
    on<RefreshTournaments>(_onRefreshTournaments);
    on<BookmarkTournament>(_onBookmarkTournament);
  }

  Future<void> _onLoadTournaments(
    LoadTournaments event,
    Emitter<TournamentState> emit,
  ) async {
    emit(TournamentLoading());
    try {
      final tournaments = await _repository.getTournaments(filters: event.filters);
      final bookmarks = await _repository.getBookmarkedTournamentIds();
      
      emit(TournamentLoaded(
        tournaments: tournaments,
        bookmarkedIds: bookmarks,
        activeFilters: event.filters,
      ));
    } catch (e) {
      emit(TournamentError(
        message: 'Failed to load tournaments: ${e.toString()}',
        canRetry: true,
      ));
    }
  }

  Future<void> _onRefreshTournaments(
    RefreshTournaments event,
    Emitter<TournamentState> emit,
  ) async {
    final currentState = state;
    if (currentState is TournamentLoaded) {
      try {
        final tournaments = await _repository.refreshTournaments(
          filters: currentState.activeFilters,
        );
        final bookmarks = await _repository.getBookmarkedTournamentIds();
        
        emit(currentState.copyWith(
          tournaments: tournaments,
          bookmarkedIds: bookmarks,
        ));
      } catch (e) {
        emit(TournamentError(
          message: 'Refresh failed: ${e.toString()}',
          canRetry: true,
        ));
      }
    }
  }

  Future<void> _onBookmarkTournament(
    BookmarkTournament event,
    Emitter<TournamentState> emit,
  ) async {
    final currentState = state;
    if (currentState is TournamentLoaded) {
      try {
        await _repository.toggleBookmark(event.tournamentId);
        final updatedBookmarks = await _repository.getBookmarkedTournamentIds();
        
        emit(currentState.copyWith(bookmarkedIds: updatedBookmarks));
      } catch (e) {
        // Silently fail bookmark operations - not critical
      }
    }
  }
}
```

## API Integration

### Service Template

```dart
// lib/data/services/supabase_service.dart
import 'package:supabase_flutter/supabase_flutter.dart';
import '../../core/constants.dart';
import '../../core/exceptions.dart';
import '../models/tournament.dart';

class SupabaseService {
  static final SupabaseClient _client = Supabase.instance.client;
  
  // Tournament operations
  static Future<List<Tournament>> getTournaments({
    Map<String, dynamic>? filters,
  }) async {
    try {
      var query = _client.from('tournaments').select();
      
      // Apply filters
      if (filters != null) {
        if (filters['location'] != null) {
          query = query.eq('location', filters['location']);
        }
        if (filters['startDate'] != null) {
          query = query.gte('start_date', filters['startDate']);
        }
        if (filters['competitionLevel'] != null) {
          query = query.eq('competition_level', filters['competitionLevel']);
        }
      }
      
      final response = await query.order('start_date');
      return (response as List)
          .map((json) => Tournament.fromJson(json))
          .toList();
    } on PostgrestException catch (e) {
      throw ApiException('Database error: ${e.message}');
    } catch (e) {
      throw ApiException('Failed to load tournaments: $e');
    }
  }
  
  // Real-time tournament updates
  static Stream<List<Tournament>> watchTournaments() {
    try {
      return _client
          .from('tournaments')
          .stream(primaryKey: ['id'])
          .map((data) => 
              (data as List).map((json) => Tournament.fromJson(json)).toList()
          );
    } catch (e) {
      throw ApiException('Failed to setup real-time updates: $e');
    }
  }
  
  // User bookmarks
  static Future<void> toggleBookmark(String tournamentId) async {
    final userId = _client.auth.currentUser?.id;
    if (userId == null) throw AuthException('User not authenticated');
    
    try {
      final existing = await _client
          .from('user_bookmarks')
          .select('id')
          .eq('user_id', userId)
          .eq('tournament_id', tournamentId)
          .maybeSingle();
      
      if (existing != null) {
        await _client
            .from('user_bookmarks')
            .delete()
            .eq('id', existing['id']);
      } else {
        await _client.from('user_bookmarks').insert({
          'user_id': userId,
          'tournament_id': tournamentId,
          'sync_priority': 4,
        });
      }
    } on PostgrestException catch (e) {
      throw ApiException('Bookmark operation failed: ${e.message}');
    }
  }
}
```

### API Client Configuration

```dart
// lib/core/constants.dart
class ApiConstants {
  static const String supabaseUrl = String.fromEnvironment('SUPABASE_URL');
  static const String supabaseAnonKey = String.fromEnvironment('SUPABASE_ANON_KEY');
  static const Duration defaultTimeout = Duration(seconds: 10);
  static const int maxRetryAttempts = 3;
}

// lib/main.dart - Supabase initialization
Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();
  
  await Supabase.initialize(
    url: ApiConstants.supabaseUrl,
    anonKey: ApiConstants.supabaseAnonKey,
    authOptions: const FlutterAuthClientOptions(
      authFlowType: AuthFlowType.pkce,
    ),
  );
  
  runApp(const BeachRefApp());
}
```

## Routing

### Route Configuration

```dart
// lib/app/router.dart
import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import '../presentation/pages/login_page.dart';
import '../presentation/pages/dashboard_page.dart';
import '../presentation/pages/tournaments_page.dart';
import '../presentation/pages/tournament_detail_page.dart';
import '../presentation/pages/match_detail_page.dart';
import '../presentation/pages/profile_page.dart';
import '../presentation/blocs/auth_bloc.dart';

class AppRouter {
  static final GoRouter router = GoRouter(
    initialLocation: '/dashboard',
    redirect: _authGuard,
    routes: [
      GoRoute(
        path: '/login',
        name: 'login',
        builder: (context, state) => const LoginPage(),
      ),
      
      GoRoute(
        path: '/dashboard',
        name: 'dashboard',
        builder: (context, state) => const DashboardPage(),
      ),
      
      GoRoute(
        path: '/tournaments',
        name: 'tournaments',
        builder: (context, state) => const TournamentsPage(),
        routes: [
          GoRoute(
            path: '/:tournamentId',
            name: 'tournament-detail',
            builder: (context, state) => TournamentDetailPage(
              tournamentId: state.pathParameters['tournamentId']!,
            ),
            routes: [
              GoRoute(
                path: '/match/:matchId',
                name: 'match-detail',
                builder: (context, state) => MatchDetailPage(
                  tournamentId: state.pathParameters['tournamentId']!,
                  matchId: state.pathParameters['matchId']!,
                ),
              ),
            ],
          ),
        ],
      ),
      
      GoRoute(
        path: '/profile',
        name: 'profile',
        builder: (context, state) => const ProfilePage(),
      ),
      
      GoRoute(
        path: '/',
        redirect: (context, state) => '/dashboard',
      ),
    ],
    
    errorBuilder: (context, state) => Scaffold(
      appBar: AppBar(title: const Text('Page Not Found')),
      body: Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            const Icon(Icons.error_outline, size: 64, color: Colors.grey),
            const SizedBox(height: 16),
            Text('Page not found: ${state.location}'),
            const SizedBox(height: 16),
            ElevatedButton(
              onPressed: () => context.go('/dashboard'),
              child: const Text('Go to Dashboard'),
            ),
          ],
        ),
      ),
    ),
  );
  
  static String? _authGuard(BuildContext context, GoRouterState state) {
    final authState = context.read<AuthBloc>().state;
    final isLoggedIn = authState is AuthAuthenticated;
    final isLoggingIn = state.location == '/login';
    
    if (!isLoggedIn && !isLoggingIn) return '/login';
    if (isLoggedIn && isLoggingIn) return '/dashboard';
    return null;
  }
}

// Navigation extensions
extension AppRouterExtension on BuildContext {
  void goToTournaments() => go('/tournaments');
  void goToTournament(String tournamentId) => go('/tournaments/$tournamentId');
  void goToMatch(String tournamentId, String matchId) => 
      go('/tournaments/$tournamentId/match/$matchId');
  void goToProfile() => go('/profile');
  void goToDashboard() => go('/dashboard');
  void goToLogin() => go('/login');
}
```

## Styling Guidelines

### Styling Approach
**Material 3 + Custom Referee Theme** - Leveraging Flutter's built-in theming with referee-specific customizations for sunlight readability.

### Global Theme Variables

```dart
// lib/app/theme.dart
import 'package:flutter/material.dart';

class RefereeTheme {
  // FIVB + Sunlight-Optimized Colors
  static const Color primaryColor = Color(0xFF003366);    // FIVB Navy
  static const Color accentColor = Color(0xFFFFD700);     // FIVB Gold
  static const Color successColor = Color(0xFF00AA00);    // High contrast green
  static const Color warningColor = Color(0xFFFF8800);    // High contrast orange
  static const Color errorColor = Color(0xFFCC0000);      // High contrast red
  static const Color backgroundColor = Color(0xFFFFFFFF); // Pure white for sunlight
  static const Color surfaceColor = Color(0xFFF8F9FA);    // Light surface
  static const Color textPrimary = Color(0xFF1A1A1A);     // High contrast text
  static const Color textSecondary = Color(0xFF666666);   // Secondary text

  static ThemeData get lightTheme {
    return ThemeData(
      useMaterial3: true,
      colorScheme: ColorScheme.fromSeed(
        seedColor: primaryColor,
        brightness: Brightness.light,
        primary: primaryColor,
        secondary: accentColor,
        surface: surfaceColor,
        background: backgroundColor,
        error: errorColor,
      ),
      
      textTheme: const TextTheme(
        headlineLarge: TextStyle(fontSize: 32, fontWeight: FontWeight.w700, color: textPrimary),
        headlineMedium: TextStyle(fontSize: 24, fontWeight: FontWeight.w700, color: textPrimary),
        headlineSmall: TextStyle(fontSize: 20, fontWeight: FontWeight.w600, color: textPrimary),
        bodyLarge: TextStyle(fontSize: 18, fontWeight: FontWeight.w500, color: textPrimary),
        bodyMedium: TextStyle(fontSize: 16, fontWeight: FontWeight.w400, color: textPrimary),
        bodySmall: TextStyle(fontSize: 14, fontWeight: FontWeight.w600, color: textSecondary),
      ),
      
      elevatedButtonTheme: ElevatedButtonThemeData(
        style: ElevatedButton.styleFrom(
          backgroundColor: primaryColor,
          foregroundColor: Colors.white,
          minimumSize: const Size(48, 48), // Touch-friendly
          textStyle: const TextStyle(fontSize: 16, fontWeight: FontWeight.w600),
        ),
      ),
      
      cardTheme: CardTheme(
        color: surfaceColor,
        elevation: 2,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(8),
          side: BorderSide(color: primaryColor.withOpacity(0.2), width: 1),
        ),
      ),
      
      appBarTheme: const AppBarTheme(
        backgroundColor: primaryColor,
        foregroundColor: Colors.white,
        elevation: 0,
        titleTextStyle: TextStyle(
          fontSize: 20,
          fontWeight: FontWeight.w600,
          color: Colors.white,
        ),
      ),
    );
  }
}
```

## Testing Requirements

### Component Test Template

```dart
// test/widget/referee_card_test.dart
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:beachref/presentation/widgets/referee_card.dart';
import 'package:beachref/data/models/tournament.dart';
import '../fixtures/tournament_fixtures.dart';

void main() {
  group('RefereeCard Widget Tests', () {
    late Tournament mockTournament;
    
    setUp(() {
      mockTournament = TournamentFixtures.sampleTournament;
    });
    
    testWidgets('displays tournament information correctly', (tester) async {
      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            body: RefereeCard(tournament: mockTournament),
          ),
        ),
      );
      
      expect(find.text(mockTournament.name), findsOneWidget);
      expect(find.text(mockTournament.location), findsOneWidget);
      expect(find.text(mockTournament.competitionLevel), findsOneWidget);
    });
    
    testWidgets('handles bookmark tap', (tester) async {
      bool bookmarkTapped = false;
      
      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            body: RefereeCard(
              tournament: mockTournament,
              onBookmark: () => bookmarkTapped = true,
            ),
          ),
        ),
      );
      
      await tester.tap(find.byIcon(Icons.bookmark_border));
      expect(bookmarkTapped, isTrue);
    });
  });
}
```

### Testing Best Practices

1. **Unit Tests**: Test individual components in isolation with mocked dependencies
2. **Integration Tests**: Test BLoC + Repository interactions with real data flow  
3. **E2E Tests**: Test critical user flows (login → tournament search → bookmark)
4. **Coverage Goals**: Aim for 85% code coverage on business logic
5. **Test Structure**: Arrange-Act-Assert pattern with descriptive test names
6. **Mock External Dependencies**: Mock Supabase, Google Auth, and network calls

## Environment Configuration

```dart
// .env (never committed)
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
GOOGLE_SERVER_CLIENT_ID=your-google-client-id.apps.googleusercontent.com

// lib/core/constants.dart
class ApiConstants {
  static const String supabaseUrl = String.fromEnvironment(
    'SUPABASE_URL',
    defaultValue: 'https://localhost:54321',
  );
  
  static const String supabaseAnonKey = String.fromEnvironment(
    'SUPABASE_ANON_KEY',
    defaultValue: 'local-dev-key',
  );
  
  static const String googleServerClientId = String.fromEnvironment(
    'GOOGLE_SERVER_CLIENT_ID',
    defaultValue: '',
  );
}
```

**Deployment Environment Variables:**
- **Development**: Local Supabase + Google OAuth test credentials
- **Staging**: Supabase staging project + Google OAuth staging  
- **Production**: Supabase production + Google OAuth production credentials

## Frontend Developer Standards

### Critical Coding Rules

1. **Never use print() in production** - Use structured logging with levels
2. **All API calls must go through services** - No direct Supabase calls from widgets
3. **All user inputs must be validated** - Use validators before processing
4. **Handle offline states gracefully** - Show cached data with stale indicators
5. **Never hardcode strings** - Use constants or localization keys
6. **Always use const constructors** - Performance optimization for widgets
7. **BLoC events must be immutable** - Use Equatable for proper comparison
8. **Error states must be user-friendly** - Technical errors translated to user language
9. **Loading states are mandatory** - Every async operation needs loading UI
10. **Responsive design required** - Test on mobile, tablet, and desktop sizes

### Quick Reference

```bash
# Development Commands
flutter run -d chrome --web-port 3000
flutter test
flutter analyze
flutter build web

# Key Import Patterns
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import 'package:go_router/go_router.dart';

# File Naming Conventions
- Pages: dashboard_page.dart
- Widgets: referee_card.dart  
- Services: auth_service.dart
- Models: tournament.dart
- BLoCs: tournament_bloc.dart

# Common Widget Patterns
BlocBuilder<TournamentBloc, TournamentState>(
  builder: (context, state) {
    if (state is TournamentLoading) return LoadingWidget();
    if (state is TournamentError) return ErrorWidget(state.message);
    if (state is TournamentLoaded) return TournamentList(state.tournaments);
    return Container();
  },
)

# Navigation Patterns
context.go('/tournaments/$tournamentId');
context.read<AuthBloc>().add(SignOutRequested());
```

## Session & UID Management Strategy

### Authentication Flow
- **Primary UID**: Use Supabase `auth.user.id` (stable UUID) as primary key
- **Google Integration**: Store Google `sub` claim for verification, never use email as primary
- **Token Management**: Automatic JWT refresh via Supabase with secure local storage
- **Session Persistence**: Hive storage for user preferences, Flutter Secure Storage for tokens

### Critical Implementation Points
- **PKCE Flow**: Secure authentication for both web and future mobile
- **Real-time Auth State**: Stream-based auth state changes trigger BLoC updates
- **Graceful Token Refresh**: Handle token expiration without user interruption
- **Error Recovery**: Comprehensive error handling for auth failures with user-friendly messages

---

## **✅ FRONTEND ARCHITECTURE COMPLETE**

This document provides the complete Flutter-specific architecture for BeachRef, designed to be **strong but not over-engineered**. It includes:

- ✅ **Simplified Project Structure** - Clear organization without excessive nesting
- ✅ **Component Standards** - Reusable, sunlight-optimized widgets  
- ✅ **BLoC State Management** - Event-driven state with proper error handling
- ✅ **Supabase Integration** - Real-time data with Google Auth
- ✅ **GoRouter Navigation** - Type-safe routing with auth guards
- ✅ **Referee-Optimized Theme** - High contrast design for beach use
- ✅ **Testing Strategy** - Unit, widget, and integration testing patterns
- ✅ **Developer Standards** - Clear coding rules and quick reference

**Ready for implementation!** This architecture supports your UI-first development approach while providing a solid foundation for the full BeachRef application.