import 'package:flutter/material.dart';

/// Titanium & Gold professional sport theme - matches webapp exactly
class AppColors {
  AppColors._();

  // Brand - Zinc/Titanium scale
  static const primary = Color(0xFF18181B); // Zinc 950
  static const primaryHover = Color(0xFF52525B); // Zinc 600 (hover)
  static const secondary = Color(0xFF52525B); // Zinc 600
  static const accent = Color(0xFFD97706); // Amber 600 - Professional Gold

  // Semantic
  static const success = Color(0xFF15803D); // Green 700
  static const warning = Color(0xFFB45309); // Amber 700
  static const error = Color(0xFFB91C1C); // Red 700

  // Neutrals
  static const background = Color(0xFFFAFAFA); // Zinc 50
  static const surface = Color(0xFFFFFFFF);
  static const surfaceElevated = Color(0xFFFAFBFC); // Tournament card bg
  static const borderSubtle = Color(0xFFE4E4E7); // Zinc 200
  static const borderLight = Color(0xFFE5E7EB); // Gray 200
  static const borderDivider = Color(0xFFF3F4F6); // Gray 100

  // Text
  static const textPrimary = Color(0xFF18181B); // Zinc 950
  static const textSecondary = Color(0xFF52525B); // Zinc 600
  static const textTertiary = Color(0xFF71717A); // Zinc 500
  static const textNavy = Color(0xFF1B365D); // Navy blue (tournament titles)

  // Zinc scale
  static const zinc50 = Color(0xFFFAFAFA);
  static const zinc100 = Color(0xFFF4F4F5);
  static const zinc200 = Color(0xFFE4E4E7);
  static const zinc300 = Color(0xFFD4D4D8);
  static const zinc500 = Color(0xFF71717A);
  static const zinc600 = Color(0xFF52525B);
  static const zinc700 = Color(0xFF3F3F46);
  static const zinc950 = Color(0xFF18181B);

  // Status badge colors
  static const liveText = Color(0xFFB91C1C); // Red 700
  static const liveBg = Color(0xFFFEE2E2); // Red 100
  static const liveDot = Color(0xFFDC2626); // Red 600
  static const scheduledText = Color(0xFF3F3F46); // Zinc 700
  static const scheduledBg = Color(0xFFF4F4F5); // Zinc 100
  static const completedText = Color(0xFF15803D); // Green 700
  static const completedBg = Color(0xFFDCFCE7); // Green 100

  // Filter button color
  static const filterBlue = Color(0xFF4A90A4);

  // Gender colors
  static const genderMale = Color(0xFF87CEEB); // Sky blue strip
  static const genderFemale = Color(0xFFFFB6C1); // Light pink strip
  static const genderMaleSymbol = Color(0xFFD97706); // Gold ♂
  static const genderFemaleSymbol = Color(0xFFEC4899); // Pink ♀
  static const genderMixedSymbol = Color(0xFF8B5CF6); // Purple MX
  static const genderBadgeBg = Color(0xFFE5E7EB); // Gray 200

  // Status colors for tournament accent strips
  static const statusLive = Color(0xFFDC2626); // Red 600
  static const statusScheduled = Color(0xFF4A90A4); // Blue
  static const statusCompleted = Color(0xFF15803D); // Green 700

  // Winner highlight
  static const winnerBg = Color(0xFFF0F9FF); // Light blue bg
  static const winnerAccent = Color(0xFFD97706); // Gold
}

class AppSpacing {
  AppSpacing._();

  static const double xs = 4;
  static const double sm = 8;
  static const double md = 16;
  static const double lg = 24;
  static const double xl = 32;
  static const double xxl = 48;
  static const double borderRadius = 8;
  static const double borderRadiusLg = 12;
  static const double borderRadiusXl = 20;
}

class AppShadows {
  AppShadows._();

  static List<BoxShadow> get subtle => [
    BoxShadow(
      color: Colors.black.withValues(alpha: 0.05),
      offset: const Offset(0, 1),
      blurRadius: 1,
    ),
  ];

  static List<BoxShadow> get small => [
    BoxShadow(
      color: Colors.black.withValues(alpha: 0.1),
      offset: const Offset(0, 1),
      blurRadius: 2,
    ),
  ];

  static List<BoxShadow> get card => [
    BoxShadow(
      color: const Color(0xFF1F2937).withValues(alpha: 0.12),
      offset: const Offset(0, 6),
      blurRadius: 16,
    ),
  ];

  static List<BoxShadow> get medium => [
    BoxShadow(
      color: Colors.black.withValues(alpha: 0.15),
      offset: const Offset(0, 2),
      blurRadius: 4,
    ),
  ];

  static List<BoxShadow> get matchCard => [
    BoxShadow(
      color: const Color(0xFF1B365D).withValues(alpha: 0.08),
      offset: const Offset(0, 2),
      blurRadius: 4,
    ),
  ];
}

class AppTheme {
  AppTheme._();

