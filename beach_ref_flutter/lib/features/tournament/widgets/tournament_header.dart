import 'package:flutter/material.dart';
import '../../../core/theme/app_theme.dart';
import '../../../shared/widgets/flag_image.dart';

/// Tournament header — unified component accepting explicit fields.
/// Works both with pre-loaded data (instant rendering) and provider data.
class TournamentHeader extends StatelessWidget {
  final String city;
  final String dateRange;
  final String countryCode;
  final String genderText;

  const TournamentHeader({
    super.key,
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
          GenderBadge(genderText: genderText),
        ],
      ),
    );
  }
}

/// Reusable gender badge (male/female/mixed circle icon)
class GenderBadge extends StatelessWidget {
  final String genderText;

  const GenderBadge({super.key, required this.genderText});

  @override
  Widget build(BuildContext context) {
    final symbol = genderText == 'M'
        ? '\u2642'
        : genderText == 'W'
            ? '\u2640'
            : 'MX';
    final color = genderText == 'M'
        ? AppColors.genderMaleSymbol
        : genderText == 'W'
            ? AppColors.genderFemaleSymbol
            : AppColors.genderMixedSymbol;

    return Container(
      width: 28,
      height: 28,
      decoration: BoxDecoration(
        color: AppColors.zinc100,
        shape: BoxShape.circle,
        border: Border.all(color: AppColors.borderLight),
      ),
      alignment: Alignment.center,
      child: Text(
        symbol,
        style: TextStyle(
          fontSize: genderText == 'MX' ? 10 : 14,
          fontWeight: FontWeight.w700,
          color: color,
        ),
      ),
    );
  }
}
