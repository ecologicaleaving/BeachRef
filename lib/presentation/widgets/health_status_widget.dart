import 'package:flutter/material.dart';
import '../../services/vis_integration_service.dart';
import '../../core/errors/vis_error.dart';

class HealthStatusWidget extends StatefulWidget {
  const HealthStatusWidget({super.key});

  @override
  State<HealthStatusWidget> createState() => _HealthStatusWidgetState();
}

class _HealthStatusWidgetState extends State<HealthStatusWidget>
    with TickerProviderStateMixin {
  final VisIntegrationService _visService = VisIntegrationService();
  
  HealthStatus? _healthStatus;
  bool _isLoading = false;
  bool _isExpanded = false;
  String? _errorDetails;
  
  late AnimationController _pulseController;
  late Animation<double> _pulseAnimation;
  
  @override
  void initState() {
    super.initState();
    _setupAnimations();
    _performHealthCheck();
  }
  
  void _setupAnimations() {
    _pulseController = AnimationController(
      duration: const Duration(milliseconds: 1200),
      vsync: this,
    );
    
    _pulseAnimation = Tween<double>(
      begin: 0.7,
      end: 1.0,
    ).animate(CurvedAnimation(
      parent: _pulseController,
      curve: Curves.easeInOut,
    ));
    
    _pulseController.repeat(reverse: true);
  }
  
  @override
  void dispose() {
    _pulseController.dispose();
    super.dispose();
  }
  
  Future<void> _performHealthCheck() async {
    if (_isLoading) return;
    
    setState(() {
      _isLoading = true;
      _errorDetails = null;
    });
    
    final result = await _visService.healthCheck();
    
    if (mounted) {
      result.fold(
        (healthStatus) {
          setState(() {
            _healthStatus = healthStatus;
            _isLoading = false;
          });
        },
        (error) {
          setState(() {
            _healthStatus = HealthStatus(
              isConnected: false,
              responseTimeMs: 0,
              lastCheckTime: DateTime.now(),
              status: ConnectionStatus.disconnected,
              errorMessage: error.message,
            );
            _errorDetails = error.details;
            _isLoading = false;
          });
        },
      );
    }
  }
  
  @override
  Widget build(BuildContext context) {
    return ConstrainedBox(
      constraints: const BoxConstraints(
        minWidth: 200,
        maxWidth: 400,
        maxHeight: 120,
      ),
      child: Card(
        elevation: 2,
        child: Padding(
          padding: const EdgeInsets.all(8.0),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              _buildHeader(),
              const SizedBox(height: 4),
              _buildStatusIndicator(),
              const SizedBox(height: 4),
              _buildMetrics(),
              if (_isExpanded && _errorDetails != null) ...[
                const SizedBox(height: 4),
                _buildErrorDetails(),
              ],
            ],
          ),
        ),
      ),
    );
  }
  
  Widget _buildHeader() {
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: [
        Text(
          'VIS Connection Status',
          style: Theme.of(context).textTheme.titleMedium?.copyWith(
            fontSize: 14,
            fontWeight: FontWeight.w600,
          ),
        ),
        IconButton(
          icon: const Icon(Icons.refresh, size: 16),
          onPressed: _isLoading ? null : _performHealthCheck,
          tooltip: 'Refresh connection status',
          visualDensity: VisualDensity.compact,
        ),
      ],
    );
  }
  
  Widget _buildStatusIndicator() {
    final status = _healthStatus?.status ?? ConnectionStatus.unknown;
    final isConnecting = status == ConnectionStatus.connecting || _isLoading;
    
    return GestureDetector(
      onTap: _errorDetails != null ? _toggleErrorDetails : null,
      child: Row(
        children: [
          if (isConnecting)
            AnimatedBuilder(
              animation: _pulseAnimation,
              builder: (context, child) {
                return Transform.scale(
                  scale: _pulseAnimation.value,
                  child: _buildStatusIcon(status),
                );
              },
            )
          else
            _buildStatusIcon(status),
          const SizedBox(width: 8),
          Text(
            _getStatusText(status),
            style: Theme.of(context).textTheme.bodyMedium?.copyWith(
              fontSize: 12,
              fontWeight: FontWeight.w500,
            ),
          ),
          if (_errorDetails != null) ...[
            const SizedBox(width: 4),
            Icon(
              _isExpanded ? Icons.expand_less : Icons.expand_more,
              size: 16,
              color: Colors.grey[600],
            ),
          ],
        ],
      ),
    );
  }
  
  Widget _buildStatusIcon(ConnectionStatus status) {
    Color color;
    switch (status) {
      case ConnectionStatus.connected:
        color = Colors.green[600]!;
        break;
      case ConnectionStatus.connecting:
        color = Colors.orange[600]!;
        break;
      case ConnectionStatus.disconnected:
        color = Colors.red[600]!;
        break;
      case ConnectionStatus.unknown:
        color = Colors.grey[600]!;
        break;
    }
    
    return Container(
      width: 12,
      height: 12,
      decoration: BoxDecoration(
        shape: BoxShape.circle,
        color: color,
      ),
    );
  }
  
  String _getStatusText(ConnectionStatus status) {
    if (_isLoading && status != ConnectionStatus.connecting) {
      return 'Checking...';
    }
    
    switch (status) {
      case ConnectionStatus.connected:
        return 'Connected';
      case ConnectionStatus.connecting:
        return 'Connecting...';
      case ConnectionStatus.disconnected:
        return 'Disconnected';
      case ConnectionStatus.unknown:
        return 'Unknown';
    }
  }
  
  Widget _buildMetrics() {
    if (_healthStatus == null) {
      return const SizedBox(height: 16);
    }
    
    return LayoutBuilder(
      builder: (context, constraints) {
        final isCompact = constraints.maxWidth < 300;
        
        if (isCompact) {
          return _buildCompactMetrics();
        } else {
          return _buildExpandedMetrics();
        }
      },
    );
  }
  
  Widget _buildCompactMetrics() {
    return Column(
      children: [
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Text(
              'Response: ${_healthStatus!.responseTimeMs}ms',
              style: Theme.of(context).textTheme.bodySmall?.copyWith(
                fontSize: 10,
              ),
            ),
          ],
        ),
        const SizedBox(height: 2),
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Text(
              'Last check: ${_formatTime(_healthStatus!.lastCheckTime)}',
              style: Theme.of(context).textTheme.bodySmall?.copyWith(
                fontSize: 10,
              ),
            ),
          ],
        ),
      ],
    );
  }
  
  Widget _buildExpandedMetrics() {
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: [
        Text(
          'Response: ${_healthStatus!.responseTimeMs}ms',
          style: Theme.of(context).textTheme.bodySmall?.copyWith(
            fontSize: 10,
          ),
        ),
        Text(
          'Last check: ${_formatTime(_healthStatus!.lastCheckTime)}',
          style: Theme.of(context).textTheme.bodySmall?.copyWith(
            fontSize: 10,
          ),
        ),
      ],
    );
  }
  
  Widget _buildErrorDetails() {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(8),
      decoration: BoxDecoration(
        color: Colors.red[50],
        borderRadius: BorderRadius.circular(4),
        border: Border.all(color: Colors.red[200]!),
      ),
      child: Text(
        _errorDetails!,
        style: Theme.of(context).textTheme.bodySmall?.copyWith(
          fontSize: 9,
          color: Colors.red[800],
        ),
      ),
    );
  }
  
  void _toggleErrorDetails() {
    setState(() {
      _isExpanded = !_isExpanded;
    });
  }
  
  String _formatTime(DateTime dateTime) {
    final now = DateTime.now();
    final difference = now.difference(dateTime);
    
    if (difference.inSeconds < 60) {
      return '${difference.inSeconds}s ago';
    } else if (difference.inMinutes < 60) {
      return '${difference.inMinutes}m ago';
    } else {
      return '${dateTime.hour.toString().padLeft(2, '0')}:${dateTime.minute.toString().padLeft(2, '0')}';
    }
  }
}