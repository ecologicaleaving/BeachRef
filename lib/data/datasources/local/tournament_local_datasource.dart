import 'package:sqflite/sqflite.dart';

import '../../../core/result.dart';
import '../../models/tournament.dart';
import '../../models/cache_metadata.dart';

abstract class TournamentLocalDataSource {
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
  
  Future<Result<void, Exception>> cacheTournament(Tournament tournament);
  
  Future<Result<void, Exception>> cacheTournaments(List<Tournament> tournaments);
  
  Future<Result<void, Exception>> clearCache();
  
  Future<Result<CacheMetadata?, Exception>> getCacheMetadata(String key);
  
  Future<Result<void, Exception>> updateCacheMetadata(CacheMetadata metadata);
}

class TournamentLocalDataSourceImpl implements TournamentLocalDataSource {
  final Database _database;
  static const String _tournamentsTable = 'tournaments';
  static const String _cacheMetadataTable = 'cache_metadata';

  TournamentLocalDataSourceImpl({
    required Database database,
  }) : _database = database;

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
      final whereConditions = <String>[];
      final whereArgs = <dynamic>[];

      if (search != null && search.isNotEmpty) {
        whereConditions.add('name LIKE ?');
        whereArgs.add('%$search%');
      }

      if (status != null && status.isNotEmpty) {
        whereConditions.add('status = ?');
        whereArgs.add(status);
      }

      if (competitionLevel != null && competitionLevel.isNotEmpty) {
        whereConditions.add('competition_level = ?');
        whereArgs.add(competitionLevel);
      }

      if (startDate != null) {
        whereConditions.add('start_date >= ?');
        whereArgs.add(startDate.toIso8601String());
      }

      if (endDate != null) {
        whereConditions.add('end_date <= ?');
        whereArgs.add(endDate.toIso8601String());
      }

      final whereClause = whereConditions.isNotEmpty 
          ? whereConditions.join(' AND ')
          : null;

      final sortColumn = _mapSortByToColumn(sortBy);
      final orderBy = '$sortColumn ${sortAscending ? 'ASC' : 'DESC'}';

      final offset = (page - 1) * pageSize;

      final maps = await _database.query(
        _tournamentsTable,
        where: whereClause,
        whereArgs: whereArgs.isNotEmpty ? whereArgs : null,
        orderBy: orderBy,
        limit: pageSize,
        offset: offset,
      );

      final tournaments = maps
          .map((map) => Tournament.fromJson(map))
          .toList();

      return Success(tournaments);
    } catch (e) {
      return Error(Exception('Failed to get cached tournaments: $e'));
    }
  }

  @override
  Future<Result<Tournament, Exception>> getTournamentById(String id) async {
    try {
      final maps = await _database.query(
        _tournamentsTable,
        where: 'id = ?',
        whereArgs: [id],
        limit: 1,
      );

      if (maps.isEmpty) {
        return Error(Exception('Tournament not found in cache'));
      }

      final tournament = Tournament.fromJson(maps.first);
      return Success(tournament);
    } catch (e) {
      return Error(Exception('Failed to get cached tournament: $e'));
    }
  }

  @override
  Future<Result<void, Exception>> cacheTournament(Tournament tournament) async {
    try {
      await _database.insert(
        _tournamentsTable,
        tournament.toJson(),
        conflictAlgorithm: ConflictAlgorithm.replace,
      );
      return const Success(null);
    } catch (e) {
      return Error(Exception('Failed to cache tournament: $e'));
    }
  }

  @override
  Future<Result<void, Exception>> cacheTournaments(List<Tournament> tournaments) async {
    try {
      final batch = _database.batch();
      
      for (final tournament in tournaments) {
        batch.insert(
          _tournamentsTable,
          tournament.toJson(),
          conflictAlgorithm: ConflictAlgorithm.replace,
        );
      }
      
      await batch.commit(noResult: true);
      
      final cacheMetadata = CacheMetadata(
        key: 'tournaments',
        lastSync: DateTime.now(),
        expiresAt: DateTime.now().add(const Duration(minutes: 30)),
        isValid: true,
      );
      
      await _updateCacheMetadata(cacheMetadata);
      
      return const Success(null);
    } catch (e) {
      return Error(Exception('Failed to cache tournaments: $e'));
    }
  }

  @override
  Future<Result<void, Exception>> clearCache() async {
    try {
      await _database.delete(_tournamentsTable);
      await _database.delete(_cacheMetadataTable);
      return const Success(null);
    } catch (e) {
      return Error(Exception('Failed to clear cache: $e'));
    }
  }

  @override
  Future<Result<CacheMetadata?, Exception>> getCacheMetadata(String key) async {
    try {
      final maps = await _database.query(
        _cacheMetadataTable,
        where: 'key = ?',
        whereArgs: [key],
        limit: 1,
      );

      if (maps.isEmpty) {
        return const Success(null);
      }

      final metadata = CacheMetadata.fromJson(maps.first);
      return Success(metadata);
    } catch (e) {
      return Error(Exception('Failed to get cache metadata: $e'));
    }
  }

  @override
  Future<Result<void, Exception>> updateCacheMetadata(CacheMetadata metadata) async {
    return await _updateCacheMetadata(metadata);
  }

  Future<Result<void, Exception>> _updateCacheMetadata(CacheMetadata metadata) async {
    try {
      await _database.insert(
        _cacheMetadataTable,
        metadata.toJson(),
        conflictAlgorithm: ConflictAlgorithm.replace,
      );
      return const Success(null);
    } catch (e) {
      return Error(Exception('Failed to update cache metadata: $e'));
    }
  }

  String _mapSortByToColumn(String sortBy) {
    switch (sortBy) {
      case 'name':
        return 'name';
      case 'location':
        return 'location';
      case 'startDate':
        return 'start_date';
      case 'endDate':
        return 'end_date';
      case 'status':
        return 'status';
      case 'competitionLevel':
        return 'competition_level';
      default:
        return 'start_date';
    }
  }
}