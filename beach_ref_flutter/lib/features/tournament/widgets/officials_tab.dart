import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../core/theme/app_theme.dart';
import '../../../core/api/vis_api_client.dart';
import '../../../shared/widgets/empty_state.dart';
import '../../../shared/widgets/loading_skeleton.dart';
import '../../match/models/beach_match.dart';
import '../../match/providers/match_providers.dart';
import '../models/referee_match_stats.dart';
import '../services/referee_extractor.dart';
import '../services/referee_stats_calculator.dart';
import '../widgets/referee_card.dart';

/// Officials tab — uses GetEventRefereeList API to show all assigned referees
/// grouped by type (Referee / Challenge Referee) in expandable accordion sections.
/// Each referee card shows tournament stats (TOT/R1/R2/M/W) and last 3 matches.
class OfficialsTab extends StatefulWidget {
  final String visNo;
  final WidgetRef ref;

  const OfficialsTab({super.key, required this.visNo, required this.ref});

  @override
  State<OfficialsTab> createState() => _OfficialsTabState();
}

class _OfficialsTabState extends State<OfficialsTab> {
  bool _refereesExpanded = true;
  bool _challengeExpanded = true;
  String? _expandedRefereeKey;

  @override
  Widget build(BuildContext context) {
    final refereesAsync = widget.ref.watch(eventRefereeListProvider(widget.visNo));
    final matchesAsync = widget.ref.watch(matchListProvider(widget.visNo));

    return refereesAsync.when(
      loading: () => const LoadingSkeleton(itemHeight: 60),
      error: (error, _) {
        return matchesAsync.when(
          loading: () => const LoadingSkeleton(itemHeight: 60),
          error: (e, _) => EmptyState(
            icon: Icons.error_outline,
            title: 'Failed to load officials',
            subtitle: e.toString(),
          ),
          data: (matches) => _buildList(
            RefereeExtractor.fromMatches(matches),
            matches,
            fromMatches: true,
          ),
        );
      },
      data: (referees) {
        if (referees.isNotEmpty) {
          return matchesAsync.when(
            loading: () => _buildList(referees, const []),
            error: (_, _) => _buildList(referees, const []),
            data: (matches) => _buildList(referees, matches),
          );
        }
        return matchesAsync.when(
          loading: () => const LoadingSkeleton(itemHeight: 60),
          error: (_, _) => const EmptyState(
            icon: Icons.people_outline,
            title: 'No officials assigned',
            subtitle: 'Officials will appear once referees are designated',
          ),
          data: (matches) {
            final fromMatches = RefereeExtractor.fromMatches(matches);
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
    // Pass 1: exact dedup by deduplicationKey (format variants)
    final seen = <String>{};
    final exactDeduped = referees.where((r) {
      return seen.add(r.deduplicationKey);
    }).toList();

    // Pass 2: fuzzy merge within same federation (typos, Levenshtein ≤ 2)
    final deduped = _fuzzyMerge(exactDeduped);

    final refs = deduped.where((r) => !r.isChallengeReferee).toList()
      ..sort((a, b) => a.lastName.compareTo(b.lastName));
    final challengeRefs = deduped.where((r) => r.isChallengeReferee).toList()
      ..sort((a, b) => a.lastName.compareTo(b.lastName));

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

  /// Fuzzy merge: within same federation, if two referees have
  /// Levenshtein distance ≤ 2 on their core name, keep only the one
  /// with the longer firstName (more data).
  static List<EventReferee> _fuzzyMerge(List<EventReferee> referees) {
    // Group by federation
    final byFed = <String, List<EventReferee>>{};
    for (final r in referees) {
      final fed = r.federationCode.trim().toLowerCase();
      byFed.putIfAbsent(fed, () => []).add(r);
    }

    final result = <EventReferee>[];
    for (final group in byFed.values) {
      final absorbed = <int>{};
      for (var i = 0; i < group.length; i++) {
        if (absorbed.contains(i)) continue;
        final a = group[i].deduplicationKey.split('|').first;
        for (var j = i + 1; j < group.length; j++) {
          if (absorbed.contains(j)) continue;
          final b = group[j].deduplicationKey.split('|').first;
          if (_levenshtein(a, b) <= 2) {
            // Absorb the shorter/less-informed entry
            absorbed.add(
              group[i].firstName.length >= group[j].firstName.length ? j : i,
            );
          }
        }
        if (!absorbed.contains(i)) result.add(group[i]);
      }
    }
    return result;
  }

  static int _levenshtein(String a, String b) {
    if (a == b) return 0;
    if (a.isEmpty) return b.length;
    if (b.isEmpty) return a.length;
    if ((a.length - b.length).abs() > 2) return 3;

    final prev = List<int>.generate(b.length + 1, (i) => i);
    final curr = List<int>.filled(b.length + 1, 0);

    for (var i = 1; i <= a.length; i++) {
      curr[0] = i;
      for (var j = 1; j <= b.length; j++) {
        final cost = a[i - 1] == b[j - 1] ? 0 : 1;
        curr[j] = [curr[j - 1] + 1, prev[j] + 1, prev[j - 1] + cost]
            .reduce((a, b) => a < b ? a : b);
      }
      prev.setAll(0, curr);
    }
    return curr[b.length];
  }
}
