import 'dart:async';
import 'package:flutter/material.dart';
import '../../core/network/network_monitor.dart';
import '../../core/theme/app_theme.dart';

/// Offline banner matching webapp: warning orange bg, rounded, with icon
class OfflineBanner extends StatefulWidget {
  const OfflineBanner({super.key});

  @override
  State<OfflineBanner> createState() => _OfflineBannerState();
}

class _OfflineBannerState extends State<OfflineBanner> {
  late final StreamSubscription<bool> _sub;
  bool _isOffline = false;

  @override
  void initState() {
    super.initState();
    _isOffline = !NetworkMonitor.instance.isConnected;
    _sub = NetworkMonitor.instance.onConnectivityChanged.listen((connected) {
      setState(() => _isOffline = !connected);
    });
  }

  @override
  void dispose() {
    _sub.cancel();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return AnimatedSlide(
      offset: _isOffline ? Offset.zero : const Offset(0, -1),
      duration: const Duration(milliseconds: 300),
      curve: Curves.easeInOut,
      child: AnimatedOpacity(
        opacity: _isOffline ? 1 : 0,
        duration: const Duration(milliseconds: 300),
        child: Container(
          margin: const EdgeInsets.symmetric(
            horizontal: AppSpacing.md,
            vertical: AppSpacing.sm,
          ),
          padding: const EdgeInsets.symmetric(
            horizontal: AppSpacing.md,
            vertical: AppSpacing.sm,
          ),
          decoration: BoxDecoration(
            color: AppColors.warning,
            borderRadius: BorderRadius.circular(AppSpacing.borderRadius),
          ),
          child: const Row(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Text(
                '\u26A0\uFE0F',
                style: TextStyle(fontSize: 14),
              ),
              SizedBox(width: 8),
              Flexible(
                child: Text(
                  'Offline Mode - Cached Data',
                  style: TextStyle(
                    color: AppColors.background,
                    fontSize: 14,
                    fontWeight: FontWeight.w600,
                  ),
                  textAlign: TextAlign.center,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
