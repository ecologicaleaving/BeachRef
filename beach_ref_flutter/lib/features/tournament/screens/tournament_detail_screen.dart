import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../../core/theme/app_theme.dart';
import '../../../shared/widgets/empty_state.dart';
import '../../../shared/widgets/flag_image.dart';
import '../../../shared/widgets/loading_skeleton.dart';
import '../../../core/api/vis_api_client.dart';
import '../../../shared/widgets/offline_banner.dart';
import '../../../shared/widgets/status_badge.dart';
import '../../match/models/beach_match.dart';
import '../../match/providers/match_providers.dart';
import '../../match/widgets/match_card.dart';
import '../providers/tournament_providers.dart';

/// Tournament detail screen matching webapp:
/// - Dark navigation header
/// - Tournament header card
/// - Bottom tab bar (Schedule / Officials)
/// - Filter bar with court, gender, referee dropdowns
/// - Match list grouped by status (Live -> Scheduled -> Completed)
class TournamentDetailScreen extends ConsumerStatefulWidget {
  final String visNo;

  const TournamentDetailScreen({super.key, required this.visNo});

  @override
  ConsumerState<TournamentDetailScreen> createState() =>
      _TournamentDetailScreenState();
}

class _TournamentDetailScreenState
    extends ConsumerState<TournamentDetailScreen> {
  int _activeTab = 0; // 0 = Schedule, 1 = Officials
  bool _showFilters = false;
  String? _courtFilter;

  @override
  Widget build(BuildContext context) {
    final groupedMatches = ref.watch(groupedMatchesProvider(widget.visNo));

    final tournamentsAsync = ref.watch(tournamentsProvider);
    final tournament = tournamentsAsync.valueOrNull?.where(
      (t) => t.no == widget.visNo,
    ).firstOrNull;

    return Scaffold(
      appBar: AppBar(
        backgroundColor: AppColors.primary,
        foregroundColor: Colors.white,
        leading: IconButton(
          icon: const Icon(Icons.arrow_back),
          onPressed: () {
            debugPrint('[TournamentDetail] Back button pressed');
            context.go('/tournaments');
          },
        ),
        title: Column(
          children: [
            Text(
              tournament?.name ?? 'Tournament',
              style: const TextStyle(fontSize: 18, fontWeight: FontWeight.w700),
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
            ),
            if (tournament != null)
              Text(
                '${tournament.displayCity} \u2022 ${tournament.dateRange}',
                style: TextStyle(
                  fontSize: 12,
                  color: Colors.white.withValues(alpha: 0.8),
                ),
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
              ),
          ],
        ),
        centerTitle: true,
        actions: [
          IconButton(
            icon: Icon(_showFilters ? Icons.filter_list_off : Icons.filter_list),
            onPressed: () => setState(() => _showFilters = !_showFilters),
          ),
        ],
      ),
      body: Column(
        children: [
          const OfflineBanner(),

          // Tournament header card
          if (tournament != null) _TournamentHeader(tournament: tournament),

          // Filter panel (collapsible)
          if (_showFilters)
            _FilterBar(
              courtFilter: _courtFilter,
              onCourtChanged: (c) => setState(() => _courtFilter = c),
            ),

          // Match list
          Expanded(
            child: _activeTab == 0
                ? _ScheduleTab(
                    visNo: widget.visNo,
                    groupedMatches: groupedMatches,
                    courtFilter: _courtFilter,
                    ref: ref,
                  )
                : _OfficialsTab(visNo: widget.visNo, ref: ref),
          ),
        ],
      ),

      // Dark bottom tab bar
      bottomNavigationBar: _BottomTabBar(
        activeIndex: _activeTab,
        onTap: (i) => setState(() => _activeTab = i),
      ),
    );
  }
}

/// Tournament header matching webapp
class _TournamentHeader extends StatelessWidget {
  final dynamic tournament;

  const _TournamentHeader({required this.tournament});

