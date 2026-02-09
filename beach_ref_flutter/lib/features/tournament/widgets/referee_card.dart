import 'package:flutter/material.dart';
import '../../../core/api/vis_api_client.dart';
import '../../../core/theme/app_theme.dart';
import '../../../shared/widgets/flag_image.dart';
import '../models/referee_match_stats.dart';
import 'compact_match_card.dart';

/// Expandable referee card replicating the webapp UI.
///
/// **Collapsed:** Flag | FedCode | Name | R1:N . R2:N | chevron
/// **Expanded:** Stats table (TOT/R1/R2/M/W) + last 3 matches
class RefereeCard extends StatelessWidget {
  final EventReferee referee;
  final RefereeMatchStats stats;
  final bool isExpanded;
  final VoidCallback onTap;

  const RefereeCard({
    super.key,
    required this.referee,
    required this.stats,
    required this.isExpanded,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 4),
      decoration: BoxDecoration(
        color: AppColors.surface,
        borderRadius: BorderRadius.circular(8),
        border: Border.all(
          color: isExpanded ? AppColors.accent.withValues(alpha: 0.4) : AppColors.borderLight,
        ),
        boxShadow: isExpanded ? AppShadows.matchCard : AppShadows.subtle,
      ),
      clipBehavior: Clip.antiAlias,
      child: Column(
        children: [
          // Collapsed header (always visible)
          _buildHeader(),
          // Expanded content
          if (isExpanded) _buildExpandedContent(),
        ],
      ),
    );
  }

  Widget _buildHeader() {
    return InkWell(
      onTap: onTap,
      child: Padding(
        padding: const EdgeInsets.all(12),
        child: Row(
          children: [
            // Flag
            if (referee.federationCode.isNotEmpty) ...[
              FlagImage(
                countryCode: referee.federationCode,
                width: 28,
                height: 20,
                borderRadius: 4,
              ),
              const SizedBox(width: 8),
              // Federation code
              Text(
                referee.federationCode,
                style: const TextStyle(
                  fontSize: 11,
                  fontWeight: FontWeight.w600,
                  color: AppColors.textTertiary,
                ),
              ),
              const SizedBox(width: 8),
            ],
            // Name
            Expanded(
              child: Text(
                _displayName,
                style: const TextStyle(
                  fontSize: 15,
                  fontWeight: FontWeight.w600,
                  color: AppColors.textNavy,
                ),
                overflow: TextOverflow.ellipsis,
              ),
            ),
            const SizedBox(width: 8),
            // Stats summary or CR badge
            if (referee.isChallengeReferee)
              _buildBadge('CR', AppColors.filterBlue)
            else if (stats.hasMatches) ...[
              _buildStatChip('R1', stats.matchesAsFirst),
              const Padding(
                padding: EdgeInsets.symmetric(horizontal: 4),
                child: Text(
                  '\u00B7',
                  style: TextStyle(
                    fontSize: 14,
                    fontWeight: FontWeight.w700,
                    color: AppColors.textTertiary,
                  ),
                ),
              ),
              _buildStatChip('R2', stats.matchesAsSecond),
            ],
            const SizedBox(width: 6),
            // Chevron
            Icon(
              isExpanded ? Icons.expand_less : Icons.expand_more,
              size: 20,
              color: AppColors.textTertiary,
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildStatChip(String label, int value) {
    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        Text(
          '$label:',
          style: const TextStyle(
            fontSize: 11,
            fontWeight: FontWeight.w500,
            color: AppColors.textTertiary,
          ),
        ),
        Text(
          '$value',
          style: const TextStyle(
            fontSize: 12,
            fontWeight: FontWeight.w700,
            color: AppColors.textNavy,
          ),
        ),
      ],
    );
  }

  Widget _buildBadge(String text, Color color) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.12),
        borderRadius: BorderRadius.circular(12),
      ),
      child: Text(
        text,
        style: TextStyle(
          fontSize: 11,
          fontWeight: FontWeight.w600,
          color: color,
        ),
      ),
    );
  }

  Widget _buildExpandedContent() {
    return Column(
      children: [
        // Divider
        const Divider(height: 1, color: AppColors.borderLight),
        // Stats table (not for challenge referees)
        if (!referee.isChallengeReferee && stats.hasMatches) ...[
          _buildStatsTable(),
          const Divider(height: 1, color: AppColors.borderLight),
        ],
        // Recent matches
        if (stats.recentMatches.isNotEmpty) ...[
          _buildRecentMatchesSection(),
        ] else ...[
          Padding(
            padding: const EdgeInsets.all(16),
            child: Text(
              referee.isChallengeReferee
                  ? 'Challenge referee match data not available'
                  : 'No match assignments yet',
              style: const TextStyle(
                fontSize: 13,
                fontStyle: FontStyle.italic,
                color: AppColors.textTertiary,
              ),
            ),
          ),
        ],
      ],
    );
  }

  Widget _buildStatsTable() {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
      child: Row(
        children: [
          _buildStatColumn('TOT', stats.totalMatches, AppColors.textNavy),
          _buildStatColumn('R1', stats.matchesAsFirst, AppColors.accent),
          _buildStatColumn('R2', stats.matchesAsSecond, AppColors.accent),
          _buildStatColumn('M', stats.menMatches, const Color(0xFF1E40AF)),
          _buildStatColumn('W', stats.womenMatches, const Color(0xFF9D174D)),
        ],
      ),
    );
  }

  Widget _buildStatColumn(String label, int value, Color valueColor) {
    return Expanded(
      child: Column(
        children: [
          Text(
            label,
            style: const TextStyle(
              fontSize: 11,
              fontWeight: FontWeight.w600,
              color: AppColors.textTertiary,
            ),
          ),
          const SizedBox(height: 4),
          Text(
            '$value',
            style: TextStyle(
              fontSize: 18,
              fontWeight: FontWeight.w700,
              color: valueColor,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildRecentMatchesSection() {
    return Padding(
      padding: const EdgeInsets.fromLTRB(12, 8, 12, 12),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Padding(
            padding: const EdgeInsets.only(left: 4, bottom: 8),
            child: Text(
              'Last ${stats.recentMatches.length} ${stats.recentMatches.length == 1 ? 'match' : 'matches'}',
              style: const TextStyle(
                fontSize: 12,
                fontWeight: FontWeight.w600,
                color: AppColors.textTertiary,
              ),
            ),
          ),
          ...stats.recentMatches.map(
            (rm) => CompactMatchCard(
              recentMatch: rm,
              highlightFederationCode: referee.federationCode,
              highlightLastName: referee.lastName,
            ),
          ),
        ],
      ),
    );
  }

  String get _displayName {
    if (referee.firstName.isNotEmpty && referee.lastName.isNotEmpty) {
      return '${referee.firstName} ${referee.lastName}';
    }
    return referee.lastName.isNotEmpty ? referee.lastName : referee.fullName;
  }
}
