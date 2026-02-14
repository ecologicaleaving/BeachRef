import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../../core/theme/app_theme.dart';
import '../../../shared/widgets/empty_state.dart';
import '../../../shared/widgets/loading_skeleton.dart';
import '../../../shared/widgets/status_badge.dart';
import '../../match/models/beach_match.dart';
import '../../match/providers/match_providers.dart';
import '../../match/widgets/match_card.dart';

/// Schedule tab with grouped match list.
/// Uses CustomScrollView + SliverList.builder for true lazy rendering —
/// only visible match cards are built, not all 200+ at once.
class ScheduleTab extends StatelessWidget {
  final String visNo;
  final AsyncValue<Map<String, List<BeachMatch>>> groupedMatches;
  final String? courtFilter;
  final WidgetRef ref;

  const ScheduleTab({
    super.key,
    required this.visNo,
    required this.groupedMatches,
    required this.courtFilter,
    required this.ref,
  });

  List<BeachMatch> _filterByCourt(List<BeachMatch> matches) {
    if (courtFilter == null) return matches;
    return matches.where((m) => m.court == courtFilter).toList();
  }

  @override
  Widget build(BuildContext context) {
    return groupedMatches.when(
      loading: () => const LoadingSkeleton(itemHeight: 100),
      error: (error, _) => EmptyState(
        icon: Icons.error_outline,
        title: 'Failed to load matches',
        subtitle: error.toString(),
        actionLabel: 'Retry',
        onAction: () => ref.invalidate(matchListProvider(visNo)),
      ),
      data: (grouped) {
        if (grouped.isEmpty) {
          return const EmptyState(
            icon: Icons.sports_volleyball,
            title: 'No matches found',
            subtitle: 'Matches will appear once the schedule is published',
          );
        }

        return RefreshIndicator(
          color: AppColors.accent,
          onRefresh: () async {
            ref.invalidate(matchListProvider(visNo));
            await ref.read(matchListProvider(visNo).future);
          },
          child: CustomScrollView(
            physics: const AlwaysScrollableScrollPhysics(),
            slivers: [
              const SliverPadding(padding: EdgeInsets.only(top: 8)),

              for (final entry in grouped.entries) ...[
                () {
                  final section = entry.key;
                  final filteredMatches = _filterByCourt(entry.value);
                  if (filteredMatches.isEmpty) {
                    return const SliverToBoxAdapter(child: SizedBox.shrink());
                  }

                  return SliverMainAxisGroup(
                    slivers: [
                      SliverToBoxAdapter(
                        child: _SectionHeader(
                          title: section,
                          count: filteredMatches.length,
                          status: section == 'Live'
                              ? MatchDisplayStatus.inSet1
                              : section == 'Scheduled'
                                  ? MatchDisplayStatus.scheduled
                                  : MatchDisplayStatus.finished,
                        ),
                      ),
                      const SliverToBoxAdapter(child: SizedBox(height: 8)),
                      SliverList.builder(
                        itemCount: filteredMatches.length,
                        itemBuilder: (ctx, idx) => MatchCard(
                          match: filteredMatches[idx],
                          onTap: () => ctx.push('/match/${filteredMatches[idx].no}'),
                        ),
                      ),
                    ],
                  );
                }(),
              ],

              const SliverPadding(padding: EdgeInsets.only(bottom: AppSpacing.xxl)),
            ],
          ),
        );
      },
    );
  }
}

class _SectionHeader extends StatelessWidget {
  final String title;
  final int count;
  final MatchDisplayStatus status;

  const _SectionHeader({
    required this.title,
    required this.count,
    required this.status,
  });

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.fromLTRB(16, 16, 16, 4),
      child: Row(
        children: [
          StatusBadge(status: status),
          const SizedBox(width: 8),
          Text(
            '$count ${count == 1 ? 'match' : 'matches'}',
            style: const TextStyle(
              fontSize: 13,
              fontWeight: FontWeight.w500,
              color: AppColors.textTertiary,
            ),
          ),
        ],
      ),
    );
  }
}