  @override
  Widget build(BuildContext context) {
    return Container(
      width: double.infinity,
      decoration: const BoxDecoration(
        color: AppColors.surface,
        border: Border(
          bottom: BorderSide(color: AppColors.borderLight),
        ),
      ),
      padding: const EdgeInsets.all(16),
      child: Row(
        children: [
          FlagImage(
            countryCode: tournament.countryCode,
            width: 40,
            height: 30,
            borderRadius: 6,
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  tournament.displayCity,
                  style: const TextStyle(
                    fontSize: 16,
                    fontWeight: FontWeight.w700,
                    color: AppColors.textNavy,
                  ),
                ),
                const SizedBox(height: 2),
                Text(
                  tournament.dateRange,
                  style: const TextStyle(
                    fontSize: 13,
                    color: AppColors.textTertiary,
                  ),
                ),
              ],
            ),
          ),
          // Gender badge
          Container(
            width: 28,
            height: 28,
            decoration: BoxDecoration(
              color: AppColors.zinc100,
              shape: BoxShape.circle,
              border: Border.all(color: AppColors.borderLight),
            ),
            alignment: Alignment.center,
            child: Text(
              tournament.genderText == 'M'
                  ? '\u2642'
                  : tournament.genderText == 'W'
                      ? '\u2640'
                      : 'MX',
              style: TextStyle(
                fontSize: tournament.genderText == 'MX' ? 10 : 14,
                fontWeight: FontWeight.w700,
                color: tournament.genderText == 'M'
                    ? AppColors.genderMaleSymbol
                    : tournament.genderText == 'W'
                        ? AppColors.genderFemaleSymbol
                        : AppColors.genderMixedSymbol,
              ),
            ),
          ),
        ],
      ),
    );
  }
}

/// Court filter bar
class _FilterBar extends StatelessWidget {
  final String? courtFilter;
  final ValueChanged<String?> onCourtChanged;

  const _FilterBar({
    required this.courtFilter,
    required this.onCourtChanged,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: BoxDecoration(
        color: AppColors.surface,
        border: const Border(
          bottom: BorderSide(color: AppColors.borderLight),
        ),
        boxShadow: AppShadows.medium,
      ),
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
      child: Row(
        children: [
          // Court dropdown
          Expanded(
            child: Container(
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
              decoration: BoxDecoration(
                color: AppColors.surface,
                borderRadius: BorderRadius.circular(8),
                border: Border.all(color: AppColors.borderLight),
                boxShadow: AppShadows.small,
              ),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Text(
                    courtFilter != null ? 'Court $courtFilter' : 'All Courts',
                    style: const TextStyle(
                      fontSize: 16,
                      fontWeight: FontWeight.w600,
                      color: AppColors.textNavy,
                    ),
                  ),
                  const Text(
                    '\u25BC',
                    style: TextStyle(
                      fontSize: 14,
                      fontWeight: FontWeight.w700,
                      color: AppColors.textSecondary,
                    ),
                  ),
                ],
              ),
            ),
          ),
          if (courtFilter != null) ...[
            const SizedBox(width: 8),
            GestureDetector(
              onTap: () => onCourtChanged(null),
              child: Container(
                width: 36,
                height: 36,
                decoration: BoxDecoration(
                  color: AppColors.zinc100,
                  borderRadius: BorderRadius.circular(8),
                ),
                alignment: Alignment.center,
                child: const Icon(Icons.close, size: 18, color: AppColors.textSecondary),
              ),
            ),
          ],
        ],
      ),
    );
  }
}

/// Schedule tab with grouped match list
class _ScheduleTab extends StatelessWidget {
  final String visNo;
  final AsyncValue<Map<String, List<BeachMatch>>> groupedMatches;
  final String? courtFilter;
  final WidgetRef ref;

