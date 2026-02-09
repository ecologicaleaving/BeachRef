import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:hive/hive.dart';
import '../../../core/theme/app_theme.dart';
import '../../../shared/widgets/empty_state.dart';
import '../../../shared/widgets/loading_skeleton.dart';
import '../../../shared/widgets/navigation_header.dart';
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

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  /// Current month key (e.g. "February 2026")
  String get _currentMonthKey {
    final now = DateTime.now();
    const months = [
      '', 'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December',
    ];
    return '${months[now.month]} ${now.year}';
  }

  @override
  Widget build(BuildContext context) {
    final groupedAsync = ref.watch(groupedTournamentsProvider);
    final gender = ref.watch(genderFilterProvider);

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

          // Tournament list with season/month accordion
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

                final currentMonth = _currentMonthKey;

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

                final currentYear = DateTime.now().year.toString();

                return RefreshIndicator(
                  color: AppColors.accent,
                  onRefresh: () async {
                    ref.invalidate(tournamentsProvider);
                    await ref.read(tournamentsProvider.future);
                  },
                  child: ListView.builder(
                    padding: const EdgeInsets.only(bottom: AppSpacing.xxl),
                    itemCount: sortedYears.length,
                    itemBuilder: (context, index) {
                      final year = sortedYears[index];
                      final monthsMap = byYear[year]!;
                      final totalCount = monthsMap.values.fold<int>(
                        0, (sum, list) => sum + list.length,
                      );
                      final isCurrentYear = year == currentYear;

                      return _SeasonPanel(
                        year: year,
                        totalCount: totalCount,
                        monthsMap: monthsMap,
                        initiallyExpanded: isCurrentYear,
                        currentMonthKey: currentMonth,
                        onTournamentTap: _selectTournament,
                      );
                    },
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

/// Dark season header panel (e.g. "Season 2026")
class _SeasonPanel extends StatefulWidget {
  final String year;
  final int totalCount;
  final Map<String, List> monthsMap;
  final bool initiallyExpanded;
  final String currentMonthKey;
  final void Function(Tournament tournament) onTournamentTap;

  const _SeasonPanel({
    required this.year,
    required this.totalCount,
    required this.monthsMap,
    required this.initiallyExpanded,
    required this.currentMonthKey,
    required this.onTournamentTap,
  });

  @override
  State<_SeasonPanel> createState() => _SeasonPanelState();
}

class _SeasonPanelState extends State<_SeasonPanel> {
  late bool _expanded;
  String? _openMonthKey;

  @override
  void initState() {
    super.initState();
    _expanded = widget.initiallyExpanded;
    // Default open month = current month if season is expanded
    if (_expanded) {
      _openMonthKey = widget.monthsMap.keys
          .where((k) => k == widget.currentMonthKey)
          .firstOrNull;
      // If current month not in this season, open first month
      _openMonthKey ??= widget.monthsMap.keys.firstOrNull;
    }
  }

  void _toggleMonth(String monthKey) {
    setState(() {
      if (_openMonthKey == monthKey) {
        _openMonthKey = null; // close if already open
      } else {
        _openMonthKey = monthKey; // open this, close others
      }
    });
  }

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        // Season header (dark titanium, gold border)
        GestureDetector(
          onTap: () => setState(() => _expanded = !_expanded),
          child: Container(
            margin: const EdgeInsets.only(top: 20, left: 16, right: 16),
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 16),
            decoration: BoxDecoration(
              color: _expanded ? AppColors.primaryHover : AppColors.primary,
              borderRadius: BorderRadius.circular(8),
              border: const Border(
                bottom: BorderSide(color: AppColors.accent, width: 2),
              ),
              boxShadow: [
                BoxShadow(
                  color: Colors.black.withValues(alpha: _expanded ? 0.15 : 0.1),
                  offset: const Offset(0, 2),
                  blurRadius: 4,
                ),
              ],
            ),
            child: Row(
              children: [
                Expanded(
                  child: Text(
                    'Season ${widget.year}',
                    style: const TextStyle(
                      fontSize: 18,
                      fontWeight: FontWeight.w700,
                      color: Colors.white,
                    ),
                  ),
                ),
                Text(
                  '${widget.totalCount} tournaments',
                  style: TextStyle(
                    fontSize: 13,
                    fontWeight: FontWeight.w500,
                    color: Colors.white.withValues(alpha: 0.7),
                  ),
                ),
                const SizedBox(width: 8),
                Text(
                  _expanded ? '\u25BC' : '\u25B6',
                  style: TextStyle(
                    fontSize: 14,
                    fontWeight: FontWeight.w600,
                    color: Colors.white.withValues(alpha: 0.7),
                  ),
                ),
              ],
            ),
          ),
        ),

        // Month panels inside season (exclusive accordion)
        if (_expanded)
          ...widget.monthsMap.entries.map((entry) {
            final monthKey = entry.key;
            final tournaments = entry.value;

            return _MonthPanel(
              monthKey: monthKey,
              tournaments: tournaments,
              isExpanded: _openMonthKey == monthKey,
              onToggle: () => _toggleMonth(monthKey),
              onTournamentTap: widget.onTournamentTap,
            );
          }),
      ],
    );
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
                Text(
                  isExpanded ? '\u25BC' : '\u25B6',
                  style: const TextStyle(
                    fontSize: 14,
                    fontWeight: FontWeight.w600,
                    color: AppColors.textSecondary,
                  ),
                ),
              ],
            ),
          ),
        ),

        // Tournament cards
        if (isExpanded)
          ...tournaments.map((tournament) => TournamentCard(
                tournament: tournament,
                onTap: () => onTournamentTap(tournament as Tournament),
              )),
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
