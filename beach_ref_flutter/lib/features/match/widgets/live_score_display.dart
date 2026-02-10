import 'package:flutter/material.dart';
import '../../../core/theme/app_theme.dart';
import '../../../shared/widgets/flag_image.dart';
import '../models/beach_live.dart';
import '../models/beach_match.dart';

/// Large live score display for match detail screen
class LiveScoreDisplay extends StatelessWidget {
  final BeachLiveResponse liveData;

  const LiveScoreDisplay({super.key, required this.liveData});

  @override
  Widget build(BuildContext context) {
    final displayStatus = liveData.displayStatus;

    final borderColor = displayStatus.isLive
        ? AppColors.liveBg
        : displayStatus.isFinished
            ? AppColors.borderLight
            : AppColors.scheduledBg;

    return Container(
      padding: const EdgeInsets.all(AppSpacing.lg),
      decoration: BoxDecoration(
        color: AppColors.surface,
        border: Border.all(color: borderColor, width: 2),
        borderRadius: BorderRadius.circular(AppSpacing.borderRadius),
      ),
      child: Column(
        children: [
          // Granular status indicator
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 4),
            decoration: BoxDecoration(
              color: displayStatus.isLive
                  ? AppColors.liveBg
                  : displayStatus.isFinished
                      ? AppColors.completedBg
                      : AppColors.scheduledBg,
              borderRadius: BorderRadius.circular(4),
            ),
            child: Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                if (displayStatus.isLive) ...[
                  const _PulsingCircle(),
                  const SizedBox(width: 6),
                ],
                Text(
                  displayStatus.displayLabel,
                  style: TextStyle(
                    color: displayStatus.isLive
                        ? AppColors.liveText
                        : displayStatus.isFinished
                            ? AppColors.completedText
                            : AppColors.scheduledText,
                    fontSize: 12,
                    fontWeight: FontWeight.w700,
                    letterSpacing: 1,
                  ),
                ),
              ],
            ),
          ),

          const SizedBox(height: AppSpacing.md),

          // Teams and score
          Row(
            children: [
              // Team A
              Expanded(
                child: Column(
                  children: [
                    FlagImage(
                      countryCode: liveData.teamAFederationCode,
                      width: 40,
                      height: 28,
                    ),
                    const SizedBox(height: 4),
                    Row(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        if (liveData.isTeamAServing)
                          const _ServingIndicator(),
                        Flexible(
                          child: Text(
                            liveData.teamAName,
                            style: const TextStyle(
                              fontSize: 13,
                              fontWeight: FontWeight.w600,
                            ),
                            textAlign: TextAlign.center,
                            maxLines: 2,
                            overflow: TextOverflow.ellipsis,
                          ),
                        ),
                      ],
                    ),
                  ],
                ),
              ),

              // Score
              Padding(
                padding: const EdgeInsets.symmetric(horizontal: AppSpacing.md),
                child: Text(
                  liveData.scoreDisplay,
                  style: const TextStyle(
                    fontSize: 40,
                    fontWeight: FontWeight.w800,
                    color: AppColors.textPrimary,
                    letterSpacing: -1,
                  ),
                ),
              ),

              // Team B
              Expanded(
                child: Column(
                  children: [
                    FlagImage(
                      countryCode: liveData.teamBFederationCode,
                      width: 40,
                      height: 28,
                    ),
                    const SizedBox(height: 4),
                    Row(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        if (liveData.isTeamBServing)
                          const _ServingIndicator(),
                        Flexible(
                          child: Text(
                            liveData.teamBName,
                            style: const TextStyle(
                              fontSize: 13,
                              fontWeight: FontWeight.w600,
                            ),
                            textAlign: TextAlign.center,
                            maxLines: 2,
                            overflow: TextOverflow.ellipsis,
                          ),
                        ),
                      ],
                    ),
                  ],
                ),
              ),
            ],
          ),

          // Set scores
          if (liveData.sets.isNotEmpty) ...[
            const SizedBox(height: AppSpacing.md),
            const Divider(),
            const SizedBox(height: AppSpacing.sm),
            Row(
              mainAxisAlignment: MainAxisAlignment.center,
              children: liveData.sets.map((set) {
                final isCurrentSet = set.setNumber == liveData.sets.length &&
                    displayStatus.isLive;

                return Container(
                  margin: const EdgeInsets.symmetric(horizontal: 8),
                  padding: const EdgeInsets.symmetric(
                    horizontal: 12, vertical: 6,
                  ),
                  decoration: BoxDecoration(
                    color: isCurrentSet
                        ? AppColors.liveBg.withValues(alpha: 0.3)
                        : AppColors.scheduledBg,
                    borderRadius: BorderRadius.circular(4),
                    border: isCurrentSet
                        ? Border.all(color: AppColors.liveBg, width: 1.5)
                        : null,
                  ),
                  child: Column(
                    children: [
                      Text(
                        'Set ${set.setNumber}',
                        style: const TextStyle(
                          fontSize: 10,
                          color: AppColors.textTertiary,
                          fontWeight: FontWeight.w500,
                        ),
                      ),
                      const SizedBox(height: 2),
                      Text(
                        set.display,
                        style: const TextStyle(
                          fontSize: 16,
                          fontWeight: FontWeight.w700,
                          color: AppColors.textPrimary,
                        ),
                      ),
                      if (set.durationDisplay.isNotEmpty)
                        Text(
                          set.durationDisplay,
                          style: const TextStyle(
                            fontSize: 10,
                            color: AppColors.textTertiary,
                          ),
                        ),
                      // Set point badge
                      if (set.hasSetPoints) ...[
                        const SizedBox(height: 2),
                        _SetPointBadge(set: set),
                      ],
                    ],
                  ),
                );
              }).toList(),
            ),

            // Timeout & challenge row for the current/last set
            if (liveData.sets.isNotEmpty)
              _TimeoutChallengeRow(set: liveData.sets.last),
          ],
        ],
      ),
    );
  }
}

