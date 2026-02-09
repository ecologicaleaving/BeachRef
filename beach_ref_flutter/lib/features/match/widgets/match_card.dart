import 'package:flutter/material.dart';
import '../../../core/theme/app_theme.dart';
import '../../../shared/widgets/flag_image.dart';
import '../../../shared/widgets/status_badge.dart';
import '../models/beach_match.dart';

/// Match card matching webapp MatchCard component:
/// - Gender strip (4px top, blue/pink)
/// - Match header: #number + gender symbol + court | time + date
/// - Team rows with winner highlighting (gold accent)
/// - "vs" separator
/// - Referee section with border
class MatchCard extends StatelessWidget {
  final BeachMatch match;
  final VoidCallback? onTap;

  const MatchCard({super.key, required this.match, this.onTap});

  @override
  Widget build(BuildContext context) {
    final isFinished = match.isFinished;
    final teamAWins = isFinished &&
        (match.matchPointsA ?? 0) > (match.matchPointsB ?? 0);
    final teamBWins = isFinished &&
        (match.matchPointsB ?? 0) > (match.matchPointsA ?? 0);

    return GestureDetector(
      onTap: onTap,
      child: Container(
        margin: const EdgeInsets.only(bottom: 12, left: 16, right: 16),
        decoration: BoxDecoration(
          color: AppColors.surface,
          borderRadius: BorderRadius.circular(AppSpacing.borderRadiusLg),
          border: Border.all(color: AppColors.borderLight),
          boxShadow: AppShadows.matchCard,
        ),
        clipBehavior: Clip.antiAlias,
        child: Column(
          children: [
            // Gender strip (4px)
            Container(
              height: 4,
              color: _genderStripColor,
            ),

            Padding(
              padding: const EdgeInsets.all(16),
              child: Column(
                children: [
                  // Match header
                  _MatchHeader(match: match),

                  const SizedBox(height: 12),

                  // Team A
                  _TeamRow(
                    name: match.teamAName,
                    federationCode: match.teamAFederationCode,
                    score: match.matchPointsA,
                    isWinner: teamAWins,
                  ),

                  // "vs" separator
                  const Padding(
                    padding: EdgeInsets.symmetric(vertical: 4),
                    child: Text(
                      'vs',
                      textAlign: TextAlign.center,
                      style: TextStyle(
                        fontSize: 12,
                        fontWeight: FontWeight.w500,
                        color: AppColors.textSecondary,
                      ),
                    ),
                  ),

                  // Team B
                  _TeamRow(
                    name: match.teamBName,
                    federationCode: match.teamBFederationCode,
                    score: match.matchPointsB,
                    isWinner: teamBWins,
                  ),

                  // Set scores (if available)
                  if (match.setScores.isNotEmpty) ...[
                    const SizedBox(height: 8),
                    _SetScoresRow(setScores: match.setScores),
                  ],

                  // Referee section
                  if (match.referee1Name.isNotEmpty) ...[
                    const SizedBox(height: 12),
                    Container(
                      decoration: const BoxDecoration(
                        border: Border(
                          top: BorderSide(color: AppColors.borderLight),
                        ),
                      ),
                      padding: const EdgeInsets.only(top: 12),
                      child: Column(
                        children: [
                          _RefereeRow(
                            label: '1\u00B0',
                            name: match.referee1Name,
                            federationCode: match.referee1FederationCode,
                          ),
                          if (match.referee2Name.isNotEmpty) ...[
                            const SizedBox(height: 4),
                            _RefereeRow(
                              label: '2\u00B0',
                              name: match.referee2Name,
                              federationCode: match.referee2FederationCode,
                            ),
                          ],
                        ],
                      ),
                    ),
                  ],
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  /// Webapp style: black band for W, subtle gray for M
  Color get _genderStripColor {
    if (match.gender == 'W') return AppColors.primary;
    return AppColors.borderLight;
  }
}

class _MatchHeader extends StatelessWidget {
  final BeachMatch match;

  const _MatchHeader({required this.match});

  @override
  Widget build(BuildContext context) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: [
        // Left: match number + court
        Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Text(
                  '#${match.noInTournament.isNotEmpty ? match.noInTournament : match.no}',
                  style: const TextStyle(
                    fontSize: 16,
                    fontWeight: FontWeight.w700,
                    color: AppColors.textNavy,
                  ),
                ),
                const SizedBox(width: 6),
                StatusBadge(status: match.displayStatus, fontSize: 10),
              ],
            ),
            if (match.court.isNotEmpty)
              Text(
                'C${match.court}',
                style: const TextStyle(
                  fontSize: 14,
                  color: AppColors.textSecondary,
                ),
              ),
          ],
        ),

        // Right: time + date
        Column(
          crossAxisAlignment: CrossAxisAlignment.end,
          children: [
            if (match.timeDisplay.isNotEmpty)
              Text(
                match.timeDisplay,
                style: const TextStyle(
                  fontSize: 16,
                  fontWeight: FontWeight.w700,
                  color: AppColors.textNavy,
                ),
              ),
            if (match.localDate.isNotEmpty)
              Text(
                _formatDate(match.localDate),
                style: const TextStyle(
                  fontSize: 14,
                  color: AppColors.textSecondary,
                ),
              ),
          ],
        ),
      ],
    );
  }

  String _formatDate(String dateStr) {
    try {
      final dt = DateTime.parse(dateStr);
      const months = [
        '', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
        'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
      ];
      return '${months[dt.month]} ${dt.day}';
    } catch (_) {
      return dateStr;
    }
  }
}

class _TeamRow extends StatelessWidget {
  final String name;
  final String federationCode;
  final int? score;
  final bool isWinner;

  const _TeamRow({
    required this.name,
    required this.federationCode,
    required this.score,
    required this.isWinner,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
      decoration: BoxDecoration(
        color: isWinner ? AppColors.winnerBg : Colors.transparent,
        border: isWinner
            ? Border.all(color: AppColors.winnerAccent, width: 1)
            : null,
        borderRadius: BorderRadius.circular(8),
      ),
      child: Row(
        children: [
          Expanded(
            child: Row(
              children: [
                Text(
                  name,
                  style: TextStyle(
                    fontSize: 15,
                    fontWeight: FontWeight.w500,
                    color: isWinner ? AppColors.winnerAccent : AppColors.textNavy,
                  ),
                ),
                if (federationCode.isNotEmpty) ...[
                  const SizedBox(width: 8),
                  FlagImage(countryCode: federationCode, width: 16, height: 11),
                  const SizedBox(width: 4),
                  Text(
                    '($federationCode)',
                    style: const TextStyle(
                      fontSize: 12,
                      color: AppColors.textSecondary,
                    ),
                  ),
                ],
              ],
            ),
          ),
          if (score != null)
            Text(
              '$score',
              style: TextStyle(
                fontSize: 18,
                fontWeight: FontWeight.w700,
                color: isWinner ? AppColors.winnerAccent : AppColors.textNavy,
              ),
            ),
        ],
      ),
    );
  }
}

class _SetScoresRow extends StatelessWidget {
  final List<SetScore> setScores;

  const _SetScoresRow({required this.setScores});

  @override
  Widget build(BuildContext context) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.center,
      children: [
        for (int i = 0; i < setScores.length; i++) ...[
          if (i > 0) const SizedBox(width: 12),
          Text(
            '${setScores[i].teamA}-${setScores[i].teamB}',
            style: const TextStyle(
              fontSize: 12,
              fontWeight: FontWeight.w500,
              color: AppColors.textSecondary,
            ),
          ),
        ],
      ],
    );
  }
}

class _RefereeRow extends StatelessWidget {
  final String label;
  final String name;
  final String federationCode;

  const _RefereeRow({
    required this.label,
    required this.name,
    required this.federationCode,
  });

  @override
  Widget build(BuildContext context) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: [
        Text(
          '$label $name',
          style: const TextStyle(
            fontSize: 14,
            color: AppColors.textPrimary,
          ),
        ),
        if (federationCode.isNotEmpty)
          Row(
            children: [
              FlagImage(countryCode: federationCode, width: 16, height: 11),
              const SizedBox(width: 4),
              Text(
                '($federationCode)',
                style: const TextStyle(
                  fontSize: 12,
                  color: AppColors.textSecondary,
                ),
              ),
            ],
          ),
      ],
    );
  }
}
