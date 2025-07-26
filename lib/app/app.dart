import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'router.dart';
import 'theme.dart';
import '../presentation/blocs/authentication_bloc.dart';
import '../services/interfaces/i_authentication_service.dart';
import '../services/session_manager.dart';
import '../core/service_locator.dart';

class BeachRefApp extends StatelessWidget {
  const BeachRefApp({super.key});

  @override
  Widget build(BuildContext context) {
    return BlocProvider<AuthenticationBloc>(
      create: (context) => AuthenticationBloc(
        authService: ServiceLocator.get<IAuthenticationService>(),
        sessionManager: ServiceLocator.get<SessionManager>(),
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
    );
  }
}