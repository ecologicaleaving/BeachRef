import 'package:flutter/material.dart';
import 'router.dart';
import 'theme.dart';

class BeachRefApp extends StatelessWidget {
  const BeachRefApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp.router(
      title: 'BeachRef',
      theme: BeachRefTheme.lightTheme,
      routerConfig: AppRouter.router,
      debugShowCheckedModeBanner: false,
    );
  }
}