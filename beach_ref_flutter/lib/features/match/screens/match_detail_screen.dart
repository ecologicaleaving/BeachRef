import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../../core/theme/app_theme.dart';
import '../../../shared/widgets/flag_image.dart';
import '../../../shared/widgets/loading_skeleton.dart';
import '../../../shared/widgets/status_badge.dart';
import '../models/beach_live.dart';
import '../models/beach_match.dart';
import '../providers/live_score_provider.dart';
import '../providers/match_providers.dart';
import '../widgets/live_score_display.dart';

/// Match detail screen with live score polling
class MatchDetailScreen extends ConsumerWidget {
  final String matchNo;

  const MatchDetailScreen({super.key, required this.matchNo});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final matchAsync = ref.watch(matchDetailProvider(matchNo));
    final parsedMatchNo = int.tryParse(matchNo) ?? 0;

    // Always fetch a one-shot GetBeachLive snapshot (records to Supabase)
    final snapshotAsync = ref.watch(matchSnapshotProvider(parsedMatchNo));

    goBack() {
      if (context.canPop()) {
        context.pop();
      } else {
        context.go('/tournaments');
      }
    }

    makeAppBar(String title, [String? subtitle]) => AppBar(
          backgroundColor: AppColors.primary,
          foregroundColor: Colors.white,
          leading: IconButton(
            icon: const Icon(Icons.arrow_back),
            onPressed: goBack,
          ),
          title: Column(
            children: [
              Text(title,
                  style: const TextStyle(
                      fontSize: 18, fontWeight: FontWeight.w700),
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis),
              if (subtitle != null)
                Text(subtitle,
                    style: TextStyle(
                        fontSize: 12,
                        color: Colors.white.withValues(alpha: 0.8)),
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis),
            ],
          ),
          centerTitle: true,
        );

    return matchAsync.when(
      loading: () => Scaffold(
        appBar: makeAppBar('Match'),
        body: const LoadingSkeleton(itemCount: 4, itemHeight: 100),
      ),
      error: (error, _) => Scaffold(
        appBar: makeAppBar('Match'),
        body: Center(child: Text('Error: $error')),
      ),
      data: (match) {
        if (match == null) {
          return Scaffold(
            appBar: makeAppBar('Match'),
            body: const Center(child: Text('Match not found')),
          );
        }

        // Resolve snapshot data (null while loading or on error)
        final snapshot = snapshotAsync.valueOrNull;

        return Scaffold(
          appBar: makeAppBar(
            match.roundName.isNotEmpty ? match.roundName : 'Match',
            '#${match.noInTournament.isNotEmpty ? match.noInTournament : match.no}',
          ),
          body: SingleChildScrollView(
            padding: const EdgeInsets.all(AppSpacing.md),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                // Live matches: polling section (takes over from snapshot)
                if (match.isLive || match.displayStatus == MatchDisplayStatus.readyToStart)
                  _LiveSection(matchNo: parsedMatchNo),

                // Finished/scheduled matches: show enriched data from snapshot
                if (!match.isLive && match.displayStatus != MatchDisplayStatus.readyToStart) ...[
                  if (snapshot != null)
                    // Rich display with timeouts, challenges, serving, etc.
                    LiveScoreDisplay(liveData: snapshot)
                  else
                    _StaticScoreSection(match: match),
                ],

                const SizedBox(height: AppSpacing.md),

                // Enriched set details from snapshot (for finished matches)
                if (!match.isLive && snapshot != null && snapshot.sets.isNotEmpty)
                  _EnrichedSetDetails(snapshot: snapshot),

                // Fallback: basic set scores from static data
                if (!match.isLive && snapshot == null && match.setScores.isNotEmpty)
                  _SetScoresCard(match: match),

                if (match.setScores.isNotEmpty || (snapshot != null && snapshot.sets.isNotEmpty))
                  const SizedBox(height: AppSpacing.md),

                // Match info card
                _MatchInfoCard(match: match),

                const SizedBox(height: AppSpacing.md),

                // Referees card (always shown)
                if (match.referee1Name.isNotEmpty ||
                    match.referee2Name.isNotEmpty)
                  _RefereesCard(match: match),
              ],
            ),
          ),
        );
      },
    );
  }
}

