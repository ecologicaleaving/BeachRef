import 'package:flutter/material.dart';
import '../../../core/theme/app_theme.dart';
import '../../../shared/widgets/flag_image.dart';
import '../models/tournament.dart';

/// Tournament card matching webapp design:
/// - Off-white bg, borderRadius 20, shadow
/// - Top accent strip (6px) colored by status
/// - Country flag + name, tournament name, date + gender badge
class TournamentCard extends StatelessWidget {
  final Tournament tournament;
  final VoidCallback? onTap;

  const TournamentCard({
    super.key,
    required this.tournament,
    this.onTap,
  });

  Color get _accentColor {
    final label = _statusLabel;
    if (label == 'LIVE') return AppColors.statusLive;
    if (label == 'COMPLETED') return AppColors.statusCompleted;
    return AppColors.statusScheduled;
  }

  String get _statusLabel {
    final status = tournament.status;
    // VIS API uses numeric codes: 4 = completed/finished
    final numeric = int.tryParse(status);
    if (numeric != null) {
      if (numeric >= 3 && numeric <= 8) return 'LIVE';
      if (numeric >= 9 || numeric == 4) return 'COMPLETED';
      return 'SCHEDULED';
    }
    final lower = status.toLowerCase();
    if (lower.contains('running') || lower.contains('live')) return 'LIVE';
    if (lower.contains('complet') || lower.contains('finish')) return 'COMPLETED';
    return 'SCHEDULED';
  }

  @override
  Widget build(BuildContext context) {
    final isLive = _statusLabel == 'LIVE';

    return GestureDetector(
      onTap: onTap,
      child: Container(
        margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
        decoration: BoxDecoration(
          color: AppColors.surfaceElevated,
          borderRadius: BorderRadius.circular(AppSpacing.borderRadiusXl),
          boxShadow: AppShadows.card,
        ),
        clipBehavior: Clip.antiAlias,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            // Top accent strip
            Container(
              height: 6,
              color: _accentColor,
            ),

            Padding(
              padding: const EdgeInsets.all(24),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  // Status badge + country flag row
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      // Country flag + name
                      Expanded(
                        child: Row(
                          children: [
                            FlagImage(
                              countryCode: tournament.countryCode,
                              width: 40,
                              height: 30,
                            ),
                            const SizedBox(width: 12),
                            Expanded(
                              child: Text(
                                tournament.displayCity.isNotEmpty
                                    ? tournament.displayCity
                                    : _countryName(tournament.countryCode),
                                style: const TextStyle(
                                  fontSize: 16,
                                  fontWeight: FontWeight.w700,
                                  color: AppColors.textNavy,
                                ),
                                maxLines: 1,
                                overflow: TextOverflow.ellipsis,
                              ),
                            ),
                          ],
                        ),
                      ),

                      // Status badge
                      _StatusBadge(
                        label: _statusLabel,
                        isLive: isLive,
                        accentColor: _accentColor,
                      ),
                    ],
                  ),

                  const SizedBox(height: 16),

                  // Tournament name
                  Text(
                    tournament.name,
                    style: const TextStyle(
                      fontSize: 18,
                      fontWeight: FontWeight.w700,
                      color: AppColors.textNavy,
                    ),
                    maxLines: 3,
                    overflow: TextOverflow.ellipsis,
                  ),

                  const SizedBox(height: 16),

                  // Bottom: date range + gender badge
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Expanded(
                        child: Text(
                          tournament.dateRange,
                          style: const TextStyle(
                            fontSize: 15,
                            fontWeight: FontWeight.w500,
                            color: AppColors.textSecondary,
                          ),
                        ),
                      ),
                      _GenderBadge(gender: tournament.genderText),
                    ],
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  String _countryName(String code) {
    const names = {
      'US': 'United States', 'BR': 'Brazil', 'DE': 'Germany', 'IT': 'Italy',
      'FR': 'France', 'ES': 'Spain', 'NL': 'Netherlands', 'PL': 'Poland',
      'CA': 'Canada', 'AU': 'Australia', 'JP': 'Japan', 'CN': 'China',
      'AR': 'Argentina', 'MX': 'Mexico', 'TR': 'Turkey', 'AT': 'Austria',
      'CH': 'Switzerland', 'NO': 'Norway', 'SE': 'Sweden', 'DK': 'Denmark',
      'FI': 'Finland', 'GB': 'Great Britain', 'PT': 'Portugal', 'GR': 'Greece',
      'BE': 'Belgium', 'CZ': 'Czech Republic', 'TH': 'Thailand', 'QA': 'Qatar',
      'AE': 'UAE', 'IR': 'Iran', 'CL': 'Chile', 'CO': 'Colombia', 'PE': 'Peru',
      'RU': 'Russia', 'HR': 'Croatia', 'RS': 'Serbia', 'LV': 'Latvia',
      'LT': 'Lithuania', 'EE': 'Estonia', 'UA': 'Ukraine', 'RO': 'Romania',
      'BG': 'Bulgaria', 'SI': 'Slovenia', 'HU': 'Hungary', 'SK': 'Slovakia',
      'IE': 'Ireland', 'ZA': 'South Africa', 'EG': 'Egypt', 'MA': 'Morocco',
      'TN': 'Tunisia', 'KR': 'South Korea', 'ID': 'Indonesia', 'PH': 'Philippines',
      'MY': 'Malaysia', 'SG': 'Singapore', 'NZ': 'New Zealand',
    };
    return names[code.toUpperCase()] ?? code;
  }
}

class _StatusBadge extends StatelessWidget {
  final String label;
  final bool isLive;
  final Color accentColor;

  const _StatusBadge({
    required this.label,
    required this.isLive,
    required this.accentColor,
  });

  @override
  Widget build(BuildContext context) {
    if (isLive) {
      return Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Container(
            width: 12,
            height: 12,
            decoration: const BoxDecoration(
              color: AppColors.liveDot,
              shape: BoxShape.circle,
            ),
          ),
          const SizedBox(width: 6),
          const Text(
            'LIVE',
            style: TextStyle(
              fontSize: 14,
              fontWeight: FontWeight.w600,
              color: AppColors.accent,
            ),
          ),
        ],
      );
    }

    Color bgColor;
    Color textColor;
    if (label == 'COMPLETED') {
      bgColor = AppColors.completedBg;
      textColor = AppColors.completedText;
    } else {
      bgColor = AppColors.scheduledBg;
      textColor = AppColors.scheduledText;
    }

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
      decoration: BoxDecoration(
        color: bgColor,
        borderRadius: BorderRadius.circular(6),
      ),
      child: Text(
        label,
        style: TextStyle(
          fontSize: 12,
          fontWeight: FontWeight.w600,
          color: textColor,
        ),
      ),
    );
  }
}

class _GenderBadge extends StatelessWidget {
  final String gender;

  const _GenderBadge({required this.gender});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
      decoration: BoxDecoration(
        color: AppColors.genderBadgeBg,
        borderRadius: BorderRadius.circular(12),
      ),
      child: Text(
        gender == 'M' ? 'Men' : gender == 'W' ? 'Women' : gender,
        style: const TextStyle(
          fontSize: 12,
          fontWeight: FontWeight.w700,
          color: AppColors.textPrimary,
        ),
      ),
    );
  }
}
