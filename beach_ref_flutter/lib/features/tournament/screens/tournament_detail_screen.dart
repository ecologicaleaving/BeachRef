import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../../core/theme/app_theme.dart';
import '../../../shared/widgets/offline_banner.dart';
import '../../match/providers/match_providers.dart';
import '../providers/tournament_providers.dart';
import '../widgets/filter_bar.dart';
import '../widgets/officials_tab.dart';
import '../widgets/schedule_tab.dart';
import '../widgets/tournament_header.dart';

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
          onPressed: () => context.go('/tournaments'),
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
                '$displayCity${displayDateRange != null ? ' \u2022 $displayDateRange' : ''}',
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
            TournamentHeader(
              city: tournament.displayCity,
              dateRange: tournament.dateRange,
              countryCode: tournament.countryCode,
              genderText: tournament.genderText,
            )
          else if (displayCountryCode != null)
            TournamentHeader(
              city: displayCity ?? '',
              dateRange: displayDateRange ?? '',
              countryCode: displayCountryCode,
              genderText: displayGender ?? 'MX',
            ),

          // Filter panel (collapsible)
          if (_showFilters)
            FilterBar(
              courtFilter: _courtFilter,
              onCourtChanged: (c) => setState(() => _courtFilter = c),
            ),

          // Tab content
          Expanded(
            child: _activeTab == 0
                ? ScheduleTab(
                    visNo: widget.visNo,
                    groupedMatches: groupedMatches,
                    courtFilter: _courtFilter,
                    ref: ref,
                  )
                : OfficialsTab(visNo: widget.visNo, ref: ref),
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