/// Small serving indicator (arrow dot) next to the serving team name.
class _ServingIndicator extends StatelessWidget {
  const _ServingIndicator();

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(right: 4),
      child: Icon(
        Icons.sports_volleyball,
        size: 14,
        color: AppColors.liveText,
      ),
    );
  }
}

/// Set point badge shown when a team has set points.
class _SetPointBadge extends StatelessWidget {
  final BeachLiveSet set;
  const _SetPointBadge({required this.set});

  @override
  Widget build(BuildContext context) {
    final parts = <String>[];
    if (set.nbSetPointsTeamA > 0) parts.add('SP A: ${set.nbSetPointsTeamA}');
    if (set.nbSetPointsTeamB > 0) parts.add('SP B: ${set.nbSetPointsTeamB}');
    if (parts.isEmpty) return const SizedBox.shrink();

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 4, vertical: 1),
      decoration: BoxDecoration(
        color: AppColors.liveBg,
        borderRadius: BorderRadius.circular(3),
      ),
      child: Text(
        parts.join(' | '),
        style: const TextStyle(
          fontSize: 9,
          fontWeight: FontWeight.w700,
          color: AppColors.liveText,
        ),
      ),
    );
  }
}

/// Compact row showing timeouts and challenges for a set.
class _TimeoutChallengeRow extends StatelessWidget {
  final BeachLiveSet set;
  const _TimeoutChallengeRow({required this.set});

  @override
  Widget build(BuildContext context) {
    final hasTimeouts =
        set.nbTimeoutTeamA > 0 || set.nbTimeoutTeamB > 0;
    final hasChallenges =
        set.nbChallengeRequestedTeamA > 0 ||
        set.nbChallengeRequestedTeamB > 0;

    if (!hasTimeouts && !hasChallenges) return const SizedBox.shrink();

    return Padding(
      padding: const EdgeInsets.only(top: AppSpacing.sm),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          if (hasTimeouts) ...[
            const Icon(Icons.timer_outlined, size: 12, color: AppColors.textTertiary),
            const SizedBox(width: 2),
            Text(
              'TO: ${set.nbTimeoutTeamA}-${set.nbTimeoutTeamB}',
              style: const TextStyle(
                fontSize: 11,
                color: AppColors.textSecondary,
                fontWeight: FontWeight.w500,
              ),
            ),
          ],
          if (hasTimeouts && hasChallenges)
            const Padding(
              padding: EdgeInsets.symmetric(horizontal: 6),
              child: Text('|',
                  style: TextStyle(fontSize: 11, color: AppColors.textTertiary)),
            ),
          if (hasChallenges) ...[
            const Icon(Icons.gavel_outlined, size: 12, color: AppColors.textTertiary),
            const SizedBox(width: 2),
            Text(
              'CH: ${set.nbChallengeAcceptedTeamA}/${set.nbChallengeRequestedTeamA}'
              ' - '
              '${set.nbChallengeAcceptedTeamB}/${set.nbChallengeRequestedTeamB}',
              style: const TextStyle(
                fontSize: 11,
                color: AppColors.textSecondary,
                fontWeight: FontWeight.w500,
              ),
            ),
          ],
        ],
      ),
    );
  }
}

class _PulsingCircle extends StatefulWidget {
  const _PulsingCircle();

  @override
  State<_PulsingCircle> createState() => _PulsingCircleState();
}

class _PulsingCircleState extends State<_PulsingCircle>
    with SingleTickerProviderStateMixin {
  late final AnimationController _ctrl;

  @override
  void initState() {
    super.initState();
    _ctrl = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 1200),
    )..repeat(reverse: true);
  }

  @override
  void dispose() {
    _ctrl.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return AnimatedBuilder(
      animation: _ctrl,
      builder: (context, child) {
        return Container(
          width: 8,
          height: 8,
          decoration: BoxDecoration(
            shape: BoxShape.circle,
            color: AppColors.liveDot.withValues(
              alpha: 0.4 + 0.6 * _ctrl.value,
            ),
          ),
        );
      },
    );
  }
}