class _LiveSection extends ConsumerWidget {
  final int matchNo;
  const _LiveSection({required this.matchNo});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final liveAsync = ref.watch(liveScoreProvider(matchNo));

    return liveAsync.when(
      loading: () => const Padding(
        padding: EdgeInsets.all(AppSpacing.lg),
        child: Center(child: CircularProgressIndicator()),
      ),
      error: (error, _) => Padding(
        padding: const EdgeInsets.all(AppSpacing.md),
        child: Text('Live score unavailable', style: TextStyle(color: AppColors.textTertiary)),
      ),
      data: (liveData) => LiveScoreDisplay(liveData: liveData),
    );
  }
}

class _StaticScoreSection extends StatelessWidget {
  final BeachMatch match;
  const _StaticScoreSection({required this.match});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(AppSpacing.lg),
      decoration: BoxDecoration(
        color: AppColors.surface,
        borderRadius: BorderRadius.circular(AppSpacing.borderRadiusLg),
        border: Border.all(color: AppColors.borderLight),
      ),
      child: Column(
        children: [
          StatusBadge(status: match.displayStatus),
          const SizedBox(height: AppSpacing.md),
          Row(
            children: [
              Expanded(
                child: Column(
                  children: [
                    FlagImage(
                      countryCode: match.teamAFederationCode,
                      width: 40,
                      height: 28,
                    ),
                    const SizedBox(height: 4),
                    Text(
                      match.teamAName,
                      style: const TextStyle(
                        fontSize: 13,
                        fontWeight: FontWeight.w600,
                      ),
                      textAlign: TextAlign.center,
                      maxLines: 2,
                    ),
                  ],
                ),
              ),
              Padding(
                padding: const EdgeInsets.symmetric(horizontal: AppSpacing.md),
                child: Text(
                  match.scoreDisplay.isNotEmpty ? match.scoreDisplay : 'vs',
                  style: const TextStyle(
                    fontSize: 36,
                    fontWeight: FontWeight.w800,
                    color: AppColors.textPrimary,
                  ),
                ),
              ),
              Expanded(
                child: Column(
                  children: [
                    FlagImage(
                      countryCode: match.teamBFederationCode,
                      width: 40,
                      height: 28,
                    ),
                    const SizedBox(height: 4),
                    Text(
                      match.teamBName,
                      style: const TextStyle(
                        fontSize: 13,
                        fontWeight: FontWeight.w600,
                      ),
                      textAlign: TextAlign.center,
                      maxLines: 2,
                    ),
                  ],
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }
}

/// Enriched set details from GetBeachLive snapshot — shows per-set
/// timeouts, challenges, durations, and serving info.
class _EnrichedSetDetails extends StatelessWidget {
  final BeachLiveResponse snapshot;
  const _EnrichedSetDetails({required this.snapshot});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(AppSpacing.md),
      decoration: BoxDecoration(
        color: AppColors.surface,
        borderRadius: BorderRadius.circular(AppSpacing.borderRadiusLg),
        border: Border.all(color: AppColors.borderLight),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text(
            'Set Details',
            style: TextStyle(
              fontSize: 14,
              fontWeight: FontWeight.w600,
              color: AppColors.textSecondary,
            ),
          ),
          const SizedBox(height: AppSpacing.sm),
          for (final set in snapshot.sets) ...[
            _SetDetailRow(set: set, snapshot: snapshot),
            if (set.setNumber < snapshot.sets.length)
              const Divider(height: 16),
          ],
        ],
      ),
    );
  }
}

/// Single set detail row with score, duration, timeouts, challenges.
class _SetDetailRow extends StatelessWidget {
  final BeachLiveSet set;
  final BeachLiveResponse snapshot;
  const _SetDetailRow({required this.set, required this.snapshot});

  @override
  Widget build(BuildContext context) {
    final hasTimeouts = set.nbTimeoutTeamA > 0 || set.nbTimeoutTeamB > 0;
    final hasChallenges =
        set.nbChallengeRequestedTeamA > 0 || set.nbChallengeRequestedTeamB > 0;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        // Set header: "Set 1   21-10   16:37"
        Row(
          children: [
            Text(
              'Set ${set.setNumber}',
              style: const TextStyle(
                fontSize: 13,
                fontWeight: FontWeight.w700,
                color: AppColors.textPrimary,
              ),
            ),
            const SizedBox(width: 12),
            Text(
              set.display,
              style: TextStyle(
                fontSize: 15,
                fontWeight: FontWeight.w800,
                color: set.pointsTeamA > set.pointsTeamB
                    ? AppColors.success
                    : set.pointsTeamB > set.pointsTeamA
                        ? AppColors.error
                        : AppColors.textPrimary,
              ),
            ),
            const Spacer(),
            if (set.durationDisplay.isNotEmpty)
              Text(
                set.durationDisplay,
                style: const TextStyle(
                  fontSize: 12,
                  color: AppColors.textTertiary,
                ),
              ),
          ],
        ),
        // Stats row
        if (hasTimeouts || hasChallenges)
          Padding(
            padding: const EdgeInsets.only(top: 4),
            child: Wrap(
              spacing: 12,
              children: [
                if (hasTimeouts)
                  _StatChip(
                    icon: Icons.timer_outlined,
                    label: 'TO ${set.nbTimeoutTeamA}-${set.nbTimeoutTeamB}',
                  ),
                if (hasChallenges)
                  _StatChip(
                    icon: Icons.gavel_outlined,
                    label: 'CH ${set.nbChallengeAcceptedTeamA}/${set.nbChallengeRequestedTeamA}'
                        ' - ${set.nbChallengeAcceptedTeamB}/${set.nbChallengeRequestedTeamB}',
                  ),
              ],
            ),
          ),
      ],
    );
  }
}

