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
import '../models/referee_match_stats.dart';
import '../providers/tournament_providers.dart';
import '../services/referee_stats_calculator.dart';
import '../widgets/referee_card.dart';

/// Tournament detail screen matching webapp:
/// - Dark navigation header
/// - Tournament header card
/// - Bottom tab bar (Schedule / Officials)
/// - Filter bar with court, gender, referee dropdowns
/// - Match list grouped by status (Live -> Scheduled -> Completed)
class TournamentDetailScreen extends ConsumerStatefulWidget {
  final String visNo;

  /// Optional pre-loaded tournament info for instant header rendering.
  /// Passed from the tournament list so the header shows at frame 0.
  final String? tournamentName;
  final String? tournamentCity;
  final String? countryCode;
  final String? dateRange;
  final String? genderText;

  const TournamentDetailScreen({
    super.key,
    required this.visNo,
    this.tournamentName,
    this.tournamentCity,
    this.countryCode,
    this.dateRange,
    this.genderText,
  });

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

    // Use pre-loaded data for instant rendering, fall back to provider
    final displayName = tournament?.name ?? widget.tournamentName ?? 'Tournament';
    final displayCity = tournament?.displayCity ?? widget.tournamentCity;
    final displayDateRange = tournament?.dateRange ?? widget.dateRange;
    final displayCountryCode = tournament?.countryCode ?? widget.countryCode;
    final displayGender = tournament?.genderText ?? widget.genderText;

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
              displayName,
              style: const TextStyle(fontSize: 18, fontWeight: FontWeight.w700),
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
            ),
            if (displayCity != null)
              Text(
                '${displayCity}${displayDateRange != null ? ' \u2022 $displayDateRange' : ''}',
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

          // Tournament header card - show immediately with pre-loaded or provider data
          if (tournament != null)
            _TournamentHeader(tournament: tournament)
          else if (displayCountryCode != null)
            _PreloadedTournamentHeader(
              city: displayCity ?? '',
              dateRange: displayDateRange ?? '',
              countryCode: displayCountryCode,
              genderText: displayGender ?? 'MX',
            ),

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

/// Lightweight header using pre-loaded data (no provider needed)
class _PreloadedTournamentHeader extends StatelessWidget {
  final String city;
  final String dateRange;
  final String countryCode;
  final String genderText;

  const _PreloadedTournamentHeader({
    required this.city,
    required this.dateRange,
    required this.countryCode,
    required this.genderText,
  });

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
            countryCode: countryCode,
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
                  city,
                  style: const TextStyle(
                    fontSize: 16,
                    fontWeight: FontWeight.w700,
                    color: AppColors.textNavy,
                  ),
                ),
                const SizedBox(height: 2),
                Text(
                  dateRange,
                  style: const TextStyle(
                    fontSize: 13,
                    color: AppColors.textTertiary,
                  ),
                ),
              ],
            ),
          ),
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
              genderText == 'M'
                  ? '\u2642'
                  : genderText == 'W'
                      ? '\u2640'
                      : 'MX',
              style: TextStyle(
                fontSize: genderText == 'MX' ? 10 : 14,
                fontWeight: FontWeight.w700,
                color: genderText == 'M'
                    ? AppColors.genderMaleSymbol
                    : genderText == 'W'
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

/// Schedule tab with grouped match list.
/// Uses CustomScrollView + SliverList.builder for true lazy rendering —
/// only visible match cards are built, not all 200+ at once.
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
              // Top padding
              const SliverPadding(padding: EdgeInsets.only(top: 8)),

              for (final entry in grouped.entries) ...[
                () {
                  final section = entry.key;
                  final filteredMatches = _filterByCourt(entry.value);
                  if (filteredMatches.isEmpty) return const SliverToBoxAdapter(child: SizedBox.shrink());

                  return SliverMainAxisGroup(
                    slivers: [
                      // Section header
                      SliverToBoxAdapter(
                        child: _SectionHeader(
                          title: section,
                          count: filteredMatches.length,
                          status: section == 'Live'
                              ? MatchDisplayStatus.live
                              : section == 'Scheduled'
                                  ? MatchDisplayStatus.scheduled
                                  : MatchDisplayStatus.finished,
                        ),
                      ),
                      const SliverToBoxAdapter(child: SizedBox(height: 8)),
                      // Match cards — SliverList.builder = true lazy rendering
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

              // Bottom padding
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

/// Officials tab — uses GetEventRefereeList API to show all assigned referees
/// grouped by type (Referee / Challenge Referee) in expandable accordion sections.
/// Each referee card shows tournament stats (TOT/R1/R2/M/W) and last 3 matches.
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

  /// Key of the currently expanded referee card (only one at a time)
  String? _expandedRefereeKey;

  /// Extract unique referees from match data as fallback for older tournaments
  List<EventReferee> _extractRefereesFromMatches(List<BeachMatch> matches) {
    final refMap = <String, EventReferee>{};
    for (final m in matches) {
      if (m.referee1Name.isNotEmpty) {
        final key = m.referee1Name.trim().toLowerCase();
        refMap.putIfAbsent(key, () => EventReferee(
          no: '',
          firstName: '',
          lastName: m.referee1Name.trim(),
          federationCode: m.referee1FederationCode,
          gender: '',
          type: '1',
        ));
      }
      if (m.referee2Name.isNotEmpty) {
        final key = m.referee2Name.trim().toLowerCase();
        refMap.putIfAbsent(key, () => EventReferee(
          no: '',
          firstName: '',
          lastName: m.referee2Name.trim(),
          federationCode: m.referee2FederationCode,
          gender: '',
          type: '1',
        ));
      }
    }
    return refMap.values.toList();
  }

  @override
  Widget build(BuildContext context) {
    final refereesAsync = widget.ref.watch(eventRefereeListProvider(widget.visNo));
    final matchesAsync = widget.ref.watch(matchListProvider(widget.visNo));

    return refereesAsync.when(
      loading: () => const LoadingSkeleton(itemHeight: 60),
      error: (error, _) {
        // On API error, try fallback from matches
        return matchesAsync.when(
          loading: () => const LoadingSkeleton(itemHeight: 60),
          error: (e, _) => EmptyState(
            icon: Icons.error_outline,
            title: 'Failed to load officials',
            subtitle: e.toString(),
          ),
          data: (matches) => _buildList(
            _extractRefereesFromMatches(matches),
            matches,
            fromMatches: true,
          ),
        );
      },
      data: (referees) {
        if (referees.isNotEmpty) {
          return matchesAsync.when(
            loading: () => _buildList(referees, const []),
            error: (_, __) => _buildList(referees, const []),
            data: (matches) => _buildList(referees, matches),
          );
        }
        // Fallback: extract from match data (older tournaments)
        return matchesAsync.when(
          loading: () => const LoadingSkeleton(itemHeight: 60),
          error: (_, __) => const EmptyState(
            icon: Icons.people_outline,
            title: 'No officials assigned',
            subtitle: 'Officials will appear once referees are designated',
          ),
          data: (matches) {
            final fromMatches = _extractRefereesFromMatches(matches);
            if (fromMatches.isEmpty) {
              return const EmptyState(
                icon: Icons.people_outline,
                title: 'No officials assigned',
                subtitle: 'Officials will appear once referees are designated',
              );
            }
            return _buildList(fromMatches, matches, fromMatches: true);
          },
        );
      },
    );
  }

  Widget _buildList(
    List<EventReferee> referees,
    List<BeachMatch> matches, {
    bool fromMatches = false,
  }) {
    // Final deduplication by normalized name
    final seen = <String>{};
    final deduped = referees.where((r) {
      final key = r.fullName.trim().toLowerCase();
      return seen.add(key);
    }).toList();

    final refs = deduped.where((r) => !r.isChallengeReferee).toList()
      ..sort((a, b) => a.lastName.compareTo(b.lastName));
    final challengeRefs = deduped.where((r) => r.isChallengeReferee).toList()
      ..sort((a, b) => a.lastName.compareTo(b.lastName));

    // Pre-compute stats for all referees at once
    final statsMap = RefereeStatsCalculator.computeAll(deduped, matches);

    return RefreshIndicator(
      color: AppColors.accent,
      onRefresh: () async {
        widget.ref.invalidate(matchListProvider(widget.visNo));
        widget.ref.invalidate(eventRefereeListProvider(widget.visNo));
        await Future.wait([
          widget.ref.read(matchListProvider(widget.visNo).future),
          widget.ref.read(eventRefereeListProvider(widget.visNo).future),
        ]);
      },
      child: ListView(
        padding: const EdgeInsets.only(top: 8, bottom: AppSpacing.xxl),
        children: [
          if (fromMatches)
            const Padding(
              padding: EdgeInsets.fromLTRB(16, 8, 16, 8),
              child: Text(
                'Extracted from match assignments',
                style: TextStyle(
                  fontSize: 12,
                  fontStyle: FontStyle.italic,
                  color: AppColors.textTertiary,
                ),
              ),
            ),
          // Referees section
          if (refs.isNotEmpty)
            _buildAccordion(
              title: 'Referees',
              count: refs.length,
              icon: Icons.sports,
              expanded: _refereesExpanded,
              onTap: () => setState(() => _refereesExpanded = !_refereesExpanded),
              officials: refs,
              statsMap: statsMap,
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
              statsMap: statsMap,
            ),
        ],
      ),
    );
  }

  Widget _buildAccordion({
    required String title,
    required int count,
    required IconData icon,
    required bool expanded,
    required VoidCallback onTap,
    required List<EventReferee> officials,
    required Map<String, RefereeMatchStats> statsMap,
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
              border: const Border(
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
        // Accordion body: referee cards
        if (expanded)
          ...officials.map((official) {
            final key = RefereeStatsCalculator.refereeKey(official);
            final stats = statsMap[key] ?? RefereeMatchStats.empty;
            return RefereeCard(
              referee: official,
              stats: stats,
              isExpanded: _expandedRefereeKey == key,
              onTap: () => setState(() {
                _expandedRefereeKey =
                    _expandedRefereeKey == key ? null : key;
              }),
            );
          }),
      ],
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
