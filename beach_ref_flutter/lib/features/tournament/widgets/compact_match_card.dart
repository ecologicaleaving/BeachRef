import 'package:flutter/material.dart';
import '../../../core/theme/app_theme.dart';
import '../../../shared/widgets/flag_image.dart';
import '../../../shared/widgets/status_badge.dart';
import '../../match/models/beach_match.dart';
import '../models/referee_match_stats.dart';

/// Compact match card for the referee's recent matches section.
/// Shows key info in a dense layout: header, teams with scores, referees.
class CompactMatchCard extends StatelessWidget {
  final RefereeRecentMatch recentMatch;

  /// The federation code of the "current" referee to highlight
  final String highlightFederationCode;
  final String highlightLastName;

  const CompactMatchCard({
    super.key,
    required this.recentMatch,
    required this.highlightFederationCode,
    required this.highlightLastName,
  });

  @override
  Widget build(BuildContext context) {
    final match = recentMatch.match;
    final isFinished = match.isFinished;
    final teamAWins =
        isFinished && (match.matchPointsA ?? 0) > (match.matchPointsB ?? 0);
    final teamBWins =
        isFinished && (match.matchPointsB ?? 0) > (match.matchPointsA ?? 0);

    return Container(
      margin: const EdgeInsets.only(bottom: 8),
      decoration: BoxDecoration(
        color: AppColors.surface,
        borderRadius: BorderRadius.circular(8),
        border: Border.all(color: AppColors.borderLight),
        boxShadow: AppShadows.subtle,
      ),
      clipBehavior: Clip.antiAlias,
      child: Column(
        children: [
          // Gender strip (3px) — webapp style: black for W, light gray for M
          Container(
            height: 3,
            color: match.gender == 'W'
                ? AppColors.primary        // Black band for women
                : AppColors.borderLight,   // Subtle gray for men
          ),
          Padding(
            padding: const EdgeInsets.all(10),
            child: Column(
              children: [
                // Header row: #number + court | round | status
                _buildHeader(match),
                const SizedBox(height: 8),
                // Teams with score
                _buildTeamRow(
                  match.teamAName,
                  match.teamAFederationCode,
                  match.matchPointsA,
                  teamAWins,
                ),
                const Padding(
                  padding: EdgeInsets.symmetric(vertical: 2),
                  child: Text(
                    'vs',
                    style: TextStyle(
                      fontSize: 10,
                      fontWeight: FontWeight.w500,
                      color: AppColors.textTertiary,
                    ),
                  ),
                ),
                _buildTeamRow(
                  match.teamBName,
                  match.teamBFederationCode,
                  match.matchPointsB,
                  teamBWins,
                ),
                // Set scores
                if (match.setScores.isNotEmpty) ...[
                  const SizedBox(height: 4),
                  Row(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      for (int i = 0; i < match.setScores.length; i++) ...[
                        if (i > 0)
                          const Text(
                            '  ',
                            style: TextStyle(fontSize: 10),
                          ),
                        Text(
                          '${match.setScores[i].teamA}-${match.setScores[i].teamB}',
                          style: const TextStyle(
                            fontSize: 11,
                            fontWeight: FontWeight.w500,
                            color: AppColors.textSecondary,
                          ),
                        ),
                      ],
                    ],
                  ),
                ],
                // Referee section
                if (match.referee1Name.isNotEmpty) ...[
                  const SizedBox(height: 6),
                  Container(
                    padding: const EdgeInsets.only(top: 6),
                    decoration: const BoxDecoration(
                      border: Border(
                        top: BorderSide(color: AppColors.borderDivider),
                      ),
                    ),
                    child: Column(
                      children: [
                        _buildRefereeRow(
                          'R1',
                          match.referee1Name,
                          match.referee1FederationCode,
                        ),
                        if (match.referee2Name.isNotEmpty) ...[
                          const SizedBox(height: 2),
                          _buildRefereeRow(
                            'R2',
                            match.referee2Name,
                            match.referee2FederationCode,
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
    );
  }

  Widget _buildHeader(BeachMatch match) {
    return Row(
      children: [
        // Match number + court
        Text(
          '#${match.noInTournament.isNotEmpty ? match.noInTournament : match.no}',
          style: const TextStyle(
            fontSize: 13,
            fontWeight: FontWeight.w700,
            color: AppColors.textNavy,
          ),
        ),
        if (match.court.isNotEmpty) ...[
          const SizedBox(width: 6),
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 5, vertical: 1),
            decoration: BoxDecoration(
              color: AppColors.zinc100,
              borderRadius: BorderRadius.circular(4),
            ),
            child: Text(
              'C${match.court}',
              style: const TextStyle(
                fontSize: 10,
                fontWeight: FontWeight.w600,
                color: AppColors.textSecondary,
              ),
            ),
          ),
        ],
        const SizedBox(width: 6),
        // Round name
        if (match.roundName.isNotEmpty)
          Expanded(
            child: Text(
              match.roundName,
              style: const TextStyle(
                fontSize: 11,
                color: AppColors.textTertiary,
              ),
              overflow: TextOverflow.ellipsis,
            ),
          )
        else
          const Spacer(),
        // Time + Status
        if (match.timeDisplay.isNotEmpty)
          Padding(
            padding: const EdgeInsets.only(right: 6),
            child: Text(
              match.timeDisplay,
              style: const TextStyle(
                fontSize: 11,
                fontWeight: FontWeight.w600,
                color: AppColors.textSecondary,
              ),
            ),
          ),
        StatusBadge(status: match.displayStatus, fontSize: 9),
      ],
    );
  }

  Widget _buildTeamRow(
    String name,
    String federationCode,
    int? score,
    bool isWinner,
  ) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
      decoration: BoxDecoration(
        color: isWinner ? AppColors.winnerBg : Colors.transparent,
        border: isWinner
            ? Border.all(color: AppColors.winnerAccent, width: 0.5)
            : null,
        borderRadius: BorderRadius.circular(4),
      ),
      child: Row(
        children: [
          if (federationCode.isNotEmpty) ...[
            FlagImage(
              countryCode: federationCode,
              width: 14,
              height: 10,
              borderRadius: 2,
            ),
            const SizedBox(width: 6),
          ],
          Expanded(
            child: Text(
              name,
              style: TextStyle(
                fontSize: 13,
                fontWeight: FontWeight.w500,
                color: isWinner ? AppColors.winnerAccent : AppColors.textNavy,
              ),
              overflow: TextOverflow.ellipsis,
            ),
          ),
          if (score != null)
            Text(
              '$score',
              style: TextStyle(
                fontSize: 14,
                fontWeight: FontWeight.w700,
                color: isWinner ? AppColors.winnerAccent : AppColors.textNavy,
              ),
            ),
        ],
      ),
    );
  }

  Widget _buildRefereeRow(
    String label,
    String name,
    String federationCode,
  ) {
    final isHighlighted = _isCurrentReferee(name, federationCode);

    return Row(
      children: [
        Container(
          width: 22,
          alignment: Alignment.center,
          child: Text(
            label,
            style: TextStyle(
              fontSize: 10,
              fontWeight: FontWeight.w600,
              color: isHighlighted ? AppColors.accent : AppColors.textTertiary,
            ),
          ),
        ),
        const SizedBox(width: 4),
        if (federationCode.isNotEmpty) ...[
          FlagImage(
            countryCode: federationCode,
            width: 14,
            height: 10,
            borderRadius: 2,
          ),
          const SizedBox(width: 4),
        ],
        Expanded(
          child: Text(
            name,
            style: TextStyle(
              fontSize: 12,
              fontWeight: isHighlighted ? FontWeight.w700 : FontWeight.w400,
              color: isHighlighted ? AppColors.textNavy : AppColors.textSecondary,
            ),
            overflow: TextOverflow.ellipsis,
          ),
        ),
      ],
    );
  }

  bool _isCurrentReferee(String name, String fedCode) {
    final nameNorm = name.trim().toLowerCase();
    final lastNorm = highlightLastName.trim().toLowerCase();
    final fedNorm = highlightFederationCode.trim().toLowerCase();
    final matchFedNorm = fedCode.trim().toLowerCase();

    if (lastNorm.isEmpty) return false;
    return nameNorm.contains(lastNorm) && fedNorm == matchFedNorm;
  }
}
