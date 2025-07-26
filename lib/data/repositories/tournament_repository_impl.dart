import 'dart:async';

import 'package:flutter/foundation.dart';

import '../../core/result.dart';
import '../../data/models/tournament.dart';
import '../../domain/repositories/tournament_repository.dart';
import '../datasources/local/tournament_local_datasource.dart';
import '../datasources/remote/tournament_remote_datasource.dart';

class TournamentRepositoryImpl implements TournamentRepository {
  final TournamentRemoteDataSource _remoteDataSource;
  final TournamentLocalDataSource _localDataSource;
  final StreamController<List<Tournament>> _tournamentsStreamController;

  TournamentRepositoryImpl({
    required TournamentRemoteDataSource remoteDataSource,
    required TournamentLocalDataSource localDataSource,
  })  : _remoteDataSource = remoteDataSource,
        _localDataSource = localDataSource,
        _tournamentsStreamController = StreamController<List<Tournament>>.broadcast();

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
    final cachedResult = await getCachedTournaments(
      search: search,
      status: status,
      competitionLevel: competitionLevel,
      startDate: startDate,
      endDate: endDate,
      page: page,
      pageSize: pageSize,
      sortBy: sortBy,
      sortAscending: sortAscending,
    );
    
    if (cachedResult.isSuccess && cachedResult.value.isNotEmpty) {
      _tournamentsStreamController.add(cachedResult.value);
      
      unawaited(_refreshTournamentsInBackground());
      return cachedResult;
    }

    return await _fetchFromRemote(
      search: search,
      status: status,
      competitionLevel: competitionLevel,
      startDate: startDate,
      endDate: endDate,
      page: page,
      pageSize: pageSize,
      sortBy: sortBy,
      sortAscending: sortAscending,
    );
  }

  @override
  Future<Result<Tournament, Exception>> getTournamentById(String id) async {
    final cachedResult = await _localDataSource.getTournamentById(id);
    if (cachedResult.isSuccess) {
      return cachedResult;
    }

    final remoteResult = await _remoteDataSource.getTournamentById(id);
    if (remoteResult.isSuccess) {
      await _localDataSource.cacheTournament(remoteResult.value);
    }
    return remoteResult;
  }

  @override
  Future<Result<void, Exception>> refreshTournaments() async {
    final result = await _remoteDataSource.getTournaments();
    if (result.isSuccess) {
      await _localDataSource.cacheTournaments(result.value);
      _tournamentsStreamController.add(result.value);
      return const Success(null);
    }
    return Error(result.error);
  }

  @override
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
  }) async {
    return await _localDataSource.getTournaments(
      search: search,
      status: status,
      competitionLevel: competitionLevel,
      startDate: startDate,
      endDate: endDate,
      page: page,
      pageSize: pageSize,
      sortBy: sortBy,
      sortAscending: sortAscending,
    );
  }

  @override
  Stream<List<Tournament>> watchTournaments() {
    return _tournamentsStreamController.stream;
  }

  Future<Result<List<Tournament>, Exception>> _fetchFromRemote({
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
    final result = await _remoteDataSource.getTournaments(
      search: search,
      status: status,
      competitionLevel: competitionLevel,
      startDate: startDate,
      endDate: endDate,
      page: page,
      pageSize: pageSize,
      sortBy: sortBy,
      sortAscending: sortAscending,
    );

    if (result.isSuccess) {
      await _localDataSource.cacheTournaments(result.value);
      _tournamentsStreamController.add(result.value);
    }

    return result;
  }

  Future<void> _refreshTournamentsInBackground() async {
    try {
      await refreshTournaments();
    } catch (e) {
      // Log error but don't propagate - this is background refresh
      // Logger would be injected in a full implementation
      debugPrint('Background tournament refresh failed: $e');
    }
  }

  void dispose() {
    _tournamentsStreamController.close();
  }
}