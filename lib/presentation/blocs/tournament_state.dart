part of 'tournament_bloc.dart';

@immutable
abstract class TournamentState {
  const TournamentState();
}

class TournamentInitial extends TournamentState {
  const TournamentInitial();
}

class TournamentLoading extends TournamentState {
  const TournamentLoading();
}

class TournamentLoaded extends TournamentState {
  final List<Tournament> tournaments;
  final bool hasReachedMax;
  final int currentPage;
  final int pageSize;
  final String? search;
  final String? status;
  final String? competitionLevel;
  final DateTime? startDate;
  final DateTime? endDate;
  final String sortBy;
  final bool sortAscending;
  final bool isLoadingMore;
  final bool isRefreshing;

  const TournamentLoaded({
    required this.tournaments,
    required this.hasReachedMax,
    required this.currentPage,
    required this.pageSize,
    this.search,
    this.status,
    this.competitionLevel,
    this.startDate,
    this.endDate,
    required this.sortBy,
    required this.sortAscending,
    this.isLoadingMore = false,
    this.isRefreshing = false,
  });

  TournamentLoaded copyWith({
    List<Tournament>? tournaments,
    bool? hasReachedMax,
    int? currentPage,
    int? pageSize,
    String? search,
    String? status,
    String? competitionLevel,
    DateTime? startDate,
    DateTime? endDate,
    String? sortBy,
    bool? sortAscending,
    bool? isLoadingMore,
    bool? isRefreshing,
  }) {
    return TournamentLoaded(
      tournaments: tournaments ?? this.tournaments,
      hasReachedMax: hasReachedMax ?? this.hasReachedMax,
      currentPage: currentPage ?? this.currentPage,
      pageSize: pageSize ?? this.pageSize,
      search: search ?? this.search,
      status: status ?? this.status,
      competitionLevel: competitionLevel ?? this.competitionLevel,
      startDate: startDate ?? this.startDate,
      endDate: endDate ?? this.endDate,
      sortBy: sortBy ?? this.sortBy,
      sortAscending: sortAscending ?? this.sortAscending,
      isLoadingMore: isLoadingMore ?? this.isLoadingMore,
      isRefreshing: isRefreshing ?? this.isRefreshing,
    );
  }

}

class TournamentEmpty extends TournamentState {
  final String message;

  const TournamentEmpty(this.message);
}

class TournamentError extends TournamentState {
  final String message;

  const TournamentError(this.message);
}