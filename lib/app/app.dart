import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'router.dart';
import 'theme.dart';
import '../presentation/blocs/authentication_bloc.dart';
import '../services/authentication_service.dart';
import '../services/session_manager.dart';

class BeachRefApp extends StatelessWidget {
  const BeachRefApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MultiRepositoryProvider(
      providers: [
        RepositoryProvider<AuthenticationService>(
          create: (context) => AuthenticationService(),
        ),
        RepositoryProvider<SessionManager>(
          create: (context) => SessionManager(),
        ),
      ],
      child: BlocProvider<AuthenticationBloc>(
        create: (context) => AuthenticationBloc(
          authService: context.read<AuthenticationService>(),
          sessionManager: context.read<SessionManager>(),
        )..add(AppStarted()),
        child: Builder(
          builder: (context) {
            final authBloc = context.read<AuthenticationBloc>();
            return MaterialApp.router(
              title: 'BeachRef',
              theme: BeachRefTheme.lightTheme,
              routerConfig: AppRouter.createRouter(authBloc),
              debugShowCheckedModeBanner: false,
            );
          },
        ),
      ),
    );
  }
}