/// Small stat chip (icon + label) for set details.
class _StatChip extends StatelessWidget {
  final IconData icon;
  final String label;
  const _StatChip({required this.icon, required this.label});

  @override
  Widget build(BuildContext context) {
    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        Icon(icon, size: 12, color: AppColors.textTertiary),
        const SizedBox(width: 3),
        Text(
          label,
          style: const TextStyle(
            fontSize: 11,
            color: AppColors.textSecondary,
            fontWeight: FontWeight.w500,
          ),
        ),
      ],
    );
  }
}

class _SetScoresCard extends StatelessWidget {
  final BeachMatch match;
  const _SetScoresCard({required this.match});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(AppSpacing.md),
      decoration: BoxDecoration(
        color: AppColors.surface,
        borderRadius: BorderRadius.circular(AppSpacing.borderRadiusLg),
        border: Border.all(color: AppColors.borderLight),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text(
            'Set Scores',
            style: TextStyle(
              fontSize: 14,
              fontWeight: FontWeight.w600,
              color: AppColors.textSecondary,
            ),
          ),
          const SizedBox(height: AppSpacing.sm),
          // Header row
          Row(
            children: [
              const SizedBox(width: 60),
              for (final set in match.setScores)
                Expanded(
                  child: Text(
                    'Set ${set.setNumber}',
                    textAlign: TextAlign.center,
                    style: const TextStyle(
                      fontSize: 11,
                      color: AppColors.textTertiary,
                      fontWeight: FontWeight.w500,
                    ),
                  ),
                ),
            ],
          ),
          const SizedBox(height: 4),
          // Team A scores
          Row(
            children: [
              SizedBox(
                width: 60,
                child: Text(
                  match.teamAFederationCode,
                  style: const TextStyle(
                    fontSize: 13,
                    fontWeight: FontWeight.w600,
                  ),
                ),
              ),
              for (final set in match.setScores)
                Expanded(
                  child: Text(
                    '${set.teamA}',
                    textAlign: TextAlign.center,
                    style: TextStyle(
                      fontSize: 16,
                      fontWeight: FontWeight.w700,
                      color: set.teamA > set.teamB
                          ? AppColors.success
                          : AppColors.textPrimary,
                    ),
                  ),
                ),
            ],
          ),
          const SizedBox(height: 2),
          // Team B scores
          Row(
            children: [
              SizedBox(
                width: 60,
                child: Text(
                  match.teamBFederationCode,
                  style: const TextStyle(
                    fontSize: 13,
                    fontWeight: FontWeight.w600,
                  ),
                ),
              ),
              for (final set in match.setScores)
                Expanded(
                  child: Text(
                    '${set.teamB}',
                    textAlign: TextAlign.center,
                    style: TextStyle(
                      fontSize: 16,
                      fontWeight: FontWeight.w700,
                      color: set.teamB > set.teamA
                          ? AppColors.success
                          : AppColors.textPrimary,
                    ),
                  ),
                ),
            ],
          ),
          // Durations
          if (match.setScores.any((s) => s.duration.isNotEmpty)) ...[
            const SizedBox(height: 4),
            Row(
              children: [
                const SizedBox(width: 60),
                for (final set in match.setScores)
                  Expanded(
                    child: Text(
                      set.duration,
                      textAlign: TextAlign.center,
                      style: const TextStyle(
                        fontSize: 10,
                        color: AppColors.textTertiary,
                      ),
                    ),
                  ),
              ],
            ),
          ],
        ],
      ),
    );
  }
}

