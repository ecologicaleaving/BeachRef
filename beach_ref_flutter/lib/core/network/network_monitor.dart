import 'dart:async';
import 'package:connectivity_plus/connectivity_plus.dart';
import 'package:flutter/foundation.dart';

enum NetworkType { wifi, cellular, none }

/// Singleton network connectivity monitor
class NetworkMonitor {
  NetworkMonitor._();
  static final instance = NetworkMonitor._();

  final _connectivity = Connectivity();
  final _controller = StreamController<bool>.broadcast();

  bool _isConnected = true;
  NetworkType _networkType = NetworkType.wifi;
  StreamSubscription? _subscription;

  bool get isConnected => _isConnected;
  NetworkType get networkType => _networkType;
  Stream<bool> get onConnectivityChanged => _controller.stream;

  Future<void> init() async {
    final results = await _connectivity.checkConnectivity();
    _update(results);

    _subscription = _connectivity.onConnectivityChanged.listen(_update);
  }

  void _update(List<ConnectivityResult> results) {
    final result = results.isNotEmpty ? results.first : ConnectivityResult.none;

    final wasConnected = _isConnected;
    switch (result) {
      case ConnectivityResult.wifi:
        _isConnected = true;
        _networkType = NetworkType.wifi;
        break;
      case ConnectivityResult.mobile:
        _isConnected = true;
        _networkType = NetworkType.cellular;
        break;
      case ConnectivityResult.none:
        _isConnected = false;
        _networkType = NetworkType.none;
        break;
      default:
        _isConnected = true;
        _networkType = NetworkType.wifi;
    }

    if (wasConnected != _isConnected) {
      _controller.add(_isConnected);
      if (kDebugMode) {
        debugPrint('[NetworkMonitor] Connected: $_isConnected ($_networkType)');
      }
    }
  }

  void dispose() {
    _subscription?.cancel();
    _controller.close();
  }
}