  const _ScheduleTab({
    required this.visNo,
    required this.groupedMatches,
    required this.courtFilter,
    required this.ref,
  });

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
          child: ListView.builder(
            padding: const EdgeInsets.only(top: 8, bottom: AppSpacing.xxl),
            itemCount: grouped.length,
            itemBuilder: (context, index) {
              final section = grouped.keys.elementAt(index);
              var matches = grouped[section]!;

              // Apply court filter
              if (courtFilter != null) {
                matches = matches.where((m) => m.court == courtFilter).toList();
              }

              if (matches.isEmpty) return const SizedBox.shrink();

              return Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  // Section header
                  _SectionHeader(
                    title: section,
                    count: matches.length,
                    status: section == 'Live'
                        ? MatchDisplayStatus.live
                        : section == 'Scheduled'
                            ? MatchDisplayStatus.scheduled
                            : MatchDisplayStatus.finished,
                  ),
                  const SizedBox(height: 8),
                  // Match cards
                  ...matches.map((match) => MatchCard(
                        match: match,
                        onTap: () => context.push('/match/${match.no}'),
                      )),
                ],
              );
            },
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

/// Officials tab — uses GetEventRefereeList API to show all assigned referees
/// grouped by type (Referee / Challenge Referee) in expandable accordion sections
class _OfficialsTab extends StatefulWidget {
  final String visNo;
  final WidgetRef ref;

  const _OfficialsTab({required this.visNo, required this.ref});

  @override
  State<_OfficialsTab> createState() => _OfficialsTabState();
}

class _OfficialsTabState extends State<_OfficialsTab> {
  bool _refereesExpanded = true;
  bool _challengeExpanded = true;

  @override
  Widget build(BuildContext context) {
    final refereesAsync = widget.ref.watch(eventRefereeListProvider(widget.visNo));

    return refereesAsync.when(
      loading: () => const LoadingSkeleton(itemHeight: 60),
      error: (error, _) => EmptyState(
        icon: Icons.error_outline,
        title: 'Failed to load officials',
        subtitle: error.toString(),
      ),
      data: (referees) {
        if (referees.isEmpty) {
          return const EmptyState(
            icon: Icons.people_outline,
            title: 'No officials assigned',
            subtitle: 'Officials will appear once referees are designated',
          );
        }

        final refs = referees.where((r) => !r.isChallengeReferee).toList()
          ..sort((a, b) => a.lastName.compareTo(b.lastName));
        final challengeRefs = referees.where((r) => r.isChallengeReferee).toList()
          ..sort((a, b) => a.lastName.compareTo(b.lastName));

        return ListView(
          padding: const EdgeInsets.only(top: 8, bottom: AppSpacing.xxl),
          children: [
            // Referees section
            if (refs.isNotEmpty)
              _buildAccordion(
                title: 'Referees',
                count: refs.length,
                icon: Icons.sports,
                expanded: _refereesExpanded,
                onTap: () => setState(() => _refereesExpanded = !_refereesExpanded),
                officials: refs,
              ),
            // Challenge Referees section
            if (challengeRefs.isNotEmpty)
              _buildAccordion(
                title: 'Challenge Referees',
                count: challengeRefs.length,
                icon: Icons.videocam,
                expanded: _challengeExpanded,
                onTap: () => setState(() => _challengeExpanded = !_challengeExpanded),
                officials: challengeRefs,
              ),
          ],
        );
      },
    );
  }

