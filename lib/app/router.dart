import 'dart:async';
import 'package:go_router/go_router.dart';
import 'package:flutter/material.dart';
import '../presentation/pages/home_page.dart';
import '../presentation/pages/login_page.dart';
import '../presentation/pages/tournament_list_page.dart';
import '../presentation/blocs/authentication_bloc.dart';

class AppRouter {
  static GoRouter createRouter(AuthenticationBloc authBloc) {
    return GoRouter(
      initialLocation: '/login',
      redirect: (context, state) {
        final authState = authBloc.state;
        final isLoggedIn = authState is AuthenticationAuthenticated;
        final isLoggingIn = state.matchedLocation == '/login';

        // If not logged in and not on login page, redirect to login
        if (!isLoggedIn && !isLoggingIn) {
          return '/login';
        }

        // If logged in and on login page, redirect to home
        if (isLoggedIn && isLoggingIn) {
          return '/';
        }

        // No redirect needed
        return null;
      },
      routes: [
        GoRoute(
          path: '/login',
          name: 'login',
          builder: (context, state) => const LoginPage(),
        ),
        GoRoute(
          path: '/',
          name: 'home',
          builder: (context, state) => const HomePage(),
        ),
        GoRoute(
          path: '/tournaments',
          name: 'tournaments',
          builder: (context, state) => const TournamentListPage(),
        ),
      ],
      refreshListenable: GoRouterRefreshStream(authBloc.stream),
    );
  }
}

/// Helper class to make GoRouter listen to BLoC state changes
class GoRouterRefreshStream extends ChangeNotifier {
  GoRouterRefreshStream(Stream<dynamic> stream) {
    _subscription = stream.listen((_) {
      notifyListeners();
    });
  }

  late final StreamSubscription<dynamic> _subscription;

  @override
  void dispose() {
    _subscription.cancel();
    super.dispose();
  }
}