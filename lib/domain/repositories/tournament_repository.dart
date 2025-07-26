import '../../core/result.dart';
import '../../data/models/tournament.dart';

abstract class TournamentRepository {
  Future<Result<List<Tournament>, Exception>> getTournaments({
    String? search,
    String? status,
    String? competitionLevel,
    DateTime? startDate,
    DateTime? endDate,
    int page = 1,
    int pageSize = 20,
    String sortBy = 'startDate',
    bool sortAscending = true,
  });

  Future<Result<Tournament, Exception>> getTournamentById(String id);

  Future<Result<void, Exception>> refreshTournaments();

  Future<Result<List<Tournament>, Exception>> getCachedTournaments({
    String? search,
    String? status,
    String? competitionLevel,
    DateTime? startDate,
    DateTime? endDate,
    int page = 1,
    int pageSize = 20,
    String sortBy = 'startDate',
    bool sortAscending = true,
  });

  Stream<List<Tournament>> watchTournaments();
}