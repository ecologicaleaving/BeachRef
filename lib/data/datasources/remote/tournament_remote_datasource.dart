import '../../../core/result.dart';
import '../../../core/errors/vis_error.dart';
import '../../../services/vis_integration_service.dart';
import '../../models/tournament.dart';

abstract class TournamentRemoteDataSource {
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
}

class TournamentRemoteDataSourceImpl implements TournamentRemoteDataSource {
  final VisIntegrationService _visService;

  TournamentRemoteDataSourceImpl({
    required VisIntegrationService visService,
  }) : _visService = visService;

  @override
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
  }) async {
    try {
      final limit = pageSize * page;
      
      String? filter;
      final filterConditions = <String>[];
      
      if (search != null && search.isNotEmpty) {
        filterConditions.add('name:$search');
      }
      
      if (status != null && status.isNotEmpty) {
        filterConditions.add('status:$status');
      }
      
      if (competitionLevel != null && competitionLevel.isNotEmpty) {
        filterConditions.add('level:$competitionLevel');
      }
      
      if (startDate != null) {
        filterConditions.add('start_date_gte:${startDate.toIso8601String()}');
      }
      
      if (endDate != null) {
        filterConditions.add('end_date_lte:${endDate.toIso8601String()}');
      }
      
      if (filterConditions.isNotEmpty) {
        filter = filterConditions.join(',');
      }

      final result = await _visService.getTournaments(
        limit: limit,
        filter: filter,
      );

      return result.fold(
        (tournaments) {
          final startIndex = (page - 1) * pageSize;
          final endIndex = startIndex + pageSize;
          
          final paginatedTournaments = tournaments.length > startIndex
              ? tournaments.sublist(
                  startIndex,
                  endIndex > tournaments.length ? tournaments.length : endIndex,
                )
              : <Tournament>[];

          if (sortBy != 'startDate' || !sortAscending) {
            _sortTournaments(paginatedTournaments, sortBy, sortAscending);
          }

          return Success(paginatedTournaments);
        },
        (visError) => Error(Exception('VIS API error: ${visError.message}')),
      );
    } catch (e) {
      return Error(Exception('Failed to fetch tournaments: $e'));
    }
  }

  @override
  Future<Result<Tournament, Exception>> getTournamentById(String id) async {
    try {
      final result = await _visService.getTournaments(
        limit: 100,
        filter: 'id:$id',
      );

      return result.fold(
        (tournaments) {
          final tournament = tournaments.firstWhere(
            (t) => t.id == id,
            orElse: () => throw Exception('Tournament not found'),
          );
          return Success(tournament);
        },
        (visError) => Error(Exception('VIS API error: ${visError.message}')),
      );
    } catch (e) {
      return Error(Exception('Failed to fetch tournament: $e'));
    }
  }

  void _sortTournaments(List<Tournament> tournaments, String sortBy, bool ascending) {
    tournaments.sort((a, b) {
      int comparison;
      switch (sortBy) {
        case 'name':
          comparison = a.name.compareTo(b.name);
          break;
        case 'location':
          comparison = a.location.compareTo(b.location);
          break;
        case 'startDate':
          comparison = a.startDate.compareTo(b.startDate);
          break;
        case 'endDate':
          comparison = a.endDate.compareTo(b.endDate);
          break;
        case 'status':
          comparison = a.status.value.compareTo(b.status.value);
          break;
        case 'competitionLevel':
          comparison = a.competitionLevel.compareTo(b.competitionLevel);
          break;
        default:
          comparison = a.startDate.compareTo(b.startDate);
      }
      return ascending ? comparison : -comparison;
    });
  }
}