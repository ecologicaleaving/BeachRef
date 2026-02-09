import 'package:flutter/material.dart';
import '../../core/theme/app_theme.dart';
import '../../features/match/models/beach_match.dart';

/// Colored status badge matching webapp StatusIndicator component
class StatusBadge extends StatelessWidget {
  final MatchDisplayStatus status;
  final double fontSize;
  final bool prominent;

  const StatusBadge({
    super.key,
    required this.status,
    this.fontSize = 12,
    this.prominent = false,
  });

  @override
  Widget build(BuildContext context) {
    final config = _statusConfig(status);

    if (prominent) {
      return Container(
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
        decoration: BoxDecoration(
          color: config.bgColor,
          border: Border.all(color: config.textColor, width: 2),
          borderRadius: BorderRadius.circular(16),
        ),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            if (status == MatchDisplayStatus.live) ...[
              _PulsingDot(color: config.dotColor ?? AppColors.liveDot, size: 10),
              const SizedBox(width: 6),
            ],
            Text(
              config.label,
              style: TextStyle(
                color: config.textColor,
                fontSize: fontSize,
                fontWeight: FontWeight.w600,
              ),
            ),
          ],
        ),
      );
    }

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
      decoration: BoxDecoration(
        color: config.bgColor,
        borderRadius: BorderRadius.circular(6),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          if (status == MatchDisplayStatus.live) ...[
            _PulsingDot(color: config.dotColor ?? AppColors.liveDot, size: 8),
            const SizedBox(width: 4),
          ],
          Text(
            config.label,
            style: TextStyle(
              color: config.textColor,
              fontSize: fontSize,
              fontWeight: FontWeight.w600,
            ),
          ),
        ],
      ),
    );
  }

  _BadgeConfig _statusConfig(MatchDisplayStatus status) {
    switch (status) {
      case MatchDisplayStatus.live:
        return const _BadgeConfig(
          label: 'LIVE',
          textColor: AppColors.liveText,
          bgColor: AppColors.liveBg,
          dotColor: AppColors.liveDot,
        );
      case MatchDisplayStatus.scheduled:
        return const _BadgeConfig(
          label: 'SCHEDULED',
          textColor: AppColors.scheduledText,
          bgColor: AppColors.scheduledBg,
        );
      case MatchDisplayStatus.finished:
        return const _BadgeConfig(
          label: 'FINISHED',
          textColor: AppColors.completedText,
          bgColor: AppColors.completedBg,
        );
    }
  }
}

class _BadgeConfig {
  final String label;
  final Color textColor;
  final Color bgColor;
  final Color? dotColor;

  const _BadgeConfig({
    required this.label,
    required this.textColor,
    required this.bgColor,
    this.dotColor,
  });
}

/// Animated pulsing dot for live matches
class _PulsingDot extends StatefulWidget {
  final Color color;
  final double size;
  const _PulsingDot({required this.color, this.size = 8});

  @override
  State<_PulsingDot> createState() => _PulsingDotState();
}

class _PulsingDotState extends State<_PulsingDot>
    with SingleTickerProviderStateMixin {
  late final AnimationController _controller;
  late final Animation<double> _animation;

  @override
  void initState() {
    super.initState();
    _controller = AnimationController(
      duration: const Duration(milliseconds: 800),
      vsync: this,
    )..repeat(reverse: true);
    _animation = Tween(begin: 0.7, end: 1.0).animate(
      CurvedAnimation(parent: _controller, curve: Curves.easeInOut),
    );
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return AnimatedBuilder(
      animation: _animation,
      builder: (context, child) {
        return Opacity(
          opacity: _animation.value,
          child: Container(
            width: widget.size,
            height: widget.size,
            decoration: BoxDecoration(
              shape: BoxShape.circle,
              color: widget.color,
            ),
          ),
        );
      },
    );
  }
}