  static ThemeData get light {
    return ThemeData(
      useMaterial3: true,
      brightness: Brightness.light,
      colorScheme: ColorScheme.fromSeed(
        seedColor: AppColors.accent,
        brightness: Brightness.light,
        primary: AppColors.primary,
        secondary: AppColors.secondary,
        surface: AppColors.surface,
        error: AppColors.error,
        onPrimary: Colors.white,
        onSecondary: Colors.white,
        onSurface: AppColors.textPrimary,
        onError: Colors.white,
      ),
      scaffoldBackgroundColor: AppColors.background,
      appBarTheme: const AppBarTheme(
        backgroundColor: AppColors.primary,
        foregroundColor: Colors.white,
        elevation: 0,
        centerTitle: true,
        titleTextStyle: TextStyle(
          color: Colors.white,
          fontSize: 18,
          fontWeight: FontWeight.w700,
          letterSpacing: 0,
        ),
      ),
      cardTheme: CardThemeData(
        elevation: 0,
        color: AppColors.surface,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(AppSpacing.borderRadiusLg),
          side: const BorderSide(color: AppColors.borderLight),
        ),
      ),
      dividerTheme: const DividerThemeData(
        color: AppColors.borderSubtle,
        thickness: 1,
        space: 0,
      ),
      textTheme: const TextTheme(
        headlineLarge: TextStyle(
          fontSize: 32,
          fontWeight: FontWeight.w700,
          letterSpacing: -0.25,
          height: 40 / 32,
          color: AppColors.textPrimary,
        ),
        headlineMedium: TextStyle(
          fontSize: 24,
          fontWeight: FontWeight.w600,
          height: 32 / 24,
          color: AppColors.textPrimary,
        ),
        headlineSmall: TextStyle(
          fontSize: 20,
          fontWeight: FontWeight.w600,
          height: 28 / 20,
          color: AppColors.textPrimary,
        ),
        titleLarge: TextStyle(
          fontSize: 18,
          fontWeight: FontWeight.w600,
          height: 28 / 18,
          color: AppColors.textPrimary,
        ),
        titleMedium: TextStyle(
          fontSize: 16,
          fontWeight: FontWeight.w500,
          height: 24 / 16,
          color: AppColors.textPrimary,
        ),
        bodyLarge: TextStyle(
          fontSize: 16,
          fontWeight: FontWeight.w400,
          height: 24 / 16,
          color: AppColors.textPrimary,
        ),
        bodyMedium: TextStyle(
          fontSize: 14,
          fontWeight: FontWeight.w400,
          height: 20 / 14,
          color: AppColors.textPrimary,
        ),
        bodySmall: TextStyle(
          fontSize: 12,
          fontWeight: FontWeight.w400,
          color: AppColors.textSecondary,
        ),
        labelLarge: TextStyle(
          fontSize: 14,
          fontWeight: FontWeight.w500,
          letterSpacing: 0.25,
          height: 20 / 14,
          color: AppColors.textPrimary,
        ),
      ),
      inputDecorationTheme: InputDecorationTheme(
        filled: true,
        fillColor: AppColors.surface,
        border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(AppSpacing.borderRadius),
          borderSide: const BorderSide(color: AppColors.borderLight),
        ),
        enabledBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(AppSpacing.borderRadius),
          borderSide: const BorderSide(color: AppColors.borderLight),
        ),
        focusedBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(AppSpacing.borderRadius),
          borderSide: const BorderSide(color: AppColors.accent, width: 2),
        ),
        contentPadding: const EdgeInsets.symmetric(
          horizontal: AppSpacing.md,
          vertical: AppSpacing.sm,
        ),
      ),
      elevatedButtonTheme: ElevatedButtonThemeData(
        style: ElevatedButton.styleFrom(
          backgroundColor: AppColors.primary,
          foregroundColor: Colors.white,
          elevation: 0,
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(AppSpacing.borderRadiusLg),
          ),
          minimumSize: const Size(80, 44),
          padding: const EdgeInsets.symmetric(
            horizontal: AppSpacing.xl,
            vertical: AppSpacing.md,
          ),
          textStyle: const TextStyle(
            fontSize: 18,
            fontWeight: FontWeight.w700,
          ),
        ),
      ),
      outlinedButtonTheme: OutlinedButtonThemeData(
        style: OutlinedButton.styleFrom(
          foregroundColor: AppColors.primary,
          side: const BorderSide(color: AppColors.borderSubtle),
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(AppSpacing.borderRadiusLg),
          ),
          minimumSize: const Size(80, 44),
          padding: const EdgeInsets.symmetric(
            horizontal: AppSpacing.xl,
            vertical: AppSpacing.md,
          ),
        ),
      ),
      chipTheme: ChipThemeData(
        backgroundColor: AppColors.scheduledBg,
        labelStyle: const TextStyle(fontSize: 12, fontWeight: FontWeight.w500),
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(AppSpacing.xs + 2),
        ),
        side: BorderSide.none,
        padding: const EdgeInsets.symmetric(horizontal: AppSpacing.sm),
      ),
    );
  }
}