  Widget _buildAccordion({
    required String title,
    required int count,
    required IconData icon,
    required bool expanded,
    required VoidCallback onTap,
    required List<EventReferee> officials,
  }) {
    return Column(
      children: [
        // Accordion header
        InkWell(
          onTap: onTap,
          child: Container(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
            decoration: BoxDecoration(
              color: AppColors.primary.withValues(alpha: 0.05),
              border: Border(
                bottom: BorderSide(color: AppColors.borderLight),
              ),
            ),
            child: Row(
              children: [
                Icon(icon, size: 20, color: AppColors.primary),
                const SizedBox(width: 10),
                Text(
                  title,
                  style: const TextStyle(
                    fontSize: 15,
                    fontWeight: FontWeight.w700,
                    color: AppColors.textNavy,
                  ),
                ),
                const SizedBox(width: 8),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                  decoration: BoxDecoration(
                    color: AppColors.primary.withValues(alpha: 0.12),
                    borderRadius: BorderRadius.circular(10),
                  ),
                  child: Text(
                    '$count',
                    style: const TextStyle(
                      fontSize: 12,
                      fontWeight: FontWeight.w600,
                      color: AppColors.primary,
                    ),
                  ),
                ),
                const Spacer(),
                Icon(
                  expanded ? Icons.expand_less : Icons.expand_more,
                  color: AppColors.textTertiary,
                ),
              ],
            ),
          ),
        ),
        // Accordion body
        if (expanded)
          ...officials.map((official) => _buildOfficialTile(official)),
      ],
    );
  }

  Widget _buildOfficialTile(EventReferee official) {
    return Container(
      margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 4),
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: AppColors.surface,
        borderRadius: BorderRadius.circular(8),
        border: Border.all(color: AppColors.borderLight),
      ),
      child: Row(
        children: [
          if (official.federationCode.isNotEmpty) ...[
            FlagImage(
              countryCode: official.federationCode,
              width: 28,
              height: 20,
              borderRadius: 4,
            ),
            const SizedBox(width: 12),
          ],
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  official.fullName,
                  style: const TextStyle(
                    fontSize: 15,
                    fontWeight: FontWeight.w600,
                    color: AppColors.textNavy,
                  ),
                ),
                if (official.federationCode.isNotEmpty)
                  Text(
                    official.federationCode,
                    style: const TextStyle(
                      fontSize: 12,
                      color: AppColors.textTertiary,
                    ),
                  ),
              ],
            ),
          ),
          // Gender badge
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
            decoration: BoxDecoration(
              color: official.isMale
                  ? const Color(0xFFDBEAFE)
                  : const Color(0xFFFCE7F3),
              borderRadius: BorderRadius.circular(12),
            ),
            child: Text(
              official.isMale ? 'M' : 'W',
              style: TextStyle(
                fontSize: 11,
                fontWeight: FontWeight.w600,
                color: official.isMale
                    ? const Color(0xFF1E40AF)
                    : const Color(0xFF9D174D),
              ),
            ),
          ),
        ],
      ),
    );
  }
}

/// Dark bottom tab bar matching webapp TournamentBottomMenu
class _BottomTabBar extends StatelessWidget {
  final int activeIndex;
  final ValueChanged<int> onTap;

  const _BottomTabBar({
    required this.activeIndex,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: BoxDecoration(
        color: AppColors.primary,
        border: Border(
          top: BorderSide(
            color: Colors.white.withValues(alpha: 0.1),
          ),
        ),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.2),
            offset: const Offset(0, -4),
            blurRadius: 8,
          ),
        ],
      ),
      child: SafeArea(
        top: false,
        child: Padding(
          padding: const EdgeInsets.only(top: 8, bottom: 12, left: 16, right: 16),
          child: Row(
            children: [
              _TabItem(
                icon: Icons.calendar_today,
                label: 'Schedule',
                isActive: activeIndex == 0,
                onTap: () => onTap(0),
              ),
              _TabItem(
                icon: Icons.people,
                label: 'Officials',
                isActive: activeIndex == 1,
                onTap: () => onTap(1),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _TabItem extends StatelessWidget {
  final IconData icon;
  final String label;
  final bool isActive;
  final VoidCallback onTap;

  const _TabItem({
    required this.icon,
    required this.label,
    required this.isActive,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return Expanded(
      child: GestureDetector(
        onTap: onTap,
        behavior: HitTestBehavior.opaque,
        child: Container(
          decoration: BoxDecoration(
            color: isActive
                ? Colors.white.withValues(alpha: 0.05)
                : Colors.transparent,
            borderRadius: BorderRadius.circular(8),
          ),
          padding: const EdgeInsets.symmetric(vertical: 8),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Icon(
                icon,
                size: 20,
                color: isActive
                    ? Colors.white
                    : Colors.white.withValues(alpha: 0.5),
              ),
              const SizedBox(height: 4),
              Text(
                label,
                style: TextStyle(
                  fontSize: 11,
                  fontWeight: FontWeight.w500,
                  color: isActive
                      ? Colors.white
                      : Colors.white.withValues(alpha: 0.5),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
