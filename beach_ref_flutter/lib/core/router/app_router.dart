import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import '../../features/tournament/screens/tournament_selection_screen.dart';
import '../../features/tournament/screens/tournament_detail_screen.dart';
import '../../features/match/screens/match_detail_screen.dart';
import '../../features/notifications/screens/notification_settings_screen.dart';

final appRouter = GoRouter(
  initialLocation: '/tournaments',
  routes: [
    GoRoute(
      path: '/tournaments',
      name: 'tournaments',
      builder: (context, state) => const TournamentSelectionScreen(),
    ),
    GoRoute(
      path: '/tournament/:visNo',
      name: 'tournament-detail',
      builder: (context, state) {
        final visNo = state.pathParameters['visNo']!;
        return TournamentDetailScreen(visNo: visNo);
      },
    ),
    GoRoute(
      path: '/match/:matchNo',
      name: 'match-detail',
      builder: (context, state) {
        final matchNo = state.pathParameters['matchNo']!;
        return MatchDetailScreen(matchNo: matchNo);
      },
    ),
    GoRoute(
      path: '/notifications',
      name: 'notifications',
      builder: (context, state) => const NotificationSettingsScreen(),
    ),
  ],
  errorBuilder: (context, state) => Scaffold(
    appBar: AppBar(title: const Text('Not Found')),
    body: Center(
      child: Text('Page not found: ${state.uri}'),
    ),
  ),
);
