import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:hive/hive.dart';
import '../../../core/theme/app_theme.dart';
import '../../../shared/widgets/empty_state.dart';
import '../../../shared/widgets/loading_skeleton.dart';
import '../../../shared/widgets/offline_banner.dart';
import '../providers/tournament_providers.dart';
import '../models/tournament.dart';
import '../widgets/tournament_card.dart';

/// Tournament browsing and selection screen
/// Matches webapp: dark header, season accordion, month accordion, filter panel
class TournamentSelectionScreen extends ConsumerStatefulWidget {
  const TournamentSelectionScreen({super.key});

  @override
  ConsumerState<TournamentSelectionScreen> createState() =>
      _TournamentSelectionScreenState();
}

class _TournamentSelectionScreenState
    extends ConsumerState<TournamentSelectionScreen> {
  final _searchController = TextEditingController();
  bool _showFilters = false;

  // Accordion state: only one season and one month open at a time
  String? _openSeasonYear;
  String? _openMonthKey;

  // GlobalKeys for scroll-to on open
  final Map<String, GlobalKey> _seasonKeys = {};
  final Map<String, GlobalKey> _monthKeys = {};

  // Track whether we've done the initial scroll to current month
  bool _didInitialScroll = false;

  @override
  void initState() {
    super.initState();
    _openSeasonYear = DateTime.now().year.toString();
    // Don't set _openMonthKey here — we'll set it from actual data on first load
  }

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  GlobalKey _seasonKeyFor(String year) {
    return _seasonKeys.putIfAbsent(year, () => GlobalKey());
  }

  GlobalKey _monthKeyFor(String monthKey) {
    return _monthKeys.putIfAbsent(monthKey, () => GlobalKey());
  }

  void _toggleSeason(String year, {String? firstMonthKey}) {
    final opening = _openSeasonYear != year;
    setState(() {
      if (opening) {
        _openSeasonYear = year;
        _openMonthKey = null;
      } else {
        _openSeasonYear = null;
        _openMonthKey = null;
      }
    });
    // Scroll immediately after frame builds — season header pins at top,
    // first month appears right below
    if (opening && firstMonthKey != null) {
      WidgetsBinding.instance.addPostFrameCallback((_) {
        _scrollToKey(_monthKeyFor(firstMonthKey), fast: true);
      });
    }
  }

  void _toggleMonth(String monthKey) {
    final opening = _openMonthKey != monthKey;
    setState(() {
      _openMonthKey = opening ? monthKey : null;
    });
    if (opening) {
      // Small delay for month content to start expanding
      Future.delayed(const Duration(milliseconds: 80), () {
        if (!mounted) return;
        _scrollToKey(_monthKeyFor(monthKey), fast: false);
      });
    }
  }

  void _scrollToKey(GlobalKey key, {bool fast = false}) {
    final ctx = key.currentContext;
    if (ctx != null) {
      Scrollable.ensureVisible(
        ctx,
        alignment: 0.0,
        duration: Duration(milliseconds: fast ? 200 : 300),
        curve: Curves.easeInOut,
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    final groupedAsync = ref.watch(groupedTournamentsProvider);
    final gender = ref.watch(genderFilterProvider);
    final scaffoldBg = Theme.of(context).scaffoldBackgroundColor;

    return Scaffold(
      appBar: AppBar(
        backgroundColor: AppColors.primary,
        foregroundColor: Colors.white,
        title: const Text(
          'Tournament Selection',
          style: TextStyle(fontSize: 18, fontWeight: FontWeight.w700),
        ),
        centerTitle: true,
        automaticallyImplyLeading: false,
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

          // Collapsible filter panel
          AnimatedCrossFade(
            firstChild: const SizedBox.shrink(),
            secondChild: _FilterPanel(
              searchController: _searchController,
              selectedGender: gender,
              onGenderChanged: (g) =>
                  ref.read(genderFilterProvider.notifier).state = g,
              onSearchChanged: (q) =>
                  ref.read(searchQueryProvider.notifier).state = q,
              onReset: () {
                _searchController.clear();
                ref.read(searchQueryProvider.notifier).state = '';
                ref.read(genderFilterProvider.notifier).state = null;
              },
              onClose: () => setState(() => _showFilters = false),
            ),
            crossFadeState: _showFilters
                ? CrossFadeState.showSecond
                : CrossFadeState.showFirst,
            duration: const Duration(milliseconds: 200),
          ),

          // Tournament list with pinned season headers
          Expanded(
            child: groupedAsync.when(
              loading: () => const LoadingSkeleton(),
              error: (error, _) => EmptyState(
                icon: Icons.error_outline,
                title: 'Failed to load tournaments',
                subtitle: error.toString(),
                actionLabel: 'Retry',
                onAction: () => ref.invalidate(tournamentsProvider),
              ),
              data: (grouped) {
                if (grouped.isEmpty) {
                  return const EmptyState(
                    icon: Icons.sports_volleyball,
                    title: 'No tournaments found',
                    subtitle: 'Try changing filters or search query',
                  );
                }

                // Group months by year (season)
                final byYear = <String, Map<String, List>>{};
                for (final entry in grouped.entries) {
                  final parts = entry.key.split(' ');
                  final year = parts.length == 2 ? parts[1] : '';
                  byYear.putIfAbsent(year, () => {});
                  byYear[year]![entry.key] = entry.value;
                }

                // Sort years descending
                final sortedYears = byYear.keys.toList()
                  ..sort((a, b) => b.compareTo(a));

                // On first data load, align to the first month of the open season
                if (!_didInitialScroll && _openSeasonYear != null) {
                  _didInitialScroll = true;
                  final seasonMonths = byYear[_openSeasonYear];
                  if (seasonMonths != null && seasonMonths.isNotEmpty) {
                    final firstMonth = seasonMonths.keys.first;
                    WidgetsBinding.instance.addPostFrameCallback((_) {
                      if (!mounted) return;
                      _scrollToKey(_monthKeyFor(firstMonth), fast: true);
                    });
                  }
                }

                // Build slivers: pinned season header + month content
                final slivers = <Widget>[];
                for (final year in sortedYears) {
                  final monthsMap = byYear[year]!;
                  final totalCount = monthsMap.values.fold<int>(
                    0, (sum, list) => sum + list.length,
                  );
                  final isExpanded = _openSeasonYear == year;

                  // Pinned season header (stays at top while scrolling months)
                  slivers.add(
                    SliverPersistentHeader(
                      key: _seasonKeyFor(year),
                      pinned: isExpanded,
                      delegate: _SeasonHeaderDelegate(
                        year: year,
                        totalCount: totalCount,
                        isExpanded: isExpanded,
                        onToggle: () => _toggleSeason(year, firstMonthKey: monthsMap.keys.first),
                        backgroundColor: scaffoldBg,
                      ),
                    ),
                  );

                  // Month panels (animated expand/collapse)
                  slivers.add(
                    SliverToBoxAdapter(
                      child: AnimatedSize(
                        duration: const Duration(milliseconds: 250),
                        curve: Curves.easeInOut,
                        clipBehavior: Clip.hardEdge,
                        child: isExpanded
                            ? Column(
                                children: monthsMap.entries.map((entry) {
                                  final monthKey = entry.key;
                                  final tournaments = entry.value;
                                  return _MonthPanel(
                                    key: _monthKeyFor(monthKey),
                                    monthKey: monthKey,
                                    tournaments: tournaments,
                                    isExpanded: _openMonthKey == monthKey,
                                    onToggle: () => _toggleMonth(monthKey),
                                    onTournamentTap: _selectTournament,
                                  );
                                }).toList(),
                              )
                            : const SizedBox.shrink(),
                      ),
                    ),
                  );
                }

                // Bottom padding
                slivers.add(
                  const SliverToBoxAdapter(
                    child: SizedBox(height: 64),
                  ),
                );

                return RefreshIndicator(
                  color: AppColors.accent,
                  onRefresh: () async {
                    ref.invalidate(tournamentsProvider);
                    await ref.read(tournamentsProvider.future);
                  },
                  child: CustomScrollView(
                    physics: const AlwaysScrollableScrollPhysics(),
                    slivers: slivers,
                  ),
                );
              },
            ),
          ),
        ],
      ),
    );
  }

  void _selectTournament(Tournament tournament) {
    final visNo = tournament.no;
    ref.read(selectedTournamentProvider.notifier).state = visNo;
    try {
      Hive.box('app_settings').put('defaultTournament', visNo);
    } catch (_) {}

    final params = <String, String>{};
    if (tournament.name.isNotEmpty) {
      params['name'] = tournament.name;
    }
    final city = tournament.displayCity;
    if (city.isNotEmpty) params['city'] = city;
    if (tournament.countryCode.isNotEmpty) {
      params['country'] = tournament.countryCode;
    }
    final dates = tournament.dateRange;
    if (dates.isNotEmpty) params['dates'] = dates;
    final gender = tournament.genderText;
    if (gender.isNotEmpty) params['gender'] = gender;

    final query = params.entries
        .map((e) => '${e.key}=${Uri.encodeComponent(e.value)}')
        .join('&');
    final path = query.isEmpty
        ? '/tournament/$visNo'
        : '/tournament/$visNo?$query';
    context.push(path);
  }
}

/// Pinned season header delegate for SliverPersistentHeader
class _SeasonHeaderDelegate extends SliverPersistentHeaderDelegate {
  final String year;
  final int totalCount;
  final bool isExpanded;
  final VoidCallback onToggle;
  final Color backgroundColor;

  static const double headerHeight = 64.0;

  _SeasonHeaderDelegate({
    required this.year,
    required this.totalCount,
    required this.isExpanded,
    required this.onToggle,
    required this.backgroundColor,
  });

  @override
  double get maxExtent => headerHeight;

  @override
  double get minExtent => headerHeight;

  @override
  Widget build(BuildContext context, double shrinkOffset, bool overlapsContent) {
    return GestureDetector(
      onTap: onToggle,
      behavior: HitTestBehavior.opaque,
      child: Container(
        color: backgroundColor,
        padding: const EdgeInsets.fromLTRB(16, 4, 16, 4),
        child: Container(
          padding: const EdgeInsets.symmetric(horizontal: 16),
          alignment: Alignment.centerLeft,
          decoration: BoxDecoration(
            color: isExpanded ? AppColors.primaryHover : AppColors.primary,
            borderRadius: BorderRadius.circular(8),
            border: const Border(
              bottom: BorderSide(color: AppColors.accent, width: 2),
            ),
            boxShadow: [
              BoxShadow(
                color: Colors.black.withValues(alpha: isExpanded ? 0.15 : 0.1),
                offset: const Offset(0, 2),
                blurRadius: 4,
              ),
            ],
          ),
          child: Row(
            children: [
              Expanded(
                child: Text(
                  'Season $year',
                  style: const TextStyle(
                    fontSize: 18,
                    fontWeight: FontWeight.w700,
                    color: Colors.white,
                  ),
                ),
              ),
              Text(
                '$totalCount tournaments',
                style: TextStyle(
                  fontSize: 13,
                  fontWeight: FontWeight.w500,
                  color: Colors.white.withValues(alpha: 0.7),
                ),
              ),
              const SizedBox(width: 8),
              AnimatedRotation(
                turns: isExpanded ? 0.25 : 0.0,
                duration: const Duration(milliseconds: 250),
                curve: Curves.easeInOut,
                child: Icon(
                  Icons.chevron_right,
                  size: 20,
                  color: Colors.white.withValues(alpha: 0.7),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  @override
  bool shouldRebuild(covariant _SeasonHeaderDelegate oldDelegate) {
    return year != oldDelegate.year ||
        totalCount != oldDelegate.totalCount ||
        isExpanded != oldDelegate.isExpanded;
  }
}

/// White month panel (e.g. "February 2026") - controlled by parent
class _MonthPanel extends StatelessWidget {
  final String monthKey;
  final List tournaments;
  final bool isExpanded;
  final VoidCallback onToggle;
  final void Function(Tournament tournament) onTournamentTap;

  const _MonthPanel({
    super.key,
    required this.monthKey,
    required this.tournaments,
    required this.isExpanded,
    required this.onToggle,
    required this.onTournamentTap,
  });

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        // Month header (white/light, subtle border)
        GestureDetector(
          onTap: onToggle,
          child: Container(
            margin: const EdgeInsets.only(top: 8, left: 16, right: 16),
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
            decoration: BoxDecoration(
              color: isExpanded ? AppColors.background : AppColors.surface,
              borderRadius: BorderRadius.circular(6),
              border: Border(
                bottom: BorderSide(
                  color: isExpanded
                      ? AppColors.secondary
                      : AppColors.borderSubtle,
                  width: 1,
                ),
              ),
              boxShadow: [
                BoxShadow(
                  color: Colors.black.withValues(alpha: isExpanded ? 0.1 : 0.05),
                  offset: const Offset(0, 1),
                  blurRadius: 2,
                ),
              ],
            ),
            child: Row(
              children: [
                Expanded(
                  child: Text(
                    monthKey,
                    style: const TextStyle(
                      fontSize: 15,
                      fontWeight: FontWeight.w600,
                      color: AppColors.textPrimary,
                    ),
                  ),
                ),
                Text(
                  '${tournaments.length}',
                  style: const TextStyle(
                    fontSize: 13,
                    fontWeight: FontWeight.w500,
                    color: AppColors.textSecondary,
                  ),
                ),
                const SizedBox(width: 8),
                AnimatedRotation(
                  turns: isExpanded ? 0.25 : 0.0,
                  duration: const Duration(milliseconds: 250),
                  curve: Curves.easeInOut,
                  child: const Icon(
                    Icons.chevron_right,
                    size: 18,
                    color: AppColors.textSecondary,
                  ),
                ),
              ],
            ),
          ),
        ),

        // Tournament cards (animated expand/collapse)
        AnimatedSize(
          duration: const Duration(milliseconds: 250),
          curve: Curves.easeInOut,
          clipBehavior: Clip.hardEdge,
          child: isExpanded
              ? Column(
                  children: tournaments
                      .map((tournament) => TournamentCard(
                            tournament: tournament,
                            onTap: () =>
                                onTournamentTap(tournament as Tournament),
                          ))
                      .toList(),
                )
              : const SizedBox.shrink(),
        ),
      ],
    );
  }
}

/// Filter panel with search, gender toggle, and action buttons
class _FilterPanel extends StatelessWidget {
  final TextEditingController searchController;
  final String? selectedGender;
  final ValueChanged<String?> onGenderChanged;
  final ValueChanged<String> onSearchChanged;
  final VoidCallback onReset;
  final VoidCallback onClose;

  const _FilterPanel({
    required this.searchController,
    required this.selectedGender,
    required this.onGenderChanged,
    required this.onSearchChanged,
    required this.onReset,
    required this.onClose,
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
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text(
            'Filters',
            style: TextStyle(
              fontSize: 18,
              fontWeight: FontWeight.w600,
              color: AppColors.textNavy,
            ),
          ),
          const SizedBox(height: 12),

          // Search bar
          TextField(
            controller: searchController,
            decoration: InputDecoration(
              hintText: 'Search tournaments...',
              prefixIcon: const Icon(Icons.search, size: 20),
              suffixIcon: searchController.text.isNotEmpty
                  ? IconButton(
                      icon: const Icon(Icons.clear, size: 18),
                      onPressed: () {
                        searchController.clear();
                        onSearchChanged('');
                      },
                    )
                  : null,
              isDense: true,
              contentPadding: const EdgeInsets.symmetric(vertical: 10),
            ),
            onChanged: onSearchChanged,
          ),
          const SizedBox(height: 12),

          // Gender filter buttons
          Row(
            children: [
              _FilterPill(
                label: 'All',
                selected: selectedGender == null,
                onTap: () => onGenderChanged(null),
              ),
              const SizedBox(width: 8),
              _FilterPill(
                label: 'Men',
                selected: selectedGender == 'M',
                onTap: () => onGenderChanged('M'),
              ),
              const SizedBox(width: 8),
              _FilterPill(
                label: 'Women',
                selected: selectedGender == 'W',
                onTap: () => onGenderChanged('W'),
              ),
            ],
          ),
          const SizedBox(height: 16),

          // Action buttons
          Row(
            children: [
              Expanded(
                child: OutlinedButton(
                  onPressed: onReset,
                  style: OutlinedButton.styleFrom(
                    padding: const EdgeInsets.symmetric(vertical: 10),
                  ),
                  child: const Text('Reset', style: TextStyle(fontSize: 14)),
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: ElevatedButton(
                  onPressed: onClose,
                  style: ElevatedButton.styleFrom(
                    padding: const EdgeInsets.symmetric(vertical: 10),
                  ),
                  child: const Text('Save & Close', style: TextStyle(fontSize: 14)),
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }
}

/// Pill-shaped filter button matching webapp style
class _FilterPill extends StatelessWidget {
  final String label;
  final bool selected;
  final VoidCallback onTap;

  const _FilterPill({
    required this.label,
    required this.selected,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
        decoration: BoxDecoration(
          color: selected ? AppColors.filterBlue : Colors.transparent,
          borderRadius: BorderRadius.circular(20),
          border: Border.all(
            color: AppColors.filterBlue,
            width: 1,
          ),
        ),
        child: Text(
          label,
          style: TextStyle(
            fontSize: 12,
            fontWeight: FontWeight.w600,
            color: selected ? Colors.white : AppColors.filterBlue,
          ),
        ),
      ),
    );
  }
}
