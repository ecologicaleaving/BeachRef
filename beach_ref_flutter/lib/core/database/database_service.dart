import 'package:flutter/foundation.dart';
import '../../features/match/models/beach_match.dart';
import 'database_mapper.dart';
import 'supabase_service.dart';

/// CRUD operations against the Supabase `matches` table.
///
/// All methods degrade gracefully: if Supabase is unavailable they
/// return empty lists / false instead of throwing.
class DatabaseService {
  DatabaseService._();
  static final instance = DatabaseService._();

  final _supabase = SupabaseService.instance;

  // ──────────────────────────────────────────────
  // Matches
  // ──────────────────────────────────────────────

  /// Fetch all matches for a given tournament from Supabase.
  /// Returns an empty list if Supabase is unavailable or on error.
  Future<List<BeachMatch>> getMatchesByTournament(String tournamentNo) async {
    if (!_supabase.isAvailable) return [];

    try {
      final rows = await _supabase.client
          .from('matches')
          .select()
          .eq('tournament_no', tournamentNo)
          .order('local_date')
          .order('local_time');

      final matches = (rows as List)
          .map((row) =>
              DatabaseMapper.rowToMatch(Map<String, dynamic>.from(row as Map)))
          .toList();

      if (kDebugMode) {
        debugPrint(
          '[DatabaseService] Supabase returned ${matches.length} matches '
          'for tournament $tournamentNo',
        );
      }
      return matches;
    } catch (e) {
      if (kDebugMode) {
        debugPrint('[DatabaseService] getMatchesByTournament error: $e');
      }
      return [];
    }
  }

  /// Upsert matches into Supabase (conflict on `no` column).
  /// Returns true on success, false on error.
  Future<bool> saveMatches(
    List<BeachMatch> matches,
    String tournamentNo,
  ) async {
    if (!_supabase.isAvailable) return false;
    if (matches.isEmpty) return true;

    try {
      final rows = matches
          .where((m) => m.no.isNotEmpty)
          .map((m) => DatabaseMapper.matchToRow(m, tournamentNo))
          .toList();

      if (rows.isEmpty) return true;

      // Upsert in chunks of 100 to avoid payload limits
      const chunkSize = 100;
      for (var i = 0; i < rows.length; i += chunkSize) {
        final chunk = rows.sublist(
          i,
          i + chunkSize > rows.length ? rows.length : i + chunkSize,
        );
        await _supabase.client.from('matches').upsert(
          chunk,
          onConflict: 'no',
        );
      }

      if (kDebugMode) {
        debugPrint(
          '[DatabaseService] Saved ${rows.length} matches for tournament '
          '$tournamentNo to Supabase',
        );
      }
      return true;
    } catch (e) {
      if (kDebugMode) {
        debugPrint('[DatabaseService] saveMatches error: $e');
      }
      return false;
    }
  }
}