class _MatchInfoCard extends StatelessWidget {
  final BeachMatch match;
  const _MatchInfoCard({required this.match});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(AppSpacing.md),
      decoration: BoxDecoration(
        color: AppColors.surface,
        borderRadius: BorderRadius.circular(AppSpacing.borderRadiusLg),
        border: Border.all(color: AppColors.borderLight),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text(
            'Match Info',
            style: TextStyle(
              fontSize: 14,
              fontWeight: FontWeight.w600,
              color: AppColors.textSecondary,
            ),
          ),
          const SizedBox(height: AppSpacing.sm),
          if (match.courtDisplay.isNotEmpty)
            _InfoRow(label: 'Court', value: match.courtDisplay),
          if (match.roundName.isNotEmpty)
            _InfoRow(label: 'Round', value: match.roundName),
          if (match.localDate.isNotEmpty)
            _InfoRow(label: 'Date', value: match.localDate),
          if (match.timeDisplay.isNotEmpty)
            _InfoRow(label: 'Time', value: match.timeDisplay),
          if (match.resultType.isNotEmpty)
            _InfoRow(label: 'Result Type', value: match.resultType),
        ],
      ),
    );
  }
}

class _InfoRow extends StatelessWidget {
  final String label;
  final String value;
  const _InfoRow({required this.label, required this.value});

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 4),
      child: Row(
        children: [
          SizedBox(
            width: 100,
            child: Text(
              label,
              style: const TextStyle(
                fontSize: 13,
                color: AppColors.textTertiary,
              ),
            ),
          ),
          Expanded(
            child: Text(
              value,
              style: const TextStyle(
                fontSize: 13,
                fontWeight: FontWeight.w500,
                color: AppColors.textPrimary,
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _RefereesCard extends StatelessWidget {
  final BeachMatch match;
  const _RefereesCard({required this.match});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(AppSpacing.md),
      decoration: BoxDecoration(
        color: AppColors.surface,
        borderRadius: BorderRadius.circular(AppSpacing.borderRadiusLg),
        border: Border.all(color: AppColors.borderLight),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text(
            'Officials',
            style: TextStyle(
              fontSize: 14,
              fontWeight: FontWeight.w600,
              color: AppColors.textSecondary,
            ),
          ),
          const SizedBox(height: AppSpacing.sm),
          if (match.referee1Name.isNotEmpty)
            _RefereeRow(
              role: '1st Referee',
              name: match.referee1Name,
              federation: match.referee1FederationCode,
            ),
          if (match.referee2Name.isNotEmpty)
            _RefereeRow(
              role: '2nd Referee',
              name: match.referee2Name,
              federation: match.referee2FederationCode,
            ),
          if (match.refereeChallengeName.isNotEmpty)
            _RefereeRow(
              role: 'Challenge',
              name: match.refereeChallengeName,
              federation: '',
            ),
        ],
      ),
    );
  }
}

class _RefereeRow extends StatelessWidget {
  final String role;
  final String name;
  final String federation;

  const _RefereeRow({
    required this.role,
    required this.name,
    required this.federation,
  });

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 6),
      child: Row(
        children: [
          SizedBox(
            width: 100,
            child: Text(
              role,
              style: const TextStyle(
                fontSize: 12,
                color: AppColors.textTertiary,
              ),
            ),
          ),
          if (federation.isNotEmpty) ...[
            FlagImage(countryCode: federation, width: 18, height: 12),
            const SizedBox(width: 6),
          ],
          Expanded(
            child: Text(
              name,
              style: const TextStyle(
                fontSize: 13,
                fontWeight: FontWeight.w500,
                color: AppColors.textPrimary,
              ),
            ),
          ),
        ],
      ),
    );
  }
}
