import 'package:flutter/material.dart';
import '../../../core/theme/app_theme.dart';

/// Court filter bar with dropdown and clear button
class FilterBar extends StatelessWidget {
  final String? courtFilter;
  final ValueChanged<String?> onCourtChanged;

  const FilterBar({
    super.key,
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
